import fs from 'fs/promises';
import { basename, dirname, resolve as resolvePath } from 'path';
import { QueryError } from '../../errors';
import { Generator, Builder } from '../../core';
import {
  hasLength,
  isBool,
  isChildOf,
  isEmptyArr,
  isFullStr,
  isObj,
  isSnakeCase,
  isPromise,
} from '../../helpers';

/**
 * Custom error class for handling errors related to the generator operations.
 *
 * This error is thrown when there are issues with generator entries,
 * such as invalid paths or batch numbers, ensuring that the errors can be
 * distinguished from other types of errors in the application.
 */
export class GeneratorHandlerError extends Error {}

/**
 * Represents a single row in the 'generators' table.
 *
 * @property `id` The unique identifier for the row.
 * @property `batch` The generator batch number.
 * @property `path` The generator file path.
 */
type Row = { id: number; batch: number; path: string };

/**
 * This type is used to represent a set of generators that should be executed together
 * for table creation.
 *
 * @property `paths` An array of generator file paths to be executed.
 * @property `batch` The batch number, used to group tables created together for rollback.
 */
type Gen = { paths: string[]; batch: number };

/**
 * Represents the generator class responsible for handling the creation
 * and management of the 'generators' table in the database.
 *
 * This class extends `Generator` and provides functionality to create
 * and drop the 'generators' table, which is used to store the paths and
 * batch numbers of generator files that have been executed. The batch
 * numbers are required to group tables created together for rollback.
 */
class GeneratorsTable extends Generator {
  /**
   * Creates the 'generators' table with specified columns and constraints.
   *
   * The table includes the following columns:
   * - `id`: The primary key of the table.
   * - `path`: A string representing the path of the generator file, which cannot be null.
   * - `batch`: A small integer representing the batch number, which is unsigned and cannot be null.
   *
   * @returns A promise that resolves when the table schema is successfully created.
   */
  public create(): Promise<void> {
    return this.schema(
      this.column('id').pk(),
      this.column('path').text().notNull(),
      this.column('batch').smallInt().unsigned().notNull()
    );
  }
}

/**
 * Checks if the provided name matches the pattern for a valid generator file.
 *
 * @param name - The name to check if it matches a generator file pattern.
 * @returns `true` if the name matches the generator file pattern (e.g., `01_generate_users_table.js`), otherwise `false`.
 */
function isFile(name: string): boolean {
  // Pattern example: 01_generate_users_table.js
  return /^[0-9]+_generate_[a-z][a-z0-9]*(_[a-z][a-z0-9]*)*_table\.(ts|js)$/.test(
    name
  );
}

/**
 * Checks if the provided name matches the pattern for a valid `typescript` generator file.
 *
 * @param name - The name to check if it matches a `typescript` generator file pattern.
 * @returns `true` if the name matches a `typescript` generator file pattern (e.g., `01_generate_users_table.ts`), otherwise `false`.
 */
function isTsFile(name: string): boolean {
  // Pattern example: 01_generate_users_table.ts
  return /^[0-9]+_generate_[a-z][a-z0-9]*(_[a-z][a-z0-9]*)*_table\.ts$/.test(
    name
  );
}

/**
 * Checks if the provided name matches the pattern for a valid TypeScript output file (map or declaration files...).
 *
 * @param name - The name to check if it matches a TypeScript output file pattern.
 * @returns `true` if the name matches the pattern for a `.js.map` or `.d.ts` file, otherwise `false`.
 */
function isMapFile(name: string): boolean {
  // Pattern example: 01_generate_users_table.js.map or .d.ts
  return /^[0-9]+_generate_[a-z][a-z0-9]*(_[a-z][a-z0-9]*)*_table\.(?!(js|ts)$).+$/.test(
    name
  );
}

/**
 * Retrieves the last generator file number in the specified directory.
 *
 * This function scans for existing generator files in the given path and extracts
 * the highest generator file number. If no files are found, it defaults to returning `0`.
 *
 * @param path The directory path where the generator files are located.
 * @returns Promise that resolves with the next available file number, if no file found resolves with `0`.
 */
function lastNumber(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    fs.readdir(path)
      .then((result) => {
        // resolve with 0
        if (isEmptyArr(result)) return resolve(0);

        // filter map files
        const files = result.filter((name) => !isMapFile(name));

        // validate each file
        for (const file of files) {
          if (isFile(file)) continue;
          return reject(
            new GeneratorHandlerError(`Invalid generator file: ${String(file)}`)
          );
        }

        // Find the highest existing file number
        const match = files.pop().match(/^([0-9]+)_generate_/);
        return resolve(Number(match[1]));
      })
      .catch((e) => reject(new GeneratorHandlerError(e.message)));
  });
}

/**
 * Returns the highest batch number from an array of batch numbers.
 *
 * @param batches - An array of batch numbers to evaluate.
 * @returns The highest batch number in the array, or `0` if the array is empty.
 */
function lastBatch(batches: Array<number>): number {
  if (isEmptyArr(batches)) return 0;

  return batches.reduce((lastBatch, batch) => {
    return batch > lastBatch ? batch : lastBatch;
  }, 0);
}

/**
 * Inserts an array of file paths and a batch number into the 'generators' table.
 *
 * @param paths - An array of file paths to be inserted.
 * @param batch - The batch number associated with these paths.
 * @param builder - The database builder instance used for constructing the query.
 * @returns A promise that resolves when the paths have been successfully inserted into the table.
 */
function add(paths: string[], batch: number, builder: Builder) {
  return new Promise<any>((resolve, reject) => {
    const insert = builder.insert().into('generators');
    const rows = paths.map((path) => ({ path, batch }));

    if (rows.length === 1) insert.row(rows[0]);
    else insert.rows(rows);

    insert.exec().then(resolve).catch(reject);
  });
}

/**
 * Removes specified file paths from the 'generators' table.
 *
 * @param paths - An array of file paths to be removed from the table.
 * @param builder - The database builder instance used for constructing the query.
 * @returns A promise that resolves when the paths have been successfully removed from the table.
 */
function remove(paths: string[], builder: Builder) {
  return new Promise((resolve, reject) => {
    builder
      .delete()
      .from('generators')
      .where((col) => col('path').in(...paths))
      .exec()
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Renames generator files by updating their numbering sequence after a deletion.
 *
 * This function is used internally to ensure that the numbering of generator files
 * remains consistent after a user deletes one or more files. Each group of paths
 * may include related files, such as:
 * - JavaScript files (.js)
 * - TypeScript files (.ts)
 * - Source map files (.js.map)
 *
 * @param groups An array of arrays, where each inner array contains paths to generator files that need to be renamed.
 * @returns Promise that resolves when all files have been successfully renamed.
 */
function rename(groups: string[][]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isEmptyArr(groups)) return resolve();

    const promises = [];

    groups.forEach((group, index) => {
      group.forEach((path) => {
        const newNumber = (index + 1).toString().padStart(2, '0');
        const newName = `${newNumber}${basename(path).replace(/^[0-9]+/, '')}`;
        const newPath = dirname(path).concat('/', newName);
        promises.push(fs.rename(path, newPath));
      });
    });

    return Promise.all(promises)
      .then(() => resolve())
      .catch((error) => reject(new GeneratorHandlerError(error.message)));
  });
}

/**
 * Groups generator file paths by their numeric prefix. This function organizes generator
 * files that share the same numeric prefix into arrays
 *
 * @param paths - An array of file paths representing generator files.
 * @returns An array of arrays, where each inner array represents a group of files that share the same numeric prefix.
 */
function group(paths: string[]): string[][] {
  const storage: { [key: string]: string[] } = {};

  paths.forEach((path) => {
    // prettier-ignore
    const regex = /([0-9]+)_generate_[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)*_table/;
    const number = path.match(regex)[1];

    if (!storage[number]) storage[number] = [];
    storage[number].push(path);
  });

  // Return paths in the correct order
  return Object.keys(storage)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((key) => storage[key]);
}

/**
 * Safely deletes multiple generator files at the specified paths.
 *
 * This function calls `unlink` for each path provided in the array, attempting to
 * remove each corresponding file.
 *
 * @param paths An array of strings representing the absolute paths of the generator files to be deleted.
 * @returns A promise that resolves when files are deleted.
 */
function unlink(paths: string[]): Promise<void> {
  return new Promise<any>((resolve, reject) => {
    return Promise.all(paths.map((path) => fs.unlink(path)))
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Creates a generator class name based on the table name.
 *
 * @param name The snake_case table name.
 * @returns A generator class name.
 */
function toClassName(name: string): string {
  return (
    name
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'TableGenerator'
  );
}

/**
 * Creates a generator file name based on the provided name, number, and extension.
 *
 * @param name The snake_case table name.
 * @param number The file number.
 * @param ext The file extension.
 * @returns A generator file name.
 */
function toFileName(name: string, number: number, ext: string): string {
  return `${(number + 1)
    .toString()
    .padStart(2, '0')}_generate_${name}_table.${ext}`;
}

/**
 * Returns an `s` if the array length is not 1, for pluralization purposes.
 *
 * @param  paths - An array whose length determines the suffix.
 * @returns - Returns an empty string if the array length is 1, otherwise `s`.
 */
function sfx(paths: Array<any>) {
  return paths.length === 1 ? '' : 's';
}

/**
 * The `GeneratorHandler` class is responsible for managing operations related to database
 * generators. It provides functionality to add, remove, execute, and roll back generator files
 * that create or drop tables, ensuring consistent and reliable execution of generation tasks.
 *
 * This class encapsulates the logic required for handling file-based database generation,
 * ensuring consistent operations across tables and generator files.
 *
 */
export class GeneratorHandler {
  /**
   * Rows inserted into the generators table.
   */
  private rows: Array<Row>;

  /**
   * The database builder instance used for executing queries.
   */
  private builder: Builder;

  /**
   * The absolute path to the assets directory.
   */
  private assets: string;

  /**
   * Creates a new handler instance with the specified database builder.
   *
   * @param builder The database builder instance used for constructing queries.
   * @throws `GeneratorHandlerError` if the provided builder is not a valid instance of `Builder`.
   */
  constructor(builder: Builder) {
    if (!isChildOf(builder, Builder)) {
      throw new GeneratorHandlerError(`Invalid builder: ${String(builder)}`);
    }

    this.rows = new Array();
    this.builder = builder;
    this.assets = resolvePath(__dirname, '../../../assets');
  }

  /**
   * Collects the absolute paths of generator files from the specified directory.
   *
   * @param path The directory path from which to collect generator files.
   * @param map A boolean indicating whether to include mapped files (e.g., `.js.map`) in the resulting paths.
   * @returns A promise that resolves with an array of absolute paths to valid generator files.
   * @throws GeneratorHandlerError if there is an issue collecting the files or if an invalid generator file is encountered.
   */
  private collectPaths(path: string, map: boolean): Promise<string[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(path)
        .then((result) => {
          // check if the directory is empty
          if (isEmptyArr(result)) return resolve([]);

          // filter map files
          const files = map
            ? result
            : result.filter((name) => !isMapFile(name));

          // validate each file
          for (const file of files) {
            if (!isFile(file)) {
              if (map && isMapFile(file)) continue;

              return reject(
                new GeneratorHandlerError(
                  `Invalid generator file: ${String(file)}`
                )
              );
            }
          }

          return resolve(files.map((file) => resolvePath(path, file)));
        })
        .catch((e) => reject(new GeneratorHandlerError(e.message)));
    });
  }

  /**
 * Collects exported generator instances from the specified file paths.
 *
 * This method attempts to require each file listed in the provided array of 
 * paths. It expects each file to export either a default instance of `Generator`
 * or a named generator instance. If any of the files do not conform to these 
 * expectations, an error will be thrown.
 *
 * ### Behavior
 * - If no paths are provided or if no valid generators are found, a 
 *   `GeneratorHandlerError` is thrown with a relevant message.
 * - For each path, the method tries to:
 *   - Import the module using `require`.
 *   - Check if the imported module is a valid `Generator` instance.
 *   - If the module exports a named generator, it will check for the first 
 *     property and validate it as a `Generator`.

 *
 * @param paths An array absolute paths to your generator files.
 * @returns An array of `Generator` instances collected from the specified file paths.
 * @throws `GeneratorHandlerError` if no generators are found or if an invalid generator is encountered in any of the specified paths.
 */
  private collectGenerators(paths: string[]): Array<Generator> {
    if (isEmptyArr(paths)) {
      throw new GeneratorHandlerError(`Ops! No generator found`);
    }

    const generators: Array<Generator> = [];

    for (const path of paths) {
      let module: Generator;

      try {
        module = require(path);
      } catch (error) {
        throw new GeneratorHandlerError(error.message);
      }

      // Check if module exports a valid default generator
      if (isChildOf(module, Generator)) {
        generators.push(module as Generator);
        continue;
      }

      // Check if module exports named generators
      if (isObj(module) && hasLength(module, 1)) {
        const key = Object.keys(module)[0];
        const namedGenerator = module[key] as Generator;

        if (isChildOf(namedGenerator, Generator)) {
          generators.push(namedGenerator);
          continue;
        }
      }

      throw new GeneratorHandlerError(`Invalid generator in: ${path}`);
    }

    return generators;
  }

  /**
   * Loads data from the `generators` table or creates the table if it does not exist.
   *
   * This method attempts to retrieve all rows from the `generators` table, storing
   * them in the `this.rows` property. If the `generators` table does not exist,
   * it catches the resulting error and initializes a new `Generator` instance to
   * create the table. This method is useful for ensuring that the necessary
   * table structure is available before performing further actions.
   *
   * @returns Promise resolves once the table data is loaded into `this.rows` or the table is created.
   */
  private load(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.builder
        .raw('SELECT * FROM generators;')
        .then((rows) => {
          this.rows = rows as Array<Row>;
          return resolve();
        })
        .catch((error) => {
          if (!isChildOf(error, QueryError)) return reject(error);

          const generator = new GeneratorsTable();
          generator.set.table('generators');
          generator.set.builder(this.builder);
          generator.create().then(resolve).catch(reject);
        });
    });
  }

  /**
   * Creates tables based on the provided generator files and records their creation in the database.
   *
   * This method sequentially invokes the `create` method on each generator instance in the `paths` array.
   * The method also maintains a record of successfully created tables in the `created` array.
   * If any table fails to be created, the remaining tables in the sequence are not created.
   *
   * @param paths An array of paths to generator files that define the tables to be created.
   * @param batch A batch number i use to group the created tables togother for future rollback.
   * @returns A promise that resolves with a message indicating the number of tables created successfully.
   * @throws `GeneratorHandlerError` If any generator does not contain a valid `create` method or if an
   * error occurs during table creation or batch recording.
   */
  private createTables(paths: string[], batch: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const generators = this.collectGenerators(paths); // Collect generators from paths
      const created: Array<string> = [];

      const create = (index: number = 0): Promise<void> => {
        return new Promise((resolve, reject) => {
          if (index >= generators.length) return resolve();

          const promise = generators[index].set.builder(this.builder).create();

          if (!isPromise(promise)) {
            return reject(
              new GeneratorHandlerError(
                `Invalid create method in: ${generators[index].constructor.name}`
              )
            );
          }

          return promise
            .then(() => {
              created.push(paths[index]);
              return create(index + 1);
            })
            .then(resolve)
            .catch(reject);
        });
      };

      create()
        .then(() => {
          // prettier-ignore
          const message = `${created.length}/${paths.length} table${sfx(paths)} created`;

          return add(created, batch, this.builder)
            .then(() => resolve(message))
            .catch(reject);
        })
        .catch((e) => {
          // prettier-ignore
          const message = `${created.length}/${paths.length} table${sfx(paths)} created: ${e.message}`;

          if (created.length > 0) {
            return add(created, batch, this.builder)
              .then(() => reject(new GeneratorHandlerError(message)))
              .catch(reject);
          }

          return reject(new GeneratorHandlerError(message));
        });
    });
  }

  /**
   * Drops tables based on the provided generator files and records their removal from the database.
   *
   * This method sequentially invokes the `drop` method on each generator instance in the `paths` array.
   * Successfully dropped tables are recorded in the `dropped` array. If any table fails to be
   * dropped, the remaining tables in the sequence are not dropped.
   *
   * @param paths An array of paths to generator files that define the tables to be dropped.
   * @returns A promise that resolves with a message indicating the number of tables dropped successfully.
   * @throws `GeneratorHandlerError` If any generator does not contain a valid `drop` method or if an
   * error occurs during table removal or record deletion.
   */
  private dropTables(paths: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const generators = this.collectGenerators(paths); // Collect generators from paths
      const dropped: Array<string> = [];

      const drop = (index: number = 0): Promise<void> => {
        return new Promise((resolve, reject) => {
          if (index >= generators.length) return resolve();

          const promise = generators[index].set.builder(this.builder).drop();

          if (!isPromise(promise)) {
            return reject(
              new GeneratorHandlerError(
                `Invalid drop method in: ${generators[index].constructor.name}`
              )
            );
          }

          promise
            .then(() => {
              dropped.push(paths[index]);
              return drop(index + 1); // drop next
            })
            .then(resolve)
            .catch(reject);
        });
      };

      drop()
        .then(() => {
          // prettier-ignore
          const message = `${dropped.length}/${paths.length} table${sfx(paths)} dropped`;

          return remove(dropped, this.builder)
            .then(() => resolve(message))
            .catch(reject);
        })
        .catch((e) => {
          // prettier-ignore
          const message = `${dropped.length}/${paths.length} table${sfx(paths)} dropped: ${e.message}`;

          if (dropped.length > 0) {
            return remove(dropped, this.builder)
              .then(() => reject(new GeneratorHandlerError(message)))
              .catch(reject);
          }

          return reject(new GeneratorHandlerError(message));
        });
    });
  }

  /**
   * Prepares the handler to create new tables by:
   * - Finding paths to all generator files
   * - Filtering out files that have already been run, so only unexecuted generators left
   * - Assigning a new batch number for tracking
   *
   * @param path The main folder where generator files are located.
   * @returns A promise that resolves with the new batch number and paths to pending generators.
   * @throws `GeneratorHandlerError` If there are no new generators to run or if loading data or paths fails.
   */
  private beReadyToGenerate(path: string): Promise<Gen> {
    return new Promise((resolve, reject) => {
      this.load()
        .then(() => this.collectPaths(path, false))
        .then((allPaths) => {
          const batches = this.rows.map((r) => r.batch);
          const batch = lastBatch(batches) + 1;

          const DBPaths = this.rows.map((r) => r.path);
          const paths = allPaths.filter((p) => !DBPaths.includes(p));

          if (isEmptyArr(paths)) {
            return reject(new GeneratorHandlerError('Nothing to generate'));
          }

          resolve({ batch, paths });
        })
        .catch(reject);
    });
  }

  /**
   * Prepares the handler to drop tables by:
   * - Retrieving the highest batch number
   * - Collecting paths of all generators in that batch
   *
   * @note Paths are reversed to ensure tables are dropped in the correct order.
   * @returns A promise that resolves with paths to the generator files in the latest batch.
   * @throws `GeneratorHandlerError` If there are no files to rollback or if loading data fails.
   */
  private beReadyToRollback(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.load()
        .then(() => {
          const batch = lastBatch(this.rows.map((g) => g.batch));

          const paths = this.rows
            .filter((g) => g.batch === batch)
            .map((g) => g.path)
            .reverse();

          if (isEmptyArr(paths)) {
            return reject(new GeneratorHandlerError('Nothing to rollback'));
          }

          resolve(paths);
        })
        .catch(reject);
    });
  }

  /**
   * Executes the `create` method for each unexecuted generator to create tables.
   *
   * @param path The main folder where generator files are located.
   * @returns A promise that resolves with a success message if tables are created successfully.
   * @throws `GeneratorHandlerError` If any error occurs during preparation or table creation.
   */
  public generate(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!isFullStr(path)) {
        return reject(
          new GeneratorHandlerError(`Invalid path: ${String(path)}`)
        );
      }

      this.beReadyToGenerate(path)
        .then(({ paths, batch }) => this.createTables(paths, batch))
        .then(resolve) // Resolve if successful
        .catch(reject); // Handle any errors
    });
  }

  /**
   * Executes the `drop` method for each generator associated with the highest batch number.
   *
   * This method ensures that only the tables created in the most recent batch are dropped,
   * preserving any tables created in earlier batches. This allows for targeted rollback of
   * the last set of generator executions without affecting previously created tables.
   *
   * @returns A promise that resolves with a success message if tables are dropped successfully.
   * @throws `GeneratorHandlerError` If any error occurs during preparation or table dropping.
   */
  public rollback(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.beReadyToRollback()
        .then((paths) => this.dropTables(paths))
        .then(resolve) // Resolve if successful
        .catch(reject); // Handle any errors
    });
  }

  /**
   * Creates a new generator file in the specified path.
   *
   * This method generates a new file for the specified table name in the given directory path.
   * You can choose to create a TypeScript file or a JavaScript file based on the provided boolean flag.
   *
   * @param name The snake_case table name for which the generator is created.
   * @param path The directory path where the generator file will be created.
   * @param ts A boolean indicating whether to create a TypeScript file (`true`) or a JavaScript file (`false`).
   * @returns A promise that resolves with a success message indicating the path of the created generator file.
   * @throws `GeneratorHandlerError` If the table name is invalid, the path is empty, or if any errors occur during file operations.
   * @note The table name must be a snake_case table name, e.g., users, category_product.
   */
  public add(name: string, path: string, ts?: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!isSnakeCase(name)) {
        return reject(
          new GeneratorHandlerError(`Invalid table name: ${String(name)}`)
        );
      }

      if (!isFullStr(path)) {
        return reject(
          new GeneratorHandlerError(`Invalid path: ${String(path)}`)
        );
      }

      if (!isBool(ts)) ts = false;

      const ext = ts ? 'ts' : 'js';
      const layout = ts ? 'ts/generator.txt' : 'js/generator.txt';
      const content = resolvePath(this.assets, layout);

      fs.readFile(content, 'utf-8')
        .then((template) => {
          lastNumber(path)
            .then((number) => {
              const className = toClassName(name);
              const fileName = toFileName(name, number, ext);
              const filePath = resolvePath(path, fileName);
              const fileContent = template
                .replace(/\[className\]/g, className)
                .replace(/\[tableName\]/g, name)
                .replace(/\[fileName\]/g, fileName);

              // Create generator file
              fs.writeFile(filePath, fileContent, 'utf-8')
                .then(() => resolve(`Generator added in: ${filePath}`))
                .catch((e) => reject(new GeneratorHandlerError(e.message)));
            })
            .catch((e) => reject(new GeneratorHandlerError(e.message)));
        })
        .catch((e) => reject(new GeneratorHandlerError(e.message)));
    });
  }

  /**
   * Removes the generator associated with the given table name from the specified folder path.
   *
   * This method first drops all tables in the database using the `reset` method, then removes
   * the generator file for the specified table, and finally updates the numbering of each remaining
   * generator file in the folder.
   *
   * @param name The snake_case table name whose associated generator is to be removed.
   * @param path The directory path where the generator files are located.
   * @returns A promise that resolves with a success message indicating how many generator files were removed.
   * @throws `GeneratorHandlerError` If the table name is invalid, the path is empty.
   * @note The table name must be a snake_case table name, e.g., users, category_product.
   */
  public remove(name: string, path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (!isSnakeCase(name)) {
        return reject(
          new GeneratorHandlerError(`Invalid table name: ${String(name)}`)
        );
      }

      if (!isFullStr(path)) {
        return reject(
          new GeneratorHandlerError(`Invalid path: ${String(path)}`)
        );
      }

      return this.collectPaths(path, true)
        .then((paths) => {
          const regex = new RegExp(
            `[0-9]+_generate_${name}_table\.(ts|js|js\.map|d\.ts|d\.ts\.map)$`
          );
          const unlinkPaths = paths.filter((path) => regex.test(path));
          const renamePaths = group(paths.filter((path) => !regex.test(path)));

          if (unlinkPaths.length === 0) {
            return Promise.reject(
              new GeneratorHandlerError(
                `No generator found for ${name} table in: ${path}`
              )
            );
          }

          // prettier-ignore
          const message = `${unlinkPaths.length} generator file${sfx(unlinkPaths)} removed in:\n${unlinkPaths.join('\n')}`;

          // Reset .js generators
          const reset = (): Promise<void> => {
            return new Promise<any>((resolve, reject) => {
              if (isTsFile(basename(paths[0]))) return resolve(null);
              this.reset(path).then(resolve).catch(reject);
            });
          };

          return reset()
            .then(() => unlink(unlinkPaths))
            .then(() => rename(renamePaths))
            .then(() => resolve(message))
            .catch(reject);
        })
        .catch(reject);
    });
  }

  /**
   * Resets the database by dropping all tables associated with the generator files
   * in the specified directory.
   *
   * @param path The directory path where the generator files are located.
   * @returns A promise that resolves with a success message indicating how many tables were dropped.
   * @throws `GeneratorHandlerError` If there are no tables to reset.
   * @note This method will continue dropping tables even if some errors occur (e.g., if a table does not exist).
   */
  public reset(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!isFullStr(path)) {
        return reject(
          new GeneratorHandlerError(`Invalid path: ${String(path)}`)
        );
      }

      const dropTables = (paths: string[]): Promise<string> => {
        return new Promise((resolve, reject) => {
          if (isEmptyArr(paths)) {
            return reject(new GeneratorHandlerError('Nothing to reset'));
          }

          const generators = this.collectGenerators(paths);
          let dropped = 0;

          const exec = (index = 0): Promise<void> => {
            return new Promise((resolve) => {
              if (index >= generators.length) {
                return this.builder
                  .raw<void>(`DROP TABLE generators;`) // Drop the table
                  .then(resolve)
                  .catch(resolve);
              }

              const name = generators[index].get.table();

              this.builder
                .raw<void>(`DROP TABLE ${name};`) // Drop the table
                .then(() => {
                  dropped++; // Track dropped tables if successful
                  exec(index + 1).then(resolve); // Proceed to the next table
                })
                .catch(() => {
                  // Continue even if there's an error (e.g., table doesn't exist)
                  exec(index + 1).then(resolve); // Proceed to the next table
                });
            });
          };

          exec()
            .then(() => {
              resolve(`${dropped}/${paths.length} table${sfx(paths)} dropped`);
            })
            .catch(reject);
        });
      };

      this.collectPaths(path, false)
        .then((paths) => dropTables(paths.reverse()))
        .then(resolve)
        .catch(reject);
    });
  }
}
