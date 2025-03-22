import { ShutdownError } from '../../errors';
import { Driver } from './Driver';

import {
  Pool,
  PendingConnection,
  PoolConnection,
  PoolOptions,

  // Events
  CLOSE_FAIL,
  CREATE_FAIL,
  MAX_CONNECTION,
  MAX_QUEUE_SIZE,
  MAX_QUEUE_TIME,
  COMMIT_FAIL,
  QUERY_FAIL,
  ROLLBACK_FAIL,
  SHUTDOWN_FAIL,
  TRANSACTION_FAIL,
} from './Pool';

import {
  isArr,
  isBool,
  isChildOf,
  isEmptyArr,
  isRegex,
  isStr,
  isUndefined,
  Logger,
  UTC,
} from '../../helpers';

/**
 * Represents the structure of a cluster map.
 *
 * @property `id` - Unique identifier for the cluster.
 * @property `createdAt` - Date and Time when the cluster was created.
 * @property `warnings` - List of warnings associated with the cluster.
 * @property `mode` - The mode of operation for the cluster, either ORDER_MODE or RANDOM_MODE.
 * @property `pools.frozen` - List of frozen pools in the cluster.
 * @property `pools.active` - List of active pools in the cluster.
 * @property `count.pools` - Object holding the counts of active and frozen pools.
 * @property `count.pools.active` - Number of active pools in the cluster.
 * @property `count.pools.frozen` - Number of frozen pools in the cluster.
 * @property `count.pending` - Number of pending operations in the cluster.
 */
export interface ClusterMap {
  id: Symbol;
  createdAt: string;
  warnings: Array<string>;
  mode: Symbol;
  pools: {
    frozen: Array<PoolMap>;
    active: Array<PoolMap>;
  };
  count: {
    pools: {
      active: number;
      frozen: number;
    };
    pending: number;
  };
}

/**
 * Represents the structure of a pool map.
 *
 * @property `id` - Unique identifier for the pool.
 * @property `createdAt` - Date and Time when the pool was created.
 * @property `name` - Name of the pool.
 * @property `driver` - The driver used by the pool.
 * @property `options` - Options associated with the pool.
 * @property `performance` - Performance metrics of the pool.
 * @property `count.acquired` - Number of currently acquired connections in the pool.
 * @property `count.request` - Number of pending requests for the pool.
 * @property `count.idle` - Number of idle connections in the pool.
 */
export interface PoolMap {
  id: Symbol;
  createdAt: string;
  name: string;
  driver: Driver;
  options: PoolOptions;
  performance: Symbol;
  count: {
    acquired: number;
    request: number;
    idle: number;
  };
}

/**
 * Interface for checking the presence or state of various cluster properties.
 */
interface Checker {
  /**
   * Checks if the cluster has a valid logger instance.
   *
   * @returns True if the logger instance exists, otherwise false.
   */
  logger(): boolean;

  /**
   * Checks if there are pending connections in the cluster.
   *
   * @returns True if there are pending connections, otherwise false.
   */
  pending(): boolean;

  /**
   * Checks if any warnings have been recorded for the cluster.
   *
   * @returns True if warnings are present, otherwise false.
   */
  warnings(): boolean;

  /**
   * Checks if a frozen pool exists, optionally by name or pattern.
   *
   * @param name - The name or pattern of the frozen pool to check.
   * @returns True if a matching frozen pool exists, otherwise false.
   * @throws `ClusterError` if the name is invalid.
   */
  frozen(name?: string | RegExp): boolean;

  /**
   * Checks if an active pool exists, optionally by name or pattern.
   *
   * @param name - The name or pattern of the pool to check.
   * @returns True if a matching pool exists, otherwise false.
   * @throws `ClusterError` if the name is invalid.
   */
  active(name?: string | RegExp): boolean;
}

/**
 * Interface for the getter methods in the Cluster instance.
 * This allows access to various properties and information about the cluster, such as the mode, logger, and pool data.
 */
interface Getter {
  /**
   * Retrieves the current mode of the cluster (e.g., `ORDER_MODE` or `RANDOM_MODE`).
   *
   * @returns The current mode.
   */
  mode(): typeof ORDER_MODE | typeof RANDOM_MODE;

  /**
   * Retrieves the current logger instance.
   *
   * @returns The current logger instance.
   */
  logger(): Logger;

  /**
   * Retrieves the registered warnings in the cluster.
   *
   * @returns An array of warnings.
   */
  warnings(): Array<string>;

  /**
   * Retrieves frozen and active pools.
   */
  pools: {
    /**
     * Retrieves the list of frozen pools within the cluster.
     *
     * @returns An array of frozen pools.
     */
    frozen(): Array<ClusterPool>;

    /**
     * Retrieves the list of active pools within the cluster.
     *
     * @returns An array of active pools.
     */
    active(): Array<ClusterPool>;
  };

  /**
   * Retrieves a pool by name or returns a pool based on the current mode if no name is provided.
   *
   * @param name - The name or pattern to match a pool.
   * @returns The matched pool, or a pool selected based on the mode.
   * @throws Throws an error if no pool is found or the name is invalid.
   * @note The RANDOM_MODE is the default selection mode
   */
  pool(name?: string | RegExp): ClusterPool;

  /**
   * Retrieves detailed information about the cluster, including pool statistics and warnings.
   *
   * @returns An object containing cluster details.
   */
  info(): ClusterMap;

  /**
   * Retrieves information about a specific pool by name.
   *
   * @param name - The name of the pool to retrieve information for.
   * @returns An object containing detailed information about the pool.
   * @throws Throws an error if the name is invalid or no pool is found.
   */
  infoAbout(name: string): PoolMap;
}

/**
 * Interface for the setter methods in the Cluster instance.
 * This allows modification of key properties like the mode and logger instance.
 */
interface Setter {
  /**
   * Sets the pool resolving mode for the cluster, which controls how pools are selected (e.g., randomly or in a specific order).
   *
   * @param type - The mode to set. Should be either `ORDER_MODE` or `RANDOM_MODE`.
   *
   * @throws an error if the provided mode type is invalid.
   */
  mode(type: typeof ORDER_MODE | typeof RANDOM_MODE): void;

  /**
   * Updates the logger instance used by the cluster.
   *
   * @param instance - The logger instance to set for logging cluster activities and errors.
   * @throws an error if the provided logger instance is invalid.
   */
  logger(instance: Logger): void;

  /**
   * Register warnings in the cluster.
   *
   * @param messages - The warning messages you want to register.
   * @throws an error if the provided message is invalid.
   */
  warnings(messages: Array<string> | string): void;
}

/**
 * Symbol representing the order mode in a cluster.
 */
export const ORDER_MODE = Symbol('ORDER_MODE');

/**
 * Symbol representing the random mode in a cluster.
 */
export const RANDOM_MODE = Symbol('RANDOM_MODE');

/**
 * Generates a random integer between min (inclusive) and max (inclusive).
 * @param min The minimum value.
 * @param max The maximum value.
 * @returns A random integer.
 */
function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Converts a string into a regular expression.
 * @param name The string to convert.
 * @returns The regular expression corresponding to the input pattern.
 */
function toRegex(name: string | RegExp): RegExp {
  return isStr(name)
    ? new RegExp(`${(name as string).replace(/\*/, '.*')}`)
    : (name as RegExp);
}

/**
 * Matches pools based on the provided regular expression.
 * @param regex The regular expression pattern to match against pool names.
 * @returns An Array containing matched pools.
 */
function match(regex: RegExp, pools: Array<ClusterPool>): Array<ClusterPool> {
  const result = new Array();

  for (const pool of pools) {
    if (regex.test(pool.name)) result.push(pool);
  }

  return result;
}

/**
 * Custom error class for handling errors specific to the Cluster.
 */
export class ClusterError extends Error {}

/**
 * The `Cluster` class is responsible for managing and organizing a collection of database connection pools.
 * It provides methods to add, remove, request, freeze, and unfreeze connection pools in a flexible and scalable manner.
 */
export class Cluster {
  /**
   * The unique identifier for the cluster.
   */
  public id: Symbol;

  /**
   * String representing the creation date and time of the cluster.
   */
  public createdAt: string;

  /**
   * The warning messages registered for the user.
   */
  private warnings: Array<string>;

  /**
   * An array containing active pools in the cluster.
   */
  private pools: Array<ClusterPool>;

  /**
   * Logger instance the cluster uses to log errors.
   */
  private logger: Logger;

  /**
   * Mode type the cluster uses to resolve the pool.
   * Mode type is used in this.request() and this.get.pool()
   */
  private mode: typeof ORDER_MODE | typeof RANDOM_MODE = ORDER_MODE;

  /**
   * An array containing pending connections in the cluster.
   */
  private PendingConnections: Array<PendingConnection>;

  /**
   * An array containing frozen pools in the cluster.
   */
  private frozen: Array<ClusterPool>;

  /**
   * Constructs a new Cluster instance with an array of pools.
   * Providing pools is optional; you can always add a pool at runtime using the `cluster.add()` method.
   *
   * @param pools An optional Array of `ClusterPool` instances to be added to the cluster.
   */
  constructor(...pools: Array<ClusterPool>) {
    this.id = Symbol('Cluster id');
    this.warnings = new Array();
    this.pools = new Array();
    this.frozen = new Array();
    this.PendingConnections = new Array();
    this.createdAt = UTC.get.datetime();

    pools.forEach((pool) => this.add(pool));
  }

  /**
   * Adds a new pool instance to the cluster.
   *
   * This method is used to include a `ClusterPool` instance into the cluster. Before adding, it checks
   * if the pool is a valid instance and ensures that the pool name is unique within the cluster.
   *
   * @param pool - The `ClusterPool` instance to be added.
   *
   * @throws If the provided pool is not an instance of `ClusterPool`,
   * or if a pool with the same name already exists in the cluster.
   *
   */
  public add(pool: ClusterPool): void {
    if (!isChildOf(pool, ClusterPool)) {
      throw new ClusterError(`Invalid pool: ${String(pool)}`);
    }

    if (this.has.active(pool.name) || this.has.frozen(pool.name)) {
      throw new ClusterError(`Pool names must be unique: ${pool.name}`);
    }

    const log = (message: string) => {
      if (this.has.logger()) {
        this.logger.log(message).catch((error) => {
          this.warnings.push(`Failed to write log: ${error.message}`);
        });
      }

      this.warnings.push(message);
    };

    pool.on(CLOSE_FAIL, (connection: PendingConnection) => {
      this.PendingConnections.push(connection);
      log(`Closing connection failed in: ${pool.name}`);
    });

    pool.on(CREATE_FAIL, () => {
      log(`Creating connection failed in: ${pool.name}`);
    });

    pool.on(MAX_CONNECTION, () => {
      log(`Max number of connections passed in: ${pool.name}`);
    });

    pool.on(MAX_QUEUE_TIME, () => {
      log(`Max request queue time passed in: ${pool.name}`);
    });

    pool.on(MAX_QUEUE_SIZE, () => {
      log(`Max request queue size passed in: ${pool.name}`);
    });

    pool.on(COMMIT_FAIL, () => {
      log(`Commit transaction failed in: ${pool.name}`);
    });

    pool.on(QUERY_FAIL, () => {
      log(`Query execution failed in: ${pool.name}`);
    });

    pool.on(ROLLBACK_FAIL, () => {
      log(`Rollback failed in: ${pool.name}`);
    });

    pool.on(SHUTDOWN_FAIL, () => {
      log(`Shutdown failed in: ${pool.name}`);
    });

    pool.on(TRANSACTION_FAIL, () => {
      log(`Transaction failed in: ${pool.name}`);
    });

    this.pools.push(pool);
  }

  /**
   * Shutdown and remove one or more pools from the cluster.
   *
   * This method allows you to remove a pool or multiple pools based on their name or a regular expression.
   * Before executing this method, ensure the following:
   *
   * - All connections are released back to the pool. If connections are not released, shuting the pool down
   *   fails! causing the remove method to reject.
   *
   * - There are no connection requests in the queue. If the maximum number of connections is exceeded,
   *    requests are queued until a connection is released. Removal will fail if there are queued requests.
   *
   * - It is advisable to freeze the pool for a couple of seconds before removing it. Freezing stops new
   *    requests from being made to the pool, ensuring that it is safe to remove.
   *
   * @param name - The name of the pool as a string or a regular expression to match and remove multiple pools.
   * @throws
   * - `ClusterError` if the provided name is not valid, if there are active connections that have not been
   *   released, or if there are pending connection requests in the queue, causing the shutdown to fail.
   */
  public remove(name: string | RegExp): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isStr(name) && !isRegex(name)) {
        return reject(new ClusterError(`Invalid pool name: ${name}`));
      }

      const pools = match(toRegex(name), [...this.pools, ...this.frozen]);

      if (isEmptyArr(pools)) return resolve();

      const promises = pools.map((pool) => pool.shutdown());

      return Promise.allSettled(promises).then((results) => {
        const resolved = [];
        const rejected = [];

        results.forEach((result, index) => {
          if (result.status === 'rejected') rejected.push(pools[index]);
          else resolved.push(pools[index]);
        });

        this.pools = this.pools.filter((pool) => !resolved.includes(pool));

        if (isEmptyArr(rejected)) return resolve();

        return reject(
          new ClusterError(
            `Shutdown fail in: ${rejected.map((p) => p.name).join(', ')}`
          )
        );
      });
    });
  }

  /**
   * Request a connection from an active pool.
   * @param name Optionally, you can specify the pool(s) to request from.
   * @note You can only request connections from active pools.
   */
  public request(name?: string | RegExp): Promise<PoolConnection> {
    return new Promise((resolve, reject) => {
      return this.get.pool(name).request().then(resolve).catch(reject);
    });
  }

  /**
   * Freezes the specified pool(s) by name or regular expression.
   * The matched pool(s) will be removed from the active pool list and added to the frozen pool list.
   *
   * @param name - The name or pattern of the pool(s) to freeze.
   * @throws If the pool name is invalid or no matching pool is found.
   */
  public freeze(name: string | RegExp): void {
    if (!isStr(name) && !isRegex(name)) {
      throw new ClusterError(`Invalid pool name: ${String(name)}`);
    }

    const pools = match(toRegex(name), this.pools);

    if (isEmptyArr(pools)) {
      throw new ClusterError(`No matching pool found: ${String(name)}`);
    }

    this.pools = this.pools.filter((pool) => !pools.includes(pool));
    this.frozen.push(...pools);
  }

  /**
   * Unfreezes the specified pool(s) by name or regular expression.
   * The matched pool(s) will be removed from the frozen pool list and added back to the active pool list.
   *
   * @param name - The name or pattern of the pool(s) to unfreeze.
   * @throws If the pool name is invalid or no matching pool is found.
   */
  public unfreeze(name: string | RegExp): void {
    if (!isStr(name) && !isRegex(name)) {
      throw new ClusterError(`Invalid pool name: ${String(name)}`);
    }

    const pools = match(toRegex(name), this.frozen);

    if (isEmptyArr(pools)) {
      throw new ClusterError(`No matching pool found: ${String(name)}`);
    }

    this.frozen = this.frozen.filter((pool) => !pools.includes(pool));
    this.pools.push(...pools);
  }

  /**
   * Closes all pending connections in the cluster.
   *
   * This method attempts to close all connections currently marked as pending.
   * It can operate in two modes: a forced closure where all connections are
   * closed regardless of any errors, and a normal mode where only failed
   * connections are retained for potential future attempts.
   *
   * @param force - A flag indicating whether to forcefully
   * close all pending connections. If set to `true`, all connections will be
   * closed regardless of any errors that occur during closure.
   *
   * @returns A promise that resolves when all pending connections
   * have been closed successfully or is rejected with the reason for the first
   * failure encountered during the closure process.
   *
   * @throws CloseConnectionError if there are any failures and `force` is `false`, the promise
   * will be rejected with the reason for the first failure.
   */
  public closePendingConnections(force: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!isBool(force)) force = false;

      if (isEmptyArr(this.PendingConnections)) return resolve();

      const promises = this.PendingConnections.map((con) => con.close());

      return Promise.allSettled(promises).then((results) => {
        if (force) {
          this.PendingConnections = [];
          return resolve();
        }

        this.PendingConnections = this.PendingConnections.filter(
          (_, index) => results[index].status === 'rejected'
        );

        // If no rejected connections remain, resolve
        if (isEmptyArr(this.PendingConnections)) return resolve();

        return reject(
          results.find((result) => result.status === 'rejected').reason
        );
      });
    });
  }

  /**
   * Shuts down the cluster, ensuring proper dereferencing of resources.
   *
   * This method first removes all pools from the cluster using `this.remove('*')`,
   * then closes any pending connections with `this.closePendingConnections(force)`.
   * Afterward, it nullifies internal properties and prevents further operations
   * by overriding critical methods with rejection or failure logic.
   *
   * @param force if `true`, forces the closure of pending connections.
   * @returns A promise that resolves when the shutdown is successfully completed.
   *
   * @throws `ClusterError` if any operation is attempted after shutdown.
   * @throws `ShutdownError` if an error occurs during the shutdown process.
   */
  public shutdown(force: boolean = false): Promise<void> {
    return new Promise((resolve, reject) => {
      this.remove('*')
        .then(() => this.closePendingConnections(force))
        .then(() => {
          this.id = null;
          this.warnings = null;
          this.createdAt = null;
          this.pools = null;
          this.PendingConnections = null;
          this.logger = null;
          this.mode = null;
          this.has = null;
          this.get = null;
          this.set = null;

          function reject() {
            return Promise.reject(
              new ClusterError(
                `Can't perform any farther operations after shutdown`
              )
            );
          }

          function fail() {
            throw new ClusterError(
              `Can't perform any farther operations after shutdown`
            );
          }

          this.add = fail;
          this.remove = reject;
          this.request = reject;
          this.shutdown = reject;
          this.closePendingConnections = reject;

          resolve();
        })
        .catch((e) => reject(new ShutdownError(e.message)));
    });
  }

  /**
   * Check the presence of various cluster properties.
   */
  public has: Checker = {
    logger: () => isChildOf(this.logger, Logger),
    pending: () => this.PendingConnections.length > 0,
    warnings: () => this.warnings.length > 0,
    frozen: (name?: string | RegExp) => {
      if (isUndefined(name)) return this.frozen.length > 0;

      if (!isStr(name) && !isRegex(name)) {
        throw new ClusterError(`Invalid pool name: ${name}`);
      }

      return match(toRegex(name), this.frozen).length > 0;
    },
    active: (name?: string | RegExp) => {
      if (isUndefined(name)) return this.pools.length > 0;

      if (!isStr(name) && !isRegex(name)) {
        throw new ClusterError(`Invalid pool name: ${name}`);
      }

      return match(toRegex(name), this.pools).length > 0;
    },
  };

  /**
   * Set certain properties of the Cluster instance, including modes and logger.
   */
  public set: Setter = {
    mode: (type: typeof ORDER_MODE | typeof RANDOM_MODE) => {
      if (![RANDOM_MODE, ORDER_MODE].includes(type)) {
        throw new ClusterError(`Invalid mode type: ${String(type)}`);
      }

      this.mode = type;
    },
    logger: (instance: Logger) => {
      if (!isChildOf(instance, Logger)) {
        throw new ClusterError(`Invalid logger: ${String(instance)}`);
      }

      this.logger = instance;
    },
    warnings: (messages: string | Array<string>) => {
      if (isStr(messages)) return this.warnings.push(messages as any);
      if (isEmptyArr(messages)) return (this.warnings = []);
      if (isArr(messages)) {
        return (messages as any).forEach((message) => {
          if (!isStr(message)) {
            throw new ClusterError(`Invalid warning: ${String(message)}`);
          }

          this.warnings.push(message);
        });
      }

      throw new ClusterError(`Invalid warnings: ${String(messages)}`);
    },
  };

  /**
   * Get various properties and information from the Cluster instance.
   */
  public get: Getter = {
    mode: () => this.mode,
    logger: () => this.logger,
    warnings: () => this.warnings,
    pools: {
      frozen: () => this.frozen,
      active: () => this.pools,
    },
    pool: (name?: string | RegExp) => {
      if (isEmptyArr(this.pools)) {
        throw new ClusterError(`No pool found!`);
      }

      if (isUndefined(name)) {
        if (this.mode === RANDOM_MODE) {
          const index = randomBetween(0, this.pools.length - 1);
          return this.pools[index];
        }

        const pool = this.pools.shift();
        this.pools.push(pool);
        return pool;
      }

      if (!isStr(name) && !isRegex(name)) {
        throw new ClusterError(`Invalid pool name: ${name}`);
      }

      const pools = match(toRegex(name), this.pools);

      if (isEmptyArr(pools)) {
        throw new ClusterError(`No matching pool found: ${name}`);
      }

      if (pools.length === 1) return pools[0];

      if (this.mode === RANDOM_MODE) {
        const index = randomBetween(0, pools.length - 1);
        return pools[index];
      }

      const $pool = pools.shift();

      this.pools = this.pools.filter((pool) => $pool.name !== pool.name);
      this.pools.push($pool);

      return $pool;
    },
    info: (): ClusterMap => {
      return {
        id: this.id,
        mode: this.mode,
        createdAt: this.createdAt,
        warnings: this.warnings,
        pools: {
          active: this.pools.map((pool) => this.get.infoAbout(pool.name)),
          frozen: this.frozen.map((pool) => this.get.infoAbout(pool.name)),
        },
        count: {
          pending: this.PendingConnections.length,
          pools: {
            active: this.pools.length,
            frozen: this.frozen.length,
          },
        },
      };
    },
    infoAbout: (name: string): PoolMap => {
      if (!isStr(name)) {
        throw new ClusterError(`Pool name must be a string`);
      }

      const pool = [...this.pools, ...this.frozen].find(
        (pool) => pool.name === name
      );

      if (isUndefined(pool)) {
        throw new ClusterError(`No matching pool found: ${name}`);
      }

      return {
        id: pool.id,
        name: pool.name,
        createdAt: pool.createdAt,
        driver: pool.get.driver(),
        options: pool.get.options(),
        performance: pool.get.performance(),
        count: {
          acquired: pool.get.count.acquired(),
          idle: pool.get.count.idle(),
          request: pool.get.count.request(),
        },
      };
    },
  };
}

/**
 * Custom error class for ClusterPool-related errors.
 *
 * @extends Error
 */
export class ClusterPoolError extends Error {}

/**
 * Represents a cluster connection pool for managing database connections.
 *
 * @extends Pool
 */
export class ClusterPool extends Pool {
  /**
   * The name of the connection pool.
   */
  public name: string;

  /**
   * Creates an instance of the ClusterPool.
   *
   * @param name - The name of the connection pool. Must be a valid text string.
   * @param driver - An instance of the Driver to manage database connections.
   * @param options - Optional configuration settings for the pool.
   * @throws an error if the provided name is not valid text.
   */
  constructor(name: string, driver: Driver, options?: PoolOptions) {
    super(driver, options);

    if (!isStr(name)) {
      throw new ClusterPoolError(`Invalid pool name: ${String(name)}`);
    }

    this.name = name;
  }
}
