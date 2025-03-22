import { CloseConnectionError } from '../../../src/errors';
import { CreateConnectionError } from '../../../src/errors';
import { GREAT_POOL, PoolOptions } from '../../../src/core';
import { Echo, Logger, LoggerError } from '../../../src/helpers';
import { MaxConnectionError } from '../../../src/errors';
import { MaxQueueTimeError } from '../../../src/errors';
import { MaxQueueSizeError } from '../../../src/errors';
import { QueryError } from '../../../src/errors';
import { CommitTransactionError } from '../../../src/errors';
import { RollbackTransactionError } from '../../../src/errors';
import { BeginTransactionError } from '../../../src/errors';
import { ShutdownError } from '../../../src/errors';
import { Driver } from '../../../src/core';
import { Connection } from '../../../src/core';
import { ClusterPoolError } from '../../../src/core';
import { ClusterPool } from '../../../src/core';
import { Cluster } from '../../../src/core';
import { ClusterError } from '../../../src/core';
import { ORDER_MODE } from '../../../src/core';
import { RANDOM_MODE } from '../../../src/core';

Echo.sleep = jest.fn(() => Promise.resolve());

const mock = {
  driver: (connection?: Connection) => {
    const driver = { id: Symbol('MySQL') } as any;

    if (connection) {
      driver.create = jest.fn(() => Promise.resolve(connection));
      return driver;
    }

    driver.create = jest.fn(() =>
      Promise.reject(new CreateConnectionError('Ops'))
    );

    return driver;
  },
  connection: (reject: boolean = false): Connection => {
    if (reject) {
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
  pool: (name: string, driver?: Driver, options?: PoolOptions) => {
    return new ClusterPool(
      name,
      driver ? driver : mock.driver(mock.connection()),
      options ? options : undefined
    );
  },
  logger: (reject: boolean = false) => {
    const logger = new Logger('path');
    logger.log = jest.fn(() => Promise.resolve());

    if (reject) {
      logger.log = jest.fn(() => Promise.reject(new LoggerError('Ops')));
    }

    return logger;
  },
};

describe('Cluster.constructor', () => {
  test('should create a new Cluster instance', () => {
    expect(() => new Cluster()).not.toThrow();
  });

  test('You can optionally add pools', () => {
    const cluster = new Cluster(mock.pool('main'));
    expect(cluster.has.active('main'));
  });
});

describe('Cluster.add', () => {
  test('adds new pool to the cluster', () => {
    const cluster = new Cluster();

    expect(cluster.get.info().count.pools.active).toBe(0);

    // add new pool
    cluster.add(mock.pool('main'));

    // now we should have a pool with the name main
    expect(cluster.has.active('main')).toBe(true);
  });

  test('should provide a valid pool instance', async () => {
    // create new cluster
    const cluster = new Cluster();
    expect(() => cluster.add({} as any)).toThrow(ClusterError);
  });

  test('pool name should be unique', async () => {
    // create new cluster
    const cluster = new Cluster();
    const main = mock.pool('main');

    // add main the first time
    expect(() => cluster.add(main)).not.toThrow(ClusterError);

    // add main the second time
    expect(() => cluster.add(main)).toThrow(ClusterError);
  });

  test('handles CREATE_FAIL event', async () => {
    // create new cluster
    const cluster = new Cluster();
    const logger = mock.logger();
    const driver = mock.driver(); // driver.create rejects

    // set logger
    cluster.set.logger(logger);

    // add new pool
    cluster.add(mock.pool('main', driver));

    await expect(cluster.request('main')).rejects.toThrow(
      CreateConnectionError
    );

    expect(logger.log as jest.Mock).toHaveBeenCalledTimes(1);
    expect(cluster.has.warnings()).toBe(true);
  });

  test('handles CLOSE_FAIL event', async () => {
    // create new cluster
    const cluster = new Cluster();
    const logger = mock.logger();
    const driver = mock.driver(mock.connection(true)); // driver.create resolves

    // set logger
    cluster.set.logger(logger);

    // add new pool
    cluster.add(mock.pool('main', driver));

    // create an idle connection
    const pool = cluster.get.pool('main');
    const con = await pool.request();
    con.release();

    // Pool is going to close the connection! emits a CLOSE_FAIL and resolve
    await pool.shutdown();

    // Cluster is going to store the pending connection for later closing attempts
    expect(cluster.has.pending()).toBe(true);

    // Cluster is going to resgiter a message to your log file to let you know about the issue
    expect(logger.log as jest.Mock).toHaveBeenCalledTimes(1);

    // Cluster is going to register a warning for you as well
    expect(cluster.has.warnings()).toBe(true);

    // Use closePendingConnections() to close all pending connections regsitered by the cluster
  });

  test('handles MAX_CONNECTION event', async () => {
    // create new cluster
    const cluster = new Cluster();
    const logger = mock.logger();
    const driver = mock.driver(mock.connection()); // driver.create resolves

    // set logger
    cluster.set.logger(logger);

    // add new pool
    cluster.add(
      mock.pool('main', driver, { maxConnection: 1, shouldQueue: false })
    );

    // acquire one connection
    await cluster.request('main'); // maxConnection reached

    // acquire another connection
    await expect(cluster.request('main')).rejects.toThrow(MaxConnectionError); // max connections passed

    // Cluster is going to resgiter a message to your log file to let you know about the issue
    expect(logger.log).toHaveBeenCalledTimes(1);

    // Cluster is going to register a warning for you as well
    expect(cluster.has.warnings()).toBe(true);
  });

  test('handles MAX_QUEUE_TIME event', async () => {
    // create new cluster
    const cluster = new Cluster();
    const logger = mock.logger();
    const driver = mock.driver(mock.connection()); // driver.create resolves

    // set logger
    cluster.set.logger(logger);

    // add new pool
    cluster.add(
      mock.pool('main', driver, {
        maxConnection: 1,
        maxQueueTime: 100,
        shouldQueue: true,
      })
    );

    // acquire one connection
    await cluster.request('main'); // maxConnection reached

    // use fake timers
    jest.useFakeTimers();

    // acquire another connection
    expect(cluster.request('main')).rejects.toThrow(MaxQueueTimeError); // connection request queued

    // advance timers
    jest.advanceTimersByTime(100); // now the request is rejected

    // Cluster is going to resgiter a message to your log file to let you know about the issue
    expect(logger.log).toHaveBeenCalledTimes(1);

    // Cluster is going to register a warning for you as well
    expect(cluster.has.warnings()).toBe(true);
  });

  test('handles MAX_QUEUE_SIZE event', async () => {
    // create new cluster
    const cluster = new Cluster();
    const logger = mock.logger();
    const driver = mock.driver(mock.connection()); // driver.create resolves

    // set logger
    cluster.set.logger(logger);

    // add new pool
    cluster.add(
      mock.pool('main', driver, {
        maxConnection: 1,
        maxQueueSize: 1,
        shouldQueue: true,
      })
    );

    // acquire one connection
    await cluster.request('main'); // maxConnection reached

    cluster.request('main'); // maxQueueSize reached

    // acquire another connection
    await expect(cluster.request('main')).rejects.toThrow(MaxQueueSizeError); // maxQueueSize passed

    // Cluster is going to resgiter a message to your log file to let you know about the issue
    expect(logger.log).toHaveBeenCalledTimes(1);

    // Cluster is going to register a warning for you as well
    expect(cluster.has.warnings()).toBe(true);
  });

  test('handles COMMIT_FAIL event', async () => {
    // create new cluster
    const cluster = new Cluster();
    const logger = mock.logger();
    const driver = mock.driver(mock.connection(true)); // resolves with a mock connections

    // set logger
    cluster.set.logger(logger);

    // add new pool
    cluster.add(mock.pool('main', driver));

    // acquire one connection
    const con = await cluster.request('main'); // maxConnection reached

    await expect(con.commit()).rejects.toThrow(CommitTransactionError);

    // Cluster is going to resgiter a message to your log file to let you know about the issue
    expect(logger.log).toHaveBeenCalledTimes(1);

    // Cluster is going to register a warning for you as well
    expect(cluster.has.warnings()).toBe(true);
  });

  test('handles TRANSACTION_FAIL event', async () => {
    // create new cluster
    const cluster = new Cluster();
    const logger = mock.logger();
    const driver = mock.driver(mock.connection(true)); // resolves with a mock connections

    // set logger
    cluster.set.logger(logger);

    // add new pool
    cluster.add(mock.pool('main', driver));

    // acquire one connection
    const con = await cluster.request('main'); // maxConnection reached

    await expect(con.beginTransaction()).rejects.toThrow(BeginTransactionError);

    // Cluster is going to resgiter a message to your log file to let you know about the issue
    expect(logger.log).toHaveBeenCalledTimes(1);

    // Cluster is going to register a warning for you as well
    expect(cluster.has.warnings()).toBe(true);
  });

  test('handles ROLLBACK_FAIL event', async () => {
    // create new cluster
    const cluster = new Cluster();
    const logger = mock.logger();
    const driver = mock.driver(mock.connection(true)); // resolves with a mock connections

    // set logger
    cluster.set.logger(logger);

    // add new pool
    cluster.add(mock.pool('main', driver));

    // acquire one connection
    const con = await cluster.request('main'); // maxConnection reached

    await expect(con.rollback()).rejects.toThrow(RollbackTransactionError);

    // Cluster is going to resgiter a message to your log file to let you know about the issue
    expect(logger.log).toHaveBeenCalledTimes(1);

    // Cluster is going to register a warning for you as well
    expect(cluster.has.warnings()).toBe(true);
  });

  test('handles QUERY_FAIL event', async () => {
    // create new cluster
    const cluster = new Cluster();
    const logger = mock.logger();
    const driver = mock.driver(mock.connection(true)); // resolves with a mock connections

    // set logger
    cluster.set.logger(logger);

    // add new pool
    cluster.add(mock.pool('main', driver));

    // acquire one connection
    const con = await cluster.request('main'); // maxConnection reached

    await expect(con.query('SQL')).rejects.toThrow(QueryError);

    // Cluster is going to resgiter a message to your log file to let you know about the issue
    expect(logger.log).toHaveBeenCalledTimes(1);

    // Cluster is going to register a warning for you as well
    expect(cluster.has.warnings()).toBe(true);
  });

  test('handles SHUTDOWN_FAIL event', async () => {
    // create new cluster
    const cluster = new Cluster();
    const logger = mock.logger();
    const driver = mock.driver(mock.connection());

    // set logger
    cluster.set.logger(logger);

    // add new pool
    cluster.add(mock.pool('main', driver));

    // acquire one connection
    const pool = cluster.get.pool('main');
    const con = await pool.request();

    await expect(pool.shutdown()).rejects.toThrow(ShutdownError);

    // Cluster is going to resgiter a message to your log file to let you know about the issue
    expect(logger.log).toHaveBeenCalledTimes(1);

    // Cluster is going to register a warning for you as well
    expect(cluster.has.warnings()).toBe(true);
  });

  test('should register a warning in case loging fail', async () => {
    const cluster = new Cluster();
    const driver = mock.driver(); // driver.create rejects
    const pool = mock.pool('main', driver);
    const logger = mock.logger(true); // logger.log rejects

    cluster.set.logger(logger);
    cluster.add(pool);

    // When we request a connection from the pool the create rejects
    // Cluster is going to handle CREATE_FAIL and register warning and logs
    // But logger.log rejects so we get 2 warnings
    await expect(cluster.request()).rejects.toThrow(CreateConnectionError);

    // Check warnings
    expect(cluster.has.warnings()).toBe(true);
    expect(cluster.get.warnings().length).toBe(2); // two warnings

    // first warning about connection creation failure
    // second warning about logger.log rejection
    // console.log(cluster.get.warnings());
  });
});

describe('Cluster.remove', () => {
  test('Pool name must be string or RegExp', () => {
    const cluster = new Cluster(mock.pool('main'));

    expect(cluster.remove(123 as any)).rejects.toBeInstanceOf(ClusterError);
  });

  test('Removes one pool and resolve', async () => {
    const cluster = new Cluster(mock.pool('main'));

    expect(cluster.has.active('main')).toBe(true);

    await cluster.remove('main');

    expect(cluster.has.active('main')).toBe(false);
  });

  test('Removes many pools and resolve', async () => {
    const cluster = new Cluster(
      mock.pool('africa_1'),
      mock.pool('africa_2'),
      mock.pool('asia_1'),
      mock.pool('asia_2')
    );

    expect(cluster.has.active('africa_1')).toBeTruthy();
    expect(cluster.has.active('africa_2')).toBeTruthy();
    expect(cluster.has.active('asia_1')).toBeTruthy();
    expect(cluster.has.active('asia_2')).toBeTruthy();

    // remove african pools
    await cluster.remove('africa*');
    expect(cluster.has.active('africa_1')).toBeFalsy();
    expect(cluster.has.active('africa_2')).toBeFalsy();

    // remove asian pools
    await cluster.remove(/asia.*/);
    expect(cluster.has.active('asia_1')).toBeFalsy();
    expect(cluster.has.active('asia_2')).toBeFalsy();
  });

  test('Removes many pools and reject', async () => {
    const cluster = new Cluster(
      mock.pool('africa_1'),
      mock.pool('africa_2'),
      mock.pool('africa_3'),
      mock.pool('africa_4')
    );

    // acquire connection from africa_1 and africa_2
    const con1 = await cluster.request('africa_1');
    const con2 = await cluster.request('africa_2');

    // make sure all pools in the cluster before remove
    expect(cluster.has.active('africa_*')).toBeTruthy();

    // remove african pools
    await expect(cluster.remove('africa_*')).rejects.toThrow(ClusterError);

    // cluster should remove africa_3/4 and keep africa_1/2
    // because africa_1/2 shutdown failed

    expect(cluster.has.active('africa_1')).toBe(true); // exist
    expect(cluster.has.active('africa_2')).toBe(true); // exist

    expect(cluster.has.active('africa_3')).toBe(false); // removed
    expect(cluster.has.active('africa_4')).toBe(false); // removed

    // before you remove a pool first make sure you release all connections back
    // and make sure you dont request any more connections!!!!!
    con1.release();
    con2.release();

    await expect(cluster.remove('africa_*')).resolves.toBe(undefined);

    // now africa_1/2 has been removed
    expect(cluster.has.active('africa_1')).toBe(false); // removed
    expect(cluster.has.active('africa_2')).toBe(false); // removed
  });

  test('Resolves if the pool does not exist', async () => {
    const cluster = new Cluster(
      mock.pool('africa_1'),
      mock.pool('africa_2'),
      mock.pool('africa_3'),
      mock.pool('africa_4')
    );

    // because asia does not exist
    await expect(cluster.remove('asia')).resolves.toBeUndefined();
  });
});

describe('Cluster.request', () => {
  test('Cluster should not be empty', () => {
    const cluster = new Cluster();
    expect(cluster.request()).rejects.toThrow('No pool found!');
  });

  test('pool name must be a string', async () => {
    const cluster = new Cluster(mock.pool('main'));

    expect(cluster.request(123 as any)).rejects.toBeInstanceOf(ClusterError);
  });

  test('pool name must be avaliable', () => {
    const cluster = new Cluster(mock.pool('main'));

    expect(cluster.request('undefined pool')).rejects.toBeInstanceOf(
      ClusterError
    );
  });

  test('request a connection from a specific pool', async () => {
    const driver1 = mock.driver(mock.connection());
    const pool1 = mock.pool('1', driver1);

    const driver2 = mock.driver(mock.connection());
    const pool2 = mock.pool('2', driver2);

    // add 2 pools
    const cluster = new Cluster(pool1, pool2);

    // request a connection from pool 1
    await cluster.request('1');

    expect(driver1.create).toHaveBeenCalledTimes(1);
  });

  test('request connections in ORDER_MODE', async () => {
    const driver1 = mock.driver(mock.connection());
    const pool1 = mock.pool('1', driver1);

    const driver2 = mock.driver(mock.connection());
    const pool2 = mock.pool('2', driver2);

    // add 2 pools
    const cluster = new Cluster(pool1, pool2);

    // request connection
    await cluster.request();

    // pool 1 is used
    expect(driver1.create).toHaveBeenCalledTimes(1); // used
    expect(driver2.create).toHaveBeenCalledTimes(0);

    // request connection
    await cluster.request();

    // now pool 2 is used
    expect(driver1.create).toHaveBeenCalledTimes(1);
    expect(driver2.create).toHaveBeenCalledTimes(1); // used

    // if we request one more connection
    await cluster.request();

    // pool 1 is used
    expect(driver1.create).toHaveBeenCalledTimes(2); // used
    expect(driver2.create).toHaveBeenCalledTimes(1);

    // this is how the ORDER_MODE works
    // this way you make sure you split traffic between your pools

    // The ORDER_MODE is the default mode
    // You can change this using cluster.set.mode(type)
  });

  test('request connections in RANDOM_MODE', async () => {
    const driver1 = mock.driver(mock.connection());
    const pool1 = mock.pool('1', driver1);

    const driver2 = mock.driver(mock.connection());
    const pool2 = mock.pool('2', driver2);

    // add 2 pools
    const cluster = new Cluster(pool1, pool2);

    // set mode
    cluster.set.mode(RANDOM_MODE);

    // mock Math.floor
    jest.spyOn(Math, 'floor').mockImplementation(() => 0);
    await cluster.request();

    expect(driver1.create).toHaveBeenCalledTimes(1);
    expect(driver2.create).toHaveBeenCalledTimes(0);

    // mock randomBetween
    jest.spyOn(Math, 'floor').mockImplementation(() => 1);
    await cluster.request();

    expect(driver1.create).toHaveBeenCalledTimes(1);
    expect(driver2.create).toHaveBeenCalledTimes(1);

    (Math.floor as jest.Mock).mockRestore();
  });

  test('request connections from a group of pools in ORDER_MODE', async () => {
    const d1 = mock.driver(mock.connection());
    const d2 = mock.driver(mock.connection());
    const d3 = mock.driver(mock.connection());
    const d4 = mock.driver(mock.connection());

    const cluster = new Cluster(
      mock.pool('asia_1', d1),
      mock.pool('asia_2', d2),
      mock.pool('africa_1', d3),
      mock.pool('africa_2', d4)
    );

    // request a connection from asian pools in order
    await cluster.request('asia_*');

    expect(d1.create).toHaveBeenCalledTimes(1);
    expect(d2.create).toHaveBeenCalledTimes(0);

    // request a connection from asian pools again
    await cluster.request('asia_*');

    expect(d1.create).toHaveBeenCalledTimes(1);
    expect(d2.create).toHaveBeenCalledTimes(1);

    // request a connection from asian pools again
    await cluster.request('asia_*');

    expect(d1.create).toHaveBeenCalledTimes(2);
    expect(d2.create).toHaveBeenCalledTimes(1);
  });

  test('request connections from a group of pools in RANDOM_MODE', async () => {
    const d1 = mock.driver(mock.connection());
    const d2 = mock.driver(mock.connection());
    const d3 = mock.driver(mock.connection());
    const d4 = mock.driver(mock.connection());

    const cluster = new Cluster(
      mock.pool('asia_1', d1),
      mock.pool('asia_2', d2),
      mock.pool('africa_1', d3),
      mock.pool('africa_2', d4)
    );

    cluster.set.mode(RANDOM_MODE);

    // request a connection from an asian pool randomly
    jest.spyOn(Math, 'floor').mockImplementation(() => 0);
    await cluster.request('asia_*');
    expect(d1.create).toHaveBeenCalledTimes(1);
    expect(d2.create).toHaveBeenCalledTimes(0);

    // request a connection from an asian pool randomly
    jest.spyOn(Math, 'floor').mockImplementation(() => 1);
    await cluster.request('asia_*');
    expect(d1.create).toHaveBeenCalledTimes(1);
    expect(d2.create).toHaveBeenCalledTimes(1);

    (Math.floor as jest.Mock).mockRestore();
  });
});

describe('freeze', () => {
  it('should freeze a pool by its name', async () => {
    const pool1 = mock.pool('pool1');
    const cluster = new Cluster(pool1);

    cluster.freeze('pool1');

    expect(() => cluster.get.pool('pool1')).toThrow('No pool found');
    expect(cluster.has.active('pool1')).toBe(false);
    await expect(cluster.request('pool1')).rejects.toThrow('No pool found');

    expect(cluster.get.pools.frozen()).toContain(pool1);
  });

  it('should throw an error if no matching pool is found', () => {
    const pool1 = mock.pool('pool1');
    const cluster = new Cluster(pool1);

    expect(() => cluster.freeze('nonexistent')).toThrow(
      new ClusterError('No matching pool found: nonexistent')
    );
  });

  it('should throw an error for an invalid pool name', () => {
    const pool1 = mock.pool('pool1');
    const cluster = new Cluster(pool1);

    expect(() => cluster.freeze(123 as unknown as string)).toThrow(
      new ClusterError('Invalid pool name: 123')
    );
  });

  it('should freeze multiple pools matching a RegExp', () => {
    const pool1 = mock.pool('pool1');
    const pool2 = mock.pool('pool2');
    const pool3 = mock.pool('pool3');
    const cluster = new Cluster(pool1, pool2, pool3);

    cluster.freeze(/^pool/);
    expect(cluster.has.active()).toBe(false); // All pools frozen
    expect(cluster.get.pools.frozen()).toEqual([pool1, pool2, pool3]);
  });
});

describe('unfreeze', () => {
  it('should unfreeze a pool by its name', async () => {
    const pool1 = mock.pool('pool1');
    const cluster = new Cluster(pool1);

    cluster.freeze('pool1');
    expect(cluster.has.active('pool1')).toBe(false);
    expect(() => cluster.get.pool('pool1')).toThrow('No pool found!');
    expect(cluster.get.pools.frozen()).toContain(pool1);
    await expect(cluster.request('pool1')).rejects.toThrow('No pool found!');

    cluster.unfreeze('pool1');
    expect(cluster.has.active('pool1')).toBe(true);
    expect(cluster.get.pool('pool1')).toBe(pool1);
    expect(cluster.get.pools.frozen()).not.toContain(pool1);
  });

  it('should throw an error if no matching frozen pool is found', () => {
    const pool1 = mock.pool('pool1');
    const cluster = new Cluster(pool1);

    expect(() => cluster.unfreeze('nonexistent')).toThrow(
      new ClusterError('No matching pool found: nonexistent')
    );
  });

  it('should throw an error for an invalid pool name', () => {
    const pool1 = mock.pool('pool1');
    const cluster = new Cluster(pool1);

    expect(() => cluster.unfreeze(123 as unknown as string)).toThrow(
      new ClusterError('Invalid pool name: 123')
    );
  });

  it('should unfreeze multiple pools matching a RegExp', () => {
    const pool1 = mock.pool('pool1');
    const pool2 = mock.pool('pool2');
    const pool3 = mock.pool('pool3');
    const cluster = new Cluster(pool1, pool2, pool3);

    expect(cluster.has.active()).toBe(true);
    expect(cluster.get.pools.frozen()).toHaveLength(0);
    expect(cluster.get.pools.active()).toEqual([pool1, pool2, pool3]);

    cluster.freeze(/^pool/);
    expect(cluster.has.active()).toBe(false); // All pools frozen
    expect(cluster.get.pools.frozen()).toHaveLength(3);
    expect(cluster.get.pools.active()).toEqual([]);

    cluster.unfreeze(/^pool/);
    expect(cluster.has.active()).toBe(true); // All pools unfrozen
    expect(cluster.get.pools.frozen()).toHaveLength(0);
    expect(cluster.get.pools.active()).toEqual([pool1, pool2, pool3]);
  });
});

describe('Cluster.closePendingConnections', () => {
  test('close all pending connections in the cluster', async () => {
    const cluster = new Cluster(
      mock.pool('africa_1', mock.driver(mock.connection(true))), // all connection operations rejects
      mock.pool('africa_2', mock.driver(mock.connection(true))) // Same as africa_1
    );

    // Request a connection from 'africa_1' and release it
    const con1 = await cluster.request();
    con1.release();

    // Request a connection from 'africa_2' and release it
    const con2 = await cluster.request();
    con2.release();

    // Remove and shut down both 'africa' pools
    // Initially, there should be no pending connections
    expect(cluster.has.pending()).toBeFalsy();
    await expect(cluster.remove('africa_*')).resolves.toBeUndefined();

    // Now, two connections could not be closed, so they should be registered as pending
    expect(cluster.has.pending()).toBeTruthy();
    expect(cluster.get.info().count.pending).toBe(2);

    // Attempt to close pending connections, but it should fail
    // because connection.close is set to always reject
    await expect(cluster.closePendingConnections()).rejects.toThrow(
      CloseConnectionError
    );

    // To ensure that closing pending connections works, let's mock the connection.close to resolve
    cluster['PendingConnections'].forEach((con) => {
      // Mock each pending connection's close method to resolve successfully
      con.close = jest.fn(() => Promise.resolve());
    });

    // Now, closing the pending connections should resolve
    await expect(cluster.closePendingConnections()).resolves.toBeUndefined();

    // After successfully closing all pending connections, there should be no pending connections left
    expect(cluster.has.pending()).toBe(false);
  });

  test('force close pending connections (dereferencing)', async () => {
    const cluster = new Cluster(
      mock.pool('africa_1', mock.driver(mock.connection(true))), // all connection operations rejects
      mock.pool('africa_2', mock.driver(mock.connection(true))) // Same as africa_1
    );

    // Request and release a connection from 'africa_1'
    const con1 = await cluster.request();
    con1.release();

    // Request and release a connection from 'africa_2'
    const con2 = await cluster.request();
    con2.release();

    // Remove and shut down both 'africa' pools
    // Initially, there should be no pending connections
    expect(cluster.has.pending()).toBeFalsy();
    await expect(cluster.remove('africa_*')).resolves.toBeUndefined();

    // Now, two connections could not be closed and are registered as pending
    expect(cluster.has.pending()).toBeTruthy();
    expect(cluster.get.info().count.pending).toBe(2);

    // Attempt to close pending connections, but it will fail since connection.close rejects
    await expect(cluster.closePendingConnections()).rejects.toThrow(
      CloseConnectionError
    );

    // In case connections are invalid, use the force argument to dereference them
    // When forced, even if connection.close rejects, connections will still be dereferenced
    await expect(
      cluster.closePendingConnections(true) // Force closing
    ).resolves.toBeUndefined();

    // closePendingConnections ignores invalid force arguments
    await expect(
      cluster.closePendingConnections('invalid force argument' as any)
    ).resolves.toBeUndefined();
  });

  test('resolve if no PendingConnections are available', async () => {
    const cluster = new Cluster(
      mock.pool('africa_1', mock.driver(mock.connection(false))), // all connection operations resolves
      mock.pool('africa_2', mock.driver(mock.connection(false))) // Same as africa_1
    );

    // Request and release a connection from 'africa_1'
    const con1 = await cluster.request();
    con1.release();

    // Request and release a connection from 'africa_2'
    const con2 = await cluster.request();
    con2.release();

    // Remove all pools
    await expect(cluster.remove('*')).resolves.toBeUndefined();

    // Since there are no pending connections, the cluster should reflect that
    expect(cluster.has.pending()).toBe(false);

    // Closing pending connections should resolve successfully since no connections are pending
    await expect(cluster.closePendingConnections()).resolves.toBeUndefined();
  });

  test('remove resolved pending connections', async () => {
    const cluster = new Cluster(
      mock.pool('africa_1', mock.driver(mock.connection(true))), // all connection operations rejects
      mock.pool('africa_2', mock.driver(mock.connection(true))) // all connection operations rejects
    );

    // Request and release a connection from 'africa_1'
    (await cluster.request()).release();

    // Request and release a connection from 'africa_2'
    (await cluster.request()).release();

    // Remove all pools
    await expect(cluster.remove('*')).resolves.toBeUndefined();

    // We have two pending connection
    expect(cluster.has.pending()).toBe(true);
    expect(cluster.get.info().count.pending).toBe(2);

    // rejects because pending connections could not be closed
    await expect(cluster.closePendingConnections()).rejects.toThrow(
      CloseConnectionError
    );

    // We still have two pending connections
    expect(cluster.has.pending()).toBe(true);
    expect(cluster.get.info().count.pending).toBe(2);

    // let's make one pending connection resolve
    cluster['PendingConnections'][0].close = jest.fn(() => Promise.resolve());

    // Now we attempt to close again
    // rejects because one pending connection could not be closed
    await expect(cluster.closePendingConnections()).rejects.toThrow(
      CloseConnectionError
    );

    // We still have one pending connection
    expect(cluster.has.pending()).toBe(true);
    expect(cluster.get.info().count.pending).toBe(1); // but just 1
  });
});

describe('Cluster.shutdown', () => {
  test('shutdown rejects when cluster.remove rejects', async () => {
    const cluster = new Cluster(mock.pool('a'), mock.pool('b'));

    // Request connections from pools 'a' and 'b'
    const con1 = await cluster.request('a');
    const con2 = await cluster.request('b');

    // Now shutdown all pools
    await expect(cluster.shutdown()).rejects.toThrow(ShutdownError);

    // cluster.shutdown rejects because cluster.remove reject
    // cluster.remove rejects because pool.shutdown rejects
    // pool.shutdow rejects because we didnt release the connections
    // thats how it work!! simple right

    // if we just release connections then we try again it should work
    con1.release(); // release the con1
    con2.release(); // release the con2

    // Now shutdown all pools
    await expect(cluster.shutdown()).resolves.toBeUndefined();
  });

  test('shutdown rejects when cluster.closePendingConnections rejects', async () => {
    const cluster = new Cluster(
      mock.pool('a', mock.driver(mock.connection(true))),
      mock.pool('b', mock.driver(mock.connection(true)))
    );

    // Request connections from pools 'a' and 'b'
    const con1 = await cluster.request('a');
    const con2 = await cluster.request('b');
    con1.release(); // release the con1
    con2.release(); // release the con2

    // Now shutdown all pools
    await expect(cluster.shutdown()).rejects.toThrow(ShutdownError);

    // cluster.shutdown rejects because cluster.closePendingConnections reject
    // cluster.closePendingConnections rejects because connection.close rejects
    // thats how it work!! simple right

    // if we just make connection.close resolves
    cluster['PendingConnections'].forEach((con) => {
      con.close = jest.fn(() => Promise.resolve());
    });

    // Now shutdown all pools
    await expect(cluster.shutdown()).resolves.toBeUndefined();
  });

  test('force value is passed to cluster.closePendingConnections', async () => {
    const cluster = new Cluster(
      mock.pool('a', mock.driver(mock.connection(true))),
      mock.pool('b', mock.driver(mock.connection(true)))
    );

    // Request connections from pools 'a' and 'b'
    const con1 = await cluster.request('a');
    const con2 = await cluster.request('b');
    con1.release(); // release the con1
    con2.release(); // release the con2

    // Now shutdown all pools
    await expect(cluster.shutdown()).rejects.toThrow(ShutdownError);

    // cluster.shutdown rejects because cluster.closePendingConnections reject
    // cluster.closePendingConnections rejects because connection.close rejects
    // thats how it work!! simple right

    // now if we force closing pending connections it should resolve
    await expect(cluster.shutdown(true)).resolves.toBeUndefined();
  });

  test('cannot perform any farther operations after shutdown', async () => {
    const cluster = new Cluster(mock.pool('a'), mock.pool('b'));

    // Now shutdown all pools
    await expect(cluster.shutdown()).resolves.toBeUndefined();

    // Can't perform any farther operations after shutdown
    expect(cluster.has).toBeNull();
    expect(cluster.set).toBeNull();
    expect(cluster.get).toBeNull();
    expect(() => cluster.add(mock.pool('pool'))).toThrow();
    await expect(cluster.remove('pool')).rejects.toThrow();
    await expect(cluster.request()).rejects.toThrow();
    await expect(cluster.shutdown()).rejects.toThrow();
    await expect(cluster.closePendingConnections()).rejects.toThrow();
  });
});

describe('Cluster.get', () => {
  describe('pool', () => {
    test('Cluster should not be empty', () => {
      const cluster = new Cluster();
      expect(() => cluster.get.pool()).toThrow('No pool found!');
    });

    test('pool name must be a string or regex', async () => {
      const cluster = new Cluster(mock.pool('main'));

      expect(() => cluster.get.pool(123 as any)).toThrow();
      expect(() => cluster.get.pool('main'));
      expect(() => cluster.get.pool('m*'));
      expect(() => cluster.get.pool(/^m.*/));
    });

    test('pool name must be avaliable', () => {
      const cluster = new Cluster(mock.pool('main'));

      expect(() => cluster.get.pool('undefined pool')).toThrow();
    });

    test('get a pool by name', async () => {
      // add 2 pools
      const pool1 = mock.pool('pool1');
      const pool2 = mock.pool('pool2');

      const cluster = new Cluster(pool1, pool2);

      expect(cluster.get.pool('pool1')).toBe(pool1);
      expect(cluster.get.pool('pool2')).toBe(pool2);
    });

    test('get pools in ORDER_MODE', async () => {
      // add 2 pools
      const pool1 = mock.pool('pool1');
      const pool2 = mock.pool('pool2');

      const cluster = new Cluster(pool1, pool2);

      // pool 1 is used
      expect(cluster.get.pool()).toBe(pool1);

      // now pool 2 is used
      expect(cluster.get.pool()).toBe(pool2);

      // pool 1 is used
      expect(cluster.get.pool()).toBe(pool1);

      // The ORDER_MODE is the default mode
      // You can change this using cluster.set.mode(type)
    });

    test('get pools in RANDOM_MODE', async () => {
      // add 2 pools
      const pool1 = mock.pool('pool1');
      const pool2 = mock.pool('pool2');

      const cluster = new Cluster(pool1, pool2);

      // set mode
      cluster.set.mode(RANDOM_MODE);

      // mock Math.floor
      jest.spyOn(Math, 'floor').mockImplementation(() => 0);
      expect(cluster.get.pool()).toBe(pool1);

      // mock Math.floor
      jest.spyOn(Math, 'floor').mockImplementation(() => 1);
      expect(cluster.get.pool()).toBe(pool2);

      (Math.floor as jest.Mock).mockRestore();
    });

    test('get pools from a group of pools in ORDER_MODE', async () => {
      const pool1 = mock.pool('asia_1');
      const pool2 = mock.pool('asia_2');
      const pool3 = mock.pool('africa_1');
      const pool4 = mock.pool('africa_2');

      const cluster = new Cluster(pool1, pool2, pool3, pool4);

      expect(cluster.get.pool('asia_*')).toBe(pool1);
      expect(cluster.get.pool('asia_*')).toBe(pool2);

      expect(cluster.get.pool('asia_*')).toBe(pool1);
      expect(cluster.get.pool('asia_*')).toBe(pool2);

      expect(cluster.get.pool('asia_*')).toBe(pool1);
      expect(cluster.get.pool('asia_*')).toBe(pool2);
    });

    test('request connections from a group of pools in RANDOM_MODE', async () => {
      const pool1 = mock.pool('asia_1');
      const pool2 = mock.pool('asia_2');
      const pool3 = mock.pool('africa_1');
      const pool4 = mock.pool('africa_2');

      const cluster = new Cluster(pool1, pool2, pool3, pool4);

      cluster.set.mode(RANDOM_MODE);

      // request a connection from an asian pool randomly
      jest.spyOn(Math, 'floor').mockImplementation(() => 0);
      expect(cluster.get.pool('asia_*')).toBe(pool1);

      // request a connection from an asian pool randomly
      jest.spyOn(Math, 'floor').mockImplementation(() => 1);
      expect(cluster.get.pool('asia_*')).toBe(pool2);

      (Math.floor as jest.Mock).mockRestore();
    });
  });

  test('info', async () => {
    const cluster = new Cluster();

    expect(typeof cluster.get.info().id).toBe('symbol');
    expect(typeof cluster.get.info().createdAt).toBe('string');
    expect(cluster.get.info().warnings.length).toBe(0);
    expect(cluster.get.info().count.pools.active).toBe(0);
    expect(cluster.get.info().count.pools.frozen).toBe(0);
    expect(cluster.get.info().count.pending).toBe(0);

    // add pools
    cluster.add(mock.pool('africa', mock.driver())); // +1 pool
    cluster.add(mock.pool('asia', mock.driver(mock.connection(true)))); // +1 pool

    expect(cluster.get.info().warnings.length).toBe(0);
    expect(cluster.get.info().count.pools.active).toBe(2);
    expect(cluster.get.info().count.pools.frozen).toBe(0);
    expect(cluster.get.info().count.pending).toBe(0);

    await expect(cluster.request('africa')).rejects.toThrow(
      CreateConnectionError
    ); // +1 warning

    expect(cluster.get.info().warnings.length).toBe(1);
    expect(cluster.get.info().count.pools.active).toBe(2);
    expect(cluster.get.info().count.pools.frozen).toBe(0);
    expect(cluster.get.info().count.pending).toBe(0);

    (await cluster.request('asia')).release();

    await expect(cluster.remove('asia')).resolves.toBeUndefined(); // +1 pending connection +1 warning

    expect(cluster.get.info().warnings.length).toBe(2);
    expect(cluster.get.info().count.pools.active).toBe(1);
    expect(cluster.get.info().count.pools.frozen).toBe(0);
    expect(cluster.get.info().count.pending).toBe(1);

    cluster.freeze('africa'); // +1 frozen

    expect(cluster.get.info().warnings.length).toBe(2);
    expect(cluster.get.info().count.pools.active).toBe(0);
    expect(cluster.get.info().count.pools.frozen).toBe(1);
    expect(cluster.get.info().count.pending).toBe(1);

    // test mode
    expect(cluster.get.info().mode).toBe(ORDER_MODE);
    cluster.set.mode(RANDOM_MODE);
    expect(cluster.get.info().mode).toBe(RANDOM_MODE);
  });

  test('infoAbout', async () => {
    const driver = mock.driver(mock.connection(true));
    const cluster = new Cluster(
      mock.pool('asia', driver, {
        shouldQueue: true,
        maxConnection: 1,
      })
    );

    expect(typeof cluster.get.infoAbout('asia').id).toBe('symbol');
    expect(typeof cluster.get.infoAbout('asia').createdAt).toBe('string');
    expect(cluster.get.infoAbout('asia').name).toBe('asia');
    expect(cluster.get.infoAbout('asia').count.acquired).toBe(0);
    expect(cluster.get.infoAbout('asia').count.idle).toBe(0);
    expect(cluster.get.infoAbout('asia').count.request).toBe(0);
    expect(cluster.get.infoAbout('asia').driver).toBe(driver);
    expect(cluster.get.infoAbout('asia').performance).toBe(GREAT_POOL);

    const connection = await cluster.request('asia'); // +1 acquired
    const promise = cluster.request('asia'); // +1 request in the queue

    expect(cluster.get.infoAbout('asia').count.request).toBe(1);
    expect(cluster.get.infoAbout('asia').count.acquired).toBe(1);
    expect(cluster.get.infoAbout('asia').count.idle).toBe(0);

    connection.release();

    (await promise).release(); // +1 idle

    expect(cluster.get.infoAbout('asia').count.request).toBe(0);
    expect(cluster.get.infoAbout('asia').count.acquired).toBe(0);
    expect(cluster.get.infoAbout('asia').count.idle).toBe(1);

    // Connection check failed => Connection close failed
    await expect(cluster.request()).rejects.toThrow(CloseConnectionError);
    expect(cluster.get.warnings().length).toBe(1);

    // pool name must be avaliable
    const cluster2 = new Cluster();
    expect(() => cluster2.get.infoAbout('undefined pool')).toThrow();

    // pool name must be string
    const cluster3 = new Cluster();
    expect(() => cluster3.get.infoAbout(123 as any)).toThrow();
  });

  test('mode', () => {
    const cluster = new Cluster();

    // default cluster mode is ORDER_MODE
    expect(cluster.get.mode()).toBe(ORDER_MODE);

    // set the mode: RANDOM_MODE
    cluster.set.mode(RANDOM_MODE);
    expect(cluster.get.mode()).toBe(RANDOM_MODE);

    // set the mode: ORDER_MODE
    cluster.set.mode(ORDER_MODE);
    expect(cluster.get.mode()).toBe(ORDER_MODE);
  });

  test('frozen', async () => {
    const asia1 = mock.pool('asia_1');
    const asia2 = mock.pool('asia_2');

    const cluster = new Cluster(asia1, asia2);

    expect(cluster.get.pools.frozen().length).toBe(0);

    // freeze asia_1
    cluster.freeze('asia_1');

    expect(cluster.get.pools.frozen().length).toBe(1);
    expect(cluster.get.pools.frozen()[0]).toBe(asia1);

    // unfreeze asia_1
    cluster.unfreeze('asia_1');

    expect(cluster.get.pools.frozen().length).toBe(0);

    // freeze asia
    cluster.freeze('asia*');

    expect(cluster.get.pools.frozen().length).toBe(2);
    expect(cluster.get.pools.frozen()[0]).toBe(asia2); // pushed second
    expect(cluster.get.pools.frozen()[1]).toBe(asia1); // pushed first

    // unfreeze asia
    cluster.unfreeze(/^asia/);
    expect(cluster.has.frozen()).toBe(false);
  });
});

describe('Cluster.has', () => {
  test('pending', async () => {
    const cluster = new Cluster(
      mock.pool('test', mock.driver(mock.connection(true)))
    );

    // make an idle connection
    (await cluster.request()).release();

    // remove pool
    await cluster.remove('test');

    // Check for pending connections
    expect(cluster.has.pending()).toBe(true);

    // No pending connections
    const emptyCluster = new Cluster();
    expect(emptyCluster.has.pending()).toBe(false);
  });

  test('warnings', async () => {
    const cluster = new Cluster(mock.pool('test', mock.driver()));

    // Request a connection to generate a warning
    await expect(cluster.request()).rejects.toThrow(CreateConnectionError);

    // Check for warnings
    expect(cluster.has.warnings()).toBe(true);

    // No warnings in a new cluster
    const warningCluster = new Cluster();
    expect(warningCluster.has.warnings()).toBe(false);
  });

  test('frozen', () => {
    const cluster = new Cluster(mock.pool('test'));

    // cluster has no frozen
    expect(cluster.has.frozen()).toBe(false);

    // Freeze a pool and check
    cluster.freeze('test');
    expect(cluster.has.frozen()).toBe(true);

    // Check for frozen pool with a specific name
    expect(cluster.has.frozen('test')).toBe(true);
    expect(cluster.has.frozen('tests')).toBe(false);

    // Check with invalid pool name
    expect(() => cluster.has.frozen(123 as unknown as string)).toThrow(
      new ClusterError('Invalid pool name: 123')
    );

    // Check using regex
    expect(cluster.has.frozen(/^test/)).toBe(true);
  });

  test('active', () => {
    const cluster = new Cluster();

    // cluster has no active pools at the start
    expect(cluster.has.active()).toBe(false);

    // add active pools
    cluster.add(mock.pool('test1'));
    cluster.add(mock.pool('test2'));

    // Check for active pools
    expect(cluster.has.active()).toBe(true);

    // Check for active pool with a specific name
    expect(cluster.has.active('test1')).toBe(true);
    expect(cluster.has.active('nonexistent')).toBe(false);

    // Check with invalid pool name
    expect(() => cluster.has.active(123 as unknown as string)).toThrow(
      new ClusterError('Invalid pool name: 123')
    );

    // Check using regex
    expect(cluster.has.active(/^test/)).toBe(true);
  });
});

describe('Cluster.set', () => {
  describe('mode', () => {
    it('should set the mode if it is valid', () => {
      const cluster = new Cluster();
      cluster.set.mode(ORDER_MODE);
      expect(cluster.get.mode()).toBe(ORDER_MODE);

      cluster.set.mode(RANDOM_MODE);
      expect(cluster.get.mode()).toBe(RANDOM_MODE);
    });

    it('should throw an error for an invalid mode type', () => {
      const cluster = new Cluster();
      expect(() => cluster.set.mode('invalid' as any)).toThrow(
        new ClusterError('Invalid mode type: invalid')
      );
    });
  });

  describe('logger', () => {
    it('should set the logger if it is valid', () => {
      const loggerInstance = mock.logger();
      const cluster = new Cluster();

      cluster.set.logger(loggerInstance);
      expect(cluster.has.logger()).toBe(true);
      expect(cluster.get.logger()).toBe(loggerInstance);
    });

    it('should throw an error for an invalid logger instance', () => {
      const cluster = new Cluster();
      expect(() => cluster.set.logger({} as any)).toThrow('Invalid logger');
    });
  });

  describe('warnings', () => {
    it('should set a single warning', () => {
      const cluster = new Cluster();

      expect(cluster.has.warnings()).toBe(false);
      cluster.set.warnings('warning');

      expect(cluster.has.warnings()).toBe(true);
    });

    it('should set multiple warnings', () => {
      const cluster = new Cluster();

      expect(cluster.has.warnings()).toBe(false);
      cluster.set.warnings(['warning 1', 'warning 2']);

      expect(cluster.has.warnings()).toBe(true);
      expect(cluster.get.warnings()).toHaveLength(2);
    });

    it('should clear warnings', () => {
      const cluster = new Cluster();

      expect(cluster.has.warnings()).toBe(false);
      cluster.set.warnings(['warning 1', 'warning 2']);

      expect(cluster.has.warnings()).toBe(true);
      expect(cluster.get.warnings()).toHaveLength(2);

      cluster.set.warnings([]);
      expect(cluster.has.warnings()).toBe(false);
    });

    it('should throw when you provide an invalid argument', () => {
      const cluster = new Cluster();
      const invalidWarning = 123 as any;

      expect(() => cluster.set.warnings(invalidWarning)).toThrow();
      expect(() => cluster.set.warnings([invalidWarning])).toThrow();
    });
  });
});

describe('ClusterPool', () => {
  it('should create an instance with a valid name', () => {
    const pool = new ClusterPool('asia', mock.driver());
    expect(pool).toBeInstanceOf(ClusterPool);
    expect(pool.name).toBe('asia');
  });

  it('should throw an error when the name is invalid', () => {
    expect(() => {
      new ClusterPool(123 as any, mock.driver());
    }).toThrow(ClusterPoolError);

    expect(() => {
      new ClusterPool(123 as any, mock.driver());
    }).toThrow(`Invalid pool name: ${String(123 as any)}`);
  });
});
