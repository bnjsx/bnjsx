import Database from 'better-sqlite3';

// Driver & Connection
import { Driver, Connection, Rows } from './Driver';

// Helpers
import { isArr, isBool, isNum, isStr } from '../../helpers';

// Errors
import {
  QueryError,
  CreateConnectionError,
  CloseConnectionError,
  CommitTransactionError,
  BeginTransactionError,
  RollbackTransactionError,
} from '../../errors';

/**
 * SQLite driver responsible for creating SQLite connections.
 * @implements `Driver` interface.
 * @example
 *
 * // Create a new SQLite driver using a file-based database
 * const driver = new SQLite('./database.sqlite');
 *
 * // Create a new SQLite driver using an in-memory database
 * const driver = new SQLite(':memory:');
 *
 * // Create connection
 * const connection = await driver.create();
 *
 * // Execute your queries
 * const result = await connection.query(sql, values);
 * console.log(result);
 *
 * // Begin a transaction
 * await connection.beginTransaction();
 *
 * // Commit transaction
 * await connection.commit();
 *
 * // Rollback transaction
 * await connection.rollback();
 *
 * @note
 * SQLite supports two types of databases:
 * 1. **File-based database**: The database is stored in a file on disk (e.g., `./database.sqlite`). Data is persisted.
 * 2. **In-memory database**: The database is stored entirely in memory and is not persisted to disk. When the connection is closed or the application stops, all data is lost.
 */
export class SQLite implements Driver {
  /**
   * Unique identifier for the driver instance.
   */
  public id: Symbol;

  /**
   * The SQLite database file path.
   */
  private path: string;

  /**
   * Constructs a SQLite driver with the given options.
   * @param path SQLite database file path like `./database.sqlite`, or `:memory:` for an in-memory database.
   * @example
   *
   * // Create a new SQLite driver with a file-based database
   * const driver = new SQLite('./database.sqlite');
   *
   * // Create a new SQLite driver with an in-memory database
   * const driver = new SQLite(':memory:');
   *
   * @note
   * - **File-based databases** are persistent. You can use them for long-term storage
   * - **In-memory databases** are non-persistent. They are faster because they don't involve file I/O, but all data is lost when the connection is closed or the application stops. Useful for testing or temporary data storage.
   */
  constructor(path: string) {
    if (!isStr(path)) {
      throw new CreateConnectionError(`Invalid SQLite path: ${String(path)}`);
    }

    this.path = path;
    this.id = Symbol('SQLite');
  }

  /**
   * Creates a new SQLite connection.
   * @returns A `Promise` that resolves with a new SQLite connection.
   * @throws  `CreateConnectionError` If connection creation fails.
   * @example
   *
   * // Create a new SQLite driver
   * const driver = new SQLite(path);
   *
   * // Create connection
   * const connection = await driver.create();
   *
   * // Execute your queries
   * const result = await connection.query(sql, values);
   * console.log(result);
   *
   * // Begin a transaction
   * await connection.beginTransaction();
   *
   * // Commit transaction
   * await connection.commit();
   *
   * // Rollback transaction
   * await connection.rollback();
   *
   * @note
   * - When using `:memory:` as the path, SQLite creates an in-memory database that is non-persistent.
   * - For a file-based database, the path should point to a valid file location like `./database.sqlite`
   * - An in-memory database can be ideal for tests and temporary storage because you lose all data once the application ends.
   */
  public create(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      try {
        // Create connection using SQLite3
        const db = new Database(this.path);

        // Enable foreign key constraints
        db.pragma('foreign_keys = ON');
        db.pragma('journal_mode = WAL');

        const sqlite: Connection = {
          id: Symbol('Connection'),
          driver: this,
          query(sql: string, values?: Array<string | number | boolean>) {
            return new Promise((resolve, reject) => {
              if (!isStr(sql)) {
                return reject(new QueryError(`Invalid query: ${String(sql)}`));
              }

              values === undefined ? (values = []) : values;

              if (!isArr(values)) {
                return reject(
                  new QueryError(`Invalid query values: ${String(values)}`)
                );
              }

              values = values.map((value) => {
                if (isBool(value)) return value ? 1 : 0;
                return value;
              });

              values.forEach((value) => {
                if (!isNum(value) && !isStr(value)) {
                  return reject(
                    new QueryError(`Invalid query value: ${String(value)}`)
                  );
                }
              });

              try {
                // Handle SELECT queries
                if (/^\s*SELECT/i.test(sql)) {
                  return resolve(db.prepare(sql).all(...values) as Rows);
                }

                const info = db.prepare(sql).run(...values);

                // Handle INSERT queries
                if (/^\s*INSERT/i.test(sql)) {
                  // Check if it was a single insert or bulk insert
                  if (info.changes === 1) {
                    // Return the last inserted ID for single inserts
                    return resolve(info.lastInsertRowid as number);
                  }
                }

                // Return undefined for bulk insert and everything else..
                return resolve(undefined);
              } catch (error) {
                return reject(new QueryError(error.message));
              }
            });
          },
          close() {
            return new Promise((resolve, reject) => {
              try {
                db.close();

                const assign = (Error: any) => {
                  return function reject() {
                    return Promise.reject(
                      new Error(
                        'Cannot perform further operations once the connection is closed'
                      )
                    );
                  };
                };

                // Reset
                sqlite.close = assign(CloseConnectionError);
                sqlite.query = assign(QueryError);
                sqlite.beginTransaction = assign(BeginTransactionError);
                sqlite.commit = assign(CommitTransactionError);
                sqlite.rollback = assign(RollbackTransactionError);

                // Resolve
                resolve();
              } catch (error) {
                return reject(new CloseConnectionError(error.message));
              }
            });
          },
          beginTransaction() {
            return new Promise<void>((resolve, reject) => {
              return sqlite
                .query('BEGIN TRANSACTION;')
                .then(() => resolve())
                .catch((error) =>
                  reject(new BeginTransactionError(error.message))
                );
            });
          },
          commit() {
            return new Promise<void>((resolve, reject) => {
              return sqlite
                .query('COMMIT;')
                .then(() => resolve())
                .catch((error) =>
                  reject(new CommitTransactionError(error.message))
                );
            });
          },
          rollback() {
            return new Promise((resolve, reject) => {
              return sqlite
                .query('ROLLBACK;')
                .then(() => resolve())
                .catch((error) =>
                  reject(new RollbackTransactionError(error.message))
                );
            });
          },
        };

        return resolve(sqlite);
      } catch (error) {
        reject(new CreateConnectionError(error.message));
      }
    });
  }
}
