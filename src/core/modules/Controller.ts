import { AppOptions, config } from '../../config';
import { Builder, PoolConnection } from '..';
import { isFunc, isPromise, isStr } from '../../helpers';

export class ControllerError extends Error {}

/**
 * Base controller providing database connection and query builder utilities.
 */
export class Controller {
  protected config: AppOptions = config().loadSync();

  /**
   * Executes a callback with a database connection.
   *
   * - Fetches a connection from the specified pool or the default.
   * - Ensures the connection is released after execution.
   * - Supports both synchronous and asynchronous callbacks.
   *
   * @param callback - Function to execute with the database connection.
   * @param pool - Optional pool name to request the connection from.
   * @returns A promise resolving to the callback's return value.
   * @throws `ControllerError` if the callback is invalid or the pool name is incorrect.
   */
  protected connection<T>(
    callback: (connection: PoolConnection) => Promise<T> | T,
    pool?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!isFunc(callback)) {
        return reject(new ControllerError('Invalid callback function'));
      }

      if (pool && !isStr(pool)) {
        return reject(new ControllerError('Invalid pool name'));
      }

      this.config.cluster
        .request(pool ? pool : this.config.default)
        .then((connection) => {
          try {
            const value = callback(connection);

            if (!isPromise(value)) {
              return connection.release(), resolve(value);
            }

            return value
              .then((value) => (connection.release(), resolve(value)))
              .catch((error) => (connection.release(), reject(error)));
          } catch (error) {
            connection.release(), reject(error);
          }
        })
        .catch(reject);
    });
  }

  /**
   * Executes a callback with a query builder.
   *
   * - Retrieves a connection and initializes a query builder.
   * - Ensures the connection is released after execution.
   * - Supports both synchronous and asynchronous callbacks.
   *
   * @param callback - Function to execute with the query builder.
   * @param pool - Optional pool name to request the connection from.
   * @returns A promise resolving to the callback's return value.
   * @throws `ControllerError` if the callback is invalid or the pool name is incorrect.
   */
  protected builder<T>(
    callback: (builder: Builder) => Promise<T> | T,
    pool?: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!isFunc(callback)) {
        return reject(new ControllerError('Invalid callback function'));
      }

      if (pool && !isStr(pool)) {
        return reject(new ControllerError('Invalid pool name'));
      }

      this.config.cluster
        .request(pool ? pool : this.config.default)
        .then((connection) => {
          try {
            const value = callback(new Builder(connection));

            if (!isPromise(value)) {
              return connection.release(), resolve(value);
            }

            return value
              .then((value) => (connection.release(), resolve(value)))
              .catch((error) => (connection.release(), reject(error)));
          } catch (error) {
            connection.release(), reject(error);
          }
        })
        .catch(reject);
    });
  }
}
