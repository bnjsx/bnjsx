import { ColumnError } from '../../../src/core';
import { MySQLColumn } from '../../../src/core';

// Test bigInt
describe('MySQLColumn', () => {
  let column: MySQLColumn;

  beforeEach(() => {
    column = new MySQLColumn('test');
  });

  // Test tinyInt
  describe('tinyInt', () => {
    it('should set the type to TINYINT', () => {
      column.tinyInt();
      expect(column['type']).toBe('TINYINT');
    });
  });

  // Test smallInt
  describe('smallInt', () => {
    it('should set the type to SMALLINT', () => {
      column.smallInt();
      expect(column['type']).toBe('SMALLINT');
    });
  });

  // Test mediumInt
  describe('mediumInt', () => {
    it('should set the type to MEDIUMINT', () => {
      column.mediumInt();
      expect(column['type']).toBe('MEDIUMINT');
    });
  });

  // Test int
  describe('int', () => {
    it('should set the type to INT', () => {
      column.int();
      expect(column['type']).toBe('INT');
    });
  });

  // Test bigInt
  describe('bigInt', () => {
    it('should set the type to BIGINT', () => {
      column.bigInt();
      expect(column['type']).toBe('BIGINT');
    });
  });

  // Test float
  describe('float', () => {
    it('should set the type to FLOAT with 0-23 precision', () => {
      column.float();
      expect(column['type']).toBe('FLOAT(23)');
    });
  });

  // Test double
  describe('double', () => {
    it('should set the type to FLOAT with 0-53 precision', () => {
      column.double();
      expect(column['type']).toBe('FLOAT(53)');
    });
  });

  // Test decimal
  describe('decimal', () => {
    it('should set the type to DECIMAL with valid values', () => {
      column.decimal(10, 5);
      expect(column['type']).toBe('DECIMAL(10, 5)');
    });

    it('should throw an error for invalid total or places', () => {
      expect(() => column.decimal(-1, 5)).toThrow('Invalid arguments');
      expect(() => column.decimal(10, 11)).toThrow('Invalid arguments');
    });
  });

  // Test char
  describe('char', () => {
    it('should set the type to CHAR with valid length', () => {
      column.char(100);
      expect(column['type']).toBe('CHAR(100)');
    });

    it('should throw an error for invalid length', () => {
      expect(() => column.char(256)).toThrow(
        'Length must be between 0 and 255'
      );
    });
  });

  // Test varChar
  describe('varChar', () => {
    it('should set the type to VARCHAR with valid length', () => {
      column.varChar();
      expect(column['type']).toBe('VARCHAR(200)');

      column.varChar(1000);
      expect(column['type']).toBe('VARCHAR(1000)');
    });

    it('should throw an error for invalid length', () => {
      expect(() => column.varChar(70000)).toThrow(
        'Length must be between 0 and 65,535'
      );
    });
  });

  // Test tinyText
  describe('tinyText', () => {
    it('should set the type to TINYTEXT', () => {
      column.tinyText();
      expect(column['type']).toBe('TINYTEXT');
    });
  });

  // Test mediumText
  describe('mediumText', () => {
    it('should set the type to MEDIUMTEXT', () => {
      column.mediumText();
      expect(column['type']).toBe('MEDIUMTEXT');
    });
  });

  // Test text
  describe('text', () => {
    it('should set the type to TEXT', () => {
      column.text();
      expect(column['type']).toBe('TEXT');
    });
  });

  // Test longText
  describe('longText', () => {
    it('should set the type to LONGTEXT', () => {
      column.longText();
      expect(column['type']).toBe('LONGTEXT');
    });
  });

  // Test boolean
  describe('boolean', () => {
    it('should set the type to BOOLEAN', () => {
      column.boolean();
      expect(column['type']).toBe('BOOLEAN');
    });
  });

  // Test date
  describe('date', () => {
    it('should set the type to DATE', () => {
      column.date();
      expect(column['type']).toBe('DATE');
    });
  });

  // Test datetime
  describe('datetime', () => {
    it('should set the type to DATETIME', () => {
      column.datetime();
      expect(column['type']).toBe('DATETIME');
    });
  });

  // Test timestamp
  describe('timestamp', () => {
    it('should set the type to TIMESTAMP', () => {
      column.timestamp();
      expect(column['type']).toBe('TIMESTAMP');
    });
  });

  // Test time
  describe('time', () => {
    it('should set the type to TIME', () => {
      column.time();
      expect(column['type']).toBe('TIME');
    });
  });

  // Test year
  describe('year', () => {
    it('should set the type to YEAR', () => {
      column.year();
      expect(column['type']).toBe('YEAR');
    });
  });

  // Test json
  describe('json', () => {
    it('should set the type to JSON', () => {
      column.json();
      expect(column['type']).toBe('JSON');
    });
  });

  // Test enum
  describe('enum', () => {
    it('should set the type to ENUM with valid values', () => {
      column.enum('value1', 'value2', 'value3');
      expect(column['type']).toBe("ENUM('value1', 'value2', 'value3')");
    });

    it('should throw an error if no values are provided', () => {
      expect(() => column.enum()).toThrow(ColumnError);
    });

    it('should throw an error if non-string values are provided', () => {
      expect(() => column.enum('value1', 123 as any)).toThrow(ColumnError);
    });
  });
});
