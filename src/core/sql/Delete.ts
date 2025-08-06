import { QueryError } from '../../errors';
import { isChildOf, isFullStr, isFunc, isUndefined } from '../../helpers';
import { Col, Con, Condition } from './Condition';
import { Query } from './Query';

/**
 * The `Delete` class provides methods to construct and execute `DELETE` SQL queries on a specified table.
 * It supports chaining methods to build and execute the query.
 *
 * @example
 * // Create a new Delete instance
 * const del = new Delete(connection);
 *
 * // Delete rows that match the condition
 * await del.from('users').where((col) => col('age').lessThan(18)).exec();
 *
 * // Log the constructed query string
 * del.log.query(); // Outputs: DELETE FROM users WHERE age < ?
 *
 * // Get the generated SQL without executing
 * const query = del.get.query();
 * const values = del.get.values();
 *
 * // Reset the instance to prepare for a new delete operation
 * del.reset();
 *
 * // Example with multiple conditions
 * new Delete(connection)
 *   .from('users')                                    // DELETE FROM users
 *   .where((col) => col('status').equal('inactive'))  // WHERE status = 'inactive'
 *   .and()                                            // AND
 *   .where((col) => col('department').equal('Sales')) // department = 'Sales';
 *   .build(); // Returns query string
 *
 * // Example with parentheses
 * new Delete(connection)
 *   .from('users')                                         // DELETE FROM users
 *   .where((col) => col('name').like('J%'))                // WHERE name LIKE 'J%'
 *    .and()                                                // AND
 *   .paren()                                               // (
 *     .where((col) => col('city').equal('San Francisco'))  // city = 'San Francisco'
 *     .or()                                                // OR
 *     .where((col) => col('state').equal('CA'))            // state = 'CA'
 *   .paren()                                               // );
 *   .build(); // Returns query string
 *
 * @note Use `from` to specify the table.
 * @note Use `where` to target specific rows for deletion.
 * @note `exec` executes the delete query and `reset` clears the instance for reuse.
 */
export class Delete extends Query<void> {
  /**
   * The name of the table to delete rows from.
   * This value must be a valid snake_case string representing an existing table.
   */
  private table: string;

  /**
   * The condition specifying which rows to delete.
   * This condition must be provided to prevent accidental deletions of all rows.
   */
  private condition: Condition;

  /**
   * Resets the current `Delete` instance by clearing all query properties.
   * This method allows reusing the same instance to start a fresh `DELETE` statement.
   *
   * @returns The `Delete` query instance (`this`) to allow method chaining.
   */
  public reset(): this {
    this.table = undefined;
    this.condition = undefined;

    // inherited from Query
    this.values = new Array();
    this.query = undefined;

    return this;
  }

  /**
   * Builds and returns the final SQL `DELETE` statement.
   *
   * @throws `QueryError` if the table name is invalid or if no `WHERE` condition is provided.
   * @returns The constructed SQL `DELETE` statement as a string.
   */
  public build(): string {
    if (!isFullStr(this.table)) {
      throw new QueryError(`Invalid DELETE table: ${String(this.table)}`);
    }

    if (!isChildOf(this.condition, Condition)) {
      throw new QueryError(`DELETE condition is required`);
    }

    this.values = this.condition.values;
    return `DELETE FROM ${this.table} WHERE ${this.condition.build()};`;
  }

  /**
   * Specifies the table from which rows will be deleted.
   *
   * @param table The name of the table.
   * @returns The `Delete` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the table name is invalid.
   */
  public from(table: string): this {
    if (!isFullStr(table)) {
      throw new QueryError(`Invalid DELETE table: ${String(table)}`);
    }

    this.table = table;
    return this;
  }

  /**
   * Adds a `WHERE` clause to the query.
   *
   * @param condition A function to define the condition, with access to `col` a column selector, and `con` the condition builder.
   * @returns The `Delete` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if `condition` is not a function.
   */
  public where(condition: (col: Col, con: Con) => void): this;
  public where(condition: Condition): this;
  public where(condition: ((col: Col, con: Con) => void) | Condition): this {
    if (condition instanceof Condition) {
      this.condition = condition;
      return this;
    }

    if (!isFunc(condition)) {
      throw new QueryError(`Invalid DELETE condition: ${String(condition)}`);
    }

    if (isUndefined(this.condition)) {
      this.condition = new Condition(this.connection.driver);
    }

    condition(this.condition.col.bind(this.condition), this.condition);
    return this;
  }

  /**
   * Adds an `AND` logical operator to the `WHERE` condition.
   *
   * @returns The `Delete` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if you condition starts with `AND`.
   */
  public and(): this {
    if (isUndefined(this.condition)) {
      throw new QueryError('Invalid DELETE condition');
    }

    this.condition.and();
    return this;
  }

  /**
   * Adds an `OR` logical operator to the `WHERE` condition.
   *
   * @returns The `Delete` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if you condition starts with `OR`.
   */
  public or(): this {
    if (isUndefined(this.condition)) {
      throw new QueryError('Invalid DELETE condition');
    }

    this.condition.or();
    return this;
  }

  /**
   * Adds parentheses around conditions, allowing complex groupings.
   * Calling `paren()` opens a parenthesis, and the next call closes it.
   *
   * @returns The `Delete` query instance (`this`) to allow method chaining.
   */
  public paren(): this {
    if (isUndefined(this.condition)) {
      this.condition = new Condition(this.connection.driver);
    }

    this.condition.paren();
    return this;
  }

  /**
   * Opens a parenthesis for complex grouping of conditions in the `WHERE` clause.
   * This is typically followed by a condition and can be closed with `close()` or `paren()`.
   *
   * @returns The `Delete` query instance (`this`) to allow method chaining.
   */
  public open(): this {
    if (isUndefined(this.condition)) {
      this.condition = new Condition(this.connection.driver);
    }

    this.condition.open();
    return this;
  }

  /**
   * Closes an opened parenthesis in the `WHERE` condition.
   * This works with `open()` or `paren()` to create complex groupings of conditions.
   *
   * @returns The `Delete` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if no open parenthesis exists to close.
   */
  public close(): this {
    if (isUndefined(this.condition)) {
      throw new QueryError('Invalid DELETE condition');
    }

    this.condition.close();
    return this;
  }
}
