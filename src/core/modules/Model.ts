import EventEmitter from 'events';
import { Row, Rows } from './Driver';
import { Select } from '../sql/Select';
import { Col, Con, ref } from '../sql/Condition';
import { Builder } from './Builder';
import { PoolConnection } from './Pool';

import {
  isArr,
  isArrOfFunc,
  isArrOfObj,
  isArrOfStr,
  isBool,
  isChildOf,
  isDefined,
  isFullArr,
  isFullObj,
  isFullStr,
  isNum,
  isObj,
  isStr,
  isSubclass,
  isPostgreSQL,
  UTC,
} from '../../helpers';

/**
 * A function that modifies a value and returns the modified value.
 *
 * @param value The value to be modified.
 * @returns The modified value.
 */
type Modifier = (value: any) => any;

/**
 * An object where each key is a column name and the value is an array of modifiers to be applied to that column.
 */
type Modifiers = { [column: string]: Array<Modifier> };

/**
 * Modifies the values in a row based on registered modifiers for each column.
 *
 * @param model The model class that contains the modifiers.
 * @param row The row object to modify.
 * @returns The modified row with all column values processed by their respective modifiers.
 */
function modify(model: typeof Model, row: Row): Row {
  Object.keys(row).forEach((col) => {
    const modifiers = model.get.modifiers(col);
    row[col] = modifiers.reduce((v, modifier) => modifier(v), row[col]);
  });

  return row;
}

/**
 * Filters out specified columns from the original model object.
 *
 * @param ignore An array of column names to be excluded from the result.
 * @param model The original object to filter.
 * @returns A new object containing only the columns that are not in the `ignore` array.
 */
function filter(
  ignore: string[],
  model: Record<string, any>
): Record<string, any> {
  return Object.keys(model).reduce((result, key) => {
    if (!ignore.includes(key)) result[key] = model[key];
    return result;
  }, {});
}

/**
 * Class for executing SQL operations (UPDATE, DELETE, SELECT) based on the condition defined in `where()`.
 */
class Where {
  private static condition: (col: Col, con: Con) => void;

  private static context: typeof Model;

  /**
   * Executes an UPDATE query on the table to modify the rows based on the provided data
   * and the condition defined by `where()`.
   *
   * @param row The data to update in the table.
   * @returns A Promise that resolves when the update is complete, or rejects if an error occurs.
   */
  public static update(row: Row): Promise<void> {
    return new Promise((resolve, reject) => {
      this.context.get
        .builder()
        .update()
        .table(this.context.get.table())
        .set(row)
        .where(this.condition)
        .exec()
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Executes a DELETE query on the table to remove rows that match the condition defined by `where()`.
   *
   * @returns A Promise that resolves when the delete is complete, or rejects if an error occurs.
   */
  public static delete(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.context.get
        .builder()
        .delete()
        .from(this.context.get.table())
        .where(this.condition)
        .exec()
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Executes a SELECT query on the table to retrieve rows that match the condition defined by `where()`.
   *
   * @returns A Promise that resolves with an array of `Model` instances, or rejects if an error occurs.
   */
  public static select(): Promise<Array<Model>> {
    return new Promise((resolve, reject) => {
      this.context
        .select()
        .where(this.condition)
        .exec()
        .then(resolve)
        .catch(reject);
    });
  }
}

/**
 * Getter class with methods to access the model's state.
 */
class Getter {
  private static context: any;

  /**
   * Tells whether to enable or disable timestamps handling.
   * @returns `True` if timestamps are enabled, otherwise `false`.
   * @note Default return value is `true` if `this.timestamps` is invalid.
   */
  public static timestamps() {
    return isBool(this.context.timestamps) ? this.context.timestamps : true;
  }

  /**
   * Retrieves the name of the 'createdAt' column.
   * @returns  The name of the 'createdAt' column.
   * @note Default return value is `'created_at'` if `this.createdAt` is invalid.
   */
  public static createdAt() {
    return isFullStr(this.context.createdAt)
      ? this.context.createdAt
      : 'created_at';
  }

  /**
   * Retrieves the name of the 'updatedAt' column.
   * @returns  The name of the 'updatedAt' column.
   * @note Default return value is `'updated_at'` if `this.updatedAt` is invalid.
   */
  public static updatedAt() {
    return isFullStr(this.context.updatedAt)
      ? this.context.updatedAt
      : 'updated_at';
  }

  /**
   * Retrieves the name of the associated table.
   * @returns  The table name.
   * @throws `ModelError` if the table name is invalid.
   */
  public static table() {
    if (!isFullStr(this.context.table)) {
      throw new ModelError(
        `Invalid table name in ${this.context.name} model: ${String(
          this.context.table
        )}`
      );
    }
    return this.context.table;
  }

  /**
   * Retrieves an array of column names.
   * @returns An array of fully qualified column names.
   * @note Defaults to `table.*` if no columns are specified.
   */
  public static columns() {
    const table = this.table();

    if (isArrOfStr(this.context.columns)) {
      return this.context.columns.map((col) => `${table}.${col}`);
    }

    return [`${table}.*`];
  }

  /**
   * Retrieves an array of column names to be ignored in update.
   * @returns An array of ignored column names.
   * @note Default return value is `[]` if `this.ignore` is invalid.
   */
  public static ignore() {
    return isArrOfStr(this.context.ignore) ? this.context.ignore : [];
  }

  /**
   * Retrieves the builder instance used for constructing queries.
   * @returns The `Builder` instance.
   * @throws `ModelError` if the builder is invalid.
   */
  public static builder(): Builder {
    if (!isChildOf(this.context.builder, Builder)) {
      throw new ModelError(
        `Invalid builder in ${this.context.name} model: ${String(
          this.context.builder
        )}`
      );
    }

    return this.context.builder;
  }

  /**
   * Retrieves the primary key column name.
   * @returns The primary key column name.
   * @note Default return value is `'id'` if `this.primaryKey` is invalid.
   */
  public static pk() {
    return isFullStr(this.context.primaryKey) ? this.context.primaryKey : 'id';
  }

  /**
   * Retrieves the foreign key column name.
   * @returns The foreign key column name.
   * @note Default value is the singular form of the table name with `this.primaryKey` appended (e.g., `user_id`, `product_id`) if `this.foreignKey` is invalid.
   */
  public static fk() {
    return isFullStr(this.context.foreignKey)
      ? this.context.foreignKey
      : `${this.context.name.toLocaleLowerCase()}_${this.pk()}`;
  }

  /**
   * Retrieves the name of the link table (`pivot`).
   * @param model The model class to link to.
   * @returns The name of the link table, typically in the format `'modelname_modelname'`.
   * @throws `ModelError` if the provided `model` is not a subclass of `Model`.
   * @note The link table name is generated by combining both model names in alphabetical order, separated by an underscore (e.g., 'category_product').
   */
  public static link(model: typeof Model) {
    if (!isSubclass(model, Model)) {
      throw new ModelError(`Invalid link model in ${this.context.name}`);
    }
    return [model.name, this.context.name].sort().join('_').toLowerCase();
  }

  /**
   * Retrieves the event emitter instance used to trigger events.
   * @returns The `EventEmitter` instance.
   * @note If `this.emitter` is not already set, it will be initialized as a new `EventEmitter`.
   */
  public static emitter() {
    if (!isChildOf(this.context.emitter, EventEmitter)) {
      this.context.emitter = new EventEmitter();
    }
    return this.context.emitter;
  }

  /**
   * Retrieves modifiers registered for a specific column.
   * @param column The column name to get modifiers for.
   * @returns An array of modifiers registered for the column, or an empty array.
   * @note Returns an empty array if no modifiers registered, or incorrect structure.
   */
  public static modifiers(column: string) {
    // Check if the column name is valid
    if (!isFullStr(column)) return [];

    // Check if the modifiers object exists
    if (!isObj(this.context.modifiers)) return [];

    // Check if the modifiers for the specific column exist and are valid functions
    if (!isArrOfFunc(this.context.modifiers[column])) return [];

    // Return the array of modifiers for the column
    return this.context.modifiers[column];
  }
}

/**
 * The `Selector` class extends the `Select` class and provides methods to build and execute select queries.
 * The difference with the base `Select` class is that the `exec` method resolves with an array of `Model` instances instead of plain objects.
 *
 * @extends Select
 */
class Selector extends Select {
  /**
   * The `Model` sub-class (e.g, `User`, `Product`)
   */
  private model: typeof Model;

  /**
   * Creates an instance of the `Selector` class.
   * @param connection The database connection to use.
   * @param model The model class associated with the query.
   */
  constructor(connection: PoolConnection, model: typeof Model) {
    super(connection);

    // Set model
    this.model = model;
  }

  /**
   * Executes the query and resolves with an array of model instances.
   * @returns A promise that resolves with an array of `Model` instances.
   */
  // @ts-ignore: Thanks for your help
  public exec(): Promise<Array<Model>> {
    return new Promise((resolve, reject) => {
      super
        .exec()
        .then((rows) => {
          resolve(
            rows.map((row) => {
              const modified = modify(this.model, row);
              const model = new this.model();

              Object.keys(modified).forEach(
                (key) => (model[key] = modified[key])
              );

              return model;
            })
          );
        })
        .catch(reject);
    });
  }

  /**
   * Alias for `exec` that returns the same result but provides a more readable API.
   * @returns A promise that resolves with an array of Model instances.
   */
  public all(): Promise<Array<Model>> {
    return this.exec(); // Calls the private exec() method
  }

  /**
   * Alias for `exec` that returns the same result but provides a more readable API.
   * @returns A promise that resolves with an array of Model instances.
   */
  // @ts-ignore: Thanks for your help
  public first(): Promise<Model> {
    return new Promise((resolve, reject) => {
      this.exec()
        .then((r) => resolve(isArr(r) ? r[0] : r))
        .catch(reject);
    });
  }
}

/**
 * Event emitted before a row is inserted.
 *
 * @event INSERT
 * @param row The row that will be inserted.
 * @note Emitted by the `insert()` static method.
 */
export const INSERT = Symbol('INSERT');

/**
 * Event emitted after a row is inserted.
 *
 * @event INSERTED
 * @param model The model returned by `insert()`.
 * @note Emitted by the `insert()` static method.
 */
export const INSERTED = Symbol('INSERTED');

/**
 * Event emitted before multiple rows are inserted.
 *
 * @event INSERT_MANY
 * @param rows The rows that will be inserted.
 * @note Emitted by the `insertMany()` static method.
 */
export const INSERT_MANY = Symbol('INSERT_MANY');

/**
 * Event emitted after multiple rows are inserted.
 *
 * @event INSERTED_MANY
 * @param models The models returned by `insertMany()`.
 * @note Emitted by the `insertMany()` static method.
 */
export const INSERTED_MANY = Symbol('INSERTED_MANY');

/**
 * Event emitted before a model is updated.
 *
 * @event UPDATE
 * @param row The data that will be updated.
 * @note Emitted by the `update()` method.
 */
export const UPDATE = Symbol('UPDATE');

/**
 * Event emitted after a model is updated.
 *
 * @event UPDATED
 * @param model The model that was updated.
 * @note Emitted by the `update()` method.
 */
export const UPDATED = Symbol('UPDATED');

/**
 * Event emitted before a model is deleted.
 *
 * @event DELETE
 * @param model The model that will be deleted.
 * @note Emitted by the `delete()` method.
 */
export const DELETE = Symbol('DELETE');

/**
 * Event emitted after a model is deleted.
 *
 * @event DELETED
 * @param model The model that was deleted.
 * @note Emitted by the `delete()` method.
 */
export const DELETED = Symbol('DELETED');

/**
 * Event emitted before a model is linked to another model.
 *
 * @event LINK
 * @param main The model being linked.
 * @param model The model to link with.
 * @param data The data to insert alongside the foreign keys.
 * @note Emitted by the `link()` method.
 */
export const LINK = Symbol('LINK');

/**
 * Event emitted after a model is linked to another model.
 *
 * @event LINKED
 * @param main The model that was linked.
 * @param model The model it was linked with.
 * @param data The data that was inserted alongside the foreign keys.
 * @note Emitted by the `link()` method.
 */
export const LINKED = Symbol('LINKED');

/**
 * Event emitted before multiple models are linked to another model.
 *
 * @event LINK_MANY
 * @param main The model being linked.
 * @param models The models to link with.
 * @param data The data to insert alongside the foreign keys.
 * @note Emitted by the `linkMany()` method.
 */
export const LINK_MANY = Symbol('LINK_MANY');

/**
 * Event emitted after multiple models are linked to another model.
 *
 * @event LINKED_MANY
 * @param main The model that was linked.
 * @param models The models it was linked with.
 * @param data The data that were inserted alongside the foreign keys.
 * @note Emitted by the `linkMany()` method.
 */
export const LINKED_MANY = Symbol('LINKED_MANY');

/**
 * Event emitted before a model is unlinked from another model.
 *
 * @event UNLINK
 * @param main The model being unlinked.
 * @param model The model to unlink from.
 * @note Emitted by the `unlink()` method.
 */
export const UNLINK = Symbol('UNLINK');

/**
 * Event emitted after a model is unlinked from another model.
 *
 * @event UNLINKED
 * @param main The model that was unlinked.
 * @param model The model it was unlinked from.
 * @note Emitted by the `unlink()` method.
 */
export const UNLINKED = Symbol('UNLINKED');

/**
 * Event emitted before multiple models are unlinked from another model.
 *
 * @event UNLINK_MANY
 * @param main The model being unlinked.
 * @param models The models to unlink from.
 * @note Emitted by the `unlinkMany()` method.
 */
export const UNLINK_MANY = Symbol('UNLINK_MANY');

/**
 * Event emitted after multiple models are unlinked from another model.
 *
 * @event UNLINKED_MANY
 * @param main The model that was unlinked.
 * @param models The models it was unlinked from.
 * @note Emitted by the `unlinkMany()` method.
 */
export const UNLINKED_MANY = Symbol('UNLINKED_MANY');

/**
 * Custom error class for Model.
 * This error is thrown when there is an issue related to Model operations
 */
export class ModelError extends Error {}

/**
 * Provides easy-to-use methods for performing CRUD operations (`INSERT`, `SELECT`, `UPDATE`, `DELETE`),
 * while supporting complex queries, relationships (`OneToOne`, `OneToMany`, `ManyToMany`),
 * and advanced features like joins, pagination, and dynamic filtering.
 */
export class Model {
  /**
   * The column name used for the `createdAt` timestamp.
   * @protected
   */
  protected static createdAt: string;

  /**
   * The column name used for the `updatedAt` timestamp.
   * @protected
   */
  protected static updatedAt: string;

  /**
   * Indicates whether timestamps (`createdAt` and `updatedAt`) handling is enabled.
   * @protected
   */
  protected static timestamps: boolean;

  /**
   * The name of the table associated with this model.
   * @protected
   */
  protected static table: string;

  /**
   * The name of the primary key column.
   * @protected
   */
  protected static primaryKey: string;

  /**
   * The name of the foreign key column.
   * @protected
   */
  protected static foreignKey: string;

  /**
   * The list of column names to select for this model.
   * @protected
   */
  protected static columns: string[];

  /**
   * The list of columns to be ignored in update.
   * @protected
   */
  protected static ignore: string[];

  /**
   * A list of modifiers registered for the model's columns.
   * @protected
   */
  protected static modifiers: Modifiers;

  /**
   * The event emitter instance used for handling model-related events.
   * @private
   */
  private static emitter: EventEmitter;

  /**
   * The builder instance associated with the model (required).
   * @public
   */
  public static builder: Builder;

  /**
   * Constructs a new `Model` instance.
   *
   * @param row An optional object to initialize the model's properties.
   */
  constructor(row?: Row) {
    if (isObj(row)) {
      Object.keys(row).forEach((column) => {
        this[column] = row[column];
      });
    }
  }

  /**
   * Getter methods to retrieve the configuration of your `Model` sub-class.
   *
   * These getters are used to access static properties such as table name, primary key, timestamps,
   * and more. They ensure you can retrieve the correct values for your model's configuration at runtime.
   */
  public static get get() {
    (Getter as any).context = this;
    return Getter;
  }

  /**
   * Provides methods to perform `SELECT`, `UPDATE`, or `DELETE` operations based on a specified condition.
   *
   * @param condition A function that defines the condition for the `WHERE` clause.
   * @returns A class with methods to execute the corresponding SQL operation (`select`, `update`, or `delete`).
   */
  public static where(condition: (col: Col, con: Con) => void): typeof Where {
    (Where as any).condition = condition;
    (Where as any).context = this;
    return Where;
  }

  /**
   * Finds a model instance by its primary key.
   *
   * This method queries the database to find a single record that matches the provided primary key.
   *
   * @param key The primary key of the model to search for. This can be either a string or a number.
   * @returns Promise resolves to the model instance, or `undefined` if no record matches the primary key.
   *
   * @notes
   * - The primary key do not have to be a `number` they can be any value that uniquely identifies a record.
   *   This includes `emails`, `UUIDs`, or any other custom unique identifiers.
   */
  public static find(key: number | string): Promise<Model | void> {
    return new Promise((resolve, reject) => {
      if (!(isNum(key) || isStr(key))) {
        return reject(new ModelError(`Invalid key: ${String(key)}`));
      }

      this.select()
        .where((col) => col(this.get.pk()).equal(key))
        .exec()
        .then((models) => resolve(models[0]))
        .catch(reject);
    });
  }

  /**
   * Finds multiple model instances by their primary keys.
   *
   * This method queries the database to find multiple records that match the provided primary keys.
   *
   * @param keys An array of primary keys to search for. Each key can be either a string or a number.
   * @returns Promise resolves to an array of model instances. If no models are found, it resolves to an empty array.
   *
   * @notes
   * - The primary keys do not have to be `numbers` they can be any value that uniquely identifies a record.
   *   This includes `emails`, `UUIDs`, or any other custom unique identifiers.
   */
  public static findMany(keys: Array<number | string>): Promise<Array<Model>> {
    return new Promise((resolve, reject) => {
      if (!isFullArr(keys)) {
        return reject(new ModelError(`Invalid keys: ${String(keys)}`));
      }

      this.select()
        .where((col) => col(this.get.pk()).in(...keys))
        .exec()
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Inserts a new row into the model's associated table.
   *
   * @param row An object where the keys are column names and the values to insert into the table.
   * @returns Promise that resolves to the newly created model instance.
   * @throws `ModelError` if the provided row is invalid.
   *
   * @notes
   * - If timestamps handling is enabled, the `created_at` and `updated_at` columns will be automatically populated with the current date and time.
   * - The method will emit `INSERT` event before the row is inserted and `INSERTED` event after the row is successfully inserted.
   * - The inserted row's primary key is automatically assigned and returned as part of the model instance.
   */
  public static insert(row: Row): Promise<Model> {
    return new Promise((resolve, reject) => {
      if (!isFullObj(row)) {
        return reject(new ModelError(`Invalid row: ${String(row)}`));
      }

      if (this.get.timestamps()) {
        row[this.get.createdAt()] = UTC.get.datetime();
        row[this.get.updatedAt()] = UTC.get.datetime();
      }

      this.get.emitter().emit(INSERT, row);

      const builder = this.get.builder();
      const connection = builder.get.connection();
      const insert = builder.insert();
      const pk = this.get.pk();

      if (isPostgreSQL(connection.driver)) insert.returning(pk);

      insert
        .into(this.get.table())
        .row(row)
        .exec()
        .then((result: string | number | Row) => {
          const columns = Object.keys(row);
          const values = Object.values(row);

          columns.unshift(pk);
          values.unshift(isObj(result) ? result[pk] : result);

          const entries = columns.map((col, index) => [col, values[index]]);
          const model = new this(modify(this, Object.fromEntries(entries)));

          this.get.emitter().emit(INSERTED, model);

          resolve(model);
        })
        .catch(reject);
    });
  }

  /**
   * Inserts multiple rows into the model's associated table using a bulk insert statement.
   *
   * @param rows An array of objects, where each object represents a row to be inserted into the table.
   * @returns A promise that resolves to an array of model instances.
   * @throws `ModelError` if the provided rows are invalid (i.e., if the rows are not an array of objects).
   *
   * @notes
   * - If timestamps handling is enabled, the `created_at` and `updated_at` columns will be automatically populated with the current date and time for each row.
   * - The method will emit the `INSERT_MANY` event before the rows are inserted and the `INSERTED_MANY` event after the rows are successfully inserted.
   * - For `PostgreSQL`: The resolved model instances include their primary keys.
   * - For `MySQL` & `SQLite`: The resolved model instances do not include primary keys.
   */
  public static insertMany(rows: Rows): Promise<Array<Model>> {
    return new Promise((resolve, reject) => {
      if (!isArrOfObj(rows)) {
        return reject(new ModelError(`Invalid rows: ${String(rows)}`));
      }

      const datetime = UTC.get.datetime();
      const createdAt = this.get.createdAt();
      const updatedAt = this.get.updatedAt();

      if (this.get.timestamps()) {
        rows.forEach((row) => {
          row[createdAt] = datetime;
          row[updatedAt] = datetime;
        });
      }

      this.get.emitter().emit(INSERT_MANY, rows);

      const builder = this.get.builder();
      const connection = builder.get.connection();
      const insert = builder.insert();
      const pk = this.get.pk();

      if (isPostgreSQL(connection.driver)) insert.returning(pk);

      insert
        .into(this.get.table())
        .rows(rows)
        .exec()
        .then((result: Rows | Row | void) => {
          if (isArr(result)) {
            rows = rows.map((row, index) => {
              const columns = Object.keys(row);
              const values = Object.values(row);

              // add pk
              values.unshift(result[index][pk]);
              columns.unshift(pk);

              const entries = columns.map((col, index) => [col, values[index]]);
              return Object.fromEntries(entries);
            });
          }

          const models = rows.map((row) => new this(modify(this, row)));
          this.get.emitter().emit(INSERTED_MANY, models);
          resolve(models);
        })
        .catch(reject);
    });
  }

  /**
   *  Select records from the model's associated table using a `Selector` instance.
   *
   * @returns A `Selector` instance that can be used to build the query.
   *
   * @notes
   * - When joining tables that have columns with the same name (e.g., `id`), use column aliases
   *   to differentiate between them (e.g., `users.id`, `profiles.id AS profile_id`).
   * - You can chain additional methods on the `Selector` instance to further refine your query,
   *   such as `.where()`, `.groupBy()`, `.orderBy()`, `.limit()`, etc.
   * - Columns and table are automatically set based on the model configuration, so you don’t need
   *   to specify them unless you want to select specific columns.
   * - Use `.exec()` or `.all()` to execute the query and retrieve the results as an array of model instances.
   */
  public static select() {
    return new Selector(this.get.builder().get.connection(), this)
      .from(this.get.table())
      .col(...this.get.columns());
  }

  /**
   * Get the class of the current model instance. It's useful for configuring the model or accessing static configuration.
   *
   * @returns The class of the current model instance.
   */
  public model(): typeof Model {
    return this.constructor as typeof Model;
  }

  /**
   * Get the value of a specified column.
   *
   * @param column The name of the column whose value is to be retrieved.
   * @returns The value of the specified column.
   * @throws `ModelError` if the column name is invalid or the value is not defined.
   */
  public valueOf(column: string): string | number {
    if (!isFullStr(column)) {
      throw new ModelError(`Invalid column name: ${String(column)}`);
    }

    if (isDefined(this[column])) return this[column];

    throw new ModelError(`Invalid ${column} value: ${String(this[column])}`);
  }

  /**
   * Deletes the current model instance from the database.
   *
   * This method deletes the record associated with the current instance using the model's primary key.
   *
   * @returns A promise that resolves when the deletion is complete.
   * @throws An error if the primary key is missing or the deletion fails.
   *
   * @notes
   * - The method triggers the `DELETE` event before the deletion and the `DELETED` event after the deletion.
   * - Ensure that the primary key is set on the instance before calling `delete()`.
   */
  public delete(): Promise<void> {
    return new Promise((resolve, reject) => {
      const model = this.model();
      const pk = model.get.pk();

      model.get.emitter().emit(DELETE, this);

      model.get
        .builder()
        .delete()
        .from(model.get.table())
        .where((col) => col(pk).equal(this.valueOf(pk)))
        .exec()
        .then(() => {
          model.get.emitter().emit(DELETED, this);
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Updates the current model instance in the database.
   *
   * This method updates the record associated with the current instance using the model's primary key.
   * Additionally, it automatically updates the `updatedAt` timestamp if timestamps handing is enabled.
   *
   * @returns A promise that resolves when the update is complete.
   * @throws An error if the update fails or the primary key is missing.
   *
   * @notes
   * - The method triggers the `UPDATE` event before the update and the `UPDATED` event after the update.
   * - Ensure that the primary key is set on the instance before calling `update()`.
   * - If the model has timestamps handling enabled, the `updatedAt` field will be updated automatically.
   */
  public update(): Promise<void> {
    return new Promise((resolve, reject) => {
      const model = this.model();
      const pk = model.get.pk();
      const row = filter(model.get.ignore(), this);

      if (model.get.timestamps()) {
        row[model.get.updatedAt()] = UTC.get.datetime();
      }

      model.get.emitter().emit(UPDATE, row);

      model.get
        .builder()
        .update()
        .table(model.get.table())
        .set(row)
        .where((col) => col(pk).equal(this.valueOf(pk)))
        .exec()
        .then(() => {
          Object.keys(row).forEach((key) => (this[key] = row[key]));
          model.get.emitter().emit(UPDATED, this);
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Links the current model instance to another model instance by creating a relationship record in the database.
   *
   * This method inserts a new record into a link table, making a `Many-to-Many` relationship between the current model and the provided model.
   *
   * @param model The model to link to.
   * @param table The name of the link table. If not provided, the default link table is used.
   * @param row Additional data to insert beside the foreign keys of the models.
   * @returns A promise that resolves when the link is created successfully.
   * @throws An error if the provided model is not a valid instance of `Model` or if the linking operation fails.
   *
   * @notes
   * - The method requires that the provided model is a valid instance of `Model`.
   * - If the `table` argument is not provided, the method uses a default table name, which is generated by combining the two model names in `alphabetical` order (e.g., linking `Category` to `Post` results in the table `category_post`).
   * - Foreign keys for both the parent and child models are automatically set so you don't need to provide them.
   * - The method triggers the `LINK` event before the link is created and the `LINKED` event after the link is created.
   */
  public link(model: Model, table?: string, row?: Row): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!isChildOf(model, Model)) {
        return reject(new ModelError(`Invalid link model`));
      }

      const parent = this.model();
      const child = model.model();

      table = isFullStr(table) ? table : parent.get.link(child);
      row = isObj(row) ? row : {};

      row[parent.get.fk()] = this.valueOf(parent.get.pk());
      row[child.get.fk()] = model.valueOf(child.get.pk());

      parent.get.emitter().emit(LINK, this, model, row);

      parent.get
        .builder()
        .insert()
        .into(table)
        .row(row)
        .exec()
        .then(() => {
          parent.get.emitter().emit(LINKED, this, model, row);
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Links multiple model instances to the current model instance.
   *
   * This method inserts multiple records into a link table, making a `Many-to-Many` relationship between the current model and each of the provided models.
   *
   * @param models An array of models to link to the current model.
   * @param table The name of the link table. If not provided, the default link table is used.
   * @param rows Additional data to insert beside the foreign keys of the models.
   * @returns A promise that resolves when all the links are created successfully.
   * @throws An error if the provided models are not valid instances of `Model`, or if the linking operation fails.
   *
   *
   * @notes
   * - The method requires that the provided models are valid instances of `Model` and of the same type.
   * - If the `table` argument is not provided, the method uses a default table name, which is generated by combining the two model names in `alphabetical` order (e.g., linking `Category` to `Post` results in the table `category_post`).
   * - Foreign keys for both the parent and child models are automatically set, so you don't need to provide them manually.
   * - The method triggers the `LINK_MANY` event before the links are created and the `LINKED_MANY` event after the links are created.
   */
  public linkMany(
    models: Array<Model>,
    table?: string,
    rows?: Rows
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!isFullArr(models)) {
        return reject(new ModelError(`Invalid link models`));
      }

      if (models.some((m) => !isChildOf(m, Model))) {
        return reject(new ModelError(`Invalid link models`));
      }

      if (models.some((m) => m.constructor !== models[0].constructor)) {
        return reject(new ModelError(`Invalid link models`));
      }

      const parent = this.model();
      const entries: any[] = [];

      table = isFullStr(table) ? table : parent.get.link(models[0].model());

      rows = isArrOfObj(rows) ? rows : [];

      models.forEach((model, index) => {
        const child = model.model();
        const row: any = {};

        row[parent.get.fk()] = this.valueOf(parent.get.pk());
        row[child.get.fk()] = model.valueOf(child.get.pk());

        if (rows[index]) {
          Object.assign(row, rows[index]);
        }

        entries.push(row);
      });

      parent.get.emitter().emit(LINK_MANY, this, models, entries);

      parent.get
        .builder()
        .insert()
        .into(table)
        .rows(entries)
        .exec()
        .then(() => {
          parent.get.emitter().emit(LINKED_MANY, this, models, entries);
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Unlinks the current model instance from another model instance.
   *
   * This method deletes the record from the link table which represents a `Many-to-Many` relationship between the two models.
   *
   * @param model The model to unlink from the current model.
   * @param table The name of the link table. If not provided, the default link table is used.
   * @returns A promise that resolves when the unlink operation is complete.
   * @throws An error if the provided model is not a valid instance of `Model` or if the unlink operation fails.
   *
   * @notes
   * - The method requires that the provided model is a valid instance of `Model`.
   * - If the `table` argument is not provided, the method uses a default table name, which is generated by combining the two model names in `alphabetical` order (e.g., linking `Category` to `Post` results in the table `category_post`).
   * - The method triggers the `UNLINK` event before the unlink and the `UNLINKED` event after the unlink.
   */
  public unlink(model: Model, table?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!isChildOf(model, Model)) {
        return reject(new ModelError(`Invalid unlink model`));
      }

      const parent = this.model();
      const child = model.model();

      table = isFullStr(table) ? table : parent.get.link(child);

      parent.get.emitter().emit(UNLINK, this, model);

      parent.get
        .builder()
        .delete()
        .from(table)
        .where((col, con) => {
          col(parent.get.fk()).equal(this.valueOf(parent.get.pk()));
          con.and();
          col(child.get.fk()).equal(model.valueOf(child.get.pk()));
        })
        .exec()
        .then(() => {
          parent.get.emitter().emit(UNLINKED, this, model);

          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Unlinks multiple model instances from the current model instance.
   *
   * This method deletes multiple records from the link table which represents a Many-to-Many relationship between the models.
   *
   * @param models An array of models to unlink from the current model.
   * @param table The name of the link table. If not provided, the default link table is used.
   * @returns A promise that resolves when all the unlink operations are complete.
   * @throws An error if the provided models are not valid instances of `Model`, or if the unlink operation fails.
   *
   * @notes
   * - The method requires that the provided models are valid instances of `Model` and of the same type.
   * - If the `table` argument is not provided, the method uses a default table name, which is generated by combining the two model names in `alphabetical` order (e.g., linking `Category` to `Post` results in the table `category_post`).
   * - The method triggers the `UNLINK_MANY` event before the unlink and the `UNLINKED_MANY` event after the unlink.
   */
  public unlinkMany(models: Array<Model>, table?: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!isFullArr(models)) {
        return reject(new ModelError(`Invalid unlink models`));
      }

      if (models.some((m) => !isChildOf(m, Model))) {
        return reject(new ModelError(`Invalid unlink models`));
      }

      if (models.some((m) => m.constructor !== models[0].constructor)) {
        return reject(new ModelError(`Invalid unlink models`));
      }

      const parent = this.model();
      const child = models[0].model();

      table = isFullStr(table) ? table : parent.get.link(child);

      parent.get.emitter().emit(UNLINK_MANY, this, models);

      parent.get
        .builder()
        .delete()
        .from(table)
        .where((col, con) => {
          col(parent.get.fk()).equal(this.valueOf(parent.get.pk()));
          con.and();
          col(child.get.fk()).in(
            ...models.map((model) => model.valueOf(child.get.pk()))
          );
        })
        .exec()
        .then(() => {
          parent.get.emitter().emit(UNLINKED_MANY, this, models);
          resolve();
        })
        .catch(reject);
    });
  }

  /**
   * Retrieves the related model instance in a `One-to-One` relationship.
   *
   * This method performs a query to find a single related model instance associated with the current model instance.
   *
   * @param model The related model class to fetch (must be a subclass of `Model`).
   * @returns A promise that resolves with the related model if found, or `undefined` if not found.
   * @throws An error if the provided model is invalid, or has multiple related models (invalid `One-to-One` relationship).
   *
   * @notes
   * - This method assumes that the relationship between the two models is `One-to-One`, meaning each instance in the parent model should correspond to only one instance in the child model.
   * - If more than one related model is found, the method will throw an error to maintain the integrity of the `One-to-One` relationship.
   * - The `model` parameter must be a valid subclass of `Model`.
   */
  protected OneToOne<M>(model: typeof Model): Promise<M | undefined> {
    return new Promise((resolve, reject) => {
      if (!isSubclass(model, Model)) {
        return reject(new ModelError(`Invalid model: ${String(model)}`));
      }

      const child = model;
      const parent = this.model();

      // Example SQL: SELECT FROM profiles WHERE user_id = 1;
      return child
        .select()
        .where((col) =>
          col(parent.get.fk()).equal(this.valueOf(parent.get.pk()))
        )
        .exec()
        .then((models: Array<any>) => {
          if (models.length > 1) {
            return reject(
              new ModelError(
                `Invalid OneToOne relationship: ${parent.name} has more than one ${child.name}`
              )
            );
          }

          resolve(models[0]);
        })
        .catch(reject);
    });
  }

  /**
   * Retrieves the related parent model instance in a reverse `One-to-One` relationship.
   *
   * This method performs a query to find the parent model associated with the current child model instance.
   *
   * It assumes the relationship between the two models is a `One-to-One` relationship, with the child model (`Profile`) referencing the parent model (`User`) through a foreign key.
   *
   * @param model The parent model class to fetch (must be a subclass of `Model`).
   * @returns A promise that resolves with the related parent model if found, or `undefined` if not found.
   * @throws An error if the provided model is invalid, or has multiple related models (invalid `One-to-One` relationship).
   *
   * @notes
   * - This method assumes a `One-to-One` relationship where the child model contains a foreign key referencing the parent model.
   * - If more than one related model instance is found, an error will be thrown to maintain the integrity of the `One-to-One` relationship.
   * - The `model` parameter must be a valid subclass of `Model`, otherwise an error will be thrown.
   * - **Use `OneToOne`** to fetch the **child model** (e.g., `Profile`) from the **parent model** (e.g., `User`).
   * - **Use `References`** to fetch the **parent model** (e.g., `User`) from the **child model** (e.g., `Profile`).
   */
  protected References<M>(model: typeof Model): Promise<M | undefined> {
    return new Promise((resolve, reject) => {
      if (!isSubclass(model, Model)) {
        return reject(new ModelError(`Invalid model: ${String(model)}`));
      }

      const parent = model as unknown as typeof Model;
      const child = this.model();

      // Example SQL: SELECT FROM users WHERE id = 1;
      return parent
        .select()
        .where((col) =>
          col(parent.get.pk()).equal(this.valueOf(parent.get.fk()))
        )
        .exec()
        .then((models: Array<any>) => {
          if (models.length > 1) {
            return reject(
              new ModelError(
                `Invalid OneToOne relationship: ${child.name} references many ${parent.name}`
              )
            );
          }

          resolve(models[0]);
        })
        .catch(reject);
    });
  }

  /**
   * Retrieves related child model instances in a `One-to-Many` relationship.
   *
   * This method fetches all related child model instances (e.g., multiple `Post` instances for a `User`)
   * associated with the current parent model instance (e.g., `User`).
   *
   * The relationship is assumed to be `One-to-Many`, where the child model contains a foreign key referencing the parent model.
   *
   * @param model The child model class to fetch (must be a subclass of `Model`).
   * @returns A promise that resolves with an array of related child models, or an empty array if no one found.
   * @throws An error if the provided model is invalid, or if the relationship cannot be established.
   *
   * @notes
   * - This method assumes a `One-to-Many` relationship where the child model (e.g., `Post`) contains a foreign key referencing the parent model (e.g., `User`).
   * - The `model` parameter must be a valid subclass of `Model`, otherwise an error will be thrown.
   * - This method fetches all related child models by querying for all records in the child table that have a foreign key pointing to the current parent model.
   * - The returned array will contain all related child model instances, or an empty array if no related models are found.
   */
  protected OneToMany<M>(model: typeof Model): Promise<Array<M>> {
    return new Promise((resolve, reject) => {
      if (!isSubclass(model, Model)) {
        return reject(new ModelError(`Invalid model: ${String(model)}`));
      }

      const child = model;
      const parent = this.model();

      return child
        .select()
        .where((col) =>
          col(parent.get.fk()).equal(this.valueOf(parent.get.pk()))
        )
        .exec()
        .then(resolve as () => M)
        .catch(reject);
    });
  }

  /**
   * Retrieves related child model instances in a `Many-to-Many` relationship.
   *
   * This method fetches all related child model instances (e.g., multiple `Category` instances for a `Post`)
   * associated with the current parent model instance (e.g., `Post`).
   *
   * It assumes a `Many-to-Many` relationship where the link between the models is stored in a separate pivot (link) table.
   *
   * @param model The child model class to fetch (must be a subclass of `Model`).
   * @param table The name of the pivot (link) table that connects the two models.
   * @returns A promise that resolves with an array of related child models, or an empty array if no one found.
   * @throws An error if the provided model is invalid, or if the relationship cannot be established.
   *
   * @notes
   * - This method assumes a `Many-to-Many` relationship where a link table exists to connect the parent model (e.g., `Post`) and the child model (e.g., `Category`).
   * - The `table` parameter specifies the name of the link table. If not provided, the default table name is generated by combining the parent and child model names alphabetically.
   * - The `model` parameter must be a valid subclass of `Model`, otherwise an error will be thrown.
   * - This method performs a SQL `JOIN` between the parent model's table and the link table to retrieve the related child models.
   * - The returned array will contain all related child model instances, or an empty array if no related models are found.
   */
  protected ManyToMany<M>(
    model: typeof Model,
    table?: string,
    ...columns: Array<string>
  ): Promise<Array<M>> {
    return new Promise((resolve, reject) => {
      if (!isSubclass(model, Model)) {
        return reject(new ModelError(`Invalid model: ${String(model)}`));
      }

      const child = model;
      const parent = this.model();

      // set link table
      table = isFullStr(table) ? table : parent.get.link(child);
      columns = isArrOfStr(columns) ? columns : [];

      child
        .select()
        .col(...child.get.columns(), ...columns.map((col) => `${table}.${col}`))
        .join(table, (col) =>
          col(`${child.get.table()}.${child.get.pk()}`).equal(
            ref(`${table}.${child.get.fk()}`)
          )
        )
        .where((col) =>
          col(`${table}.${parent.get.fk()}`).equal(
            this.valueOf(parent.get.pk())
          )
        )
        .exec()
        .then(resolve as any)
        .catch(reject);
    });
  }
}
