import { Row, Rows } from '../modules/Driver';
import { QueryError } from '../../errors';
import { Query } from './Query';

import {
  isArr,
  isArrOfArr,
  isArrOfObj,
  isArrOfStr,
  isEmptyArr,
  isFullStr,
  isNull,
  isNum,
  isObj,
  isStr,
} from '../../helpers';

/**
 * The `Insert` class provides methods to build SQL INSERT queries for a specified table.
 * This class allows chaining of methods to incrementally construct a valid `INSERT` statement.
 *
 * @template T Expected result type of the query (e.g., `number`, `string`, `void`).
 * @example
 * // Create a new Insert instance
 * const insert = new Insert(connection);
 *
 * // Insert one row (Single Insert)
 * await insert.into('users').row({ id: 1, name: 'Name 1' }).exec();
 *
 * // Log the constructed query string
 * insert.log.query(); // Outputs: INSERT INTO users (id, name) VALUES (?, ?)
 *
 * // Log the values to be inserted
 * insert.log.values(); // Outputs: [[1, 'Name 1']]
 *
 * // Retrieve the query string
 * const query = insert.get.query();
 *
 * // Retrieve the values array
 * const values = insert.get.values();
 *
 * // Reset the instance before executing a new query
 * insert.reset();
 *
 * // Insert multiple rows (Bulk Insert)
 * await insert.into('users')
 *             .rows([{ id: 2, name: 'Name 2' }, { id: 3, name: 'Name 3' }])
 *             .exec();
 *
 *
 * // In single insert, the primary key value is returned
 * console.log(
 *   await new Insert(connection).into('users').row({ id: 5, name: 'Name 5' }).exec()
 * ); // Outputs: 5 or '5' depending on your driver configuration
 *
 * // In Bulk Insert, the return value is `undefined`
 * console.log(
 *   await new Insert(connection)
 *     .into('users')
 *     .rows([{ id: 6, name: 'Name 6' }, { id: 7, name: 'Name 7' }])
 *     .exec()
 * ); // Outputs: undefined
 *
 *
 * // Specify the expected result type with generics
 * await new Insert<number>(connection).into('users').row({ id: 8, name: 'Name 8' }).exec();
 * await new Insert<string>(connection).into('users').row({ id: 9, name: 'Name 9' }).exec();
 *
 * @notes
 * - For `MySQL` & `SQLite` Driver:
 *   - Single Insert: Resolves to the primary key value (`string | number`).
 *   - Bulk Insert: Resolves to `undefined`.
 *
 * - For `PostgreSQL` Driver:
 *  - Single & Bulk Insert: Resolves to `undefined` if no return columns are specified.
 *  - Single Insert: Resolves to a single row (`Row`, an object) if return columns are specified.
 *  - Bulk Insert: Resolves to multiple rows (`Rows`, an array of objects) if return columns are specified.
 */
export class Insert<
  T extends number | string | void | Row | Rows =
    | number
    | string
    | void
    | Row
    | Rows
> extends Query<T> {
  /**
   * The name of the table to insert into.
   * This value must be a valid snake_case string representing an existing table.
   */
  private table: string;

  /**
   * An array of column names to be filled with values.
   * Each name must be a valid snake_case string representing a column in the table.
   */
  private columns: string[];

  /**
   * An array of column names to return for PostgreSQL.
   * Each name must be a valid snake_case string representing a column in the table.
   */
  private returnings: string[];

  /**
   * Resets the current `Insert` instance by clearing all properties.
   * This method allows reusing the same instance to create a new INSERT statement from scratch.
   *
   * @returns The `Insert` query instance (`this`) to allow method chaining.
   */
  public reset(): this {
    this.table = undefined;
    this.columns = undefined;

    // inherted from Query
    this.values = new Array();
    this.query = undefined;

    return this;
  }

  /**
   * Builds the final SQL INSERT query based on the provided `table`, `columns`, and `values`.
   *
   * @returns The constructed SQL INSERT statement as a string.
   * @throws `QueryError` if `table`, `columns`, or `values` are invalid.
   */
  public build(): string {
    if (!isFullStr(this.table)) {
      throw new QueryError(`Invalid INSERT table: ${String(this.table)}`);
    }

    if (!isArrOfStr(this.columns)) {
      throw new QueryError(`Invalid INSERT columns: ${String(this.table)}`);
    }

    if (!isArrOfArr(this.values)) {
      throw new QueryError(`Invalid INSERT values: ${String(this.table)}`);
    }

    const columns = this.columns.join(', ');
    const values = this.values
      .map((r) => `(${r.map((v) => (v === null ? 'NULL' : '?')).join(', ')})`)
      .join(', ');

    const returnings = this.returnings
      ? ` RETURNING ${this.returnings.join(', ')}`
      : '';

    this.values = this.values.map((row) => row.filter((v) => v !== null));

    return `INSERT INTO ${this.table} (${columns}) VALUES ${values}${returnings};`;
  }

  /**
   * Sets the target table for the INSERT query.
   *
   * @param name The name of the table to insert into.
   * @returns The `Insert` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the table name is invalid.
   */
  public into(table: string): this {
    if (!isFullStr(table)) {
      throw new QueryError(`Invalid INSERT table: ${String(table)}`);
    }

    this.table = table;
    return this;
  }

  /**
   * Defines the columns to return after an insert operation, specific to PostgreSQL driver behavior.
   *
   * @param columns The column names to return after the insert operation, applicable only for PostgreSQL driver.
   * @returns The `Insert` query instance (`this`) to allow method chaining.
   */
  public returning(...columns: Array<string>): this {
    if (!isArrOfStr(columns)) {
      throw new QueryError(`Invalid RETURNING columns: ${String(columns)}`);
    }

    this.returnings = columns;
    return this;
  }

  /**
   * Adds a single row of data to the INSERT statement.
   *
   * @param row An object representing a single row of data.
   * @returns The `Insert` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the row is invalid or columns do not match.
   *
   * @notes
   * - The keys in the `row` object represent column names (e.g. `first_name` `last_name`).
   * - The values in the `row` object represent the insert values and must be either `string` or `number` or `null`.
   * - All values can be represented using `strings` and `numbers` and `null`:
   *   - Boolean: use `1` for true and `0` for false
   *   - Null: use `null`
   *   - JSON: use `JSON.stringify(object)` for objects
   *   - Dates: use date strings formatted as `'YYYY-MM-DD hh:mm:ss'`
   */
  public row(row: Row): this {
    if (!isObj(row)) {
      throw new QueryError(`Invalid INSERT row: ${String(row)}`);
    }

    if (isArr(this.columns)) {
      const columns = Object.keys(row);

      // Test length
      if (this.columns.length !== columns.length) {
        throw new QueryError(`Invalid INSERT row: ${row}`);
      }

      // Test names
      if (!this.columns.every((column) => columns.includes(column))) {
        throw new QueryError(`Invalid INSERT row: ${row}`);
      }
    } else {
      const columns = Object.keys(row);

      if (isEmptyArr(columns)) {
        throw new QueryError(`Empty INSERT row: ${row}`);
      }

      this.columns = columns;
    }

    const values = Object.values(row);

    values.forEach((value) => {
      if (!(isNull(value) || isStr(value) || isNum(value))) {
        throw new QueryError(`Invalid INSERT value: ${String(value)}`);
      }
    });

    this.values.push(values);
    return this;
  }

  /**
   * Adds multiple rows of data to the INSERT statement.
   *
   * @param rows An array of objects where each object represents a single row.
   * @returns The `Insert` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the rows array is empty or contains invalid rows.
   *
   * @notes
   * - The keys in the `row` object represent column names (e.g. `first_name` `last_name`).
   * - The values in the `row` object represent the insert values and must be either `string` or `number` or `null`.
   * - All values can be represented using `strings` and `numbers` and `null`:
   *   - Boolean: use `1` for true and `0` for false
   *   - Null: use `null`
   *   - JSON: use `JSON.stringify(object)` for objects
   *   - Dates: use date strings formatted as `'YYYY-MM-DD hh:mm:ss'`
   */
  public rows(rows: Rows): this {
    if (!isArrOfObj(rows)) {
      throw new QueryError(`Invalid rows: ${String(rows)}`);
    }

    if (rows.length < 2) {
      throw new QueryError(`Bulk insert requires at least 2 rows.`);
    }

    rows.forEach((row) => this.row(row));
    return this;
  }
}
