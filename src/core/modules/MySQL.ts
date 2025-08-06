import { createConnection } from 'mysql2/promise';
import { Connection, Driver } from './Driver';

// Helpers
import {
  isArr,
  isBool,
  isDefined,
  isNum,
  isObj,
  isStr,
  isTrue,
} from '../../helpers';

// Erros
import {
  QueryError,
  CreateConnectionError,
  CloseConnectionError,
  CommitTransactionError,
  BeginTransactionError,
  RollbackTransactionError,
} from '../../errors';

export interface SslOptions {
  /**
   * A string or buffer holding the PFX or PKCS12 encoded private key, certificate and CA certificates
   */
  pfx?: string;

  /**
   * Either a string/buffer or list of strings/Buffers holding the PEM encoded private key(s) to use
   */
  key?: string | string[] | Buffer | Buffer[];

  /**
   * A string of passphrase for the private key or pfx
   */
  passphrase?: string;

  /**
   * A string/buffer or list of strings/Buffers holding the PEM encoded certificate(s)
   */
  cert?: string | string[] | Buffer | Buffer[];

  /**
   * Either a string/Buffer or list of strings/Buffers of PEM encoded CA certificates to trust.
   */
  ca?: string | string[] | Buffer | Buffer[];

  /**
   * Either a string or list of strings of PEM encoded CRLs (Certificate Revocation List)
   */
  crl?: string | string[];

  /**
   * A string describing the ciphers to use or exclude
   */
  ciphers?: string;

  /**
   * You can also connect to a MySQL server without properly providing the appropriate CA to trust. You should not do this.
   */
  rejectUnauthorized?: boolean;

  /**
   * Configure the minimum supported version of SSL, the default is TLSv1.2.
   */
  minVersion?: string;

  /**
   * Configure the maximum supported version of SSL, the default is TLSv1.3.
   */
  maxVersion?: string;

  /**
   * You can verify the server name identity presented on the server certificate when connecting to a MySQL server.
   * You should enable this but it is disabled by default right now for backwards compatibility.
   */
  verifyIdentity?: boolean;
}

export interface MySQLOptions {
  /**
   * The MySQL user to authenticate as
   */
  user?: string;

  /**
   * The password of that MySQL user
   */
  password?: string;

  /**
   * Alias for the MySQL user password. Makes a bit more sense in a multifactor authentication setup (see
   * "password2" and "password3")
   */
  password1?: string;

  /**
   * 2nd factor authentication password. Mandatory when the authentication policy for the MySQL user account
   * requires an additional authentication method that needs a password.
   * https://dev.mysql.com/doc/refman/8.0/en/multifactor-authentication.html
   */
  password2?: string;

  /**
   * 3rd factor authentication password. Mandatory when the authentication policy for the MySQL user account
   * requires two additional authentication methods and the last one needs a password.
   * https://dev.mysql.com/doc/refman/8.0/en/multifactor-authentication.html
   */
  password3?: string;

  /**
   * Name of the database to use for this connection
   */
  database?: string;

  /**
   * The charset for the connection. This is called 'collation' in the SQL-level of MySQL (like utf8_general_ci).
   * If a SQL-level charset is specified (like utf8mb4) then the default collation for that charset is used.
   * (Default: 'UTF8_GENERAL_CI')
   */
  charset?: string;

  /**
   * The hostname of the database you are connecting to. (Default: localhost)
   */
  host?: string;

  /**
   * The port number to connect to. (Default: 3306)
   */
  port?: number;

  /**
   * The source IP address to use for TCP connection
   */
  localAddress?: string;

  /**
   * The path to a unix domain socket to connect to. When used host and port are ignored
   */
  socketPath?: string;

  /**
   * List of connection flags to use other than the default ones. It is also possible to blacklist default ones
   */
  flags?: Array<string>;

  /**
   * object with ssl parameters or a string containing name of ssl profile
   */
  ssl?: string | SslOptions;

  /**
   * Tells if you want to retrive BIGINT values as string
   */
  bigNumberStrings?: boolean;
}

/**
 * MySQL driver responsible for creating MySQL connections.
 * @implements `Driver` interface.
 * @example
 *
 * // Create a new MySQL driver
 * const driver = new MySQL({
 *   database: 'main', // Your db name
 *   password: 'root', // Your db password,
 *   user: 'root', // Your db user name
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
export class MySQL implements Driver {
  /**
   * Unique identifier for the driver instance.
   */
  public id: Symbol;

  /**
   * MySQL driver configuration options.
   */
  private options: MySQLOptions;

  /**
   * Constructs a MySQL driver with the given options.
   * @param options - Configuration options for the MySQL driver.
   * @example
   *
   * // Create a new MySQL driver
   * const driver = new MySQL({
   *   database: 'main', // Your db name
   *   password: 'root', // Your db password,
   *   user: 'root', // Your db user name
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
  constructor(options: MySQLOptions) {
    if (!isObj(options)) {
      throw new CreateConnectionError(
        `Invalid MySQL options: ${String(options)}`
      );
    }

    // Enables support for BIGINT types
    options['supportBigNumbers'] = true;

    // Dates are returned as strings
    options['dateStrings'] = true;

    // Decimal numbers are returned as JavaScript Number types
    options['decimalNumbers'] = true;

    this.options = options;
    this.id = Symbol('MySQL');
  }

  /**
   * Creates a new MySQL connection.
   * @returns A `Promise` that resolves with a new MySQL connection.
   * @throws  `CreateConnectionError` If connection creation fails.
   * @example
   *
   * // Create a new MySQL driver
   * const driver = new MySQL({
   *   database: 'main', // Your db name
   *   password: 'root', // Your db password,
   *   user: 'root', // Your db user name
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
  public create(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      createConnection(this.options)
        .then((connection) => {
          const mysql: Connection = {
            id: Symbol('Connection'),
            driver: this,
            query(sql: string, values: Array<string | number | boolean>) {
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
                }

                connection
                  .execute(sql, values)
                  .then(([result, fields]: any) => {
                    // Handle SELECT queries
                    if (/^\s*SELECT/i.test(sql)) return resolve(result);

                    // Handle INSERT queries
                    if (/^\s*INSERT/i.test(sql)) {
                      // Test if it's a single insert or bulk insert
                      if (result.affectedRows === 1) {
                        return resolve(result.insertId); // Return PK for single insert
                      }

                      return resolve(undefined); // Return undefined for bulk insert
                    }

                    // Handle other query types
                    return resolve(undefined);
                  })
                  .catch((error) => reject(new QueryError(error.message)));
              });
            },
            close() {
              return new Promise((resolve, reject) => {
                connection
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
                    mysql.close = assign(CloseConnectionError);
                    mysql.query = assign(QueryError);
                    mysql.beginTransaction = assign(BeginTransactionError);
                    mysql.commit = assign(CommitTransactionError);
                    mysql.rollback = assign(RollbackTransactionError);

                    // Resolve
                    resolve();
                  })
                  .catch((error) =>
                    reject(new CloseConnectionError(error.message))
                  );
              });
            },
            beginTransaction() {
              return new Promise((resolve, reject) => {
                connection
                  .beginTransaction()
                  .then(resolve)
                  .catch((error) =>
                    reject(new BeginTransactionError(error.message))
                  );
              });
            },
            commit() {
              return new Promise((resolve, reject) => {
                connection
                  .commit()
                  .then(resolve)
                  .catch((error) =>
                    reject(new CommitTransactionError(error.message))
                  );
              });
            },
            rollback() {
              return new Promise((resolve, reject) => {
                connection
                  .rollback()
                  .then(resolve)
                  .catch((error) =>
                    reject(new RollbackTransactionError(error.message))
                  );
              });
            },
          };

          // Resolve with a new MgeaConnection
          return resolve(mysql);
        })
        .catch((error) => reject(new CreateConnectionError(error.message)));
    });
  }
}
