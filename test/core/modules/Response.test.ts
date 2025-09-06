jest.mock('fs', () => {
  return {
    ...jest.requireActual('fs'),
    createReadStream: jest.fn(() => 'mock-stream'),
    ReadStream: jest.fn(() => {}),
  };
});

jest.mock('fs/promises', () => {
  return {
    ...jest.requireActual('fs/promises'),
    stat: jest.fn(),
  };
});

jest.mock('../../../src/core/template/Component', () => ({
  render: jest.fn(),
}));

import '../../../src/core/modules/Response';
import * as fs from 'fs/promises';
import {
  Cookie,
  CookieError,
  FLASH_GET_KEY,
  FLASH_SET_KEY,
  Redirector,
  ResponseError,
} from '../../../src/core';
import { IncomingMessage, ServerResponse } from 'http';
import { NotFoundError } from '../../../src/errors';
import { createReadStream, ReadStream } from 'fs';
import { render } from '../../../src/core';
import { UTC } from '../../../src/helpers';
import { config } from '../../../src/config';

describe('Response', () => {
  let res: any;

  beforeEach(() => {
    res = Object.create(ServerResponse.prototype); // Create a fresh instance
    res.end = jest.fn((data, callback) => callback && callback());
    res.setHeader = jest.fn();
    res.getHeader = jest.fn();
    res.clearHeader = jest.fn();
    res.hasHeader = jest.fn(() => false);
    // Override writableEnded using defineProperty
    Object.defineProperty(res, 'writableEnded', {
      value: false,
      writable: true,
    });

    // Override headersSent using defineProperty
    Object.defineProperty(res, 'headersSent', {
      value: false,
      writable: true,
    });
  });

  afterEach(() => jest.clearAllMocks());

  describe('getMessage', () => {
    it('should return the correct message for known status codes', () => {
      expect(res.getMessage(200)).toBe('OK');
      expect(res.getMessage(404)).toBe('Not Found');
      expect(res.getMessage(500)).toBe('Internal Server Error');
      expect(res.getMessage(418)).toBe("I'm a teapot");
    });

    it('should return "Ok" for unknown status codes', () => {
      expect(res.getMessage(999)).toBe('Ok');
      expect(res.getMessage(600)).toBe('Ok');
    });
  });

  describe('contentType', () => {
    it('should return "text/html" for string input', () => {
      expect(res.contentType('Hello, world!')).toBe('text/html');
    });

    it('should return "application/json" for object input', () => {
      expect(res.contentType({ key: 'value' })).toBe('application/json');
    });

    it('should return "application/octet-stream" for Buffer input', () => {
      expect(res.contentType(Buffer.from('binary data'))).toBe(
        'application/octet-stream'
      );
    });

    it('should return "text/plain" for numbers', () => {
      expect(res.contentType(123)).toBe('text/plain');
    });

    it('should return "text/plain" for booleans', () => {
      expect(res.contentType(true)).toBe('text/plain');
    });

    it('should return "text/plain" for null', () => {
      expect(res.contentType(null)).toBe('text/plain');
    });

    it('should return "text/plain" for undefined', () => {
      expect(res.contentType(undefined)).toBe('text/plain');
    });
  });

  describe('send', () => {
    it('should send a string response', async () => {
      await expect(res.send('Hello World')).resolves.toBeUndefined();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(res.end).toHaveBeenCalledWith('Hello World', expect.any(Function));
    });

    it('should send a JSON object', async () => {
      await expect(res.send({ key: 'value' })).resolves.toBeUndefined();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json'
      );
      expect(res.end).toHaveBeenCalledWith(
        '{"key":"value"}',
        expect.any(Function)
      );
    });

    it('should send an array as JSON', async () => {
      await expect(res.send([1, 2, 3])).resolves.toBeUndefined();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json'
      );
      expect(res.end).toHaveBeenCalledWith('[1,2,3]', expect.any(Function));
    });

    it('should send a Buffer', async () => {
      const buffer = Buffer.from('Hello');
      await expect(res.send(buffer)).resolves.toBeUndefined();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream'
      );
      expect(res.end).toHaveBeenCalledWith(buffer, expect.any(Function));
    });

    it('should send a Uint8Array', async () => {
      const uint8 = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      await expect(res.send(uint8)).resolves.toBeUndefined();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream'
      );
      expect(res.end).toHaveBeenCalledWith(uint8, expect.any(Function));
    });

    it('should send a number as a string', async () => {
      await expect(res.send(123)).resolves.toBeUndefined();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(res.end).toHaveBeenCalledWith('123', expect.any(Function));
    });

    it('should send a boolean as a string', async () => {
      await expect(res.send(true)).resolves.toBeUndefined();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(res.end).toHaveBeenCalledWith('true', expect.any(Function));
    });

    it('should reject an invalid data type', async () => {
      await expect(res.send(() => {})).rejects.toThrow(ResponseError);
      await expect(res.send(Symbol('test'))).rejects.toThrow(ResponseError);
    });

    it('should reject if response is already sent', async () => {
      res.writableEnded = true;
      await expect(res.send('test')).rejects.toThrow('Response already sent');
    });

    test('should reject if end provides an error', async () => {
      // Mock the end method to call its callback with an error
      res.end.mockImplementation((_, callback) => {
        callback(new Error('Fake error'));
      });

      await expect(res.send('Hello')).rejects.toThrow('Fake error');
    });
  });

  describe('sendFile', () => {
    it('should reject if path is not a string', async () => {
      await expect(res.sendFile(123)).rejects.toThrow('Invalid file path');
    });

    it('should reject if file does not exist', async () => {
      jest.spyOn(fs, 'stat').mockRejectedValue({ code: 'ENOENT' });
      await expect(res.sendFile('nonexistent.txt')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should reject stat rejects', async () => {
      jest.spyOn(fs, 'stat').mockRejectedValue(new Error('Some Foo'));
      await expect(res.sendFile('file.txt')).rejects.toThrow('Some Foo');
    });

    it('should reject if the path is not a file', async () => {
      const stats: any = { isFile: () => false };
      jest.spyOn(fs, 'stat').mockResolvedValue(stats);
      await expect(res.sendFile('not-a-file.txt')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should send the entire file if no range is specified', async () => {
      res.stream = jest.fn();
      res.request = { getHeader: jest.fn() };
      res.status = jest.fn(() => res);

      const stats: any = { isFile: () => true, size: 100 };
      jest.spyOn(fs, 'stat').mockResolvedValue(stats);

      await res.sendFile('file.txt');

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.stream).toHaveBeenCalledWith('mock-stream');
      expect(createReadStream).toHaveBeenCalledWith('file.txt');

      expect(res.setHeader).toHaveBeenCalledWith('Accept-Ranges', 'bytes');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/plain; charset=utf-8'
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Length', stats.size);
    });

    it('should handle range requests correctly', async () => {
      res.stream = jest.fn();
      res.request = { getHeader: jest.fn(() => 'bytes=0-49') };
      res.status = jest.fn(() => res);

      const stats: any = { isFile: () => true, size: 100 };
      jest.spyOn(fs, 'stat').mockResolvedValue(stats);

      await res.sendFile('file.txt');

      expect(res.status).toHaveBeenCalledWith(206);
      expect(res.stream).toHaveBeenCalledWith('mock-stream');
      expect(createReadStream).toHaveBeenCalledWith('file.txt', {
        start: 0,
        end: 49,
      });

      expect(res.setHeader).toHaveBeenCalledWith('Accept-Ranges', 'bytes');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Length', 50);
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/plain; charset=utf-8'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Range',
        'bytes 0-49/100'
      );
    });

    it('should respond with 416 if the range is invalid', async () => {
      res.end = jest.fn();
      res.request = { getHeader: jest.fn(() => 'bytes=150-200') };
      res.status = jest.fn(() => res);
      res.send = jest.fn(() => Promise.resolve());

      const stats: any = { isFile: () => true, size: 100 };
      jest.spyOn(fs, 'stat').mockResolvedValue(stats);

      await res.sendFile('file.txt');

      expect(res.status).toHaveBeenCalledWith(416);
      expect(res.send).toHaveBeenCalled();

      expect(res.setHeader).toHaveBeenCalledWith('Accept-Ranges', 'bytes');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/plain; charset=utf-8'
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Range',
        'bytes */100'
      );
    });

    it('should reject if response is already sent', async () => {
      res.writableEnded = true;
      await expect(res.sendFile('test')).rejects.toThrow(
        'Response already sent'
      );
    });

    it('should use a default content type', async () => {
      res.stream = jest.fn();
      res.request = { getHeader: jest.fn() };
      res.status = jest.fn(() => res);

      const stats: any = { isFile: () => true, size: 100 };
      jest.spyOn(fs, 'stat').mockResolvedValue(stats);

      await res.sendFile('file'); // unkown content type

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream' // default one
      );
    });
  });

  describe('download', () => {
    it('should set Content-Disposition header and call sendFile', async () => {
      const path = '/path/to/file.txt';
      const name = 'file.txt';

      jest.spyOn(res, 'sendFile').mockResolvedValue(undefined);

      await res.download(path, name);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        `attachment; filename="${name}"`
      );
      expect(res.sendFile).toHaveBeenCalledWith(path);
    });

    it('should reject if the name is not a string', async () => {
      const path = '/path/to/file.txt';
      const invalidName = 123;

      await expect(res.download(path, invalidName)).rejects.toThrow(
        new ResponseError('Invalid download file name')
      );
    });

    it('should clear Content-Disposition header if sendFile fails', async () => {
      const path = '/path/to/file.txt';
      const error = new Error('File not found');
      res.headersSent = false;
      jest.spyOn(res, 'sendFile').mockRejectedValue(error);
      await expect(res.download(path)).rejects.toThrow(error);
      expect(res.clearHeader).toHaveBeenCalledWith('Content-Disposition');
    });
  });

  describe('stream', () => {
    it('should pipe data and resolve when finished', async () => {
      const stream = new ReadStream() as any;
      stream.pipe = jest.fn().mockReturnThis();
      stream.on = jest.fn((event, callback) => {
        if (event === 'finish') {
          callback();
        }
        return stream; // Maintain chainability
      });

      await expect(res.stream(stream)).resolves.toBeUndefined();
      expect(stream.pipe).toHaveBeenCalledWith(res);
    });

    it('should reject if there is an error while streaming', async () => {
      const error = new Error('Stream error');
      const stream = new ReadStream() as any;
      stream.pipe = jest.fn().mockReturnThis();
      stream.on = jest.fn((event, callback) => {
        if (event === 'error') callback(error);
        return stream;
      });

      await expect(res.stream(stream)).rejects.toThrow(error);
    });

    it('should reject if response is already sent', async () => {
      res.writableEnded = true;
      await expect(res.stream()).rejects.toThrow('Response already sent');
    });

    it('should reject if you provide an invalid read stream', async () => {
      await expect(res.stream({})).rejects.toThrow('Invalid read stream');
    });
  });

  describe('status', () => {
    beforeEach(() => {
      res.getMessage = jest.fn().mockReturnValue('Not Found');
    });

    test('status should set the status code and message correctly', () => {
      res.status(200, 'Success');

      expect(res.statusCode).toBe(200);
      expect(res.statusMessage).toBe('Success');
    });

    test('status should use getMessage when message is not provided', () => {
      res.status(404);

      expect(res.statusCode).toBe(404);
      expect(res.getMessage).toHaveBeenCalledWith(404);
      expect(res.statusMessage).toBe('Not Found');
    });

    test('status should throw ResponseError for invalid status code', () => {
      expect(() => res.status('500' as any)).toThrow(ResponseError);
      expect(() => res.status(null as any)).toThrow(ResponseError);
    });

    test('status should throw ResponseError for invalid status message', () => {
      expect(() => res.status(400, 123 as any)).toThrow(ResponseError);
    });
  });

  describe('render', () => {
    beforeEach(() => {
      res.send = jest.fn().mockResolvedValue(undefined);
      res.request = {};
    });

    test('render should call render function and send HTML content', async () => {
      (render as jest.Mock).mockResolvedValue('<h1>Hello, John!</h1>');

      await res.render('component.fx', {}, { name: 'John' });

      expect(render).toHaveBeenCalledWith(
        'component.fx',
        { flash: [] },
        { name: 'John' }
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(res.send).toHaveBeenCalledWith('<h1>Hello, John!</h1>');
    });

    test('render should include csrf and merge flash messages', async () => {
      (render as jest.Mock).mockResolvedValue('<html></html>');
      res.request[FLASH_GET_KEY] = ['flash1'];
      res.request.csrfToken = 'token123';

      await res.render('view.fx', { flash: ['flash2'] }, {});

      expect(render).toHaveBeenCalledWith(
        'view.fx',
        { flash: ['flash1', 'flash2'], csrf: 'token123' },
        {}
      );
    });

    test('render should reject on render failure', async () => {
      (render as jest.Mock).mockRejectedValue(new Error('Render failed'));

      await expect(res.render('component.fx')).rejects.toThrow('Render failed');
    });
  });

  describe('html', () => {
    beforeEach(() => {
      res.setHeader = jest.fn();
      res.send = jest.fn().mockResolvedValue(undefined);
      res.request = {};
    });

    test('rejects if page is not a string', async () => {
      await expect(res.html(null)).rejects.toThrow('Invalid html page');
      await expect(res.html(123)).rejects.toThrow('Invalid html page');
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    test('sets Content-Type header and sends page string', async () => {
      await expect(res.html('<h1>Hello</h1>')).resolves.toBeUndefined();

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(res.send).toHaveBeenCalledWith('<h1>Hello</h1>');
    });

    test('rejects if send rejects', async () => {
      const error = new Error('Send failed');
      res.send.mockRejectedValue(error);

      await expect(res.html('<h1>Error</h1>')).rejects.toThrow('Send failed');

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(res.send).toHaveBeenCalledWith('<h1>Error</h1>');
    });
  });

  describe('json', () => {
    beforeEach(() => {
      res.send = jest.fn().mockResolvedValue(undefined);
    });

    test('should set Content-Type header and send JSON data', async () => {
      const data = { message: 'Hello, World!' };

      await res.json(data);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json'
      );
      expect(res.send).toHaveBeenCalledWith(JSON.stringify(data));
    });

    test('json should reject if data is not an array of an object', async () => {
      await expect(res.json('foo')).rejects.toThrow(ResponseError);
    });

    test('json should reject if JSON.stringify throws an error', async () => {
      const data: any = {};
      data.self = data; // Creates a circular reference

      await expect(res.json(data)).rejects.toThrow(TypeError);
    });
  });

  describe('redirect', () => {
    test('should return an instance of Redirector', () => {
      const result = res.redirect('/somewhere');
      expect(result).toBeInstanceOf(Redirector);
    });
  });

  describe('cookie', () => {
    test('should return an instance of Cookie', () => {
      const result = res.cookie();
      expect(result).toBeInstanceOf(Cookie);
    });

    test('should set a cookie', () => {
      const result = res.cookie('name', 'value');
      expect(result).toBeInstanceOf(Cookie);
    });
  });
});

describe('Redirector', () => {
  let req: any;
  let res: any;
  let redirect: Redirector;

  beforeEach(() => {
    req = Object.create(IncomingMessage.prototype);
    req.headers = {};
    req.getHeader = (key: string) => req.headers[key.toLowerCase()];
    req[FLASH_SET_KEY] = [];

    const set = jest.fn();

    res = {
      cookie: jest.fn(() => ({ set })),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockResolvedValue(undefined),
    };

    redirect = new Redirector(req, res);
  });

  describe('to', () => {
    test('should set the redirect URL', () => {
      const result = redirect.to('/dashboard');
      expect(result).toBe(redirect);
      expect((redirect as any).url).toBe('/dashboard');
    });

    test('should throw for non-string values', () => {
      expect(() => redirect.to(null as any)).toThrow(ResponseError);
      expect(() => redirect.to({} as any)).toThrow(ResponseError);
    });
  });

  describe('back', () => {
    test('should use referer header if available', () => {
      req.headers['referer'] = 'https://example.com/profile?tab=posts';

      const result = redirect.back('/fallback');
      expect(result).toBe(redirect);
      expect((redirect as any).url).toBe('/profile?tab=posts');
    });

    test('should fallback to provided path if referer is invalid', () => {
      req.headers['referer'] = 'invalid://url';

      redirect.back('/fallback');
      expect((redirect as any).url).toBe('/fallback');
    });

    test('should fallback to "/" if no referer and no fallback given', () => {
      delete req.headers['referer'];

      redirect.back();
      expect((redirect as any).url).toBe('/');
    });

    test('should support "referrer" fallback as well', () => {
      req.headers['referrer'] = 'https://example.com/settings';
      redirect.back();
      expect((redirect as any).url).toBe('/settings');
    });

    test('should fallback if resulting URL is empty after parsing', () => {
      // We'll simulate a case where the pathname is ''
      req.headers['referer'] = 'http://'; // This results in a URL parse success but pathname = ''

      redirect.back('/fallback');
      expect((redirect as any).url).toBe('/fallback');
    });
  });

  describe('send', () => {
    test('should set location header and status, and call send()', async () => {
      redirect.to('/next');

      await redirect.send(301);

      expect(res.setHeader).toHaveBeenCalledWith('Location', '/next');
      expect(res.status).toHaveBeenCalledWith(301);
      expect(res.send).toHaveBeenCalled();
    });

    test('should default to 302 and "/" if no url or code set', async () => {
      await redirect.send();

      expect(res.setHeader).toHaveBeenCalledWith('Location', '/');
      expect(res.status).toHaveBeenCalledWith(302);
      expect(res.send).toHaveBeenCalled();
    });

    test('should ignore non-integer status codes', async () => {
      redirect.to('/somewhere');

      await redirect.send('invalid' as any);
      expect(res.status).toHaveBeenCalledWith(302); // fallback
    });
  });

  describe('with', () => {
    test('flash initializes and sets error message by default', () => {
      req[FLASH_SET_KEY] = [];

      redirect.with('Something went wrong');

      expect(req[FLASH_SET_KEY]).toEqual([
        { type: 'error', message: 'Something went wrong' },
      ]);

      expect(res.cookie().set).toHaveBeenCalledWith(
        'flash',
        JSON.stringify([{ type: 'error', message: 'Something went wrong' }])
      );
    });

    test('flash sets custom type if provided', () => {
      req[FLASH_SET_KEY] = [];

      redirect.with('User created', 'success');

      expect(req[FLASH_SET_KEY]).toEqual([
        { type: 'success', message: 'User created' },
      ]);

      expect(res.cookie().set).toHaveBeenCalledWith(
        'flash',
        JSON.stringify([{ type: 'success', message: 'User created' }])
      );
    });

    test('flash appends multiple messages with correct types', () => {
      req[FLASH_SET_KEY] = [];

      redirect.with('First warning'); // default error
      redirect.with('Now saved', 'success');
      redirect.with('FYI', 'info');

      expect(req[FLASH_SET_KEY]).toEqual([
        { type: 'error', message: 'First warning' },
        { type: 'success', message: 'Now saved' },
        { type: 'info', message: 'FYI' },
      ]);

      expect(res.cookie().set).toHaveBeenLastCalledWith(
        'flash',
        JSON.stringify([
          { type: 'error', message: 'First warning' },
          { type: 'success', message: 'Now saved' },
          { type: 'info', message: 'FYI' },
        ])
      );
    });

    test('flash initializes flash array if not present', () => {
      delete req[FLASH_SET_KEY];

      redirect.with('Init message');

      expect(req[FLASH_SET_KEY]).toEqual([
        { type: 'error', message: 'Init message' },
      ]);

      expect(res.cookie().set).toHaveBeenCalledWith(
        'flash',
        JSON.stringify([{ type: 'error', message: 'Init message' }])
      );
    });

    test('should reject invalid arguments', () => {
      expect(() => redirect.with(null as any)).toThrow();
      expect(() => redirect.with('message', 123 as any)).toThrow();
    });
  });
});

describe('Cookie', () => {
  let req: any;
  let res: any;
  let options: any;

  beforeEach(() => {
    req = {};
    res = {
      setHeader: jest.fn(),
      getHeader: jest.fn().mockReturnValue(undefined),
    };

    options = config().loadSync();
    options.env = 'dev';
    options.cookies = {
      test: {
        path: '/test',
        sameSite: 'Strict' as const,
        expires: new Date('2030-01-01T00:00:00Z'),
        secure: true,
        httpOnly: true,
        priority: 'High' as const,
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  describe('CookieError', () => {
    test('should be an instance of Error', () => {
      const error = new CookieError('Test error');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
    });
  });

  describe('constructor', () => {
    test('should create a Cookie instance', () => {
      const cookie = new Cookie(req, res);
      expect(cookie).toBeInstanceOf(Cookie);
    });
  });

  describe('options() method', () => {
    let cookie: Cookie;

    beforeEach(() => {
      cookie = new Cookie(req, res);
    });

    test('should return default values when no cookie config exists', () => {
      // Mock config to return empty cookies
      options.cookies = {};
      options.env = 'dev';

      const result = cookie.options('nonexistent');

      expect(result.path).toBe('/');
      expect(result.sameSite).toBe('Lax');
      expect(result.secure).toBe(false); // env is 'dev'
      expect(result.httpOnly).toBe(true);
      expect(result.priority).toBe('High');
      expect(expect.any(result.expires)).toBeTruthy();
    });

    test('should return configured options when cookie exists', () => {
      const result = cookie.options('test');

      expect(result.path).toBe('/test');
      expect(result.sameSite).toBe('Strict');
      expect(result.secure).toBe(true);
      expect(result.httpOnly).toBe(true);
      expect(result.priority).toBe('High');
      expect(result.expires).toEqual(new Date('2030-01-01T00:00:00Z'));
    });

    test('should return secure=true in production environment', () => {
      options.cookies = {};
      options.env = 'pro';

      const result = cookie.options('any');
      expect(result.secure).toBe(true);
    });
  });

  describe('get() method', () => {
    let cookie: Cookie;

    beforeEach(() => {
      cookie = new Cookie(req, res);
    });

    test('should throw error for invalid cookie name', () => {
      expect(() => {
        cookie.get(123 as any, 'value', {});
      }).toThrow('Invalid cookie name');
    });

    test('should throw error for invalid cookie value', () => {
      expect(() => {
        cookie.get('test', 123 as any, {});
      }).toThrow('Invalid cookie value');
    });

    test('should throw error for invalid cookie options', () => {
      expect(() => {
        cookie.get('name', 'value', 123 as any);
      }).toThrow('Invalid cookie options');
    });

    test('should encode cookie value', () => {
      const result = cookie.get('test', 'value with spaces', {});
      expect(result).toContain('test=value%20with%20spaces');
    });

    test('should include maxAge in cookie string', () => {
      const result = cookie.get('test', 'value', { maxAge: 3600 });
      expect(result).toContain('Max-Age=3600');
    });

    test('should include domain in cookie string', () => {
      const result = cookie.get('test', 'value', { domain: 'example.com' });
      expect(result).toContain('Domain=example.com');
    });

    test('should include path in cookie string', () => {
      const result = cookie.get('test', 'value', { path: '/admin' });
      expect(result).toContain('Path=/admin');
    });

    test('should include secure flag in cookie string', () => {
      const result = cookie.get('test', 'value', { secure: true });
      expect(result).toContain('Secure');
    });

    test('should include httpOnly flag in cookie string', () => {
      const result = cookie.get('test', 'value', { httpOnly: true });
      expect(result).toContain('HttpOnly');
    });

    test('should include partitioned flag in cookie string', () => {
      const result = cookie.get('test', 'value', { partitioned: true });
      expect(result).toContain('Partitioned');
    });

    test('should include priority in cookie string', () => {
      const result = cookie.get('test', 'value', { priority: 'High' });
      expect(result).toContain('Priority=High');
    });

    test('should include expires in cookie string', () => {
      const expires = new Date('2030-01-01T00:00:00Z');
      const result = cookie.get('test', 'value', { expires });
      expect(result).toContain(`Expires=${expires.toString()}`);
    });

    test('should include sameSite in cookie string', () => {
      const result = cookie.get('test', 'value', { sameSite: 'Strict' });
      expect(result).toContain('SameSite=Strict');
    });

    test('should create complete cookie string with multiple options', () => {
      const expires = new Date('2030-01-01T00:00:00Z');
      const result = cookie.get('complete', 'value', {
        maxAge: 3600,
        domain: 'example.com',
        path: '/admin',
        secure: true,
        httpOnly: true,
        partitioned: true,
        priority: 'High',
        expires,
        sameSite: 'Strict',
      });

      expect(result).toContain('complete=value');
      expect(result).toContain('Max-Age=3600');
      expect(result).toContain('Domain=example.com');
      expect(result).toContain('Path=/admin');
      expect(result).toContain('Priority=High');
      expect(result).toContain('SameSite=Strict');
      expect(result).toContain('Expires=');
      expect(result).toContain('Secure');
      expect(result).toContain('HttpOnly');
      expect(result).toContain('Partitioned');
    });
  });

  describe('add() method', () => {
    let cookie: Cookie;

    beforeEach(() => {
      cookie = new Cookie(req, res);
      jest.clearAllMocks();
    });

    test('should throw error for invalid cookie header', () => {
      expect(() => {
        cookie.add(123 as any);
      }).toThrow('Invalid cookie header');
    });

    test('should create new array when no existing header', () => {
      cookie.add('test=cookie');

      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', ['test=cookie']);
    });

    test('should append to existing Set-Cookie header array', () => {
      res.getHeader.mockReturnValue(['existing=cookie']);

      cookie.add('new=cookie');

      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', [
        'existing=cookie',
        'new=cookie',
      ]);
    });

    test('should convert string header to array', () => {
      res.getHeader.mockReturnValue('existing=cookie');

      cookie.add('new=cookie');

      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', [
        'existing=cookie',
        'new=cookie',
      ]);
    });
  });

  describe('set() method', () => {
    let cookie: Cookie;

    beforeEach(() => {
      cookie = new Cookie(req, res);
      jest.clearAllMocks();
    });

    test('should set cookie with options from config', () => {
      cookie.set('test', 'value');

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.any(Array)
      );

      const setCookieHeader = (res.setHeader as jest.Mock).mock.calls[0][1][0];

      expect(setCookieHeader).toContain('test=value');
      expect(setCookieHeader).toContain('Path=/test');
      expect(setCookieHeader).toContain('SameSite=Strict');
      expect(setCookieHeader).toContain('Secure');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('Priority=High');
    });

    test('should throw error for invalid cookie name', () => {
      expect(() => {
        cookie.set(123 as any, 'value');
      }).toThrow('Invalid cookie name');
    });
  });

  describe('forget() method', () => {
    let cookie: Cookie;

    beforeEach(() => {
      cookie = new Cookie(req, res);
      jest.clearAllMocks();
    });

    test('should throw error for invalid cookie name', () => {
      expect(() => {
        cookie.forget(123 as any);
      }).toThrow('Invalid cookie name');
    });

    test('should set cookie with expiration values', () => {
      cookie.forget('test');

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.any(Array)
      );

      const setCookieHeader = (res.setHeader as jest.Mock).mock.calls[0][1][0];

      expect(setCookieHeader).toContain('test=;');
      expect(setCookieHeader).toContain('Max-Age=0');
      expect(setCookieHeader).toContain(
        'Expires=Thu Jan 01 1970 00:00:00 GMT+0000 (GMT)'
      );
      expect(setCookieHeader).toContain('Path=/test'); // From config
    });

    test('should use default options for unknown cookies', () => {
      cookie.forget('unknown');

      const setCookieHeader = (res.setHeader as jest.Mock).mock.calls[0][1][0];

      expect(setCookieHeader).toContain('unknown=;');
      expect(setCookieHeader).toContain('Path=/'); // Default path
      expect(setCookieHeader).toContain('SameSite=Lax'); // Default sameSite
    });
  });
});
