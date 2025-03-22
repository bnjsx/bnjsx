jest.mock('sqlite3');

import sqlite from 'sqlite3';

import { SQLite } from '../../../src/core';
import { QueryError } from '../../../src/errors';
import { CreateConnectionError } from '../../../src/errors';
import { CloseConnectionError } from '../../../src/errors';
import { BeginTransactionError } from '../../../src/errors';
import { CommitTransactionError } from '../../../src/errors';
import { RollbackTransactionError } from '../../../src/errors';
import { isCon, isSQLite, isSymbol } from '../../../src/helpers';

const mock = () => {
  return {
    db: (...reject: Array<string>) => {
      const db = {
        close: jest.fn((callback) => callback(null)),
        run: jest.fn((sql, values, callback) => {
          // console.log(typeof callback);
          callback(null);
        }),
        all: jest.fn((sql, values, callback) => {
          // console.log(typeof callback);
          callback(null, [{ name: 'simon' }]);
        }),
      };

      if (reject.includes('run')) {
        db.run = jest.fn((sql, values, callback) => callback(new Error('ops')));
      }

      if (reject.includes('all')) {
        db.all = jest.fn((sql, values, callback) => callback(new Error('ops')));
      }

      if (reject.includes('close')) {
        db.close = jest.fn((callback) => callback(new Error('ops')));
      }

      return db;
    },
  };
};

describe('SQLite', () => {
  describe('SQLite.create', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve with a Connection', async () => {
      const db = mock().db();

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return db;
      }) as any;

      const path = ':memory';
      const driver = new SQLite(path);
      const connection = await driver.create();

      expect(connection).toBeInstanceOf(Object);
      expect(isCon(connection)).toBe(true);
      expect(isSQLite(driver)).toBe(true);

      expect(sqlite.Database).toHaveBeenCalledWith(path, expect.any(Function));
      expect(sqlite.Database).toHaveBeenCalledTimes(1);

      // reference the driver form the connection
      expect(connection.driver).toBe(driver);

      // Enable foreign key constraints
      expect(db.run).toHaveBeenCalledTimes(1);
      expect(db.run).toHaveBeenCalledWith(
        'PRAGMA foreign_keys = ON',
        undefined,
        expect.any(Function)
      );
    });

    it('should resolve with a new Connection every time', async () => {
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return mock().db();
      }) as any;

      const path = ':memory';

      const connection1 = await new SQLite(path).create();
      const connection2 = await new SQLite(path).create();

      expect(connection1 === connection2).toBe(false);
    });

    it('should reject with a CreateConnectionError', async () => {
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(() => callback(new Error('ops')), 1); // Executes afer db is resolved
        return mock().db();
      }) as any;

      const path = ':memory';

      await expect(new SQLite(path).create()).rejects.toThrow(
        CreateConnectionError
      );

      expect(sqlite.Database).toHaveBeenCalledWith(path, expect.any(Function));
      expect(sqlite.Database).toHaveBeenCalledTimes(1);

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return mock().db('run'); // db.run rejects
      }) as any;

      // Enable foreign key constraints rejects
      await expect(new SQLite(path).create()).rejects.toThrow(
        CreateConnectionError
      );
    });

    it('path must be string', async () => {
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return mock().db();
      }) as any;

      const path = ':memory';

      expect(() => new SQLite(path)).not.toThrow(CreateConnectionError);
      expect(() => new SQLite([] as any)).toThrow(CreateConnectionError);
      expect(() => new SQLite(123 as any)).toThrow(CreateConnectionError);

      expect(sqlite.Database).toHaveBeenCalledTimes(0);
    });
  });

  describe('Connection.props', () => {
    it('should have access to the driver', async () => {
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return mock().db();
      }) as any;

      const driver = new SQLite(':memory');
      const connection = await driver.create();

      expect(connection.driver).toBeInstanceOf(SQLite);
      expect(driver).toBe(driver);
    });

    it('should have a unique id', async () => {
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return mock().db();
      }) as any;

      const driver = new SQLite(':memory');
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
      const db = mock().db();

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();
      const sql = 'SELECT;';
      const values = [];

      await expect(connection.query(sql, values)).resolves.toEqual([
        { name: 'simon' },
      ]);

      expect(db.all).toHaveBeenCalledTimes(1);
      expect(db.all).toHaveBeenCalledWith(sql, values, expect.any(Function));
    });

    it('should reject with QueryError', async () => {
      const db = mock().db('all'); // db.all rejects

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();
      const sql = 'SELECT;';
      const values = [];

      await expect(connection.query(sql, values)).rejects.toThrow(QueryError);

      expect(db.all).toHaveBeenCalledTimes(1);
      expect(db.all).toHaveBeenCalledWith(sql, values, expect.any(Function));
    });

    it('should reject with ops', async () => {
      const db = mock().db('all'); // db.all rejects

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();
      const sql = 'SELECT;';
      const values = [];

      await expect(connection.query(sql, values)).rejects.toThrow('ops');

      expect(db.all).toHaveBeenCalledTimes(1);
      expect(db.all).toHaveBeenCalledWith(sql, values, expect.any(Function));
    });

    it('query must be string', async () => {
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return mock().db();
      }) as any;

      const connection = await new SQLite(':memory').create();

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
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return mock().db();
      }) as any;

      const connection = await new SQLite(':memory').create();

      await expect(connection.query('sql')).resolves.not.toThrow();
      await expect(connection.query('sql', undefined)).resolves.not.toThrow();
      await expect(connection.query('sql', [])).resolves.not.toThrow();
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
      const db = mock().db(); // db.all rejects

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      await expect(connection.query('SELECT', [])).resolves.toEqual([
        { name: 'simon' },
      ]);

      expect(db.all).toHaveBeenCalledTimes(1);
      expect(db.all).toHaveBeenCalledWith('SELECT', [], expect.any(Function));
    });

    it('should resolve with id for single INSERT queries', async () => {
      const db = mock().db();
      db.run = jest.fn(function (sql, values, callback) {
        // Mock the `this` context to simulate SQLite's behavior
        this.changes = 1; // Simulate a single insert
        this.lastID = 1; // Set the last inserted ID
        callback.call(this, null); // Call the callback with `this` context
      });

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes after db is resolved
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      await expect(connection.query('INSERT', [])).resolves.toBe(1);

      expect(db.run).toHaveBeenCalledTimes(2);
      expect(db.run).toHaveBeenCalledWith('INSERT', [], expect.any(Function));
    });

    it('should resolve with undefined for bulk INSERT queries', async () => {
      const db = mock().db();
      db.run = jest.fn(function (sql, values, callback) {
        // Mock the `this` context to simulate SQLite's behavior
        this.changes = 3; // Simulate a bulk insert
        this.lastID = 1; // Set the last inserted ID (not used in this case)
        callback.call(this, null); // Call the callback with `this` context
      });

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes after db is resolved
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      await expect(connection.query('INSERT', [])).resolves.toBe(undefined);

      expect(db.run).toHaveBeenCalledTimes(2);
      expect(db.run).toHaveBeenCalledWith('INSERT', [], expect.any(Function));
    });

    it('should resolve with undefined for other queries', async () => {
      const db = mock().db(); // db.all rejects

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      await expect(connection.query('DELETE')).resolves.toBeUndefined();

      expect(db.run).toHaveBeenCalledTimes(2);
      expect(db.run).toHaveBeenCalledWith(
        'DELETE',
        undefined,
        expect.any(Function)
      );
    });
  });

  describe('Connection.close', () => {
    it('should resolve with undefined', async () => {
      const db = mock().db();

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      await expect(connection.close()).resolves.toBeUndefined();

      expect(db.close).toHaveBeenCalledTimes(1);
      expect(db.close).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should reject with CloseConnectionError', async () => {
      const db = mock().db('close'); // db.close rejects

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      await expect(connection.close()).rejects.toThrow(CloseConnectionError);

      expect(db.close).toHaveBeenCalledTimes(1);
      expect(db.close).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should reject with ops', async () => {
      const db = mock().db('close'); // db.close rejects

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      await expect(connection.close()).rejects.toThrow('ops');

      expect(db.close).toHaveBeenCalledTimes(1);
      expect(db.close).toHaveBeenCalledWith(expect.any(Function));
    });

    it('cannot execute any farther operations', async () => {
      const db = mock().db(); // db.close resolves

      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executes afer db is resolved
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

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
      const db = mock().db(); // run resolves
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1);
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      await expect(connection.beginTransaction()).resolves.toBeUndefined();

      expect(db.run).toHaveBeenCalledTimes(2);
      expect(db.run).toHaveBeenLastCalledWith(
        'BEGIN TRANSACTION;',
        undefined,
        expect.any(Function)
      );
    });

    it('should reject with BeginTransactionError', async () => {
      const db = mock().db(); // run resolves
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1);
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      // Make run rejects
      db.run = jest.fn((sql, values, callback) => callback(new Error('ops')));
      await expect(connection.beginTransaction()).rejects.toThrow(
        BeginTransactionError
      );

      expect(db.run).toHaveBeenCalledTimes(1);
      expect(db.run).toHaveBeenLastCalledWith(
        'BEGIN TRANSACTION;',
        undefined,
        expect.any(Function)
      );
    });

    it('should reject with ops', async () => {
      const db = mock().db(); // run resolves
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1);
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      // Make run rejects
      db.run = jest.fn((sql, values, callback) => callback(new Error('ops')));
      await expect(connection.beginTransaction()).rejects.toThrow('ops');

      expect(db.run).toHaveBeenCalledTimes(1);
      expect(db.run).toHaveBeenLastCalledWith(
        'BEGIN TRANSACTION;',
        undefined,
        expect.any(Function)
      );
    });
  });

  describe('Connection.commit', () => {
    it('should resolve with undefined', async () => {
      const db = mock().db();
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executed after db instance is created
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      await expect(connection.commit()).resolves.toBeUndefined();

      expect(db.run).toHaveBeenCalledTimes(2);
      expect(db.run).toHaveBeenLastCalledWith(
        'COMMIT;',
        undefined,
        expect.any(Function)
      );
    });

    it('should reject with CommitTransactionError', async () => {
      const db = mock().db(); // run resolves
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1);
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      // Make run rejects
      db.run = jest.fn((sql, values, callback) => callback(new Error('ops')));
      await expect(connection.commit()).rejects.toThrow(CommitTransactionError);

      expect(db.run).toHaveBeenCalledTimes(1);
      expect(db.run).toHaveBeenLastCalledWith(
        'COMMIT;',
        undefined,
        expect.any(Function)
      );
    });

    it('should reject with ops', async () => {
      const db = mock().db(); // run resolves
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1);
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      // Make run rejects
      db.run = jest.fn((sql, values, callback) => callback(new Error('ops')));
      await expect(connection.commit()).rejects.toThrow('ops');

      expect(db.run).toHaveBeenCalledTimes(1);
      expect(db.run).toHaveBeenLastCalledWith(
        'COMMIT;',
        undefined,
        expect.any(Function)
      );
    });
  });

  describe('Connection.rollback', () => {
    it('should resolve with undefined', async () => {
      const db = mock().db();
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1); // Executed after db instance is created
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      await expect(connection.rollback()).resolves.toBeUndefined();

      expect(db.run).toHaveBeenCalledTimes(2);
      expect(db.run).toHaveBeenLastCalledWith(
        'ROLLBACK;',
        undefined,
        expect.any(Function)
      );
    });

    it('should reject with RollbackTransactionError', async () => {
      const db = mock().db(); // run resolves
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1);
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      // Make run rejects
      db.run = jest.fn((sql, values, callback) => callback(new Error('ops')));
      await expect(connection.rollback()).rejects.toThrow(
        RollbackTransactionError
      );

      expect(db.run).toHaveBeenCalledTimes(1);
      expect(db.run).toHaveBeenLastCalledWith(
        'ROLLBACK;',
        undefined,
        expect.any(Function)
      );
    });

    it('should reject with ops', async () => {
      const db = mock().db(); // run resolves
      sqlite.Database = jest.fn((path, callback) => {
        setTimeout(callback, 1);
        return db;
      }) as any;

      const connection = await new SQLite(':memory').create();

      // Make run rejects
      db.run = jest.fn((sql, values, callback) => callback(new Error('ops')));
      await expect(connection.rollback()).rejects.toThrow('ops');

      expect(db.run).toHaveBeenCalledTimes(1);
      expect(db.run).toHaveBeenLastCalledWith(
        'ROLLBACK;',
        undefined,
        expect.any(Function)
      );
    });
  });
});
