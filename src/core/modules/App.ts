import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import EventEmitter from 'events';
import { RouteMatch, Router } from './Router';
import { Request } from './Request';
import { Response } from './Response';
import { AppOptions, config } from '../../config';
import { isChildOf, isSubclass } from '../../helpers';
import { bugger, orange, isPromise, isStr, isFunc, isArr } from '../../helpers';
import { NotFoundError } from '../../errors';
import { Service } from './Service';
import { Entry } from '../validation/Entry';
import { Middleware } from '../middlewares';

/**
 * Symbol representing the start event.
 * Emitted before the server starts.
 */
export const START = Symbol('START');

/**
 * Symbol representing the started event.
 * Emitted after the server starts successfully.
 */
export const STARTED = Symbol('STARTED');

/**
 * Symbol representing the stop event.
 * Emitted before the server stops.
 */
export const STOP = Symbol('STOP');

/**
 * Symbol representing the stopped event.
 * Emitted after the server stops successfully.
 */
export const STOPPED = Symbol('STOPPED');

/**
 * Custom error class for application-related errors.
 * Inherits from the built-in `Error` class.
 */
export class AppError extends Error {}

/**
 * A class constructor type for creating instances of a Service-based router.
 */
export type RouterConstructor = new (req: Request, res: Response) => Service;

/**
 * A class constructor type for creating instances of a Service-based router.
 */
export type RouterInstance = Service | Router;

/**
 * Retrieves the application key (APP_KEY) from environment variables.
 *
 * @throwsIf APP_KEY is not defined.
 * @returns The application key as a string.
 */
export function appKey(): string {
  if (!process.env.APP_KEY) {
    throw new AppError(
      'Missing APP_KEY: execute "node exec mk:env" to generate a new APP_KEY'
    );
  }

  return process.env.APP_KEY;
}

/**
 * Removes the given namespace prefix from a path and normalizes the result.
 *
 * Useful for routing systems to extract the sub-path relative to a router's mount point.
 * Ensures a leading slash and handles trailing slashes safely.
 *
 * @param namespace - The route prefix or mount path.
 * @param path - The full request path to process.
 * @returns The path with the namespace removed. Always starts with '/'.
 *
 * @example
 * stripNamespace('/admin', '/admin/users'); // '/users'
 * stripNamespace('/api/v1', '/api/v1');     // '/'
 * stripNamespace('/', '/login');            // '/login'
 */
export function stripNamespace(namespace: string, path: string): string {
  // Normalize trailing slashes
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  if (namespace !== '/' && path.startsWith(namespace)) {
    return path.slice(namespace.length) || '/';
  }

  return path; // Global namespace: return full path
}

/**
 * The `App` class represents a web server application, extending `EventEmitter` to handle server events.
 * It supports both HTTP and HTTPS protocols, middleware management, routing, and graceful start/stop operations.
 */
export class App extends EventEmitter {
  private static app: App;

  /**
   * HTTP or HTTPS server instance.
   */
  private server: http.Server;

  /**
   * Array to store middleware functions to be executed in sequence.
   */
  private middlewares: Array<Middleware> = new Array();

  /**
   * Array to store handler middleware functions for error handling.
   */
  private handlers: Array<Middleware> = new Array();

  /**
   * Object that maps namespaces to arrays of routers.
   */
  private routers: Record<string, Array<Router | RouterConstructor>> = {};

  /**
   * Application options with default values.
   */
  private options: AppOptions;

  /**
   * Creates an instance of the `App` class following the Singleton pattern.
   * Ensures only one instance of the `App` class is created throughout the application.
   */
  constructor() {
    super();

    // Return the same instance
    if (App.app instanceof App) return App.app;

    this.options = config().loadSync();

    // Choose server based on protocol
    if (this.options.protocol === 'https') {
      if (!isStr(this.options.key) || !isStr(this.options.cert)) {
        throw new AppError('For HTTPS, key and cert must be provided');
      }

      const httpsOptions = {
        key: fs.readFileSync(this.options.key),
        cert: fs.readFileSync(this.options.cert),
      };

      this.server = https.createServer(httpsOptions, this.process.bind(this));
    } else this.server = http.createServer(this.process.bind(this));

    // Keep a reference to the first instance
    App.app = this;
  }

  /**
   * Adds a global middleware to the application.
   *
   * @param middleware The middleware function to be added.
   * @throws `AppError` if the middleware is invalid.
   */
  public use(middleware: Middleware): this {
    if (!isFunc(middleware)) throw new AppError('Invalid middleware function');
    if (middleware.length <= 2) this.middlewares.push(middleware);
    else if (middleware.length === 3) this.handlers.push(middleware);
    else throw new AppError('Invalid middleware function');
    return this;
  }

  /**
   * Associates a router with a specific namespace.
   *
   * @param name The namespace for the router.
   * @param router The router to associate with the namespace.
   * @throws `AppError` if the namespace or router is invalid.
   */
  public namespace(name: string, router: Router | RouterConstructor): this {
    if (!isStr(name)) throw new AppError('Invalid namespace');
    if (!isChildOf(router, Router) && !isSubclass(router, Service)) {
      throw new AppError('Invalid router');
    }

    if (!isArr(this.routers[name])) this.routers[name] = new Array();
    this.routers[name].push(router);
    return this;
  }

  /**
   * Registers a router under the root namespace (`'/'`).
   *
   * Accepts either a `Router` instance or a `Service` subclass.
   * Throws an error if the router is not valid.
   *
   * @param router - A Router instance or a Service-based router constructor.
   * @throws AppError if the provided router is invalid.
   */
  public register(router: Router | RouterConstructor): this {
    if (!isChildOf(router, Router) && !isSubclass(router, Service)) {
      throw new AppError('Invalid router');
    }

    if (!isArr(this.routers['/'])) this.routers['/'] = new Array();
    this.routers['/'].push(router);
    return this;
  }

  /**
   * Starts the server and begins listening for requests.
   *
   * @returns A promise that resolves when the server starts successfully.
   * @throws `Error` if server startup fails.
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Before Start
      this.emit(START);

      // Start the server
      this.server.listen(
        this.options.port,
        this.options.host,
        (error?: Error) => {
          if (error) return reject(error);

          const { protocol, host, port } = this.options;
          console.log(
            orange('  💡  Server is running on: ').concat(
              `${protocol}://${host}:${port}`
            )
          );

          // After Start
          this.emit(STARTED);
          return resolve();
        }
      );
    });
  }

  /**
   * Stops the server gracefully.
   *
   * @returns A promise that resolves when the server stops successfully.
   * @throws `Error` if server stop fails.
   */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Before Stop
      this.emit(STOP);

      // Close the server gracefully
      this.server.close((error?: Error) => {
        if (error) return reject(error);

        console.log(orange('  💡  Server stopped gracefully'));

        // After Stop
        this.emit(STOPPED);
        return resolve();
      });
    });
  }

  /**
   * The final error handler — executes your registered error handlers, and if none of them handle the error,
   * it gracefully handles the error itself. It also catches any errors thrown by your error handlers.
   *
   * This ensures a reliable fallback response is always sent (JSON or HTML depending on mode),
   * and guarantees that the app never crashes from unhandled errors. If a response cannot be sent,
   * it will simply resolve to prevent further failure.
   *
   * @param req - The incoming request object.
   * @param res - The response object.
   * @param err - The error that occurred during request handling.
   * @returns A promise that always resolves, regardless of the outcome.
   */
  private handler(req: Request, res: Response, err: Error): Promise<void> {
    return new Promise((resolve) => {
      if (this.options.env === 'dev') bugger(err);

      return this.execute(this.handlers, req, res, err)
        .then(resolve)
        .catch((err) => {
          if (this.options.env === 'dev') bugger(err);

          if (this.options.mode === 'api') {
            return res
              .status(500)
              .json({
                success: false,
                error: {
                  name: 'ServerError',
                  message: 'Ops! Something went wrong.',
                },
              })
              .then(resolve)
              .catch(() => resolve()); // ignore any errors
          }

          return res
            .status(500)
            .html(
              `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>500 | SERVER ERROR</title><style>body{margin:0;background:#121212;color:#ccc;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center}h1{font-weight:400;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;user-select:none}</style></head><body><h1>500 | SERVER ERROR</h1></body></html>`
            )
            .then(resolve)
            .catch(() => resolve()); // ignore any errors
        });
    });
  }

  /**
   * Processes the incoming request and executes the appropriate middleware or route handler.
   *
   * @param req The request object.
   * @param res The response object.
   * @returns A promise that resolves after processing the request.
   */
  private process(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      const { protocol, host, port } = this.options;
      const base = `${protocol}://${host}:${port}`;
      const url = new URL(req.url, base);

      req.href = url.pathname + url.search;
      req.search = url.search;
      req.protocol = protocol;
      req.host = url.hostname;
      req.port = url.port;
      req.path = url.pathname;
      req.query = url.searchParams;

      // Access res in req and reverse
      req.response = res;
      res.request = req;

      // Set ip & base
      req.ip = req.getIp();
      req.base = req.getBase();

      const issue = async () => {
        throw new NotFoundError(`Resource not found at '${req.url}'`);
      };

      const namespace = Object.keys(this.routers).find((key) =>
        req.path.startsWith(key)
      );

      if (!namespace) {
        return this.execute([...this.middlewares, issue], req, res)
          .catch((err) => this.handler(req, res, err))
          .catch(reject)
          .then(resolve);
      }

      let found: { router: RouterInstance; match: RouteMatch } | void;

      for (const r of this.routers[namespace]) {
        const instance =
          isFunc(r) && isSubclass(r, Service)
            ? new (r as RouterConstructor)(req, res)
            : (r as RouterInstance);

        const path = stripNamespace(namespace, req.path);
        const match = instance.match(path, req.method);

        if (match) {
          if (instance instanceof Service) {
            const query: Record<string, string | string[]> = {};

            for (const key of req.query.keys()) {
              const values = req.query.getAll(key);
              query[key] = values.length === 1 ? values[0] : values;
            }

            instance.query = new Entry(query);
            instance.params = new Entry(match.params);
          }

          found = { router: instance, match };
          break;
        }
      }

      if (!found) {
        return this.execute([...this.middlewares, issue], req, res)
          .catch((err) => this.handler(req, res, err))
          .catch(reject)
          .then(resolve);
      }

      const middlewares = [...this.middlewares, ...found.match.middlewares];
      req.params = found.match.params as any;

      return this.execute(middlewares, req, res)
        .catch((err) => this.handler(req, res, err))
        .catch(reject)
        .then(resolve);
    });
  }

  /**
   * Executes the provided middlewares in sequence.
   *
   * @param middlewares - An array of middleware functions to be executed in sequence.
   * @param req - The request object.
   * @param res - The response object.
   * @param err - An optional error object, if any error occurs in the middlewares.
   * @param index - The index of the current middleware to execute, defaults to 0.
   *
   * @returns A promise that resolves when the response is sent, or rejects if the response is not sent after all middlewares.
   */
  private execute(
    middlewares: Array<Middleware>,
    req: Request,
    res: Response,
    err?: Error,
    index: number = 0
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (res.writableEnded) return resolve();

      if (index >= middlewares.length) {
        return reject(
          new AppError('Response not sent after processing all middlewares.')
        );
      }

      const middleware = middlewares[index];
      const promise = middleware(req, res, err);

      if (!isPromise(promise)) {
        return reject(new AppError('Invalid middleware'));
      }

      promise
        .then(() => this.execute(middlewares, req, res, err, index + 1))
        .then(resolve)
        .catch(reject);
    });
  }
}
