import { isArrOfStr } from '../../helpers';
import { Column, ColumnError } from './Column';

/**
 * Class representing a PostgreSQL column, extending the Column abstract class.
 * @extends Column
 */
export class PostgreSQLColumn extends Column {
  /**
   * Constructs a new PostgreSQLColumn.
   * @param name - The name of the column.
   */
  constructor(name: string) {
    super(name);
  }

  /**
   * Creates a column with the SMALLINT data type in PostgreSQL.
   * `SMALLINT` is used for small integer values and ranges from -32,768 to 32,767 (signed) or 0 to 65,535 (unsigned).
   *
   * @returns The current instance of `PostgreSQLColumn` with the SMALLINT type set.
   */
  public tinyInt(): PostgreSQLColumn {
    this.type = 'SMALLINT';
    return this;
  }

  /**
   * Creates a column with the SMALLINT data type in PostgreSQL.
   * `SMALLINT` is used for small integer values and ranges from -32,768 to 32,767 (signed) or 0 to 65,535 (unsigned).
   *
   * @returns The current instance of `PostgreSQLColumn` with the SMALLINT type set.
   */
  public smallInt(): PostgreSQLColumn {
    this.type = 'SMALLINT';
    return this;
  }

  /**
   * Creates a column with the INTEGER data type in PostgreSQL.
   * `INTEGER` is used for medium-sized integer values and typically ranges from -2,147,483,648 to 2,147,483,647 (signed).
   *
   * @returns The current instance of `PostgreSQLColumn` with the INTEGER type set.
   */
  public mediumInt(): PostgreSQLColumn {
    this.type = 'INTEGER';
    return this;
  }

  /**
   * Creates a column with the INTEGER data type in PostgreSQL.
   * `INTEGER` is used for standard integer values and typically ranges from -2,147,483,648 to 2,147,483,647 (signed).
   *
   * @returns The current instance of `PostgreSQLColumn` with the INTEGER type set.
   */
  public int(): PostgreSQLColumn {
    this.type = 'INTEGER';
    return this;
  }

  /**
   * Creates a column with the BIGINT data type in PostgreSQL.
   * `BIGINT` is used for very large integer values and ranges from -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807 (signed).
   *
   * @returns The current instance of `PostgreSQLColumn` with the BIGINT type set.
   */
  public bigInt(): PostgreSQLColumn {
    this.type = 'BIGINT';
    return this;
  }

  /**
   * Creates a column with the REAL data type in PostgreSQL.
   * `REAL` is used for single-precision floating-point numbers.
   * It can handle up to approximately 6 decimal places.
   * If you store a number with more than 6 decimal places, it will be rounded to fit within that precision.
   *
   */
  public float(): PostgreSQLColumn {
    this.type = 'REAL';
    return this;
  }

  /**
   * Creates a column with the DOUBLE PRECISION data type in PostgreSQL.
   * `DOUBLE PRECISION` is used for double-precision floating-point numbers.
   * It can handle up to approximately 15-16 decimal places.
   * If you store a number with more than 15-16 decimal places, it will be rounded to fit within that precision.
   *
   */
  public double(): PostgreSQLColumn {
    this.type = `DOUBLE PRECISION`;
    return this;
  }

  /**
   * Creates a column with the DECIMAL data type in PostgreSQL.
   * This type is used for exact numeric values where precision is critical.
   * If you store a value that exceeds the precision (`total`) or scale (`places`), PostgreSQL **truncates** the value without rounding.
   *
   * @param total - The total number of digits in the number, including digits before and after the decimal point.
   * @param places - The number of digits after the decimal point.
   * @returns The current instance of `PostgreSQLColumn`.
   * @throws Throws an error if `total` or `places` values are invalid.
   */
  public decimal(total: number, places: number): PostgreSQLColumn {
    if (total < 0 || places < 0 || places > total) {
      throw new ColumnError(
        'Invalid argument: total must be >= 0, places must be >= 0 and <= total.'
      );
    }

    this.type = `DECIMAL(${total}, ${places})`;
    return this;
  }

  /**
   * Creates a column with the `CHAR` data type in PostgreSQL.
   * `CHAR` is a fixed-length string data type. The `length` parameter specifies the exact number of characters stored in the column.
   *
   * @param length - The length of the `CHAR` column. Must be between 0 and 255.
   * @returns The current instance of `PostgreSQLColumn`.
   * @throws Throws an error if `length` is not within the range of 0 to 255.
   *
   * @note The difference between `CHAR` and `VARCHAR`:
   * - `CHAR` is a fixed-length type, meaning it always stores exactly the specified number of characters. If the string is shorter, PostgreSQL pads it with spaces.
   * - `VARCHAR` is variable-length and only stores the actual number of characters in the string.
   *
   * @note What happens if an inserted value exceeds the specified length:
   * - In both cases, PostgreSQL will truncate the value to the specified maximum length.
   */
  public char(length: number): PostgreSQLColumn {
    if (length < 0 || length > 255) {
      throw new ColumnError('Length must be between 0 and 255.');
    }

    this.type = `CHAR(${length})`;
    return this;
  }

  /**
   * Creates a column with the `VARCHAR` data type in PostgreSQL.
   * `VARCHAR` is a variable-length string data type. The `length` parameter specifies the maximum number of characters.
   *
   * @param length - The maximum length of the `VARCHAR` column. Must be between 0 and 65,535.
   * @returns The current instance of `PostgreSQLColumn`.
   * @throws Throws an error if `length` is not within the range of 0 to 65,535.
   *
   * @note The difference between `CHAR` and `VARCHAR`:
   * - `CHAR` is a fixed-length string type. It always stores a fixed number of characters, padding shorter strings with spaces.
   *   For example, `CHAR(10)` will always take 10 bytes of storage, regardless of the actual string length.
   * - `VARCHAR` is variable-length, meaning the actual storage is proportional to the length of the string.
   *   For example, `VARCHAR(10)` will only use as much space as the string needs, plus one or two extra bytes to store the length.
   *
   * @note What happens if an inserted value exceeds the specified length:
   * - In both cases, PostgreSQL will truncate the value to the specified maximum length.
   */
  public varChar(length: number = 200): PostgreSQLColumn {
    if (length < 0 || length > 65535) {
      throw new ColumnError('Length must be >= 0');
    }

    this.type = `VARCHAR(${length})`;
    return this;
  }

  /**
   * Creates a column with the `VARCHAR` data type in PostgreSQL.
   * Mapped to MySQL's TINYTEXT and allows for a maximum length of 255 characters.
   *
   * @returns The current instance of `PostgreSQLColumn`.
   */
  public tinyText(): PostgreSQLColumn {
    this.type = 'VARCHAR(255)';
    return this;
  }

  /**
   * Creates a column with the `VARCHAR` data type in PostgreSQL.
   * Mapped to MySQL's TEXT and allows for a maximum length of 65,535 characters.
   *
   * @returns The current instance of `PostgreSQLColumn`.
   */
  public text(): PostgreSQLColumn {
    this.type = 'VARCHAR(65535)';
    return this;
  }

  /**
   * Creates a column with the `VARCHAR` data type in PostgreSQL.
   * Mapped to MySQL's MEDIUMTEXT and allows for a maximum length of 16,777,215 characters.
   *
   * @returns The current instance of `PostgreSQLColumn`.
   */
  public mediumText(): PostgreSQLColumn {
    this.type = 'VARCHAR(16777215)';
    return this;
  }

  /**
   * Creates a column with the `TEXT` data type in PostgreSQL.
   * Mapped to MySQL's LONGTEXT, allowing for unlimited length.
   *
   * @returns The current instance of `PostgreSQLColumn`.
   */
  public longText(): PostgreSQLColumn {
    this.type = 'TEXT';
    return this;
  }

  /**
   * Creates a column with the BOOLEAN data type in PostgreSQL.
   * BOOLEAN is used to store TRUE or FALSE values.
   *
   * @returns The current instance of `PostgreSQLColumn`.
   */
  public boolean(): PostgreSQLColumn {
    this.type = 'BOOLEAN';
    return this;
  }

  /**
   * Creates a column with the DATE data type in PostgreSQL.
   * DATE stores date values in 'YYYY-MM-DD' format.
   * The supported range is from `4714-01-01` to `5874897-12-31`.
   *
   * @returns The current instance of `PostgreSQLColumn`.
   */
  public date(): PostgreSQLColumn {
    this.type = 'DATE';
    return this;
  }

  /**
   * Creates a column with the TIME data type in PostgreSQL.
   * TIME stores time values in `HH:MM:SS` format.
   * The supported range is from `00:00:00` to `24:00:00`,
   *
   * @returns The current instance of `PostgreSQLColumn`.
   * @note This method uses `TIME WITHOUT TIME ZONE` to ensure that no time zone information is stored.
   */
  public time(): PostgreSQLColumn {
    this.type = 'TIME WITHOUT TIME ZONE';
    return this;
  }

  /**
   * Creates a column with the TIMESTAMP data type in PostgreSQL.
   * TIMESTAMP stores date and time values in `YYYY-MM-DD HH:MM:SS` format.
   * The supported range is from `4714-01-01 00:00:00` to `5874897-12-31 23:59:59`.
   *
   * @returns The current instance of `PostgreSQLColumn`.
   * @note This method uses `TIMESTAMP WITHOUT TIME ZONE` to ensure that no time zone information is stored.
   */
  public datetime(): PostgreSQLColumn {
    this.type = 'TIMESTAMP WITHOUT TIME ZONE';
    return this;
  }

  /**
   * Creates a column with the TIMESTAMP data type in PostgreSQL.
   * TIMESTAMP stores timestamp values in `YYYY-MM-DD HH:MM:SS` format.
   * The supported range is from `4713 BC` to `5874897 AD`.
   *
   * @returns The current instance of `PostgreSQLColumn`.
   * @note This method uses `TIMESTAMP WITHOUT TIME ZONE` to ensure that no time zone information is stored.
   */
  public timestamp(): PostgreSQLColumn {
    this.type = 'TIMESTAMP WITHOUT TIME ZONE';
    return this;
  }

  /**
   * Creates a column with the INTEGER data type in PostgreSQL.
   * Used to represent year values. While PostgreSQL does not have a specific YEAR type,
   * the INTEGER type can effectively store year values.
   *
   * @returns The current instance of `PostgreSQLColumn`.
   *
   * @note It is recommended to validate the range of year values used,
   * as PostgreSQL does not impose restrictions on the INTEGER range.
   */
  public year(): PostgreSQLColumn {
    this.type = 'INTEGER'; // Using INTEGER to represent a year
    return this;
  }

  /**
   * Creates a JSON column in PostgreSQL.
   * JSON columns store JSON (JavaScript Object Notation) data.
   *
   * @returns The current instance of `PostgreSQLColumn`.
   */
  public json(): PostgreSQLColumn {
    this.type = 'JSON';
    return this;
  }

  /**
   * Creates an ENUM column with specified values in PostgreSQL.
   * ENUM columns store a string value chosen from a list of permitted values.
   * PostgreSQL does not have a dedicated ENUM type but can be represented using
   * a VARCHAR column with a check constraint.
   *
   * @param  values - The values allowed in the ENUM column.
   * @returns The current instance of `PostgreSQLColumn`.
   * @throws If no values are provided or if values are not strings.
   */
  public enum(...values: Array<string>): PostgreSQLColumn {
    if (!isArrOfStr(values)) {
      throw new ColumnError(`Invalid enum values: ${String(values)}`);
    }

    this.type = 'VARCHAR'; // Using VARCHAR to represent ENUM
    this.check(`${this.name} IN (${values.map((i) => `'${i}'`).join(', ')})`); // Add check constraint
    return this;
  }
}
