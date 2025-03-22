import fs from 'fs/promises';
import { basename, dirname, resolve as resolvePath } from 'path';
import { Seeder, Builder } from '../../core';
import {
  hasLength,
  isBool,
  isChildOf,
  isDefined,
  isEmptyArr,
  isFullStr,
  isObj,
  isSnakeCase,
  isStr,
  isUndefined,
} from '../../helpers';

/**
 * Custom error class for handling errors related to the seeding operations.
 */
export class SeederHandlerError extends Error {}

/**
 * Checks if the provided name matches the pattern for a valid seeder file.
 *
 * @param name - The name to check if it matches a seeder file pattern.
 * @returns `true` if the name matches the seeder file pattern (e.g., `01_seed_users_table.js`), otherwise `false`.
 */
function isFile(name: string): boolean {
  // Pattern example: 01_seed_users_table.js
  return /^[0-9]+_seed_[a-z][a-z0-9]*(_[a-z][a-z0-9]*)*_table\.(ts|js)$/.test(
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
  // Pattern example: 01_seed_users_table.js.map or .d.ts
  return /^[0-9]+_seed_[a-z][a-z0-9]*(_[a-z][a-z0-9]*)*_table\.(?!(js|ts)$).+$/.test(
    name
  );
}

/**
 * Retrieves the last seeder file number in the specified directory.
 *
 * This function scans for existing seeder files in the given path and extracts
 * the highest seeder file number. If no files are found, it defaults to returning `0`.
 *
 * @param path The directory path where the seeder files are located.
 * @returns Promise that resolves with the last available file number, if no file found resolves with `0`.
 * @throws `SeederHandlerError` if the provided path is empty or invalid.
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
          return reject(new SeederHandlerError(`Invalid seeder file: ${file}`));
        }

        // Find the highest existing file number
        const match = files.pop().match(/^([0-9]+)_seed_/);
        return resolve(Number(match[1]));
      })
      .catch((e) => reject(new SeederHandlerError(e.message)));
  });
}

/**
 * Renames seeder files by updating their numbering sequence after a deletion.
 *
 * This function is used internally to ensure that the numbering of seeder files
 * remains consistent after a user deletes one or more files. Each group of paths
 * may include related files, such as:
 * - JavaScript files (.js)
 * - TypeScript files (.ts)
 * - source map files (.js.map)
 *
 * @param groups An array of arrays, where each inner array contains paths to seeder files that need to be renamed.
 * @returns Promise that resolves when all files have been successfully renamed.
 * @throws if the renaming operation fails.
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
      .catch((error) => reject(new SeederHandlerError(error.message)));
  });
}

/**
 * Groups seeder file paths by their numeric prefix. This function organizes seeder
 * files that share the same numeric prefix into arrays
 *
 * @param paths - An array of file paths representing seeder files.
 * @returns An array of arrays, where each inner array represents a group of files that share the same numeric prefix.
 */
function group(paths: string[]): string[][] {
  const storage: { [key: string]: string[] } = {};

  paths.forEach((path) => {
    // prettier-ignore
    const regex = /([0-9]+)_seed_[a-z][a-z0-9]*(?:_[a-z][a-z0-9]*)*_table/;
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
 * Safely deletes multiple seeder files at the specified paths.
 *
 * This function calls `unlink` for each path provided in the array, attempting to
 * remove each corresponding file.
 *
 * @param paths An array of strings representing the absolute paths of the seeder files to be deleted.
 * @returns A promise that resolves when all files are removed.
 */
function unlink(paths: string[]): Promise<void> {
  return new Promise<any>((resolve, reject) => {
    return Promise.all(paths.map((path) => fs.unlink(path)))
      .then(resolve)
      .catch(reject);
  });
}

/**
 * Creates a seeder class name based on the table name.
 *
 * @param name The snake_case table name.
 * @returns A seeder class name.
 */
function toClassName(name: string): string {
  return (
    name
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('') + 'TableSeeder'
  );
}

/**
 * Creates a seeder file name based on the provided name, number, and extension.
 *
 * @param name The snake_case table name.
 * @param number The file number.
 * @param ext The file extension.
 * @returns A seeder file name.
 */
function toFileName(name: string, number: number, ext: string): string {
  return `${(number + 1)
    .toString()
    .padStart(2, '0')}_seed_${name}_table.${ext}`;
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
 * Manages seeder files, including their creation, execution, and cleanup. This class
 * provides functionality for adding, seeding, clearing, and removing seeder files, allowing
 * for efficient population and cleanup of initial data in database tables.
 *
 */
export class SeederHandler {
  /**
   * The database builder instance used for executing queries.
   */
  private builder: Builder;

  /**
   * The absolute path to the assets directory.
   */
  private assets: string;

  /**
   * Instantiates a new SeederHandler with the specified database builder.
   *
   * @param builder The database builder instance used for constructing seeder queries.
   * @throws `SeederHandlerError` if the provided builder is not a valid instance of `Builder`.
   */
  constructor(builder: Builder) {
    if (!isChildOf(builder, Builder)) {
      throw new SeederHandlerError(`Invalid builder: ${String(builder)}`);
    }

    this.builder = builder;
    this.assets = resolvePath(__dirname, '../../../assets');
  }

  /**
   * Collects the absolute paths of seeder files from the specified directory.
   *
   * @param path The directory path from which to collect seeder files.
   * @param map A boolean indicating whether to include seeder map files (e.g., `.js.map`) in the resulting paths.
   * @returns A promise that resolves with an array of absolute paths to valid seeder files.
   * @throws `SeederHandlerError` if there is an issue collecting the files or if an invalid seeder file is encountered.
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
                new SeederHandlerError(`Invalid seeder file: ${String(file)}`)
              );
            }
          }

          return resolve(files.map((file) => resolvePath(path, file)));
        })
        .catch((e) => reject(new SeederHandlerError(e.message)));
    });
  }

  /**
   * Collects exported seeder instances from the specified file paths.
   *
   * This method attempts to require each file listed in the provided array of 
   * paths. It expects each file to export either a default instance of `Seeder`
   * or a named seeder instance. If any of the files do not conform to these 
   * expectations, an error will be thrown.
   *
   * ### Behavior
   * - If no paths are provided or if no valid seeders are found, a 
   *   `SeederHandlerError` is thrown with a relevant message.
   * - For each path, the method tries to:
   *   - Import the module using `require`.
   *   - Check if the imported module is a valid `Seeder` instance.
   *   - If the module exports a named seeder, it will check for the first 
   *     property and validate it as a `Seeder`.
  
   *
   * @param paths An array absolute paths to your seeder files.
   * @returns An array of `Seeder` instances collected from the specified file paths.
   * @throws `SeederHandlerError` if no seeders are found or if an invalid seeder is encountered in any of the specified paths.
   */
  private collectSeeders(paths: string[]): Array<Seeder> {
    if (isEmptyArr(paths)) {
      throw new SeederHandlerError(`Ops! No seeder found`);
    }

    const seeders: Array<Seeder> = [];

    for (const path of paths) {
      let module: Seeder;

      try {
        module = require(path);
      } catch (error) {
        throw new SeederHandlerError(error.message);
      }

      // Check if module exports a valid default seeder
      if (isChildOf(module, Seeder)) {
        seeders.push(module as Seeder);
        continue;
      }

      // Check if module exports named seeders
      if (isObj(module) && hasLength(module, 1)) {
        const key = Object.keys(module)[0];
        const namedGenerator = module[key] as Seeder;

        if (isChildOf(namedGenerator, Seeder)) {
          seeders.push(namedGenerator);
          continue;
        }
      }

      throw new SeederHandlerError(`Invalid seeder in: ${path}`);
    }

    return seeders;
  }

  /**
   * Clears data from a specific table or all tables based on available seeders.
   * If a table name is provided, only that table is cleared. If not, all tables
   * associated with seeders in the specified path are cleared.
   *
   * @param  path The directory path containing seeder files.
   * @param  table (Optional) The name of the table to clear.
   * @returns A promise resolving with a message indicating the number of tables cleared.
   *
   */
  public clear(path: string, table?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!isStr(path)) {
        return reject(new SeederHandlerError(`Invalid path: ${String(path)}`));
      }

      if (isDefined(table) && !isSnakeCase(table)) {
        return reject(
          new SeederHandlerError(`Invalid table: ${String(table)}`)
        );
      }

      this.collectPaths(path, false)
        .then((paths) => {
          if (isDefined(table)) {
            const seeder = this.collectSeeders(paths).find(
              (seeder) => seeder.get.table() === table
            );

            if (isUndefined(seeder)) {
              return reject(
                new SeederHandlerError(
                  `No seeder found for table: ${String(table)}`
                )
              );
            }

            return seeder.set
              .builder(this.builder)
              .clear()
              .then(() => resolve(`Table cleared successfully`))
              .catch((error) =>
                reject(
                  new SeederHandlerError(
                    `Failed to clear table: ${error.message}`
                  )
                )
              );
          }

          const seeders = this.collectSeeders(paths).reverse();

          const exec = (index: number = 0, count: number = 0) => {
            if (index >= seeders.length) {
              return resolve(
                `${count}/${paths.length} table${sfx(paths)} cleared`
              );
            }

            return seeders[index].set
              .builder(this.builder)
              .clear()
              .then(() => exec(index + 1, count + 1))
              .catch((error) => {
                return reject(
                  new SeederHandlerError(
                    `${count}/${paths.length} table${sfx(paths)} cleared: ${
                      error.message
                    }`
                  )
                );
              });
          };

          exec();
        })
        .catch(reject);
    });
  }

  /**
   * Seeds data into a specific table or all tables based on available seeders.
   * If a table name is provided, only that table is seeded. If not, all tables
   * associated with seeders in the specified path are seeded.
   *
   * @param  path The directory path containing seeder files.
   * @param  table (Optional) The name of the table to seed.
   * @returns A promise resolving with a message indicating the number of tables seeded.
   *
   */
  public seed(path: string, table?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!isStr(path)) {
        return reject(new SeederHandlerError(`Invalid path: ${String(path)}`));
      }

      if (isDefined(table) && !isSnakeCase(table)) {
        return reject(new SeederHandlerError(`Invalid table: ${table}`));
      }

      this.collectPaths(path, false)
        .then((paths) => {
          if (isDefined(table)) {
            const seeder = this.collectSeeders(paths).find(
              (seeder) => seeder.get.table() === table
            );

            if (isUndefined(seeder)) {
              return reject(
                new SeederHandlerError(
                  `No seeder found for ${table} table in: ${path}`
                )
              );
            }

            return seeder.set
              .builder(this.builder)
              .seed()
              .then(() => resolve(`Table seeded successfully`))
              .catch((error) =>
                reject(
                  new SeederHandlerError(
                    `Failed to seed table: ${error.message}`
                  )
                )
              );
          }

          const seeders = this.collectSeeders(paths);

          const exec = (index: number = 0, count: number = 0) => {
            if (index >= seeders.length) {
              return resolve(
                `${count}/${paths.length} table${sfx(paths)} seeded`
              );
            }

            return seeders[index].set
              .builder(this.builder)
              .seed()
              .then(() => exec(index + 1, count + 1))
              .catch((error) => {
                return reject(
                  new SeederHandlerError(
                    `${count}/${paths.length} table${sfx(paths)} seeded: ${
                      error.message
                    }`
                  )
                );
              });
          };

          exec();
        })
        .catch(reject);
    });
  }

  /**
   * Creates a new seeder file in the specified path.
   *
   * This method creates a new file for the specified table name in the given directory path.
   * You can choose to create a TypeScript file or a JavaScript file based on the provided boolean flag.
   *
   * @param name The snake_case table name for which the seeder is created.
   * @param path The directory path where the seeder file will be created.
   * @param ts A boolean indicating whether to create a TypeScript file (`true`) or a JavaScript file (`false`).
   * @returns A promise that resolves with a success message indicating the path of the created seeder file.
   * @throws `SeederHandlerError` If the table name is invalid, the path is empty, or if any errors occur during file operations.
   * @note The table name must be a snake_case table name, e.g., users, category_product.
   */
  public add(name: string, path: string, ts?: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!isSnakeCase(name)) {
        return reject(
          new SeederHandlerError(`Invalid table name: ${String(name)}`)
        );
      }

      if (!isFullStr(path)) {
        return reject(new SeederHandlerError(`Invalid path: ${String(path)}`));
      }

      if (!isBool(ts)) ts = false;

      const ext = ts ? 'ts' : 'js';
      const layout = ts ? 'ts/seeder.txt' : 'js/seeder.txt';
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

              // Create seeder file
              fs.writeFile(filePath, fileContent, 'utf-8')
                .then(() => resolve(`Seeder added in: ${filePath}`))
                .catch((e) => reject(new SeederHandlerError(e.message)));
            })
            .catch((e) => reject(new SeederHandlerError(e.message)));
        })
        .catch((e) => reject(new SeederHandlerError(e.message)));
    });
  }

  /**
   * Removes the seeder associated with the given table name from the specified folder path.
   *
   * This method first removes the seeder file for the specified table,
   * and finally updates the numbering of each remaining seeder file in the folder.
   *
   * @param name The snake_case table name whose associated seeder is to be removed.
   * @param path The directory path where the seeder files are located.
   * @returns A promise that resolves with a success message indicating how many seeder files were removed.
   * @throws `SeederHandlerError` If the table name is invalid, the path is empty.
   * @note The table name must be a snake_case table name, e.g., users, category_product.
   */
  public remove(name: string, path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (!isSnakeCase(name)) {
        return reject(
          new SeederHandlerError(`Invalid table name: ${String(name)}`)
        );
      }

      if (!isFullStr(path)) {
        return reject(new SeederHandlerError(`Invalid path: ${String(path)}`));
      }

      return this.collectPaths(path, true)
        .then((paths) => {
          const regex = new RegExp(
            `[0-9]+_seed_${name}_table\.(ts|js|js\.map|d\.ts|d\.ts\.map)$`
          );
          const unlinkPaths = paths.filter((path) => regex.test(path));
          const renamePaths = group(paths.filter((path) => !regex.test(path)));

          if (unlinkPaths.length === 0) {
            return Promise.reject(
              new SeederHandlerError(
                `No seeder found for ${name} table in: ${path}`
              )
            );
          }

          // prettier-ignore
          const message = `${unlinkPaths.length} seeder file${sfx(unlinkPaths)} removed in:\n${unlinkPaths.join('\n')}`;

          return unlink(unlinkPaths)
            .then(() => rename(renamePaths))
            .then(() => resolve(message))
            .catch(reject);
        })
        .catch(reject);
    });
  }
}
