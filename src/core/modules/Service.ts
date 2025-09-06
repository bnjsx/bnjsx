import { isFunc, isInt, isObj, isStr, isSubclass } from '../../helpers';
import { AppOptions, config } from '../../config';
import { UTC } from '../../helpers/UTC';
import { Logger } from '../../helpers/Logger';
import { Request } from './Request';
import { Redirector, Response } from './Response';
import { Validator } from './Validator';
import { Table, TableFinder } from './Table';
import { Router } from './Router';
import { FLASH_SET_KEY } from '../middlewares/flash';
import { Fetcher } from './Fetcher';
import { FileOptions, Form } from './Form';
import { resolve, normalize, relative, sep, isAbsolute } from 'path';
import { store, Store, StoreOptions } from '../../helpers/Store';
import { folder, Folder, FolderOptions } from '../../helpers/Folder';
import { Builder } from './Builder';
import { Entry } from '../validation/Entry';
import { ValidatorError } from '../../errors';

/**
 * Custom error class can be thrown and caught to handle service-specific errors.
 */
export class ServiceError extends Error {}

/**
 * Represents pagination metadata and navigation URLs.
 *
 * @property `next` - URL of the next page, or `false` if none.
 * @property `prev` - URL of the previous page, or `false` if none.
 * @property `current` - The current page number.
 * @property `total` - The total number of pages.
 *
 * @example
 * const page: Page = {
 *   next: '/users?page=3',
 *   prev: '/users?page=1',
 *   current: 2,
 *   total: 5,
 * };
 */
export interface Page {
  next: string | false;
  prev: string | false;
  current: number;
  total: number;
}

/**
 * A single unit combining routing, validation, data handling, rendering, and caching, all you need to handle HTTP requests in one place.
 */
export class Service extends Router {
  /** The HTTP request object for the current request. */
  public request: Request;

  /** The HTTP response object for sending responses. */
  public response: Response;

  /** The HTTP request object for the current request. */
  public req: Request;

  /** The HTTP response object for sending responses. */
  public res: Response;

  /** Parsed route parameters extracted from the URL path. */
  public params: Entry;

  /** Parsed query parameters from the URL. */
  public query: Entry;

  /** Loaded application configuration options. */
  public config: AppOptions;

  /** Application root directory path. */
  public root: string;

  /** Logger for app logging. */
  public logger: Logger;

  /** Validator class used by this service. */
  public Validator: new (req: Request, res: Response) => Validator;

  /**
   * Core service base class constructor.
   *
   * @param request - Incoming HTTP request object.
   * @param response - Outgoing HTTP response object.
   *
   * Initializes the service with default Validator instance,
   * loads configuration synchronously, and resolves application root path.
   */
  constructor(request: Request, response: Response) {
    super();

    this.request = request;
    this.response = response;
    this.req = request;
    this.res = response;

    this.config = config().loadSync();
    this.root = config().resolveSync();

    this.logger = new Logger(resolve(this.root, '.log'));
  }

  /**
   * Create a fresh Validator instance and register rules using a setup callback.
   *
   * @param setup - Optional function to configure rules on the validator.
   * @returns A fresh Validator instance with registered rules.
   */
  protected validator(setup?: (v: Validator) => void): Validator {
    const ValidatorClass = this.Validator ?? Validator;
    const v = new ValidatorClass(this.request, this.response);

    if (isFunc(setup)) setup(v);
    return v;
  }

  /**
   * Override the Validator class for this service instance.
   *
   * @param validator - Custom validator class extending Validator.
   * @returns This service instance (for chaining).
   */
  protected setValidator(
    validator: new (req: Request, res: Response) => Validator
  ): this {
    if (!isSubclass(validator, Validator)) {
      throw new ValidatorError('Invalid validator provided');
    }

    this.Validator = validator;
    return this;
  }

  /**
   * Get a Redirector to handle HTTP redirects.
   *
   * @returns `Redirector` instance tied to the response.
   */
  protected async upload(
    name: string,
    options: FileOptions
  ): Promise<Validator> {
    const validator = this.validator();

    const file = validator.file(name);

    if (options?.required) file.required();
    if (options?.count) file.count(options.count);
    if (options?.size) file.size(options.size.min, options.size.max);
    if (options?.location) file.location(options.location);
    if (options?.type) file.type(options.type);

    await validator.validate();

    return validator;
  }

  /**
   * Converts a file system path to a public-facing URL path.
   *
   * Always resolves the file relative to the configured public root,
   * regardless of whether it's absolute or relative to the project root.
   *
   * @param filePath - The path to the file (absolute or relative).
   * @returns A public URL path (e.g. "/covers/image.jpg").
   */
  protected public(filePath: string): string {
    const root = resolve(this.root, this.config.public.root);
    const full = resolve(this.root, normalize(filePath));

    const rel = relative(root, full);

    if (rel.startsWith('..') || isAbsolute(rel)) {
      throw new ServiceError(
        `Path is outside of the public folder: ${filePath}`
      );
    }

    return '/' + rel.split(sep).join('/');
  }

  /**
   * Get a Redirector to handle HTTP redirects.
   *
   * @returns `Redirector` instance tied to the response.
   */
  protected redirect(path?: string): Redirector {
    return this.response.redirect(path);
  }

  /**
   * Redirect to the specified path with an optional flash message.
   *
   * @param path - The target path to redirect the user to.
   * @param message - Optional flash message to display.
   * @param  type - The flash message type (Defaults to `"success"`).
   * @returns Resolves once the redirect response has been sent.
   */
  protected goto(
    path: string,
    message?: string,
    type?: 'success' | 'error' | 'info'
  ): Promise<void> {
    const redirect = this.response.redirect(path);
    if (isStr(message)) redirect.with(message, type || 'success');
    return redirect.send();
  }

  /**
   * Obtain a `Table` instance for database operations.
   *
   * @param name - The database table name.
   * @param pool - Optional connection pool name.
   * @returns `Table` instance for query building and manipulation.
   */
  protected table(name: string, pool?: string): Table {
    return Table.request(name, pool);
  }

  /**
   * Executes a transactional handler function with a Builder and Table factory.
   * Automatically begins, commits, or rolls back the transaction.
   *
   * @param handler Function receiving a Table factory and Builder, which can return a value or Promise.
   * @param pool Optional connection pool name.
   * @returns The result of the handler function.
   */
  protected transaction<T>(
    handler: (table: (name: string) => Table, builder: Builder) => T,
    pool?: string
  ): Promise<T> {
    return Table.transaction(handler, pool);
  }

  /**
   * Provides a convenient way to run queries using a Builder instance.
   *
   * You just supply a callback receiving the Builder to execute your queries.
   *
   * @template T
   * @param callback - Function that receives a Builder for your queries.
   * @param pool - Optional database pool name to use.
   * @returns The result of the callback execution.
   */
  protected builder<T>(
    callback: (builder: Builder) => T | Promise<T>,
    pool?: string
  ): Promise<T> {
    return Builder.require(callback, pool);
  }

  /**
   * Obtain a Fetch instance for building filtered queries.
   *
   * @param table - The database table name.
   * @param pool - Optional connection pool name.
   * @returns Query builder instance for complex queries.
   */
  protected fetch(table: string, pool?: string): Fetcher {
    return Table.request(table, pool).fetch();
  }

  /**
   * Obtain a Finder instance to query by id.
   *
   * @param table - The database table name.
   * @param pool - Optional connection pool name.
   * @returns Query builder instance for complex queries.
   */
  protected find(table: string, pool?: string): TableFinder {
    return Table.request(table, pool).find();
  }

  /**
   * Parse form data from the current request.
   *
   * @returns Resolves when form parsing completes.
   */
  protected parse(): Promise<void> {
    return new Form().parse(this.request, this.response);
  }

  /**
   * Create a new Folder instance for folder based caching.
   *
   * @param  key - Optional folder key.
   * @param  options - Optional configuration options.
   * @returns `Folder` instance.
   */
  protected folder(key?: string, options?: FolderOptions): Folder {
    return folder(key, options);
  }

  /**
   * Create a new Store instance for memory based caching.
   *
   * @param  key - Optional store key.
   * @param  options - Optional configuration options.
   * @returns `Store` instance.
   */
  protected store(key?: string, options?: StoreOptions): Store {
    return store(key, options);
  }

  /**
   * Renders the component and sends the resulting HTML as the response.
   *
   * @param path The file path to the Flex component to be rendered.
   * @param locals An optional object containing local variables to be passed to the component
   * @param replacements An optional object containing replacements to be applied during rendering.
   * @returns A promise that resolves after sending the response.
   */
  protected async render(
    path: string,
    locals?: Record<string, any>
  ): Promise<void> {
    return this.response.render(path, locals);
  }

  /**
   * Sends a JSON response.
   * This method sets the Content-Type header to application/json and serializes the provided data before sending it in the response.
   *
   * @param data The data to be serialized and sent as JSON.
   * @returns A promise that resolves after sending the response.
   */
  protected async json(
    data: Record<string, unknown> | unknown[]
  ): Promise<void> {
    return this.response.json(data);
  }

  /**
   * Add a flash message to the current request and set a flash cookie on the response.
   *
   * Flash messages are stored in the request and sent as a JSON string cookie,
   * with HTTP-only flag and 10 minutes expiration.
   *
   * @param message - The message to flash to the user.
   * @param error - The type/category of the flash message.
   *
   * @example
   * this.flash('User saved successfully', 'success');
   * this.flash('Invalid credentials', 'error');
   */
  protected flash(
    message: string,
    type: 'error' | 'info' | 'success' = 'error'
  ): void {
    if (!this.request[FLASH_SET_KEY]) this.request[FLASH_SET_KEY] = [];
    this.request[FLASH_SET_KEY].push({ type, message });
    this.response.cookie('flash', JSON.stringify(this.request[FLASH_SET_KEY]));
  }

  /**
   * Generates pagination metadata and URLs for navigating pages.
   *
   * Returns an object containing:
   *  - `next`: URL string for next page or `false` if none,
   *  - `prev`: URL string for previous page or `false` if none,
   *  - `total`: total number of pages,
   *  - `current`: current page number,
   *  or `null` if pagination is not applicable.
   *
   * @param data Pagination object containing page and total info.
   * @param href Optional href to build pagination links on. Defaults to current request URL.
   * @returns Page instance
   */
  protected pages(data: any, href?: string): Page | null {
    if (!isObj(data) || !isObj(data.page) || !isObj(data.total)) return null;

    const { current, next, prev } = data.page;
    const total = data.total.pages;

    if (!isInt(current) || !isInt(total) || total <= 1) return null;
    if (!isStr(href)) href = this.request.href;

    const url = (page: number) => {
      try {
        const url = new URL(href, this.request.base);
        url.searchParams.set('page', String(page));
        return url.pathname + url.search;
      } catch (error) {
        throw new ServiceError(
          `Invalid URL for pagination: href='${href}', base='${this.request.base}'`
        );
      }
    };

    return {
      next: isInt(next) ? url(next) : false,
      prev: isInt(prev) ? url(prev) : false,
      total,
      current,
    };
  }

  /**
   * Extract and return a clean, domain name from a given URL or string.
   *
   * @param url - The input URL string value to parse.
   * @param def - Default name to return on failure or invalid input.
   * @returns The domain name or the default name.
   *
   * @example
   * this.host('https://www.example.com'); // Returns 'example'
   * this.host('example.com');             // Returns 'example'
   * this.host(null, 'default');           // Returns 'default'
   */
  protected host(url: string, def = 'bnjsx'): string {
    try {
      if (!isStr(url) || !url.trim()) return def;

      const normalizedUrl =
        url.startsWith('http://') || url.startsWith('https://')
          ? url
          : 'http://' + url;

      const hostname = new URL(normalizedUrl).hostname.toLowerCase();

      const cleanHost = hostname.startsWith('www.')
        ? hostname.slice(4)
        : hostname;

      const domain = cleanHost.split('.')[0];

      if (domain) return domain;
    } catch {
      return def;
    }

    return def;
  }
}
