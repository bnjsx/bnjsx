import { Update } from '../../../src/core';
import { Condition } from '../../../src/core';
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

describe('Update', () => {
  let update: any;

  beforeEach(() => {
    update = new Update(mock.connection());
    jest.resetAllMocks();
  });

  describe('.table()', () => {
    it('should set a valid table name', () => {
      update.table('valid_table');
      expect(update.state.table).toBe('valid_table');
    });

    it('should throw QueryError if the table name is invalid', () => {
      expect(() => update.table('')).toThrow(QueryError);
    });
  });

  describe('.set()', () => {
    it('should set columns and values for valid input', () => {
      update.set({ first_name: 'John', age: 30 });

      expect(update.state.columns).toEqual(['first_name', 'age']);
      expect(update.values).toEqual(['John', 30]);
    });

    it('should throw QueryError if row is not an object', () => {
      expect(() => update.set('invalid' as any)).toThrow(QueryError);
      expect(() => update.set('invalid' as any)).toThrow(
        'Invalid UPDATE row: invalid'
      );
    });

    it('should throw QueryError if value is not a string or number', () => {
      expect(() => update.set({ first_name: undefined })).toThrow(QueryError);
      expect(() => update.set({ first_name: undefined })).toThrow(
        'Invalid UPDATE value: undefined'
      );
    });

    it('should allow boolean values using 1 and 0', () => {
      expect(() => update.set({ is_active: 1, is_verified: 0 })).not.toThrow();
      expect(update.state.columns).toEqual(['is_active', 'is_verified']);
      expect(update.values).toEqual([1, 0]);
    });

    it('should allow null', () => {
      expect(() => update.set({ description: null })).not.toThrow();
      expect(update.state.columns).toEqual(['description']);
      expect(update.values).toEqual([null]);
    });

    it('should allow JSON string values', () => {
      const jsonString = JSON.stringify({ key: 'value' });
      expect(() => update.set({ data: jsonString })).not.toThrow();
      expect(update.state.columns).toEqual(['data']);
      expect(update.values).toEqual([jsonString]);
    });

    it('should allow date strings in "YYYY-MM-DD hh:mm:ss" format', () => {
      const dateString = '2023-12-01 12:00:00';
      expect(() => update.set({ last_updated: dateString })).not.toThrow();
      expect(update.state.columns).toEqual(['last_updated']);
      expect(update.values).toEqual([dateString]);
    });
  });

  describe('.build()', () => {
    it('should throw QueryError if table name is invalid', () => {
      update.state.table = ''; // Invalid table name
      update.state.columns = ['name'];
      update.values = ['John'];
      update.state.condition = new Condition(update);

      expect(() => update.build()).toThrow(QueryError);
      expect(() => update.build()).toThrow('Invalid UPDATE table: ');
    });

    it('should throw QueryError if there are no columns to update', () => {
      update.table('users');
      update.values = ['John'];
      update.state.condition = new Condition(update);

      expect(() => update.build()).toThrow(QueryError);
      expect(() => update.build()).toThrow('Invalid UPDATE columns');
    });

    it('should throw QueryError if there are no values to update', () => {
      update.table('users');
      update.state.columns = ['name'];
      update.state.condition = new Condition(update);

      expect(() => update.build()).toThrow(QueryError);
      expect(() => update.build()).toThrow('Invalid UPDATE values');
    });

    it('should throw QueryError if there is no condition specified', () => {
      update.table('users');
      update.state.columns = ['name'];
      update.values = ['John'];

      expect(() => update.build()).toThrow(QueryError);
      expect(() => update.build()).toThrow('UPDATE condition is required');
    });

    it('should return a valid SQL UPDATE statement', () => {
      update
        .table('users')
        .set({ name: 'John' })
        .where((col: any) => col('id').equal(18));

      const sql = update.build();
      expect(sql).toBe('UPDATE users SET name = ? WHERE id = ?;');
    });

    it('should correctly build an SQL statement with multiple columns', () => {
      update
        .table('users')
        .set({ name: 'John', age: 25, status: 'active' })
        .where((col: any) => col('id').equal(18));

      const sql = update.build();
      expect(sql).toBe(
        'UPDATE users SET name = ?, age = ?, status = ? WHERE id = ?;'
      );
    });

    it('should support null values', () => {
      const sql = update
        .table('users')
        .set({ name: null, age: null, status: 'banned' })
        .where((col) => col('id').equal(1))
        .build();

      expect(sql).toBe(
        'UPDATE users SET name = NULL, age = NULL, status = ? WHERE id = ?;'
      );

      expect(update.values).toEqual(['banned', 1]);
    });
  });

  describe('.where()', () => {
    it('should add a valid WHERE condition', () => {
      update.where((col: any) => col('age').greaterThan(18));
      expect(update.state.condition).toBeInstanceOf(Condition);
    });

    it('should throw QueryError if condition is not a function', () => {
      expect(() => update.where('invalid' as any)).toThrow(QueryError);
    });
  });

  describe('.and()', () => {
    it('should append AND to the condition if it exists', () => {
      // Defined condition
      update.state.condition = new Condition(update);

      // Spy on update.condition.and
      const spy = jest.spyOn(update.state.condition, 'and');

      // Test
      expect(() => update.and()).not.toThrow(QueryError);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should throws QueryError if there is no existing condition', () => {
      // Undefined condition
      update.state.condition = undefined;

      // Test
      expect(() => update.and()).toThrow(QueryError);
    });
  });

  describe('.or()', () => {
    it('should append OR to the condition if it exists', () => {
      // Defined condition
      update.state.condition = new Condition(update);

      // Spy on update.condition.or
      const spy = jest.spyOn(update.state.condition, 'or');

      // Test
      expect(() => update.or()).not.toThrow(QueryError);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should throws QueryError if there is no existing condition', () => {
      // Undefined condition
      update.state.condition = undefined;

      // Test
      expect(() => update.or()).toThrow(QueryError);
    });
  });

  describe('.paren()', () => {
    it('should adds parentheses around conditions', () => {
      // Defined condition
      update.state.condition = new Condition(update);

      // Spy on update.condition.paren
      const spy = jest.spyOn(update.state.condition, 'paren');

      // Test
      expect(() => update.paren()).not.toThrow(QueryError);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should create a new Condition if none exists', () => {
      // Undefined condition
      update.state.condition = undefined;

      // Test
      expect(() => update.paren()).not.toThrow(QueryError);
      expect(update.state.condition).toBeInstanceOf(Condition);
    });
  });

  describe('close() & open()', () => {
    it('should add opening and closing parentheses to stack', () => {
      expect(
        update
          .table('users')
          .set({ age: 18 })
          .open()
          .where((col) => col('age').lessThan('18'))
          .close()
          .build()
      ).toBe('UPDATE users SET age = ? WHERE (age < ?);');
    });

    it('should throw if the condition starts with )', () => {
      expect(() => update.close()).toThrow(QueryError);
    });
  });

  describe('.reset()', () => {
    it('should clears all query properties', () => {
      update.table('users').where((col: any) => col('age').greaterThan(18));
      update.reset();

      expect(update.state.table).toBeUndefined();
      expect(update.state.columns).toEqual([]);
      expect(update.state.condition).toBeUndefined();

      expect(update.values).toEqual([]);
      expect(update.query).toBeUndefined();
    });
  });
});
