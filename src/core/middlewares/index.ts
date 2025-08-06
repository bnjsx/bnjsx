import { Request } from '../modules/Request';
import { Response } from '../modules/Response';

export * from './asset';
export * from './cookie';
export * from './cors';
export * from './csrf';
export * from './flash';
export * from './json';
export * from './maintenance';
export * from './secure';
export * from './text';
export * from './error';

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
