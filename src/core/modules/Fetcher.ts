import { QueryError } from '../../errors';
import { isArr, isFullStr, isFunc, logSQL } from '../../helpers';
import { Col, Con, Condition, ref } from '../sql/Condition';
import { ASC, CountOptions, DESC, Pagination, Select } from '../sql/Select';
import { Builder } from './Builder';
import { Driver, Row, Rows } from './Driver';
/**
 * Join types for SQL JOIN clauses.
 * - 'inner': INNER JOIN
 * - 'left': LEFT JOIN
 * - 'right': RIGHT JOIN
 */
export type JT = 'inner' | 'left' | 'right';

/**
 * Array of join definitions used internally by query builders.
 * Each join has:
 * - `table`: the table name to join
 * - `condition`: the join condition (usually a Condition instance)
 * - `type`: the join type ('inner', 'left', or 'right')
 */
export type Joins = Array<{
  table: string;
  condition: Condition;
  type: JT;
}>;

/**
 * Defines an ORDER BY clause.
 * - `column`: the column name to order by
 * - `type`: sorting direction, ASC or DESC constants
 */
export interface OrderClause {
  column: string;
  type: typeof ASC | typeof DESC;
}

/**
 * Callback type for condition builders.
 * Receives:
 * - `col`: function to select columns in conditions
 * - `con`: Condition instance to build complex conditions
 */
export type CB = (col: Col, con: Con) => void;

/**
 * Callback type for query builders.
 * Receives:
 * - `query`: Fetcher instance representing the current query builder
 */
export type QB = (query: Fetcher) => void;

/**
 * Argument types accepted by join methods:
 * - `[table, callback]` for complex join conditions
 * - `[table, column1, column2]` for simple equality joins
 * - `[table, column1, operator, column2]` for custom operator joins
 */
export type JoinArgs =
  | [table: string, cb: CB]
  | [table: string, c1: string, c2: string]
  | [table: string, c1: string, op: Ops, c2: string];

/**
 * Argument types accepted by where/having methods:
 * - `[callback]` for complex nested conditions
 * - `[column, value]` for simple equality
 * - `[column, operator, value]` for custom operator conditions
 */
export type WhereArgs =
  | [cb: CB]
  | [col: string, value: string]
  | [col: string, op: Ops, value: string];

export type HavingArgs = WhereArgs;

/**
 * Supported comparison operators in conditions.
 * Includes standard SQL operators and additional variants.
 */
export type Ops =
  | '='
  | '!='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'like'
  | 'not like'
  | 'in'
  | 'not in'
  | 'between'
  | 'not between';

/**
 * Base class for building SQL clauses.
 *
 * @param driver - The database driver instance used to prepare and execute queries.
 */
export class Clause {
  /** Allowed operators for conditions */
  protected static operators = new Set([
    '=',
    '<',
    '<=',
    '>',
    '>=',
    '!=',
    '<>',
    'like',
    'not like',
    'in',
    'not in',
    'between',
    'not between',
  ]);

  /** Internal state of the clause */
  protected state = {
    where: null,
    joins: [] as Joins,
    having: null,
    columns: ['*'] as string[],
    distinct: false,
    limit: null as number | null,
    group: [] as string[],
    order: [] as OrderClause[],
    debug: false,
    random: false,
  };

  constructor(protected driver: Driver) {}

  /**
   * Builds condition using the given operator and value.
   *
   * @param condition - Condition object to apply the operator on.
   * @param operator - One of the supported operators (see `Ops`).
   * @param value - Value(s) to compare with.
   *
   * @throws QueryError if an invalid operator is provided or values are malformed.
   * @returns The updated condition after applying the operator.
   */
  protected add(condition: Condition, operator: Ops, value: any): Condition {
    if (!Clause.operators.has(operator)) {
      throw new QueryError(`Invalid condition operator: ${operator}`);
    }

    switch (operator) {
      case '=':
        return condition.equal(value);
      case '<':
        return condition.lessThan(value);
      case '<=':
        return condition.lessThanOrEqual(value);
      case '>':
        return condition.greaterThan(value);
      case '>=':
        return condition.greaterThanOrEqual(value);
      case '!=':
      case '<>':
        return condition.not().equal(value);
      case 'like':
        return condition.like(value);
      case 'not like':
        return condition.not().like(value);
      case 'in':
        return condition.in(...(isArr(value) ? value : [value]));
      case 'not in':
        return condition.not().in(...(isArr(value) ? value : [value]));
      case 'between':
        if (!isArr(value) || value.length !== 2) {
          throw new QueryError(`'between' requires an array with two values.`);
        }
        return condition.between(value[0], value[1]);
      case 'not between':
        if (!isArr(value) || value.length !== 2) {
          throw new QueryError(
            `'not between' requires an array with two values.`
          );
        }
        return condition.not().between(value[0], value[1]);
    }
  }
}

export class WhereClause extends Clause {
  /**
   * Conditionally add a `WHERE` clause using a callback.
   * @param condition - Condition to check.
   * @param cb - Callback for complex condition.
   */
  public when(condition: unknown, cb: CB): this;

  /**
   * Conditionally add a simple `WHERE` clause (`column = value`).
   * @param condition - Condition to check.
   * @param c - Column name.
   * @param v - Value to compare.
   */
  public when(condition: unknown, c: string, v: any): this;

  /**
   * Conditionally add a `WHERE` clause with operator.
   * @param condition - Condition to check.
   * @param c - Column name.
   * @param op - Operator (e.g. '=', '!=', '<').
   * @param v - Value to compare.
   */
  public when(condition: unknown, c: string, op: Ops, v: any): this;
  public when(condition: unknown, ...args: WhereArgs): this {
    // @ts-ignore
    if (condition) return this.where(...args);
    return this;
  }

  /**
   * Conditionally add an `OR WHERE` clause using a callback.
   * @param condition - Condition to check.
   * @param cb - Callback for orWhere condition.
   */
  public orWhen(condition: unknown, cb: CB): this;

  /**
   * Conditionally add an `OR WHERE` clause (`column = value`).
   * @param condition - Condition to check.
   * @param c - Column name.
   * @param v - Value to compare.
   */
  public orWhen(condition: unknown, c: string, v: any): this;

  /**
   * Conditionally add an `OR WHERE` clause with operator.
   * @param condition - Condition to check.
   * @param c - Column name.
   * @param op - Operator.
   * @param v - Value to compare.
   */
  public orWhen(condition: unknown, c: string, op: Ops, v: any): this;
  public orWhen(condition: unknown, ...args: WhereArgs): this {
    // @ts-ignore
    if (condition) return this.orWhere(...args);
    return this;
  }

  /**
   * Conditionally add an `AND WHERE` clause using a callback.
   * @param condition - Condition to check.
   * @param cb - Callback for andWhere condition.
   */
  public andWhen(condition: unknown, cb: CB): this;

  /**
   * Conditionally add an `AND WHERE` clause (`column = value`).
   * @param condition - Condition to check.
   * @param c - Column name.
   * @param v - Value to compare.
   */
  public andWhen(condition: unknown, c: string, v: any): this;

  /**
   * Conditionally add an `AND WHERE` clause with operator.
   * @param condition - Condition to check.
   * @param c - Column name.
   * @param op - Operator.
   * @param v - Value to compare.
   */
  public andWhen(condition: unknown, c: string, op: Ops, v: any): this;

  public andWhen(condition: unknown, ...args: WhereArgs): this {
    // @ts-ignore
    if (condition) return this.andWhere(...args);
    return this;
  }

  /**
   * Execute callback if condition is truthy.
   * @param condition - Condition to check.
   * @param cb - Callback receiving this instance.
   */
  public if(condition: unknown, cb: (fetch: this) => void): this {
    if (condition && isFunc(cb)) cb(this);
    return this;
  }

  /**
   * Add a `WHERE` clause via callback.
   * @param cb - Condition builder callback.
   */
  public where(cb: CB): this;

  /**
   * Add a simple `WHERE` clause (`column = value`).
   * @param c - Column name.
   * @param v - Value to compare.
   */
  public where(c: string, v: any): this;

  /**
   * Add a `WHERE` clause with operator.
   * @param c - Column name.
   * @param op - Operator.
   * @param v - Value to compare.
   */
  public where(c: string, op: Ops, v: any): this;
  public where(...args: WhereArgs): this {
    if (!this.state.where) this.state.where = new Condition(this.driver);

    if (args.length === 1) {
      const [builder] = args;
      if (!isFunc(builder))
        throw new QueryError("Expected a function in 'where()'.");
      builder(this.state.where.col.bind(this.state.where), this.state.where);
      return this;
    }

    if (args.length === 2) {
      const [col, value] = args;
      this.state.where.col(col).equal(value);
      return this;
    }

    if (args.length === 3) {
      const [col, operator, value] = args;
      this.state.where.col(col);
      this.add(this.state.where, operator, value);
      return this;
    }

    throw new QueryError("Invalid 'where' syntax");
  }

  /**
   * Add an `AND WHERE` clause via callback.
   * @param cb - Condition builder callback.
   */
  public andWhere(cb: CB): this;

  /**
   * Add an `AND WHERE` clause (`column = value`).
   * @param c - Column name.
   * @param v - Value to compare.
   */
  public andWhere(c: string, v: any): this;

  /**
   * Add an `AND WHERE` clause with operator.
   * @param c - Column name.
   * @param op - Operator.
   * @param v - Value to compare.
   */
  public andWhere(c: string, op: Ops, v: any): this;
  public andWhere(...args: WhereArgs): this {
    // @ts-ignore
    if (!this.state.where) return this.where(...args);
    this.state.where.and();
    // @ts-ignore
    return this.where(...args);
  }

  /**
   * Add an `OR WHERE` clause via callback.
   * @param cb - Condition builder callback.
   */
  public orWhere(cb: CB): this;

  /**
   * Add an `OR WHERE` clause (`column = value`).
   * @param c - Column name.
   * @param v - Value to compare.
   */
  public orWhere(c: string, v: any): this;

  /**
   * Add an `OR WHERE` clause with operator.
   * @param c - Column name.
   * @param op - Operator.
   * @param v - Value to compare.
   */
  public orWhere(c: string, op: Ops, v: any): this;
  public orWhere(...args: WhereArgs): this {
    // @ts-ignore
    if (!this.state.where) return this.where(...args);
    this.state.where.or();
    // @ts-ignore
    return this.where(...args);
  }
}

export class HavingClause extends WhereClause {
  /**
   * Add a `HAVING` clause via callback.
   * @param cb - Condition builder callback.
   */
  public having(cb: CB): this;

  /**
   * Add a simple `HAVING` clause (`column = value`).
   * @param c - Column name.
   * @param v - Value to compare.
   */
  public having(c: string, v: any): this;

  /**
   * Add a `HAVING` clause with operator.
   * @param c - Column name.
   * @param op - Operator.
   * @param v - Value to compare.
   */
  public having(c: string, op: Ops, v: any): this;
  public having(...args: HavingArgs): this {
    if (!this.state.having) this.state.having = new Condition(this.driver);

    if (args.length === 1) {
      const [builder] = args;
      if (!isFunc(builder))
        throw new QueryError("Expected a function in 'having()'.");
      builder(this.state.having.col.bind(this.state.having), this.state.having);
      return this;
    }

    if (args.length === 2) {
      const [col, value] = args;
      this.state.having.col(col).equal(value);
      return this;
    }

    if (args.length === 3) {
      const [col, operator, value] = args;
      this.state.having.col(col);
      this.add(this.state.having, operator, value);
      return this;
    }

    throw new QueryError("Invalid 'having' syntax");
  }

  /**
   * Add an `AND HAVING` clause via callback.
   * @param cb - Condition builder callback.
   */
  public andHaving(cb: CB): this;

  /**
   * Add an `AND HAVING` clause (`column = value`).
   * @param c - Column name.
   * @param v - Value to compare.
   */
  public andHaving(c: string, v: any): this;

  /**
   * Add an `AND HAVING` clause with operator.
   * @param c - Column name.
   * @param op - Operator.
   * @param v - Value to compare.
   */
  public andHaving(c: string, op: Ops, v: any): this;
  public andHaving(...args: HavingArgs): this {
    // @ts-ignore
    if (!this.state.having) return this.having(...args);
    this.state.having.and();
    // @ts-ignore
    return this.having(...args);
  }

  /**
   * Add an `OR HAVING` clause via callback.
   * @param cb - Condition builder callback.
   */
  public orHaving(cb: CB): this;

  /**
   * Add an `OR HAVING` clause (`column = value`).
   * @param c - Column name.
   * @param v - Value to compare.
   */
  public orHaving(c: string, v: any): this;

  /**
   * Add an `OR HAVING` clause with operator.
   * @param c - Column name.
   * @param op - Operator.
   * @param v - Value to compare.
   */
  public orHaving(c: string, op: Ops, v: any): this;

  public orHaving(...args: HavingArgs): this {
    // @ts-ignore
    if (!this.state.having) return this.having(...args);
    this.state.having.or();
    // @ts-ignore
    return this.having(...args);
  }
}
export class JoinClause extends HavingClause {
  /**
   * Add a join clause with simple column equality condition.
   * @param jt - Join type (`left`, `right`, `inner`).
   * @param t - Table name.
   * @param c1 - Left column name.
   * @param c2 - Right column name.
   */
  public join(jt: JT, t: string, c1: string, c2: string): this;

  /**
   * Add a join clause with a callback to build complex join conditions.
   * @param jt - Join type (`left`, `right`, `inner`).
   * @param t - Table name.
   * @param cb - Condition builder callback.
   */
  public join(jt: JT, t: string, cb: CB): this;

  /**
   * Add a join clause with custom operator.
   * @param jt - Join type (`left`, `right`, `inner`).
   * @param t - Table name.
   * @param c1 - Left column name.
   * @param op - Operator (e.g., `=`, `>`, `<`, etc.).
   * @param c2 - Right column name.
   */
  public join(jt: JT, t: string, c1: string, op: Ops, c2: string): this;

  public join(jt: JT, ...args: JoinArgs): this {
    const table = args[0];

    if (!['left', 'right', 'inner'].includes(jt)) {
      throw new QueryError(
        `Invalid join type: ${String(jt)}. Use 'left', 'right', or 'inner'.`
      );
    }

    if (!isFullStr(table)) {
      throw new QueryError(`Invalid table name for join: ${String(table)}`);
    }

    if (args.length === 2 && isFunc(args[1])) {
      const [_, cb] = args;
      const condition = new Condition(this.driver);
      cb(condition.col.bind(condition), condition);
      this.state.joins.push({ type: jt, table, condition });
      return this;
    }

    if (args.length === 3) {
      const [_, c1, c2] = args;
      const condition = new Condition(this.driver).col(c1).equal(ref(c2));
      this.state.joins.push({ type: jt, table, condition });
      return this;
    }

    if (args.length === 4) {
      const [_, c1, operator, c2] = args;
      const condition = new Condition(this.driver).col(c1);
      this.add(condition, operator, ref(c2));
      this.state.joins.push({ type: jt, table, condition });
      return this;
    }

    throw new QueryError('Invalid join syntax');
  }

  /**
   * Add an inner join with simple column equality.
   * @param t - Table name.
   * @param c1 - Left column name.
   * @param c2 - Right column name.
   */
  public innerJoin(t: string, c1: string, c2: string): this;

  /**
   * Add an inner join with a callback for complex conditions.
   * @param t - Table name.
   * @param cb - Condition builder callback.
   */
  public innerJoin(t: string, cb: CB): this;

  /**
   * Add an inner join with custom operator.
   * @param t - Table name.
   * @param c1 - Left column name.
   * @param op - Operator.
   * @param c2 - Right column name.
   */
  public innerJoin(t: string, c1: string, op: Ops, c2: string): this;

  public innerJoin(...args: JoinArgs): this {
    // @ts-ignore
    return this.join('inner', ...args);
  }

  /**
   * Add a left join with simple column equality.
   * @param t - Table name.
   * @param c1 - Left column name.
   * @param c2 - Right column name.
   */
  public leftJoin(t: string, c1: string, c2: string): this;

  /**
   * Add a left join with a callback for complex conditions.
   * @param t - Table name.
   * @param cb - Condition builder callback.
   */
  public leftJoin(t: string, cb: CB): this;

  /**
   * Add a left join with custom operator.
   * @param t - Table name.
   * @param c1 - Left column name.
   * @param op - Operator.
   * @param c2 - Right column name.
   */
  public leftJoin(t: string, c1: string, op: Ops, c2: string): this;

  public leftJoin(...args: JoinArgs): this {
    // @ts-ignore
    return this.join('left', ...args);
  }

  /**
   * Add a right join with simple column equality.
   * @param t - Table name.
   * @param c1 - Left column name.
   * @param c2 - Right column name.
   */
  public rightJoin(t: string, c1: string, c2: string): this;

  /**
   * Add a right join with a callback for complex conditions.
   * @param t - Table name.
   * @param cb - Condition builder callback.
   */
  public rightJoin(t: string, cb: CB): this;

  /**
   * Add a right join with custom operator.
   * @param t - Table name.
   * @param c1 - Left column name.
   * @param op - Operator.
   * @param c2 - Right column name.
   */
  public rightJoin(t: string, c1: string, op: Ops, c2: string): this;

  public rightJoin(...args: JoinArgs): this {
    // @ts-ignore
    return this.join('right', ...args);
  }
}

/**
 * Query builder for fetching data with support for joins,
 * filtering, grouping, ordering, pagination, and more...
 */
export class Fetcher extends JoinClause {
  /**
   * Create a new Fetcher instance.
   *
   * @param table - The table to query from.
   * @param pool - Database connection pool identifier.
   * @param driver - Database driver instance.
   * @param builder - Optional query builder instance.
   */
  constructor(
    protected table: string,
    protected pool: string,
    protected driver: Driver,
    protected builder?: Builder
  ) {
    super(driver);
  }

  /**
   * Build the final Select query applying all stored query state.
   *
   * @param select - The Select query builder instance.
   * @returns The built Select query.
   */
  private build(select: Select): Select {
    select.from(this.table).col(...this.state.columns);

    if (this.state.distinct) select.distinct();
    if (this.state.random) select.random();
    if (this.state.limit) select.limit(this.state.limit);
    if (this.state.group.length) select.groupBy(...this.state.group);
    if (this.state.order.length) {
      this.state.order.forEach((order) => {
        const { column, type } = order;
        select.orderBy(column, type);
      });
    }

    if (this.state.where) select.where(this.state.where);
    if (this.state.having) select.having(this.state.having);

    if (this.state.joins.length) {
      this.state.joins.forEach((join) => {
        const { type, condition, table } = join;
        if (type === 'inner') return select.join(table, condition);
        if (type === 'left') return select.leftJoin(table, condition);
        if (type === 'right') return select.rightJoin(table, condition);
      });
    }

    return select;
  }

  /**
   * Add DISTINCT clause to query results.
   * @returns The current Fetcher instance.
   */
  public distinct(): this {
    this.state.distinct = true;
    return this;
  }

  /**
   * Specify columns to select.
   * @param names - Column names.
   * @returns The current Fetcher instance.
   */
  public columns(...names: Array<string>): this {
    this.state.columns = names.length ? names : ['*'];
    return this;
  }

  /**
   * Specify columns to select (alias for columns).
   * @param columns - Column names.
   * @returns The current Fetcher instance.
   */
  public only(...columns: Array<string>): this {
    this.state.columns = columns.length ? columns : ['*'];
    return this;
  }

  /**
   * Limit number of rows returned.
   * @param value - Maximum number of rows.
   * @returns The current Fetcher instance.
   */
  public limit(value: number): this {
    this.state.limit = value;
    return this;
  }

  /**
   * Add GROUP BY clause.
   * @param columns - Columns to group by.
   * @returns The current Fetcher instance.
   */
  public groupBy(...columns: Array<string>): this {
    this.state.group.push(...columns);
    return this;
  }

  /**
   * Add ORDER BY clause.
   * @param column - Column name.
   * @param type - Sort direction (ASC or DESC).
   * @returns The current Fetcher instance.
   */
  public orderBy(column: string, type: typeof ASC | typeof DESC = ASC): this {
    this.state.order.push({ column, type });
    return this;
  }

  /**
   * Add RANDOM ordering to the query.
   * @returns The current Fetcher instance.
   */
  public random(): this {
    this.state.random = true;
    return this;
  }

  /**
   * Enable debug mode to log generated SQL queries.
   * @returns The current Fetcher instance.
   */
  public debug(): this {
    this.state.debug = true;
    return this;
  }

  /**
   * Execute the built query and return all matching rows.
   * @returns Promise resolving with all rows.
   */
  public all(): Promise<Rows> {
    return Builder.require(
      (builder) => {
        const query = this.build(builder.select());

        if (this.state.debug) {
          logSQL(query.get.query(), query.get.values());
        }

        return query.exec();
      },
      this.pool,
      this.builder
    );
  }

  /**
   * Execute the built query and return the first matching row.
   * @returns Promise resolving with a single row.
   */
  public first(): Promise<Row> {
    return Builder.require(
      (builder) => {
        const query = this.build(builder.select());

        if (this.state.debug) {
          logSQL(query.get.query(), query.get.values());
        }

        return query.first();
      },
      this.pool,
      this.builder
    );
  }

  /**
   * Execute the built query with pagination.
   * @param page - Page number to fetch.
   * @param items - Optional items per page.
   * @param options - Additional count options.
   * @returns Promise resolving with paginated results.
   */
  public paginate(
    page: number,
    items?: number,
    options?: CountOptions
  ): Promise<Pagination<Row>> {
    return Builder.require(
      (builder) => {
        const query = this.build(builder.select());

        if (this.state.debug) {
          logSQL(query.get.query(), query.get.values());
        }

        return query.paginate(page, items, options);
      },
      this.pool,
      this.builder
    );
  }

  /**
   * Count rows matching the query.
   * @param options - Count options (column and distinct flag).
   * @returns Promise resolving with the count.
   */
  public count(
    options: { column?: string; distinct?: boolean } = {}
  ): Promise<number> {
    return Builder.require(
      (builder) => this.build(builder.select()).count(options),
      this.pool,
      this.builder
    );
  }

  /**
   * Return a flat array of values for a specified column or all columns.
   * @param column - Optional column name to flatten.
   * @returns Promise resolving with an array of values.
   */
  public async flat<T = any>(column?: string): Promise<T[]> {
    const rows = await this.all();
    return column
      ? rows.map((r) => r[column] as T)
      : rows.flatMap((r) => Object.values(r) as T[]);
  }
}
