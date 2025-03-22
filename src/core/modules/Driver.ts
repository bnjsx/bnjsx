/**
 * Generic type representing a single row.
 */
export type Row = { [column: string]: number | string | null };

/**
 * Generic type representing multiple rows.
 */
export type Rows = Array<Row>;

/**
 * Union type representing all possible query results.
 */
export type QueryResult = string | number | Rows | Row | void;

/**
 * Represents a database driver interface.
 */
export interface Driver {
  id: Symbol;
  create(): Promise<Connection>;
}

/**
 * Represents a generic database connection interface.
 * No matter what driver is used (MySQL, PostgreSQL, etc.), the methods remain consistent.
 *
 * @example
 * const driver = new MySQL(options);
 * const connection = await driver.create();
 *
 * // Execute a SELECT query
 * const result = await connection.query('SELECT * FROM users WHERE id = ?', [1]);
 * console.log(result);
 *
 * // Close the connection
 * await connection.close();
 */
export interface Connection {
  /**
   * The identifier for the connection.
   */
  id: Symbol;

  /**
   * The driver created this connection.
   */
  driver: Driver;

  /**
   * Executes a SQL query on the database.
   *
   * @param sql - The SQL query to execute.
   * @param values - Optional array of values to substitute in the SQL query.
   *
   * @returns A promise that resolves with the result of the query.
   *
   * @example
   * const driver = new MySQL(options);
   * const connection = await driver.create();
   *
   * // SELECT query
   * const users = await connection.query('SELECT * FROM users WHERE status = ?', ['active']);
   * console.log(users); // Array of objects
   *
   * // INSERT query
   * const result = await connection.query('INSERT INTO users (name) VALUES (?)', ['John Doe']);
   * console.log(result); // inserted row id
   *
   * @note This method resolves with `Rows` in SELECT queries, otherwise `undefined` for other query types.
   */
  query(sql: string, values?: Array<string | number>): Promise<QueryResult>;

  /**
   * Closes the database connection.
   *
   * @returns A promise that resolves when the connection is closed.
   *
   * @example
   * const driver = new MySQL(options);
   * const connection = await driver.create();
   *
   * await connection.query('SELECT * FROM users');
   *
   * // Close the connection
   * await connection.close();
   * console.log('Connection closed');
   */
  close(): Promise<void>;

  /**
   * Starts a new transaction on the database connection.
   *
   * @returns A promise that resolves when the transaction is started.
   *
   * @example
   * const driver = new MySQL(options);
   * const connection = await driver.create();
   *
   * // Begin a transaction
   * await connection.beginTransaction();
   * console.log('Transaction started');
   *
   * try {
   *   await connection.query('UPDATE users SET name = ? WHERE id = ?', ['Jane Doe', 1]);
   *   await connection.commit();
   * } catch (err) {
   *   await connection.rollback();
   * }
   */
  beginTransaction(): Promise<void>;

  /**
   * Commits the current transaction on the database connection.
   *
   * @returns A promise that resolves when the transaction is committed.
   *
   * @example
   * const driver = new MySQL(options);
   * const connection = await driver.create();
   *
   * // Start and commit a transaction
   * await connection.beginTransaction();
   * await connection.query('INSERT INTO users (name) VALUES (?)', ['Jane Doe']);
   * await connection.commit();
   * console.log('Transaction committed');
   */
  commit(): Promise<void>;

  /**
   * Rolls back the current transaction on the database connection.
   *
   * @returns A promise that resolves when the transaction is rolled back.
   *
   * @example
   * const driver = new MySQL(options);
   * const connection = await driver.create();
   *
   * await connection.beginTransaction();
   * try {
   *   await connection.query('UPDATE users SET name = ? WHERE id = ?', ['Invalid', 999]);
   *   await connection.commit();
   * } catch (err) {
   *   await connection.rollback();
   *   console.log('Transaction rolled back');
   * }
   */
  rollback(): Promise<void>;
}
