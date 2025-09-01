import { ServerResponse } from 'http';
import { createReadStream, ReadStream } from 'fs';
import { stat } from 'fs/promises';
import { NotFoundError } from '../../errors';
import { Request } from './Request';
import { ranger } from '../middlewares/asset';
import { render } from '../template/Component';
import mime from 'mime-types';

import {
  isStr,
  isDate,
  isObj,
  isArr,
  isBool,
  isNum,
  isBuffer,
  isChildOf,
  isInt,
  UTC,
} from '../../helpers';
import { FLASH_GET_KEY, FLASH_SET_KEY } from '../middlewares/flash';

/**
 * Represents options for setting cookies in HTTP responses.
 */
export interface CookieOptions {
  /**
   * Max-Age in seconds until the cookie expires.
   * If set, overrides the `expires` property.
   */
  maxAge?: number;

  /**
   * Expiration date for the cookie.
   * Can be a string in HTTP date format or a Date object.
   */
  expires?: string | Date;

  /**
   * Domain for the cookie.
   * The cookie will be sent to this domain and its subdomains.
   */
  domain?: string;

  /**
   * Path for the cookie.
   * This determines the URL path the cookie is valid for.
   * Defaults to `/`.
   */
  path?: string;

  /**
   * Indicates if the cookie should only be sent over secure connections (HTTPS).
   * Defaults to `false`.
   */
  secure?: boolean;

  /**
   * Indicates if the cookie is accessible only through the HTTP protocol.
   * If set to true, it cannot be accessed via JavaScript.
   */
  httpOnly?: boolean;

  /**
   * Indicates if the cookie is partitioned.
   * If set to true, the cookie will be stored separately for each partition.
   */
  partitioned?: boolean;

  /**
   * Controls whether the cookie is sent with cross-site requests.
   * Can be `Strict`, `Lax`, or `None`.
   */
  sameSite?: 'Strict' | 'Lax' | 'None';

  /**
   * Priority of the cookie.
   * Can be `Low`, `Medium`, or `High`.
   */
  priority?: 'Low' | 'Medium' | 'High';
}

/**
 * Represents an HTTP response with additional properties and methods.
 */
export interface Response extends ServerResponse {
  /**
   * The request object associated with this response.
   */
  request: Request;

  /**
   * Retrieves the standard HTTP status message for a given status code.
   *
   * @param code - The HTTP status code.
   * @returns The corresponding status message, or `Ok` if the code is unknown.
   */
  getMessage: (code: number) => string;

  /**
   * Determines the appropriate Content-Type based on the provided data.
   *
   * - Strings are treated as `text/html`.
   * - Buffers are treated as `application/octet-stream`.
   * - Objects (except Buffers) are treated as `application/json`.
   * - Other types default to `text/plain`.
   *
   * @param data - The data to evaluate.
   * @returns The corresponding Content-Type string.
   */
  contentType: (data: unknown) => string;

  /**
   * Sends the given data to the client as a response.
   *
   * @param data The data to send. This can be a `string`, `buffer`, `object`, `array`, `number`, or `boolean`.
   * @returns A promise that resolves when the data has been sent successfully or rejects if an error occurs.
   * @throws `ResponseError` if the response has already been sent or if the provided data type is invalid.
   * @note The `Content-Type` header is set automatically based on the data type if not defined.
   */
  send: (
    data?:
      | string
      | Buffer
      | Record<string, unknown>
      | Array<unknown>
      | number
      | boolean
  ) => Promise<void>;

  /**
   * Sends a file to the client, supporting range requests.
   *
   * @param path The path to the file to be sent.
   * @returns A promise that resolves when the file is successfully sent.
   * @throws `ResponseError` if the response has already been sent or the file path is invalid.
   * @throws `NotFoundError` If the file does not exist or is not a file.
   * @note Sets the `Content-Type` and `Accept-Ranges` headers. If a range is specified,
   *       responds with a `206 Partial Content` status. If no range is specified, sends
   *       the entire file with a `200 OK` status.
   */
  sendFile: (path: string) => Promise<void>;

  /**
   * Initiates a file download by sending the specified file to the client.
   *
   * @param path The path to the file to be downloaded.
   * @param name Optional name for the downloaded file.
   * @returns A promise that resolves when the file is successfully sent.
   * @throws `ResponseError` if the download file path or name is invalid.
   * @note Sets the `Content-Disposition` header to prompt the browser to download the file.
   *       If an error occurs while sending the file, the `Content-Disposition` header is cleared.
   */
  download: (path: string, name?: string) => Promise<void>;

  /**
   * Streams data to the client.
   *
   * This method pipes the provided readable stream to the server response.
   * It resolves the promise when the streaming is finished or rejects it
   * if an error occurs during streaming.
   *
   * @param data - The readable stream to be piped to the response.
   * @returns A promise that resolves when the streaming is finished.
   * @throws `ResponseError` if the response has already been sent.
   */
  stream: (data: ReadStream) => Promise<void>;

  /**
   * Redirects to the specified URL.
   *
   * @returns A Redirector instance for chaining redirect operations.
   * @throws `ResponseError` if the provided URL is invalid.
   */
  redirect: (to?: string) => Redirector;

  /**
   * Sets the HTTP status code and message for the response.
   *
   * If the message is not provided, it falls back to `getMessage(code)`.
   *
   * @param code - The HTTP status code.
   * @param message - Optional status message.
   * @returns The current response instance for method chaining.
   * @throws `ResponseError` if the status code is not an integer.
   * @throws `ResponseError` if the status message is invalid.
   */
  status: (code: number, message?: string) => Response;

  /**
   * Renders the component and sends the resulting HTML as the response.
   *
   * @param path - The file path to the `Flex` component to be rendered.
   * @param locals - An optional object containing local variables to be passed to the component.
   * @param replacements - An optional object containing replacements to be applied during rendering.
   * @returns A promise that resolves after sending the response.
   */
  render: (
    path: string,
    locals?: Record<string, unknown>,
    replacements?: Record<string, string>
  ) => Promise<void>;

  /**
   * Sends a JSON response.
   *
   * This method sets the `Content-Type` header to `application/json` and
   * serializes the provided data before sending it in the response.
   *
   * @param data - The data to be serialized and sent as JSON.
   * @returns A promise that resolves after sending the response.
   */
  json: (data: Record<string, unknown> | unknown[]) => Promise<void>;

  /**
   * Sends an HTML response.
   *
   * This method sets the `Content-Type` header to `text/html`
   *
   * @param page - The html page to be sent.
   * @returns A promise that resolves after sending the response.
   */
  html: (page: string) => Promise<void>;

  /**
   * Sets a cookie on the response.
   *
   * @param name - The name of the cookie.
   * @param value - The value of the cookie.
   * @param options - Optional settings for the cookie.
   * @throws `ResponseError` if `name` or `value` or `options` are invalid.
   * @throws `ResponseError` if `expires` is not a valid date or string.
   * @throws `ResponseError` if `sameSite` value is invalid.
   * @throws `ResponseError` if `sameSite=None` is used without `secure`.
   * @throws `ResponseError` if `priority` value is invalid.
   * @returns The current response instance.
   *
   * @example
   * res.cookie('session', 'abc123', { httpOnly: true, secure: true, maxAge: 3600 });
   */
  cookie: (name: string, value: string, options?: CookieOptions) => Response;

  /**
   * Clears a cookie by name.
   *
   * @param name - The name of the cookie to clear.
   * @param path - The path of the cookie (defaults to '/').
   * @param domain - The domain of the cookie (defaults to the request host).
   * @throws `ResponseError` if `name` is not a string.
   * @throws `ResponseError` if `path` is provided but not a string.
   * @throws `ResponseError` if `domain` is provided but not a string.
   * @returns The current response instance.
   */
  clearCookie: (name: string, path?: string, domain?: string) => Response;
}

/**
 * Represents an error related to response handling.
 */
export class ResponseError extends Error {}

/**
 * The Redirector class provides a clean, chainable API for performing HTTP redirects,
 * optionally including flash messages using cookies.
 *
 * @example
 *   redirect().back().with('Something went wrong', 'error').send();
 */
export class Redirector {
  private url: string | null = null;

  constructor(private req: Request, private res: Response) {}

  /**
   * Redirects to the `Referer` header if available, otherwise to a fallback path.
   *
   * @param fallback - Optional fallback path if no valid referer is present. Defaults to '/'.
   * @returns The current instance for chaining.
   */
  public back(fallback?: string): this {
    if (!isStr(fallback)) fallback = '/';

    const referer =
      this.req.getHeader('referer') || this.req.getHeader('referrer');

    try {
      const { pathname, search, protocol } = new URL(referer.toString());

      if (!['http:', 'https:'].includes(protocol)) {
        throw new Error('Invalid protocol');
      }

      this.url = pathname + search;
    } catch (e) {
      this.url = fallback;
    }

    return this;
  }

  /**
   * Sets the redirect destination to a specific URL.
   *
   * @param url - The absolute or relative URL to redirect to.
   * @returns The current instance for chaining.
   * @throws ResponseError if the URL is invalid.
   */
  public to(url: string): this {
    if (!isStr(url)) throw new ResponseError('Invalid redirect url');

    this.url = url;
    return this;
  }

  /**
   * Adds a flash message to the request for use in the next response.
   * Messages are stored in a cookie and cleared after one use.
   *
   * @param message - The message to display (e.g., "Update successful").
   * @param type - The message category/type (e.g., 'success', 'error'). Defaults to 'error'.
   * @returns The current instance for chaining.
   */
  public with(
    message: string,
    type: 'error' | 'info' | 'success' = 'error'
  ): this {
    if (!isStr(message)) throw new ResponseError('Invalid message');
    if (!isStr(type)) throw new ResponseError('Invalid type');
    if (!this.req[FLASH_SET_KEY]) this.req[FLASH_SET_KEY] = [];

    this.req[FLASH_SET_KEY].push({ type, message });

    this.res.cookie('flash', JSON.stringify(this.req[FLASH_SET_KEY]), {
      path: '/',
      httpOnly: true,
      expires: UTC.future.minute(10),
    });

    return this;
  }

  /**
   * Sends the redirect response to the client.
   *
   * - Sets the HTTP `Location` header to the specified URL.
   * - Sets the status code to the given value or defaults to 302.
   * - Sends any pending flash cookies.
   *
   * @param code - Optional status code to use (default is 302).
   * @returns A promise that resolves when the response is sent.
   */
  public async send(code?: number): Promise<void> {
    if (!isInt(code)) code = 302;
    if (!this.url) this.url = '/';

    this.res.setHeader('Location', this.url);
    this.res.status(code);

    await this.res.send();
  }
}

// @ts-ignore
ServerResponse.prototype.getMessage = function (code: number): string {
  const statusMessages = {
    // Informational 1xx
    100: 'Continue',
    101: 'Switching Protocols',
    102: 'Processing',
    103: 'Early Hints',

    // Success 2xx
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    207: 'Multi-Status',
    208: 'Already Reported',
    226: 'IM Used',

    // Redirection 3xx
    300: 'Multiple Choices',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    305: 'Use Proxy',
    306: 'Switch Proxy',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',

    // Client Error 4xx
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    418: "I'm a teapot",
    421: 'Misdirected Request',
    422: 'Unprocessable Entity',
    423: 'Locked',
    424: 'Failed Dependency',
    425: 'Too Early',
    426: 'Upgrade Required',
    427: 'Precondition Required',
    428: 'Too Many Requests',
    429: 'Request Header Fields Too Large',
    431: 'Unavailable For Legal Reasons',
    451: 'Unavailable For Legal Reasons',

    // Server Error 5xx
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates',
    507: 'Insufficient Storage',
    508: 'Loop Detected',
    510: 'Not Extended',
    511: 'Network Authentication Required',
  };

  return statusMessages[code] || 'Ok';
};

// @ts-ignore
ServerResponse.prototype.contentType = function (data: unknown): string {
  if (typeof data === 'string') {
    return 'text/html'; // String is treated as HTML by default
  }

  if (data !== null && typeof data === 'object') {
    if (isBuffer(data)) {
      return 'application/octet-stream'; // Buffers are treated as binary data
    }

    return 'application/json';
  }

  return 'text/plain'; // Default for anything else
};

// @ts-ignore
ServerResponse.prototype.send = function (data?: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    if (this.writableEnded) {
      return reject(new ResponseError('Response already sent'));
    }

    if (!this.hasHeader('Content-Type')) {
      this.setHeader('Content-Type', this.contentType(data));
    }

    if (data && !isBuffer(data) && !isStr(data)) {
      if (isObj(data) || isArr(data)) data = JSON.stringify(data);
      else if (isBool(data) || isNum(data)) data = String(data);
      else return reject(new ResponseError('Invalid response data type'));
    }

    this.end(data, (err?: Error) => (err ? reject(err) : resolve()));
  });
};

// @ts-ignore
ServerResponse.prototype.sendFile = function (path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (this.writableEnded) {
      return reject(new ResponseError('Response already sent'));
    }

    if (!isStr(path)) {
      return reject(new ResponseError('Invalid file path'));
    }

    stat(path)
      .then((stats) => {
        if (!stats.isFile()) {
          return reject(new NotFoundError(`No file found at: ${path}`));
        }

        const buffer = 'application/octet-stream';
        const type = mime.contentType(path) || buffer;
        const range = this.request.getHeader('Range');

        this.setHeader('Content-Type', type);
        this.setHeader('Accept-Ranges', 'bytes');

        // If no range is specified, send the entire file
        if (!range || !isStr(range)) {
          this.status(200);
          this.setHeader('Content-Length', stats.size);
          return resolve(this.stream(createReadStream(path)));
        }

        const ranges = ranger(range, stats.size);

        if (!ranges) {
          this.setHeader('Content-Range', `bytes */${stats.size}`);
          return resolve(this.status(416).send());
        }

        const { start, end, size } = ranges;

        this.status(206); // Partial-Content
        this.setHeader('Content-Length', end - start + 1);
        this.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);

        return resolve(this.stream(createReadStream(path, { start, end })));
      })
      .catch((err) => {
        if (err.code !== 'ENOENT') return reject(err);
        reject(new NotFoundError(`No file found at: ${path}`));
      });
  });
};

// @ts-ignore
ServerResponse.prototype.download = function (
  path: string,
  name?: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (name && !isStr(name)) {
      return reject(new ResponseError('Invalid download file name'));
    }

    this.setHeader(
      'Content-Disposition',
      name ? `attachment; filename="${name}"` : 'attachment'
    );

    return this.sendFile(path)
      .then(resolve)
      .catch((err: Error) => {
        if (!this.headersSent) this.clearHeader('Content-Disposition');
        reject(err);
      });
  });
};

// @ts-ignore
ServerResponse.prototype.stream = function (read: ReadStream): Promise<void> {
  return new Promise((resolve, reject) => {
    if (this.writableEnded) {
      return reject(new ResponseError('Response already sent'));
    }

    if (!isChildOf(read, ReadStream)) {
      return reject(new ResponseError('Invalid read stream'));
    }

    read.pipe(this).on('finish', resolve).on('error', reject);
  });
};

// @ts-ignore
ServerResponse.prototype.redirect = function (to?: string): Redirector {
  const redirect = new Redirector(this.request, this);
  if (isStr(to)) redirect.to(to);
  return redirect;
};

// @ts-ignore
ServerResponse.prototype.status = function (
  code: number,
  message?: string
): Response {
  if (!isInt(code)) {
    throw new ResponseError('Invalid status code');
  }

  if (message && !isStr(message)) {
    throw new ResponseError('Invalid status message');
  }

  this.statusCode = code;
  this.statusMessage = message ? message : this.getMessage(code);
  return this;
};

// @ts-ignore
ServerResponse.prototype.render = function (
  path: string,
  locals?: Record<string, any>,
  replacements?: Record<string, string>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const flash = this.request[FLASH_GET_KEY] || [];
    const csrf = this.request.csrfToken;

    if (!isObj(locals)) locals = {};
    if (isArr(locals.flash)) flash.push(...locals.flash);

    locals.flash = flash;
    locals.csrf = csrf;

    render(path, locals, replacements)
      .then((content) => {
        this.setHeader('Content-Type', 'text/html');
        resolve(this.send(content));
      })
      .catch(reject);
  });
};

// @ts-ignore
ServerResponse.prototype.html = function (page: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isStr(page)) return reject(new ResponseError('Invalid html page'));

    this.setHeader('Content-Type', 'text/html');
    resolve(this.send(page));
  });
};

// @ts-ignore
ServerResponse.prototype.json = function (data: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isObj(data) && !isArr(data)) {
      return reject(new ResponseError('Invalid json data'));
    }

    this.setHeader('Content-Type', 'application/json');
    resolve(this.send(JSON.stringify(data)));
  });
};

// @ts-ignore
ServerResponse.prototype.cookie = function (
  name: string,
  value: string,
  options: CookieOptions = {}
): Response {
  if (!isStr(name)) {
    throw new ResponseError('Invalid cookie name');
  }

  if (!isStr(value)) {
    throw new ResponseError('Invalid cookie value');
  }

  if (options && !isObj(options)) {
    throw new ResponseError('Invalid cookie options');
  }

  const cookie = [`${name}=${encodeURIComponent(value)}`];

  // Add Max-Age if provided
  if (options.maxAge) cookie.push(`Max-Age=${options.maxAge}`);

  // Add Domain if provided
  if (options.domain) cookie.push(`Domain=${options.domain}`);

  // Add Path if provided (defaults to '/')
  if (options.path) cookie.push(`Path=${options.path}`);

  // Add Secure flag if provided
  if (options.secure) cookie.push('Secure');

  // Add HttpOnly flag if provided
  if (options.httpOnly) cookie.push('HttpOnly');

  // Add Partitioned flag if provided
  if (options.partitioned) cookie.push('Partitioned');

  // Add Expires if provided
  if (options.expires) {
    if (!isStr(options.expires) && !isDate(options.expires)) {
      throw new ResponseError(`Invalid expires value: ${options.expires}`);
    }

    if (isStr(options.expires)) options.expires = new Date(options.expires);
    cookie.push(`Expires=${options.expires.toString()}`);
  }

  // Add SameSite if provided (with validation)
  if (options.sameSite) {
    if (!['Strict', 'Lax', 'None'].includes(options.sameSite)) {
      throw new ResponseError(`Invalid SameSite value: ${options.sameSite}`);
    }

    // If SameSite is 'None', the Secure flag must also be set
    if (options.sameSite === 'None' && !options.secure) {
      throw new ResponseError('SameSite=None requires the Secure flag.');
    }

    cookie.push(`SameSite=${options.sameSite}`);
  }

  // Add Priority if provided
  if (options.priority) {
    if (!['Low', 'Medium', 'High'].includes(options.priority)) {
      throw new ResponseError(`Invalid Priority value: ${options.priority}`);
    }

    cookie.push(`Priority=${options.priority}`);
  }

  // Set the cookie header (multi-cookie safe)
  const existing = this.getHeader('Set-Cookie');
  const current = cookie.join('; ');

  if (existing) {
    const cookies = isArr(existing) ? existing : [existing];
    cookies.push(current);
    this.setHeader('Set-Cookie', cookies);
  } else {
    this.setHeader('Set-Cookie', current);
  }

  return this;
};

// @ts-ignore
ServerResponse.prototype.clearCookie = function clearCookie(
  name: string,
  path?: string,
  domain?: string
) {
  if (!isStr(name)) {
    throw new ResponseError('Invalid cookie name');
  }

  if (!path) path = '/';
  else if (!isStr(path)) {
    throw new ResponseError('Invalid cookie path');
  }

  if (!domain) domain = this.request.host;
  else if (!isStr(domain)) {
    throw new ResponseError('Invalid cookie domain');
  }

  this.setHeader(
    'Set-Cookie',
    `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}; Domain=${domain};`
  );

  return this;
};
