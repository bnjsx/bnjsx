import { ColumnError } from '../../../src/core';
import { SQLiteColumn } from '../../../src/core';

describe('SQLiteColumn', () => {
  let column: SQLiteColumn;

  beforeEach(() => {
    column = new SQLiteColumn('test_column');
  });

  describe('int', () => {
    it('should set the column type to INTEGER when int() is called', () => {
      column.int();
      expect(column.get.type()).toBe('INTEGER');
    });
  });

  describe('tinyInt', () => {
    it('should set the column type to INTEGER when tinyInt() is called', () => {
      column.tinyInt();
      expect(column.get.type()).toBe('INTEGER');
    });
  });

  describe('smallInt', () => {
    it('should set the column type to INTEGER when smallInt() is called', () => {
      column.smallInt();
      expect(column.get.type()).toBe('INTEGER');
    });
  });

  describe('mediumInt', () => {
    it('should set the column type to INTEGER when mediumInt() is called', () => {
      column.mediumInt();
      expect(column.get.type()).toBe('INTEGER');
    });
  });

  describe('bigInt', () => {
    it('should set the column type to INTEGER when bigInt() is called', () => {
      column.bigInt();
      expect(column.get.type()).toBe('INTEGER');
    });
  });

  describe('float', () => {
    it('should set the column type to REAL when float() is called', () => {
      column.float();
      expect(column.get.type()).toBe('REAL');
    });
  });

  describe('double', () => {
    it('should set the column type to REAL when double() is called', () => {
      column.double();
      expect(column.get.type()).toBe('REAL');
    });
  });

  describe('decimal', () => {
    it('should set the column type to NUMERIC when decimal() is called with valid values', () => {
      column.decimal(5, 2);
      expect(column.get.type()).toBe('NUMERIC');
    });

    it('should throw an error if total is negative', () => {
      expect(() => column.decimal(-1, 2)).toThrow(ColumnError);
    });

    it('should throw an error if places is negative', () => {
      expect(() => column.decimal(5, -1)).toThrow(ColumnError);
    });

    it('should throw an error if places is greater than total', () => {
      expect(() => column.decimal(2, 5)).toThrow(ColumnError);
    });
  });

  describe('char', () => {
    it('should set the column type to TEXT when char() is called with a valid length', () => {
      column.char(10);
      expect(column.get.type()).toBe('TEXT');
    });

    it('should throw an error when char() is called with a negative length', () => {
      expect(() => column.char(-1)).toThrow(ColumnError);
    });

    it('should throw an error when char() is called with a length greater than 255', () => {
      expect(() => column.char(256)).toThrow(ColumnError);
    });

    it('should allow a length of 0', () => {
      expect(() => column.char(0)).not.toThrow();
    });
  });

  describe('varChar', () => {
    it('should set the column type to TEXT when varChar() is called with valid length', () => {
      column.varChar();
      expect(column.get.type()).toBe('TEXT');
    });

    it('should throw an error when length is negative', () => {
      expect(() => column.varChar(-1)).toThrow(ColumnError);
    });

    it('should throw an error when length exceeds 65535', () => {
      expect(() => column.varChar(70000)).toThrow(ColumnError);
    });
  });

  describe('tinyText', () => {
    it('should set the column type to TEXT when tinyText() is called', () => {
      column.tinyText();
      expect(column.get.type()).toBe('TEXT');
    });
  });

  // Test for text()
  describe('text', () => {
    it('should set the column type to TEXT when text() is called', () => {
      column.text();
      expect(column.get.type()).toBe('TEXT');
    });
  });

  // Test for mediumText()
  describe('mediumText', () => {
    it('should set the column type to TEXT when mediumText() is called', () => {
      column.mediumText();
      expect(column.get.type()).toBe('TEXT');
    });
  });

  // Test for longText()
  describe('longText', () => {
    it('should set the column type to TEXT when longText() is called', () => {
      column.longText();
      expect(column.get.type()).toBe('TEXT');
    });
  });

  describe('boolean', () => {
    it('should set the column type to INTEGER when boolean() is called', () => {
      column.boolean();
      expect(column.get.type()).toBe('INTEGER');
    });
  });

  describe('date', () => {
    it('should set the column type to TEXT when date() is called', () => {
      column.date();
      expect(column.get.type()).toBe('TEXT');
    });
  });

  describe('time', () => {
    it('should set the column type to TEXT when time() is called', () => {
      column.time();
      expect(column.get.type()).toBe('TEXT');
    });
  });

  describe('datetime', () => {
    it('should set the column type to TEXT when datetime() is called', () => {
      column.datetime();
      expect(column.get.type()).toBe('TEXT');
    });
  });

  describe('timestamp', () => {
    it('should set the column type to TEXT when timestamp() is called', () => {
      column.timestamp();
      expect(column.get.type()).toBe('TEXT');
    });
  });

  // Test for year()
  describe('year', () => {
    it('should set the column type to INTEGER when year() is called', () => {
      column.year();
      expect(column.get.type()).toBe('INTEGER');
    });
  });

  // Test for json()
  describe('json', () => {
    it('should set the column type to TEXT when json() is called', () => {
      column.json();
      expect(column.get.type()).toBe('TEXT');
    });
  });

  // Test for enum()
  describe('enum', () => {
    it('should set the column type to TEXT and add a check constraint when enum() is called with valid values', () => {
      column.enum('value1', 'value2', 'value3');
      expect(column.get.type()).toBe('TEXT');
      expect(column.get.constraints().checks).toContain(
        `${column.get.name()} IN ('value1', 'value2', 'value3')`
      );
    });

    it('should throw an error when enum() is called with no values', () => {
      expect(() => column.enum()).toThrow(ColumnError);
    });

    it('should throw an error when enum() is called with non-string values', () => {
      expect(() => column.enum('value1', 123 as any)).toThrow(ColumnError);
    });
  });
});
