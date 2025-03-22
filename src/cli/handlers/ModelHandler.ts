import fs from "fs/promises";
import { resolve as resolvePath } from "path";
import { toSingular, isBool, isFullStr, isSnakeCase } from "../../helpers";

/**
 * Custom error class for handling errors related to model operations.
 */
export class ModelHandlerError extends Error {}

/**
 * Checks if the provided name matches the pattern for a valid model file.
 *
 * @param name The name to check if it matches a model file pattern.
 * @returns `true` if the name matches the model file pattern (e.g., `User.js`), otherwise `false`.
 */
function isFile(name: string): boolean {
  // Pattern example: User.js
  return /^[A-Z][a-z0-9]*([A-Z][a-z0-9]*)*\.(ts|js)$/.test(name);
}

/**
 * Safely deletes multiple model files at the specified paths.
 *
 * This function calls `unlink` for each path provided in the array, attempting to
 * remove each corresponding file.
 *
 * @param paths An array of strings representing the absolute paths of the model files to be deleted.
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
 * Creates a model class name based on the table name.
 *
 * @param name The snake_case table name.
 * @returns A model class name.
 */
function toClassName(name: string): string {
  return name
    .split("_")
    .map((part) => toSingular(part))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * This class provides functionality for adding, and removing model files
 *
 */
export class ModelHandler {
  /**
   * The absolute path to the assets directory.
   */
  private assets: string;

  /**
   * Instantiates a new ModelHandler.
   */
  constructor() {
    this.assets = resolvePath(__dirname, "../../../assets");
  }

  /**
   * Collects the absolute paths of model files from the specified directory.
   *
   * @param path The directory path from which to collect model files.
   * @returns A promise that resolves with an array of absolute paths to valid model files.
   * @throws `ModelHandlerError` if there is an issue collecting the files or if an invalid model file is encountered.
   */
  private collectPaths(path: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      fs.readdir(path)
        .then((files) =>
          resolve(
            files
              .filter((file) => isFile(file))
              .map((file) => resolvePath(path, file))
          )
        )
        .catch((e) => reject(new ModelHandlerError(e.message)));
    });
  }

  /**
   * Creates a new model file in the specified path.
   *
   * This method creates a new file for the specified table name in the given directory path.
   * You can choose to create a TypeScript file or a JavaScript file based on the provided boolean flag.
   *
   * @param name The snake_case table name for which the model is created.
   * @param path The directory path where the model file will be created.
   * @param ts A boolean indicating whether to create a TypeScript file (`true`) or a JavaScript file (`false`).
   * @returns A promise that resolves with a success message indicating the path of the created model file.
   * @throws `ModelHandlerError` If the table name is invalid, the path is empty, or if any errors occur during file operations.
   * @note The table name must be a snake_case table name, e.g., users, category_product.
   */
  public add(name: string, path: string, ts?: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!isSnakeCase(name)) {
        return reject(
          new ModelHandlerError(`Invalid table name: ${String(name)}`)
        );
      }

      if (!isFullStr(path)) {
        return reject(new ModelHandlerError(`Invalid path: ${String(path)}`));
      }

      if (!isBool(ts)) ts = false;

      const ext = ts ? "ts" : "js";
      const layout = ts ? "ts/model.txt" : "js/model.txt";
      const content = resolvePath(this.assets, layout);

      fs.readFile(content, "utf-8")
        .then((template) => {
          const className = toClassName(name);
          const fileName = className.concat(".", ext);
          const filePath = resolvePath(path, fileName);
          const fileContent = template
            .replace(/\[className\]/g, className)
            .replace(/\[tableName\]/g, name)
            .replace(/\[fileName\]/g, fileName);

          // Create model file
          fs.writeFile(filePath, fileContent, "utf-8")
            .then(() => resolve(`Model added in: ${filePath}`))
            .catch((e) => reject(new ModelHandlerError(e.message)));
        })
        .catch((e) => reject(new ModelHandlerError(e.message)));
    });
  }

  /**
   * Removes the model associated with the given table name from the specified folder path.
   *
   * @param name The snake_case table name whose associated model is to be removed.
   * @param path The directory path where the model files are located.
   * @returns A promise that resolves with a success message indicating how many model files were removed.
   * @throws `ModelHandlerError` If the table name is invalid, the path is empty.
   * @note The table name must be a snake_case table name, e.g., users, category_product.
   */
  public remove(name: string, path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (!isSnakeCase(name)) {
        return reject(
          new ModelHandlerError(`Invalid table name: ${String(name)}`)
        );
      }

      if (!isFullStr(path)) {
        return reject(new ModelHandlerError(`Invalid path: ${String(path)}`));
      }

      return this.collectPaths(path)
        .then((paths) => {
          const unlinkPaths = paths.filter((path) =>
            new RegExp(
              `${toClassName(name)}\.(ts|js|js\.map|d\.ts|d\.ts\.map)$`
            ).test(path)
          );
          if (unlinkPaths.length === 0) {
            return Promise.reject(
              new ModelHandlerError(
                `No model found for ${name} table in: ${path}`
              )
            );
          }

          const message = `${unlinkPaths.length} model file${
            unlinkPaths.length === 1 ? "" : "s"
          } removed in:\n${unlinkPaths.join("\n")}`;

          return unlink(unlinkPaths)
            .then(() => resolve(message))
            .catch(reject);
        })
        .catch(reject);
    });
  }
}
