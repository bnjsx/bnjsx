jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-token'),
  }),
}));

import { bot, csrf, csrft } from '../../../src/core';
import { BadRequestError } from '../../../src/errors';

describe('CSRF Middleware', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      method: 'GET', // Default method
      body: {},
      cookies: {},
      headers: {},
    };
    res = {
      cookie: jest.fn(),
    };
  });

  it('should generate a CSRF token for GET requests', async () => {
    req.cookies = undefined;
    req.method = 'GET';

    await csrft(req, res);

    // Ensure the CSRF token is set in the request
    expect(req.csrfToken).toBe('mock-token');

    // Ensure the cookie is set
    expect(res.cookie).toHaveBeenCalledWith(
      'csrfToken',
      'mock-token',
      expect.objectContaining({
        expires: expect.any(String),
        secure: false, // `secure` will be false since the env is 'dev'
        httpOnly: false,
        sameSite: 'Strict',
        priority: 'High',
      })
    );
  });

  it('should set the CSRF token from cookies if present', async () => {
    req.cookies = { csrfToken: 'existing-token' };

    await csrft(req, res);

    // Ensure that req.csrfToken is set to the token from cookies
    expect(req.csrfToken).toBe('existing-token');

    // Ensure no cookie is set because the CSRF token was already available in the cookies
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('should accept a valid CSRF token in POST body', async () => {
    req.method = 'POST';
    req.cookies.csrfToken = 'valid-token';
    req.body.csrfToken = 'valid-token'; // Simulating valid token
    req.getHeader = jest.fn(); // // Simulating undefined token

    await expect(csrf(req, res)).resolves.toBeUndefined();
  });

  it('should accept a valid CSRF token in POST header', async () => {
    req.method = 'POST';
    req.cookies.csrfToken = 'valid-token';
    req.body.csrfToken = undefined; // Simulating undefined token
    req.getHeader = jest.fn(() => 'valid-token'); // Simulating valid token

    await expect(csrf(req, res)).resolves.toBeUndefined();
  });

  it('should reject with BadRequestError if CSRF token mismatch', async () => {
    req.method = 'POST';
    req.cookies.csrfToken = 'valid-token';
    req.body.csrfToken = 'invalid-token';
    req.getHeader = jest.fn(() => 'invalid-token');

    await expect(csrf(req, res)).rejects.toThrow(
      new BadRequestError('Invalid or missing CSRF token')
    );
  });

  it('should reject with BadRequestError if CSRF token is missing', async () => {
    req.method = 'POST';
    req.cookies.csrfToken = 'valid-token';
    req.body.csrfToken = undefined; // No token
    req.getHeader = jest.fn();

    await expect(csrf(req, res)).rejects.toThrow(
      new BadRequestError('Invalid or missing CSRF token')
    );
  });

  it('should handle case when cookies, body are undefined', async () => {
    // Setting cookies, body to undefined
    req.method = 'POST';
    req.cookies = undefined;
    req.body = undefined;
    req.getHeader = jest.fn();

    await expect(csrf(req, res)).rejects.toThrow(
      new BadRequestError('Invalid or missing CSRF token')
    );
  });
});

describe('BOT Middleware', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      method: 'GET', // Default method
      body: {},
      cookies: {},
      headers: {},
      getHeader: jest.fn(),
    };
    res = {
      cookie: jest.fn(),
    };
  });

  it('should pass if honeypot field and header are missing', async () => {
    req.body = {};
    req.getHeader.mockReturnValue(undefined);

    await expect(bot(req, res)).resolves.toBeUndefined();
  });

  it('should reject if honeypot field in body is present', async () => {
    req.body = { honeyPot: 'trap' };
    req.getHeader.mockReturnValue(undefined);

    await expect(bot(req, res)).rejects.toThrow(
      new BadRequestError('Bot detected via honeypot field')
    );
  });

  it('should reject if honeypot header is present', async () => {
    req.body = {};
    req.getHeader.mockReturnValue('trap-header');

    await expect(bot(req, res)).rejects.toThrow(
      new BadRequestError('Bot detected via honeypot field')
    );
  });

  it('should handle case when body is undefined', async () => {
    req.body = undefined;

    await expect(bot(req, res)).resolves.toBeUndefined();
  });
});
