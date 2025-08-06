import { isFunc, isPoolCon, isStr } from '../../helpers';
import { QueryError } from '../../errors';

import { Insert } from '../sql/Insert';
import { Select } from '../sql/Select';
import { Update } from '../sql/Update';
import { Delete } from '../sql/Delete';

import { PoolConnection } from './Pool';
import { QueryResult, Row, Rows } from './Driver';
import { Upsert } from '../sql/Upsert';
import { config } from '../../config';

/**
 * A Simple Yet Powerful Query Builder
 *
 * - `Clean API`: Easily build queries using a chainable method style.
 * - `Parameterized Queries`: Safely handle dynamic values to prevent SQL injection.
 * - `Flexible Query Builders`: Separate builders for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`.
 * - `Error Validation`: Catch invalid inputs early to avoid runtime issues.
 */
export class Builder {
  /**
   * The `PoolConnection` instnace to execute queries
   */
  private connection: PoolConnection;

  /**
   * Provides getter methods.
   */
  public get = {
    /**
     * Retrieves the current database connection.
     *
     * @returns The current `PoolConnection` instance.
     * @throws `QueryError` if the connection is invalid.
     */
    connection: () => {
      if (!isPoolCon(this.connection)) {
        throw new QueryError(`Invalid connection: ${String(this.connection)}`);
      }

      return this.connection;
    },
  };

  /**
   * Provides setter methods.
   */
  public set = {
    /**
     * Updates the database connection.
     *
     * @param connection The new `PoolConnection` instance.
     * @throws `QueryError` if the provided connection is invalid.
     */
    connection: (connection: PoolConnection) => {
      if (!isPoolCon(connection)) {
        throw new QueryError(`Invalid connection: ${String(connection)}`);
      }

      this.connection = connection;
    },
  };

  /**
   * Creates a new `Builder` instance with the provided pool connection.
   *
   * @param connection The connection object used to interact with the pool.
   * @throws `QueryError` if the provided connection is invalid.
   */
  constructor(connection: PoolConnection) {
    if (!isPoolCon(connection)) {
      throw new QueryError(`Invalid connection: ${String(connection)}`);
    }

    this.connection = connection;
  }

  /**
   * Executes a raw SQL query with optional parameterized values.
   *
   * @param query The raw SQL query string to execute.
   * @param values Optional array of parameter values for the query.
   * @returns A promise that resolves to the query result.
   * @throws `QueryError` if the query string or values are invalid.
   */
  public raw<R = QueryResult>(
    query: string,
    values?: Array<string | number | boolean>
  ): Promise<R> {
    return this.connection.query(query, values) as Promise<R>;
  }

  /**
   * Creates an `Insert` query builder to build and execute `INSERT` queries.
   *
   * @returns An instance of the `Insert` builder.
   */
  public insert<
    T extends number | string | void | Row | Rows =
      | number
      | string
      | void
      | Row
      | Rows
  >(): Insert<T> {
    return new Insert<T>(this.connection);
  }

  /**
   * Creates an `Upsert` query builder to build and execute `UPSERT` queries.
   *
   * @returns An instance of the `Upsert` builder.
   */
  public upsert<
    T extends number | string | void | Row | Rows =
      | number
      | string
      | void
      | Row
      | Rows
  >(): Upsert<T> {
    return new Upsert<T>(this.connection);
  }

  /**
   * Creates a `Select` query builder to build and execute `SELECT` queries.
   *
   * @returns An instance of the `Select` builder.
   */
  public select(...cols: string[]): Select {
    if (cols.length) return new Select(this.connection).col(...cols);
    return new Select(this.connection);
  }

  /**
   * Creates an `Update` query builder for building and executing `UPDATE` queries.
   *
   * @returns An instance of the `Update` builder.
   */
  public update(): Update {
    return new Update(this.connection);
  }

  /**
   * Creates a `Delete` query builder for building and executing `DELETE` queries.
   *
   * @returns An instance of the `Delete` builder.
   */
  public delete(): Delete {
    return new Delete(this.connection);
  }

  /**
   * Handles acquiring and releasing database connections for you.
   *
   * You just provide a callback that receives a fresh Builder instance,
   * and this method takes care of connection lifecycle — creating, managing, and releasing it when done.
   *
   * Internally, if you provide a Builder, it will reuse it without releasing the connection (for advanced use).
   * But normally, you just use this to avoid ever forgetting to release connections.
   *
   * @template T
   * @param callback - Function that gets a Builder instance to run queries.
   * @param pool - Optional pool name to get connections from.
   * @param builder - Internal: optional existing Builder (connection not released automatically).
   * @returns Result from the callback.
   */
  public static async require<T>(
    callback: (builder: Builder) => Promise<T> | T,
    pool?: string,
    builder?: Builder
  ): Promise<T> {
    if (!isFunc(callback)) {
      throw new QueryError('Invalid callback function');
    }

    let release = true;
    let connection: PoolConnection;

    if (builder instanceof Builder) {
      connection = builder.get.connection();
      release = false;
    } else {
      const app = config().loadSync();
      if (!isStr(pool)) pool = app.default;

      connection = await app.cluster.request(pool);
      builder = new Builder(connection);
    }

    try {
      const result = await callback(builder);
      release && connection.release();
      return result;
    } catch (error) {
      release && connection.release();
      throw error;
    }
  }
}
