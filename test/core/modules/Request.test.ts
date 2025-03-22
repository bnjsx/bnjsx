import '../../../src/core/modules/Request'; // Ensure prototype modifications are applied
import { Request, RequestError } from '../../../src/core';
import { IncomingMessage } from 'http';

describe('Request Methods', () => {
  let req: Request;

  beforeEach(() => {
    req = Object.create(IncomingMessage.prototype); // Create a fresh instance
    req.headers = {};
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
});
