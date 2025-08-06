import { QueryError } from '../../../src/errors';
import { Insert } from '../../../src/core';

const mock = {
  connection: () => {
    return {
      id: Symbol('PoolConnection'),
      driver: { id: Symbol('MySQL') },
      query: jest.fn(() => Promise.resolve()),
    } as any;
  },
};

describe('Insert', () => {
  let insert: any;

  beforeEach(() => {
    insert = new Insert(mock.connection());
  });

  describe('into', () => {
    it('should set the table name for the INSERT query', () => {
      insert.into('users');
      expect(insert.table).toBe('users');
    });

    it('should throw an error for invalid table names', () => {
      expect(() => insert.into('')).toThrow(QueryError);
    });
  });

  describe('returning', () => {
    it('should set the columns to be returned', () => {
      insert.returning('id', 'name');
      expect(insert.returnings).toEqual(['id', 'name']);
    });

    it('should throw if columns are not an array of strings', () => {
      expect(() => insert.returning(123)).toThrow(
        'Invalid RETURNING columns: 123'
      );
      expect(() => insert.returning(null)).toThrow(
        'Invalid RETURNING columns: '
      );
      expect(() => insert.returning(['id', 123])).toThrow(
        'Invalid RETURNING columns: id,123'
      );
    });

    it('should reset return columns on subsequent calls', () => {
      insert.returning('id', 'name');
      expect(insert.returnings).toEqual(['id', 'name']);
      insert.returning('email');
      expect(insert.returnings).toEqual(['email']);
    });
  });

  describe('row', () => {
    test('should insert a valid row object', () => {
      const row = { id: 1, name: 'John' };
      insert.row(row);
      expect(insert.values).toContainEqual([1, 'John']);
    });

    test('should throw for non-object row types', () => {
      const invalidRows = [null, undefined, [], 'string', 123];

      invalidRows.forEach((invalidRow) => {
        expect(() => insert.row(invalidRow)).toThrow(QueryError);
      });
    });

    test("should throw if row column count doesn't match", () => {
      insert.columns = ['id', 'name'];

      const rowWithTooFewColumns = { id: 1 };
      const rowWithTooManyColumns = { id: 1, name: 'John', age: 30 };

      expect(() => insert.row(rowWithTooFewColumns)).toThrow(QueryError);
      expect(() => insert.row(rowWithTooManyColumns)).toThrow(QueryError);
    });

    test('should throw if row is missing required columns', () => {
      insert.columns = ['id', 'name'];
      const row = { id: 1 };

      expect(() => insert.row(row)).toThrow(QueryError);
    });

    test('should throw for empty row object', () => {
      const emptyRow = {};

      expect(() => insert.row(emptyRow)).toThrow(QueryError);
    });

    test('should set `this.columns` to row keys on first row', () => {
      const row = { id: 1, name: 'John' };
      insert.row(row);

      expect(insert.columns).toEqual(['id', 'name']);
    });

    test('should validate column consistency for subsequent rows', () => {
      const firstRow = { id: 1, name: 'John' };
      insert.row(firstRow);

      const validRow = { id: 2, name: 'Jane' };
      insert.row(validRow);

      const invalidRow = { id: 3, age: 25 }; // Different column

      expect(() => insert.row(invalidRow)).toThrow(QueryError);
    });
  });

  describe('rows', () => {
    it('should add multiple rows to the query', () => {
      const rows = [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Doe' },
      ];
      insert.into('users').rows(rows);
      expect(insert.columns).toEqual(['id', 'name']);
      expect(insert.values).toEqual([
        [1, 'John Doe'],
        [2, 'Jane Doe'],
      ]);
    });

    it('should throw if any row has mismatched columns', () => {
      const rows = [
        { id: 1, name: 'John Doe' },
        { id: 2, age: 30 },
      ];
      expect(() => insert.rows(rows)).toThrow(QueryError);
    });

    test('should throw for non-array values', () => {
      const values = [1, 'hello world', {}, undefined, null, []];
      values.forEach((v) => expect(() => insert.rows(v)).toThrow(QueryError));
    });
  });

  describe('build()', () => {
    it('should return the correct SQL INSERT statement for single row', () => {
      insert.into('users').row({ id: 1, name: 'John Doe' });
      const query = insert.build();
      expect(query).toBe('INSERT INTO users (id, name) VALUES (?, ?);');
    });

    it('should return the correct SQL INSERT statement for multiple rows', () => {
      insert.into('users').rows([
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Doe' },
      ]);
      const query = insert.build();
      expect(query).toBe('INSERT INTO users (id, name) VALUES (?, ?), (?, ?);');
    });

    it('should include RETURNING clause when specified', () => {
      insert
        .into('users')
        .row({ id: 1, name: 'John Doe' })
        .returning('id', 'name');
      const query = insert.build();
      expect(query).toBe(
        'INSERT INTO users (id, name) VALUES (?, ?) RETURNING id, name;'
      );
    });

    it('should throw if table, columns, or values are missing', () => {
      expect(() => insert.build()).toThrow('Invalid INSERT table');

      insert.table = 'users';
      expect(() => insert.build()).toThrow('Invalid INSERT columns');

      insert.columns = ['name'];
      expect(() => insert.build()).toThrow('Invalid INSERT values');

      insert.values = [['John Doe']];
      expect(insert.build()).toBe('INSERT INTO users (name) VALUES (?);');
    });

    it('should handle null values', () => {
      expect(
        insert
          .into('products')
          .row({
            name: 'Nice product',
            price: 123,
            category: null,
            description: null,
          })
          .build()
      ).toBe(
        'INSERT INTO products (name, price, category, description) VALUES (?, ?, NULL, NULL);'
      );

      expect(insert.values).toEqual([['Nice product', 123]]);
    });
  });

  describe('reset()', () => {
    it('should clear all properties in the Insert instance', () => {
      insert.into('users').row({ id: 1, name: 'John Doe' });
      insert.reset();
      expect(insert.table).toBeUndefined();
      expect(insert.columns).toBeUndefined();
      expect(insert.values).toEqual([]);
    });
  });
});
