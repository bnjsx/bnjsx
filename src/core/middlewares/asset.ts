import { extname, isAbsolute, normalize, resolve as resolver } from 'path';
import { Request } from '../modules/Request';
import { Response } from '../modules/Response';
import { config } from '../../config';
import { ForbiddenError } from '../../errors';
import mime from 'mime-types';
import { access, stat } from 'fs/promises';
import { isStr } from '../../helpers';
import * as fs from 'fs';

/**
 * Represents a range with a start, end, and size.
 *
 * @property `start` - The starting point of the range.
 * @property `end` - The ending point of the range.
 * @property `size` - The size of the range.
 */
export type Range = { start: number; end: number; size: number };

/**
 * Parses the Range HTTP header and determines the byte range for a resource.
 *
 * @param header - The value of the Range HTTP header (e.g., 'bytes=100-200').
 * @param size - The size of the resource being requested.
 *
 * @returns An object with `start`, `end`, and `size` properties, or null if the header is invalid.
 */
export function ranger(header: string, size: number): Range | null {
  const match = header.match(/^bytes=(\d+)?-(\d+)?$/);

  if (!match) return null;

  let start = match[1] ? parseInt(match[1], 10) : null;
  let end = match[2] ? parseInt(match[2], 10) : null;

  if (start === null && end === null) return null;

  if (start === null) (start = size - end), (end = size - 1);

  if (end === null) end = size - 1;

  if (start < 0 || start >= size || end < 0 || end >= size || start > end) {
    return null;
  }

  return { start, end, size };
}

/**
 * Serves static assets, supporting caching, compression, and range requests.
 *
 * @param req - The request object.
 * @param res - The response object.
 *
 * @returns A promise that resolves once the asset is served or rejects if there is an error.
 */
export function asset(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    let { root, gzip, cache } = config().loadSync().public;

    if (!isAbsolute(root)) root = resolver(config().resolveSync(), root);

    const path = resolver(root, normalize('./' + req.path));

    if (!path.startsWith(root)) {
      return reject(
        new ForbiddenError(`The requested resource is forbidden at: '${path}'`)
      );
    }

    stat(path)
      .then((stats) => {
        if (!stats.isFile()) return resolve();

        const buffer = 'application/octet-stream';
        const etag = `${stats.mtimeMs}-${stats.size}`;
        const gzp = path.concat('.gz');
        const type = mime.contentType(extname(path)) || buffer;

        const matched = req.getHeader('If-None-Match');
        const modified = req.getHeader('If-Modified-Since') as string;
        const encoding = req.getHeader('Accept-Encoding');
        const range = req.getHeader('Range');

        res.setHeader('Content-Type', type);
        res.setHeader('Accept-Ranges', 'bytes');

        if (!range) {
          res.setHeader('ETag', etag);
          res.setHeader('Last-Modified', stats.mtimeMs.toString());
          res.setHeader('Cache-Control', `public, max-age=${cache}`);
        }

        // Handle caching: ETag takes precedence over Last-Modified
        if (matched && matched === etag) {
          return resolve(res.status(304).send());
        }

        if (modified && modified === stats.mtimeMs.toString()) {
          return resolve(res.status(304).send());
        }

        // If no range is specified, send the entire file
        if (!range || !isStr(range)) {
          res.setHeader('Content-Length', stats.size);

          if (gzip && encoding.includes('gzip')) {
            return access(gzp)
              .then(() => {
                res.setHeader('Content-Encoding', 'gzip');
                resolve(res.stream(fs.createReadStream(gzp)));
              })
              .catch(() => resolve(res.stream(fs.createReadStream(path))));
          }

          return resolve(res.stream(fs.createReadStream(path)));
        }

        const ranges = ranger(range, stats.size);

        if (ranges) {
          const { start, end, size } = ranges;
          res.status(206); // Partial-Content
          res.setHeader('Content-Length', end - start + 1);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
          return resolve(res.stream(fs.createReadStream(path, { start, end })));
        }

        res.setHeader('Content-Range', `bytes */${stats.size}`);
        return resolve(res.status(416).send());
      })
      .catch((err) => (err.code !== 'ENOENT' ? reject(err) : resolve()));
  });
}
