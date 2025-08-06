import { isObj } from '../../helpers';
import { Form } from '../modules/Form';
import { Request } from '../modules/Request';
import { Response } from '../modules/Response';

/**
 * Parses the JSON content from the request body.
 *
 * @param req - The request object.
 * @param res - The response object (not used in this function).
 *
 * @returns A promise that resolves once the JSON body is parsed or rejects if an error occurs.
 */
export function json(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    const content = req.getHeader('content-type') || '';

    if (!content.includes('application/json')) return resolve();

    const chunks = [];

    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      try {
        if (chunks.length > 0) {
          req.body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        }

        if (!isObj(req.body)) req.body = {};
        req[Form.BODY_PARSED] = true;
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}
