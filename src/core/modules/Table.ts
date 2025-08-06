import { QueryError } from '../../errors';
import { isArr, isFunc, isObj, isStr } from '../../helpers';
import { Builder } from './Builder';
import { Driver, Row, Rows } from './Driver';
import { CB, Ops, Fetcher, WhereArgs, WhereClause } from './Fetcher';
import { AppOptions, config } from '../../config';

/**
 * Options for performing an UPSERT (insert or update) operation on a table.
 */
type UpsertOptions = {
  /** Rows to insert or update, can be a single row or an array of rows. */
  rows: Rows | Row;

  /** Columns to use as conflict targets (usually unique keys). */
  conflict: string[];

  /** Columns to update when a conflict occurs. */
  update: string[];

  /** Optional list of columns to return after the upsert operation. */
  returning?: string[];
};

/**
 * Represents a WHERE query builder scoped to a specific table.
 * Extends the base WhereClause for SQL-like conditional queries.
 */
export class TableWhere extends WhereClause {
  /**
   * Creates a TableWhere instance for building queries.
   * @param table - The table name.
   * @param pool - The database connection pool name.
   * @param builder - Optional query builder instance.
   * @param driver - The database driver.
   */
  constructor(
    private table: string,
    private pool: string,
    private builder: Builder,
    driver: Driver
  ) {
    super(driver);
  }

  /**
   * Executes a DELETE query for rows matching the where condition.
   * @returns Promise resolved when delete operation completes.
   */
  public delete(): Promise<void> {
    return Builder.require(
      (builder) => {
        return builder.delete().from(this.table).where(this.state.where).exec();
      },
      this.pool,
      this.builder
    );
  }

  /**
   * Executes an UPDATE query for rows matching the where condition.
   * @param row - Data to update.
   * @returns Promise resolved when update operation completes.
   */
  public update(row: Row): Promise<void> {
    return Builder.require(
      (builder) => {
        return builder
          .update()
          .table(this.table)
          .where(this.state.where)
          .set(row)
          .exec();
      },
      this.pool,
      this.builder
    );
  }

  /**
   * Retrieves the first row matching the where condition.
   * @returns Promise resolved with the first matching row.
   */
  public first(): Promise<Row> {
    return Builder.require(
      (builder) => {
        return builder
          .select()
          .from(this.table)
          .where(this.state.where)
          .first();
      },
      this.pool,
      this.builder
    );
  }

  /**
   * Retrieves all rows matching the where condition.
   * @returns Promise resolved with an array of matching rows.
   */
  public all(): Promise<Rows> {
    return Builder.require(
      (builder) => {
        return builder.select().from(this.table).where(this.state.where).exec();
      },
      this.pool,
      this.builder
    );
  }
}

/**
 * Provides methods to find rows in a table based on various criteria.
 */
export class TableFinder {
  /**
   * Creates a TableFinder instance.
   * @param table - The table name.
   * @param pool - The database connection pool name.
   * @param builder - Optional query builder instance.
   */
  constructor(
    private table: string,
    private pool: string,
    private builder?: Builder
  ) {}

  /**
   * Find a single row by primary key (assumed 'id').
   * @param id - The id value to search for.
   * @returns Promise resolved with the found row.
   */
  async one(id: string | number): Promise<Row> {
    return Builder.require(
      (builder) => {
        return builder
          .select()
          .from(this.table)
          .where((col) => col('id').equal(id))
          .first();
      },
      this.pool,
      this.builder
    );
  }

  /**
   * Find one row by any given column and value.
   * @param column - The column name.
   * @param value - The value to match.
   * @returns Promise resolved with the found row.
   */
  async oneBy(column: string, value: any): Promise<Row> {
    return Builder.require(
      (builder) => {
        return builder
          .select()
          .from(this.table)
          .where((col) => col(column).equal(value))
          .first();
      },
      this.pool,
      this.builder
    );
  }

  /**
   * Find multiple rows by an array of ids.
   * @param ids - One or more id values.
   * @returns Promise resolved with an array of found rows.
   */
  async many(...ids: Array<string | number>): Promise<Rows> {
    return Builder.require(
      (builder) => {
        return builder
          .select()
          .from(this.table)
          .where((col) => col('id').in(...ids))
          .exec();
      },
      this.pool,
      this.builder
    );
  }

  /**
   * Find multiple rows where a column matches any value in the given array.
   * @param column - The column name.
   * @param values - Array of values to match.
   * @returns Promise resolved with an array of found rows.
   */
  async manyBy(column: string, values: Array<string | number>): Promise<Rows> {
    return Builder.require(
      (builder) => {
        return builder
          .select()
          .from(this.table)
          .where((col) => col(column).in(...values))
          .exec();
      },
      this.pool,
      this.builder
    );
  }
}

/**
 * Represents a database table with query building and execution capabilities.
 * Provides static and instance methods for CRUD operations and transactions.
 */
export class Table {
  /** Cache of instantiated tables by name (and pool). */
  private static tables: Map<string, Table> = new Map();

  /** The name of the database table. */
  private table: string;

  /** Optional query builder instance. */
  private builder: Builder;

  /** The connection pool name in use. */
  private pname: string;

  /** The database driver associated with the pool. */
  private driver: Driver;

  /**
   * Creates a Table instance for a given table name and optional Builder.
   * If no builder is passed, it initializes the pool and driver from config.
   *
   * @param table - The table name.
   * @param builder - Optional Builder instance for query building.
   * @throws QueryError if the table name is invalid.
   */
  constructor(table: string, builder?: Builder) {
    if (!isStr(table)) throw new QueryError('Invalid table name');
    this.table = table;

    if (builder instanceof Builder) {
      this.driver = builder.get.connection().driver;
      this.builder = builder;
    } else this.pool();
  }

  /**
   * Returns a cached or new Table instance for the given name and pool.
   *
   * @param name - Table name.
   * @param pool - Optional connection pool name.
   * @returns Table instance.
   * @throws QueryError if the table name is invalid.
   */
  public static request(name: string, pool?: string): Table {
    if (!isStr(name)) throw new QueryError('Invalid table name');

    const key = pool ? `${name}:${pool}` : name;
    if (Table.tables.has(key)) return Table.tables.get(key);

    const table = new Table(name).pool(pool);
    Table.tables.set(key, table);
    return table;
  }

  /**
   * Executes a transactional handler function.
   *
   * This method:
   * - Requests a connection from the pool.
   * - Starts a transaction (`BEGIN`).
   * - Provides a `Builder` and a `Table(name)` to the handler.
   * - Commits the transaction on success.
   * - Rolls back the transaction on error.
   * - Releases the connection in all cases.
   *
   * In short, this method manages the full transaction lifecycle for you.
   *
   * @param handler - A function that receives a `Table` factory and `Builder`. Can be async or sync.
   * @param pool - Optional name of the connection pool to use. Defaults to the app's default pool.
   * @returns The resolved value of the handler function.
   * @throws QueryError if the handler is not a function.
   * @throws Any error thrown by the handler will propagate after rollback.
   */
  public static async transaction<T>(
    handler: (
      table: (name: string) => Table,
      builder: Builder
    ) => Promise<T> | T,
    pool?: string
  ): Promise<T> {
    if (!isFunc(handler)) throw new QueryError('Invalid transaction hanlder');

    const app = config().loadSync() as AppOptions;

    if (!isStr(pool)) pool = app.default;

    const connection = await app.cluster.request(pool);
    const builder = new Builder(connection);

    try {
      await connection.beginTransaction();
      const result = await handler(
        (name: string) => new Table(name, builder),
        builder
      );

      await connection.commit();
      connection.release();
      return result as T;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /**
   * Creates a `Fetcher` for the given table and pool.
   *
   * @param table - Table name.
   * @param pool - Optional connection pool name.
   * @returns `Fetcher` instance.
   */
  public static fetch(table: string, pool?: string): Fetcher {
    return this.request(table, pool).fetch();
  }

  /**
   * Creates a `TableFinder` for the given table and pool.
   *
   * @param table - Table name.
   * @param pool - Optional connection pool name.
   * @returns `TableFinder` instance.
   */
  public static find(table: string, pool?: string): TableFinder {
    return this.request(table, pool).find();
  }

  /**
   * Performs an UPSERT operation (insert or update) on the table.
   *
   * @param options - Upsert options including rows, conflict columns, update columns, and optional returning columns.
   * @returns Promise resolving to the result of the upsert (usually affected rows count).
   * @throws QueryError if options, conflict, or update columns are invalid.
   */
  public async upsert<T = number>(options: UpsertOptions): Promise<T> {
    if (!isObj(options)) {
      throw new QueryError('Invalid or empty upsert options');
    }

    const { rows, conflict, update, returning } = options;

    if (!isArr(conflict) || !conflict.length) {
      throw new QueryError('Invalid or empty upsert conflict columns');
    }

    if (!isArr(update) || !update.length) {
      throw new QueryError('Invalid or empty upsert update columns');
    }

    const insertRows = isArr(rows) ? rows : [rows];

    return Builder.require(
      (builder) => {
        const upsert = builder
          .upsert()
          .into(this.table)
          .rows(insertRows)
          .conflict(...conflict)
          .set(...update);

        if (returning?.length) upsert.returning(...returning);

        return upsert.exec();
      },
      this.pname,
      this.builder
    ) as Promise<T>;
  }

  /**
   * Inserts one or more rows into the table.
   * @param rows - One or more rows to insert.
   * @returns Promise resolving to number of rows affected.
   */
  public insert(...rows: Rows): Promise<number> {
    return Builder.require(
      (builder) => {
        return builder.insert().into(this.table).rows(rows).exec();
      },
      this.pname,
      this.builder
    ) as Promise<number>;
  }

  /**
   * Adds a `WHERE` clause using a callback to build complex conditions.
   *
   * @param cb - Callback function receiving `col` for column selection to apply conditions.
   * @returns `TableWhere` instance for chaining further query methods.
   */
  public where(cb: CB): TableWhere;

  /**
   * Adds a simple equality `WHERE` condition on a column.
   *
   * @param c - Column name to filter by.
   * @param v - Value to match exactly.
   * @returns `TableWhere` instance for chaining further query methods.
   */
  public where(c: string, v: any): TableWhere;

  /**
   * Adds a `WHERE` condition with a custom operator.
   *
   * @param c - Column name to filter by.
   * @param op - Comparison operator, e.g., '=', '<', '>'.
   * @param v - Value to compare against.
   * @returns `TableWhere` instance for chaining further query methods.
   */
  public where(c: string, op: Ops, v: any): TableWhere;

  /**
   * Adds a `WHERE` clause to the query.
   * Supports callback, column-value, or column-operator-value signatures.
   *
   * @param args - Arguments defining the condition, matching one of the overload forms.
   * @returns `TableWhere` instance for chaining further query methods.
   */
  public where(...args: WhereArgs): TableWhere {
    const where = new TableWhere(
      this.table,
      this.pname,
      this.builder,
      this.driver
    );

    // @ts-ignore
    return where.where(...args);
  }

  /**
   * Creates a `Fetcher` instance for advanced queries.
   * @returns `Fetcher` instance.
   */
  public fetch(): Fetcher {
    return new Fetcher(this.table, this.pname, this.driver, this.builder);
  }

  /**
   * Creates a `TableFinder` instance for convenient find operations.
   * @returns `TableFinder` instance.
   */
  public find(): TableFinder {
    return new TableFinder(this.table, this.pname, this.builder);
  }

  /**
   * Sets or updates the connection pool name and driver.
   * If no name is provided, uses the default pool from config.
   *
   * @param name - Optional pool name.
   * @returns The current Table instance (for chaining).
   */
  public pool(name?: string): this {
    if (!isStr(name)) {
      name = config().loadSync().default;
    }

    if (!this.pname || this.pname !== name) {
      this.pname = name;
      this.driver = config().loadSync().cluster.get.pool(name)['driver'];
    }

    return this;
  }

  /**
   * Executes a raw SQL query with optional parameters.
   *
   * @param query - Raw SQL query string.
   * @param params - Query parameters (string, number, or boolean).
   * @returns Promise resolving to the query result.
   */
  public raw<T>(
    query: string,
    ...params: Array<string | number | boolean>
  ): Promise<T> {
    return Builder.require(
      (builder) => builder.raw(query, params),
      this.pname,
      this.builder
    ) as Promise<T>;
  }
}
