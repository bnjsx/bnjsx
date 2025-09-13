import { IncomingMessage } from 'http';
import { isStr } from '../../helpers';
import { Response } from './Response';
import mime from 'mime-types';
import { config } from '../../config';

/**
 * Custom error class for request-related errors.
 */
export class RequestError extends Error {}

/**
 * Represents an HTTP request with additional properties and methods.
 *
 * @template B - The expected type of the request body.
 * @template P - The type of route parameters, can be an object or array.
 */
export interface Request<
  B = any,
  P extends Record<string, string> | string[] = Record<string, string>
> extends IncomingMessage {
  /** The response object associated with the request. */
  response: Response;

  /** The cookies sent with the request. */
  cookies: Record<string, string>;

  /** The protocol used for the request (e.g., HTTP or HTTPS). */
  protocol: 'http' | 'https' | string;

  /** The hostname from the request URL. */
  host: string;

  /** The port number used for the request. */
  port: string | number;

  /** The resolved client IP address. */
  ip: string;

  /** The request path plus query string. */
  href: string;

  /** The base URL of the request. */
  base: string;

  /** The request path without query parameters. */
  path: string;

  /** The parsed query parameters from the request URL. */
  query: URLSearchParams;

  /** The parameters extracted from the route. */
  params: P;

  /** The parsed body of the request. */
  body: B;

  /** Form validation errors. */
  errors: Record<string, Array<string>>;

  /** Allows additional dynamic properties. */
  [key: string | symbol]: any;

  /**
   * Checks if the request's `Content-Type` header matches a given MIME type.
   *
   * @param name - The MIME type or file extension.
   * @returns `true` if the content type matches, otherwise `false`.
   */
  type: (name: string) => boolean;

  /**
   * Checks if the request accepts a given MIME type.
   *
   * @param name - The MIME type or file extension.
   * @returns `true` if the request accepts the specified type, otherwise `false`.
   */
  accepts: (name: string) => boolean;

  /**
   * Retrieves the value of a specified request header.
   *
   * @param name - The header name.
   * @returns The header value as a string, an array of strings, or `undefined` if not present.
   */
  getHeader: (name: string) => string | string[];

  /**
   * Retrieves the client’s IP address (IPv4 only).
   * Normalizes `::ffff:127.0.0.1` to `127.0.0.1`.
   *
   * @returns The client IPv4 address as a string.
   */
  getIp(): string;

  /**
   * Gets the base app URL from config (e.g., `https://example.com`).
   *
   * @returns The base URL as a string.
   */
  getBase(): string;

  /**
   * Checks if the incoming request is an AJAX request.
   *
   * This method inspects the `X-Requested-With` header, which is a common convention
   * used by many libraries (such as `jQuery` and `axios`) to indicate an AJAX request.
   *
   * @returns `true` if the request has the header `X-Requested-With` set to `XMLHttpRequest` (case-insensitive), otherwise `false`.
   */
  isAjax(): boolean;
}

// @ts-ignore
IncomingMessage.prototype.isAjax = function (): boolean {
  const xReq = this.getHeader('x-requested-with');
  return xReq?.toLowerCase() === 'xmlhttprequest';
};

// @ts-ignore
IncomingMessage.prototype.getIp = function (): string {
  const forwarded = this.getHeader('x-forwarded-for');
  let ip = '';

  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0].trim();
  } else {
    ip = this.socket?.remoteAddress || '';
  }

  // Normalize IPv6-embedded IPv4 and localhost
  if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');
  else if (ip === '::1') return '127.0.0.1';

  return ip || '0.0.0.0';
};

// @ts-ignore
IncomingMessage.prototype.getBase = function () {
  const { host, port, protocol, base } = config().loadSync();

  if (base) return base;

  const isDefaultPort =
    (protocol === 'http' && port === 80) ||
    (protocol === 'https' && port === 443);

  return isDefaultPort
    ? `${protocol}://${host}`
    : `${protocol}://${host}:${port}`;
};

// @ts-ignore
IncomingMessage.prototype.getHeader = function (
  name: string
): string | string[] | undefined {
  if (!isStr(name)) {
    throw new RequestError('Invalid header name');
  }

  return this.headers[name.toLowerCase()];
};

// @ts-ignore
IncomingMessage.prototype.type = function (name: string): boolean {
  const header = this.getHeader('content-type');
  if (header) return header.includes(mime.lookup(name) || name);
  return false;
};

// @ts-ignore
IncomingMessage.prototype.accepts = function (name: string): boolean {
  const header: string = this.getHeader('accept');
  if (!header) return false;

  const type = mime.lookup(name) || name;

  return header
    .split(',')
    .map((type) => type.trim())
    .some(($type) => $type === type || $type.includes(type));
};
