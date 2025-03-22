jest.mock('mysql2/promise');

import mysql from 'mysql2/promise';
import { Connection } from 'mysql2';

import { MySQL } from '../../../src/core';

import { QueryError } from '../../../src/errors';
import { CreateConnectionError } from '../../../src/errors';
import { CloseConnectionError } from '../../../src/errors';
import { BeginTransactionError } from '../../../src/errors';
import { CommitTransactionError } from '../../../src/errors';
import { RollbackTransactionError } from '../../../src/errors';
import { isCon, isMySQL, isSymbol } from '../../../src/helpers';

const mock = () => {
  return {
    connection: (reject: Boolean = false) => {
      const con = {
        execute: jest.fn(() => Promise.resolve([[{ name: 'simon' }], []])),
        end: jest.fn(() => Promise.resolve()),
        beginTransaction: jest.fn(() => Promise.resolve()),
        commit: jest.fn(() => Promise.resolve()),
        rollback: jest.fn(() => Promise.resolve()),
      };

      if (reject) {
        con.execute = jest.fn(() => Promise.reject(new Error('ops')));
        con.end = jest.fn(() => Promise.reject(new Error('ops')));
        con.beginTransaction = jest.fn(() => Promise.reject(new Error('ops')));
        con.commit = jest.fn(() => Promise.reject(new Error('ops')));
        con.rollback = jest.fn(() => Promise.reject(new Error('ops')));
      }

      return con as unknown as Connection;
    },
  };
};

describe('MySQL', () => {
  describe('MySQL.create', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve with a Connection', async () => {
      mysql.createConnection = jest.fn(() => Promise.resolve({})) as any;

      const options = {};
      const driver = new MySQL(options);
      const connection = await driver.create();

      expect(connection).toBeInstanceOf(Object);
      expect(isCon(connection)).toBe(true);
      expect(isMySQL(driver)).toBe(true);

      expect(mysql.createConnection).toHaveBeenCalledWith(options);
      expect(mysql.createConnection).toHaveBeenCalledTimes(1);

      // reference the driver form the connection
      expect(connection.driver).toBe(driver);
    });

    it('should resolve with a new Connection every time', async () => {
      mysql.createConnection = jest.fn(() => Promise.resolve({})) as any;

      const connection1 = await new MySQL({}).create();
      const connection2 = await new MySQL({}).create();

      expect(connection1 === connection2).toBe(false);
    });

    it('should reject with a CreateConnectionError', async () => {
      mysql.createConnection = jest.fn(() => Promise.reject(new Error('ops')));

      const options = {};

      await expect(new MySQL(options).create()).rejects.toThrow(
        CreateConnectionError
      );

      expect(mysql.createConnection).toHaveBeenCalledWith(options);
      expect(mysql.createConnection).toHaveBeenCalledTimes(1);
    });

    it('options must be an object', async () => {
      mysql.createConnection = jest.fn(() => Promise.resolve({})) as any;

      expect(() => new MySQL({})).not.toThrow(CreateConnectionError);
      expect(() => new MySQL([] as any)).toThrow(CreateConnectionError);
      expect(() => new MySQL('options' as any)).toThrow(CreateConnectionError);
      expect(() => new MySQL(123 as any)).toThrow(CreateConnectionError);

      expect(mysql.createConnection).toHaveBeenCalledTimes(0);
    });
  });

  describe('Connection.props', () => {
    it('should have access to the driver', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const driver = new MySQL({});
      const connection = await driver.create();

      expect(connection.driver).toBeInstanceOf(MySQL);
      expect(driver).toBe(driver);
    });

    it('should have a unique id', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const driver = new MySQL({});
      const connection1 = await driver.create();
      expect(isSymbol(connection1.id)).toBe(true);

      const connection2 = await driver.create();
      expect(isSymbol(connection2.id)).toBe(true);
      expect(connection2.id !== connection1.id).toBe(true);
      expect(connection1.driver === connection2.driver).toBe(true);
    });
  });

  describe('Connection.query', () => {
    it('should resolves with the result', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();
      const sql = 'SELECT';
      const values = [];

      await expect(connection.query(sql, values)).resolves.toEqual([
        { name: 'simon' },
      ]);

      expect(mockConnection.execute).toHaveBeenCalledTimes(1);
      expect(mockConnection.execute).toHaveBeenCalledWith(sql, values);
    });

    it('should reject with QueryError ', async () => {
      const mockConnection = mock().connection(true); // rejects

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();
      const sql = 'SELECT';
      const values = [];

      await expect(connection.query(sql, values)).rejects.toThrow(QueryError);

      expect(mockConnection.execute).toHaveBeenCalledTimes(1);
      expect(mockConnection.execute).toHaveBeenCalledWith(sql, values);
    });

    it('should reject with ops', async () => {
      const mockConnection = mock().connection(true); // rejects

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();
      const sql = 'SELECT';
      const values = [];

      await expect(connection.query(sql, values)).rejects.toThrow('ops');

      expect(mockConnection.execute).toHaveBeenCalledTimes(1);
      expect(mockConnection.execute).toHaveBeenCalledWith(sql, values);
    });

    it('query must be string', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.query(123 as any)).rejects.toThrow(
        'Invalid query'
      );
      await expect(connection.query([] as any)).rejects.toThrow(
        'Invalid query'
      );
      await expect(connection.query({} as any)).rejects.toThrow(
        'Invalid query'
      );
    });

    it('values must be an array', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.query('sql', [])).resolves.toBeUndefined();
      await expect(connection.query('sql', [1, 2])).resolves.not.toThrow();
      await expect(connection.query('sql', ['simon'])).resolves.not.toThrow();
      await expect(connection.query('sql', {} as any)).rejects.toThrow(
        'Invalid query values'
      );

      await expect(connection.query('sql', 123 as any)).rejects.toThrow(
        'Invalid query values'
      );

      await expect(connection.query('sql', [{} as any])).rejects.toThrow(
        'Invalid query value'
      );
    });

    it('should resolve with Rows for SELECT queries', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      mockConnection.execute = jest
        .fn()
        .mockResolvedValue([[{ id: 1, name: 'John Doe' }]]);

      const connection = await new MySQL({}).create();

      await expect(connection.query('SELECT')).resolves.toEqual([
        { id: 1, name: 'John Doe' },
      ]);

      expect(mockConnection.execute).toHaveBeenCalledTimes(1);
      expect(mockConnection.execute).toHaveBeenCalledWith('SELECT', undefined);
    });

    it('should resolve with id for single INSERT queries', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      mockConnection.execute = jest
        .fn()
        .mockResolvedValue([{ insertId: 1, affectedRows: 1 }]);

      const connection = await new MySQL({}).create();

      await expect(connection.query('INSERT')).resolves.toBe(1);

      expect(mockConnection.execute).toHaveBeenCalledTimes(1);
      expect(mockConnection.execute).toHaveBeenCalledWith('INSERT', undefined);
    });

    it('should resolve with undefined for bulk INSERT queries', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      mockConnection.execute = jest
        .fn()
        .mockResolvedValue([{ insertId: 1, affectedRows: 3 }]);

      const connection = await new MySQL({}).create();

      await expect(connection.query('INSERT')).resolves.toBe(undefined);

      expect(mockConnection.execute).toHaveBeenCalledTimes(1);
      expect(mockConnection.execute).toHaveBeenCalledWith('INSERT', undefined);
    });

    it('should resolve with undefined for other queries', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      mockConnection.execute = jest.fn().mockResolvedValue([{}]); // Mock for other SQL types

      const connection = await new MySQL({}).create();

      await expect(connection.query('DELETE')).resolves.toBeUndefined();

      expect(mockConnection.execute).toHaveBeenCalledTimes(1);
      expect(mockConnection.execute).toHaveBeenCalledWith('DELETE', undefined);
    });
  });

  describe('Connection.close', () => {
    it('should resolve with undefined', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.close()).resolves.toBeUndefined();

      expect(mockConnection.end).toHaveBeenCalledTimes(1);
      expect(mockConnection.end).toHaveBeenCalledWith();
    });

    it('should reject with CloseConnectionError', async () => {
      const mockConnection = mock().connection(true); // rejects

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.close()).rejects.toThrow(CloseConnectionError);

      expect(mockConnection.end).toHaveBeenCalledTimes(1);
      expect(mockConnection.end).toHaveBeenCalledWith();
    });

    it('should reject with ops', async () => {
      const mockConnection = mock().connection(true); // rejects

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.close()).rejects.toThrow('ops');

      expect(mockConnection.end).toHaveBeenCalledTimes(1);
      expect(mockConnection.end).toHaveBeenCalledWith();
    });

    it('cannot execute any farther operations', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.close()).resolves.toBeUndefined(); // closed

      // all operations rejects
      await expect(connection.close()).rejects.toThrow(CloseConnectionError);
      await expect(connection.close()).rejects.toThrow(
        'Cannot perform further operations once the connection is closed'
      );

      await expect(connection.query('SELECT 1;')).rejects.toThrow(QueryError);
      await expect(connection.query('SELECT 1;')).rejects.toThrow(
        'Cannot perform further operations once the connection is closed'
      );

      await expect(connection.beginTransaction()).rejects.toThrow(
        BeginTransactionError
      );
      await expect(connection.beginTransaction()).rejects.toThrow(
        'Cannot perform further operations once the connection is closed'
      );

      await expect(connection.commit()).rejects.toThrow(CommitTransactionError);
      await expect(connection.commit()).rejects.toThrow(
        'Cannot perform further operations once the connection is closed'
      );

      await expect(connection.rollback()).rejects.toThrow(
        RollbackTransactionError
      );
      await expect(connection.rollback()).rejects.toThrow(
        'Cannot perform further operations once the connection is closed'
      );
    });
  });

  describe('Connection.beginTransaction', () => {
    it('should resolve with undefined', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.beginTransaction()).resolves.toBeUndefined();

      expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(mockConnection.beginTransaction).toHaveBeenCalledWith();
    });

    it('should reject with BeginTransactionError', async () => {
      const mockConnection = mock().connection(true); // rejects

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.beginTransaction()).rejects.toThrow(
        BeginTransactionError
      );

      expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(mockConnection.beginTransaction).toHaveBeenCalledWith();
    });

    it('should reject with ops', async () => {
      const mockConnection = mock().connection(true); // rejects

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.beginTransaction()).rejects.toThrow('ops');

      expect(mockConnection.beginTransaction).toHaveBeenCalledTimes(1);
      expect(mockConnection.beginTransaction).toHaveBeenCalledWith();
    });
  });

  describe('Connection.commit', () => {
    it('should resolve with undefined', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.commit()).resolves.toBeUndefined();

      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
      expect(mockConnection.commit).toHaveBeenCalledWith();
    });

    it('should reject with CommitTransactionError', async () => {
      const mockConnection = mock().connection(true); // rejects

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.commit()).rejects.toThrow(CommitTransactionError);

      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
      expect(mockConnection.commit).toHaveBeenCalledWith();
    });

    it('should reject with ops', async () => {
      const mockConnection = mock().connection(true); // rejects

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.commit()).rejects.toThrow('ops');

      expect(mockConnection.commit).toHaveBeenCalledTimes(1);
      expect(mockConnection.commit).toHaveBeenCalledWith();
    });
  });

  describe('Connection.rollback', () => {
    it('should resolve with undefined', async () => {
      const mockConnection = mock().connection();

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.rollback()).resolves.toBeUndefined();

      expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
      expect(mockConnection.rollback).toHaveBeenCalledWith();
    });

    it('should reject with RollbackTransactionError', async () => {
      const mockConnection = mock().connection(true); // rejects

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.rollback()).rejects.toThrow(
        RollbackTransactionError
      );

      expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
      expect(mockConnection.rollback).toHaveBeenCalledWith();
    });

    it('should reject with ops', async () => {
      const mockConnection = mock().connection(true); // rejects

      mysql.createConnection = jest.fn(() =>
        Promise.resolve(mockConnection)
      ) as any;

      const connection = await new MySQL({}).create();

      await expect(connection.rollback()).rejects.toThrow('ops');

      expect(mockConnection.rollback).toHaveBeenCalledTimes(1);
      expect(mockConnection.rollback).toHaveBeenCalledWith();
    });
  });
});
