import { randomBytes } from 'crypto';
import { Request } from '../modules/Request';
import { Response } from '../modules/Response';
import { isStr, UTC } from '../../helpers';
import { config } from '../../config';
import { BadRequestError } from '../../errors';
import { Form } from '../modules/Form';

/**
 * Ensures a CSRF token is available in cookies and request.
 *
 * - If already present, assigns it to `req.csrfToken`.
 * - Otherwise, generates a new token and sets it as a cookie.
 *
 * This method should be run globally for all requests to establish the CSRF token.
 *
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 */
export async function csrft(req: Request, res: Response): Promise<void> {
  if (!isStr(req.cookies?.csrfToken)) {
    req.csrfToken = randomBytes(32).toString('base64url');

    // @ts-ignore
    return res.cookie('csrfToken', req.csrfToken, {
      expires: UTC.future.hour(1),
      path: '/',
      secure: config().loadSync().env === 'pro',
      httpOnly: false,
      sameSite: 'Strict',
      priority: 'High',
    });
  }

  req.csrfToken = req.cookies.csrfToken;
}

/**
 * Validates the CSRF token.
 *
 * Accepts the token from either `req.body.csrfToken` or the `x-csrf-token` header,
 * and compares it against the `csrfToken` cookie.
 *
 * This method parses the request body if not already parsed.
 * Should only be used on requests without file uploads, as files are not validated.
 *
 * For multipart forms with files, use the `Validator.csrf()` rule instead.
 *
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 * @throws BadRequestError - If the CSRF token is missing or invalid.
 */

export async function csrf(req: Request, res: Response): Promise<void> {
  if (!req[Form.BODY_PARSED]) await new Form().parse(req, res);

  const cookie = req.cookies?.csrfToken;
  const bodyToken = req.body?.csrfToken;
  const headerToken = req.getHeader('x-csrf-token');
  const token = bodyToken || headerToken;

  if (!cookie || !token || cookie !== token) {
    throw new BadRequestError('Invalid or missing CSRF token');
  }
}

/**
 * Detects bots using a honeypot field.
 *
 * Rejects the request if `req.body.honeyPot` or the `x-honey-pot` header contains a value.
 *
 * This method parses the request body if not already parsed.
 * Should only be used on requests without file uploads, as files are not validated.
 *
 * For multipart forms with files, use the Validator.bot() rule instead.
 *
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 * @throws BadRequestError - If a honeypot value is detected.
 */
export async function bot(req: Request, res: Response): Promise<void> {
  if (!req[Form.BODY_PARSED]) await new Form().parse(req, res);

  const honeyBody = req.body?.honeyPot;
  const honeyHeader = req.getHeader('x-honey-pot');

  if (isStr(honeyBody) || isStr(honeyHeader)) {
    throw new BadRequestError('Bot detected via honeypot field');
  }
}
