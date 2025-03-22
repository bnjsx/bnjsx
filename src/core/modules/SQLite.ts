import { Database } from 'sqlite3';

// Driver & Connection
import { Driver, Connection, Rows } from './Driver';

// Helpers
import { isArr, isDefined, isError, isNum, isStr } from '../../helpers';

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
      // Create connection using SQLite3
      const db = new Database(this.path, (error) => {
        if (isError(error)) {
          return reject(new CreateConnectionError(error.message));
        }

        // Enable foreign key constraints
        db.run('PRAGMA foreign_keys = ON', undefined, (error) => {
          if (isError(error)) {
            return reject(new CreateConnectionError(error.message));
          }

          const sqlite: Connection = {
            id: Symbol('Connection'),
            driver: this,
            query(sql: string, values: Array<string | number>) {
              return new Promise((resolve, reject) => {
                if (!isStr(sql)) {
                  return reject(
                    new QueryError(`Invalid query: ${String(sql)}`)
                  );
                }

                if (isDefined(values)) {
                  if (!isArr(values)) {
                    return reject(
                      new QueryError(`Invalid query values: ${String(values)}`)
                    );
                  }

                  values.forEach((value) => {
                    if (!isNum(value) && !isStr(value)) {
                      return reject(
                        new QueryError(`Invalid query value: ${String(value)}`)
                      );
                    }
                  });
                }

                // Handle SELECT queries
                if (/^\s*SELECT/i.test(sql)) {
                  return db.all(sql, values, (error, rows) => {
                    if (isError(error)) {
                      return reject(new QueryError(error.message));
                    }

                    return resolve(rows as Rows);
                  });
                }

                // Handle other query types
                db.run(sql, values, function (error) {
                  if (error) return reject(new QueryError(error.message));

                  // Handle INSERT queries
                  if (/^\s*INSERT/i.test(sql)) {
                    // Check if it was a single insert or bulk insert
                    if (this.changes === 1) {
                      return resolve(this.lastID); // Return the last inserted ID for single inserts
                    }

                    return resolve(undefined); // Return undefined for bulk insert
                  }

                  return resolve(undefined);
                });
              });
            },
            close() {
              return new Promise((resolve, reject) => {
                db.close((error) => {
                  if (isError(error)) {
                    return reject(new CloseConnectionError(error.message));
                  }

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
                });
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

          // Resolve
          resolve(sqlite);
        });
      });
    });
  }
}
