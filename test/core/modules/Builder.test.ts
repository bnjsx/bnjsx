import { Builder } from '../../../src/core';
import { Insert } from '../../../src/core';
import { Select } from '../../../src/core';
import { Update } from '../../../src/core';
import { Delete } from '../../../src/core';
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

describe('Builder', () => {
  let connection: jest.Mocked<any>;

  beforeEach(() => {
    connection = mock.connection() as jest.Mocked<any>;
  });

  describe('constructor', () => {
    it('should create an instance with a valid connection', () => {
      const builder = new Builder(connection);
      expect(builder).toBeInstanceOf(Builder);
    });

    it('should throw an error for an invalid connection', () => {
      expect(() => new Builder(null as unknown as any)).toThrow(QueryError);
    });
  });

  describe('get.connection', () => {
    it('should return the current connection', () => {
      const builder = new Builder(connection);
      expect(builder.get.connection()).toBe(connection);
    });

    it('should throw an error if the connection is invalid', () => {
      const builder = new Builder(connection);
      (builder as any).connection = null;
      expect(() => builder.get.connection()).toThrow(QueryError);
    });
  });

  describe('get.connection', () => {
    it('should update the current connection', () => {
      const builder = new Builder(connection);
      expect(builder.get.connection()).toBe(connection);

      // Set connection
      builder.set.connection(mock.connection());
      expect(builder.get.connection()).not.toBe(connection);
    });

    it('should throw an error if the connection is invalid', () => {
      const builder = new Builder(connection);
      expect(() => builder.set.connection(null as any)).toThrow(QueryError);
    });
  });

  describe('raw', () => {
    it('should execute a raw query', async () => {
      connection.query.mockResolvedValue([{ id: 1, name: 'John Doe' }]);
      const builder = new Builder(connection);

      const result = await builder.raw('SELECT * FROM users');
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users',
        undefined
      );

      expect(result).toEqual([{ id: 1, name: 'John Doe' }]);
    });
  });

  describe('insert', () => {
    it('should return an Insert builder instance', () => {
      const builder = new Builder(connection);
      const insertBuilder = builder.insert();
      expect(insertBuilder).toBeInstanceOf(Insert);
    });
  });

  describe('upsert', () => {
    it('should return an Upsert builder instance', () => {
      const builder = new Builder(connection);
      const upsertBuilder = builder.upsert();
      expect(upsertBuilder).toBeInstanceOf(Upsert);
    });
  });

  describe('select', () => {
    it('should return a Select builder instance', () => {
      const builder = new Builder(connection);
      const selectBuilder = builder.select();
      expect(selectBuilder).toBeInstanceOf(Select);
    });

    it('should be able to sepicify columns', () => {
      const builder = new Builder(connection);
      const query = builder
        .select('username', 'email')
        .from('users')
        .limit(10)
        .get.query();
      expect(query).toBe('SELECT username, email FROM users LIMIT 10;');
    });
  });

  describe('update', () => {
    it('should return an Update builder instance', () => {
      const builder = new Builder(connection);
      const updateBuilder = builder.update();
      expect(updateBuilder).toBeInstanceOf(Update);
    });
  });

  describe('delete', () => {
    it('should return a Delete builder instance', () => {
      const builder = new Builder(connection);
      const deleteBuilder = builder.delete();
      expect(deleteBuilder).toBeInstanceOf(Delete);
    });
  });
});
