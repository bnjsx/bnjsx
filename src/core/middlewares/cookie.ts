import { isStr } from '../../helpers';
import { Request } from '../modules/Request';
import { Response } from '../modules/Response';

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
