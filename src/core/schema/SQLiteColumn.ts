import { isArrOfStr } from '../../helpers';
import { Column, ColumnError } from './Column';

/**
 * Class representing an SQLite column, extending the Column abstract class.
 * @extends Column
 */
export class SQLiteColumn extends Column {
  /**
   * Constructs a new SQLiteColumn.
   * @param name - The name of the column.
   */
  constructor(name: string) {
    super(name);
  }

  /**
   * Creates a column with the TINYINT data type in SQLite.
   * In SQLite, `TINYINT` is represented as an `INTEGER`, which can store any integer value.
   *
   * @returns The current instance of `SQLiteColumn` with the TINYINT type set.
   */
  public tinyInt(): SQLiteColumn {
    this.type = 'INTEGER';
    return this;
  }

  /**
   * Creates a column with the SMALLINT data type in SQLite.
   * In SQLite, `SMALLINT` is represented as an `INTEGER`, which can store any integer value.
   *
   * @returns The current instance of `SQLiteColumn` with the SMALLINT type set.
   */
  public smallInt(): SQLiteColumn {
    this.type = 'INTEGER';
    return this;
  }

  /**
   * Creates a column with the MEDIUMINT data type in SQLite.
   * In SQLite, `MEDIUMINT` is represented as an `INTEGER`, which can store any integer value.
   *
   * @returns The current instance of `SQLiteColumn` with the MEDIUMINT type set.
   */
  public mediumInt(): SQLiteColumn {
    this.type = 'INTEGER';
    return this;
  }

  /**
   * Creates a column with the INT data type in SQLite.
   * In SQLite, `INT` is represented as an `INTEGER`, which can store any integer value.
   *
   * @returns The current instance of `SQLiteColumn` with the INT type set.
   */
  public int(): SQLiteColumn {
    this.type = 'INTEGER';
    return this;
  }

  /**
   * Creates a column with the BIGINT data type in SQLite.
   * In SQLite, `BIGINT` is represented as an `INTEGER`, which can store any integer value.
   *
   * @returns The current instance of `SQLiteColumn` with the BIGINT type set.
   */
  public bigInt(): SQLiteColumn {
    this.type = 'INTEGER';
    return this;
  }

  /**
   * Creates a column with the FLOAT data type in SQLite.
   * `FLOAT` in SQLite is represented as `REAL`, which is stored as a double-precision floating-point number.
   * - It can handle approximately 15-16 decimal places, as it uses `DOUBLE` precision.
   * - If you store a number with more decimal places than can be represented by double precision, it will be rounded
   * to fit within the precision (about 15-16 digits).
   *
   * @returns The current instance of `SQLiteColumn` with the FLOAT type set.
   */
  public float(): SQLiteColumn {
    this.type = 'REAL';
    return this;
  }

  /**
   * Creates a column with the DOUBLE data type in SQLite.
   * `DOUBLE` in SQLite is also represented as `REAL`, which stores double-precision floating-point numbers.
   * - It can handle up to approximately 15-16 decimal places.
   * - If you store a number with more than 15-16 decimal places, it will be rounded to fit within that precision.
   *
   * @returns The current instance of `SQLiteColumn` with the DOUBLE type set.
   */
  public double(): SQLiteColumn {
    this.type = `REAL`;
    return this;
  }

  /**
   * Creates a column with the DECIMAL data type in SQLite.
   * This type is used for exact numeric values where precision is critical.
   * In SQLite, `DECIMAL` is represented as `NUMERIC`, which can store exact values.
   *
   * @param total - The total number of digits in the number, including digits before and after the decimal point.
   * @param places - The number of digits after the decimal point.
   * @returns The current instance of `SQLiteColumn`.
   * @throws Throws an error if `total` or `places` values are invalid.
   */
  public decimal(total: number, places: number): SQLiteColumn {
    if (total < 0 || places < 0 || places > total) {
      throw new ColumnError(
        'Invalid argument: total must be >= 0, places must be >= 0 and <= total.'
      );
    }

    this.type = `NUMERIC`;
    return this;
  }

  /**
   * Creates a column with the `CHAR` data type in SQLite.
   * In SQLite, both `CHAR` and `VARCHAR` are represented as `TEXT`, which stores variable-length strings.
   * The `length` parameter is provided for consistency, but SQLite does not enforce a fixed length for `TEXT` columns.
   *
   * @param length - The length of the `CHAR` column. Must be between 0 and 255.
   * @returns The current instance of `SQLiteColumn`.
   * @throws Throws an error if `length` is not within the range of 0 to 255.
   *
   * @note In SQLite, `TEXT` columns store variable-length strings and do not pad with spaces like in other databases.
   */
  public char(length: number): SQLiteColumn {
    if (length < 0 || length > 255) {
      throw new ColumnError('Length must be between 0 and 255.');
    }

    this.type = `TEXT`;
    return this;
  }

  /**
   * Creates a column with the `VARCHAR` data type in SQLite.
   * In SQLite, both `CHAR` and `VARCHAR` are represented as `TEXT`, which stores variable-length strings.
   * The `length` parameter is optional, but SQLite does not enforce a maximum length for `TEXT` columns.
   *
   * @param length - The maximum length of the `VARCHAR` column. Must be between 0 and 65,535.
   * @returns The current instance of `SQLiteColumn`.
   * @throws Throws an error if `length` is not within the range of 0 to 65,535.
   *
   * @note In SQLite, the length is only a suggestion and does not affect the actual storage behavior of `TEXT` columns.
   */
  public varChar(length: number = 200): SQLiteColumn {
    if (length < 0 || length > 65535) {
      throw new ColumnError('Length must be between 0 and 65,535.');
    }

    this.type = `TEXT`;
    return this;
  }

  /**
   * Creates a column with the `TINYTEXT` data type in SQLite.
   * In SQLite, there is no specific `TINYTEXT` type, so this is treated as `TEXT`.
   *
   * @returns The current instance of `SQLiteColumn` with the `TEXT` type set.
   */
  public tinyText(): SQLiteColumn {
    this.type = 'TEXT';
    return this;
  }

  /**
   * Creates a column with the `TEXT` data type in SQLite.
   * `TEXT` is a variable-length string data type that can store large amounts of text.
   *
   * @returns The current instance of `SQLiteColumn`.
   */
  public text(): SQLiteColumn {
    this.type = 'TEXT';
    return this;
  }

  /**
   * Creates a column with the `MEDIUMTEXT` data type in SQLite.
   * In SQLite, there is no specific `MEDIUMTEXT` type, so this is treated as `TEXT`.
   *
   * @returns The current instance of `SQLiteColumn` with the `TEXT` type set.
   */
  public mediumText(): SQLiteColumn {
    this.type = 'TEXT';
    return this;
  }

  /**
   * Creates a column with the `LONGTEXT` data type in SQLite.
   * In SQLite, there is no specific `LONGTEXT` type, so this is treated as `TEXT`.
   *
   * @returns The current instance of `SQLiteColumn` with the `TEXT` type set.
   */
  public longText(): SQLiteColumn {
    this.type = 'TEXT';
    return this;
  }

  /**
   * Creates a column with the `BOOLEAN` data type in SQLite.
   * Since SQLite does not have a separate BOOLEAN type, this is implemented using `INTEGER`,
   * where 0 represents `false` and 1 represents `true`.
   *
   * @returns The current instance of `SQLiteColumn`.
   */
  public boolean(): SQLiteColumn {
    this.type = 'INTEGER';
    return this;
  }

  /**
   * Creates a column with the `DATE` data type in SQLite.
   * SQLite stores date values as `TEXT` in 'YYYY-MM-DD' format.
   * There is no dedicated `DATE` type in SQLite; it relies on date/time functions.
   *
   * @returns The current instance of `SQLiteColumn`.
   */
  public date(): SQLiteColumn {
    this.type = 'TEXT';
    return this;
  }

  /**
   * Creates a column with the `TIME` data type in SQLite.
   * SQLite stores time values as `TEXT` in 'HH:MM:SS' format.
   * There is no dedicated `TIME` type in SQLite; it relies on date/time functions.
   *
   * @returns The current instance of `SQLiteColumn`.
   */
  public time(): SQLiteColumn {
    this.type = 'TEXT';
    return this;
  }

  /**
   * Creates a column with the `DATETIME` data type in SQLite.
   * SQLite stores datetime values as `TEXT` in 'YYYY-MM-DD HH:MM:SS' format.
   * There is no dedicated `DATETIME` type in SQLite; it relies on date/time functions.
   *
   * @returns The current instance of `SQLiteColumn`.
   */
  public datetime(): SQLiteColumn {
    this.type = 'TEXT';
    return this;
  }

  /**
   * Creates a column with the `TIMESTAMP` data type in SQLite.
   * SQLite stores timestamp values as `TEXT` in 'YYYY-MM-DD HH:MM:SS' format.
   * There is no dedicated `TIMESTAMP` type in SQLite; it relies on date/time functions.
   *
   * @returns The current instance of `SQLiteColumn`.
   */
  public timestamp(): SQLiteColumn {
    this.type = 'TEXT';
    return this;
  }

  /**
   * Creates a column with the `YEAR` data type in SQLite.
   * Since SQLite does not have a specific `YEAR` type, this is implemented using `INTEGER`,
   * where the year is stored as a four-digit number (e.g., 2024).
   *
   * @returns The current instance of `SQLiteColumn`.
   */
  public year(): SQLiteColumn {
    this.type = 'INTEGER';
    return this;
  }

  /**
   * Creates a column with the `JSON` data type in SQLite.
   * Since SQLite does not have a native `JSON` type, JSON data is stored as `TEXT`.
   *
   * @returns The current instance of `SQLiteColumn`.
   */
  public json(): SQLiteColumn {
    this.type = 'TEXT';
    return this;
  }

  /**
   * Creates an ENUM-like column in SQLite by defining a check constraint.
   * SQLite does not support the `ENUM` type, so this is implemented as `TEXT` with a check constraint
   * that ensures the value is one of the allowed values.
   *
   * @param values - The values allowed in the ENUM column.
   * @returns The current instance of `SQLiteColumn`.
   * @throws If no values are provided or if values are not strings.
   */
  public enum(...values: Array<string>): SQLiteColumn {
    if (!isArrOfStr(values)) {
      throw new ColumnError(`Invalid enum values: ${String(values)}`);
    }

    this.type = 'TEXT';
    this.check(`${this.name} IN (${values.map((i) => `'${i}'`).join(', ')})`); // Add check constraint
    return this;
  }
}
