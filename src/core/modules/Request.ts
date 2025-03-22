import { IncomingMessage } from 'http';
import { isStr } from '../../helpers';
import { Response } from './Response';
import mime from 'mime-types';

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
  protocol: 'http' | 'https';

  /** The hostname from the request URL. */
  host: string;

  /** The port number used for the request. */
  port: string;

  /** The request path without query parameters. */
  path: string;

  /** The parsed query parameters from the request URL. */
  query: URLSearchParams;

  /** The parameters extracted from the route. */
  params: P;

  /** The parsed body of the request. */
  body: B;

  /** Allows additional dynamic properties. */
  [key: string]: any;

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
}

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

// @ts-ignore
IncomingMessage.prototype.getHeader = function (
  name: string
): string | string[] | undefined {
  if (!isStr(name)) {
    throw new RequestError('Invalid header name');
  }

  return this.headers[name.toLowerCase()];
};
