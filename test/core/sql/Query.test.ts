import { QueryError } from '../../../src/errors';
import { Select } from '../../../src/core';

const mock = {
  connection: () => {
    return {
      id: Symbol('PoolConnection'),
      driver: {
        id: Symbol('MySQL'),
      },
      query: jest.fn(() => Promise.resolve()),
    } as any;
  },
};

describe('Query', () => {
  let select: any;

  beforeEach(() => {
    select = new Select(mock.connection());
  });

  describe('log.query', () => {
    it('should log the query if defined', async () => {
      // Mock console.log
      console.log = jest.fn();

      // Defined query
      select.query = 'SELECT * FROM users;';
      expect(select.query).not.toBeUndefined();

      // Log the query
      expect(select.log.query()).toBe(select);

      // Defined query => log
      expect(console.log).toHaveBeenCalledWith('SELECT * FROM users;');
    });

    it('should build the query if undefined', async () => {
      // Mock console.log
      console.log = jest.fn();

      // Undefined query
      select.from('users');
      expect(select.query).toBeUndefined();

      // Log the query
      select.log.query();

      // Undefined query => build => log
      expect(console.log).toHaveBeenCalledWith('SELECT * FROM users;');
    });
  });

  describe('log.values', () => {
    it('should log the values', async () => {
      // Mock console.log
      console.log = jest.fn();

      // Set values
      const values = [1, 2, 3];
      select.values = values;

      // Log values
      expect(select.log.values()).toBe(select);
      expect(console.log).toHaveBeenCalledWith(values);
    });
  });

  describe('get.query', () => {
    it('should get the query if defined', async () => {
      // Defined query
      select.query = 'SELECT * FROM users;';
      expect(select.query).not.toBeUndefined();

      // Defined query => get
      expect(select.get.query()).toBe('SELECT * FROM users;');
    });

    it('should build the query if undefined', async () => {
      // Undefined query
      select.from('users');
      expect(select.query).toBeUndefined();

      // Undefined query => build => get
      expect(select.get.query()).toBe('SELECT * FROM users;');
    });
  });

  describe('get.values', () => {
    it('should get the values', async () => {
      // Get values
      const values = [1, 2, 3];

      // Set values
      select.values = values;

      // Get values
      expect(select.get.values()).toEqual(values);
    });
  });

  describe('constructor', () => {
    it('should instantiate with valid connection', () => {
      expect(select).toBeInstanceOf(Select);
    });

    it('should throw an error for invalid connection', () => {
      expect(() => new Select({} as any)).toThrow(QueryError);
    });
  });

  describe('exec', () => {
    it('should execute the query and resolve', async () => {
      // Create connection
      const connection = mock.connection();

      // Mock query result
      const result = [{ name: 'simon', age: 24 }];
      connection.query = jest.fn(() => Promise.resolve(result));

      // Create query
      const select = new Select(connection);

      // Expect exec to resolve with result
      expect(select.from('users').exec()).resolves.toEqual(result);

      // Expect query to be called
      expect(connection.query).toHaveBeenCalledTimes(1);

      // Expect query to be called with query & values
      const query = select.get.query();
      const values = select.get.values();
      expect(connection.query).toHaveBeenCalledWith(query, values);
    });

    it('should execute the query and reject', async () => {
      // Create connection
      const connection = mock.connection();

      // Mock query result
      const error = new QueryError('Ops');
      connection.query = jest.fn(() => Promise.reject(error));

      // Create query
      const select = new Select(connection);

      // Expect exec to reject with error
      expect(select.from('users').exec()).rejects.toThrow(error);

      // Expect query to be called
      expect(connection.query).toHaveBeenCalledTimes(1);

      // Expect query to be called with query & values
      const query = select.get.query();
      const values = select.get.values();

      expect(connection.query).toHaveBeenCalledWith(query, values);
    });
  });

  describe('raw', () => {
    it('should execute raw SQL query and resolve', async () => {
      // Create connection
      const connection = mock.connection();

      // Define raw SQL and values
      const rawQuery = 'SELECT * FROM users WHERE age > ?;';
      const values = [20];
      const result = [{ name: 'Alice', age: 25 }];

      // Mock the query result
      connection.query = jest.fn(() => Promise.resolve(result));

      // Execute raw query
      const select = new Select(connection);
      await expect(select.raw(rawQuery, values)).resolves.toEqual(result);

      // Verify query and values were called correctly
      expect(connection.query).toHaveBeenCalledWith(rawQuery, values);
    });

    it('should execute raw SQL query and reject with error', async () => {
      const connection = mock.connection();
      const rawQuery = 'SELECT * FROM users WHERE age > ?;';
      const values = [20];
      const error = new Error('Ops');

      // Mock rejection
      connection.query = jest.fn(() => Promise.reject(error));
      const select = new Select(connection);

      await expect(select.raw(rawQuery, values)).rejects.toThrow(error);
    });
  });

  describe('first', () => {
    it('should return the first row of the result', async () => {
      const connection = mock.connection();

      const result = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      connection.query = jest.fn(() => Promise.resolve(result));

      const select = new Select(connection);

      await expect(select.from('users').first()).resolves.toEqual(result[0]);
      expect(connection.query).toHaveBeenCalledTimes(1);
    });

    it('should return undefined if result is empty', async () => {
      const connection = mock.connection();
      connection.query = jest.fn(() => Promise.resolve([]));
      const select = new Select(connection);

      await expect(select.from('users').first()).resolves.toBeUndefined();
    });

    it('should return r if result is not an array', async () => {
      const connection = mock.connection();
      const result = { id: 1, name: 'Alice' }; // Not an array
      connection.query = jest.fn(() => Promise.resolve(result));

      const select = new Select(connection);
      await expect(select.from('users').first()).resolves.toBe(result);
    });

    it('should reject if query execution fails', async () => {
      const connection = mock.connection();
      const error = new QueryError('Query failed');
      connection.query = jest.fn(() => Promise.reject(error));
      const select = new Select(connection);

      await expect(select.from('users').first()).rejects.toThrow(error);
    });
  });

  describe('last', () => {
    it('should return the last row of the result', async () => {
      const connection = mock.connection();

      const result = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];
      connection.query = jest.fn(() => Promise.resolve(result));

      const select = new Select(connection);

      await expect(select.from('users').last()).resolves.toEqual(result[1]);
      expect(connection.query).toHaveBeenCalledTimes(1);
    });

    it('should return undefined if result is empty', async () => {
      const connection = mock.connection();
      connection.query = jest.fn(() => Promise.resolve([]));
      const select = new Select(connection);

      await expect(select.from('users').last()).resolves.toBeUndefined();
    });

    it('should return r if result is not an array', async () => {
      const connection = mock.connection();
      const result = { id: 2, name: 'Bob' }; // Not an array
      connection.query = jest.fn(() => Promise.resolve(result));

      const select = new Select(connection);
      await expect(select.from('users').last()).resolves.toBe(result);
    });

    it('should reject if query execution fails', async () => {
      const connection = mock.connection();
      const error = new QueryError('Query failed');
      connection.query = jest.fn(() => Promise.reject(error));
      const select = new Select(connection);

      await expect(select.from('users').last()).rejects.toThrow(error);
    });
  });
});
