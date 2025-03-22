import fs from "fs/promises";
import { resolve as resolvePath } from "path";
import { isBool, isEmptyArr, isFullStr, isPascalCase } from "../../helpers";

/**
 * Custom error class for handling errors related to command operations.
 */
export class CommandHandlerError extends Error {}

/**
 * Checks if the provided name matches the pattern for a valid command file.
 *
 * @param name The name to check if it matches a command file pattern.
 * @returns `true` if the name matches the command file pattern (e.g., `Fetch.js`), otherwise `false`.
 */
function isFile(name: string): boolean {
  // Pattern example: Fetch.js
  return /^[A-Z][a-z0-9]*([A-Z][a-z0-9]*)*\.(js|ts|d\.ts|js\.map|d\.ts\.map)$/.test(
    name
  );
}

/**
 * Safely deletes multiple command files at the specified paths.
 *
 * This function calls `unlink` for each path provided in the array, attempting to
 * remove each corresponding file.
 *
 * @param paths An array of strings representing the absolute paths of the command files to be deleted.
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
 * This class provides functionality for adding, and removing command files
 *
 */
export class CommandHandler {
  /**
   * The absolute path to the assets directory.
   */
  private assets: string;

  /**
   * Instantiates a new CommandHandler.
   */
  constructor() {
    this.assets = resolvePath(__dirname, "../../../assets");
  }

  /**
   * Collects the absolute path of command files to be removed.
   *
   * @param path The directory path from which to collect command files.
   * @returns A promise that resolves with an array of absolute paths to valid command files.
   * @throws `CommandHandlerError` if there is an issue collecting the files or if an invalid command file is encountered.
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
        .catch((e) => reject(new CommandHandlerError(e.message)));
    });
  }

  /**
   * Creates a new command file in the specified path.
   *
   * This method creates a new file for the specified command name in the given directory path.
   * You can choose to create a TypeScript file or a JavaScript file based on the provided boolean flag.
   *
   * @param name The PascalCase command name.
   * @param path The directory path where the command file will be created.
   * @param ts A boolean indicating whether to create a TypeScript file (`true`) or a JavaScript file (`false`).
   * @returns A promise that resolves with a success message indicating the path of the created command file.
   * @throws `CommandHandlerError` if the command name is invalid, the path is empty, or if any errors occur during file operations.
   * @note The command name must be in PascalCase, e.g., FetchCommand, RollbackCommand.
   */
  public add(name: string, path: string, ts?: boolean): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!isPascalCase(name)) {
        return reject(
          new CommandHandlerError(`Invalid command name: ${String(name)}`)
        );
      }

      if (!isFullStr(path)) {
        return reject(new CommandHandlerError(`Invalid path: ${String(path)}`));
      }

      if (!isBool(ts)) ts = false;

      const ext = ts ? "ts" : "js";
      const layout = ts ? "ts/command.txt" : "js/command.txt";
      const content = resolvePath(this.assets, layout);

      fs.readFile(content, "utf-8")
        .then((template) => {
          const className = name;
          const fileName = className.concat(".", ext);
          const filePath = resolvePath(path, fileName);
          const fileContent = template
            .replace(/\[className\]/g, className)
            .replace(/\[fileName\]/g, fileName);

          // Create command file
          fs.writeFile(filePath, fileContent, "utf-8")
            .then(() => resolve(`Command added in: ${filePath}`))
            .catch((e) => reject(new CommandHandlerError(e.message)));
        })
        .catch((e) => reject(new CommandHandlerError(e.message)));
    });
  }

  /**
   * Removes the command file in the specified path.
   *
   * @param name The PascalCase command name to be removed.
   * @param path The directory path where the command files are located.
   * @returns A promise that resolves with a success message indicating how many command files were removed.
   * @throws `CommandHandlerError` if the command name is invalid, the path is empty.
   * @note The command name must be in PascalCase, e.g., FetchCommand, RollbackCommand.
   */
  public remove(name: string, path: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      if (!isPascalCase(name)) {
        return reject(
          new CommandHandlerError(`Invalid command name: ${String(name)}`)
        );
      }

      if (!isFullStr(path)) {
        return reject(new CommandHandlerError(`Invalid path: ${String(path)}`));
      }

      return this.collectPaths(path)
        .then((paths) => {
          const unlinkPaths = paths.filter((path) =>
            new RegExp(`${name}\.(ts|js|js\.map|d\.ts|d\.ts\.map)$`).test(path)
          );

          if (unlinkPaths.length === 0) {
            return Promise.reject(
              new CommandHandlerError(`File not found in: ${path}`)
            );
          }

          const message = `${unlinkPaths.length} command file${
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
