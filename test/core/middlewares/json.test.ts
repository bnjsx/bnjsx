import { EventEmitter } from 'events';
import { json } from '../../../src/core';

describe('json', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = new EventEmitter();
    req.getHeader = jest.fn();
    res = {};
  });

  it('should parse a valid JSON request body', async () => {
    req.getHeader.mockReturnValue('application/json');

    const data = { name: 'John' };
    const promise = json(req, res);

    req.emit('data', Buffer.from(JSON.stringify(data)));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toEqual(data);
  });

  it('should do nothing if content type is not application/json', async () => {
    req.getHeader.mockReturnValue('text/plain');

    await expect(json(req, res)).resolves.toBeUndefined();
    expect(req.body).toBeUndefined();
  });

  it('should handle empty request bodies gracefully', async () => {
    req.getHeader.mockReturnValue('application/json');

    const promise = json(req, res);

    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toEqual({});
  });

  it('should reject invalid JSON with an error', async () => {
    req.getHeader.mockReturnValue('application/json');

    const promise = json(req, res);

    req.emit('data', Buffer.from('{invalid json}'));
    req.emit('end');

    await expect(promise).rejects.toThrow();
  });

  it('should work with chunked JSON data', async () => {
    req.getHeader.mockReturnValue('application/json');

    const promise = json(req, res);

    req.emit('data', Buffer.from('{"name":'));
    req.emit('data', Buffer.from('"Alice"}'));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toEqual({ name: 'Alice' });
  });

  it('should do nothing if content type is undefined', async () => {
    req.getHeader.mockReturnValue(undefined); // Content type is undefined

    await expect(json(req, res)).resolves.toBeUndefined();
    expect(req.body).toBeUndefined();
  });
});
