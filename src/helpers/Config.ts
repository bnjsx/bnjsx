import * as fs from 'fs';
import { dirname, extname, join, parse } from 'path';
import {
  isArr,
  isArrOfFunc,
  isArrOfStr,
  isDefined,
  isFunc,
  isStr,
  isUndefined,
} from '.';

/**
 * Error class for handling configuration-related errors.
 */
export class ConfigError extends Error {}

/**
 * A function type representing a validator for configuration objects.
 *
 * Each validator takes a configuration object as input, validates or modifies it,
 * and returns the modified configuration. Validators are expected to throw an
 * error if the configuration is invalid.
 *
 * @param config The configuration object to validate or modify.
 * @returns The modified configuration object.
 */
type Validator = (config: any) => any;

/**
 * A helper class for loading, managing, and validating configuration files.
 *
 * This class provides methods to load configuration files (both `.js` and `.json`)
 * from the file system.
 *
 * @example
 * // Extend the Config helper
 * class App extends Config {
 *   // Set the config file name
 *   protected static file = 'app.config.js';
 *
 *   // Provide a default configuration
 *   protected static default = {};
 * }
 *
 * // Load your config file (JS or JSON)
 * App.load().then(config => console.log(config));
 *
 * // The `load` method:
 * // - Loads your config file once and caches it for future calls.
 * // - Executes all registered validators on the loaded configuration.
 *
 * // Register validator to ensure `config.paths` exists and is valid
 * App.register((config) => {
 *   if (typeof config.paths !== 'object') config.paths = {};
 *   if (typeof config.paths.models !== 'string') config.paths.models = 'models';
 *   if (typeof config.paths.seeders !== 'string') config.paths.seeders = 'seeders';
 *   if (typeof config.paths.commands !== 'string') config.paths.commands = 'commands';
 *   if (typeof config.paths.generators !== 'string') config.paths.generators = 'generators';
 * });
 *
 * // Load your validated configuration
 * App.load().then(config => console.log(config)); // Validation applied
 *
 * // Reload your configuration
 * App.reload(); // Refreshes the cached configuration
 *
 * // Resolve the project root synchronously
 * console.log(App.resolveSync());
 *
 * // Resolve the project root asynchronously
 * App.resolve().then((root) => console.log(root));
 */
export class Config {
  /**
   * Stores the configuration data once it is loaded.
   * This ensures the configuration is cached for subsequent access.
   */
  private static config: Record<string, any>;

  /**
   * The default name of the config file to be loaded.
   * This file name can be overridden in subclasses.
   */
  protected static file: string;

  /**
   * The root directory of the project, where the config file will be searched by default.
   * This property defaults to the current working directory of the Node.js process.
   */
  protected static root: string;

  /**
   * A collection of validator functions to validate or modify the configuration.
   * Each validator function is executed in order when the configuration is loaded or validated.
   */
  private static validators: Array<Validator>;

  /**
   * Registers a new validator function to be applied to the config.
   *
   * The validator function is expected to either modify the config or throw an error if validation fails.
   *
   * @param validator A function that takes the current config and either modifies it or throws an error.
   * @returns The Config instance, allowing for method chaining.
   * @throws `ConfigError` if the validator is not a function.
   */
  public static register(validator: Validator): Config {
    if (!isFunc(validator)) {
      throw new ConfigError(`Invalid validator: ${String(validator)}`);
    }

    if (!isArr(this.validators)) this.validators = [];
    this.validators.push(validator);
    return this;
  }

  /**
   * Validates the config by applying all registered validators in order.
   *
   * Each validator will modify the config or throw an error. The final modified config is returned.
   *
   * @param config The configuration object to be validated and potentially modified.
   * @returns The final modified config after all validators have been applied.
   * @throws `ConfigError` if the validators are not properly registered or if any validator throws an error.
   */
  public static validate(config: Record<string, any>): Record<string, any> {
    if (isUndefined(this.validators)) return config;

    if (!isArrOfFunc(this.validators)) {
      throw new ConfigError(`Invalid validators: ${String(this.validators)}`);
    }

    return this.validators.reduce(
      (config, validator) => validator(config),
      config
    );
  }

  /**
   * Resolves the project root directory asynchronously.
   *
   * This method caches the resolved root directory to avoid repeated I/O operations
   * on subsequent calls.
   *
   * @returns A promise that resolves to the project root directory path.
   * @throws `ConfigError` if no project root is found.
   */
  public static resolve(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.root) return resolve(this.root);

      const find = (path: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          if (path === parse(path).root) {
            return reject(new ConfigError('Could not find project root'));
          }

          fs.promises
            .access(join(path, 'node_modules'))
            .then(() => resolve(path))
            .catch(() => find(dirname(path)).then(resolve).catch(reject));
        });
      };

      return find(process.cwd())
        .then((root) => resolve((this.root = root)))
        .catch((error) => reject(error));
    });
  }

  /**
   * Asynchronously loads and returns the configuration from the specified file.
   *
   * - If the configuration has already been loaded, it returns the cached configuration.
   * - If the extension is `.js`, the configuration is loaded using `require`.
   * - If the extension is `.json`, the configuration is read and parsed using `fs.promises.readFile` and `JSON.parse`.
   *
   * The method returns a promise that resolves with the validated configuration object.
   *
   * @returns A promise that resolves with the validated configuration object loaded from the file.
   * @throws `ConfigError` if the file extension is not `.js` or `.json`, an error is thrown indicating the unsupported file extension.
   */
  public static load<T extends Record<string, any>>(): Promise<T> {
    return new Promise((resolve, reject) => {
      // Return the cached config if already loaded
      if (isDefined(this.config)) {
        return resolve(this.config as T);
      }

      const extension = extname(this.file).toLocaleLowerCase();

      // Load default JS config
      if (extension === '.js') {
        return this.resolve()
          .then((root) => {
            const path = join(root, this.file);
            this.config = this.validate(require(path));
            return resolve(this.config as T);
          })
          .catch(reject);
      }

      // Load default JSON config
      if (extension === '.json') {
        return this.resolve().then((root) => {
          const path = join(root, this.file);

          fs.promises
            .readFile(path, { encoding: 'utf-8' })
            .then((content) => {
              this.config = this.validate(JSON.parse(content));
              resolve(this.config as T);
            })
            .catch(reject);
        });
      }

      return reject(
        new ConfigError(`Unsupported config file extension: ${extension}`)
      );
    });
  }

  /**
   * Asynchronously reloads the configuration by clearing the cached configuration
   * and reloading it using the `load` method.
   */
  public static reload<T extends Record<string, any>>(): Promise<T> {
    // Reset and Reload
    this.config = undefined;
    return this.load();
  }

  /**
   * Resolves the project root directory synchronously.
   *
   * This method caches the resolved root directory to avoid repeated I/O operations
   * on subsequent calls.
   *
   * @returns The path to the project root directory.
   * @throws `ConfigError` if no project root is found.
   */
  public static resolveSync(): string {
    if (this.root) return this.root;

    let root = process.cwd();

    while (root !== parse(root).root) {
      const nodeModules = join(root, 'node_modules');
      if (fs.existsSync(nodeModules)) return (this.root = root);
      root = dirname(root);
    }

    throw new ConfigError('Could not find project root');
  }

  /**
   * Synchronously loads and returns the configuration from the specified file.
   *
   * - If the configuration has already been loaded, it returns the cached configuration.
   * - If the extension is `.js`, the configuration is loaded using `require`.
   * - If the extension is `.json`, the configuration is read and parsed using `fs.readFileSync` and `JSON.parse`.
   *
   * @throws `ConfigError` if the file extension is not `.js` or `.json`, an error is thrown indicating the unsupported file extension.
   */
  public static loadSync<T extends Record<string, any>>(): T {
    // Return the cached config if already loaded
    if (isDefined(this.config)) return this.config as T;

    const extension = extname(this.file).toLocaleLowerCase();

    // Load default JS config
    if (extension === '.js') {
      this.config = this.validate(require(join(this.resolveSync(), this.file)));
      return this.config as T;
    }

    // Load default JSON config
    if (extension === '.json') {
      this.config = this.validate(
        JSON.parse(
          fs.readFileSync(join(this.resolveSync(), this.file), {
            encoding: 'utf-8',
          })
        )
      );

      return this.config as T;
    }

    throw new ConfigError(`Unsupported config file extension: ${extension}`);
  }

  /**
   * Synchronously reloads the configuration by clearing the current cached configuration
   * and reloading it using the `loadSync` method.
   */
  public static reloadSync<T extends Record<string, any>>(): T {
    this.config = undefined;
    return this.loadSync();
  }

  /**
   * Checks if a specified path exists.
   *
   * This method tests whether a given file or directory path exists in the file system.
   * If the path is valid and accessible, the promise resolves successfully.
   *
   * @param path The path to check for existence.
   * @returns A promise that resolves to `void` if the path exists or rejects with a `ConfigError` if it doesn't.
   * @throws `ConfigError` if the path is invalid or inaccessible.
   */
  public static exist(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isStr(path)) {
        return reject(new ConfigError(`Invalid path: ${String(path)}`));
      }

      fs.promises
        .access(path)
        .then(resolve)
        .catch((error) => reject(new ConfigError(error.message)));
    });
  }

  /**
   * Checks if multiple paths exist.
   *
   * This method validates the existence of multiple file or directory paths.
   * It resolves if all paths exist or rejects if any path is missing or invalid.
   *
   * @param paths An array of paths to check for existence.
   * @returns A promise that resolves to `void` if all paths exist or rejects with a `ConfigError` if any path doesn't.
   * @throws `ConfigError` if any path is invalid or inaccessible.
   */
  public static existMany(paths: Array<string>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isArrOfStr(paths)) {
        return reject(new ConfigError(`Invalid paths: ${String(paths)}`));
      }

      return Promise.all(paths.map((path) => this.exist(path)))
        .then(() => resolve())
        .catch(reject);
    });
  }

  /**
   * Ensures that a directory exists, creating it if necessary.
   *
   * - If the directory already exists, the method resolves immediately.
   * - If the directory does not exist, it creates the necessary directories recursively.
   *
   * @param path The path to the directory to check or create.
   * @returns A promise that resolves when the directory exists or is created successfully.
   * @throws `ConfigError` if the path is invalid or directory creation fails.
   */
  public static mkdir(path: string): Promise<void | string> {
    return new Promise((resolve, reject) => {
      if (!isStr(path)) {
        return reject(new ConfigError(`Invalid path: ${String(path)}`));
      }

      this.exist(path)
        .then(resolve)
        .catch(() => fs.promises.mkdir(path, { recursive: true }))
        .then(resolve)
        .catch((error) => reject(new ConfigError(error.message)));
    });
  }

  /**
   * Ensures that a configuration file exists, creating it along with its directories if necessary.
   *
   * - If the file already exists, the method resolves immediately.
   * - If the file does not exist, it ensures all parent directories are created and writes the file.
   *
   * @param path The full path to the configuration file.
   * @param content The content to write if the file is created. Defaults to an empty string.
   * @returns A Promise that resolves when the file is confirmed to exist or is created successfully.
   * @throws `ConfigError` if the path is invalid or if file creation fails.
   */
  public static mkfile(path: string, content: string = ''): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isStr(path)) {
        return reject(new ConfigError(`Invalid path: ${String(path)}`));
      }

      if (!isStr(content)) {
        return reject(new ConfigError(`Invalid content: ${String(content)}`));
      }

      this.exist(path) // Ensure the file exist
        .then(resolve)
        .catch(() => this.mkdir(dirname(path))) // Ensure the directory exists
        .then(() => fs.promises.writeFile(path, content)) // Write the file
        .then(resolve)
        .catch((error) => reject(new ConfigError(error.message)));
    });
  }
}
