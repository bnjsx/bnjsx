import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import EventEmitter from 'events';
import mime from 'mime-types';
import { access, stat } from 'fs/promises';
import { randomBytes } from 'crypto';
import { Router } from './Router';
import { Request } from './Request';
import { Response } from './Response';
import { isAbsolute, normalize, resolve as resolver } from 'path';
import { isArr, isArrOfStr, isChildOf, isFullArr, isFunc } from '../../helpers';
import { AppOptions, config, OriginFunc } from '../../config';
import { isInt, isObj, isPromise, isStr } from '../../helpers';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../errors';
import { isTrue, UTC } from '../../helpers';

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
 * Represents a range with a start, end, and size.
 *
 * @property `start` - The starting point of the range.
 * @property `end` - The ending point of the range.
 * @property `size` - The size of the range.
 */
export type Range = { start: number; end: number; size: number };

/**
 * Type definition for middleware functions.
 *
 * Middleware functions are executed during the request-response lifecycle.
 *
 * @param req The request object.
 * @param res The response object.
 * @param err Optional error to handle.
 * @returns A promise that resolves once the middleware processing is complete.
 */
export type Middleware = (
  req: Request,
  res: Response,
  err?: Error
) => Promise<void>;

/**
 * Retrieves the application key (APP_KEY) from environment variables.
 *
 * @throwsIf APP_KEY is not defined.
 * @returns The application key as a string.
 */
export function appKey(): string {
  if (!process.env.APP_KEY) {
    throw new AppError(
      'Missing APP_KEY: execute "node cmd new:key" to generate a new APP_KEY'
    );
  }

  return process.env.APP_KEY;
}

/**
 * Determines if the given name is included in the origins.
 *
 * @param name - The name to check against the origins.
 * @param origins - A list of origins, a wildcard '*', or a function to validate the name.
 *
 * @returns A promise that resolves to true if the name is included in the origins, false otherwise.
 */
export function origin(
  name: string,
  origins: string[] | '*' | OriginFunc
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (origins === '*') return resolve(true);
    if (isArrOfStr(origins)) return resolve(origins.includes(name));
    if (isFunc(origins)) return resolve(origins(name));
    return resolve(false);
  });
}

/**
 * Parses the Range HTTP header and determines the byte range for a resource.
 *
 * @param header - The value of the Range HTTP header (e.g., 'bytes=100-200').
 * @param size - The size of the resource being requested.
 *
 * @returns An object with `start`, `end`, and `size` properties, or null if the header is invalid.
 */
export function ranger(header: string, size: number): Range | null {
  const match = header.match(/^bytes=(\d+)?-(\d+)?$/);

  if (!match) return null;

  let start = match[1] ? parseInt(match[1], 10) : null;
  let end = match[2] ? parseInt(match[2], 10) : null;

  if (start === null && end === null) return null;

  if (start === null) (start = size - end), (end = size - 1);

  if (end === null) end = size - 1;

  if (start < 0 || start >= size || end < 0 || end >= size || start > end) {
    return null;
  }

  return { start, end, size };
}

/**
 * Parses the cookie header and populates `req.cookies`.
 *
 * @param req - The request object.
 * @param res - The response object (not used in this function).
 *
 * @returns A promise that resolves once the cookies are parsed and set in `req.cookies`.
 */
export function cookie(req: Request, res: Response): Promise<void> {
  return new Promise((resolve) => {
    const cookie = req.getHeader('cookie');

    if (!isStr(cookie)) return (req.cookies = {}) && resolve();

    req.cookies = cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .reduce((cookies: Record<string, string>, cookie) => {
        const [key, value] = cookie.split('=');
        if (key && value) cookies[key] = decodeURIComponent(value);
        return cookies;
      }, {});

    return resolve();
  });
}

/**
 * Parses the JSON content from the request body.
 *
 * @param req - The request object.
 * @param res - The response object (not used in this function).
 *
 * @returns A promise that resolves once the JSON body is parsed or rejects if an error occurs.
 */
export function json(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    const content = req.getHeader('content-type') || '';

    if (!content.includes('application/json')) return resolve();

    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        if (chunks.length > 0) {
          req.body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        }

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

/**
 * Parses the plain text or HTML content from the request body.
 *
 * @param req - The request object.
 * @param res - The response object (not used in this function).
 *
 * @returns A promise that resolves once the text content is parsed.
 */
export function text(req: Request, res: Response): Promise<void> {
  return new Promise((resolve) => {
    const type = req.getHeader('content-type') || '';

    if (!(type.includes('text/plain') || type.includes('text/html'))) {
      return resolve();
    }

    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      req.body = Buffer.concat(chunks).toString('utf8');
      resolve();
    });
  });
}

/**
 * Serves static assets, supporting caching, compression, and range requests.
 *
 * @param req - The request object.
 * @param res - The response object.
 *
 * @returns A promise that resolves once the asset is served or rejects if there is an error.
 */
export function asset(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    let { root, gzip, cache } = config().loadSync().public;

    if (!isAbsolute(root)) root = resolver(config().resolveSync(), root);

    const path = resolver(root, normalize('./' + req.path));

    if (!path.startsWith(root)) {
      return reject(
        new ForbiddenError(`The requested resource is forbidden at: '${path}'`)
      );
    }

    stat(path)
      .then((stats) => {
        if (!stats.isFile()) return resolve();

        const buffer = 'application/octet-stream';
        const etag = `${stats.mtimeMs}-${stats.size}`;
        const gzp = path.concat('.gz');
        const type = mime.contentType(path) || buffer;

        const matched = req.getHeader('If-None-Match');
        const modified = req.getHeader('If-Modified-Since') as string;
        const encoding = req.getHeader('Accept-Encoding');
        const range = req.getHeader('Range');

        res.setHeader('Content-Type', type);
        res.setHeader('Accept-Ranges', 'bytes');

        if (!range) {
          res.setHeader('ETag', etag);
          res.setHeader('Last-Modified', stats.mtimeMs.toString());
          res.setHeader('Cache-Control', `public, max-age=${cache}`);
        }

        // Handle caching: ETag takes precedence over Last-Modified
        if (matched && matched === etag) {
          return resolve(res.status(304).send());
        }

        if (modified && modified === stats.mtimeMs.toString()) {
          return resolve(res.status(304).send());
        }

        // If no range is specified, send the entire file
        if (!range || !isStr(range)) {
          res.setHeader('Content-Length', stats.size);

          if (gzip && encoding.includes('gzip')) {
            return access(gzp)
              .then(() => {
                res.setHeader('Content-Encoding', 'gzip');
                resolve(res.stream(fs.createReadStream(gzp)));
              })
              .catch(() => resolve(res.stream(fs.createReadStream(path))));
          }

          return resolve(res.stream(fs.createReadStream(path)));
        }

        const ranges = ranger(range, stats.size);

        if (ranges) {
          const { start, end, size } = ranges;
          res.status(206); // Partial-Content
          res.setHeader('Content-Length', end - start + 1);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
          return resolve(res.stream(fs.createReadStream(path, { start, end })));
        }

        res.setHeader('Content-Range', `bytes */${stats.size}`);
        return resolve(res.status(416).send());
      })
      .catch((err) => (err.code !== 'ENOENT' ? reject(err) : resolve()));
  });
}

/**
 * Handles Cross-Origin Resource Sharing (CORS) headers for the response.
 *
 * @param req - The request object.
 * @param res - The response object.
 *
 * @returns A promise that resolves once the CORS headers are set or rejects if the origin is forbidden.
 */
export function cors(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!req.headers.origin) return resolve();

    const options = config().loadSync<AppOptions>().cors;

    origin(req.headers.origin, options.origin)
      .then((allowed) => {
        if (!allowed) {
          return reject(
            new ForbiddenError(
              `This origin is forbidden: '${req.headers.origin}'`
            )
          );
        }

        res.setHeader('Vary', 'Origin'); // Cache responses per origin
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);

        if (options.credentials) {
          res.setHeader(
            'Access-Control-Allow-Credentials',
            String(options.credentials)
          );
        }

        if (options.methods) {
          res.setHeader(
            'Access-Control-Allow-Methods',
            options.methods.join(', ')
          );
        }

        if (options.headers) {
          res.setHeader(
            'Access-Control-Allow-Headers',
            options.headers.join(', ')
          );
        }

        if (options.expose) {
          res.setHeader(
            'Access-Control-Expose-Headers',
            options.expose.join(', ')
          );
        }

        if (options.maxAge) {
          res.setHeader('Access-Control-Max-Age', options.maxAge);
        }

        if (req.method === 'OPTIONS') {
          return resolve(res.status(204).send());
        }

        return resolve();
      })
      .catch(reject);
  });
}

/**
 * Sets security-related HTTP headers for the response.
 *
 * @param req - The request object.
 * @param res - The response object.
 *
 * @returns A promise that resolves once the security headers are set.
 */
export function secure(req: Request, res: Response): Promise<void> {
  return new Promise((resolve) => {
    const options = config().loadSync<AppOptions>().security;

    if (options.contentSecurityPolicy) {
      const policy = Object.entries(options.contentSecurityPolicy)
        .map(([key, value]) => {
          key = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
          if (isTrue(value)) return key;
          if (isArr(value)) return `${key} ${value.join(' ')}`;
          return `${key} ${value}`;
        })
        .join('; ');
      res.setHeader('Content-Security-Policy', policy);
    }

    if (options.strictTransportSecurity) {
      const hsts = [`max-age=${options.strictTransportSecurity.maxAge}`];
      if (options.strictTransportSecurity.preload) hsts.push('preload');
      if (options.strictTransportSecurity.includeSubDomains) {
        hsts.push('includeSubDomains');
      }

      res.setHeader('Strict-Transport-Security', hsts.join('; '));
    }

    if (options.referrerPolicy) {
      res.setHeader('Referrer-Policy', options.referrerPolicy);
    }

    if (options.crossOriginResourcePolicy) {
      res.setHeader(
        'Cross-Origin-Resource-Policy',
        options.crossOriginResourcePolicy
      );
    }

    if (options.crossOriginOpenerPolicy) {
      res.setHeader(
        'Cross-Origin-Opener-Policy',
        options.crossOriginOpenerPolicy
      );
    }

    if (options.crossOriginEmbedderPolicy) {
      res.setHeader(
        'Cross-Origin-Embedder-Policy',
        options.crossOriginEmbedderPolicy
      );
    }

    if (options.originAgentCluster) {
      res.setHeader('Origin-Agent-Cluster', '?1');
    }

    if (options.xContentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    if (options.xDnsPrefetchControl) {
      res.setHeader('X-DNS-Prefetch-Control', 'off');
    }

    if (options.xDownloadOptions) {
      res.setHeader('X-Download-Options', 'noopen');
    }

    if (options.xFrameOptions) {
      res.setHeader('X-Frame-Options', options.xFrameOptions);
    }

    if (options.xPermittedCrossDomainPolicies) {
      res.setHeader(
        'X-Permitted-Cross-Domain-Policies',
        options.xPermittedCrossDomainPolicies
      );
    }

    if (options.xssProtection) {
      res.setHeader('X-XSS-Protection', '0');
    }

    resolve();
  });
}

/**
 * Handles CSRF token generation and validation.
 *
 *
 * @param req - The request object.
 * @param res - The response object.
 *
 * @returns A promise that resolves once the CSRF token is set or validated, or rejects if the token is invalid.
 */
export function csrf(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    if (req.method === 'GET') {
      if (req.cookies?.csrfToken) {
        req.csrfToken = req.cookies.csrfToken;
        return resolve();
      }

      // Generate CSRF token
      req.csrfToken = randomBytes(32).toString('base64url');
      res.cookie('csrfToken', req.csrfToken, {
        expires: UTC.future.hour(1), // 1 hour
        path: '/',
        secure: config().loadSync().env === 'pro',
        httpOnly: true,
        sameSite: 'Strict',
        priority: 'High',
      });

      return resolve();
    }

    const cookie = req.cookies?.csrfToken;
    const token = req.body?.csrfToken;

    // CSRF validation
    if (!cookie || !token || cookie !== token) {
      return reject(new BadRequestError('Invalid or missing CSRF token'));
    }

    return resolve();
  });
}

/**
 * The `App` class represents a web server application, extending `EventEmitter` to handle server events.
 * It supports both HTTP and HTTPS protocols, middleware management, routing, and graceful start/stop operations.
 */
export class App extends EventEmitter {
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
  private routers: Record<string, Array<Router>> = {};

  /**
   * Application options with default values.
   */
  private options: AppOptions = {
    env: 'dev',
    mode: 'web',
    protocol: 'http',
    host: 'localhost',
    port: 2025,
  };

  /**
   * Creates an instance of the `App` class.
   *
   * @param options Custom options to configure the app.
   * @throws `AppError` if invalid options are provided.
   */
  constructor(options?: AppOptions) {
    super();

    if (options) {
      if (!isObj(options)) throw new AppError('Invalid app options provided');

      // Check for valid port (should be a positive integer)
      if (options.port) {
        if (!isInt(options.port) || options.port < 0)
          throw new AppError('Invalid port provided');
        else this.options.port = options.port;
      }

      // Check for valid host (should be a string)
      if (options.host) {
        if (!isStr(options.host)) throw new AppError('Invalid host provided');
        else this.options.host = options.host;
      }

      // Check for valid key (should be a string)
      if (options.key) {
        if (!isStr(options.key)) throw new AppError('Invalid key provided');
        else this.options.key = options.key;
      }

      // Check for valid cert (should be a string)
      if (options.cert) {
        if (!isStr(options.cert)) throw new AppError('Invalid cert provided');
        else this.options.cert = options.cert;
      }

      // Check for valid env (should be 'dev' or 'pro')
      if (options.env) {
        if (!['dev', 'pro'].includes(options.env))
          throw new AppError('Invalid environment provided');
        else this.options.env = options.env;
      }

      // Check for valid env (should be 'web' or 'api')
      if (options.mode) {
        if (!['web', 'api'].includes(options.mode))
          throw new AppError('Invalid mode provided');
        else this.options.mode = options.mode;
      }

      // Check for valid protocol (should be 'http' or 'https')
      if (options.protocol) {
        if (!['http', 'https'].includes(options.protocol))
          throw new AppError('Invalid protocol provided');
        else this.options.protocol = options.protocol;
      }

      if (options.cert && !options.key) throw new AppError('Missing https key');
      if (options.key && !options.cert)
        throw new AppError('Missing https cert');
    }

    // Choose server based on protocol
    if (this.options.protocol === 'http') {
      this.server = http.createServer(this.process.bind(this));
      return;
    }

    if (!this.options.key || !this.options.cert) {
      throw new AppError('For HTTPS, key and cert must be provided');
    }

    const httpsOptions = {
      key: fs.readFileSync(this.options.key),
      cert: fs.readFileSync(this.options.cert),
    };

    this.server = https.createServer(httpsOptions, this.process.bind(this));
  }

  /**
   * Adds a global middleware to the application.
   *
   * @param middleware The middleware function to be added.
   * @throws `AppError` if the middleware is invalid.
   */
  public use(middleware: Middleware): void {
    if (!isFunc(middleware)) throw new AppError('Invalid middleware function');
    if (middleware.length <= 2) this.middlewares.push(middleware);
    else if (middleware.length === 3) this.handlers.push(middleware);
    else throw new AppError('Invalid middleware function');
  }

  /**
   * Associates a router with a specific namespace.
   *
   * @param name The namespace for the router.
   * @param router The router to associate with the namespace.
   * @throws `AppError` if the namespace or router is invalid.
   */
  public namespace(name: string, router: Router): void {
    if (!isStr(name)) throw new AppError('Invalid namespace');
    if (!isChildOf(router, Router)) throw new AppError('Invalid router');
    if (!isArr(this.routers[name])) this.routers[name] = new Array();
    this.routers[name].push(router);
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
          console.log(`Server is running on ${protocol}://${host}:${port}`);

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

        console.log('Server stopped gracefully');

        // After Stop
        this.emit(STOPPED);
        return resolve();
      });
    });
  }

  /**
   * Handles errors by rendering appropriate error pages or JSON responses based on the environment and request mode.
   *
   * @param req The request object.
   * @param res The response object.
   * @param err The error to be handled.
   * @returns A promise that resolves after the error is handled.
   */
  private handler(req: Request, res: Response, err: Error): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.options.env === 'dev') console.log(err);

      if (isFullArr(this.handlers)) {
        return this.execute(this.handlers, req, res, err)
          .then(resolve)
          .catch(reject);
      }

      if (this.options.mode === 'web') {
        if (err instanceof BadRequestError) {
          return res
            .status(400)
            .render('errors.400')
            .then(resolve)
            .catch(reject);
        }

        if (err instanceof ForbiddenError) {
          return res
            .status(403)
            .render('errors.403')
            .then(resolve)
            .catch(reject);
        }

        if (err instanceof NotFoundError) {
          return res
            .status(404)
            .render('errors.404')
            .then(resolve)
            .catch(reject);
        }

        return res.status(500).render('errors.500').then(resolve).catch(reject);
      }

      if (err instanceof BadRequestError) {
        return res
          .status(400)
          .json({ error: 'BadRequestError', message: 'Bad Request.' })
          .then(resolve)
          .catch(reject);
      }

      if (err instanceof ForbiddenError) {
        return res
          .status(403)
          .json({ error: 'ForbiddenError', message: 'Access Forbidden.' })
          .then(resolve)
          .catch(reject);
      }

      if (err instanceof NotFoundError) {
        return res
          .status(404)
          .json({
            error: 'NotFoundError',
            message: 'The requested resource could not be found.',
          })
          .then(resolve)
          .catch(reject);
      }

      return res
        .status(500)
        .json({ error: 'ServerError', message: 'Ops! Something went wrong.' })
        .then(resolve)
        .catch(reject);
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

      req.protocol = protocol;
      req.host = url.hostname;
      req.port = url.port;
      req.path = url.pathname;
      req.query = url.searchParams;

      // Access res in req and reverse
      req.response = res;
      res.request = req;

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

      const router = this.routers[namespace].find((router) => {
        if (namespace === '/') return router.match(req.path, req.method);
        return router.match(req.path.replace(namespace, ''), req.method);
      });

      if (!router) {
        return this.execute([...this.middlewares, issue], req, res)
          .catch((err) => this.handler(req, res, err))
          .catch(reject)
          .then(resolve);
      }

      const match = router.match(req.path, req.method);
      const middlewares = [...this.middlewares, ...match.middlewares];
      req.params = match.params as any;

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
