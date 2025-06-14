import { Row, Rows } from '../modules/Driver';
import { QueryError } from '../../errors';
import { Query } from './Query';

import {
  isArr,
  isArrOfObj,
  isArrOfStr,
  isEmptyArr,
  isFullStr,
  isNull,
  isNum,
  isObj,
  isStr,
  isMySQL,
  isSQLite,
  isPostgreSQL,
  isArrOfArr,
} from '../../helpers';

/**
 * Represents an UPSERT (INSERT ... ON CONFLICT/ON DUPLICATE KEY UPDATE) SQL query builder.
 * Supports PostgreSQL, SQLite, and MySQL drivers.
 *
 * This class provides a fluent interface for building multi-row UPSERT queries
 * with optional conflict handling, returning clauses, and per-driver syntax differences.
 *
 * @template T The expected return type of the query (e.g., a row or set of rows).
 */
export class Upsert<
  T extends number | string | void | Row | Rows =
    | number
    | string
    | void
    | Row
    | Rows
> extends Query<T> {
  /**
   * The name of the table to perform the UPSERT on.
   */
  private table: string;

  /**
   * List of column names to insert.
   */
  private columns: string[];

  /**
   * List of column names to return (PostgreSQL only).
   */
  private returnings: string[];

  /**
   * List of column names to update on conflict.
   */
  private updates: string[];

  /**
   * List of columns to match on conflict (e.g., unique key).
   */
  private conflicts: string[];

  /**
   * Resets all fields of the query, allowing the instance to be reused.
   * @returns This `Upsert` instance.
   */
  public reset(): this {
    this.table = undefined;
    this.columns = undefined;
    this.updates = undefined;
    this.conflicts = undefined;
    this.returnings = undefined;
    this.values = new Array();
    this.query = undefined;
    return this;
  }

  /**
   * Builds the full UPSERT SQL query string.
   * Handles syntax differences for PostgreSQL, SQLite, and MySQL.
   *
   * @returns The final SQL string.
   * @throws QueryError if required fields are missing or invalid.
   */
  public build(): string {
    if (!isFullStr(this.table)) {
      throw new QueryError(`Invalid UPSERT table: ${String(this.table)}`);
    }

    if (!isArrOfArr(this.values)) {
      throw new QueryError(`Invalid UPSERT values: ${String(this.values)}`);
    }

    if (!isArrOfStr(this.columns)) {
      throw new QueryError(`Invalid UPSERT column: ${String(this.columns)}`);
    }

    if (!isArrOfStr(this.conflicts)) {
      throw new QueryError(
        `Invalid UPSERT conflict: ${String(this.conflicts)}`
      );
    }

    const values = this.values
      .map((r) => `(${r.map((v) => (v === null ? 'NULL' : '?')).join(', ')})`)
      .join(', ');

    const columns = this.columns.join(', ');
    const conflicts = this.conflicts.join(', ');
    const hasUpdates = Array.isArray(this.updates) && this.updates.length > 0;

    const updates = hasUpdates
      ? this.updates
          .map((c) => {
            if (
              isPostgreSQL(this.connection.driver) ||
              isSQLite(this.connection.driver)
            ) {
              return `${c} = excluded.${c}`;
            }
            if (isMySQL(this.connection.driver)) {
              return `${c} = VALUES(${c})`;
            }
          })
          .join(', ')
      : null;

    const returnings =
      this.returnings?.length && isPostgreSQL(this.connection.driver)
        ? ` RETURNING ${this.returnings.join(', ')}`
        : '';

    this.values = this.values.map((row) => row.filter((v) => v !== null));

    if (isPostgreSQL(this.connection.driver)) {
      return hasUpdates
        ? `INSERT INTO ${this.table} (${columns}) VALUES ${values} ON CONFLICT (${conflicts}) DO UPDATE SET ${updates}${returnings};`
        : `INSERT INTO ${this.table} (${columns}) VALUES ${values} ON CONFLICT (${conflicts}) DO NOTHING${returnings};`;
    }

    if (isSQLite(this.connection.driver)) {
      return hasUpdates
        ? `INSERT INTO ${this.table} (${columns}) VALUES ${values} ON CONFLICT (${conflicts}) DO UPDATE SET ${updates};`
        : `INSERT INTO ${this.table} (${columns}) VALUES ${values} ON CONFLICT (${conflicts}) DO NOTHING;`;
    }

    if (isMySQL(this.connection.driver)) {
      return hasUpdates
        ? `INSERT INTO ${this.table} (${columns}) VALUES ${values} ON DUPLICATE KEY UPDATE ${updates};`
        : `INSERT IGNORE INTO ${this.table} (${columns}) VALUES ${values};`;
    }

    throw new QueryError(`Unsupported driver: ${this.connection.driver}`);
  }

  /**
   * Sets the table name for the UPSERT query.
   * @param table Name of the target table.
   * @returns This `Upsert` instance.
   */
  public into(table: string): this {
    if (!isFullStr(table)) {
      throw new QueryError(`Invalid UPSERT table: ${String(table)}`);
    }
    this.table = table;
    return this;
  }

  /**
   * Sets the columns to return (PostgreSQL only).
   * @param columns Names of the columns to return.
   * @returns This `Upsert` instance.
   */
  public returning(...columns: string[]): this {
    if (!isArrOfStr(columns)) {
      throw new QueryError(`Invalid RETURNING columns: ${String(columns)}`);
    }
    this.returnings = columns;
    return this;
  }

  /**
   * Adds a single row to be inserted.
   * Also initializes `columns` if not previously defined.
   *
   * @param row An object mapping column names to values.
   * @returns This `Upsert` instance.
   */
  public row(row: Row): this {
    if (!isObj(row)) {
      throw new QueryError(`Invalid UPSERT row: ${String(row)}`);
    }

    const columns = Object.keys(row);
    if (isEmptyArr(columns)) {
      throw new QueryError(`Empty UPSERT row: ${row}`);
    }

    if (isArr(this.columns)) {
      if (
        this.columns.length !== columns.length ||
        !this.columns.every((col) => columns.includes(col))
      ) {
        throw new QueryError(`Invalid UPSERT row: ${row}`);
      }
    } else {
      this.columns = columns;
    }

    const values = Object.values(row);
    values.forEach((value) => {
      if (!(isNull(value) || isStr(value) || isNum(value))) {
        throw new QueryError(`Invalid UPSERT value: ${String(value)}`);
      }
    });

    this.values.push(values);
    return this;
  }

  /**
   * Adds multiple rows to be inserted.
   * Requires at least two rows.
   *
   * @param rows Array of row objects to insert.
   * @returns This `Upsert` instance.
   */
  public rows(rows: Rows): this {
    if (!isArrOfObj(rows)) {
      throw new QueryError(`Invalid rows: ${String(rows)}`);
    }

    if (rows.length < 2) {
      throw new QueryError(`Bulk insert requires at least 2 rows.`);
    }

    rows.forEach((row) => this.row(row));
    return this;
  }

  /**
   * Sets the column(s) to match for conflict resolution.
   *
   * @param columns Names of columns for conflict detection.
   * @returns This `Upsert` instance.
   */
  public conflict(...columns: string[]): this {
    if (!isArrOfStr(columns)) {
      throw new QueryError(`Invalid UPSERT columns: ${String(columns)}`);
    }

    this.conflicts = columns;
    return this;
  }

  /**
   * Sets the column(s) to update on conflict.
   *
   * @param columns Names of columns to update.
   * @returns This `Upsert` instance.
   */
  public set(...columns: string[]): this {
    if (!isArrOfStr(columns)) {
      throw new QueryError(`Invalid UPSERT columns: ${String(columns)}`);
    }

    this.updates = columns;
    return this;
  }
}
