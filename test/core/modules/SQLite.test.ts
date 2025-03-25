import Database from 'better-sqlite3';
import { SQLite } from '../../../src';
import {
  CreateConnectionError,
  QueryError,
  CloseConnectionError,
  BeginTransactionError,
  CommitTransactionError,
  RollbackTransactionError,
} from '../../../src/errors';

describe('SQLite Driver', () => {
  describe('Constructor', () => {
    it('should create instance with valid file path', () => {
      const driver = new SQLite(':memory:');
      expect(driver).toBeInstanceOf(SQLite);
      expect(driver.id).toBeDefined();
      expect(typeof driver.id === 'symbol').toBe(true);
    });

    it('should throw CreateConnectionError with invalid path type', () => {
      expect(() => new SQLite(null as any)).toThrow(CreateConnectionError);
      expect(() => new SQLite(123 as any)).toThrow(CreateConnectionError);
      expect(() => new SQLite(undefined as any)).toThrow(CreateConnectionError);
      expect(() => new SQLite({} as any)).toThrow(CreateConnectionError);
    });
  });

  describe('create()', () => {
    it('should create a connection with in-memory database', async () => {
      const driver = new SQLite(':memory:');
      const connection = await driver.create();
      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.driver).toBe(driver);
      await connection.close();
    });

    it('should reject with a CreateConnectionError if there is an issue', async () => {
      jest.resetModules(); // Reset modules to mock better-sqlite3
      // Temporarily mock better-sqlite3 for this test
      jest.doMock('better-sqlite3', () => {
        return jest.fn(() => {
          throw new Error('Database connection failed');
        });
      });

      // Re-import the module after mocking
      const { SQLite } = require('../../../src');
      const { CreateConnectionError } = require('../../../src/errors');

      const driver = new SQLite(':memory:');
      await expect(driver.create()).rejects.toThrow(CreateConnectionError);

      // Restore original implementation after the test
      jest.dontMock('better-sqlite3');
      jest.resetModules(); // Reset again to avoid affecting other tests
    });
  });

  describe('Connection', () => {
    let driver: SQLite;
    let connection: any;

    beforeEach(async () => {
      driver = new SQLite(':memory:');
      connection = await driver.create();
      // Create test table
      await connection.query(
        'CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)'
      );
    });

    afterEach(async () => {
      if (connection && typeof connection.close === 'function') {
        await connection.close().catch(() => {});
      }
    });

    describe('query()', () => {
      it('should execute SELECT queries and return rows', async () => {
        const result = await connection.query('SELECT 1 as value');
        expect(result).toEqual([{ value: 1 }]);
      });

      it('should execute INSERT queries and return lastInsertRowid for single insert', async () => {
        const id = await connection.query(
          'INSERT INTO test (name, age) VALUES (?, ?)',
          ['Alice', 30]
        );
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThan(0);

        // Verify the insert worked
        const rows = await connection.query('SELECT * FROM test WHERE id = ?', [
          id,
        ]);
        expect(rows.length).toBe(1);
        expect(rows[0].name).toBe('Alice');
      });

      it('should execute bulk INSERT and return undefined', async () => {
        const result = await connection.query(
          'INSERT INTO test (name, age) VALUES (?, ?), (?, ?)',
          ['Alice', 30, 'Bob', 25]
        );
        expect(result).toBeUndefined();

        // Verify both records were inserted
        const rows = await connection.query('SELECT * FROM test');
        expect(rows.length).toBe(2);
      });

      it('should execute UPDATE queries and return undefined', async () => {
        await connection.query('INSERT INTO test (name, age) VALUES (?, ?)', [
          'Alice',
          30,
        ]);
        const result = await connection.query(
          'UPDATE test SET age = ? WHERE name = ?',
          [31, 'Alice']
        );
        expect(result).toBeUndefined();

        // Verify update
        const rows = await connection.query(
          'SELECT age FROM test WHERE name = ?',
          ['Alice']
        );
        expect(rows[0].age).toBe(31);
      });

      it('should reject with QueryError for invalid SQL', async () => {
        await expect(connection.query(123 as any)).rejects.toThrow(QueryError);
      });

      it('should reject with QueryError for invalid values', async () => {
        await expect(
          connection.query('SELECT * FROM test', 'not-an-array' as any)
        ).rejects.toThrow(QueryError);
        await expect(
          connection.query('SELECT * FROM test WHERE id = ?', [{}])
        ).rejects.toThrow(QueryError);
      });

      it('should reject with QueryError for invalid query', async () => {
        await expect(connection.query('INVALID SQL QUERY')).rejects.toThrow(
          QueryError
        );
      });
    });

    describe('close()', () => {
      it('should close the connection', async () => {
        await expect(connection.close()).resolves.not.toThrow();
      });

      it('should prevent further operations after close', async () => {
        await connection.close();

        await expect(connection.query('SELECT 1')).rejects.toThrow(QueryError);
        await expect(connection.beginTransaction()).rejects.toThrow(
          BeginTransactionError
        );
        await expect(connection.commit()).rejects.toThrow(
          CommitTransactionError
        );
        await expect(connection.rollback()).rejects.toThrow(
          RollbackTransactionError
        );
        await expect(connection.close()).rejects.toThrow(CloseConnectionError);
      });

      it('should reject with CloseConnectionError if closing fails', async () => {
        // Spy on the prototype of Database and override the close method
        const closeSpy = jest
          .spyOn(Database.prototype, 'close')
          .mockImplementation(() => {
            throw new Error('Close failed');
          });

        await expect(connection.close()).rejects.toThrow(CloseConnectionError);

        // Restore original close method
        closeSpy.mockRestore();
      });
    });

    describe('Transactions', () => {
      it('should begin a transaction', async () => {
        await expect(connection.beginTransaction()).resolves.not.toThrow();
      });

      it('should commit a transaction', async () => {
        await connection.beginTransaction();
        await expect(connection.commit()).resolves.not.toThrow();
      });

      it('should rollback a transaction', async () => {
        await connection.beginTransaction();
        await expect(connection.rollback()).resolves.not.toThrow();
      });

      it('should reject with BeginTransactionError if begin fails', async () => {
        // Force a failure
        connection.query = jest.fn().mockRejectedValue(new Error('ops'));
        await expect(connection.beginTransaction()).rejects.toThrow(
          BeginTransactionError
        );
      });

      it('should reject with CommitTransactionError if commit fails', async () => {
        // Force a failure
        connection.query = jest.fn().mockRejectedValue(new Error('ops'));
        await expect(connection.commit()).rejects.toThrow(
          CommitTransactionError
        );
      });

      it('should reject with RollbackTransactionError if rollback fails', async () => {
        // Force a failure
        connection.query = jest.fn().mockRejectedValue(new Error('ops'));
        await expect(connection.rollback()).rejects.toThrow(
          RollbackTransactionError
        );
      });

      it('should properly handle transactions with data', async () => {
        await connection.beginTransaction();

        await connection.query('INSERT INTO test (name, age) VALUES (?, ?)', [
          'Alice',
          30,
        ]);

        // Data should be visible within the transaction
        const rowsBeforeCommit = await connection.query('SELECT * FROM test');
        expect(rowsBeforeCommit.length).toBe(1);

        await connection.rollback();

        // After rollback, data should not be visible
        const rowsAfterRollback = await connection.query('SELECT * FROM test');
        expect(rowsAfterRollback.length).toBe(0);
      });
    });

    describe('Foreign Keys', () => {
      it('should enable foreign key constraints', async () => {
        // Create tables with foreign key relationship
        await connection.query('CREATE TABLE parent (id INTEGER PRIMARY KEY)');
        await connection.query(
          'CREATE TABLE child (id INTEGER PRIMARY KEY, parent_id INTEGER, FOREIGN KEY(parent_id) REFERENCES parent(id))'
        );

        // Try to violate foreign key constraint
        await expect(
          connection.query('INSERT INTO child (parent_id) VALUES (1)')
        ).rejects.toThrow(QueryError);
      });
    });
  });
});
