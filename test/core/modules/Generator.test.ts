jest.mock('../../../src/core/modules/Builder');

import { MySQLColumn } from '../../../src/core';
import { SQLiteColumn } from '../../../src/core';
import { PostgreSQLColumn } from '../../../src/core';
import { CASCADE } from '../../../src/core';
import { Generator } from '../../../src/core';
import { GeneratorError } from '../../../src/core';
import { Connection } from '../../../src/core';
import { Builder } from '../../../src/core/modules/Builder';

class TestGenerator extends Generator {
  constructor() {
    super();
    this.set.table('test');
  }
}

const mock = {
  builder: (connection?: Connection) => {
    if (!connection) connection = mock.MySQLConnection();

    const builder = new Builder({} as any);
    builder.raw = jest.fn(() => Promise.resolve()) as any;
    builder.get = { connection: jest.fn(() => connection as any) };
    return builder;
  },

  MySQLConnection: () => {
    return { driver: { id: Symbol('MySQL') } } as any;
  },
  SQLiteConnection: () => {
    return { driver: { id: Symbol('SQLite') } } as any;
  },
  PostgreSQLConnection: () => {
    return { driver: { id: Symbol('PostgreSQL') } } as any;
  },
};

let generator: any = new TestGenerator();

describe('Generator', () => {
  beforeEach(() => {
    generator = new TestGenerator();
    generator.set.builder(mock.builder());
    generator.set.table('test_table');
  });

  describe('constructor', () => {
    it('should not allow direct instantiation', () => {
      expect(() => new (Generator as any)()).toThrow(GeneratorError);
    });
  });

  describe('get', () => {
    describe('table', () => {
      it('should return the correct table name', () => {
        const table = 'test_table';
        generator.set.table(table);
        expect(generator.get.table()).toBe(table);
      });

      it('should throw an error for invalid table names', () => {
        // Invalid table
        generator.table = '-invalid-';
        expect(() => generator.get.table()).toThrow(
          'Invalid table name in: TestGenerator'
        );
      });
    });

    describe('builder', () => {
      it('should return the correct builder', () => {
        const builder = mock.builder();
        generator.set.builder(builder);
        expect(generator.get.builder()).toBe(builder);
      });

      it('should throw an error for invalid builder', () => {
        // Invalid builder
        generator.builder = '-invalid-';
        expect(() => generator.get.builder()).toThrow(
          'Invalid builder in: TestGenerator'
        );
      });
    });
  });

  describe('set', () => {
    describe('table', () => {
      it('should set a valid table name', () => {
        const table = 'test_table';
        generator.set.table(table);
        expect(generator.get.table()).toBe(table);
      });

      it('should throw an error for an invalid table name', () => {
        expect(() => generator.set.table('-invalid-')).toThrow(
          'Invalid table name in: TestGenerator'
        );
      });
    });

    describe('builder', () => {
      it('should set a valid builder name', () => {
        const builder = mock.builder();
        generator.set.builder(builder);
        expect(generator.get.builder()).toBe(builder);
      });

      it('should throw an error for an invalid builder name', () => {
        expect(() => generator.set.builder('-invalid-')).toThrow(
          'Invalid builder in: TestGenerator'
        );
      });
    });
  });

  describe('column', () => {
    it('should return MySQLColumn when driver is MySQL', () => {
      generator.set.builder(mock.builder(mock.MySQLConnection()));

      const column = generator.column('test_column');
      expect(column).toBeInstanceOf(MySQLColumn);
      expect(column.name).toBe('test_column');
    });

    it('should return SQLiteColumn when driver is SQLite', () => {
      generator.set.builder(mock.builder(mock.SQLiteConnection()));

      const column = generator.column('test_column');
      expect(column).toBeInstanceOf(SQLiteColumn);
      expect(column.name).toBe('test_column');
    });

    it('should return PostgreSQLColumn when driver is PostgreSQL', () => {
      generator.set.builder(mock.builder(mock.PostgreSQLConnection()));

      const column = generator.column('test_column');
      expect(column).toBeInstanceOf(PostgreSQLColumn);
      expect(column.name).toBe('test_column');
    });

    it('should throw in case of an invalid driver', () => {
      const builder = mock.builder();
      const connection = { driver: null } as any;

      builder.get.connection = jest.fn(() => connection);
      generator.set.builder(builder);

      expect(() => generator.column('test_column')).toThrow(
        'Invalid driver in: TestGenerator'
      );
    });
  });

  describe('schema', () => {
    describe('columns', () => {
      it('rejects if columns array is empty', async () => {
        expect(generator.schema()).rejects.toThrow(
          'Undefined schema columns in: TestGenerator'
        );
      });

      it('rejects if any column is invalid for MySQL driver', async () => {
        // Our generator is using a MySQLConnection
        generator.set.builder(mock.builder(mock.MySQLConnection()));

        // Invalid column => Rejects
        expect(
          generator.schema(new SQLiteColumn('name').varChar())
        ).rejects.toThrow('Invalid columns in: TestGenerator');

        // Valid columns => Resolve
        expect(
          generator.schema(new MySQLColumn('name').varChar())
        ).resolves.toBeUndefined();
      });

      it('rejects if any column is invalid for PostgreSQL driver', async () => {
        // Our generator is using a PostgreSQLConnection
        generator.set.builder(mock.builder(mock.PostgreSQLConnection()));

        // Invalid column => Rejects
        expect(
          generator.schema(new SQLiteColumn('name').varChar())
        ).rejects.toThrow('Invalid columns in: TestGenerator');

        // Valid columns => Resolve
        expect(
          generator.schema(new PostgreSQLColumn('name').varChar())
        ).resolves.toBeUndefined();
      });

      it('rejects if any column is invalid for SQLite driver', async () => {
        // Our generator is using an SQLiteConnection
        generator.set.builder(mock.builder(mock.SQLiteConnection()));

        // Invalid column => Rejects
        expect(
          generator.schema(new MySQLColumn('name').varChar())
        ).rejects.toThrow('Invalid columns in: TestGenerator');

        // Valid columns => Resolves
        expect(
          generator.schema(new SQLiteColumn('name').varChar())
        ).resolves.toBeUndefined();
      });

      it('rejects if using an invalid driver', async () => {
        // Our generator is using an invalid driver
        generator.set.builder(mock.builder({ driver: {} } as any));

        // Invalid driver => Rejects
        expect(
          generator.schema(new MySQLColumn('name').varChar())
        ).rejects.toThrow('Invalid columns in: TestGenerator');

        // Invalid driver => Rejects
        expect(
          generator.schema(new PostgreSQLColumn('name').varChar())
        ).rejects.toThrow('Invalid columns in: TestGenerator');

        // Invalid driver => Rejects
        expect(
          generator.schema(new SQLiteColumn('name').varChar())
        ).rejects.toThrow('Invalid columns in: TestGenerator');
      });
    });

    describe('resolve function', () => {
      describe('Basic SQL Statement Generation', () => {
        it('should generate an SQL create table statement with no constraints', async () => {
          const builder = generator.get.builder();
          const column = generator.column('name').varChar(200);

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (name VARCHAR(200));'
          );
        });

        it('should throw an error if column name is undefined', async () => {
          const builder = generator.get.builder();
          const column = generator.column('name').varChar(200);

          // change column name
          column.name = undefined;
          await expect(generator.schema(column)).rejects.toThrow(
            'Undefined column name in: TestGenerator'
          );

          expect(builder.raw).toHaveBeenCalledTimes(0);
        });

        it('should throw an error if column type is undefined', async () => {
          const builder = generator.get.builder();
          const column = generator.column('name').varChar(200);

          // change column type
          column.type = undefined;
          await expect(generator.schema(column)).rejects.toThrow(
            'Undefined column type in: TestGenerator'
          );

          expect(builder.raw).toHaveBeenCalledTimes(0);
        });
      });

      describe('Primary Key Constraints', () => {
        it('should add a primary key constraint when primaryKey is specified', async () => {
          const builder = generator.get.builder();
          const column = generator.column('id').pk();

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (id BIGINT UNSIGNED AUTO_INCREMENT, CONSTRAINT pk_test_table_id PRIMARY KEY (id));'
          );
        });
      });

      describe('Foreign Key Constraints', () => {
        it('should add a foreign key constraint with onDelete and onUpdate', async () => {
          const builder = generator.get.builder();
          const column = generator
            .column('user_id')
            .fk()
            .ref('users', 'id')
            .onDelete(CASCADE)
            .onUpdate(CASCADE);

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (user_id BIGINT UNSIGNED, CONSTRAINT fk_test_table_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE);'
          );
        });

        it('should add a foreign key constraint without onDelete and onUpdate', async () => {
          const builder = generator.get.builder();
          const column = generator.column('user_id').fk().ref('users', 'id');

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (user_id BIGINT UNSIGNED, CONSTRAINT fk_test_table_user_id FOREIGN KEY (user_id) REFERENCES users(id));'
          );
        });

        it('should throw an error if foreign key reference is undefined', async () => {
          const builder = generator.get.builder();
          const column = generator.column('user_id').fk();

          await expect(generator.schema(column)).rejects.toThrow(
            'Undefined foreign key reference in: TestGenerator'
          );

          expect(builder.raw).toHaveBeenCalledTimes(0);
        });
      });

      describe('Auto-Increment Constraints', () => {
        it('should add an auto-increment constraint for MySQL', async () => {
          const builder = generator.get.builder();
          const column = generator
            .column('id')
            .bigInt()
            .autoIncrement()
            .primaryKey();

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (id BIGINT AUTO_INCREMENT, CONSTRAINT pk_test_table_id PRIMARY KEY (id));'
          );
        });

        it('should replace type with BIGSERIAL for PostgreSQL', async () => {
          const builder = mock.builder(mock.PostgreSQLConnection());

          // Set the builder
          generator.set.builder(builder);

          const column = generator
            .column('id')
            .bigInt()
            .autoIncrement()
            .primaryKey();

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (id BIGSERIAL, CONSTRAINT pk_test_table_id PRIMARY KEY (id));'
          );
        });

        it('should throw if auto-increment used without a primary key', async () => {
          const builder = generator.get.builder();
          const column = generator.column('id').bigInt().autoIncrement();

          await expect(generator.schema(column)).rejects.toThrow(
            "Your auto-increment column 'id' must be a primary key in: TestGenerator"
          );

          expect(builder.raw).toHaveBeenCalledTimes(0);
        });
      });

      describe('Unsigned Constraints', () => {
        it('should add UNSIGNED keyword for MySQL', async () => {
          const builder = generator.get.builder();
          const column = generator.column('id').bigInt().unsigned();

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (id BIGINT UNSIGNED);'
          );
        });

        it('should ignore unsigned for auto-increment columns in PostgreSQL', async () => {
          const builder = mock.builder(mock.PostgreSQLConnection());

          // Set builder
          generator.set.builder(builder);

          const column = generator
            .column('id')
            .bigInt()
            .unsigned() // ignored
            .autoIncrement() // because the column value is auto-incremented
            .primaryKey();

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (id BIGSERIAL, CONSTRAINT pk_test_table_id PRIMARY KEY (id));'
          );
        });

        it('should add unsigned check in PostgreSQL', async () => {
          const builder = mock.builder(mock.PostgreSQLConnection());

          // Set builder
          generator.set.builder(builder);

          const column = generator.column('id').bigInt().unsigned();

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (id BIGINT, CONSTRAINT check_test_table_id_0 CHECK (id >= 0));'
          );
        });

        it('should ignore unsigned for auto-increment columns in SQLite', async () => {
          const builder = mock.builder(mock.SQLiteConnection());

          // Set builder
          generator.set.builder(builder);

          const column = generator
            .column('id')
            .bigInt()
            .unsigned() // ignored
            .autoIncrement() // because the column value is auto-incremented
            .primaryKey();

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (id INTEGER, CONSTRAINT pk_test_table_id PRIMARY KEY (id));'
          );
        });

        it('should add unsigned check in SQLite', async () => {
          const builder = mock.builder(mock.SQLiteConnection());

          // Set builder
          generator.set.builder(builder);

          const column = generator.column('id').bigInt().unsigned();

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (id INTEGER, CONSTRAINT check_test_table_id_0 CHECK (id >= 0));'
          );
        });
      });

      describe('Not Null Constraints', () => {
        it('should add a NOT NULL constraint if specified', async () => {
          const builder = generator.get.builder();
          const column = generator.column('id').bigInt().notNull();

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (id BIGINT NOT NULL);'
          );
        });
      });

      describe('Default Value Constraints', () => {
        it('should add a DEFAULT value constraint when specified', async () => {
          const builder = generator.get.builder();
          const column = generator.column('age').smallInt().default(18);

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (age SMALLINT DEFAULT 18);'
          );
        });
      });

      describe('Unique Constraints', () => {
        it('should add a UNIQUE constraint when specified', async () => {
          const builder = generator.get.builder();
          const column = generator.column('email').varChar().unique();

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (email VARCHAR(200), CONSTRAINT unique_test_table_email UNIQUE (email));'
          );
        });
      });

      describe('Check Constraints', () => {
        it('should add a check constraint with a specified condition', async () => {
          const builder = generator.get.builder();
          const column = generator.column('age').smallInt().check('age >= 18');

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (age SMALLINT, CONSTRAINT check_test_table_age_0 CHECK (age >= 18));'
          );
        });

        it('should add multiple checks if multiple conditions provided', async () => {
          const builder = generator.get.builder();
          const column = generator
            .column('age')
            .smallInt()
            .check('age >= 18')
            .check('age <= 40');

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(1);
          expect(builder.raw).toHaveBeenCalledWith(
            'CREATE TABLE test_table (age SMALLINT, CONSTRAINT check_test_table_age_0 CHECK (age >= 18), CONSTRAINT check_test_table_age_1 CHECK (age <= 40));'
          );
        });
      });

      describe('Indexes', () => {
        it('should add an index when index constraint is specified', async () => {
          const builder = generator.get.builder();
          const column = generator
            .column('user_id')
            .fk()
            .ref('users', 'id')
            .index();

          await expect(generator.schema(column)).resolves.toBeUndefined();

          expect(builder.raw).toHaveBeenCalledTimes(2);
          expect(builder.raw).toHaveBeenLastCalledWith(
            'CREATE INDEX index_test_table_user_id ON test_table(user_id);'
          );
        });
      });
    });
  });

  describe('createdAt', () => {
    it('should create a "created_at" column with datetime type', () => {
      const created = generator.createdAt();

      expect(created).toBeInstanceOf(MySQLColumn);
      expect(created.name).toBe('created_at');
      expect(created.type).toBe('DATETIME');
    });
  });

  describe('updatedAt', () => {
    it('should create an "updated_at" column with datetime type', () => {
      const created = generator.createdAt();

      expect(created).toBeInstanceOf(MySQLColumn);
      expect(created.name).toBe('created_at');
      expect(created.type).toBe('DATETIME');
    });
  });

  describe('primaryKey', () => {
    it('should create a primary key column with the default name "id"', () => {
      const pk = generator.primaryKey();

      expect(pk).toBeInstanceOf(MySQLColumn);
      expect(pk.name).toBe('id');
      expect(pk.type).toBe('BIGINT');
      expect(pk.constraints.primaryKey).toBe(true);
      expect(pk.constraints.autoIncrement).toBe(true);
      expect(pk.constraints.unsigned).toBe(true);
    });

    it('should create a primary key column with the given name', () => {
      const pk = generator.primaryKey('pk');

      expect(pk).toBeInstanceOf(MySQLColumn);
      expect(pk.name).toBe('pk');
      expect(pk.type).toBe('BIGINT');
      expect(pk.constraints.primaryKey).toBe(true);
      expect(pk.constraints.autoIncrement).toBe(true);
      expect(pk.constraints.unsigned).toBe(true);
    });
  });

  describe('timestamps', () => {
    it('should create both "created_at" and "updated_at" columns with datetime types', () => {
      const timestamps = generator.timestamps();

      const [created, updated] = timestamps;

      expect(created.name).toBe('created_at');
      expect(created.type).toBe('DATETIME');

      expect(updated.name).toBe('updated_at');
      expect(updated.type).toBe('DATETIME');
    });
  });

  describe('drop', () => {
    test('should drop the table and resolve', async () => {
      await expect(generator.drop()).resolves.toBeUndefined();

      // Ensure the `raw` method was called with the correct SQL statement
      expect(generator.get.builder().raw).toHaveBeenCalledWith(
        'DROP TABLE test_table;'
      );
    });

    test('should drop the table and resolve', async () => {
      generator.get.builder().raw = jest.fn(() => Promise.reject(Error('ops')));
      await expect(generator.drop()).rejects.toThrow('ops');

      // Ensure the `raw` method was called with the correct SQL statement
      expect(generator.get.builder().raw).toHaveBeenCalledWith(
        'DROP TABLE test_table;'
      );
    });
  });

  describe('create', () => {
    it('should throw an error', () => {
      expect(() => generator.create()).toThrow();
    });
  });
});
