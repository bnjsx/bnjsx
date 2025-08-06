import { Form } from '../modules/Form';
import { Request } from '../modules/Request';
import { Response } from '../modules/Response';

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
      req[Form.BODY_PARSED] = true;
      resolve();
    });
  });
}
