import {
  DELETE,
  DELETED,
  INSERT,
  INSERT_MANY,
  INSERTED,
  INSERTED_MANY,
  LINK,
  LINK_MANY,
  LINKED,
  LINKED_MANY,
  Model,
  ModelError,
  UNLINK,
  UNLINK_MANY,
  UNLINKED,
  UNLINKED_MANY,
  UPDATE,
  UPDATED,
  Col,
  Con,
  ref,
  Builder,
} from '../../../src/core';

import { UTC } from '../../../src/helpers';
import EventEmitter from 'events';

const mock = {
  connection: () => {
    return {
      id: Symbol('PoolConnection'),
      driver: { id: Symbol('MySQL') },
      query: jest.fn(() => Promise.resolve()),
    } as any;
  },
  pg: () => {
    return { id: Symbol('PostgreSQL') };
  },
};

describe('Model', () => {
  describe('get', () => {
    class User extends (Model as any) {}

    describe('timestamps()', () => {
      it('should return true if User.timestamps is invalid', () => {
        User.timestamps = undefined;
        expect(User.get.timestamps()).toBe(true); // i got false from the past test case
      });

      it('should return User.timestamps value if valid', () => {
        User.timestamps = false;
        expect(User.get.timestamps()).toBe(false);

        // Reset
        User.timestamps = undefined;
      });
    });

    describe('createdAt()', () => {
      it('should return created_at if User.createdAt is invalid', () => {
        User.createdAt = undefined;
        expect(User.get.createdAt()).toBe('created_at');
      });

      it('should return User.createdAt value if valid', () => {
        User.createdAt = 'created_on';
        expect(User.get.createdAt()).toBe('created_on');

        // Reset
        User.createdAt = undefined;
      });
    });

    describe('updatedAt()', () => {
      it('should return updated_at if User.updatedAt is invalid', () => {
        User.updatedAt = undefined;
        expect(User.get.updatedAt()).toBe('updated_at');
      });

      it('should return User.updatedAt value if valid', () => {
        User.updatedAt = 'updated_on';
        expect(User.get.updatedAt()).toBe('updated_on');

        // Reset
        User.updatedAt = undefined;
      });
    });

    describe('table()', () => {
      it('should throw error if User.table is invalid', () => {
        User.table = undefined;
        expect(() => User.get.table()).toThrow('Invalid table name');
      });

      it('should return User.table value if valid', () => {
        User.table = 'users';
        expect(User.get.table()).toBe('users');
      });
    });

    describe('columns()', () => {
      it('should return users.* if User.columns is invalid', () => {
        User.columns = undefined;
        expect(User.get.columns()).toEqual(['users.*']);
      });

      it('should return User.columns value if valid', () => {
        User.columns = ['id', 'name'];
        expect(User.get.columns()).toEqual(['users.id', 'users.name']);

        // Reset
        User.columns = undefined;
      });
    });

    describe('ignore()', () => {
      it('should return empty array if User.ignore is invalid', () => {
        User.ignore = undefined;
        expect(User.get.ignore()).toEqual([]);
      });

      it('should return User.ignore value if valid', () => {
        User.ignore = ['id', 'created_at'];
        expect(User.get.ignore()).toEqual(['id', 'created_at']);

        // Reset
        User.ignore = undefined;
      });
    });

    describe('builder()', () => {
      it('should throw error if User.builder is invalid', () => {
        User.builder = undefined;
        expect(() => User.get.builder()).toThrow('Invalid builder');
      });

      it('should return User.builder value if valid', () => {
        const builder = new Builder(mock.connection());
        User.builder = builder;
        expect(User.get.builder()).toBe(builder);

        // Reset
        User.builder = undefined;
      });
    });

    describe('pk()', () => {
      it('should return "id" if User.primaryKey is invalid', () => {
        User.primaryKey = undefined;
        expect(User.get.pk()).toBe('id');
      });

      it('should return User.primaryKey value if valid', () => {
        User.primaryKey = 'my_id';
        expect(User.get.pk()).toBe('my_id');

        // Reset
        User.primaryKey = undefined;
      });
    });

    describe('fk()', () => {
      it('should return "user_id" if User.foreignKey is invalid', () => {
        User.foreignKey = undefined;
        expect(User.get.fk()).toBe('user_id');
      });

      it('should return User.foreignKey value if valid', () => {
        User.foreignKey = 'profile_id';
        expect(User.get.fk()).toBe('profile_id');

        // Reset
        User.foreignKey = undefined;
      });
    });

    describe('link()', () => {
      it('should throw error if invalid model is passed to link()', () => {
        expect(() => User.get.link('invalid')).toThrow('Invalid link model');
      });

      it('should return correct link if valid model is passed to link()', () => {
        class Category extends Model {}
        expect(User.get.link(Category)).toBe('category_user');
      });
    });

    describe('emitter()', () => {
      it('should return a new EventEmitter if User.emitter is invalid', () => {
        User.emitter = undefined;
        expect(User.get.emitter()).toBeInstanceOf(EventEmitter);
      });

      it('should return User.emitter value if valid', () => {
        const emitter = new EventEmitter();
        User.emitter = emitter;
        expect(User.get.emitter()).toBe(emitter);
      });
    });

    describe('modifiers()', () => {
      it('should return an empty array if invalid modifier column is passed', () => {
        expect(User.get.modifiers(undefined)).toEqual([]);
        expect(User.get.modifiers('')).toEqual([]);
        expect(User.get.modifiers(null)).toEqual([]);
      });

      it('should return correct modifiers if modifiers are defined', () => {
        const modifierFn = (name) => name.toUpperCase();

        // Set up the User's modifiers object
        User.modifiers = { name: [modifierFn] };

        expect(User.get.modifiers('name')).toEqual([modifierFn]);
      });

      it('should return an empty array if no modifiers are defined for the column', () => {
        User.modifiers = undefined; // No modifiers defined for "name"

        expect(User.get.modifiers('name')).toEqual([]);
      });

      it('should return an empty array if the modifiers structure is incorrect', () => {
        User.modifiers = { name: 'invalid-modifier' }; // Modifier is a string, not an array of functions

        expect(User.get.modifiers('name')).toEqual([]);
      });
    });
  });

  describe('where', () => {
    class User extends (Model as any) {}

    let connection: any;

    beforeEach(() => {
      // Mock connection and the query method
      connection = mock.connection();

      // Set the builder to use the mock connection
      User.builder = new Builder(connection);
      User.table = 'users'; // Set a valid table name for testing
    });

    it('should correctly build a SELECT query', async () => {
      const condition = (col: Col, con: Con) => {
        col('status').equal('active');
      };

      // Mock query result
      connection.query = jest.fn(() => Promise.resolve([]));

      await User.where(condition).select();

      // Check that query method was called once
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users WHERE status = ?;',
        ['active']
      );
    });

    it('should correctly build a DELETE query', async () => {
      const condition = (col: Col, con: Con) => {
        col('id').equal(30);
      };

      // Mock the condition and call delete
      await User.where(condition).delete();

      // Check that query method was called once
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?;',
        [30]
      );
    });

    it('should correctly build an UPDATE query', async () => {
      const condition = (col: Col, con: Con) => {
        col('id').equal(45);
      };

      const updateData = { name: 'James', age: 28 };

      // Mock the condition and call update
      await User.where(condition).update(updateData);

      // Check that query method was called once
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'UPDATE users SET name = ?, age = ? WHERE id = ?;',
        ['James', 28, 45]
      );
    });

    it('should reject the promise if connection.query rejects in SELECT', async () => {
      const condition = (col: Col, con: Con) => {
        col('status').equal('active');
      };

      // Mock query to reject with an error
      const error = new Error('Database error');
      connection.query = jest.fn(() => Promise.reject(error));

      // Call where and expect the promise to be rejected
      await expect(User.where(condition).select()).rejects.toThrow(
        'Database error'
      );

      // Ensure the query method was called once
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users WHERE status = ?;',
        ['active']
      );
    });

    it('should reject the promise if connection.query rejects in DELETE', async () => {
      const condition = (col: Col, con: Con) => {
        col('id').equal(30);
      };

      // Mock query to reject with an error
      const error = new Error('Database error');
      connection.query = jest.fn(() => Promise.reject(error));

      // Call where and expect the promise to be rejected
      await expect(User.where(condition).delete()).rejects.toThrow(
        'Database error'
      );

      // Ensure the query method was called once
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?;',
        [30]
      );
    });

    it('should reject the promise if connection.query rejects in UPDATE', async () => {
      const condition = (col: Col, con: Con) => {
        col('id').equal(45);
      };

      const updateData = { name: 'James', age: 28 };

      // Mock query to reject with an error
      const error = new Error('Database error');
      connection.query = jest.fn(() => Promise.reject(error));

      // Call where and expect the promise to be rejected
      await expect(User.where(condition).update(updateData)).rejects.toThrow(
        'Database error'
      );

      // Ensure the query method was called once
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'UPDATE users SET name = ?, age = ? WHERE id = ?;',
        ['James', 28, 45]
      );
    });

    it('should throw an error if builder is not set in SELECT', async () => {
      // Remove the builder and try calling where.select
      User.builder = undefined;

      const condition = (col: Col, con: Con) => {
        col('status').equal('active');
      };

      // Try to call where.select and expect the promise to be rejected
      await expect(User.where(condition).select()).rejects.toThrow(
        'Invalid builder'
      );
    });

    it('should throw an error if table is not set in SELECT', async () => {
      // Remove the table and try calling where.select
      User.table = undefined;

      const condition = (col: Col, con: Con) => {
        col('status').equal('active');
      };

      // Try to call where.select and expect the promise to be rejected
      await expect(User.where(condition).select()).rejects.toThrow(
        'Invalid table name'
      );
    });

    it('should throw an error if condition is not a function in SELECT', async () => {
      const invalidCondition = 'invalid condition';

      // Try to call where.select with an invalid condition and expect the promise to be rejected
      await expect(User.where(invalidCondition).select()).rejects.toThrow(
        'Invalid SELECT condition'
      );
    });

    it('should throw an error if builder is not set in UPDATE', async () => {
      // Remove the builder and try calling where.update
      User.builder = undefined;

      const condition = (col: Col, con: Con) => {
        col('status').equal('active');
      };

      const updateData = { name: 'John Doe' };

      // Try to call where.update and expect the promise to be rejected
      await expect(User.where(condition).update(updateData)).rejects.toThrow(
        'Invalid builder'
      );
    });

    it('should throw an error if table is not set in UPDATE', async () => {
      // Remove the table and try calling where.update
      User.table = undefined;

      const condition = (col: Col, con: Con) => {
        col('status').equal('active');
      };

      const updateData = { name: 'John Doe' };

      // Try to call where.update and expect the promise to be rejected
      await expect(User.where(condition).update(updateData)).rejects.toThrow(
        'Invalid table name'
      );
    });

    it('should throw an error if condition is not a function in UPDATE', async () => {
      const invalidCondition = 'invalid condition';
      const updateData = { name: 'John Doe' };

      // Try to call where.update with an invalid condition and expect the promise to be rejected
      await expect(
        User.where(invalidCondition).update(updateData)
      ).rejects.toThrow('Invalid UPDATE condition');
    });

    it('should throw an error if builder is not set in DELETE', async () => {
      // Remove the builder and try calling where.delete
      User.builder = undefined;

      const condition = (col: Col, con: Con) => {
        col('status').equal('active');
      };

      // Try to call where.delete and expect the promise to be rejected
      await expect(User.where(condition).delete()).rejects.toThrow(
        'Invalid builder'
      );
    });

    it('should throw an error if table is not set in DELETE', async () => {
      // Remove the table and try calling where.delete
      User.table = undefined;

      const condition = (col: Col, con: Con) => {
        col('status').equal('active');
      };

      // Try to call where.delete and expect the promise to be rejected
      await expect(User.where(condition).delete()).rejects.toThrow(
        'Invalid table name'
      );
    });

    it('should throw an error if condition is not a function in DELETE', async () => {
      const invalidCondition = 'invalid condition';

      // Try to call where.delete with an invalid condition and expect the promise to be rejected
      await expect(User.where(invalidCondition).delete()).rejects.toThrow(
        'Invalid DELETE condition'
      );
    });
  });

  describe('find', () => {
    class User extends (Model as any) {}
    let connection: any;

    beforeEach(() => {
      // Mock connection and the query method
      connection = mock.connection();
      // Set the builder to use the mock connection
      User.builder = new Builder(connection);
      User.table = 'users'; // Set a valid table name for testing
    });

    it('should find and return a User model instance by its primary key', async () => {
      const mockData = [{ id: 1, name: 'John Doe' }];

      // Mock the database query to return mock data
      connection.query = jest.fn(() => Promise.resolve(mockData));

      // Call the find method with a valid primary key
      const result = await User.find(1);

      // Check that the query method was called
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users WHERE id = ?;',
        [1]
      );

      // Ensure the result is an instance of User
      expect(result).toBeInstanceOf(User);
      expect(result).toEqual(expect.objectContaining(mockData[0])); // Ensure the model is populated correctly
    });

    it('should return undefined if no model is found by primary key', async () => {
      // Mock the database query to return an empty array (no results)
      connection.query = jest.fn(() => Promise.resolve([]));

      // Call the find method with a valid primary key
      const result = await User.find(1);

      // Check that the query method was called
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users WHERE id = ?;',
        [1]
      );

      // Check that the result is undefined (no record found)
      expect(result).toBeUndefined();
    });

    it('should throw an error if an invalid primary key is provided', async () => {
      await expect(User.find(undefined)).rejects.toThrow('Invalid key');
    });

    it('should reject the promise if connection.query rejects', async () => {
      // Mock the database query to reject with an error
      const error = new Error('Database error');
      connection.query = jest.fn(() => Promise.reject(error));

      // Call the find method with a valid primary key and ensure it rejects with the correct error
      await expect(User.find(1)).rejects.toThrow('Database error');

      // Ensure the query method was called exactly once
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users WHERE id = ?;',
        [1]
      );
    });
  });

  describe('findMany', () => {
    class User extends (Model as any) {}
    let connection: any;

    beforeEach(() => {
      // Mock connection and the query method
      connection = mock.connection();
      // Set the builder to use the mock connection
      User.builder = new Builder(connection);
      User.table = 'users'; // Set a valid table name for testing
    });

    it('should find and return User models by primary keys', async () => {
      const mockData = [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Simon Doe' },
      ];

      // Mock the database query to return mock data
      connection.query = jest.fn(() => Promise.resolve(mockData));

      // Call the find method with a valid primary key
      const result = await User.findMany([1, 2]);

      // Check that the query method was called
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users WHERE id IN (?, ?);',
        [1, 2]
      );

      // Ensure the result is an Array of Users
      result.forEach((user, index) => {
        expect(user).toBeInstanceOf(User);
        expect(user).toEqual(expect.objectContaining(mockData[index])); // Ensure the model is populated correctly
      });
    });

    it('should return undefined if no model is found by primary key', async () => {
      // Mock the database query to return an empty array (no results)
      connection.query = jest.fn(() => Promise.resolve([]));

      // Call the find method with a valid primary key
      const result = await User.findMany([1, 2]);

      // Check that the query method was called
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users WHERE id IN (?, ?);',
        [1, 2]
      );

      // Check that the result is EMPTY-ARRAY (no record found)
      expect(result).toEqual([]);
    });

    it('should throw an error if an invalid primary key is provided', async () => {
      await expect(User.findMany([1, undefined])).rejects.toThrow(
        'Invalid value: undefined'
      );

      await expect(User.findMany(1, undefined)).rejects.toThrow(
        'Invalid keys: 1'
      );
    });

    it('should reject the promise if connection.query rejects', async () => {
      // Mock the database query to reject with an error
      const error = new Error('Database error');
      connection.query = jest.fn(() => Promise.reject(error));

      // Call the findMany method with an array of valid primary keys and ensure it rejects with the correct error
      await expect(User.findMany([1, 2])).rejects.toThrow('Database error');

      // Ensure the query method was called exactly once
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users WHERE id IN (?, ?);',
        [1, 2]
      );
    });
  });

  describe('insert', () => {
    class User extends (Model as any) {}

    let connection: any;
    let emitter: EventEmitter;

    beforeEach(() => {
      // Mock connection and the query method
      connection = mock.connection();
      emitter = new EventEmitter(); // Mock EventEmitter
      emitter.emit = jest.fn();

      User.builder = new Builder(connection);
      User.table = 'users'; // Set a valid table name for testing
      User.get.emitter = jest.fn().mockReturnValue(emitter); // Mock emitter
    });

    it('should insert a row and return a new User model instance', async () => {
      const row = { email: 'user@example.com', password: 'password123' };
      const pk = 1; // Simulate a primary key return

      // Mock the database query to resolve with the primary key
      connection.query = jest.fn(() => Promise.resolve(pk));

      // Disable timestamps
      User.timestamps = false;

      // Call the insert method
      const result = await User.insert(row);

      // Check if the query method was called correctly
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password) VALUES (?, ?);',
        [row.email, row.password]
      );

      // Ensure the result is an instance of User
      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe(pk); // Check if the primary key is set correctly
      expect(result.email).toBe(row.email); // Check email
      expect(result.password).toBe(row.password); // Check password
      expect(Object.keys(result).length).toBe(3); // Check password

      // Ensure the emitter events are triggered
      expect(User.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenNthCalledWith(1, INSERT, row); // Ensure the INSERT event is emitted
      expect(emitter.emit).toHaveBeenNthCalledWith(2, INSERTED, result); // Ensure the INSERT event is emitted
    });

    it('should insert a row and return a new User model instance for PostgreSQL', async () => {
      // Use pg driver
      connection.driver = mock.pg();

      const row = { email: 'user@example.com', password: 'password123' };
      const pk = 1; // Simulate a primary key return

      // Mock the database query to resolve with a Row
      connection.query = jest.fn(() => Promise.resolve({ id: pk }));

      // Disable timestamps
      User.timestamps = false;

      // Call the insert method
      const result = await User.insert(row);

      // Check if the query method was called correctly
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password) VALUES (?, ?) RETURNING id;',
        [row.email, row.password]
      );

      // Ensure the result is an instance of User
      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe(pk); // Check if the primary key is set correctly
      expect(result.email).toBe(row.email); // Check email
      expect(result.password).toBe(row.password); // Check password
      expect(Object.keys(result).length).toBe(3); // Check password

      // Ensure the emitter events are triggered
      expect(User.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenNthCalledWith(1, INSERT, row); // Ensure the INSERT event is emitted
      expect(emitter.emit).toHaveBeenNthCalledWith(2, INSERTED, result); // Ensure the INSERT event is emitted
    });

    it('should throw an error if the row object is invalid', async () => {
      // Call the insert method with an invalid row
      await expect(User.insert('invalid data')).rejects.toThrow(
        new ModelError('Invalid row: invalid data')
      );
    });

    it('should reject the promise if connection.query rejects', async () => {
      const row = { email: 'user@example.com', password: 'password123' };

      // Simulate a database failure by making the query reject with an error
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Database insert failed'))
      );

      // Call the insert method and expect it to reject due to the database error
      await expect(User.insert(row)).rejects.toThrow('Database insert failed');

      // Ensure the query method was called
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password) VALUES (?, ?);',
        [row.email, row.password]
      );

      // Ensure that 1 event emitted due to the failure
      expect(User.get.emitter).toHaveBeenCalledTimes(1);
    });

    it('should handle timestamps correctly if enabled', async () => {
      const row = { email: 'user@example.com', password: 'password123' };
      const pk = 1; // Simulate a primary key return

      // Mock the current datetime function to simulate the timestamp
      const currentDatetime = '2024-11-16 10:00:00';
      UTC.get.datetime = jest.fn().mockReturnValue(currentDatetime);

      // Mock the database query to resolve with the primary key
      connection.query = jest.fn(() => Promise.resolve(pk));

      // Enable timestamps
      User.timestamps = true;

      // Call the insert method
      const result = await User.insert(row);

      // Check if the query method was called correctly
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password, created_at, updated_at) VALUES (?, ?, ?, ?);',
        [row.email, row.password, currentDatetime, currentDatetime]
      );

      // Ensure the result is an instance of User
      expect(result).toBeInstanceOf(User);
      expect(result.id).toBe(pk); // Check if the primary key is set correctly
      expect(result.email).toBe(row.email); // Check email
      expect(result.password).toBe(row.password); // Check password
      expect(result.created_at).toBe(currentDatetime); // Check created_at timestamp
      expect(result.updated_at).toBe(currentDatetime); // Check updated_at timestamp
      expect(Object.keys(result).length).toBe(5); // Check password

      // Ensure the emitter events are triggered
      expect(User.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenNthCalledWith(1, INSERT, row); // Ensure the INSERT event is emitted
      expect(emitter.emit).toHaveBeenNthCalledWith(2, INSERTED, result); // Ensure the INSERTED event is emitted
    });
  });

  describe('insertMany', () => {
    class User extends (Model as any) {}

    let connection: any;
    let emitter: EventEmitter;

    beforeEach(() => {
      // Mock connection and the query method
      connection = mock.connection();
      emitter = new EventEmitter(); // Mock EventEmitter
      emitter.emit = jest.fn();

      User.builder = new Builder(connection);
      User.table = 'users'; // Set a valid table name for testing
      User.get.emitter = jest.fn().mockReturnValue(emitter); // Mock emitter
    });

    it('should insert multiple rows and return an array of User model instances', async () => {
      const rows = [
        { email: 'user1@example.com', password: 'password123' },
        { email: 'user2@example.com', password: 'password456' },
      ];

      // Mock the database query to resolve with the primary keys
      connection.query = jest.fn(() => Promise.resolve(undefined));

      // Disable timestamps
      User.timestamps = false;

      // Call the insertMany method
      const result = await User.insertMany(rows);

      // Check if the query method was called correctly
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password) VALUES (?, ?), (?, ?);',
        [rows[0].email, rows[0].password, rows[1].email, rows[1].password]
      );

      // Ensure the result is an array of User instances
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2); // Should return two User instances
      expect(result[0]).toBeInstanceOf(User); // First user instance
      expect(result[1]).toBeInstanceOf(User); // Second user instance
      expect(result[0].email).toBe(rows[0].email); // Check email for first user
      expect(result[1].email).toBe(rows[1].email); // Check email for second user
      expect(result[0].password).toBe(rows[0].password); // Check password for first user
      expect(result[1].password).toBe(rows[1].password); // Check password for second user

      // Ensure the emitter events are triggered
      expect(User.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenNthCalledWith(1, INSERT_MANY, rows); // Ensure the INSERT_MANY event is emitted
      expect(emitter.emit).toHaveBeenNthCalledWith(2, INSERTED_MANY, result); // Ensure the INSERTED_MANY event is emitted
    });

    it('should insert multiple rows and return an array of User model instances For PostgreSQL', async () => {
      // Use PostgreSQL
      connection.driver = mock.pg();

      const rows = [
        { email: 'user1@example.com', password: 'password123' },
        { email: 'user2@example.com', password: 'password456' },
      ];

      // Mock the database query to resolve with the primary keys
      connection.query = jest.fn(() => Promise.resolve([{ id: 1 }, { id: 2 }]));

      // Disable timestamps
      User.timestamps = false;

      // Call the insertMany method
      const result = await User.insertMany(rows);

      // Check if the query method was called correctly
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password) VALUES (?, ?), (?, ?) RETURNING id;',
        [rows[0].email, rows[0].password, rows[1].email, rows[1].password]
      );

      // Ensure the result is an array of User instances
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2); // Should return two User instances
      expect(result[0]).toBeInstanceOf(User); // First user instance
      expect(result[1]).toBeInstanceOf(User); // Second user instance
      expect(result[0].id).toBe(1); // Check id for first user
      expect(result[1].id).toBe(2); // Check id for second user
      expect(result[0].email).toBe(rows[0].email); // Check email for first user
      expect(result[1].email).toBe(rows[1].email); // Check email for second user
      expect(result[0].password).toBe(rows[0].password); // Check password for first user
      expect(result[1].password).toBe(rows[1].password); // Check password for second user

      // Ensure the emitter events are triggered
      expect(User.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenNthCalledWith(1, INSERT_MANY, rows); // Ensure the INSERT_MANY event is emitted
      expect(emitter.emit).toHaveBeenNthCalledWith(2, INSERTED_MANY, result); // Ensure the INSERTED_MANY event is emitted
    });

    it('should throw an error if the rows array is invalid', async () => {
      // Call the insertMany method with an invalid rows array
      await expect(User.insertMany(['invalid data'])).rejects.toThrow(
        new ModelError('Invalid rows: invalid data')
      );
    });

    it('should reject the promise if connection.query rejects', async () => {
      const rows = [
        { email: 'user1@example.com', password: 'password123' },
        { email: 'user2@example.com', password: 'password456' },
      ];

      // Simulate a database failure by making the query reject with an error
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Database insertMany failed'))
      );

      // Call the insertMany method and expect it to reject due to the database error
      await expect(User.insertMany(rows)).rejects.toThrow(
        'Database insertMany failed'
      );

      // Ensure the query method was called
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password) VALUES (?, ?), (?, ?);',
        [rows[0].email, rows[0].password, rows[1].email, rows[1].password]
      );

      // Ensure that 1 event emitted due to the failure
      expect(User.get.emitter).toHaveBeenCalledTimes(1);
    });

    it('should handle timestamps correctly if enabled', async () => {
      const rows = [
        { email: 'user1@example.com', password: 'password123' },
        { email: 'user2@example.com', password: 'password456' },
      ];

      // Mock the current datetime function to simulate the timestamp
      const currentDatetime = '2024-11-16 10:00:00';
      UTC.get.datetime = jest.fn().mockReturnValue(currentDatetime);

      // Mock the database query to resolve with the primary keys
      connection.query = jest.fn(() => Promise.resolve(undefined));

      // Enable timestamps
      User.timestamps = true;

      // Call the insertMany method
      const result = await User.insertMany(rows);

      // Check if the query method was called correctly
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password, created_at, updated_at) VALUES (?, ?, ?, ?), (?, ?, ?, ?);',
        [
          rows[0].email,
          rows[0].password,
          currentDatetime,
          currentDatetime,
          rows[1].email,
          rows[1].password,
          currentDatetime,
          currentDatetime,
        ]
      );

      // Ensure the result is an array of User instances
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(2); // Should return two User instances

      expect(result[0]).toBeInstanceOf(User); // First user instance
      expect(result[1]).toBeInstanceOf(User); // Second user instance

      expect(result[0].email).toBe(rows[0].email); // Check email for first user
      expect(result[1].email).toBe(rows[1].email); // Check email for second user

      expect(result[0].password).toBe(rows[0].password); // Check password for first user
      expect(result[1].password).toBe(rows[1].password); // Check password for second user

      expect(result[0].created_at).toBe(currentDatetime); // Check created_at timestamp
      expect(result[0].updated_at).toBe(currentDatetime); // Check updated_at timestamp

      expect(result[1].created_at).toBe(currentDatetime); // Check created_at timestamp for second user
      expect(result[1].updated_at).toBe(currentDatetime); // Check updated_at timestamp for second user

      // Ensure the emitter events are triggered
      expect(User.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenNthCalledWith(1, INSERT_MANY, rows); // Ensure the INSERT_MANY event is emitted
      expect(emitter.emit).toHaveBeenNthCalledWith(2, INSERTED_MANY, result); // Ensure the INSERTED_MANY event is emitted
    });
  });

  describe('select', () => {
    class User extends (Model as any) {}

    let connection: any;
    let builder: any;

    beforeEach(() => {
      // Mock connection and builder
      connection = mock.connection();
      builder = new Builder(connection);

      User.builder = builder;
      User.table = 'users'; // Set the table for testing
    });

    it('should select all records', async () => {
      // Mock the query execution to resolve with user data
      const rows = [
        { id: 1, email: 'user1@example.com' },
        { id: 2, email: 'user2@example.com' },
      ];
      connection.query = jest.fn().mockResolvedValue(rows);

      const users = await User.select().all(); // Execute the query using .all()

      // Verify the query was executed
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users;',
        []
      );

      // Check that the result is an array of users
      users.every((user: User) => expect(user).toBeInstanceOf(User));
      expect(users.length).toBe(2);
      expect(users[0]).toEqual(rows[0]);
      expect(users[1]).toEqual(rows[1]);
    });

    it('should select based on a condition', async () => {
      // Mock the query execution to resolve with filtered user data
      const rows = [
        { id: 1, email: 'user1@example.com', age: 20 },
        { id: 2, email: 'user2@example.com', age: 25 },
      ];
      connection.query = jest.fn().mockResolvedValue(rows);

      const users = await User.select()
        .where((col) => col('age').greaterThan(18))
        .all(); // Execute the query

      // Verify the query was executed with the correct WHERE clause
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users WHERE age > ?;',
        [18]
      );

      // Check the filtered results
      users.every((user: User) => expect(user).toBeInstanceOf(User));
      expect(users.length).toBe(2);
      expect(users[0]).toEqual(rows[0]);
      expect(users[1]).toEqual(rows[1]);
    });

    it('should join two tables', async () => {
      // Mock the query execution with joined user and profile data
      const rows = [
        { id: 1, email: 'user1@example.com', profile_pk: 1, age: 30 },
        { id: 2, email: 'user2@example.com', profile_pk: 2, age: 25 },
      ];
      connection.query = jest.fn().mockResolvedValue(rows);

      const users = await User.select()
        .col(
          'users.*',
          'profiles.*',
          'profiles.id AS profile_pk',
          'users.id AS user_pk'
        )
        .join('profiles', (col) =>
          col('users.id').equal(ref('profiles.user_id'))
        )
        .exec(); // Execute the query

      // Verify the query was executed with the correct JOIN clause
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.*, profiles.*, profiles.id AS profile_pk, users.id AS user_pk FROM users INNER JOIN profiles ON users.id = profiles.user_id;',
        []
      );

      // Check the filtered results
      users.every((user: User) => expect(user).toBeInstanceOf(User));
      expect(users.length).toBe(2);
      expect(users[0]).toEqual(rows[0]);
      expect(users[1]).toEqual(rows[1]);
    });

    it('should order by a column name', async () => {
      // Mock the query execution with ordered user data
      const rows = [
        { id: 2, email: 'user2@example.com' },
        { id: 1, email: 'user1@example.com' },
      ];

      connection.query = jest.fn().mockResolvedValue(rows);

      const users = await User.select().orderBy('email').exec(); // Execute the query

      // Verify the query was executed with the correct ORDER BY clause
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users ORDER BY email ASC;',
        []
      );

      // Check the filtered results
      users.every((user: User) => expect(user).toBeInstanceOf(User));
      expect(users.length).toBe(2);
      expect(users[0]).toEqual(rows[0]);
      expect(users[1]).toEqual(rows[1]);
    });

    it('should paginate the results correctly', async () => {
      // Mock the query execution to resolve with paginated user data
      const rows = [
        { id: 1, email: 'user1@example.com' },
        { id: 2, email: 'user2@example.com' },
        { id: 3, email: 'user3@example.com' },
        { id: 4, email: 'user4@example.com' },
        { id: 5, email: 'user5@example.com' },
      ];

      const totalItems = 50; // Total items in the database (for pagination purposes)
      const itemsPerPage = 5; // Items per page
      const currentPage = 1; // Requested page number (page 1)

      // Mock the database query to return the paginated result
      connection.query = jest.fn().mockResolvedValue(rows);

      // Mock the count method to return the total number of items
      const selector = User.select();
      selector.count = jest.fn().mockResolvedValue(totalItems);

      const pagination = await selector.paginate(currentPage, itemsPerPage); // Call paginate with page number and items per page

      // Verify the pagination result
      expect(pagination.result).toBeInstanceOf(Array);
      expect(pagination.result.length).toBe(rows.length);
      pagination.result.forEach((user) => expect(user).toBeInstanceOf(User));

      // Check pagination details
      expect(pagination.page.current).toBe(currentPage);
      expect(pagination.page.items).toBe(itemsPerPage);
      expect(pagination.page.prev).toBeUndefined(); // No previous page on page 1
      expect(pagination.page.next).toBe(2); // Next page is page 2
      expect(pagination.total.items).toBe(totalItems); // Total items
      expect(pagination.total.pages).toBe(10); // Total pages (50 items / 10 per page)
    });

    it('should apply registered modifiers', async () => {
      // Register modifiers to be applied globally to all columns
      User.modifiers = {
        name: [
          (value) => `mr ${value}`, // Modifier to add "mr" before the name
          (value) => value.toUpperCase(), // Modifier to convert the name to uppercase
        ],
        email: [
          (value) => value.toLowerCase(), // Modifier to convert email to lowercase
        ],
      };

      // Mock the query execution to resolve with user data
      const rows = [
        { id: 1, name: 'simon', email: 'Simon@Example.com' },
        { id: 2, name: 'jane', email: 'Jane@Example.com' },
      ];

      connection.query = jest.fn().mockResolvedValue(rows);

      const users = await User.select().all(); // Execute the query

      // Verify the query was executed correctly
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users;',
        []
      );

      // Ensure that the modifiers are applied correctly to the 'name' and 'email' columns
      expect(users[0].name).toBe('MR SIMON'); // The 'name' should have 'MR' and be uppercased
      expect(users[1].name).toBe('MR JANE'); // The 'name' should have 'MR' and be uppercased

      expect(users[0].email).toBe('simon@example.com'); // The email should be lowercase
      expect(users[1].email).toBe('jane@example.com'); // The email should be lowercase
    });

    it('should reject if connection.query rejects', async () => {
      // Simulate a rejected promise from the query method
      connection.query = jest
        .fn()
        .mockRejectedValue(new Error('Database query failed'));

      // Try to call where.select and expect the promise to be rejected
      await expect(User.select().all()).rejects.toThrow(
        'Database query failed'
      );
    });
  });

  describe('model & valueOf', () => {
    class User extends Model {
      static table = 'users'; // Mock table for testing
    }

    let user;

    beforeEach(() => {
      // Create an instance of the User model with mock data
      user = new User({ id: 1, name: 'simon', age: 24 });
    });

    it('should return the model class using model()', () => {
      // Test the model() method to get the class of the model
      const model = user.model();

      // Verify that model() returns the User class
      expect(model).toBe(User);

      // Verify that we can access static properties of the class
      expect(model.get.table()).toBe('users'); // Check table name
      expect(model.get.pk()).toBe('id'); // Check primary key
    });

    it('should return the correct column value using valueOf()', () => {
      // Test the valueOf() method to get the value of a column
      const name = user.valueOf('name');
      const age = user.valueOf('age');

      // Verify that valueOf() returns the correct values
      expect(name).toBe('simon');
      expect(age).toBe(24);
    });

    it('should throw an error when calling valueOf() with an invalid column name', () => {
      // Test valueOf() with an invalid column name
      expect(() => user.valueOf('gender')).toThrow(
        new ModelError('Invalid gender value: undefined')
      );

      // Test valueOf() with an invalid type (non-string column name)
      expect(() => user.valueOf(123)).toThrow(
        new ModelError('Invalid column name: 123')
      );
    });
  });

  describe('delete', () => {
    class User extends Model {
      static table = 'users'; // Mock table for testing
    }

    let user;
    let connection;
    let emitter;

    beforeEach(() => {
      // Create an instance of the User model with mock data
      user = new User({ id: 1, name: 'simon', age: 24 });

      // Mock the connection and query methods
      connection = mock.connection();
      emitter = new EventEmitter();
      emitter.emit = jest.fn();

      User.builder = new Builder(connection);
      User.get.emitter = jest.fn().mockReturnValue(emitter);

      // Mock the database query to resolve with no errors
      connection.query = jest.fn(() => Promise.resolve(undefined));
    });

    it('should delete the instance and emit events', async () => {
      // Call the delete method
      await user.delete();

      // Ensure that the query method was called correctly
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'DELETE FROM users WHERE id = ?;',
        [user.valueOf('id')]
      );

      // Ensure the DELETE event is emitted before deletion
      // Ensure the DELETED event is emitted after deletion
      expect(User.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenCalledWith(DELETE, user);
      expect(emitter.emit).toHaveBeenCalledWith(DELETED, user);
    });

    it('should throw an error if primary key is missing', async () => {
      // Create an instance without a primary key
      const userWithoutPk = new User({ name: 'noPK' });

      // Try to delete without a primary key and expect an error
      await expect(userWithoutPk.delete()).rejects.toThrow(
        new ModelError('Invalid id value: undefined')
      );
    });

    it('should reject the promise if connection.query rejects', async () => {
      // Simulate a failure in the database query
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Database error'))
      );

      // Call delete and expect it to throw an error
      await expect(user.delete()).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    class User extends Model {
      static table = 'users'; // Mock table for testing
      static primaryKey = 'id'; // Mock primary key for testing
      static timestamps = true; // Enable timestamps for testing
    }

    let user;
    let connection;
    let emitter;

    beforeEach(() => {
      // Create an instance of the User model with mock data
      user = new User({ id: 1, name: 'simon', age: 24 });

      // Mock the connection and query methods
      connection = mock.connection();
      emitter = new EventEmitter();
      emitter.emit = jest.fn();

      User.builder = new Builder(connection);
      User.get.emitter = jest.fn().mockReturnValue(emitter);

      // Mock the database query to resolve with no errors
      connection.query = jest.fn(() => Promise.resolve(undefined));

      // Mock UTC.get.datetime to return a fixed timestamp for testing
      UTC.get.datetime = jest.fn().mockReturnValue('2024-11-16 12:00:00');
    });

    it('should update the instance and emit events', async () => {
      // Modify user's fields
      user.name = 'James';
      user.age = 45;

      // Call the update method
      await user.update();

      // Ensure that the query method was called correctly
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'UPDATE users SET id = ?, name = ?, age = ?, updated_at = ? WHERE id = ?;',
        [1, 'James', 45, '2024-11-16 12:00:00', 1]
      );

      // Ensure the UPDATE event is emitted before the update
      // Ensure the UPDATED event is emitted after the update
      expect(User.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenCalledWith(UPDATE, user);
      expect(emitter.emit).toHaveBeenCalledWith(UPDATED, user);
    });

    it('should ignore the `id` field in the update query', async () => {
      // Modify user fields
      user.name = 'James';
      user.age = 45;

      // Ignore id
      (User as any).ignore = ['id'];

      // Call the update method
      await user.update();

      // Ensure that the query method was called correctly
      // `id` should not be included in the update query, even though it's in the model
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'UPDATE users SET name = ?, age = ?, updated_at = ? WHERE id = ?;',
        ['James', 45, '2024-11-16 12:00:00', 1] // Notice `id` is excluded from the `SET` clause
      );

      // Ensure the UPDATE event is emitted before the update
      // Ensure the UPDATED event is emitted after the update
      expect(User.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenCalledWith(UPDATE, {
        age: 45,
        name: 'James',
        updated_at: '2024-11-16 12:00:00',
      });
      expect(emitter.emit).toHaveBeenCalledWith(UPDATED, user);
    });

    it('should update the instance without timestamp if timestamps are disabled', async () => {
      // Disable timestamps for this test case
      User.timestamps = false;

      // Modify user's fields
      user.name = 'James';
      user.age = 45;

      // Call the update method
      await user.update();

      // Ensure that the query method was called correctly without timestamps
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'UPDATE users SET name = ?, age = ? WHERE id = ?;',
        ['James', 45, 1]
      );

      // Ensure the UPDATE event is emitted before the update
      // Ensure the UPDATED event is emitted after the update
      expect(User.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenCalledWith(UPDATE, {
        age: 45,
        name: 'James',
      });
      expect(emitter.emit).toHaveBeenCalledWith(UPDATED, user);
    });

    it('should throw an error if primary key is missing', async () => {
      // Create a user instance without a primary key
      const userWithoutPk = new User({ name: 'noPK', age: 30 });

      // Try to update without a primary key and expect an error
      await expect(userWithoutPk.update()).rejects.toThrow(
        new ModelError('Invalid id value: undefined')
      );
    });

    it('should reject the promise if connection.query rejects', async () => {
      // Simulate a failure in the database query
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Database error'))
      );

      // Call update and expect it to throw an error
      await expect(user.update()).rejects.toThrow('Database error');
    });
  });

  describe('link', () => {
    class Post extends Model {
      static table = 'posts';
      static primaryKey = 'id';
      static foreignKey = 'post_id';
    }

    class Category extends Model {
      static table = 'categories';
      static primaryKey = 'id';
      static foreignKey = 'category_id';
    }

    let post;
    let category;
    let connection;
    let emitter;

    beforeEach(() => {
      // Create instances of Post and Category models
      post = new Post({ id: 3 }); // Post with id 3
      category = new Category({ id: 1 }); // Category with id 1

      // Mock the connection and query methods
      connection = mock.connection();
      emitter = new EventEmitter();
      emitter.emit = jest.fn();

      Post.builder = new Builder(connection);
      Post.get.emitter = jest.fn().mockReturnValue(emitter);

      // Mock the insert query to resolve with no errors
      connection.query = jest.fn(() => Promise.resolve(undefined));
    });

    it('should link the models by creating a record in the default link table', async () => {
      // Call the link method to link the post to the category
      await post.link(category);

      // Ensure the correct query is executed to insert a row in the link table
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO category_post (post_id, category_id) VALUES (?, ?);',
        [post.valueOf('id'), category.valueOf('id')]
      );

      // Ensure the LINK event is emitted before the link is created
      // Ensure the LINKED event is emitted after the link is created
      expect(Post.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenCalledWith(LINK, post, category, {
        category_id: category.valueOf('id'),
        post_id: post.valueOf('id'),
      });
      expect(emitter.emit).toHaveBeenCalledWith(LINKED, post, category, {
        category_id: category.valueOf('id'),
        post_id: post.valueOf('id'),
      });
    });

    it('should use a custom link table name if provided', async () => {
      // Specify a custom link table name
      const customTable = 'post_category_link';

      // Call the link method with the custom table name
      await post.link(category, customTable);

      // Ensure the correct query is executed with the custom table
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO post_category_link (post_id, category_id) VALUES (?, ?);',
        [post.valueOf('id'), category.valueOf('id')]
      );
    });

    it('should add provided data to the insert statement', async () => {
      // Additional data to include in the insert statement
      const additionalData = { created_by: 'admin' };

      // Call the link method with the additional data
      await post.link(category, undefined, additionalData);

      // Ensure the correct query is executed to insert a row in the link table, including the additional data
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO category_post (created_by, post_id, category_id) VALUES (?, ?, ?);',
        [additionalData.created_by, post.valueOf('id'), category.valueOf('id')]
      );

      // Ensure the LINK event is emitted with the additional data
      // Ensure the LINKED event is emitted with the additional data
      expect(Post.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenCalledWith(LINK, post, category, {
        category_id: category.valueOf('id'),
        post_id: post.valueOf('id'),
        created_by: additionalData.created_by,
      });
      expect(emitter.emit).toHaveBeenCalledWith(LINKED, post, category, {
        category_id: category.valueOf('id'),
        post_id: post.valueOf('id'),
        created_by: additionalData.created_by,
      });
    });

    it('should throw an error if the provided model is not a valid Model instance', async () => {
      // Create a mock object that is not an instance of Model
      const invalidModel = { id: 1 };

      // Try linking with the invalid model and expect it to throw an error
      await expect(post.link(invalidModel)).rejects.toThrow(
        'Invalid link model'
      );
    });

    it('should reject the promise if connection.query rejects', async () => {
      // Simulate a database failure by making the query reject with an error
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Database insert failed'))
      );

      // Call the link method and expect it to reject due to the database error
      await expect(post.link(category)).rejects.toThrow(
        'Database insert failed'
      );

      // Ensure the LINK event is not emitted due to the failure
      expect(Post.get.emitter).toHaveBeenCalledTimes(1); // No events should be emitted

      // Ensure that the database query was attempted
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO category_post (post_id, category_id) VALUES (?, ?);',
        [post.valueOf('id'), category.valueOf('id')]
      );
    });
  });

  describe('linkMany', () => {
    class Post extends Model {
      static table = 'posts';
      static primaryKey = 'id';
      static foreignKey = 'post_id';
    }

    class Category extends Model {
      static table = 'categories';
      static primaryKey = 'id';
      static foreignKey = 'category_id';
    }

    let post1, post2, post3, category, connection, emitter;

    beforeEach(() => {
      // Create instances of Post and Category models
      post1 = new Post({ id: 1 });
      post2 = new Post({ id: 2 });
      post3 = new Post({ id: 3 });
      category = new Category({ id: 1 });

      // Mock the connection and query methods
      connection = mock.connection();
      emitter = new EventEmitter();
      emitter.emit = jest.fn();

      Category.builder = new Builder(connection);
      Category.get.emitter = jest.fn().mockReturnValue(emitter);

      // Mock the insert query to resolve with no errors
      connection.query = jest.fn(() => Promise.resolve(undefined));
    });

    it('should link multiple models to the current model and insert records into the default link table', async () => {
      // Link multiple posts to a category
      await category.linkMany([post1, post2, post3]);

      // Ensure the correct query is executed to insert multiple records into the link table
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO category_post (category_id, post_id) VALUES (?, ?), (?, ?), (?, ?);',
        [
          category.valueOf('id'),
          post1.valueOf('id'),
          category.valueOf('id'),
          post2.valueOf('id'),
          category.valueOf('id'),
          post3.valueOf('id'),
        ]
      );

      // Ensure the LINK_MANY event is emitted before the link is created
      expect(Category.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenCalledWith(
        LINK_MANY,
        category,
        [post1, post2, post3],
        [
          { category_id: category.valueOf('id'), post_id: post1.valueOf('id') },
          { category_id: category.valueOf('id'), post_id: post2.valueOf('id') },
          { category_id: category.valueOf('id'), post_id: post3.valueOf('id') },
        ]
      );
      expect(emitter.emit).toHaveBeenCalledWith(
        LINKED_MANY,
        category,
        [post1, post2, post3],
        [
          { category_id: category.valueOf('id'), post_id: post1.valueOf('id') },
          { category_id: category.valueOf('id'), post_id: post2.valueOf('id') },
          { category_id: category.valueOf('id'), post_id: post3.valueOf('id') },
        ]
      );
    });

    it('should use a custom link table name if provided', async () => {
      const customTable = 'custom_category_post_link';

      // Link multiple posts to a category using a custom table name
      await category.linkMany([post1, post2, post3], customTable);

      // Ensure the correct query is executed to insert multiple records into the custom link table
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO custom_category_post_link (category_id, post_id) VALUES (?, ?), (?, ?), (?, ?);',
        [
          category.valueOf('id'),
          post1.valueOf('id'),
          category.valueOf('id'),
          post2.valueOf('id'),
          category.valueOf('id'),
          post3.valueOf('id'),
        ]
      );
    });

    it('should add provided data to the insert statement', async () => {
      const additionalData = [
        { created_by: 'admin' },
        { created_by: 'editor' },
        { created_by: 'guest' },
      ];

      // Link multiple posts to a category with additional data
      await category.linkMany([post1, post2, post3], undefined, additionalData);

      // Ensure the correct query is executed to insert multiple records, including the additional data
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO category_post (category_id, post_id, created_by) VALUES (?, ?, ?), (?, ?, ?), (?, ?, ?);',
        [
          category.valueOf('id'),
          post1.valueOf('id'),
          additionalData[0].created_by,

          category.valueOf('id'),
          post2.valueOf('id'),
          additionalData[1].created_by,

          category.valueOf('id'),
          post3.valueOf('id'),
          additionalData[2].created_by,
        ]
      );
    });

    it('should throw an error if the provided models are not valid Model instances', async () => {
      // Create invalid models (not instances of Model)
      const invalidModel = { id: 1 };

      // Attempt to link invalid models
      await expect(category.linkMany([])).rejects.toThrow(
        'Invalid link models'
      );

      // Attempt to link invalid models
      await expect(category.linkMany([invalidModel])).rejects.toThrow(
        'Invalid link models'
      );

      // Attempt to link invalid models
      await expect(category.linkMany([post1, category])).rejects.toThrow(
        'Invalid link models'
      );
    });

    it('should reject the promise if connection.query rejects', async () => {
      // Simulate a database failure by making the query reject with an error
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Database insert failed'))
      );

      // Attempt to link multiple models and expect it to reject
      await expect(category.linkMany([post1, post2, post3])).rejects.toThrow(
        'Database insert failed'
      );

      // Ensure the LINK_MANY event is emitted before the failure
      expect(Category.get.emitter).toHaveBeenCalledTimes(1); // Only LINK_MANY event should be emitted, not LINKED_MANY

      // Ensure that the query was attempted
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO category_post (category_id, post_id) VALUES (?, ?), (?, ?), (?, ?);',
        [
          category.valueOf('id'),
          post1.valueOf('id'),
          category.valueOf('id'),
          post2.valueOf('id'),
          category.valueOf('id'),
          post3.valueOf('id'),
        ]
      );
    });
  });

  describe('unlink', () => {
    class Post extends Model {
      static table = 'posts';
      static primaryKey = 'id';
      static foreignKey = 'post_id';
    }

    class Category extends Model {
      static table = 'categories';
      static primaryKey = 'id';
      static foreignKey = 'category_id';
    }

    let post, category, connection, emitter;

    beforeEach(() => {
      // Create instances of Post and Category models
      post = new Post({ id: 3 }); // Post with id 3
      category = new Category({ id: 1 }); // Category with id 1

      // Mock the connection and query methods
      connection = mock.connection();
      emitter = new EventEmitter();
      emitter.emit = jest.fn();

      Category.builder = new Builder(connection);
      Post.get.emitter = jest.fn().mockReturnValue(emitter);

      // Mock the delete query to resolve with no errors
      connection.query = jest.fn(() => Promise.resolve(undefined));
    });

    it('should unlink the models by deleting the record from the default link table', async () => {
      // Call the unlink method to unlink the post from the category
      await category.unlink(post);

      // Ensure the correct query is executed to delete the record from the link table
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'DELETE FROM category_post WHERE category_id = ? AND post_id = ?;',
        [category.valueOf('id'), post.valueOf('id')]
      );

      // Ensure the UNLINK event is emitted before the unlink
      // Ensure the UNLINKED event is emitted after the unlink
      expect(Category.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenCalledWith(UNLINK, category, post);
      expect(emitter.emit).toHaveBeenCalledWith(UNLINKED, category, post);
    });

    it('should use a custom link table name if provided', async () => {
      const customTable = 'custom_category_post_link';

      // Call the unlink method with the custom table name
      await category.unlink(post, customTable);

      // Ensure the correct query is executed with the custom table name
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'DELETE FROM custom_category_post_link WHERE category_id = ? AND post_id = ?;',
        [category.valueOf('id'), post.valueOf('id')]
      );
    });

    it('should throw an error if the provided model is not a valid Model instance', async () => {
      // Create a mock object that is not an instance of Model
      const invalidModel = { id: 1 };

      // Try unlinking with the invalid model and expect it to throw an error
      await expect(category.unlink(invalidModel)).rejects.toThrow(
        'Invalid unlink model'
      );
    });

    it('should reject the promise if connection.query rejects', async () => {
      // Simulate a database failure by making the query reject with an error
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Database delete failed'))
      );

      // Call the unlink method and expect it to reject due to the database error
      await expect(category.unlink(post)).rejects.toThrow(
        'Database delete failed'
      );

      // Ensure the UNLINK event is emitted before the failure
      expect(Category.get.emitter).toHaveBeenCalledTimes(1); // Only UNLINK should be emitted, not UNLINKED

      // Ensure that the delete query was attempted
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'DELETE FROM category_post WHERE category_id = ? AND post_id = ?;',
        [category.valueOf('id'), post.valueOf('id')]
      );
    });
  });

  describe('unlinkMany', () => {
    class Post extends Model {
      static table = 'posts';
      static primaryKey = 'id';
      static foreignKey = 'post_id';
    }

    class Category extends Model {
      static table = 'categories';
      static primaryKey = 'id';
      static foreignKey = 'category_id';
    }

    let post1, post2, post3, category, connection, emitter;

    beforeEach(() => {
      // Create instances of Post and Category models
      post1 = new Post({ id: 1 });
      post2 = new Post({ id: 2 });
      post3 = new Post({ id: 3 });
      category = new Category({ id: 1 });

      // Mock the connection and query methods
      connection = mock.connection();
      emitter = new EventEmitter();
      emitter.emit = jest.fn();

      Category.builder = new Builder(connection);
      Category.get.emitter = jest.fn().mockReturnValue(emitter);

      // Mock the delete query to resolve with no errors
      connection.query = jest.fn(() => Promise.resolve(undefined));
    });

    it('should unlink multiple models from the current model and delete records from the default link table', async () => {
      // Unlink multiple posts from a category
      await category.unlinkMany([post1, post2, post3]);

      // Ensure the correct query is executed to delete multiple records from the link table
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'DELETE FROM category_post WHERE category_id = ? AND post_id IN (?, ?, ?);',
        [
          category.valueOf('id'),
          post1.valueOf('id'),
          post2.valueOf('id'),
          post3.valueOf('id'),
        ]
      );

      // Ensure the UNLINK_MANY event is emitted before the unlink
      // Ensure the UNLINKED_MANY event is emitted after the unlink
      expect(Category.get.emitter).toHaveBeenCalledTimes(2);
      expect(emitter.emit).toHaveBeenCalledWith(UNLINK_MANY, category, [
        post1,
        post2,
        post3,
      ]);
      expect(emitter.emit).toHaveBeenCalledWith(UNLINKED_MANY, category, [
        post1,
        post2,
        post3,
      ]);
    });

    it('should use a custom link table name if provided', async () => {
      const customTable = 'custom_category_post_link';

      // Unlink multiple posts from a category using a custom table name
      await category.unlinkMany([post1, post2, post3], customTable);

      // Ensure the correct query is executed with the custom table name
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'DELETE FROM custom_category_post_link WHERE category_id = ? AND post_id IN (?, ?, ?);',
        [
          category.valueOf('id'),
          post1.valueOf('id'),
          post2.valueOf('id'),
          post3.valueOf('id'),
        ]
      );
    });

    it('should throw an error if the provided models are not valid Model instances', async () => {
      // Create invalid models (not instances of Model)
      const invalidModel = { id: 1 };

      // Attempt to unlink invalid models
      await expect(category.unlinkMany([])).rejects.toThrow(
        'Invalid unlink models'
      );

      // Attempt to unlink invalid models
      await expect(category.unlinkMany([invalidModel])).rejects.toThrow(
        'Invalid unlink models'
      );

      // Attempt to unlink invalid models
      await expect(category.unlinkMany([post1, category])).rejects.toThrow(
        'Invalid unlink models'
      );
    });

    it('should reject the promise if connection.query rejects', async () => {
      // Simulate a database failure by making the query reject with an error
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Database delete failed'))
      );

      // Attempt to unlink multiple models and expect it to reject
      await expect(category.unlinkMany([post1, post2, post3])).rejects.toThrow(
        'Database delete failed'
      );

      // Ensure the UNLINK_MANY event is emitted before the failure
      expect(Category.get.emitter).toHaveBeenCalledTimes(1); // Only UNLINK_MANY should be emitted, not UNLINKED_MANY

      // Ensure that the delete query was attempted
      expect(connection.query).toHaveBeenCalledTimes(1);
      expect(connection.query).toHaveBeenCalledWith(
        'DELETE FROM category_post WHERE category_id = ? AND post_id IN (?, ?, ?);',
        [
          category.valueOf('id'),
          post1.valueOf('id'),
          post2.valueOf('id'),
          post3.valueOf('id'),
        ]
      );
    });
  });

  describe('OneToOne', () => {
    let connection;

    class User extends Model {
      static table = 'users';
      static primaryKey = 'id';
      static foreignKey = 'user_id';
    }

    class Profile extends Model {
      static table = 'profiles';
      static primaryKey = 'id';
      static foreignKey = 'profile_id';
    }

    let user;
    let profileData;

    beforeEach(() => {
      // Mock connection and emitter
      connection = mock.connection();

      // Mocking Model class and methods
      Profile.builder = new Builder(connection);

      // Mock user instance
      user = new User({ id: 1 });

      // Sample profile data that would be returned by the query
      profileData = { id: 1, user_id: 1, name: 'John Doe' };

      // Mock query to return profile data
      connection.query = jest.fn(() => Promise.resolve([profileData]));
    });

    it('should throw an error for invalid model input', async () => {
      const invalidModel = { id: 1 }; // Not a Model subclass

      await expect(user.OneToOne(invalidModel)).rejects.toThrow(
        'Invalid model'
      );
    });

    it('should map query result to a model and return it', async () => {
      const relatedProfile = await user.OneToOne(Profile);

      // Ensure the query is executed with the correct parameters
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT profiles.* FROM profiles WHERE user_id = ?;',
        [1]
      );

      // Ensure the result is a Profile instance with correct data
      expect(relatedProfile).toBeInstanceOf(Profile);
      expect(relatedProfile).toEqual(profileData);
    });

    it('should throw an error if multiple models are found', async () => {
      // Simulate query returning multiple profiles
      const multipleProfiles = [
        { id: 1, user_id: 1, name: 'John Doe' },
        { id: 2, user_id: 1, name: 'Jane Doe' },
      ];

      connection.query = jest.fn(() => Promise.resolve(multipleProfiles));

      await expect(user.OneToOne(Profile)).rejects.toThrow(
        new ModelError(
          `Invalid OneToOne relationship: User has more than one Profile`
        )
      );
    });

    it('should return undefined if no related model is found', async () => {
      // Simulate query returning no related models
      connection.query = jest.fn(() => Promise.resolve([]));

      const relatedProfile = await user.OneToOne(Profile);

      expect(relatedProfile).toBeUndefined();
    });

    it('should handle query errors correctly', async () => {
      // Simulate query failure
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Query failed'))
      );

      await expect(user.OneToOne(Profile)).rejects.toThrow('Query failed');
    });
  });

  describe('References', () => {
    let connection;

    class Profile extends Model {
      static table = 'profiles';
      static primaryKey = 'id';
      static foreignKey = 'profile_id';
    }

    class User extends Model {
      static table = 'users';
      static primaryKey = 'id';
      static foreignKey = 'user_id';
    }

    let profile;
    let userData;

    beforeEach(() => {
      // Mock connection and emitter
      connection = mock.connection();

      // Mocking Model class and methods
      User.builder = new Builder(connection);

      // Mock profile instance
      profile = new Profile({ id: 1, user_id: 1 });

      // Sample user data that would be returned by the query
      userData = { id: 1, name: 'John Doe' };

      // Mock query to return user data
      connection.query = jest.fn(() => Promise.resolve([userData]));
    });

    it('should throw an error for invalid model input', async () => {
      const invalidModel = { id: 1 }; // Not a Model subclass

      await expect(profile.References(invalidModel)).rejects.toThrow(
        'Invalid model'
      );
    });

    it('should execute the query, map the result to a parent model, and return it', async () => {
      const relatedUser = await profile.References(User);

      // Ensure the query is executed with the correct parameters
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT users.* FROM users WHERE id = ?;',
        [1]
      );

      // Ensure the relatedUser is an instance of User
      expect(relatedUser).toBeInstanceOf(User);
      expect(relatedUser).toEqual(userData);
    });

    it('should throw an error if multiple parent models are found', async () => {
      // Simulate query returning multiple users
      const multipleUsers = [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Doe' },
      ];

      connection.query = jest.fn(() => Promise.resolve(multipleUsers));

      await expect(profile.References(User)).rejects.toThrow(
        new ModelError(
          `Invalid OneToOne relationship: Profile references many User`
        )
      );
    });

    it('should return undefined if no parent model is found', async () => {
      // Simulate query returning no parent models
      connection.query = jest.fn(() => Promise.resolve([]));

      const relatedUser = await profile.References(User);

      expect(relatedUser).toBeUndefined();
    });

    it('should handle query errors correctly', async () => {
      // Simulate query failure
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Query failed'))
      );

      await expect(profile.References(User)).rejects.toThrow('Query failed');
    });
  });

  describe('OneToMany', () => {
    let connection;

    class User extends Model {
      static table = 'users';
      static primaryKey = 'id';
      static foreignKey = 'user_id';
    }

    class Post extends Model {
      static table = 'posts';
      static primaryKey = 'id';
      static foreignKey = 'user_id';
    }

    let user;
    let postData;

    beforeEach(() => {
      // Mock connection
      connection = mock.connection();

      // Mocking Model class and methods
      Post.builder = new Builder(connection);

      // Mock user instance
      user = new User({ id: 1 });

      // Sample post data to be returned by the query
      postData = [
        { id: 1, user_id: 1, title: 'Post 1' },
        { id: 2, user_id: 1, title: 'Post 2' },
      ];

      // Mock query to return post data
      connection.query = jest.fn(() => Promise.resolve(postData));
    });

    it('should throw an error for invalid model input', async () => {
      const invalidModel = { id: 1 }; // Not a Model subclass

      await expect(user.OneToMany(invalidModel)).rejects.toThrow(
        'Invalid model'
      );
    });

    it('should execute the query, map the result to child models, and return them', async () => {
      const relatedPosts = await user.OneToMany(Post);

      // Ensure the query is executed with the expected parameters
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT posts.* FROM posts WHERE user_id = ?;',
        [1]
      );

      // Ensure the relatedPosts are instances of Post
      expect(relatedPosts).toHaveLength(2);
      expect(relatedPosts[0]).toBeInstanceOf(Post);
      expect(relatedPosts[1]).toBeInstanceOf(Post);
      expect(relatedPosts).toEqual(postData);
    });

    it('should return an empty array if no related child models are found', async () => {
      // Simulate query returning no related posts
      connection.query = jest.fn(() => Promise.resolve([]));

      const relatedPosts = await user.OneToMany(Post);

      expect(relatedPosts).toEqual([]); // Return an empty array
    });

    it('should handle query execution errors gracefully', async () => {
      // Simulate query failure
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Query failed'))
      );

      await expect(user.OneToMany(Post)).rejects.toThrow('Query failed');
    });
  });

  describe('ManyToMany (Fetching Categories for a post)', () => {
    let connection;

    class Post extends Model {
      static table = 'posts';
      static primaryKey = 'id';
      static foreignKey = 'post_id';
    }

    class Category extends Model {
      static table = 'categories';
      static primaryKey = 'id';
      static foreignKey = 'category_id';
    }

    let post;
    let categoryData;
    let pivotData;

    beforeEach(() => {
      // Mock connection
      connection = mock.connection();

      // Mock Model class and methods
      Category.builder = new Builder(connection);

      // Mock post instance
      post = new Post({ id: 1 });

      // Sample category data to be returned by the query
      categoryData = [
        { id: 1, name: 'Category 1' },
        { id: 2, name: 'Category 2' },
      ];

      // Sample pivot table data (e.g., `post_category`)
      pivotData = [
        {
          post_id: 1,
          category_id: 1,
          created_at: '2023-01-01',
          status: 'active',
        },
        {
          post_id: 1,
          category_id: 2,
          created_at: '2023-01-02',
          status: 'inactive',
        },
      ];

      // Mock query to return category data along with pivot data
      connection.query = jest.fn(() => Promise.resolve(categoryData));
    });

    it('should throw an error for invalid model input', async () => {
      const invalidModel = { id: 1 }; // Not a Model subclass

      await expect(post.ManyToMany(invalidModel)).rejects.toThrow(
        'Invalid model'
      );
    });

    it('should execute the query, map the result to child models, and return them', async () => {
      const relatedCategories = await post.ManyToMany(Category);

      // Ensure the query is executed with the expected parameters
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT categories.* FROM categories INNER JOIN category_post ON categories.id = category_post.category_id WHERE category_post.post_id = ?;',
        [1]
      );

      // Ensure the relatedCategories are instances of Category
      expect(relatedCategories).toHaveLength(2);
      expect(relatedCategories[0]).toBeInstanceOf(Category);
      expect(relatedCategories[1]).toBeInstanceOf(Category);
      expect(relatedCategories).toEqual(categoryData);
    });

    it('should return an empty array if no related child models are found', async () => {
      // Simulate query returning no related categories
      connection.query = jest.fn(() => Promise.resolve([]));

      const relatedCategories = await post.ManyToMany(Category);

      expect(relatedCategories).toEqual([]); // Return an empty array
    });

    it('should handle query execution errors gracefully', async () => {
      // Simulate query failure
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Query failed'))
      );

      await expect(post.ManyToMany(Category)).rejects.toThrow('Query failed');
    });

    it('should include pivot table columns in the result', async () => {
      // Simulate the pivot data, including `created_at` and `status` columns

      // Call the ManyToMany method with selected pivot columns
      connection.query = jest.fn(() => Promise.resolve(pivotData));

      // Get the related categories with pivot columns
      const relatedCategories = await post.ManyToMany(
        Category,
        'post_category',
        'created_at',
        'status'
      );

      // Ensure the query includes pivot table columns in the SELECT statement
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT categories.*, post_category.created_at, post_category.status FROM categories INNER JOIN post_category ON categories.id = post_category.category_id WHERE post_category.post_id = ?;',
        [1]
      );

      // Check that the pivot columns are included in the result
      expect(relatedCategories).toHaveLength(2);
      expect(relatedCategories[0].created_at).toBe('2023-01-01');
      expect(relatedCategories[0].status).toBe('active');
      expect(relatedCategories[1].created_at).toBe('2023-01-02');
      expect(relatedCategories[1].status).toBe('inactive');
    });
  });

  describe('ManyToMany (Fetching Posts for a Category)', () => {
    let connection;

    class Category extends Model {
      static table = 'categories';
      static primaryKey = 'id';
      static foreignKey = 'category_id';
    }

    class Post extends Model {
      static table = 'posts';
      static primaryKey = 'id';
      static foreignKey = 'post_id';
    }

    let category;
    let postData;
    let pivotData;

    beforeEach(() => {
      // Mock connection
      connection = mock.connection();

      // Mock Model class and methods
      Post.builder = new Builder(connection);

      // Mock category instance
      category = new Category({ id: 1 });

      // Sample post data to be returned by the query
      postData = [
        { id: 1, title: 'Post 1' },
        { id: 2, title: 'Post 2' },
      ];

      // Sample pivot table data (e.g., `category_post`)
      pivotData = [
        {
          category_id: 1,
          post_id: 1,
          created_at: '2023-01-01',
          status: 'active',
        },
        {
          category_id: 1,
          post_id: 2,
          created_at: '2023-01-02',
          status: 'inactive',
        },
      ];

      // Mock query to return post data along with pivot data
      connection.query = jest.fn(() => Promise.resolve(postData));
    });

    it('should throw an error for invalid model input', async () => {
      const invalidModel = { id: 1 }; // Not a Model subclass

      await expect(category.ManyToMany(invalidModel)).rejects.toThrow(
        'Invalid model'
      );
    });

    it('should execute the query, map the result to child models, and return them', async () => {
      const relatedPosts = await category.ManyToMany(Post);

      // Ensure the query is executed with the expected parameters
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT posts.* FROM posts INNER JOIN category_post ON posts.id = category_post.post_id WHERE category_post.category_id = ?;',
        [1]
      );

      // Ensure the relatedPosts are instances of Post
      expect(relatedPosts).toHaveLength(2);
      expect(relatedPosts[0]).toBeInstanceOf(Post);
      expect(relatedPosts[1]).toBeInstanceOf(Post);
      expect(relatedPosts).toEqual(postData);
    });

    it('should return an empty array if no related child models are found', async () => {
      // Simulate query returning no related posts
      connection.query = jest.fn(() => Promise.resolve([]));

      const relatedPosts = await category.ManyToMany(Post);

      expect(relatedPosts).toEqual([]); // Return an empty array
    });

    it('should handle query execution errors gracefully', async () => {
      // Simulate query failure
      connection.query = jest.fn(() =>
        Promise.reject(new Error('Query failed'))
      );

      await expect(category.ManyToMany(Post)).rejects.toThrow('Query failed');
    });

    it('should include pivot table columns in the result', async () => {
      // Simulate the pivot data, including `created_at` and `status` columns

      // Call the ManyToMany method with selected pivot columns
      connection.query = jest.fn(() => Promise.resolve(pivotData));

      // Get the related posts with pivot columns
      const relatedPosts = await category.ManyToMany(
        Post,
        'category_post',
        'created_at',
        'status'
      );

      // Ensure the query includes pivot table columns in the SELECT statement
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT posts.*, category_post.created_at, category_post.status FROM posts INNER JOIN category_post ON posts.id = category_post.post_id WHERE category_post.category_id = ?;',
        [1]
      );

      // Check that the pivot columns are included in the result
      expect(relatedPosts).toHaveLength(2);
      expect(relatedPosts[0].created_at).toBe('2023-01-01');
      expect(relatedPosts[0].status).toBe('active');
      expect(relatedPosts[1].created_at).toBe('2023-01-02');
      expect(relatedPosts[1].status).toBe('inactive');
    });
  });
});
