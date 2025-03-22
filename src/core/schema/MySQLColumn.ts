import { isArrOfStr } from '../../helpers';
import { Column, ColumnError } from './Column';

/**
 * Class representing a MySQL column, extending the Column abstract class.
 * @extends Column
 */
export class MySQLColumn extends Column {
  /**
   * Constructs a new `MySQLColumn`.
   * @param name - The name of the column.
   */
  constructor(name: string) {
    super(name);
  }

  /**
   * Creates a column with the `TINYINT` data type in MySQL.
   * `TINYINT` is used for very small integer values and ranges from -128 to 127 (signed) or 0 to 255 (unsigned).
   *
   * @returns The current instance of `MySQLColumn` with the `TINYINT` type set.
   */
  public tinyInt(): MySQLColumn {
    this.type = 'TINYINT';
    return this;
  }

  /**
   * Creates a column with the `SMALLINT` data type in MySQL.
   * `SMALLINT` is used for small integer values and ranges from -32,768 to 32,767 (signed) or 0 to 65,535 (unsigned).
   *
   * @returns The current instance of `MySQLColumn` with the `SMALLINT` type set.
   */
  public smallInt(): MySQLColumn {
    this.type = 'SMALLINT';
    return this;
  }

  /**
   * Creates a column with the `MEDIUMINT` data type in MySQL.
   * `MEDIUMINT` is used for medium-sized integer values and ranges from -8,388,608 to 8,388,607 (signed) or 0 to 16,777,215 (unsigned).
   *
   * @returns The current instance of `MySQLColumn` with the `MEDIUMINT` type set.
   */
  public mediumInt(): MySQLColumn {
    this.type = 'MEDIUMINT';
    return this;
  }

  /**
   * Creates a column with the `INT` data type in MySQL.
   * `INT` is used for standard integer values and ranges from -2,147,483,648 to 2,147,483,647 (signed) or 0 to 4,294,967,295 (unsigned).
   *
   * @returns The current instance of `MySQLColumn` with the `INT` type set.
   */
  public int(): MySQLColumn {
    this.type = 'INT';
    return this;
  }

  /**
   * Creates a column with the `BIGINT` data type in MySQL.
   * `BIGINT` is used for very large integer values and ranges from -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807 (signed) or 0 to 18,446,744,073,709,551,615 (unsigned).
   *
   * @returns The current instance of `MySQLColumn` with the `BIGINT` type set.
   */
  public bigInt(): MySQLColumn {
    this.type = 'BIGINT';
    return this;
  }

  /**
   * Creates a column with the `FLOAT` data type in MySQL.
   * `FLOAT` is used for single-precision floating-point numbers.
   * It can handle up to approximately 7 decimal places.
   * If you store a number with more than 7 decimal places, it will be rounded to fit within that precision.
   *
   */
  public float(): MySQLColumn {
    this.type = 'FLOAT(23)';
    return this;
  }

  /**
   * Creates a column with the `DOUBLE` data type in MySQL.
   * `DOUBLE` is used for double-precision floating-point numbers.
   * It can handle up to approximately 15-16 decimal places.
   * If you store a number with more than 15-16 decimal places, it will be rounded to fit within that precision.
   *
   */
  public double(): MySQLColumn {
    this.type = `FLOAT(53)`;
    return this;
  }

  /**
   * Creates a column with the `DECIMAL` data type in MySQL.
   * This type is used for exact numeric values where precision is critical.
   * If you store a value that exceeds the precision (`total`) or scale (`places`), MySQL **truncates** the value without rounding.
   *
   * @param total - The total number of digits in the number, including digits before and after the decimal point.
   * @param places - The number of digits after the decimal point.
   * @returns The current instance of `MySQLColumn`.
   * @throws Throws an error if `total` or `places` values are invalid.
   */
  public decimal(total: number, places: number): MySQLColumn {
    if (total < 0 || places < 0 || places > total) {
      throw new ColumnError(
        'Invalid arguments: total must be >= 0, places must be >= 0 and <= total'
      );
    }

    this.type = `DECIMAL(${total}, ${places})`;
    return this;
  }

  /**
   * Creates a column with the `CHAR` data type in MySQL.
   * `CHAR` is a fixed-length string data type. The `length` parameter specifies the exact number of characters stored in the column.
   *
   * @param length - The length of the `CHAR` column. Must be between 0 and 255.
   * @returns The current instance of `MySQLColumn`.
   * @throws Throws an error if `length` is not within the range of 0 to 255.
   *
   * @note The difference between `CHAR` and `VARCHAR`:
   * - `CHAR` is a fixed-length type, meaning it always stores exactly the specified number of characters. If the string is shorter, MySQL pads it with spaces.
   * - `VARCHAR` is variable-length and only stores the actual number of characters in the string.
   *
   *  @note What happens if an inserted value exceeds the specified length:
   * - In both cases MySQL will truncate the value to the specified maximum length.
   */
  public char(length: number): MySQLColumn {
    if (length < 0 || length > 255) {
      throw new ColumnError('Length must be between 0 and 255');
    }

    this.type = `CHAR(${length})`;
    return this;
  }

  /**
   * Creates a column with the `VARCHAR` data type in MySQL.
   * `VARCHAR` is a variable-length string data type. The `length` parameter specifies the maximum number of characters.
   *
   * @param length - The maximum length of the `VARCHAR` column. Must be between 0 and 65,535.
   * @returns The current instance of `MySQLColumn`.
   * @throws Throws an error if `length` is not within the range of 0 to 65,535.
   *
   * @note The difference between `CHAR` and `VARCHAR`:
   * - `CHAR` is a fixed-length string type. It always stores a fixed number of characters, padding shorter strings with spaces.
   *   For example, `CHAR(10)` will always take 10 bytes of storage, regardless of the actual string length.
   * - `VARCHAR` is variable-length, meaning the actual storage is proportional to the length of the string.
   *   For example, `VARCHAR(10)` will only use as much space as the string needs, plus one or two extra bytes to store the length.
   *
   * @note What happens if an inserted value exceeds the specified length:
   * - In both cases MySQL will truncate the value to the specified maximum length.
   */
  public varChar(length: number = 200): MySQLColumn {
    if (length < 0 || length > 65535) {
      throw new ColumnError('Length must be between 0 and 65,535');
    }
    this.type = `VARCHAR(${length})`;
    return this;
  }

  /**
   * Creates a column with the `TINYTEXT` data type in MySQL.
   * `TINYTEXT` is a variable-length string data type with a maximum length of 255 characters.
   *
   * @returns The current instance of `MySQLColumn` with the `TINYTEXT` type set.
   */
  public tinyText(): MySQLColumn {
    this.type = 'TINYTEXT';
    return this;
  }

  /**
   * Creates a column with the `TEXT` data type in MySQL.
   * `TEXT` is a variable-length string data type with a maximum length of 65,535 characters.
   *
   * @returns The current instance of `MySQLColumn`.
   */
  public text(): MySQLColumn {
    this.type = 'TEXT';
    return this;
  }

  /**
   * Creates a column with the `MEDIUMTEXT` data type in MySQL.
   * `MEDIUMTEXT` is a variable-length string data type with a maximum length of 16,777,215 characters.
   *
   * @returns The current instance of `MySQLColumn`.
   */
  public mediumText(): MySQLColumn {
    this.type = 'MEDIUMTEXT';
    return this;
  }

  /**
   * Creates a column with the `LONGTEXT` data type in MySQL.
   * `LONGTEXT` is a variable-length string data type with a maximum length of 4,294,967,295 characters.
   *
   * @returns The current instance of `MySQLColumn`.
   */
  public longText(): MySQLColumn {
    this.type = 'LONGTEXT';
    return this;
  }

  /**
   * Creates a column with the `BOOLEAN` data type in MySQL.
   * `BOOLEAN` is a synonym for TINYINT(1) and can store TRUE or FALSE values.
   *
   * @returns The current instance of `MySQLColumn`.
   */
  public boolean(): MySQLColumn {
    this.type = 'BOOLEAN';
    return this;
  }

  /**
   * Creates a column with the `DATE` data type in MySQL.
   * `DATE` stores date values in 'YYYY-MM-DD' format.
   * The supported range is from '1000-01-01' to '9999-12-31'.
   *
   * @returns The current instance of `MySQLColumn`.
   */
  public date(): MySQLColumn {
    this.type = 'DATE';
    return this;
  }

  /**
   * Creates a column with the `TIME` data type in MySQL.
   * `TIME` stores time values in `HH:MM:SS` format.
   * The supported range is from `-838:59:59` to `838:59:59`.
   *
   * @returns The current instance of `MySQLColumn`.
   */
  public time(): MySQLColumn {
    this.type = 'TIME';
    return this;
  }

  /**
   * Creates a column with the `DATETIME` data type in MySQL.
   * `DATETIME` stores date and time values in `YYYY-MM-DD HH:MM:SS` format.
   * The supported range is from `1000-01-01 00:00:00` to `9999-12-31 23:59:59`.
   *
   * @returns The current instance of `MySQLColumn`.
   */
  public datetime(): MySQLColumn {
    this.type = 'DATETIME';
    return this;
  }

  /**
   * Creates a column with the `TIMESTAMP` data type in MySQL.
   * `TIMESTAMP` stores timestamp values as the number of seconds since the Unix epoch ('1970-01-01 00:00:00' UTC).
   * Format: `YYYY-MM-DD HH:MM:SS`.
   * The supported range is from `1970-01-01 00:00:01` UTC to `2038-01-09 03:14:07` UTC.
   *
   * @returns The current instance of `MySQLColumn`.
   */
  public timestamp(): MySQLColumn {
    this.type = 'TIMESTAMP';
    return this;
  }

  /**
   * Creates a column with the `YEAR` data type in MySQL.
   * `YEAR` stores year values in four-digit format. Allowed values are from 1901 to 2155, and 0000.
   * MySQL 8.0 does not support the two-digit format for years.
   *
   * @returns The current instance of `MySQLColumn`.
   */
  public year(): MySQLColumn {
    this.type = 'YEAR';
    return this;
  }

  /**
   * Creates a `JSON` column.
   * `JSON` columns store `JSON` data (JavaScript Object Notation).
   *
   * @returns The current instance of `MySQLColumn`.
   */
  public json(): MySQLColumn {
    this.type = 'JSON';
    return this;
  }

  /**
   * Creates an `ENUM` column with specified values.
   * `ENUM` columns store a string value chosen from a list of permitted values.
   *
   * @param values - The values allowed in the `ENUM` column.
   * @returns The current instance of `MySQLColumn`.
   * @throws If no values are provided or if values are not strings.
   */
  public enum(...values: Array<string>): MySQLColumn {
    if (!isArrOfStr(values)) {
      throw new ColumnError(`Invalid enum values: ${String(values)}`);
    }

    this.type = `ENUM(${values.map((i) => `'${i}'`).join(', ')})`;
    return this;
  }
}
