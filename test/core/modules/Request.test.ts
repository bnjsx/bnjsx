const options: any = {};
jest.mock('../../../src/config', () => ({
  config: () => {
    return {
      loadSync: () => options,
      resolveSync: () => __dirname,
    };
  },
}));

import '../../../src/core/modules/Request'; // Ensure prototype modifications are applied
import { Request, RequestError } from '../../../src/core';
import { IncomingMessage } from 'http';

describe('Request Methods', () => {
  let req: any;

  beforeEach(() => {
    req = Object.create(IncomingMessage.prototype); // Create a fresh instance
    req.headers = {};
    req.socket = { remoteAddress: '127.0.0.1' } as any; // default fallback IP
  });

  describe('getHeader', () => {
    test('should return correct header value', () => {
      req.headers['content-type'] = 'application/json';
      expect(req.getHeader('content-type')).toBe('application/json');
    });

    test('should return undefined for missing headers', () => {
      expect(req.getHeader('x-missing-header')).toBeUndefined();
    });

    test('should handle case-insensitive header names', () => {
      req.headers['content-type'] = 'text/html';
      expect(req.getHeader('CONTENT-TYPE')).toBe('text/html');
    });

    test('should throw RequestError for invalid header name', () => {
      expect(() => req.getHeader(123 as any)).toThrow(RequestError);
    });
  });

  describe('type', () => {
    test('should return true if Content-Type matches', () => {
      req.headers['content-type'] = 'application/json';
      expect(req.type('json')).toBe(true);
    });

    test('should return false if Content-Type does not match', () => {
      req.headers['content-type'] = 'application/json';
      expect(req.type('html')).toBe(false);
    });

    test('should return false if Content-Type header is missing', () => {
      expect(req.type('json')).toBe(false);
    });

    test('should handle direct MIME type comparison', () => {
      req.headers['content-type'] = 'text/html';
      expect(req.type('text/html')).toBe(true);
    });
  });

  describe('accepts', () => {
    test('should return true if Accept header contains the type', () => {
      req.headers['accept'] = 'text/html, application/json';
      expect(req.accepts('application/json')).toBe(true);
    });

    test('should return false if Accept header does not contain the type', () => {
      req.headers['accept'] = 'text/html';
      expect(req.accepts('application/json')).toBe(false);
    });

    test('should return false if Accept header is missing', () => {
      expect(req.accepts('json')).toBe(false);
    });

    test('should handle MIME type lookup correctly', () => {
      req.headers['accept'] = 'text/html, application/json';
      expect(req.accepts('html')).toBe(true); // 'html' should map to 'text/html'
    });

    test('should handle spaces and different formatting in Accept header', () => {
      req.headers['accept'] = ' text/html ,  application/json ';
      expect(req.accepts('application/json')).toBe(true);
    });

    test('should return false for an empty Accept header', () => {
      req.headers['accept'] = '';
      expect(req.accepts('application/json')).toBe(false);
    });
  });

  describe('isAjax', () => {
    test('should return true if X-Requested-With header is set to XMLHttpRequest', () => {
      req.headers['x-requested-with'] = 'XMLHttpRequest';
      expect(req.isAjax()).toBe(true);
    });

    test('should be case-insensitive', () => {
      req.headers['x-requested-with'] = 'xmlhttprequest';
      expect(req.isAjax()).toBe(true);
    });

    test('should return false if X-Requested-With header is not set', () => {
      expect(req.isAjax()).toBe(false);
    });

    test('should return false if header is set to something else', () => {
      req.headers['x-requested-with'] = 'Fetch';
      expect(req.isAjax()).toBe(false);
    });
  });

  describe('getIp', () => {
    test('should return IP from x-forwarded-for header', () => {
      req.headers['x-forwarded-for'] = '203.0.113.195';
      expect(req.getIp()).toBe('203.0.113.195');
    });

    test('should return first IP if multiple are provided in x-forwarded-for', () => {
      req.headers['x-forwarded-for'] =
        '203.0.113.195, 70.41.3.18, 150.172.238.178';
      expect(req.getIp()).toBe('203.0.113.195');
    });

    test('should fallback to socket.remoteAddress if no header', () => {
      req.socket.remoteAddress = '192.168.0.1';
      expect(req.getIp()).toBe('192.168.0.1');
    });

    test('should normalize IPv6-embedded IPv4 addresses', () => {
      req.socket.remoteAddress = '::ffff:192.168.0.1';
      expect(req.getIp()).toBe('192.168.0.1');
    });

    test('should normalize IPv6 loopback (::1) to 127.0.0.1', () => {
      req.socket.remoteAddress = '::1';
      expect(req.getIp()).toBe('127.0.0.1');
    });

    test('should return fallback IP if none found', () => {
      req.socket = undefined;
      expect(req.getIp()).toBe('0.0.0.0');
    });
  });

  describe('getBase', () => {
    test('should return base without port for default HTTP port', () => {
      options.protocol = 'http';
      options.host = 'localhost';
      options.port = 80;
      expect(req.getBase()).toBe('http://localhost');
    });

    test('should return base without port for default HTTPS port', () => {
      options.protocol = 'https';
      options.host = 'example.com';
      options.port = 443;

      expect(req.getBase()).toBe('https://example.com');
    });

    test('should include port if not default for HTTP', () => {
      options.protocol = 'http';
      options.host = 'localhost';
      options.port = 8080;

      expect(req.getBase()).toBe('http://localhost:8080');
    });

    test('should include port if not default for HTTPS', () => {
      options.protocol = 'https';
      options.host = 'secure.site';
      options.port = 8443;

      expect(req.getBase()).toBe('https://secure.site:8443');
    });
  });
});
