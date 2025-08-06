import { EventEmitter } from 'events';
import { text } from '../../../src/core';

describe('text', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = new EventEmitter();
    req.getHeader = jest.fn();
    res = {};
  });

  it('should parse a plain text request body', async () => {
    req.getHeader.mockReturnValue('text/plain');

    const data = 'Hello, World!';
    const promise = text(req, res);

    req.emit('data', Buffer.from(data));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toBe(data);
  });

  it('should parse an HTML text request body', async () => {
    req.getHeader.mockReturnValue('text/html');

    const data = '<h1>Hello</h1>';
    const promise = text(req, res);

    req.emit('data', Buffer.from(data));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toBe(data);
  });

  it('should do nothing if content type is not text/plain or text/html', async () => {
    req.getHeader.mockReturnValue('application/json');

    await expect(text(req, res)).resolves.toBeUndefined();
    expect(req.body).toBeUndefined();
  });

  it('should handle empty text request bodies gracefully', async () => {
    req.getHeader.mockReturnValue('text/plain');

    const promise = text(req, res);

    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toBe('');
  });

  it('should work with chunked text data', async () => {
    req.getHeader.mockReturnValue('text/plain');

    const promise = text(req, res);

    req.emit('data', Buffer.from('Hello, '));
    req.emit('data', Buffer.from('World!'));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toBe('Hello, World!');
  });

  it('should do nothing if content type is undefined', async () => {
    req.getHeader.mockReturnValue(undefined); // Content type is undefined

    await expect(text(req, res)).resolves.toBeUndefined();
    expect(req.body).toBeUndefined();
  });
});
