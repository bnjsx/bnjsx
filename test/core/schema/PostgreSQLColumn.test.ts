import { ColumnError } from '../../../src/core';
import { PostgreSQLColumn } from '../../../src/core';

describe('PostgreSQLColumn', () => {
  let column: PostgreSQLColumn;

  beforeEach(() => {
    column = new PostgreSQLColumn('test_column');
  });

  describe('tinyInt()', () => {
    it('should set the type to SMALLINT', () => {
      column.tinyInt();
      expect(column.get.type()).toBe('SMALLINT');
    });
  });

  describe('smallInt()', () => {
    it('should set the type to SMALLINT', () => {
      column.smallInt();
      expect(column.get.type()).toBe('SMALLINT');
    });
  });

  describe('mediumInt()', () => {
    it('should set the type to INTEGER', () => {
      column.mediumInt();
      expect(column.get.type()).toBe('INTEGER');
    });
  });

  describe('int()', () => {
    it('should set the type to INTEGER', () => {
      column.int();
      expect(column.get.type()).toBe('INTEGER');
    });
  });

  describe('bigInt()', () => {
    it('should set the type to BIGINT', () => {
      column.bigInt();
      expect(column.get.type()).toBe('BIGINT');
    });
  });

  describe('float()', () => {
    it('should set the type to REAL', () => {
      column.float();
      expect(column.get.type()).toBe('REAL');
    });
  });

  describe('double()', () => {
    it('should set the type to DOUBLE PRECISION', () => {
      column.double();
      expect(column.get.type()).toBe('DOUBLE PRECISION');
    });
  });

  describe('decimal()', () => {
    it('should set the type to DECIMAL with correct total and places', () => {
      column.decimal(5, 2);
      expect(column.get.type()).toBe('DECIMAL(5, 2)');
    });

    it('should throw an error for invalid total or places', () => {
      expect(() => column.decimal(-1, 2)).toThrow(ColumnError);
      expect(() => column.decimal(5, -1)).toThrow(ColumnError);
      expect(() => column.decimal(5, 6)).toThrow(ColumnError);
    });
  });

  describe('char()', () => {
    it('should set the type to CHAR with the specified length', () => {
      column.char(10);
      expect(column.get.type()).toBe('CHAR(10)');
    });

    it('should throw an error for length outside of 0 to 255', () => {
      expect(() => column.char(-1)).toThrow(ColumnError);
      expect(() => column.char(256)).toThrow(ColumnError);
    });
  });

  describe('varChar()', () => {
    it('should set the type to VARCHAR with the specified length', () => {
      column.varChar();
      expect(column.get.type()).toBe('VARCHAR(200)');

      column.varChar(100);
      expect(column.get.type()).toBe('VARCHAR(100)');
    });

    it('should throw an error for length outside of 0 to 65535', () => {
      expect(() => column.varChar(-1)).toThrow(ColumnError);
      expect(() => column.varChar(65536)).toThrow(ColumnError);
    });
  });

  describe('tinyText()', () => {
    it('should set the type to VARCHAR(255)', () => {
      column.tinyText();
      expect(column.get.type()).toBe('VARCHAR(255)');
    });
  });

  describe('text()', () => {
    it('should set the type to VARCHAR(65535)', () => {
      column.text();
      expect(column.get.type()).toBe('VARCHAR(65535)');
    });
  });

  describe('mediumText()', () => {
    it('should set the type to VARCHAR(16777215)', () => {
      column.mediumText();
      expect(column.get.type()).toBe('VARCHAR(16777215)');
    });
  });

  describe('longText()', () => {
    it('should set the type to TEXT', () => {
      column.longText();
      expect(column.get.type()).toBe('TEXT');
    });
  });

  describe('boolean()', () => {
    it('should set the type to BOOLEAN', () => {
      column.boolean();
      expect(column.get.type()).toBe('BOOLEAN');
    });
  });

  describe('date()', () => {
    it('should set the type to DATE', () => {
      column.date();
      expect(column.get.type()).toBe('DATE');
    });
  });

  describe('time()', () => {
    it('should set the type to TIME WITHOUT TIME ZONE', () => {
      column.time();
      expect(column.get.type()).toBe('TIME WITHOUT TIME ZONE');
    });
  });

  describe('datetime()', () => {
    it('should set the type to TIMESTAMP WITHOUT TIME ZONE', () => {
      column.datetime();
      expect(column.get.type()).toBe('TIMESTAMP WITHOUT TIME ZONE');
    });
  });

  describe('timestamp()', () => {
    it('should set the type to TIMESTAMP WITHOUT TIME ZONE', () => {
      column.timestamp();
      expect(column.get.type()).toBe('TIMESTAMP WITHOUT TIME ZONE');
    });
  });

  describe('year()', () => {
    it('should set the type to INTEGER', () => {
      column.year();
      expect(column.get.type()).toBe('INTEGER');
    });
  });

  describe('json()', () => {
    it('should set the type to JSON', () => {
      column.json();
      expect(column.get.type()).toBe('JSON');
    });
  });

  describe('enum()', () => {
    it('should set the type to VARCHAR and add check constraint', () => {
      column.enum('value1', 'value2', 'value3');
      expect(column.get.type()).toBe('VARCHAR');
      expect(column.get.constraints().checks).toContain(
        "test_column IN ('value1', 'value2', 'value3')"
      );
    });

    it('should throw an error if no values are provided', () => {
      expect(() => column.enum()).toThrow(ColumnError);
    });

    it('should throw an error if values are not strings', () => {
      expect(() => column.enum('value1', 123 as any)).toThrow(ColumnError);
    });
  });
});
