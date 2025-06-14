import { Upsert } from '../../../src/core/sql/Upsert';
import { QueryError } from '../../../src/errors';

const mock = {
  connection: () => {
    return {
      id: Symbol('PoolConnection'),
      driver: { id: Symbol('MySQL') },
      query: jest.fn(() => Promise.resolve()),
    } as any;
  },
};

describe('Upsert', () => {
  let upsert: any;

  beforeEach(() => {
    upsert = new Upsert(mock.connection());
  });

  describe('into', () => {
    it('should set the table name', () => {
      upsert.into('users');
      expect(upsert.table).toBe('users');
    });

    it('should throw error for invalid table name', () => {
      expect(() => upsert.into('')).toThrow(QueryError);
      expect(() => upsert.into(null)).toThrow(QueryError);
    });
  });

  describe('returning', () => {
    it('should set returnings', () => {
      upsert.returning('id', 'name');
      expect(upsert.returnings).toEqual(['id', 'name']);
    });

    it('should throw if columns are invalid', () => {
      expect(() => upsert.returning(123)).toThrow(QueryError);
      expect(() => upsert.returning(null)).toThrow(QueryError);
      expect(() => upsert.returning(['id', 123])).toThrow(QueryError);
    });

    it('should reset returnings on subsequent calls', () => {
      upsert.returning('id', 'name');
      expect(upsert.returnings).toEqual(['id', 'name']);
      upsert.returning('email');
      expect(upsert.returnings).toEqual(['email']);
    });
  });

  describe('row', () => {
    it('should add a valid row', () => {
      const row = { id: 1, name: 'John' };
      upsert.row(row);
      expect(upsert.values).toContainEqual([1, 'John']);
      expect(upsert.columns).toEqual(['id', 'name']);
    });

    it('should throw for non-object row', () => {
      [null, undefined, [], 'string', 123].forEach((invalid) => {
        expect(() => upsert.row(invalid)).toThrow(QueryError);
      });
    });

    it('should throw if row columns count mismatch', () => {
      upsert.columns = ['id', 'name'];
      expect(() => upsert.row({ id: 1 })).toThrow(QueryError);
      expect(() => upsert.row({ id: 1, name: 'John', age: 30 })).toThrow(
        QueryError
      );
    });

    it('should throw if row is missing required columns', () => {
      upsert.columns = ['id', 'name'];
      expect(() => upsert.row({ id: 1 })).toThrow(QueryError);
    });

    it('should throw for empty row', () => {
      expect(() => upsert.row({})).toThrow(QueryError);
    });

    it('should throw for invalid value types', () => {
      const row = { id: 1, name: ['invalid'] };
      expect(() => upsert.row(row)).toThrow(QueryError);
    });

    it('should accept null, string and number values', () => {
      const row = { id: 1, name: null, age: 30 };
      upsert.row(row);
      expect(upsert.values).toContainEqual([1, null, 30]);
    });
  });

  describe('rows', () => {
    it('should add multiple valid rows', () => {
      const rows = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];
      upsert.rows(rows);
      expect(upsert.columns).toEqual(['id', 'name']);
      expect(upsert.values).toEqual([
        [1, 'John'],
        [2, 'Jane'],
      ]);
    });

    it('should throw if rows is not array of objects', () => {
      [null, undefined, 'string', 123, [{}, null]].forEach((invalid) => {
        expect(() => upsert.rows(invalid)).toThrow(QueryError);
      });
    });

    it('should throw if rows length < 2', () => {
      expect(() => upsert.rows([{ id: 1, name: 'John' }])).toThrow(QueryError);
    });

    it('should throw if any row has mismatched columns', () => {
      const rows = [
        { id: 1, name: 'John' },
        { id: 2, age: 30 }, // different keys
      ];
      expect(() => upsert.rows(rows)).toThrow(QueryError);
    });
  });

  describe('conflict', () => {
    it('should set conflict columns', () => {
      upsert.conflict('id');
      expect(upsert.conflicts).toEqual(['id']);
    });

    it('should throw for invalid conflict columns', () => {
      expect(() => upsert.conflict(null)).toThrow(QueryError);
      expect(() => upsert.conflict('id', 123)).toThrow(QueryError);
    });
  });

  describe('set', () => {
    it('should set update columns', () => {
      upsert.set('name');
      expect(upsert.updates).toEqual(['name']);
    });

    it('should throw for invalid update columns', () => {
      expect(() => upsert.set(null)).toThrow(QueryError);
      expect(() => upsert.set('name', 123)).toThrow(QueryError);
    });
  });

  describe('build', () => {
    beforeEach(() => {
      upsert.into('users').conflict('id').set('name');
    });

    it('should throw if table invalid', () => {
      upsert.table = null;
      expect(() => upsert.build()).toThrow(QueryError);
    });

    it('should throw if values invalid', () => {
      upsert.table = 'users';
      upsert.values = null;
      expect(() => upsert.build()).toThrow(QueryError);
    });

    it('should throw if columns invalid', () => {
      upsert.table = 'users';
      upsert.values = [[1, 'james']];
      upsert.columns = null;
      expect(() => upsert.build()).toThrow(QueryError);
    });

    it('should throw if columns invalid', () => {
      upsert.table = 'users';
      upsert.values = [[1, 'james']];
      upsert.columns = ['id', 'name'];
      upsert.conflicts = null;
      expect(() => upsert.build()).toThrow(QueryError);
    });

    it('should build PostgreSQL UPSERT with updates and returning', () => {
      upsert.connection.driver = { id: Symbol.for('PostgreSQL') };

      upsert.row({ id: 1, name: 'John' }).returning('id', 'name');
      const sql = upsert.build();
      expect(sql).toBe(
        'INSERT INTO users (id, name) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET name = excluded.name RETURNING id, name;'
      );
    });

    it('should build PostgreSQL UPSERT with updates but no returning', () => {
      upsert.connection.driver = { id: Symbol.for('PostgreSQL') };
      upsert.returnings = undefined; // clears returnings
      upsert.row({ id: 1, name: null });
      const sql = upsert.build();
      expect(sql).toBe(
        'INSERT INTO users (id, name) VALUES (?, NULL) ON CONFLICT (id) DO UPDATE SET name = excluded.name;'
      );
    });

    it('should build PostgreSQL UPSERT with no updates', () => {
      upsert.connection.driver = { id: Symbol.for('PostgreSQL') };

      upsert.updates = undefined;
      upsert.row({ id: 1, name: 'John' });
      const sql = upsert.build();
      expect(sql).toBe(
        'INSERT INTO users (id, name) VALUES (?, ?) ON CONFLICT (id) DO NOTHING;'
      );
    });

    it('should build SQLite UPSERT similarly', () => {
      upsert.connection.driver = { id: Symbol.for('SQLite') };
      upsert.row({ id: 1, name: 'John' });
      const sql = upsert.build();
      expect(sql).toBe(
        'INSERT INTO users (id, name) VALUES (?, ?) ON CONFLICT (id) DO UPDATE SET name = excluded.name;'
      );
    });

    it('should build SQLite UPSERT with no updates', () => {
      upsert.connection.driver = { id: Symbol.for('SQLite') };
      upsert.updates = undefined;
      upsert.row({ id: 1, name: 'John' });
      const sql = upsert.build();
      expect(sql).toBe(
        'INSERT INTO users (id, name) VALUES (?, ?) ON CONFLICT (id) DO NOTHING;'
      );
    });

    it('should build MySQL UPSERT with updates', () => {
      upsert.connection.driver = { id: Symbol.for('MySQL') };
      upsert.row({ id: 1, name: 'John' });
      const sql = upsert.build();
      expect(sql).toBe(
        'INSERT INTO users (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name);'
      );
    });

    it('should build MySQL UPSERT with no updates', () => {
      upsert.connection.driver = { id: Symbol.for('MySQL') };
      upsert.updates = undefined;
      upsert.row({ id: 1, name: 'John' });
      const sql = upsert.build();
      expect(sql).toBe('INSERT IGNORE INTO users (id, name) VALUES (?, ?);');
    });

    it('should throw for unsupported driver', () => {
      upsert.connection.driver = { id: Symbol.for('Unkown') };
      upsert.row({ id: 1, name: 'John' });
      expect(() => upsert.build()).toThrow(QueryError);
    });
  });

  describe('reset', () => {
    it('should clear all properties', () => {
      upsert.into('users').row({ id: 1, name: 'John' });
      upsert.returning('id');
      upsert.conflict('id');
      upsert.set('name');
      upsert.reset();

      expect(upsert.table).toBeUndefined();
      expect(upsert.columns).toBeUndefined();
      expect(upsert.returnings).toBeUndefined();
      expect(upsert.conflicts).toBeUndefined();
      expect(upsert.updates).toBeUndefined();
      expect(upsert.values).toEqual([]);
    });
  });
});
