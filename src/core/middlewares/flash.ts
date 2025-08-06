import { Request } from '../modules/Request';
import { Response } from '../modules/Response';

export const FLASH_GET_KEY = Symbol('flash_get_key');
export const FLASH_SET_KEY = Symbol('flash_set_key');

/**
 * Parses the cookie header and populates `req.cookies`.
 *
 * @param req - The request object.
 * @param res - The response object (not used in this function).
 *
 * @returns A promise that resolves once the cookies are parsed and set in `req.cookies`.
 */
export async function flash(req: Request, res: Response): Promise<void> {
  const raw = req.cookies?.flash;
  let messages = [];

  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) messages = parsed;
    } catch {
      // Ignore invalid cookie
    }
  }

  // Store current flashes for view rendering
  req[FLASH_GET_KEY] = messages;

  // Prepare container for next flashes
  req[FLASH_SET_KEY] = [];

  // Clear cookie immediately (one-time use)
  res.clearCookie('flash', '/');
}
