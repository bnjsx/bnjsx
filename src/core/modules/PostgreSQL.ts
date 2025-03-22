import { Client, types } from 'pg';
import { ConnectionOptions } from 'tls';

// Driver & Connection
import { Driver, Connection } from './Driver';

// Helpers
import { isArr, isDefined, isNum, isObj, isStr, isBool } from '../../helpers';

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
 * PostgreSQL connection options interface.
 * Defines the configuration options used to establish a connection to a PostgreSQL database.
 *
 * @property `user` - The username for authentication with the PostgreSQL server.
 * @property `database` - The name of the PostgreSQL database to connect to.
 * @property `password` - The password for the user, or a function that returns the password or a promise for the password.
 * @property `port` - The port number on which the PostgreSQL server is listening. Default is `5432`.
 * @property `host` - The host address of the PostgreSQL server.
 * @property `ssl` - SSL settings, can be a boolean or a configuration object for SSL options.
 * @property `bigNumberStrings` - When set to true, returns `BIGINT` and `NUMERIC` values as strings instead of numbers to avoid precision loss.
 */
export interface PostgreSQLOptions {
  user?: string | undefined;
  database?: string | undefined;
  password?: string | (() => string | Promise<string>) | undefined;
  port?: number | undefined;
  host?: string | undefined;
  ssl?: boolean | ConnectionOptions | undefined;
  bigNumberStrings?: boolean;
}

/**
 * PostgreSQL driver responsible for creating PostgreSQL connections.
 * @implements `Driver` interface.
 * @example
 *
 * // Create a new PostgreSQL driver
 * const driver = new PostgreSQL({
 *   database: 'test', // Your db name
 *   password: 'postgres', // Your db password,
 *   user: 'postgres', // Your db user name
 *   host: 'localhost', // Your db host
 * });
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
 * // Close connection
 * await connection.close();
 */
export class PostgreSQL implements Driver {
  /**
   * Unique identifier for the driver instance.
   */
  public id: Symbol;

  /**
   * PostgreSQL driver configuration options.
   */
  private options: PostgreSQLOptions;

  /**
   * Constructs a PostgreSQL driver with the given options.
   * @param options - Configuration options for the PostgreSQL driver.
   * @example
   *
   * // Create a new PostgreSQL driver
   * const driver = new PostgreSQL({
   *   database: 'test', // Your db name
   *   password: 'postgres', // Your db password,
   *   user: 'postgres', // Your db user name
   *   host: 'localhost', // Your db host
   * });
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
   * // Close connection
   * await connection.close();
   */
  constructor(options: PostgreSQLOptions) {
    if (!isObj(options)) {
      throw new CreateConnectionError(
        `Invalid PostgreSQL options: ${String(options)}`
      );
    }

    if (!isBool(options.bigNumberStrings)) {
      options.bigNumberStrings = false;
    }

    this.options = options;
    this.id = Symbol('PostgreSQL');
  }

  /**
   * Creates a new PostgreSQL connection.
   * @returns A `Promise` that resolves with a new PostgreSQL connection.
   * @throws  `CreateConnectionError` If connection creation fails.
   * @example
   *
   * // Create a new PostgreSQL driver
   * const driver = new PostgreSQL({
   *   database: 'main', // Your db name
   *   password: 'root', // Your db password,
   *   user: 'root', // Your db user name
   *   host: 'localhost', // Your db host
   *   primaryKey: 'id', // Your primary key
   * });
   *
   * // Create connection
   * const connection = await driver.create();
   *
   * // Execute your queries
   * await connection.query(sql, values); // Rows | undefined
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
   * // Close connection
   * await connection.close();
   */
  public create(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      // Create connection using pg
      const client = new Client(this.options);

      // BIGINT
      if (this.options.bigNumberStrings) types.setTypeParser(20, (v) => v);
      else types.setTypeParser(20, (v) => parseInt(v));

      // SMALLINT
      types.setTypeParser(21, (v) => parseInt(v));

      // INTEGER
      types.setTypeParser(23, (v) => parseInt(v));

      // DECIMAL
      types.setTypeParser(1700, (v) => parseFloat(v));

      // REAL
      types.setTypeParser(700, (v) => parseFloat(v));

      // DOUBLE PRECISION
      types.setTypeParser(701, (v) => parseFloat(v));

      // DATE
      types.setTypeParser(1082, (v) => v);

      // TIME WITHOUT TIME ZONE
      types.setTypeParser(1083, (v) => v);

      // TIMESTAMP WITHOUT TIME ZONE
      types.setTypeParser(1114, (v) => v);

      // JSON
      types.setTypeParser(114, (v) => JSON.parse(v));

      client
        .connect()
        .then(() => {
          const postgre: Connection = {
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

                let counter = 1;
                client
                  .query(
                    sql.replace(/\?/g, () => `$${counter++}`),
                    values
                  )
                  .then((result) => {
                    // Handle SELECT queries
                    if (/^\s*SELECT/i.test(sql)) return resolve(result.rows);

                    // Handle INSERT queries
                    if (/^\s*INSERT/i.test(sql)) {
                      if (!isArr(result.rows)) return resolve(undefined);

                      // In single insert
                      if (result.rowCount === 1) return resolve(result.rows[0]);

                      // In bulk insert
                      return resolve(result.rows);
                    }

                    // Handle other query types
                    return resolve(undefined);
                  })
                  .catch((error) => reject(new QueryError(error.message)));
              });
            },
            close() {
              return new Promise((resolve, reject) => {
                client
                  .end()
                  .then(() => {
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
                    postgre.close = assign(CloseConnectionError);
                    postgre.query = assign(QueryError);
                    postgre.beginTransaction = assign(BeginTransactionError);
                    postgre.commit = assign(CommitTransactionError);
                    postgre.rollback = assign(RollbackTransactionError);

                    // Resolve
                    resolve();
                  })
                  .catch((error) =>
                    reject(new CloseConnectionError(error.message))
                  );
              });
            },
            beginTransaction() {
              return new Promise<void>((resolve, reject) => {
                return postgre
                  .query('BEGIN TRANSACTION;')
                  .then(() => resolve())
                  .catch((error) =>
                    reject(new BeginTransactionError(error.message))
                  );
              });
            },
            commit() {
              return new Promise<void>((resolve, reject) => {
                return postgre
                  .query('COMMIT;')
                  .then(() => resolve())
                  .catch((error) =>
                    reject(new CommitTransactionError(error.message))
                  );
              });
            },
            rollback() {
              return new Promise<void>((resolve, reject) => {
                return postgre
                  .query('ROLLBACK;')
                  .then(() => resolve())
                  .catch((error) =>
                    reject(new RollbackTransactionError(error.message))
                  );
              });
            },
          };

          // Resolve with a new MgeaConnection
          return resolve(postgre);
        })
        .catch((error) => reject(new CreateConnectionError(error.message)));
    });
  }
}
