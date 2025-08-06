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

describe('Response', () => {
  let res: any;

  beforeEach(() => {
    res = Object.create(ServerResponse.prototype); // Create a fresh instance
    res.end = jest.fn((data, callback) => callback && callback());
    res.setHeader = jest.fn();
    res.getHeader = jest.fn();
    res.clearHeader = jest.fn();
    res.hasHeader = jest.fn(() => false);
    res.setCooke;
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

  describe('cookie', () => {
    test('should throw an error for invalid cookie name', () => {
      expect(() => {
        res.cookie(123 as any, 'value');
      }).toThrow('Invalid cookie name');
    });

    test('should throw an error for invalid cookie value', () => {
      expect(() => {
        res.cookie('test', 456 as any);
      }).toThrow('Invalid cookie value');
    });

    test('should throw an error for invalid options object', () => {
      expect(() => {
        res.cookie('name', 'value', 'invalid' as any);
      }).toThrow('Invalid cookie options');
    });

    test('should set a basic cookie', () => {
      res.cookie('user', 'john');

      expect(res.setHeader).toHaveBeenCalledWith('Set-Cookie', 'user=john');
    });

    test('should encode the cookie value', () => {
      res.cookie('token', 'abc def');

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'token=abc%20def'
      );
    });

    test('should set cookie with Max-Age', () => {
      res.cookie('session', 'xyz', { maxAge: 3600 });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'session=xyz; Max-Age=3600'
      );
    });

    test('should set cookie with Domain', () => {
      res.cookie('site', 'example', { domain: 'example.com' });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'site=example; Domain=example.com'
      );
    });

    test('should set cookie with Path', () => {
      res.cookie('page', 'home', { path: '/admin' });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'page=home; Path=/admin'
      );
    });

    test('should set Secure flag', () => {
      res.cookie('auth', 'true', { secure: true });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'auth=true; Secure'
      );
    });

    test('should set HttpOnly flag', () => {
      res.cookie('secret', '123', { httpOnly: true });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'secret=123; HttpOnly'
      );
    });

    test('should set Partitioned flag', () => {
      res.cookie('data', 'info', { partitioned: true });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'data=info; Partitioned'
      );
    });

    test('should set Expires with valid Date object', () => {
      const expires = new Date('2030-01-01T00:00:00Z');
      res.cookie('expireTest', 'yes', { expires });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        `expireTest=yes; Expires=${expires.toString()}`
      );
    });

    test('should set Expires with valid Date string', () => {
      const expires = '2030-01-01 00:00:00';
      res.cookie('expireTest', 'yes', { expires });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        `expireTest=yes; Expires=${new Date(expires).toString()}`
      );
    });

    test('should throw error for invalid Expires value', () => {
      expect(() => {
        res.cookie('expireTest', 'yes', { expires: 123 as any });
      }).toThrow('Invalid expires value: 123');
    });

    test('should set SameSite with valid values', () => {
      res.cookie('samesiteTest', 'value', { sameSite: 'Strict' });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'samesiteTest=value; SameSite=Strict'
      );
    });

    test('should throw error for invalid SameSite value', () => {
      expect(() => {
        res.cookie('test', 'value', { sameSite: 'Invalid' as any });
      }).toThrow('Invalid SameSite value: Invalid');
    });

    test('should throw error if SameSite=None is set without Secure', () => {
      expect(() => {
        res.cookie('test', 'value', { sameSite: 'None' });
      }).toThrow('SameSite=None requires the Secure flag.');
    });

    test('should set Priority with valid values', () => {
      res.cookie('priorityTest', 'high', { priority: 'High' });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'priorityTest=high; Priority=High'
      );
    });

    test('should throw error for invalid Priority value', () => {
      expect(() => {
        res.cookie('test', 'value', { priority: 'Invalid' as any });
      }).toThrow('Invalid Priority value: Invalid');
    });

    test('should set multiple cookie options', () => {
      res.cookie('multi', 'test', {
        maxAge: 3600,
        domain: 'example.com',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
      });

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'multi=test; Max-Age=3600; Domain=example.com; Path=/; Secure; HttpOnly; SameSite=Lax'
      );
    });

    test('should append multiple cookies in Set-Cookie header as array', () => {
      // First cookie sets header as string
      res.cookie('first', '1');
      expect(res.setHeader).toHaveBeenLastCalledWith('Set-Cookie', 'first=1');

      // Mock getHeader to return the last set value (string)
      (res.getHeader as jest.Mock).mockReturnValue('first=1');

      // Second cookie should convert header to array
      res.cookie('second', '2');
      expect(res.setHeader).toHaveBeenLastCalledWith('Set-Cookie', [
        'first=1',
        'second=2',
      ]);
    });

    test('should add cookies to existing Set-Cookie array header', () => {
      // Mock getHeader to simulate existing array of cookies
      (res.getHeader as jest.Mock).mockReturnValue(['first=1']);

      res.cookie('second', '2');

      expect(res.setHeader).toHaveBeenLastCalledWith('Set-Cookie', [
        'first=1',
        'second=2',
      ]);
    });
  });

  describe('clearCookie', () => {
    beforeEach(() => {
      res.request = { host: 'example.com' }; // Mock request host
    });

    test('should throw an error for invalid cookie name', () => {
      expect(() => {
        res.clearCookie(123 as any);
      }).toThrow('Invalid cookie name');
    });

    test('should clear a cookie with default path and domain', () => {
      res.clearCookie('session');

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'session=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Domain=example.com;'
      );
    });

    test('should clear a cookie with a custom path', () => {
      res.clearCookie('auth', '/admin');

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'auth=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/admin; Domain=example.com;'
      );
    });

    test('should throw an error for invalid cookie path', () => {
      expect(() => {
        res.clearCookie('session', 123 as any);
      }).toThrow('Invalid cookie path');
    });

    test('should clear a cookie with a custom domain', () => {
      res.clearCookie('user', '/', 'mydomain.com');

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'user=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; Domain=mydomain.com;'
      );
    });

    test('should throw an error for invalid cookie domain', () => {
      expect(() => {
        res.clearCookie('session', '/', 123 as any);
      }).toThrow('Invalid cookie domain');
    });

    test('should clear a cookie with both custom path and domain', () => {
      res.clearCookie('token', '/secure', 'auth.com');

      expect(res.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        'token=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/secure; Domain=auth.com;'
      );
    });
  });

  describe('redirect', () => {
    test('should return an instance of Redirector', () => {
      const result = res.redirect('/somewhere');
      expect(result).toBeInstanceOf(Redirector);
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

    res = {
      cookie: jest.fn(),
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

      expect(res.cookie).toHaveBeenCalledWith(
        'flash',
        JSON.stringify([{ type: 'error', message: 'Something went wrong' }]),
        expect.objectContaining({
          path: '/',
          httpOnly: true,
          expires: UTC.future.minute(10),
        })
      );
    });

    test('flash sets custom type if provided', () => {
      req[FLASH_SET_KEY] = [];

      redirect.with('User created', 'success');

      expect(req[FLASH_SET_KEY]).toEqual([
        { type: 'success', message: 'User created' },
      ]);

      expect(res.cookie).toHaveBeenCalledWith(
        'flash',
        JSON.stringify([{ type: 'success', message: 'User created' }]),
        expect.any(Object)
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

      expect(res.cookie).toHaveBeenLastCalledWith(
        'flash',
        JSON.stringify([
          { type: 'error', message: 'First warning' },
          { type: 'success', message: 'Now saved' },
          { type: 'info', message: 'FYI' },
        ]),
        expect.any(Object)
      );
    });

    test('flash initializes flash array if not present', () => {
      delete req[FLASH_SET_KEY];

      redirect.with('Init message');

      expect(req[FLASH_SET_KEY]).toEqual([
        { type: 'error', message: 'Init message' },
      ]);
      expect(res.cookie).toHaveBeenCalledWith(
        'flash',
        JSON.stringify([{ type: 'error', message: 'Init message' }]),
        expect.any(Object)
      );
    });
  });
});
