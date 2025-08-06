jest.mock('pg');

import pg, { Client } from 'pg';
import { PostgreSQL } from '../../../src/core';

import { QueryError } from '../../../src/errors';
import { CreateConnectionError } from '../../../src/errors';
import { CloseConnectionError } from '../../../src/errors';
import { BeginTransactionError } from '../../../src/errors';
import { CommitTransactionError } from '../../../src/errors';
import { RollbackTransactionError } from '../../../src/errors';

import { isCon, isSymbol } from '../../../src/helpers';

const mock = () => {
  return {
    client: (...reject: Array<string>) => {
      const client = {
        connect: jest.fn(() => Promise.resolve()),
        query: jest.fn(() => Promise.resolve({ rows: [] })),
        end: jest.fn(() => Promise.resolve()),
      };

      if (reject.includes('connect')) {
        client.connect = jest.fn(() => Promise.reject(new Error('ops')));
      }

      if (reject.includes('query')) {
        client.query = jest.fn(() => Promise.reject(new Error('ops')));
      }

      if (reject.includes('end')) {
        client.end = jest.fn(() => Promise.reject(new Error('ops')));
      }

      return client as unknown as Client;
    },
  };
};

describe('PostgreSQL', () => {
  describe('PostgreSQL.create', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve with a Connection', async () => {
      pg.Client = jest.fn(() => mock().client()) as any;

      const options = {};
      const driver = new PostgreSQL(options);
      const connection = await driver.create();

      expect(connection).toBeInstanceOf(Object);
      expect(isCon(connection)).toBe(true);

      expect(pg.Client).toHaveBeenCalledWith(options);
      expect(pg.Client).toHaveBeenCalledTimes(1);

      // reference the driver form the connection
      expect(connection.driver).toBe(driver);
    });

    it('should resolve with a new Connection every time', async () => {
      pg.Client = jest.fn(() => mock().client()) as any;

      const connection1 = await new PostgreSQL({}).create();
      const connection2 = await new PostgreSQL({}).create();

      expect(connection1 === connection2).toBe(false);
    });

    it('should reject with a CreateConnectionError', async () => {
      pg.Client = jest.fn(() => mock().client('connect')) as any;

      const options = {};

      await expect(new PostgreSQL(options).create()).rejects.toThrow(
        CreateConnectionError
      );

      expect(pg.Client).toHaveBeenCalledWith(options);
      expect(pg.Client).toHaveBeenCalledTimes(1);
    });

    it('options must be an object', async () => {
      pg.Client = jest.fn(() => mock().client()) as any;

      expect(() => new PostgreSQL({})).not.toThrow(CreateConnectionError);
      expect(() => new PostgreSQL([] as any)).toThrow(CreateConnectionError);
      expect(() => new PostgreSQL(123 as any)).toThrow(CreateConnectionError);

      expect(pg.Client).toHaveBeenCalledTimes(0);
    });

    it('should set type parsers correctly and verify the output', async () => {
      let bigNumberStrings: boolean;

      pg.Client = jest.fn(() => mock().client()) as any;
      pg.types.setTypeParser = jest.fn((oid, parser) => {
        // Test the OID and provide the expected input for each case
        switch (oid) {
          case 20: // BIGINT
            const bigIntValue = '12345678901234567890';
            if (bigNumberStrings) expect(parser(bigIntValue)).toBe(bigIntValue);
            else expect(parser(bigIntValue)).toBe(parseInt(bigIntValue)); // Expect to return the same string if bigNumberStrings is true
            break;
          case 21: // SMALLINT
            const smallIntValue = '123';
            expect(parser(smallIntValue)).toBe(parseInt(smallIntValue)); // Expect to return parsed integer
            break;
          case 23: // INTEGER
            const intValue = '456';
            expect(parser(intValue)).toBe(parseInt(intValue)); // Expect to return parsed integer
            break;
          case 1700: // DECIMAL
            const decimalValue = '123.45';
            expect(parser(decimalValue)).toBe(parseFloat(decimalValue)); // Expect to return parsed float
            break;
          case 700: // REAL
            const realValue = '3.14';
            expect(parser(realValue)).toBe(parseFloat(realValue)); // Expect to return parsed float
            break;
          case 701: // DOUBLE PRECISION
            const doubleValue = '2.718281828459';
            expect(parser(doubleValue)).toBe(parseFloat(doubleValue)); // Expect to return parsed float
            break;
          case 1082: // DATE
            const dateValue = '2024-01-01';
            expect(parser(dateValue)).toBe(dateValue); // Expect to return the same string
            break;
          case 1083: // TIME WITHOUT TIME ZONE
            const timeValue = '12:34:56';
            expect(parser(timeValue)).toBe(timeValue); // Expect to return the same string
            break;
          case 1114: // TIMESTAMP WITHOUT TIME ZONE
            const timestampValue = '2024-01-01 12:34:56';
            expect(parser(timestampValue)).toBe(timestampValue); // Expect to return the same string
            break;
          case 114: // JSON
            const jsonValue = '{"key": "value"}';
            expect(parser(jsonValue)).toEqual(JSON.parse(jsonValue)); // Expect to return parsed JSON
            break;
          default:
            throw new Error(`Unexpected OID: ${oid}`);
        }
      }) as any;

      // Hanlde the first case when bigNumberStrings is true
      bigNumberStrings = true;
      await new PostgreSQL({ bigNumberStrings }).create();

      // Hanlde the other case when bigNumberStrings is false
      bigNumberStrings = false;
      await new PostgreSQL({ bigNumberStrings }).create();

      // Verify calls for each OID
      expect(pg.types.setTypeParser).toHaveBeenCalledWith(
        20,
        expect.any(Function)
      );
      expect(pg.types.setTypeParser).toHaveBeenCalledWith(
        21,
        expect.any(Function)
      );
      expect(pg.types.setTypeParser).toHaveBeenCalledWith(
        23,
        expect.any(Function)
      );
      expect(pg.types.setTypeParser).toHaveBeenCalledWith(
        1700,
        expect.any(Function)
      );
      expect(pg.types.setTypeParser).toHaveBeenCalledWith(
        700,
        expect.any(Function)
      );
      expect(pg.types.setTypeParser).toHaveBeenCalledWith(
        701,
        expect.any(Function)
      );
      expect(pg.types.setTypeParser).toHaveBeenCalledWith(
        1082,
        expect.any(Function)
      );
      expect(pg.types.setTypeParser).toHaveBeenCalledWith(
        1083,
        expect.any(Function)
      );
      expect(pg.types.setTypeParser).toHaveBeenCalledWith(
        1114,
        expect.any(Function)
      );
      expect(pg.types.setTypeParser).toHaveBeenCalledWith(
        114,
        expect.any(Function)
      );

      // reset pg.types.setTypeParser to default mock
      pg.types.setTypeParser = jest.fn();
    });
  });

  describe('Connection.props', () => {
    it('should have access to the driver', async () => {
      pg.Client = jest.fn(() => mock().client()) as any;

      const driver = new PostgreSQL({});
      const connection = await driver.create();

      expect(connection.driver).toBeInstanceOf(PostgreSQL);
      expect(driver).toBe(driver);
    });

    it('should have a unique id', async () => {
      pg.Client = jest.fn(() => mock().client()) as any;

      const driver = new PostgreSQL({});
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
      const client = mock().client();
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();
      const sql = 'SELECT';
      const values = [];

      await expect(connection.query(sql, values)).resolves.toEqual([]);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(sql, values);
    });

    it('should reject with QueryError ', async () => {
      const client = mock().client('query');
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();
      const sql = 'SELECT';
      const values = [];

      await expect(connection.query(sql, values)).rejects.toThrow(QueryError);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(sql, values);
    });

    it('should reject with ops', async () => {
      const client = mock().client('query');
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();
      const sql = 'SELECT';
      const values = [];

      await expect(connection.query(sql, values)).rejects.toThrow('ops');

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(sql, values);
    });

    it('query must be string', async () => {
      const client = mock().client();
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

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
      const client = mock().client();
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.query('sql', [])).resolves.toBeUndefined();
      await expect(connection.query('sql', [1, 2])).resolves.not.toThrow();
      await expect(connection.query('sql', ['simon'])).resolves.not.toThrow();
      await expect(
        connection.query('sql', ['simon', 1, true, false])
      ).resolves.not.toThrow();
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
      const client = mock().client();
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.query('SELECT')).resolves.toEqual([]);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith('SELECT', undefined);
    });

    it('should resolve with the first object for single INSERT queries', async () => {
      const client = mock().client();

      client.query = jest.fn(() =>
        Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 })
      ) as any;

      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(
        connection.query('INSERT RETURNING id;', undefined)
      ).resolves.toEqual({ id: 1 });

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(
        'INSERT RETURNING id;',
        undefined
      );
    });

    it('should resolve with all rows for bulk INSERT queries', async () => {
      const client = mock().client();

      client.query = jest.fn(() =>
        Promise.resolve({ rows: [{ id: 1 }, { id: 2 }], rowCount: 2 })
      ) as any;

      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(
        connection.query('INSERT RETURNING id;', undefined)
      ).resolves.toEqual([{ id: 1 }, { id: 2 }]);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(
        'INSERT RETURNING id;',
        undefined
      );
    });

    it('should resolve with undefined for INSERT queries with no rows returned', async () => {
      const client = mock().client();

      client.query = jest.fn(() =>
        Promise.resolve({ rows: undefined, rowCount: 0 })
      ) as any;

      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(
        connection.query('INSERT;', undefined)
      ).resolves.toBeUndefined();

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith('INSERT;', undefined);
    });

    it('should resolve with undefined for other queries', async () => {
      const client = mock().client();
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.query('DELETE')).resolves.toBeUndefined();

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith('DELETE', undefined);
    });

    it('should replace ? with $n', async () => {
      const client = mock().client();
      pg.Client = jest.fn(() => client) as any;

      client.query = jest.fn(() => Promise.resolve({})) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(
        connection.query('INSERT INTO users (id, name, age) VALUES (?, ?, ?);')
      ).resolves.toBeUndefined();

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(
        'INSERT INTO users (id, name, age) VALUES ($1, $2, $3);',
        undefined
      );
    });
  });

  describe('Connection.close', () => {
    it('should resolve with undefined', async () => {
      const client = mock().client();
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.close()).resolves.toBeUndefined();

      expect(client.end).toHaveBeenCalledTimes(1);
      expect(client.end).toHaveBeenCalledWith();
    });

    it('should reject with CloseConnectionError', async () => {
      const client = mock().client('end');
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.close()).rejects.toThrow(CloseConnectionError);

      expect(client.end).toHaveBeenCalledTimes(1);
      expect(client.end).toHaveBeenCalledWith();
    });

    it('should reject with ops', async () => {
      const client = mock().client('end');
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.close()).rejects.toThrow('ops');

      expect(client.end).toHaveBeenCalledTimes(1);
      expect(client.end).toHaveBeenCalledWith();
    });

    it('cannot query any farther operations', async () => {
      const client = mock().client();
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

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
      const client = mock().client();
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.beginTransaction()).resolves.toBeUndefined();

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(
        'BEGIN TRANSACTION;',
        undefined
      );
    });

    it('should reject with BeginTransactionError', async () => {
      const client = mock().client('query');
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.beginTransaction()).rejects.toThrow(
        BeginTransactionError
      );

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith(
        'BEGIN TRANSACTION;',
        undefined
      );
    });

    it('should reject with ops', async () => {
      const client = mock().client('query');
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.beginTransaction()).rejects.toThrow('ops');
      expect(client.query).toHaveBeenCalledWith(
        'BEGIN TRANSACTION;',
        undefined
      );
    });
  });

  describe('Connection.commit', () => {
    it('should resolve with undefined', async () => {
      const client = mock().client();
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.commit()).resolves.toBeUndefined();

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith('COMMIT;', undefined);
    });

    it('should reject with CommitTransactionError', async () => {
      const client = mock().client('query');
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.commit()).rejects.toThrow(CommitTransactionError);

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith('COMMIT;', undefined);
    });

    it('should reject with ops', async () => {
      const client = mock().client('query');
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.commit()).rejects.toThrow('ops');

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith('COMMIT;', undefined);
    });
  });

  describe('Connection.rollback', () => {
    it('should resolve with undefined', async () => {
      const client = mock().client();
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.rollback()).resolves.toBeUndefined();

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK;', undefined);
    });

    it('should reject with RollbackTransactionError', async () => {
      const client = mock().client('query');
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.rollback()).rejects.toThrow(
        RollbackTransactionError
      );

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK;', undefined);
    });

    it('should reject with ops', async () => {
      const client = mock().client('query');
      pg.Client = jest.fn(() => client) as any;

      const connection = await new PostgreSQL({}).create();

      await expect(connection.rollback()).rejects.toThrow('ops');

      expect(client.query).toHaveBeenCalledTimes(1);
      expect(client.query).toHaveBeenCalledWith('ROLLBACK;', undefined);
    });
  });
});
