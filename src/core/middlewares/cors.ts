import { AppOptions, config, OriginFunc } from '../../config';
import { ForbiddenError } from '../../errors';
import { isArrOfStr, isFunc } from '../../helpers';
import { Request } from '../modules/Request';
import { Response } from '../modules/Response';

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
