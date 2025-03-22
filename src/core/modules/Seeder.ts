import { Faker, isChildOf, isInt, isObj, isSnakeCase } from '../../helpers';
import { Builder } from './Builder';

/**
 * Defines the type for the `get` property in `Seeder`, which provides access to various
 * properties.
 */
type Getter = {
  /**
   * Retrieves the table name, ensuring it's a valid snake_case string.
   * @returns The name of the table.
   * @throws `SeederError` if the table name is not in snake_case.
   */
  table: () => string;

  /**
   * Retrieves the number of rows to seed, ensuring it's a positive integer.
   * @returns The number of rows to seed.
   * @throws `SeederError` if the rows count is not a positive integer.
   */
  rows: () => number;

  /**
   * Retrieves the `Builder` instance for database operations.
   * @returns  The builder instance for seeding operations.
   * @throws `SeederError` if the builder is not a `Builder` instance.
   */
  builder: () => Builder;

  /**
   * Retrieves the `Faker` instance used for generating fake data.
   * @returns  The faker instance for data generation.
   * @throws `SeederError` if the faker is not a `Faker` instance.
   */
  faker: () => Faker;
};

/**
 * Defines the type for the `set` property in `Seeder`, which allows setting various
 * properties.
 */
type Setter = {
  /**
   * Sets the table name after validating it as a snake_case string.
   * @param table The name of the table in snake_case format.
   * @returns Returns the Seeder instance for chaining.
   * @throws `SeederError` if the table name is not in snake_case.
   */
  table: (table: string) => Seeder;

  /**
   * Sets the number of rows to seed, ensuring it is a positive integer.
   * @param rows The number of rows to seed.
   * @returns Returns the Seeder instance for chaining.
   * @throws `SeederError` if the rows count is not a positive integer.
   */
  rows: (rows: number) => Seeder;

  /**
   * Sets the `Builder` instance for database operations.
   * @param builder The builder instance for seeding operations.
   * @returns Returns the Seeder instance for chaining.
   * @throws `SeederError` if the builder is not a `Builder` instance.;
   */
  builder: (builder: Builder) => Seeder;

  /**
   * Sets the `Faker` instance for generating fake data.
   * @param faker - The faker instance for data generation.
   * @returns Returns the Seeder instance for chaining.
   * @throws `SeederError` if the faker is not a `Faker` instance.
   */
  faker: (faker: Faker) => Seeder;
};

/**
 * Custom error class for handling errors specific to the Seeder operations.
 * Inherits from the built-in Error class.
 */
export class SeederError extends Error {}

/**
 * The `Seeder` class serves as an abstract base for managing database seeding operations.
 * It encapsulates the functionality to configure essential properties such as the target table,
 * number of rows to be inserted, the database builder, and the faker instance for generating
 * randomized data.
 *
 * To utilize this class, extend it and implement the `layout` method, which defines the structure
 * and content of each row to be seeded in the specified table.
 */
export abstract class Seeder {
  /**
   * Name of the table to be seeded.
   * Set via `set.table()`.
   */
  private table: string;

  /**
   * Number of rows to be inserted.
   * Set via `set.rows()`.
   */
  private rows: number;

  /**
   * Instance of `Builder` to handle database interactions.
   * Set via `set.builder()`.
   */
  private builder: Builder;

  /**
   * Instance of `Faker` used to generate fake data for seeding.
   * Defaults to a new `Faker` instance.
   */
  private faker = new Faker();

  /**
   * Provides setter functions for configuring properties of the `Seeder` instance,
   * including `table`, `rows`, `builder`, and `faker`.
   */
  public set: Setter = {
    table: (table: string): this => {
      if (!isSnakeCase(table)) {
        throw new SeederError(
          `Invalid table name in: ${this.constructor.name}`
        );
      }

      this.table = table;
      return this;
    },
    rows: (rows: number): this => {
      if (!isInt(rows) || rows <= 0) {
        throw new SeederError(
          `Invalid rows number in: ${this.constructor.name}`
        );
      }

      this.rows = rows;
      return this;
    },
    builder: (builder: Builder): this => {
      if (!isChildOf(builder, Builder)) {
        throw new SeederError(`Invalid builder in: ${this.constructor.name}`);
      }

      this.builder = builder;
      return this;
    },
    faker: (faker: Faker): this => {
      if (!isChildOf(faker, Faker)) {
        throw new SeederError(`Invalid faker in: ${this.constructor.name}`);
      }

      this.faker = faker;
      return this;
    },
  };

  /**
   * Provides getter functions for retrieving validated properties of the `Seeder` instance,
   * including `table`, `rows`, `builder`, and `faker`.
   */
  public get: Getter = {
    table: (): string => {
      if (!isSnakeCase(this.table)) {
        throw new SeederError(
          `Invalid table name in: ${this.constructor.name}`
        );
      }

      return this.table;
    },
    rows: (): number => {
      if (!isInt(this.rows) || this.rows <= 0) {
        throw new SeederError(
          `Invalid rows number in: ${this.constructor.name}`
        );
      }

      return this.rows;
    },
    builder: (): Builder => {
      if (!isChildOf(this.builder, Builder)) {
        throw new SeederError(`Invalid builder in: ${this.constructor.name}`);
      }

      return this.builder;
    },
    faker: (): Faker => {
      if (!isChildOf(this.faker, Faker)) {
        throw new SeederError(`Invalid faker in: ${this.constructor.name}`);
      }

      return this.faker;
    },
  };

  /**
   * Constructs a new instance of the `Seeder` class.
   *
   * This constructor prevents direct instantiation of the `Seeder` class.
   * To create a seeder, extend this class and implement the `layout` method,
   * then instantiate the subclass instead.
   *
   * @throws `SeederError` if an attempt is made to instantiate `Seeder` directly.
   */
  constructor() {
    if (new.target === Seeder) {
      throw new SeederError('Cannot construct Seeder instances directly');
    }
  }

  /**
   * Seeds the target table with a specified number of rows, using the configured layout for each row.
   *
   * This method generates a collection of rows based on the user-defined layout structure
   * (defined in the `layout` method), validates each row, and then performs a batch insertion into the database.
   * The seeding operation is handled using the configured builder instance.
   *
   * @returns A promise that resolves when the seeding is successfully completed.
   * @throws `SeederError` if the layout structure is invalid, or if `table` or `rows` are invalid.
   * @note Ensure that the table name and layout are correctly defined before invoking `seed()`
   */
  public seed(): Promise<void> {
    return new Promise((resolve, reject) => {
      const rows = [];

      for (let index = 0; index < this.get.rows(); index++) {
        const layout = this.layout();

        if (!isObj(layout)) {
          throw new SeederError(
            `Invalid seeder layout in: ${this.constructor.name}`
          );
        }

        rows.push(layout);
      }

      const insert = this.get.builder().insert<void>().into(this.get.table());

      if (rows.length === 1) insert.row(rows[0]);
      else insert.rows(rows);

      return insert.exec().then(resolve).catch(reject);
    });
  }

  /**
   * Clears all data from the target table by performing a DELETE operation.
   *
   * This method deletes all rows from the configured table using a raw SQL `DELETE FROM`
   * command. The operation is handled through the builder instance associated with this seeder.
   *
   * @returns A promise that resolves once all rows have been successfully deleted from the table.
   * @throws `QueryError` if the `table` property is not set or if the deletion operation encounters an error.
   * @note Use caution when calling `clear()` on tables containing important data, as this will remove all rows.
   */
  public clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.get
        .builder()
        .raw<void>(`DELETE FROM ${this.get.table()}`)
        .then(resolve)
        .catch(reject);
    });
  }

  /**
   * Defines the structure of a single row to be seeded in the target table.
   *
   * Override this method in a subclass to specify the layout and data schema for each row,
   * utilizing the `Faker` instance for generating dynamic, randomized values.
   *
   * @returns An object representing the data structure for a single row.
   * @throws `SeederError` if this method is not overridden in a subclass.
   */
  protected layout(): any {
    throw new SeederError(
      `Seeder layout is missing in: ${this.constructor.name}`
    );
  }
}
