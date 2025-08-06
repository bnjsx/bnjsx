import { QueryError } from '../../errors';
import { Row } from '../modules/Driver';
import { Col, Con, Condition } from './Condition';
import { Query } from './Query';
import {
  isBool,
  isChildOf,
  isFullArr,
  isFullStr,
  isFunc,
  isNull,
  isNum,
  isObj,
  isStr,
  isUndefined,
} from '../../helpers';

/**
 * The `Update` class provides methods to construct and execute `UPDATE` SQL queries on a specified table.
 * It supports chaining methods to build and execute the query.
 */
export class Update extends Query<void> {
  private state = {
    table: undefined,
    columns: new Array(),
    condition: undefined,
  };

  /**
   * Resets the current `Update` instance by clearing all query properties.
   * This method allows reusing the same instance to start a fresh `UPDATE` statement.
   *
   * @returns The `Update` query instance (`this`) to allow method chaining.
   */
  public reset(): this {
    this.state.table = undefined;
    this.state.columns = new Array();
    this.state.condition = undefined;

    // inherted from Query
    this.values = new Array();
    this.query = undefined;

    return this;
  }

  /**
   * Builds and returns the final SQL `UPDATE` statement.
   *
   * @throws `QueryError` if the table name is invalid or if no `WHERE` condition is specified.
   * @returns The constructed SQL `UPDATE` statement as a string.
   */
  public build(): string {
    if (!isFullStr(this.state.table)) {
      throw new QueryError(`Invalid UPDATE table: ${String(this.state.table)}`);
    }

    if (!isFullArr(this.state.columns)) {
      throw new QueryError(`Invalid UPDATE columns`);
    }

    if (!isFullArr(this.values)) {
      throw new QueryError(`Invalid UPDATE values`);
    }

    if (!isChildOf(this.state.condition, Condition)) {
      throw new QueryError(`UPDATE condition is required`);
    }

    const columns = this.state.columns
      .map((c, i) => (this.values[i] === null ? `${c} = NULL` : `${c} = ?`))
      .join(', ');

    this.values.push(...this.state.condition.values);
    this.values = this.values.filter((v) => v !== null);

    return `UPDATE ${
      this.state.table
    } SET ${columns} WHERE ${this.state.condition.build()};`;
  }

  /**
   * Sets the values for the `UPDATE` statement.
   *
   * @param row An object with keys as column names and their corresponding new values.
   * @returns The `Update` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the provided row is not an object, or if any column name or value is invalid.
   *
   * @notes
   * - The keys in the `row` object represent column names (e.g. `first_name`, `last_name`).
   * - The values in the `row` object must be one of the supported types:
   *   - `string`
   *   - `number`
   *   - `boolean`
   *   - `null`
   *
   * Supported conversions:
   * - **Boolean**: use `1` for `true`, `0` for `false`
   * - **Null**: use JavaScript `null` (converted to SQL `NULL`)
   * - **JSON objects**: use `JSON.stringify(object)` to store as string
   * - **Dates**: use formatted strings like `'YYYY-MM-DD hh:mm:ss'`
   */
  public set(row: Row): this {
    if (!isObj(row)) {
      throw new QueryError(`Invalid UPDATE row: ${String(row)}`);
    }

    const columns = Object.keys(row);
    const values = Object.values(row);

    values.forEach((v) => {
      if (!(isStr(v) || isNum(v) || isNull(v) || isBool(v))) {
        throw new QueryError(`Invalid UPDATE value: ${String(v)}`);
      }
    });

    this.state.columns = columns;
    this.values = values;

    return this;
  }

  /**
   * Specifies the table for the `UPDATE` operation.
   *
   * @param name The name of the table.
   * @returns The `Update` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the table name is invalid.
   */
  public table(name: string): this {
    if (!isFullStr(name)) {
      throw new QueryError(`Invalid UPDATE table: ${String(name)}`);
    }

    this.state.table = name;
    return this;
  }

  /**
   * Adds a `WHERE` condition for the `UPDATE` operation.
   *
   * @param condition A function to define the condition, with access to `col` a column selector, and `con` the condition builder.
   * @returns The `Update` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if `condition` is not a function.
   */
  public where(condition: (col: Col, con: Con) => void): this;
  public where(condition: Condition): this;
  public where(condition: ((col: Col, con: Con) => void) | Condition): this {
    if (condition instanceof Condition) {
      this.state.condition = condition;
      return this;
    }

    if (!isFunc(condition)) {
      throw new QueryError(`Invalid UPDATE condition: ${String(condition)}`);
    }

    if (isUndefined(this.state.condition)) {
      this.state.condition = new Condition(this.connection.driver);
    }

    condition(
      this.state.condition.col.bind(this.state.condition),
      this.state.condition
    );

    return this;
  }

  /**
   * Adds an `AND` logical operator to the `WHERE` condition.
   *
   * @returns The `Update` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if your condition starts with `AND`.
   */
  public and(): this {
    if (isUndefined(this.state.condition)) {
      throw new QueryError('Invalid UPDATE condition');
    }

    this.state.condition.and();
    return this;
  }

  /**
   * Adds an `OR` logical operator to the `WHERE` condition.
   *
   * @returns The `Update` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if your condition starts with `OR`.
   */
  public or(): this {
    if (isUndefined(this.state.condition)) {
      throw new QueryError('Invalid UPDATE condition');
    }

    this.state.condition.or();
    return this;
  }

  /**
   * Adds parentheses around conditions, allowing complex groupings.
   * Calling `paren()` opens a parenthesis, and the next call closes it.
   *
   * @returns The `Update` query instance (`this`) to allow method chaining.
   */
  public paren(): this {
    if (isUndefined(this.state.condition)) {
      this.state.condition = new Condition(this.connection.driver);
    }

    this.state.condition.paren();
    return this;
  }

  /**
   * Opens a parenthesis for complex grouping of conditions in the `WHERE` clause.
   * This is typically followed by a condition and can be closed with `close()` or `paren()`.
   *
   * @returns The `Update` query instance (`this`) to allow method chaining.
   */
  public open(): this {
    if (isUndefined(this.state.condition)) {
      this.state.condition = new Condition(this.connection.driver);
    }

    this.state.condition.open();
    return this;
  }

  /**
   * Closes an opened parenthesis in the `WHERE` condition.
   * This works with `open()` or `paren()` to create complex groupings of conditions.
   *
   * @returns The `Update` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if no open parenthesis exists to close.
   */
  public close(): this {
    if (isUndefined(this.state.condition)) {
      throw new QueryError('Invalid UPDATE condition');
    }

    this.state.condition.close();
    return this;
  }
}
