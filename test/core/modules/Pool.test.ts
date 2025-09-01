import { BeginTransactionError } from '../../../src/errors';
import { CommitTransactionError } from '../../../src/errors';
import { RollbackTransactionError } from '../../../src/errors';
import { CreateConnectionError } from '../../../src/errors';
import { CloseConnectionError } from '../../../src/errors';
import { MaxConnectionError } from '../../../src/errors';
import { MaxQueueSizeError } from '../../../src/errors';
import { MaxQueueTimeError } from '../../../src/errors';
import { ShutdownError } from '../../../src/errors';
import { QueryError } from '../../../src/errors';

import { Pool } from '../../../src/core';
import { PoolError } from '../../../src/core';
import { PoolOptions } from '../../../src/core';
import { PendingConnection } from '../../../src/core';

import { Driver } from '../../../src/core';
import { Connection } from '../../../src/core';

import { Echo } from '../../../src/helpers';
import { isPendingCon, isPoolCon } from '../../../src/helpers';

// Perfromance
import { BAD_POOL, GOOD_POOL, GREAT_POOL } from '../../../src/core';

// Events
import {
  CLOSE_FAIL,
  CLOSE_SUCCESS,
  COMMIT_FAIL,
  COMMIT_SUCCESS,
  CREATE_FAIL,
  CREATE_SUCCESS,
  QUERY_FAIL,
  QUERY_SUCCESS,
  ROLLBACK_FAIL,
  ROLLBACK_SUCCESS,
  SHUTDOWN_FAIL,
  SHUTDOWN_SUCCESS,
  TRANSACTION_FAIL,
  TRANSACTION_SUCCESS,
  MAX_CONNECTION,
  MAX_QUEUE_SIZE,
  MAX_QUEUE_TIME,
  RELEASED,
} from '../../../src/core';

// to make tests faster
Echo.sleep = jest.fn(() => Promise.resolve());

const mock = {
  connection: (resolve: boolean = true): Connection => {
    if (!resolve) {
      return {
        id: Symbol('Connection'),
        beginTransaction: jest.fn(() =>
          Promise.reject(new BeginTransactionError('Ops'))
        ),
        rollback: jest.fn(() =>
          Promise.reject(new RollbackTransactionError('Ops'))
        ),
        commit: jest.fn(() =>
          Promise.reject(new CommitTransactionError('Ops'))
        ),
        query: jest.fn(() => Promise.reject(new QueryError('Ops'))),
        close: jest.fn(() => Promise.reject(new CloseConnectionError('Ops'))),
      } as any;
    }

    return {
      id: Symbol('Connection'),
      beginTransaction: jest.fn(() => Promise.resolve()),
      rollback: jest.fn(() => Promise.resolve()),
      commit: jest.fn(() => Promise.resolve()),
      query: jest.fn(() => Promise.resolve()),
      close: jest.fn(() => Promise.resolve()),
    } as any;
  },
  driver: (resolve: boolean = true) => {
    const driver = { id: Symbol('MySQL') } as any;
    driver.create = jest.fn(() => Promise.resolve(mock.connection(true)));

    if (!resolve) {
      driver.create = jest.fn(() =>
        Promise.reject(new CreateConnectionError('Ops'))
      );
    }

    return driver;
  },
  pool: (driver?: Driver, options?: PoolOptions) => {
    return new Pool(
      driver ? driver : mock.driver(),
      options ? options : undefined
    );
  },
};

describe('Pool', () => {
  describe('options', () => {
    test('driver', () => {
      // throws if you provide an invalid driver
      expect(() => new Pool({} as any)).toThrow(PoolError);

      // does not throw when you provide a valid driver
      expect(() => new Pool(mock.driver())).not.toThrow();
    });

    test('maxConnection', async () => {
      // the default number of connections the pool is allowed to create is 10
      const pool1 = mock.pool();
      expect(pool1.get.options().maxConnection).toEqual(10);

      // now create a pool allowed to create two connections only
      const pool2 = mock.pool(mock.driver(), {
        maxConnection: 2,
        shouldQueue: false,
      });

      expect(pool2.get.options().maxConnection).toEqual(2);

      // now request 2 connections
      const connection1 = await pool2.request();
      const connection2 = await pool2.request();

      expect(isPoolCon(connection1)).toBe(true);
      expect(isPoolCon(connection2)).toBe(true);

      // now request the third connection
      try {
        await pool2.request();
      } catch (err) {
        // YOU GET AN ERROR BECAUSE YOU HAVE REACHED THE MAX NUMBER OF CONNECTIONS
        expect(err).toBeInstanceOf(MaxConnectionError);
      }
    });

    test('maxIdleTime', async () => {
      // the default number of miliseconds a connection can stay in the pool before closing is 60000 (1min)
      const pool1 = mock.pool();
      expect(pool1.get.options().maxIdleTime).toEqual(60000);

      // now create a pool allows connections to stay idle for 2min
      const pool2 = mock.pool(mock.driver(), {
        maxIdleTime: 60000 * 2,
      });

      expect(pool2.get.options().maxIdleTime).toEqual(60000 * 2);

      // now request a connections and release it to make it idle
      const connection = await pool2.request();

      // now at this point we dont have any idle connection
      expect(pool2.has.idle()).toBeFalsy();

      // use jest fake timers
      jest.useFakeTimers();

      // release the connection back to the pool
      connection.release();

      // now the connection is idle
      expect(pool2.has.idle()).toBeTruthy();

      // now we wait for 2 min then we check if the connection is still there
      jest.advanceTimersByTime(60000 * 2);

      // now after 2min the connection should be closed and dereferenced
      expect(pool2.has.idle()).toBeFalsy();
    });

    test('shouldQueue', async () => {
      const pool1 = mock.pool(mock.driver(), { maxConnection: 1 });
      expect(pool1.get.options().shouldQueue).toEqual(true);

      // request a connection
      const connection1 = await pool1.request();

      /*
       * because shouldQueue is true and maxConnection is 1
       * from now on all connection requests are going to be queued
       * until a connection becomes idle then your request is going to be resolved
       */

      // at this point, no request is queued
      expect(pool1.has.request()).toBeFalsy();

      // make a request
      const promiseOfConnection = pool1.request();

      // now the request is queued
      expect(pool1.has.request()).toBeTruthy();

      // if we release the connection the request is going to be resolved
      connection1.release();

      const result = await promiseOfConnection;
      expect(isPoolCon(result)).toBeTruthy();

      // of course, you can disable queuing requests
      const pool2 = mock.pool(mock.driver(), {
        shouldQueue: false,
        maxConnection: 1,
      });

      // now when the maxConnection is reached you get an error instead
      await pool2.request();
      await expect(pool2.request()).rejects.toBeInstanceOf(MaxConnectionError);
    });

    describe('shouldCheck', () => {
      test('should not check', async () => {
        const driver = mock.driver();
        const connection = mock.connection();
        driver.create = jest.fn().mockResolvedValue(connection);
        const pool = mock.pool(driver, { shouldCheck: false });
        expect(pool.get.options().shouldCheck).toEqual(false);

        // make an idle connection
        (await pool.request()).release();

        // request again (triggers cheking)
        await pool.request();

        // checking is disabled
        expect(connection.query).not.toHaveBeenCalled();
      });

      test('should check', async () => {
        const driver = mock.driver();
        const connection = mock.connection();
        driver.create = jest.fn().mockResolvedValue(connection);
        const pool = mock.pool(driver, { shouldCheck: true });
        expect(pool.get.options().shouldCheck).toEqual(true);

        // make an idle connection
        (await pool.request()).release();

        // request again (triggers cheking)
        await pool.request();

        // checking is enabled
        expect(connection.query).toHaveBeenCalled();
      });
    });

    test('maxQueueSize', async () => {
      // the max number of requests allowed to be queued
      // the default value is Infinity
      // which means your pool is going to queue an endless number of requests

      const pool1 = mock.pool();
      expect(pool1.get.options().maxQueueSize).toEqual(Infinity);

      // of course, you can set the number of requests to queue
      const pool2 = mock.pool(mock.driver(), {
        maxQueueSize: 1,
        maxConnection: 1,
      });

      expect(pool2.get.options().maxQueueSize).toEqual(1);

      // request your first connection
      await pool2.request();

      // request the second connection
      pool2.request();

      // the second request is queued because maxConnection is 1 and shouldQueue is true
      expect(pool2.has.request()).toBe(true);
      expect(pool2.get.count.request()).toBe(1);

      // now if we request one more time we get an error
      // because the queue is full (has one request)
      await expect(pool2.request()).rejects.toBeInstanceOf(MaxQueueSizeError);
    });

    test('maxQueueTime', async () => {
      // The max number of milliseconds a request is allowed to be queued
      // it's 1000 milliseconds (1 second) by default

      const pool1 = mock.pool();
      expect(pool1.get.options().maxQueueTime).toEqual(1000);

      // of course, you can set the number of milliseconds requests are allowed to be queued
      const pool2 = mock.pool(mock.driver(), {
        maxConnection: 1,
        maxQueueTime: 3000, // 3s
      });

      expect(pool2.get.options().maxQueueTime).toEqual(3000);

      // request your first connection
      await pool2.request();

      // make sure to use jest fake timers
      jest.useFakeTimers();

      // now if we request the second connection
      const connectionPromise = pool2.request();

      // the request is queued
      expect(pool2.get.count.request()).toBe(1);

      jest.advanceTimersByTime(3000);

      // we get an error because the max number of milliseconds a request can be queued is passed
      await expect(connectionPromise).rejects.toBeInstanceOf(MaxQueueTimeError);
    });

    test('shouldRetry', async () => {
      // should retry failed operations (connection closing and creation)
      // first we make connection creation fail once
      const driver1 = mock.driver();

      driver1.create = jest
        .fn()
        .mockRejectedValueOnce(new CreateConnectionError('ops'))
        .mockResolvedValueOnce(mock.connection());

      // create new pool
      const pool1 = mock.pool(driver1);
      expect(pool1.get.options().shouldRetry).toBeTruthy();

      // request a connection
      const connection = await pool1.request();

      expect(isPoolCon(connection)).toBeTruthy();

      /**
       * The driver1.create used by the pool to create connections
       * called 2 times because shouldRetry is true
       */
      expect(driver1.create).toHaveBeenCalledTimes(2);

      /**
       * Ofcourse, we can disable retry! first we make sure creation always fail
       */

      const driver2 = mock.driver(false);
      const pool2 = mock.pool(driver2, {
        shouldRetry: false,
      });

      // now if we request a connection
      try {
        await pool2.request();
      } catch (error) {
        // creation fails
        expect(error).toBeInstanceOf(CreateConnectionError);

        // driver.create is executed one time and never retried
        expect(driver2.create).toHaveBeenCalledTimes(1);
      }
    });

    test('maxRetry', async () => {
      // the max number of retries allowed
      // first we make connection creation fail
      const pool1 = mock.pool(mock.driver(false));

      // default number of retries is 3
      expect(pool1.get.options().maxRetry).toBe(3);

      // now if we request a connection
      try {
        await pool1.request();
      } catch (error) {
        // creation fails
        expect(error).toBeInstanceOf(CreateConnectionError);

        // driver.create is executed 4 time first attempt fail + 3 retries
        expect(pool1.get.driver().create).toHaveBeenCalledTimes(4);
      }

      // ofcourse, you can change the number of retries as you like
      const pool2 = mock.pool(mock.driver(false), { maxRetry: 1 });

      try {
        await pool2.request();
      } catch (error) {
        // creation fails
        expect(error).toBeInstanceOf(CreateConnectionError);

        // driver.create is executed 2 time first attempt fail + 1 retry
        expect(pool2.get.driver().create).toHaveBeenCalledTimes(2);
      }
    });

    test('retryDelay', async () => {
      // the number of miliseconds between each retry attempt

      // the retryDelay is 500 milisecond (0.5s)
      const pool1 = mock.pool();
      expect(pool1.get.options().retryDelay).toBe(500);

      // ofcourse, you can update the retryDelay
      const pool2 = mock.pool(mock.driver(false), {
        retryDelay: 1000,
        maxRetry: 1,
      });

      try {
        await pool2.request();
      } catch (error) {
        expect(error).toBeInstanceOf(CreateConnectionError);
        expect(pool2.get.driver().create).toHaveBeenCalledTimes(2);
        expect(Echo.sleep).toHaveBeenLastCalledWith(1000);
      }
    });

    test('extraDelay', async () => {
      // the number of miliseconds to add to the retryDelay for each retry attempt
      // the default extraDelay also is 500 milisecond (0.5s)
      const pool1 = mock.pool();
      expect(pool1.get.options().extraDelay).toBe(500);

      // ofcourse, you can update the extraDelay
      const pool2 = mock.pool(mock.driver(false), {
        retryDelay: 1000,
        extraDelay: 100,
        maxRetry: 2,
      }); // extraDelay now is 100

      try {
        Echo.sleep = jest.fn(() => Promise.resolve());
        await pool2.request();
      } catch (error) {
        expect(error).toBeInstanceOf(CreateConnectionError);
        // 2 retry attemps + the initial try = 3
        expect(pool2.get.driver().create).toHaveBeenCalledTimes(3);
        // the first retry Echo.sleep is called with 1000 ms
        expect(Echo.sleep).toHaveBeenNthCalledWith(1, 1000);
        // the seccond retry Echo.sleep is called with 1100 ms becuase the extraDelay is added to retryDelay
        expect(Echo.sleep).toHaveBeenNthCalledWith(2, 1100);
        // Echo.sleep executed 2 times before each retry attempt
        expect(Echo.sleep).toHaveBeenCalledTimes(2);
      }
    });

    test('should be an object', () => {
      expect(() => new Pool([] as any)).toThrow(PoolError);
      expect(() => new Pool('options' as any)).toThrow(PoolError);
      expect(() => new Pool(88 as any)).toThrow(PoolError);

      const driver = mock.driver();

      // some options should not be 0
      const pool = mock.pool(driver, {
        maxConnection: 0, // becomes 10
        maxIdleTime: 0, // becomes 60000
        shouldQueue: true,
        maxQueueSize: 0, // becomes Infinity
        maxQueueTime: 0, // becomes 1000
        shouldRetry: true,
        maxRetry: 0, // becomes 3
        retryDelay: 0, // becomes 500
        extraDelay: 0, // the only numeric option accepts 0
      });

      expect(pool.get.options()).toEqual({
        maxConnection: 10, // max number of connections
        maxIdleTime: 60000, // max number of miliseconds the connection can be idle
        shouldQueue: true, // should queue connection requests
        maxQueueSize: Infinity, // max number of requests to queue
        maxQueueTime: 1000, // max number of miliseconds a request can stay in the queue
        shouldRetry: true, // should retry connection creation and closing connections when they fail
        shouldCheck: true, // new options to manage connection checks
        maxRetry: 3, // max number of times to retry the opertation
        retryDelay: 500, // number of miliseconds to wait before each retry attempt (3th after 1500)
        extraDelay: 0, // number of miliseoncds to add after each delay
      });
    });
  });

  describe('Pool.request', () => {
    it('should create new connection if no idle connection available', async () => {
      // Create a Pool instance
      const pool = mock.pool();

      // Verify that no idle connections are available initially
      expect(pool.has.idle()).toBeFalsy();

      // Request a connection
      const connection1 = await pool.request();

      // Ensure that there are still no idle connections available
      expect(pool.has.idle()).toBeFalsy();

      // Connections become idle when released back to the pool
      connection1.release();

      // Now we should have an idle connection
      expect(pool.has.idle()).toBeTruthy();
    });

    it('should resolve with an idle connection if there is one', async () => {
      // Create a Pool instance
      const pool = mock.pool();

      // Request and release a connection
      const connection1 = await pool.request();
      connection1.release();

      // Verify that an idle connection exists in the pool
      expect(pool.has.idle()).toBeTruthy();

      // Requesting a connection should resolve with the idle connection instead of creating a new one
      await pool.request();

      // Verify that no more idle connections are available
      expect(pool.has.idle()).toBeFalsy();

      // Ensure that no new connection is created
      expect(pool.get.driver().create).toHaveBeenCalledTimes(1);
    });

    it('should successfully close dead idle connection and resolve with new created connection', async () => {
      // Create a MySQL driver and connection for testing purposes
      const driver = mock.driver();
      const connection = mock.connection();

      // Mocking necessary methods for testing
      connection.query = jest.fn(() => Promise.reject()); // rejetcs
      connection.close = jest.fn(() => Promise.resolve()); // resolves
      driver.create = jest.fn(() => Promise.resolve(connection));

      const pool = mock.pool(driver);

      // Request and release the connection back to the pool to become idle
      const connection1 = await pool.request();
      connection1.release();

      // Requesting a connection now should close the dead connection and resolve with a new one
      // Because i always check if the connection is alive before i resolve
      await pool.request();

      // Ensure that the dead connection is closed
      expect(connection.close).toHaveBeenCalledTimes(1);

      // Ensure that a new connection is created
      expect(driver.create).toHaveBeenCalledTimes(2);
    });

    it('should successfully close dead idle connection and reject with CreateFailError', async () => {
      // Create a MySQL driver and connection for testing purposes
      const driver = mock.driver();
      const connection = mock.connection();

      // Mocking necessary methods for testing
      connection.query = jest.fn(() => Promise.reject()); // rejects
      connection.close = jest.fn(() => Promise.resolve()); // resolves
      driver.create = jest.fn(() => Promise.resolve(connection));

      const pool = mock.pool(driver, { shouldRetry: false });

      // Request and release the connection back to the pool to become idle
      const connection1 = await pool.request();
      connection1.release();

      // Requesting a connection now should close the dead connection and reject
      // because the new connection creation failed
      driver.create = jest.fn(() =>
        Promise.reject(new CreateConnectionError('ops'))
      );

      try {
        await pool.request();
      } catch (error) {
        // we get create error
        expect(error).toBeInstanceOf(CreateConnectionError);

        // Ensure the dead connection is closed
        expect(connection.close).toHaveBeenCalledTimes(1);
      }
    });

    it('should fail to close dead idle connections', async () => {
      // Create a MySQL driver and connection for testing purposes
      const driver = mock.driver();
      const connection = mock.connection();

      // Mocking necessary methods for testing
      connection.query = jest.fn(() => Promise.reject()); // rejects
      connection.close = jest.fn(() =>
        Promise.reject(new CloseConnectionError('ops'))
      ); // rejects
      driver.create = jest.fn(() => Promise.resolve(connection));

      const pool = mock.pool(driver, { shouldRetry: false });

      // Create an idle connection
      const connection1 = await pool.request();
      pool.release(connection1);

      // Requesting the idle connection now should result in a closing connection error
      try {
        await pool.request();
      } catch (error) {
        // Verify that a CloseConnectionError is thrown
        expect(error).toBeInstanceOf(CloseConnectionError);
      }
    });

    it('should fail to close dead idle connections, retry and reject', async () => {
      // Create a MySQL driver and connection for testing purposes
      const driver = mock.driver();
      const connection = mock.connection();

      // Mocking necessary methods for testing
      connection.query = jest.fn(() => Promise.reject()); // rejects
      connection.close = jest.fn(() =>
        Promise.reject(new CloseConnectionError('ops'))
      ); // rejects
      driver.create = jest.fn(() => Promise.resolve(connection));

      const pool = mock.pool(driver, { shouldRetry: true });

      // Create an idle connection
      const connection1 = await pool.request();
      pool.release(connection1);

      try {
        await pool.request();
      } catch (error) {
        // Verify that a CloseConnectionError is thrown
        expect(error).toBeInstanceOf(CloseConnectionError);

        // Verify closing the connection is retried 3 times + intial try
        expect(connection.close).toHaveBeenCalledTimes(4);
      }
    });

    it('should fail to close dead idle connections, retry and resolve', async () => {
      // Create a MySQL driver and connection for testing purposes
      const driver = mock.driver();
      const connection = mock.connection();

      // Mocking necessary methods for testing
      driver.create = jest.fn(() => Promise.resolve(connection));
      connection.query = jest.fn(() => Promise.reject()); // rejects
      connection.close = jest
        .fn()
        .mockRejectedValueOnce(new CloseConnectionError('ops')) // rejects
        .mockResolvedValue(undefined); // resolves

      const pool = mock.pool(driver, { shouldRetry: true });

      // Create an idle connection
      const connection1 = await pool.request();
      pool.release(connection1);

      await pool.request();

      // Verify closing the connection is retried
      expect(connection.close).toHaveBeenCalledTimes(2);
    });

    it('should queue the request if maxConnection reached', async () => {
      // create new pool
      const pool = mock.pool(mock.driver(), { maxConnection: 1 });

      // request the first connection
      await pool.request();
      pool.request();

      expect(pool.has.request()).toBeTruthy();
    });

    it('should reject if maxConnection is reached and queue is disabled', async () => {
      // Create a MySQL driver and connection for testing purposes
      // create new pool
      const pool = mock.pool(mock.driver(), {
        maxConnection: 1,
        shouldQueue: false,
      });

      // request the first connection
      await pool.request();

      try {
        await pool.request();
      } catch (error) {
        expect(error).toBeInstanceOf(MaxConnectionError);
      }
    });

    it('should close timeout idle connections', async () => {
      // Mocking necessary methods for testing
      const driver = mock.driver();
      driver.create = jest.fn(() => Promise.resolve(mock.connection(false)));
      const pool = mock.pool(driver);

      jest.useFakeTimers();

      // Create an idle connection
      const connection1 = await pool.request();
      pool.release(connection1);

      expect(pool.has.idle()).toBeTruthy();

      jest.advanceTimersByTime(60000);

      expect(pool.has.idle()).toBeFalsy();
    });
  });

  describe('Pool.release', () => {
    it('Should release the connection back to the pool', async () => {
      // Create a Pool instance
      const pool = mock.pool();

      // Request a connection
      const connection1 = await pool.request();

      // No idle connections avaliable before release
      expect(pool.has.idle()).toBeFalsy();

      // release the connection back
      pool.release(connection1);

      // Now we should have an idle connection
      expect(pool.has.idle()).toBeTruthy();
    });

    it('Connection must be an instance of PoolConnection', async () => {
      const pool = mock.pool();

      // Request a connection
      const connection1 = await pool.request();

      // release the connection back
      expect(() => pool.release({} as any)).toThrow(PoolError);
      expect(() => pool.release([] as any)).toThrow(PoolError);
      expect(() => pool.release('connection' as any)).toThrow(PoolError);
      expect(() => pool.release(connection1)).not.toThrow(PoolError);
    });

    it('Connection must exist in the pool', async () => {
      const pool = mock.pool();

      // Request a connection
      const connection1 = await pool.request();
      const connection2 = await mock.pool().request(); // Connection from another pool

      // release the connection back
      expect(() => pool.release(connection2)).toThrow(PoolError);
      expect(() => pool.release(connection1)).not.toThrow(PoolError);
    });

    it('Performing operations not allowed after release', async () => {
      // Create a Pool instance
      const pool = mock.pool();

      // Request a connection
      const connection1 = await pool.request();

      // release the connection back
      pool.release(connection1);

      expect(() => connection1.release()).toThrow(PoolError);
      expect(() => connection1.query('')).rejects.toBeInstanceOf(PoolError);
    });

    it('Relase also avaliable in the connection', async () => {
      // Create a Pool instance
      const pool = mock.pool();

      // Request a connection
      const connection1 = await pool.request();

      // release the connection back
      connection1.release();
    });
  });

  describe('Pool.query', () => {
    it('should execute the given sql qeury successfully', async () => {
      // Set up MySQL driver and connection for testing
      const driver = mock.driver();
      const connection = mock.connection();

      // Mock the creation of a new connection
      driver.create = jest.fn().mockResolvedValue(connection);
      connection.query = jest.fn().mockResolvedValue('data');

      // Create a Pool instance
      const pool = mock.pool(driver);

      // execute query
      const data = await pool.query('sql');

      expect(data).toBe('data');
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith('sql', undefined); // Ensure it's called with correct parameters
    });

    it('should fail to execute the given sql query', async () => {
      // Set up MySQL driver and connection for testing
      const driver = mock.driver();
      const connection = mock.connection();

      // Mock the creation of a new connection
      driver.create = jest
        .fn()
        .mockRejectedValue(new CreateConnectionError('ops'));
      connection.query = jest.fn().mockResolvedValue('data');

      // Create a Pool instance
      const pool = mock.pool(driver);

      // connection could not be created
      try {
        await pool.query('sql');
      } catch (error) {
        expect(error).toBeInstanceOf(CreateConnectionError);
      }

      // Mock the creation of a new connection
      driver.create = jest.fn().mockResolvedValue(connection);
      connection.query = jest.fn().mockRejectedValue(new QueryError());

      // query could not be executed
      try {
        await pool.query('sql');
      } catch (error) {
        expect(error).toBeInstanceOf(QueryError);
        expect(connection.query).toHaveBeenCalledTimes(1);
        expect(connection.query).toHaveBeenCalledWith('sql', undefined);
      }
    });
  });

  describe('Pool.shutdown', () => {
    it('should close all connections and clean up resources', async () => {
      // Create pool
      const pool = mock.pool();

      // request some connections
      const connection1 = await pool.request();
      const connection2 = await pool.request();

      expect(pool.get.driver().create).toHaveBeenCalledTimes(2);

      // you should always release connections before shurtdown
      pool.release(connection1);
      pool.release(connection2);

      // execute shutdown
      await pool.shutdown();

      expect(() => connection1.beginTransaction()).rejects.toThrow(PoolError);

      expect(() => connection1.commit()).rejects.toThrow(PoolError);

      expect(() => connection1.rollback()).rejects.toThrow(PoolError);

      expect(() => connection1.query('')).rejects.toThrow(PoolError);

      expect(() => connection1.release()).toThrow(PoolError);
    });

    it("Can't perform any farther operations after shutdown", async () => {
      // Create pool
      const pool = mock.pool();

      // execute shutdown
      await pool.shutdown();

      try {
        await pool.request();
      } catch (error) {
        expect(error).toBeInstanceOf(PoolError);

        expect((error as Error).message).toBe(
          "Can't perform any farther operations after shutdown"
        );
      }
    });

    it('You should always release the connections before shutdown', async () => {
      // Set up MySQL driver and connection for testing
      const pool = mock.pool();
      const connection = await pool.request();

      // you should always release the connection before shutdown
      // otherwise your get error
      try {
        await pool.shutdown();
      } catch (error) {
        expect(error).toBeInstanceOf(ShutdownError);
      }

      connection.release();
      await pool.shutdown(); // works
    });

    it('You should always freeze the pool before shutdown', async () => {
      // Set up MySQL driver and connection for testing
      const pool = mock.pool(mock.driver(), { maxConnection: 1 });

      const connection = await pool.request();
      const connectionPromise = pool.request();

      try {
        await pool.shutdown();
      } catch (error) {
        // you get this errr because you have a connection request in the pool
        // so make sure all your requests to the pool are fullfiled
        // only then you can shutdown
        expect(error).toBeInstanceOf(ShutdownError);
      }

      // make sure your connection requests are fullfilled
      connection.release(); // first connection release
      const con = await connectionPromise; // second connection acquired
      con.release(); // and released
      await pool.shutdown(); // works
    });

    it('should shutdown and resolve even if the connection closing rejects', async () => {
      const driver = mock.driver();
      driver.create = jest.fn(() => Promise.resolve(mock.connection(false)));
      const pool = mock.pool(driver);

      // make 2 idle connection
      const connection1 = await pool.request(); // unclosable
      const connection2 = await pool.request(); // unclosable

      pool.release(connection1);
      pool.release(connection2);

      // shutdown resolves even if connection1 and 2 could not be closed
      await pool.shutdown();

      // even tho connections could not be closed
      // pool has been shutdown successfully
      expect(() => pool.release(connection1)).toThrow(
        `Can't perform any farther operations after shutdown`
      );

      expect(pool.request()).rejects.toThrow(
        `Can't perform any farther operations after shutdown`
      );
    });
  });

  describe('Pool.get', () => {
    describe('count()', () => {
      describe('acquired()', () => {
        it('should return 0 when no connections are acquired', () => {
          const pool = mock.pool();
          expect(pool.get.count.acquired()).toBe(0);
        });

        it('should return the correct number of acquired connections', async () => {
          const pool = mock.pool();
          await pool.request();
          await pool.request();
          expect(pool.get.count.acquired()).toBe(2);
        });
      });

      describe('idle()', () => {
        it('should return 0 when no connections are idle', () => {
          const pool = mock.pool();
          expect(pool.get.count.idle()).toBe(0);
        });

        it('should return the correct number of idle connections', async () => {
          const pool = mock.pool();
          const connection1 = await pool.request();
          const connection2 = await pool.request();

          pool.release(connection1);
          expect(pool.get.count.idle()).toBe(1);

          pool.release(connection2);
          expect(pool.get.count.idle()).toBe(2);

          // re-acquire to clear idle connection timeouts
          await pool.request();
          await pool.request();
        });
      });

      describe('request()', () => {
        it('should return 0 when no connection requests are queued', () => {
          const pool = mock.pool();
          expect(pool.get.count.request()).toBe(0);
        });

        it('should return the correct number of queued connection requests', async () => {
          const pool = mock.pool(mock.driver(), {
            maxConnection: 1,
            shouldQueue: true,
          });

          const connection = await pool.request();
          const promise = pool.request();
          expect(pool.get.count.request()).toBe(1);

          connection.release();
          await promise;
          expect(pool.get.count.request()).toBe(0);
        });
      });
    });

    describe('options()', () => {
      it('should return the pool options', () => {
        const driver = mock.driver();
        const pool = mock.pool(driver);

        expect(pool.get.options()).toEqual({
          maxConnection: 10, // max number of connections
          maxIdleTime: 60000, // max number of miliseconds the connection can be idle
          shouldQueue: true, // should queue connection requests
          maxQueueSize: Infinity, // max number of requests to queue
          maxQueueTime: 1000, // max number of miliseconds a request can stay in the queue
          shouldRetry: true, // should retry connection creation and closing connections when they fail
          shouldCheck: true, // new options to manage connection checks
          maxRetry: 3, // max number of times to retry the opertation
          retryDelay: 500, // number of miliseconds to wait before each retry attempt (3th after 1500)
          extraDelay: 500, // number of miliseoncds to add after each delay
        });
      });
    });

    describe('driver()', () => {
      it('should return the pool driver instance', () => {
        const driver = mock.driver();
        const pool = mock.pool(driver);
        expect(pool.get.driver()).toBe(driver);
      });
    });

    describe('performance()', () => {
      it('should be Bad', async () => {
        const pool = mock.pool(mock.driver(), {
          maxConnection: 5,
        });

        await pool.request(); // 1
        await pool.request(); // 2
        await pool.request(); // 3
        await pool.request(); // 4 out of 5 === 80% of 5

        expect(pool.get.performance()).toBe(BAD_POOL);
      });

      it('should be Good', async () => {
        // first make a mock driver resolve with a mock connection
        const pool = mock.pool(mock.driver(), {
          maxConnection: 5,
        });

        await pool.request(); // 1
        await pool.request(); // 2
        await pool.request(); // 3 out of 5 greather than 50% of 5

        expect(pool.get.performance()).toBe(GOOD_POOL);
      });

      it('should be Great', async () => {
        const pool = mock.pool(mock.driver(), {
          maxConnection: 5,
        });

        await pool.request(); // 1
        await pool.request(); // 2 out of 5 less than 50% of 5

        expect(pool.get.performance()).toBe(GREAT_POOL);
      });
    });
  });

  describe('Pool.has', () => {
    describe('acquired()', () => {
      it('should return false when no connections are acquired', () => {
        const pool = mock.pool();
        expect(pool.has.acquired()).toBe(false);
      });

      it('should return true when connections are acquired', async () => {
        const pool = mock.pool();
        await pool.request();
        expect(pool.has.acquired()).toBe(true);
      });
    });

    describe('idle()', () => {
      it('should return false when no connections are idle', () => {
        const pool = mock.pool();
        expect(pool.has.idle()).toBe(false);
      });

      it('should return true when connections are idle', async () => {
        const pool = mock.pool();

        const connection = await pool.request();
        pool.release(connection);
        expect(pool.has.idle()).toBe(true);

        await pool.request();
        expect(pool.has.idle()).toBe(false);
      });
    });

    describe('request()', () => {
      it('should return false when no connection requests are made', () => {
        const pool = mock.pool();
        expect(pool.has.request()).toBe(false);
      });

      it('should return true when connection requests are made', async () => {
        const pool = mock.pool(mock.driver(), {
          maxConnection: 1,
          shouldQueue: true,
        });

        const connection = await pool.request();
        const promise = pool.request();
        expect(pool.has.request()).toBe(true);

        connection.release();
        await promise;
        expect(pool.has.request()).toBe(false);
      });
    });
  });

  describe('Pool.on', () => {
    test('CREATE_SUCCESS', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(CREATE_SUCCESS, handler);

      // request a connection
      const connection = await pool.request();

      // the handler should be executed when even a new connection is created successfully
      expect(handler).toHaveBeenCalledTimes(1);

      // you can access the newly created connection
      expect(handler).toHaveBeenCalledWith(connection);
    });

    test('CREATE_FAIL', async () => {
      // first make a mock driver resolve with a mock connection

      const handler = jest.fn();
      const pool = mock.pool(mock.driver(false));

      // register event handler
      pool.on(CREATE_FAIL, handler);

      try {
        // request a connection
        await pool.request();
      } catch (error) {
        // the handler should be executed when even a connection creation fails
        expect(handler).toHaveBeenCalledTimes(1);

        // you can access the reason why the created has been failed
        expect(handler).toHaveBeenCalledWith(error);
      }
    });

    test('CLOSE_SUCCESS', async () => {
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(CLOSE_SUCCESS, handler);

      // request connection
      const connection = await pool.request();
      connection.release();

      // shutdown pool to close the connection
      await pool.shutdown();

      // the handler should be executed when even the connection is closed successfully
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('CLOSE_FAIL', async () => {
      const driver = mock.driver();
      driver.create = jest.fn(() => Promise.resolve(mock.connection(false)));

      const handler = jest.fn();
      const pool = mock.pool(driver);

      // register event handler
      pool.on(CLOSE_FAIL, handler);

      // request connection
      const connection = await pool.request();
      connection.release();

      // shutdown pool to close the connection
      await pool.shutdown();

      // the handler should be executed when closing the connection fails
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Error)
      );

      // you can access the reason why the connection could not be closed
      // you can also access the connection to store it somewhere for later closing attempt
      // in the PendingConnection
      const pendingCon: PendingConnection = handler.mock.calls[0][0];

      expect(isPendingCon(pendingCon)).toBeTruthy();

      // this way
      expect(pendingCon.close()).rejects.toThrow(CloseConnectionError);
    });

    test('QUERY_SUCCESS', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(QUERY_SUCCESS, handler);

      // request connection
      await pool.query('sql');

      // the handler should be executed when even the query is resolved successfully
      expect(handler).toHaveBeenCalledTimes(1);

      // you can also access the data
      expect(handler).toHaveBeenCalledWith(undefined);

      await pool.shutdown(); // end idle timers
    });

    test('QUERY_FAIL', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      pool.on(QUERY_FAIL, handler);

      try {
        // request connection
        await pool.query('sql');
      } catch (error) {
        // the handler should be executed when even the query is failed to resolve
        expect(handler).toHaveBeenCalledTimes(1);

        // you can also access the reason
        expect(handler).toHaveBeenCalledWith(error);

        await pool.shutdown();
      }
    });

    test('MAX_QUEUE_TIME', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool(mock.driver(), {
        maxConnection: 1,
        maxQueueTime: 1000,
      });

      // register event handler
      pool.on(MAX_QUEUE_TIME, handler);

      jest.useFakeTimers();

      await pool.request(); // 1
      const promise = pool.request(); // queued

      expect(pool.has.request()).toBe(true);

      // advance
      jest.advanceTimersByTime(1000);

      try {
        await promise; // to reject
      } catch (error) {
        expect(error).toBeInstanceOf(MaxQueueTimeError);

        // the handler should be executed when even the max request queue time is passed
        expect(handler).toHaveBeenCalledTimes(1);
      }
    });

    test('MAX_QUEUE_SIZE', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool(mock.driver(), {
        maxConnection: 1,
        maxQueueTime: 1000,
        maxQueueSize: 1,
      });

      // register event handler
      pool.on(MAX_QUEUE_SIZE, handler);

      await pool.request(); // 1

      try {
        // this request is queued
        pool.request();

        expect(pool.has.request()).toBe(true);

        // this one could not be queued due to maxQueueSize is set to 1
        await pool.request();
      } catch (error) {
        // the handler should be executed when the max request queue size is passed
        expect(error).toBeInstanceOf(MaxQueueSizeError);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(error);
      }
    });

    test('TRANSACTION_SUCCESS', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(TRANSACTION_SUCCESS, handler);

      const connection = await pool.request(); // 1
      await connection.beginTransaction();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('TRANSACTION_FAIL', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(TRANSACTION_FAIL, handler);

      const connection = await pool.request(); // 1

      try {
        await connection.beginTransaction();
      } catch (error) {
        expect(error).toBeInstanceOf(BeginTransactionError);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(error);
      }
    });

    test('COMMIT_SUCCESS', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(COMMIT_SUCCESS, handler);

      const connection = await pool.request(); // 1
      await connection.commit();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('COMMIT_FAIL', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(COMMIT_FAIL, handler);

      const connection = await pool.request(); // 1

      try {
        await connection.commit();
      } catch (error) {
        expect(error).toBeInstanceOf(CommitTransactionError);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(error);
      }
    });

    test('ROLLBACK_SUCCESS', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(ROLLBACK_SUCCESS, handler);

      const connection = await pool.request(); // 1
      await connection.rollback();
      expect(handler).toHaveBeenCalledTimes(1);
    });

    test('ROLLBACK_FAIL', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(ROLLBACK_FAIL, handler);

      const connection = await pool.request(); // 1

      try {
        await connection.rollback();
      } catch (error) {
        expect(error).toBeInstanceOf(RollbackTransactionError);
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(error);
      }
    });

    test('SHUTDOWN_SUCCESS', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(SHUTDOWN_SUCCESS, handler);

      await pool.shutdown();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith();
    });

    test('SHUTDOWN_FAIL', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(SHUTDOWN_FAIL, handler);

      await pool.request();

      try {
        await pool.shutdown();
      } catch (error) {
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(error);
      }
    });

    test('RELEASED', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool();

      // register event handler
      pool.on(RELEASED, handler);

      const connection = await pool.request();
      connection.release();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(connection);
    });

    test('MAX_CONNECTION', async () => {
      // first make a mock driver resolve with a mock connection
      const handler = jest.fn();
      const pool = mock.pool(mock.driver(), {
        maxConnection: 1,
        shouldQueue: false,
      });

      // register event handler
      pool.on(MAX_CONNECTION, handler);

      const connection = await pool.request();

      try {
        await pool.request();
      } catch (error) {
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(error);
      }
    });
  });

  describe('PoolConnection', () => {
    describe('release', () => {
      it('should call pool.release', async () => {
        const pool = mock.pool();
        const connection = await pool.request();

        const handler = jest.fn();
        pool.on(RELEASED, handler);

        expect(pool.has.idle()).toBe(false);
        connection.release();

        expect(pool.has.idle()).toBe(true);
        expect(pool.has.idle()).toBe(true);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(connection);
      });

      it('cant perform any operations after release', async () => {
        const pool = mock.pool();
        const connection = await pool.request();

        connection.release();

        expect(() => connection.release()).toThrow(PoolError);
        expect(connection.query('sql')).rejects.toThrow(PoolError);
        expect(connection.beginTransaction()).rejects.toThrow(PoolError);
        expect(connection.commit()).rejects.toThrow(PoolError);
        expect(connection.rollback()).rejects.toThrow(PoolError);
      });
    });

    describe('query', () => {
      it('should resolve with expected result on success', async () => {
        const pool = mock.pool();
        const connection = await pool.request();

        const handler = jest.fn();
        pool.on(QUERY_SUCCESS, handler);

        await expect(connection.query('SELECT')).resolves.toBeUndefined();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(undefined);
      });

      it('should reject with QueryError on failure', async () => {
        const driver = mock.driver();
        driver.create = jest.fn(
          () => Promise.resolve(mock.connection(false)) // query rejects
        );
        const pool = mock.pool(driver);
        const connection = await pool.request();

        const handler = jest.fn();
        pool.on(QUERY_FAIL, handler);

        await expect(connection.query('SELECT')).rejects.toThrow('Ops');

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    describe('beginTransaction', () => {
      it('should resolve when transaction is initiated', async () => {
        const pool = mock.pool();
        const connection = await pool.request();

        const handler = jest.fn();
        pool.on(TRANSACTION_SUCCESS, handler);

        await expect(connection.beginTransaction()).resolves.toBeUndefined();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith();
      });

      it('should reject with PoolConnectionError on failure', async () => {
        const driver = mock.driver();
        driver.create = jest.fn(
          () => Promise.resolve(mock.connection(false)) // rejects
        );
        const pool = mock.pool(driver);
        const connection = await pool.request();

        const handler = jest.fn();
        pool.on(TRANSACTION_FAIL, handler);

        await expect(connection.beginTransaction()).rejects.toThrow('Ops');

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    describe('commit', () => {
      it('should resolve when transaction is committed', async () => {
        const pool = mock.pool();
        const connection = await pool.request();

        const handler = jest.fn();
        pool.on(COMMIT_SUCCESS, handler);

        await expect(connection.commit()).resolves.toBeUndefined();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith();
      });

      it('should reject with PoolConnectionError on failure', async () => {
        const driver = mock.driver();
        driver.create = jest.fn(
          () => Promise.resolve(mock.connection(false)) // rejects
        );
        const pool = mock.pool(driver);
        const connection = await pool.request();

        const handler = jest.fn();
        pool.on(COMMIT_FAIL, handler);

        await expect(connection.commit()).rejects.toThrow('Ops');

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(expect.any(Error));
      });
    });

    describe('rollback', () => {
      it('should resolve when transaction is rolled back', async () => {
        const pool = mock.pool();
        const connection = await pool.request();

        const handler = jest.fn();
        pool.on(ROLLBACK_SUCCESS, handler);

        await expect(connection.rollback()).resolves.toBeUndefined();

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith();
      });

      it('should reject with PoolConnectionError on failure', async () => {
        const driver = mock.driver();
        driver.create = jest.fn(
          () => Promise.resolve(mock.connection(false)) // rejects
        );
        const pool = mock.pool(driver);
        const connection = await pool.request();

        const handler = jest.fn();
        pool.on(ROLLBACK_FAIL, handler);

        await expect(connection.rollback()).rejects.toThrow('Ops');

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(expect.any(Error));
      });
    });
  });

  describe('PendingConnection', () => {
    describe('close', () => {
      test('should close pending connections', async () => {
        const driver = mock.driver();
        const connection = mock.connection(false);
        driver.create = jest.fn(() => Promise.resolve(connection));
        const pool = mock.pool(driver);

        // create a pending connection
        (await pool.request()).release();

        // handle CLOSE_FAIL
        const handler = jest.fn(async (pending) => {
          // We make sure the connection is closed successfully
          await expect(pending.close()).rejects.toThrow('Ops');

          // Make sure the close resolves
          connection.close = jest.fn(() => Promise.resolve());

          // Now try again it should resolve
          await expect(pending.close()).resolves.toBeUndefined();

          // From now on the close method is always going to resolve
          await expect(pending.close()).resolves.toBeUndefined();

          // Even if we made the inner connection rejects
          connection.close = jest.fn(() => Promise.reject(new Error('Ops')));
          await expect(pending.close()).resolves.toBeUndefined();
        });

        pool.on(CLOSE_FAIL, handler);

        // When you shutdwon the pool is going to attempt to close the connection
        await expect(pool.shutdown()).resolves.toBeUndefined();

        // Now the CLOSE_FAIL event should be emitted
        // Let's make sure our handler is executed
        expect(handler).toHaveBeenCalled();
      });
    });
  });
});
