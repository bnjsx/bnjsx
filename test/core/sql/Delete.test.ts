import { Delete } from '../../../src/core';
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

describe('Delete', () => {
  let del: any;

  beforeEach(() => {
    del = new Delete(mock.connection());
    jest.resetAllMocks();
  });

  describe('.from()', () => {
    it('should set a valid table name', () => {
      del.from('valid_table');
      expect(del.table).toBe('valid_table');
    });

    it('should throw QueryError if the table name is invalid', () => {
      expect(() => del.from('')).toThrow(QueryError);
    });
  });

  describe('.where()', () => {
    it('should add a valid WHERE condition', () => {
      del.where((col: any) => col('age').greaterThan(18));
      expect(del.condition).toBeInstanceOf(Condition);
    });

    it('should throw QueryError if condition is not a function', () => {
      expect(() => del.where('invalid' as any)).toThrow(QueryError);
    });

    it('should accept condition instances as well', () => {
      const condition = new Condition(mock.connection().driver);
      condition.col('age').lessThan(12).and().col('location').like('paris');
      const query = del.from('table').where(condition);
      expect(query.build()).toBe(
        'DELETE FROM table WHERE age < ? AND location LIKE ?;'
      );
      expect(query.values).toEqual([12, 'paris']);
    });
  });

  describe('.and()', () => {
    it('should append AND to the condition if it exists', () => {
      // Defined condition
      del.condition = new Condition(mock.connection().driver);

      // Spy on del.condition.and
      const spy = jest.spyOn(del.condition, 'and');

      // Test
      expect(() => del.and()).not.toThrow(QueryError);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should throws QueryError if there is no existing condition', () => {
      // Undefined condition
      del.condition = undefined;

      // Test
      expect(() => del.and()).toThrow(QueryError);
    });
  });

  describe('.or()', () => {
    it('should append OR to the condition if it exists', () => {
      // Defined condition
      del.condition = new Condition(mock.connection().driver);

      // Spy on del.condition.or
      const spy = jest.spyOn(del.condition, 'or');

      // Test
      expect(() => del.or()).not.toThrow(QueryError);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should throws QueryError if there is no existing condition', () => {
      // Undefined condition
      del.condition = undefined;

      // Test
      expect(() => del.or()).toThrow(QueryError);
    });
  });

  describe('.paren()', () => {
    it('should adds parentheses around conditions', () => {
      // Defined condition
      del.condition = new Condition(mock.connection().driver);

      // Spy on del.condition.paren
      const spy = jest.spyOn(del.condition, 'paren');

      // Test
      expect(() => del.paren()).not.toThrow(QueryError);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should create a new Condition if none exists', () => {
      // Undefined condition
      del.condition = undefined;

      // Test
      expect(() => del.paren()).not.toThrow(QueryError);
      expect(del.condition).toBeInstanceOf(Condition);
    });
  });

  describe('close() & open()', () => {
    it('should add opening and closing parentheses to stack', () => {
      expect(
        del
          .from('users')
          .open()
          .where((col) => col('age').lessThan('18'))
          .close()
          .build()
      ).toBe('DELETE FROM users WHERE (age < ?);');
    });

    it('should throw if the condition starts with )', () => {
      expect(() => del.close()).toThrow(QueryError);
    });
  });

  describe('.build()', () => {
    it('should constructs a valid DELETE SQL statement', () => {
      del.from('users').where((col: any) => col('age').greaterThan(18));
      expect(del.build()).toBe('DELETE FROM users WHERE age > ?;');
    });

    it('should throws QueryError if table name is undefined', () => {
      expect(() => del.build()).toThrow(QueryError);
    });

    it('should throws QueryError if condition is undefined', () => {
      expect(() => del.from('users').build()).toThrow(QueryError);
    });
  });

  describe('.reset()', () => {
    it('should clears all query properties', () => {
      del.from('users').where((col: any) => col('age').greaterThan(18));
      del.reset();
      expect(del.table).toBeUndefined();
      expect(del.condition).toBeUndefined();
      expect(del.values).toEqual([]);
      expect(del.query).toBeUndefined();
    });
  });
});
