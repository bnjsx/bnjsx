import { QueryError } from '../../errors';
import {
  isBool,
  isDefined,
  isFullStr,
  isFunc,
  isInt,
  isMySQL,
  isUndefined,
} from '../../helpers';
import { Row, Rows } from '../modules/Driver';
import { Col, Con, Condition } from './Condition';
import { Query } from './Query';

/**
 * Constants representing the sorting order for queries.
 *
 * These symbols are used to define the sort order in queries, typically in conjunction with
 * `ORDER BY` clauses, where `ASC` represents ascending order and `DESC` represents descending order.
 */
export const DESC = Symbol('DESC');

/**
 * Constants representing the sorting order for queries.
 *
 * These symbols are used to define the sort order in queries, typically in conjunction with
 * `ORDER BY` clauses, where `ASC` represents ascending order and `DESC` represents descending order.
 */
export const ASC = Symbol('ASC');

/**
 * Represents pagination results.
 *
 *  `result` The items for the current page.
 *  `page` An object containing pagination details:
 *   - `prev`: The previous page number, or `undefined` if the current page is the first page.
 *   - `next`: The next page number, or `undefined` if the current page is the last page.
 *   - `current`: The current page number.
 *   - `items`: The number of items per page.
 *  `total` An object containing total result information:
 *   - `items`: The total number of items across all pages.
 *   - `pages`: The total number of pages available for pagination.
 *
 * @example
 * // Example of a paginated query result:
 * const pagination: Pagination<User> = {
 *   result: usersOnPage, // e.g., the list of users for the current page
 *   page: {
 *     prev: 2, // The previous page number (or undefined if no previous page)
 *     next: 4, // The next page number (or undefined if no next page)
 *     current: 3, // Current page number
 *     items: 10, // Items per page
 *   },
 *   total: {
 *     items: 50, // Total items in the entire dataset
 *     pages: 5, // Total number of pages
 *   },
 * };
 */
export interface Pagination<R> {
  result: Array<R>;
  page: {
    prev: number | void;
    next: number; // next page number
    current: number; // current page number
    items: number; // items per page
  };
  total: { items: number; pages: number };
}

/**
 * Represents the internal state of a SELECT query, holding the settings and clauses used to build the SQL query.
 *
 * This type includes all the components necessary for constructing a SELECT query, such as the table name,
 * columns to select, sorting, grouping, filtering conditions, and more.
 */
type State = {
  /**
   * The table to query.
   */
  table: string | undefined;

  /**
   * The columns to select. Can be an array of column names or `*` for all columns.
   */
  columns: Array<string> | '*';

  /**
   * Sorting instructions for the query, each entry contains a `column` name and a `type` (e.g., 'ASC' or 'DESC').
   */
  order: Array<{ column: string; type?: string }>;

  /**
   * Grouping columns for aggregate functions (e.g., `column1`).
   */
  group: Array<string>;

  /**
   * Whether to apply the `DISTINCT` keyword to the query (default is `false`).
   */
  distinct: boolean;

  /**
   * The maximum number of results to return (if set).
   */
  limit: number | undefined;

  /**
   * Defines `JOIN` clauses. Each entry contains a `table`, `type` (e.g., `INNER`, `LEFT`), and a `condition`.
   */
  joins: Array<{
    table: string;
    type: string;
    condition: Condition;
  }>;

  /**
   * The `WHERE` clause condition for filtering results.
   */
  where: Condition | undefined;

  /**
   * The `HAVING` clause condition for filtering results after grouping.
   */
  having: Condition | undefined;

  /**
   * Defines `UNION` or `UNION ALL` clauses to combine multiple queries. Each entry has a `query` and an `all` flag.
   */
  unions: Array<{ query: string; all: boolean }>;

  /**
   * The offset for paginating results (skipping a number of rows).
   */
  offset: number | undefined;
};

/**
 * The `Select` class provides methods to construct and execute `SELECT` SQL queries on a specified table.
 * It supports chaining methods to build and execute the query.
 *
 * @example
 * // Create a new Select instance
 * const select = new Select(connection);
 *
 * // Select rows that match the condition
 * await select.from('users').where((col) => col('age').lessThan(18)).exec();
 *
 * // Log the constructed query string
 * select.log.query(); // Outputs: SELECT FROM users WHERE age < ?
 *
 * // Get the generated SQL without executing
 * const query = select.get.query();
 * const values = select.get.values();
 *
 * // Reset the instance to prepare for a new select operation
 * select.reset();
 *
 * // Example with multiple conditions
 * new Select(connection)
 *   .from('users')                                    // SELECT FROM users
 *   .where((col) => col('status').equal('inactive'))  // WHERE status = 'inactive'
 *   .and()                                            // AND
 *   .where((col) => col('department').equal('Sales')) // department = 'Sales';
 *   .build(); // Returns query string
 *
 * // Example with parentheses
 * new Select(connection)
 *   .from('users')                                         // SELECT FROM users
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
export class Select extends Query<Rows> {
  /**
   * The internal state object that tracks the settings and clauses for building the SELECT query.
   *
   * @property `table` The table to query.
   * @property `columns` The columns to select.
   * @property `order` Sorting instructions for the query.
   * @property `group` Grouping columns for aggregate functions.
   * @property `distinct` Whether to apply the `DISTINCT` keyword to the query.
   * @property `limit` The maximum number of results to return.
   * @property `joins` Defines `JOIN` clauses.
   * @property `where` The `WHERE` clause condition for filtering results.
   * @property `having` The `HAVING` clause condition for filtering results after grouping.
   * @property `unions` Defines `UNION` or `UNION ALL` clauses to combine multiple queries.
   * @property `offset` The offset for paginating results.
   */
  private state: State = {
    table: undefined,
    columns: '*',
    order: new Array(),
    group: new Array(),
    distinct: false,
    limit: undefined,
    joins: new Array(),
    where: undefined,
    having: undefined,
    unions: new Array(),
    offset: undefined,
  };

  /**
   * Resets the `Select` query instance to its initial state.
   *
   * This method clears all query settings, including the table, columns, filters, ordering, joins, etc.,
   * allowing you to start building a fresh query.
   *
   * @returns The `Select` query instance (`this`) to allow method chaining.
   */
  public reset(): this {
    this.state.table = undefined;
    this.state.columns = '*';
    this.state.order = new Array();
    this.state.group = new Array();
    this.state.distinct = false;
    this.state.limit = undefined;
    this.state.joins = new Array();
    this.state.where = undefined;
    this.state.unions = new Array();
    this.state.having = undefined;

    // inherted from Query
    this.values = new Array();
    this.query = undefined;

    return this;
  }

  /**
   * Builds the final SQL `SELECT` query string and returns it, with an option to include or exclude the semicolon.
   *
   * @param subquery Whether to include or exclude the semicolon in the final result.
   * @returns The constructed SQL `SELECT` query string.
   * @throws `QueryError` if the table name is invalid or missing.
   */
  public build(subquery: boolean = false): string {
    if (!isFullStr(this.state.table)) {
      throw new QueryError(`Invalid SELECT table: ${String(this.state.table)}`);
    }

    subquery = isBool(subquery) ? subquery : false;

    const columns = Array.isArray(this.state.columns)
      ? this.state.columns.join(', ')
      : this.state.columns;

    const distinct = this.state.distinct ? 'DISTINCT ' : '';
    let statement = `SELECT ${distinct}${columns} FROM ${this.state.table}`;

    if (this.state.joins.length > 0) {
      const joins = this.state.joins
        .map((join) => {
          return `${join.type} JOIN ${join.table} ON ${join.condition.build()}`;
        })
        .join(' ');
      statement += ` ${joins}`;
    }

    if (this.state.where) {
      statement += ` WHERE ${this.state.where.build()}`;
    }

    if (this.state.group.length > 0) {
      statement += ` GROUP BY ${this.state.group.join(', ')}`;
    }

    if (this.state.having) {
      statement += ` HAVING ${this.state.having.build()}`;
    }

    if (this.state.order && this.state.order.length > 0) {
      const order = this.state.order
        .map((o) => `${o.column}${o.type ? ' ' + o.type : ''}`)
        .join(', ');
      statement += ` ORDER BY ${order}`;
    }

    if (isDefined(this.state.limit)) {
      statement += ` LIMIT ${this.state.limit}`;
    }

    if (isDefined(this.state.offset)) {
      statement += ` OFFSET ${this.state.offset}`;
    }

    if (this.state.unions.length > 0) {
      statement += ` ${this.state.unions
        .map((union) => `${union.all ? 'UNION ALL' : 'UNION'} ${union.query}`)
        .join(' ')}`;
    }

    return subquery ? statement : statement.concat(';');
  }

  /**
   * Adds an `AND` logical operator to the `WHERE` condition.
   * This allows you to chain multiple conditions together using the `AND` operator.
   *
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if you condition starts with `AND`.
   */
  public and(): this {
    if (isUndefined(this.state.where)) {
      throw new QueryError('Invalid SELECT condition');
    }

    this.state.where.and();
    return this;
  }

  /**
   * Adds an `OR` logical operator to the `WHERE` condition.
   * This allows you to combine multiple conditions using the `OR` operator.
   *
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if you condition starts with `OR`.
   */
  public or(): this {
    if (isUndefined(this.state.where)) {
      throw new QueryError('Invalid SELECT condition');
    }

    this.state.where.or();
    return this;
  }

  /**
   * Adds parentheses around conditions, allowing complex groupings.
   * Calling `paren()` opens a parenthesis, and the next call closes it.
   *
   * @returns The `Select` query instance (`this`) to allow method chaining.
   */
  public paren(): this {
    if (isUndefined(this.state.where)) {
      this.state.where = new Condition(this);
    }

    this.state.where.paren();
    return this;
  }

  /**
   * Opens a parenthesis for complex grouping of conditions in the `WHERE` clause.
   * This is typically followed by a condition and can be closed with `close()` or `paren()`.
   *
   * @returns The `Select` query instance (`this`) to allow method chaining.
   */
  public open(): this {
    if (isUndefined(this.state.where)) {
      this.state.where = new Condition(this);
    }

    this.state.where.open();
    return this;
  }

  /**
   * Closes an opened parenthesis in the `WHERE` condition.
   * This works with `open()` or `paren()` to create complex groupings of conditions.
   *
   * @returns The `Select` instance with a closed parenthesis.
   * @throws `QueryError` if no open parenthesis exists to close.
   */
  public close(): this {
    if (isUndefined(this.state.where)) {
      throw new QueryError('Invalid SELECT condition');
    }

    this.state.where.close();
    return this;
  }

  /**
   * Specifies the columns to retrieve from the table.
   *
   * @param columns The columns to select from the table.
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if a column name is invalid.
   *
   * @notes
   * - If no columns are specified, all columns (`*`) are selected by default.
   * - It is also possible to provide aggregate functions and column aliases (e.g., `COUNT(*) AS count`, `MAX()`) in the column list.
   */
  public col(...columns: Array<string>): this {
    columns.forEach((column) => {
      if (!isFullStr(column)) {
        throw new QueryError(`Invalid SELECT column: ${String(column)}`);
      }
    });

    this.state.columns = columns;
    return this;
  }

  /**
   * Specifies the table to select data from.
   *
   * @param name The name of the table to select data from.
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the table name is invalid.
   */
  public from(name: string): this {
    if (!isFullStr(name)) {
      throw new QueryError(`Invalid SELECT table: ${String(name)}`);
    }

    this.state.table = name;
    return this;
  }

  /**
   * Adds the `DISTINCT` keyword to the query, ensuring that the results are unique.
   * This eliminates duplicate rows from the result set.
   *
   * @returns The `Select` query instance (`this`) to allow method chaining.
   */
  public distinct(): this {
    this.state.distinct = true;
    return this;
  }

  /**
   * Adds an `OFFSET` clause to the query, This is commonly used for pagination,
   * where you want to skip a certain number of rows and start from a specific point.
   *
   * @param value The number of rows to skip (must be a positive integer, including 0).
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the value is not a positive integer.
   */
  public offset(value: number): this {
    if (!isInt(value) || value < 0) {
      throw new QueryError(`Invalid OFFSET value: ${String(value)}`);
    }

    this.state.offset = value;
    return this;
  }

  /**
   * Adds a `LIMIT` clause to the query, restricting the number of rows returned.
   *
   * @param value The maximum number of rows to return (must be a non-negative integer, including 0).
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the value is not a non-negative integer.
   */
  public limit(value: number): this {
    if (!isInt(value) || value < 0) {
      throw new QueryError(`Invalid LIMIT value: ${String(value)}`);
    }

    this.state.limit = value;
    return this;
  }

  /**
   * Adds an `INNER JOIN` clause to the query.
   *
   * @param table The name of the table to join with.
   * @param condition A function to define the condition, with access to `col` a column selector, and `con` the condition builder.
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the table name or the condition is invalid.
   *
   * @note You can chain multiple `join()` calls to join more than two tables in a single query result.
   */
  public join(table: string, condition: (col: Col, con: Con) => void): this {
    if (!isFullStr(table)) {
      throw new QueryError(`Invalid JOIN table: ${String(table)}`);
    }

    if (!isFunc(condition)) {
      throw new QueryError(`Invalid JOIN condition: ${String(condition)}`);
    }

    const join = {
      table,
      condition: new Condition(this),
      type: 'INNER',
    };

    condition(join.condition.col.bind(join.condition), join.condition);

    this.state.joins.push(join);
    return this;
  }

  /**
   * Adds a `LEFT JOIN` clause to the query.
   *
   * @param table The name of the table to join with.
   * @param condition A function to define the condition, with access to `col` a column selector, and `con` the condition builder.
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the table name or the condition is invalid.
   *
   * @note You can chain multiple `leftJoin()` calls to join more than two tables in a single query result.
   */
  public leftJoin(
    table: string,
    condition: (col: Col, con: Con) => void
  ): this {
    if (!isFullStr(table)) {
      throw new QueryError(`Invalid JOIN table: ${String(table)}`);
    }

    if (!isFunc(condition)) {
      throw new QueryError(`Invalid JOIN condition: ${String(condition)}`);
    }

    const join = { table, condition: new Condition(this), type: 'LEFT' };

    condition(join.condition.col.bind(join.condition), join.condition);

    this.state.joins.push(join);
    return this;
  }

  /**
   * Adds a `RIGHT JOIN` clause to the query.
   *
   * @param table The name of the table to join with.
   * @param condition A function to define the condition, with access to `col` a column selector, and `con` the condition builder.
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the table name or the condition is invalid.
   *
   * @note You can chain multiple `rightJoin()` calls to join more than two tables in a single query result.
   */
  public rightJoin(
    table: string,
    condition: (col: Col, con: Con) => void
  ): this {
    if (!isFullStr(table)) {
      throw new QueryError(`Invalid JOIN table: ${String(table)}`);
    }

    if (!isFunc(condition)) {
      throw new QueryError(`Invalid JOIN condition: ${String(condition)}`);
    }

    const join = {
      table,
      condition: new Condition(this),
      type: 'RIGHT',
    };

    condition(join.condition.col.bind(join.condition), join.condition);

    this.state.joins.push(join);
    return this;
  }

  /**
   * Adds a `GROUP BY` clause to the query.
   *
   * @param columns The columns to group by.
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if a column name is invalid.
   */
  public groupBy(...columns: Array<string>): this {
    columns.forEach((column) => {
      if (!isFullStr(column)) {
        throw new QueryError(`Invalid GROUP BY column: ${String(column)}`);
      }
    });

    this.state.group.push(...columns);
    return this;
  }

  /**
   * Adds an `ORDER BY` clause to the query.
   *
   * @param column The column to order by.
   * @param type The type of ordering (`ASC` for ascending or `DESC` for descending).
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the column name or the order type is invalid.
   */
  public orderBy(column: string, type: typeof ASC | typeof DESC = ASC): this {
    if (!isFullStr(column)) {
      throw new QueryError(`Invalid ORDER BY column: ${String(column)}`);
    }

    if (![ASC, DESC].includes(type)) {
      throw new QueryError(`Invalid ORDER BY type: ${String(type)}`);
    }

    this.state.order.push({ column, type: type.description as any });
    return this;
  }

  /**
   * Adds a `WHERE` clause to the query.
   *
   * @param condition A function to define the condition, with access to `col` a column selector, and `con` the condition builder.
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the condition is not a function.
   */
  public where(condition: (col: Col, con: Con) => void): this {
    if (!isFunc(condition)) {
      throw new QueryError(`Invalid SELECT condition: ${String(condition)}`);
    }

    if (isUndefined(this.state.where)) {
      this.state.where = new Condition(this);
    }

    condition(this.state.where.col.bind(this.state.where), this.state.where);
    return this;
  }

  /**
   * Adds a `HAVING` condition to the query, typically used to filter groups after `GROUP BY` has been applied.
   * This allows you to add conditions to aggregated results, which are not possible with the `WHERE` clause.
   *
   * @param condition The condition to apply in the `HAVING` clause.
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the condition is not a valid string.
   */
  public having(condition: (col: Col, con: Con) => void): this {
    if (!isFunc(condition)) {
      throw new QueryError(`Invalid HAVING condition: ${String(condition)}`);
    }

    if (isUndefined(this.state.having)) {
      this.state.having = new Condition(this);
    }

    condition(this.state.having.col.bind(this.state.having), this.state.having);
    return this;
  }

  /**
   * Adds a `UNION` to the query, combining the current query's results with the results of a subquery.
   * This removes any duplicate rows from the combined results.
   *
   * @param subquery A function that receives a `Select` instance as an argument, which you can use to build the subquery.
   * @returns The `Select` query instance (`this`) to allow method chaining.
   * @throws `QueryError` if the `subquery` is not a valid function.
   *
   * @note You can continue chaining `union()` calls as needed to combine even more subqueries into a single query.
   */
  public union(subquery: (select: Select) => void): this {
    if (!isFunc(subquery)) {
      throw new QueryError(`Invalid UNION subquery: ${String(subquery)}`);
    }

    const select = new Select(this.connection);

    subquery(select);

    this.state.unions.push({
      query: select.build(true),
      all: false,
    });

    this.values.push(...select.get.values());

    return this;
  }

  /**
   * Adds a `UNION ALL` to the query, combining the current query's results with the results of a subquery.
   * This keeps all rows, including duplicates, in the combined results.
   *
   * @param subquery A function that receives a `Select` instance as an argument, which you can use to build the subquery.
   * @returns The query builder instance (`this`) to allow method chaining.
   * @throws `QueryError` if the `subquery` is not a valid function.
   *
   * @note You can continue chaining `unionAll()` calls as needed to combine even more subqueries into a single query.
   */
  public unionAll(subquery: (select: Select) => void): this {
    if (!isFunc(subquery)) {
      throw new QueryError(`Invalid UNION ALL subquery: ${String(subquery)}`);
    }

    const select = new Select(this.connection);

    subquery(select);

    this.state.unions.push({
      query: select.build(true),
      all: true,
    });

    this.values.push(...select.get.values());

    return this;
  }

  /**
   * Returns the total number of rows that match the current query conditions.
   *
   * This method allows you to easily get a count of items in the table based on any filters or conditions
   * applied to the query.
   *
   * @returns A promise that resolves to the count of matching rows.
   *
   */
  public count(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      if (!isFullStr(this.state.table)) {
        throw new QueryError(
          `Invalid SELECT table: ${String(this.state.table)}`
        );
      }

      const columns = this.state.columns;
      this.state.columns = ['COUNT(*) AS count'];

      this.connection
        .query(this.get.query(), this.get.values())
        .then((r) => {
          this.state.columns = columns;
          resolve(r[0].count);
        })
        .catch((e) => {
          this.state.columns = columns;
          reject(e);
        });
    });
  }

  /**
   * Orders the result randomly depending on the SQL driver (PostgreSQL, SQLite, MySQL).
   * Can be chained before `.limit()` or `.first()` for random selection.
   *
   * @returns The `Select` query instance (`this`) for chaining.
   */
  public random(): this {
    let fn = 'RANDOM()'; // Default for PostgreSQL and SQLite
    if (isMySQL(this.connection.driver)) fn = 'RAND()';

    this.state.order.push({ column: fn });
    return this;
  }

  /**
   * Paginates the query results and returns a specific page of items, along with pagination details.
   *
   * This method is useful for breaking down large result sets into smaller, paginated chunks.
   *
   * @param page page The page number to retrieve (starting from 1).
   * @param items The number of items per page (default is 10).
   * @returns A promise that resolves to an object
   *
   * @notes
   *   - Use `next` and `prev` to determine if you should show or hide the `Next` and `Previous` buttons in your UI.
   *     - If `next` is `undefined`, hide the `Next` button (last page).
   *     - If `prev` is `undefined`, hide the `Previous` button (first page).
   *   - Use `total.pages` and `total.items` to show total pages and items to users.
   *   - You can also use this method to implement infinite scrolling.
   */
  public paginate(page: number, items: number = 10): Promise<Pagination<Row>> {
    return new Promise((resolve, reject) => {
      if (!isInt(page) || page < 1) page = 1;
      if (!isInt(items) || items < 1) items = 10;

      this.count()
        .then((count) => {
          const offset = (page - 1) * items;
          this.limit(items).offset(offset);

          this.exec()
            .then((result) => {
              const total = count;
              const totalPages = Math.ceil(total / items);

              resolve({
                result,
                page: {
                  current: page,
                  prev: page - 1 === 0 ? undefined : page - 1,
                  next: page < totalPages ? page + 1 : undefined,
                  items,
                },
                total: { pages: totalPages, items: total },
              });
            })
            .catch(reject);
        })
        .catch(reject);
    });
  }
}
