import { CASCADE, Column, ColumnError } from '../../../src/core';

// @ts-ignore
class TestColumn extends Column {}

describe('Column', () => {
  let column: TestColumn;

  beforeEach(() => {
    column = new TestColumn('test');
  });

  // Test constructor
  describe('constructor', () => {
    it('should throw ColumnError if you try to create an instance directly', () => {
      // @ts-ignore
      expect(() => new Column('test')).toThrow(ColumnError);
    });

    it('should create an instance when a valid column name is provided', () => {
      expect(() => new TestColumn('test')).not.toThrow(ColumnError);
      expect(new TestColumn('test')['name']).toBe('test');
      expect(new TestColumn('test')['type']).toBeUndefined();
      expect(new TestColumn('test')['constraints']).toBeInstanceOf(Object);
    });

    it('should throw ColumnError if the column name is invalid', () => {
      expect(() => new TestColumn(undefined as any)).toThrow(ColumnError);
      expect(() => new TestColumn([] as any)).toThrow(ColumnError);
      expect(() => new TestColumn({} as any)).toThrow(ColumnError);
      expect(() => new TestColumn(null as any)).toThrow(ColumnError);
    });
  });

  // Test get methods
  describe('get', () => {
    // Test get.name method
    describe('get.name', () => {
      it('should return the correct column name', () => {
        expect(column.get.name()).toBe('test');
      });
    });

    // Test get.type method
    describe('get.type', () => {
      it('should return the correct column type', () => {
        expect(column.get.type()).toBe(undefined);
      });
    });

    // Test get.constraints method
    describe('get.constraints()', () => {
      it('should return the correct constraints for the column', () => {
        expect(column.notNull().get.constraints()).toEqual({
          notNull: true,
        });
      });

      it('should return an empty object if no constraints are set', () => {
        expect(column.get.constraints()).toEqual({});
      });
    });
  });

  // Test unsigned method
  describe('unsigned', () => {
    it('should set the UNSIGNED constraint', () => {
      expect(column['constraints']['unsigned']).toBeUndefined();

      column.unsigned();
      expect(column['constraints']['unsigned']).toBeTruthy();
    });
  });

  // Test autoIncrement method
  describe('autoIncrement', () => {
    it('should set the AUTO_INCREMENT constraint', () => {
      expect(column['constraints']['autoIncrement']).toBeUndefined();

      column.autoIncrement();
      expect(column['constraints']['autoIncrement']).toBeTruthy();
    });
  });

  // Test notNull method
  describe('notNull', () => {
    it('should set the NOT NULL constraint', () => {
      expect(column['constraints']['notNull']).toBeUndefined();

      column.notNull();
      expect(column['constraints']['notNull']).toBeTruthy();
    });
  });

  // Test default method
  describe('default', () => {
    it('should set the default value when a valid value is provided', () => {
      expect(column['constraints']['default']).toBeUndefined();

      column.default('simon');
      expect(column['constraints']['default']).toBe(`'simon'`);

      column.default(null);
      expect(column['constraints']['default']).toBe('NULL');

      column.default(100);
      expect(column['constraints']['default']).toBe('100');

      column.default(true);
      expect(column['constraints']['default']).toBe('1');

      column.default(false);
      expect(column['constraints']['default']).toBe('0');
    });

    it('should throw ColumnError if the default value is invalid', () => {
      expect(() => column.default(undefined as any)).toThrow(ColumnError);
      expect(() => column.default([] as any)).toThrow(ColumnError);
      expect(() => column.default({} as any)).toThrow(ColumnError);
    });
  });

  // Test unique method
  describe('unique', () => {
    it('should set the unique constraint when a valid name is provided', () => {
      expect(column['constraints']['unique']).toBeUndefined();

      column.unique();
      expect(column['constraints']['unique']).toBeTruthy();
    });
  });

  // Test primaryKey method
  describe('primaryKey', () => {
    it('should set the primary key constraint when a valid name is provided', () => {
      expect(column['constraints']['primaryKey']).toBeUndefined();

      column.primaryKey();
      expect(column['constraints']['primaryKey']).toBeTruthy();
    });
  });

  // Test foreignKey method
  describe('foreignKey', () => {
    it('should set the foreign key constraint when a valid name is provided', () => {
      expect(column['constraints']['foreignKey']).toBeUndefined();

      column.foreignKey();
      expect(column['constraints']['foreignKey']).toEqual({
        references: undefined,
        onUpdate: undefined,
        onDelete: undefined,
      });
    });
  });

  // Test references method
  describe('references', () => {
    it('should set the references table and column', () => {
      expect(column['constraints']['foreignKey']).toBeUndefined();

      column.foreignKey().references('products', 'id');
      expect(column['constraints']['foreignKey']).toEqual({
        references: {
          table: 'products',
          column: 'id',
        },
        onUpdate: undefined,
        onDelete: undefined,
      });
    });

    it('should throw ColumnError if the table name is not a string', () => {
      expect(() =>
        column.foreignKey().references(undefined as any, 'id')
      ).toThrow(ColumnError);
    });

    it('should throw ColumnError if the column name is not a string', () => {
      expect(() =>
        column.foreignKey().references('products', undefined as any)
      ).toThrow(ColumnError);
    });

    it('should throw ColumnError if foreign key is undefined', () => {
      expect(() => column.references('products', 'id')).toThrow(ColumnError);
    });
  });

  // Test ref method
  describe('ref', () => {
    it('should call references with the correct arguments', () => {
      // Mock the references method
      column.references = jest.fn();

      // Execute the ref method
      column.ref('users', 'id');

      // Check that references was called with the correct arguments
      expect(column.references).toHaveBeenCalledWith('users', 'id');
    });
  });

  // Test onUpdate method
  describe('onUpdate', () => {
    it('should set the onUpdate action for the foreign key', () => {
      expect(column['constraints']['foreignKey']).toBeUndefined();

      column.foreignKey().references('products', 'id').onUpdate(CASCADE);
      expect(column['constraints']['foreignKey']).toEqual({
        references: {
          table: 'products',
          column: 'id',
        },
        onUpdate: CASCADE,
        onDelete: undefined,
      });
    });

    it('should throw ColumnError if the operation is invalid', () => {
      expect(() =>
        column
          .foreignKey()
          .references('products', 'id')
          .onUpdate('invalid' as any)
      ).toThrow(ColumnError);
    });

    it('should throw ColumnError if foreign key is undefined', () => {
      // Implement test
      expect(() => column.onUpdate(CASCADE)).toThrow(ColumnError);
    });
  });

  // Test onDelete method
  describe('onDelete', () => {
    it('should set the onDelete action for the foreign key', () => {
      expect(column['constraints']['foreignKey']).toBeUndefined();

      column.foreignKey().references('products', 'id').onDelete(CASCADE);
      expect(column['constraints']['foreignKey']).toEqual({
        references: {
          table: 'products',
          column: 'id',
        },
        onUpdate: undefined,
        onDelete: CASCADE,
      });
    });

    it('should throw ColumnError if the operation is invalid', () => {
      // Implement test
      expect(() =>
        column
          .foreignKey()
          .references('products', 'id')
          .onDelete('invalid' as any)
      ).toThrow(ColumnError);
    });

    it('should throw ColumnError if foreign key is undefined', () => {
      expect(() => column.onDelete(CASCADE)).toThrow(ColumnError);
    });
  });

  // Test check method
  describe('check', () => {
    it('should set the check constraint when valid condition is provided', () => {
      expect(column.check('users.age = 24')['constraints']['checks']).toEqual([
        'users.age = 24',
      ]);
    });

    it('should throw ColumnError if the condition is not a string', () => {
      expect(() => column.check(undefined as any)).toThrow(ColumnError);
    });
  });

  // Test index method
  describe('index', () => {
    it('should set the index when a valid name and unique flag are provided', () => {
      // Implement test
      expect(column['constraints']['index']).toBeUndefined();
      expect(column.index()['constraints']['index']).toBeTruthy();
    });
  });

  // Test pk method
  describe('pk', () => {
    it('should call bigInt, unsigned, autoIncrement, and primaryKey methods', () => {
      // Assign mocks to the Column instance
      column.bigInt = jest.fn().mockReturnThis();
      column.unsigned = jest.fn().mockReturnThis();
      column.autoIncrement = jest.fn().mockReturnThis();
      column.primaryKey = jest.fn().mockReturnThis();

      // Execute the pk method
      column.pk();

      // Verify that each method was called
      expect(column.bigInt).toHaveBeenCalled();
      expect(column.unsigned).toHaveBeenCalled();
      expect(column.autoIncrement).toHaveBeenCalled();
      expect(column.primaryKey).toHaveBeenCalled();
    });
  });

  // Test fk method
  describe('fk', () => {
    it('should call bigInt, unsigned, and foreignKey methods', () => {
      // Assign mocks to the Column instance
      column.bigInt = jest.fn().mockReturnThis();
      column.unsigned = jest.fn().mockReturnThis();
      column.foreignKey = jest.fn().mockReturnThis();

      // Execute the fk method
      column.fk();

      // Verify that each method was called
      expect(column.bigInt).toHaveBeenCalled();
      expect(column.unsigned).toHaveBeenCalled();
      expect(column.foreignKey).toHaveBeenCalled();
    });
  });

  // Test ip method
  describe('ip', () => {
    it('should call varChar with length 39', () => {
      // Assign the mock to the Column instance
      column.varChar = jest.fn().mockReturnThis();

      // Execute the ip method
      column.ip();

      // Verify that varChar was called with the correct argument
      expect(column.varChar).toHaveBeenCalledWith(39);
    });
  });

  // Test uuid method
  describe('uuid', () => {
    it('should call varChar with length 36', () => {
      // Assign the mock to the Column instance
      column.varChar = jest.fn().mockReturnThis();

      // Execute the uuid method
      column.uuid();

      // Verify that varChar was called with the correct argument
      expect(column.varChar).toHaveBeenCalledWith(36);
    });
  });
});
