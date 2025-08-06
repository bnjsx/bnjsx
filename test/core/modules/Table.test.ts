const mock = {
  connection: () => {
    return {
      id: Symbol('PoolConnection'),
      driver: { id: Symbol('MySQL') },
      query: jest.fn(() => Promise.resolve()),
      release: jest.fn(() => Promise.resolve()),
      beginTransaction: jest.fn(() => Promise.resolve()),
      commit: jest.fn(() => Promise.resolve()),
      rollback: jest.fn(() => Promise.resolve()),
    } as any;
  },
};

const connection = mock.connection();

jest.mock('../../../src/config', () => ({
  config: () => {
    return {
      loadSync: () => ({
        default: 'main',
        cluster: {
          request: jest.fn(() => Promise.resolve(connection)),
          get: {
            pool: jest.fn(() => {
              return { driver: mock.connection().driver };
            }),
          },
        },
      }),
      resolveSync: () => __dirname,
    };
  },
}));

import { Table, TableFinder } from '../../../src/core/modules/Table';
import { Builder } from '../../../src/core/modules/Builder';
import { QueryError } from '../../../src/errors';
import { PoolConnection } from '../../../src/core/modules/Pool';
import { Fetcher } from '../../../src/core/modules/Fetcher';

describe('Table', () => {
  let table: Table;
  let connection: PoolConnection;

  beforeEach(() => {
    connection = mock.connection();
    table = new Table('users', new Builder(connection));
  });

  describe('constructor', () => {
    test('throws if table name is not a string', () => {
      expect(() => new Table(123 as any)).toThrow('Invalid table name');
    });

    test('sets table and initializes with builder', () => {
      const builder = new Builder(connection);
      const table = new Table('users', builder);

      expect(table['table']).toBe('users');
      expect(table['builder']).toBe(builder);
      expect(table['driver']).toBe(connection.driver);
    });

    test('sets table and calls pool() if no builder is passed', () => {
      const table = new Table('users');

      expect(table['table']).toBe('users');
      expect(table['pname']).toBe('main');
      expect(table['driver']).toBeDefined();
    });
  });

  describe('upsert()', () => {
    test('throws if options is not an object', async () => {
      await expect(table.upsert(null as any)).rejects.toThrow(
        'Invalid or empty upsert options'
      );
    });

    test('throws if conflict is missing or empty', async () => {
      await expect(
        table.upsert({
          rows: { id: 1 },
          conflict: [],
          update: ['name'],
        })
      ).rejects.toThrow('Invalid or empty upsert conflict columns');
    });

    test('throws if update is missing or empty', async () => {
      await expect(
        table.upsert({
          rows: { id: 1 },
          conflict: ['id'],
          update: [],
        })
      ).rejects.toThrow('Invalid or empty upsert update columns');
    });

    test('executes upsert for single row', async () => {
      await expect(
        table.upsert({
          rows: { username: 'simon', age: 22 },
          conflict: ['username'],
          update: ['age'],
        })
      ).resolves.toBeUndefined();

      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (username, age) VALUES (?, ?) ON DUPLICATE KEY UPDATE age = VALUES(age);',
        ['simon', 22]
      );
    });

    test('executes upsert for multiple rows', async () => {
      await expect(
        table.upsert({
          rows: [
            { username: 'john', age: 30 },
            { username: 'jane', age: 28 },
          ],
          conflict: ['username'],
          update: ['age'],
        })
      ).resolves.toBeUndefined();

      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (username, age) VALUES (?, ?), (?, ?) ON DUPLICATE KEY UPDATE age = VALUES(age);',
        ['john', 30, 'jane', 28]
      );
    });

    test('includes returning clause when driver is PostgreSQL', async () => {
      connection.driver.id = Symbol('PostgreSQL'); // Update driver

      await table.upsert({
        rows: { username: 'mike', age: 40 },
        conflict: ['username'],
        update: ['age'],
        returning: ['id', 'username'],
      });

      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (username, age) VALUES (?, ?) ON CONFLICT (username) DO UPDATE SET age = excluded.age RETURNING id, username;',
        ['mike', 40]
      );
    });
  });

  describe('insert()', () => {
    test('inserts single row correctly', async () => {
      await table.insert({ username: 'alice', age: 25 });

      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (username, age) VALUES (?, ?);',
        ['alice', 25]
      );
    });

    test('inserts multiple rows correctly', async () => {
      await table.insert(
        { username: 'bob', age: 30 },
        { username: 'charlie', age: 35 }
      );

      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (username, age) VALUES (?, ?), (?, ?);',
        ['bob', 30, 'charlie', 35]
      );
    });
  });

  describe('where', () => {
    test('where(cb) with first()', async () => {
      await table.where((col) => col('name').equal('simon')).first();

      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE name = ?;',
        ['simon']
      );
    });

    test('where(column, value) with all()', async () => {
      await table.where('name', 'simon').all();

      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE name = ?;',
        ['simon']
      );
    });

    test('where(column, operator, value) with delete()', async () => {
      await table.where('age', '<', 18).delete();

      expect(connection.query).toHaveBeenCalledWith(
        'DELETE FROM users WHERE age < ?;',
        [18]
      );
    });

    test('where(...) with update(row)', async () => {
      await table.where('age', '<', 18).update({ status: 'minor' });

      expect(connection.query).toHaveBeenCalledWith(
        'UPDATE users SET status = ? WHERE age < ?;',
        ['minor', 18]
      );
    });

    test('chained conditions: where().andWhere() with update()', async () => {
      await table
        .where('age', 18)
        .andWhere('name', 'like', '%simon')
        .update({ age: 19 });

      expect(connection.query).toHaveBeenCalledWith(
        'UPDATE users SET age = ? WHERE age = ? AND name LIKE ?;',
        [19, 18, '%simon']
      );
    });
  });

  describe('find', () => {
    test('one(id) builds correct query', async () => {
      await table.find().one(10);

      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?;',
        [10]
      );
    });

    test('oneBy(column, value) builds correct query', async () => {
      await table.find().oneBy('email', 'simon@example.com');

      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ?;',
        ['simon@example.com']
      );
    });

    test('many(...ids) builds correct query', async () => {
      await table.find().many(1, 2, 3);

      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id IN (?, ?, ?);',
        [1, 2, 3]
      );
    });

    test('manyBy(column, values) builds correct query', async () => {
      await table.find().manyBy('status', ['active', 'pending']);

      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE status IN (?, ?);',
        ['active', 'pending']
      );
    });
  });

  describe('fetch', () => {
    test('executes where().first() to fetch a single row', async () => {
      await table.fetch().where('id', 1).first();

      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?;',
        [1]
      );
    });

    test('executes where().all() to fetch all matching rows', async () => {
      await table.fetch().where('active', true).all();

      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE active = ?;',
        [true]
      );
    });

    test('executes leftJoin().first() to join and fetch one row', async () => {
      await table
        .fetch()
        .leftJoin('profiles', 'users.id', 'profiles.user_id')
        .first();

      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users LEFT JOIN profiles ON users.id = profiles.user_id;',
        []
      );
    });
  });

  describe('raw', () => {
    test('executes raw SQL query with parameters', async () => {
      await table.raw(
        'SELECT * FROM users WHERE email = ?',
        'simon@example.com'
      );

      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ?',
        ['simon@example.com']
      );
    });

    test('executes raw SQL query with multiple parameters', async () => {
      await table.raw(
        'SELECT * FROM users WHERE age > ? AND active = ?',
        18,
        true
      );

      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE age > ? AND active = ?',
        [18, true]
      );
    });
  });

  describe('pool', () => {
    test('sets default pname and driver if no name is passed', () => {
      table = new Table('users'); // no builder passed, triggers .pool()

      expect(table['pname']).toBe('main');
      expect(table['driver']).toBeDefined();
    });

    test('sets custom pname and driver when name is provided', () => {
      table = new Table('users').pool('secondary');

      expect(table['pname']).toBe('secondary');
      expect(table['driver']).toBeDefined();
    });

    test('does not reset driver if pname is already set to the same', () => {
      table = new Table('users');
      const firstDriver = table['driver'];

      const result = table.pool('main');
      expect(result['driver']).toBe(firstDriver);
    });
  });

  describe('Table.fetch', () => {
    test('returns Fetcher with default pool', () => {
      const query = Table.fetch('users');

      expect(query).toBeInstanceOf(Fetcher);
      expect(query['table']).toBe('users');
      expect(query['pool']).toBe('main');
      expect(query['driver']).toBeDefined();
    });

    test('returns Fetcher with custom pool', () => {
      const query = Table.fetch('users', 'custom');

      expect(query).toBeInstanceOf(Fetcher);
      expect(query['pool']).toBe('custom');
      expect(query['driver']).toBeDefined();
    });
  });

  describe('Table.find', () => {
    test('returns TableFinder with default pool', () => {
      const finder = Table.find('users');

      expect(finder).toBeInstanceOf(TableFinder);
      expect(finder['table']).toBe('users');
      expect(finder['pool']).toBe('main');
    });

    test('returns TableFinder with custom pool', () => {
      const finder = Table.find('users', 'custom');

      expect(finder).toBeInstanceOf(TableFinder);
      expect(finder['pool']).toBe('custom');
    });
  });

  describe('Table.request', () => {
    test('returns new Table instance if not cached', () => {
      const table = Table.request('users');

      expect(table).toBeInstanceOf(Table);
      expect(table['table']).toBe('users');
      expect(table['pname']).toBe('main');
      expect(table['driver']).toBeDefined();
    });

    test('returns cached Table instance if available', () => {
      const t1 = Table.request('users');
      const t2 = Table.request('users');

      expect(t1).toBe(t2);
    });

    test('throws if name is not a string', () => {
      expect(() => Table.request(null as any)).toThrow(QueryError);
      expect(() => Table.request(123 as any)).toThrow(QueryError);
    });

    test('calls pool method with custom pool if given', () => {
      const table = Table.request('accounts', 'custom');

      expect(table).toBeInstanceOf(Table);
      expect(table['pname']).toBe('custom');
      expect(table['driver']).toBeDefined();
    });
  });

  describe('Table.transaction', () => {
    test('executes handler within transaction and commits', async () => {
      const handler = jest.fn((table, builder) => {
        expect(table('users')).toBeInstanceOf(Table);
        expect(builder).toBeInstanceOf(Builder);

        return builder.get.connection();
      });

      const connection = await Table.transaction(handler);

      expect(handler).toHaveBeenCalled();

      expect(connection.beginTransaction).toHaveBeenCalled();
      expect(connection.commit).toHaveBeenCalled();
      expect(connection.rollback).not.toHaveBeenCalled();
    });

    test('rolls back if handler throws', async () => {
      // we are using the same builder/connection mock
      jest.clearAllMocks();

      let connection: any;

      const handler = (table, builder) => {
        connection = builder.get.connection();
        throw new Error('fail');
      };

      await expect(Table.transaction(handler)).rejects.toThrow('fail');

      expect(connection.beginTransaction).toHaveBeenCalled();
      expect(connection.commit).not.toHaveBeenCalled();
      expect(connection.rollback).toHaveBeenCalled();
    });

    test('throws if handler is not a function', async () => {
      await expect(Table.transaction(null as any)).rejects.toThrow(QueryError);
    });

    test('uses custom pool if specified', async () => {
      const handler = jest.fn();
      await Table.transaction(handler, 'custom');

      expect(handler).toHaveBeenCalled();
      expect(connection).toBeDefined();
    });
  });
});
