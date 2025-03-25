jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../../src/core/template/Component', () => ({
  render: jest.fn(() => 'component'),
}));
jest.mock('../../../src/core/modules/App', () => ({
  appKey: jest.fn(() => 'test-app-key'),
}));

const connection = {
  id: Symbol('PoolConnection'),
  driver: { id: Symbol('MySQL') },
  query: jest.fn(() => Promise.resolve([])) as any,
  release: jest.fn(),
};

const config: Record<string, any> = {
  cluster: {
    request: jest.fn(() => Promise.resolve(connection)),
  },
};

jest.mock('../../../src/config', () => ({
  config: () => {
    return { loadSync: jest.fn().mockReturnValue(config) };
  },
}));

import { Auth, AuthError } from '../../../src/core'; // Adjust path if needed
import { BadRequestError, ForbiddenError } from '../../../src/errors';
import { render } from '../../../src/core/template/Component';
import { UTC } from '../../../src/helpers';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Auth', () => {
  describe('constructor', () => {
    const mockMailer = jest.fn();

    it('should initialize with default values', () => {
      const auth = new Auth({ mailer: mockMailer });

      expect(auth).toBeDefined();
      expect(auth['mailer']).toBe(mockMailer);
      expect(auth['mode']).toBe('lazy');
      expect(auth['createdAt']).toBe('created_at');
      expect(auth['updatedAt']).toBe('updated_at');
      expect(auth['subject']).toBe('Password Reset Link');
      expect(auth['expires']).toBe(24 * 60 * 60);
      expect(auth['component']).toBe('emails.reset_email');
      expect(auth['base']).toBe('password-reset');
    });

    it('should override defaults when options are provided', () => {
      const options = {
        mailer: mockMailer,
        createdAt: 'created',
        updatedAt: 'updated',
        subject: 'New Subject',
        expires: 3600,
        component: 'custom.view',
        base: 'custom-reset',
        mode: 'lazy',
      };

      const auth = new Auth(options);

      expect(auth['createdAt']).toBe('created');
      expect(auth['updatedAt']).toBe('updated');
      expect(auth['subject']).toBe('New Subject');
      expect(auth['expires']).toBe(3600);
      expect(auth['component']).toBe('custom.view');
      expect(auth['base']).toBe('custom-reset');
      expect(auth['mode']).toBe('lazy');
    });

    it('should throw an error if mailer is missing', () => {
      expect(() => new Auth({} as any)).toThrow(AuthError);
    });

    it('should set cookie options if provided', () => {
      const options = {
        mailer: mockMailer,
        cookie: { httpOnly: false, secure: false },
      };

      const auth = new Auth(options);
      expect(auth['cookie']).toEqual({ httpOnly: false, secure: false });
    });

    it('should override messages if provided', () => {
      const options = {
        mailer: mockMailer,
        messages: { invalidEmail: 'Custom error' },
      };

      const auth = new Auth(options);
      expect(auth['messages'].invalidEmail).toBe('Custom error');
    });

    it('should initialize form fields correctly', () => {
      const auth = new Auth({ mailer: mockMailer });

      expect(auth.form['fields']).toHaveProperty('email');
      expect(auth.form['fields'].email).toEqual([
        { test: expect.any(Function), message: auth['messages'].invalidEmail },
        { test: expect.any(Function), message: auth['messages'].longEmail },
      ]);

      expect(auth.form['fields']).toHaveProperty('password');
      expect(auth.form['fields'].password).toEqual([
        { test: expect.any(Function), message: auth['messages'].shortPassword },
        { test: expect.any(Function), message: auth['messages'].longPassword },
        { test: expect.any(Function), message: auth['messages'].weakPassword },
      ]);

      // Test the actual validation logic
      expect(auth.form['fields'].email[0].test('invalid-email')).toBe(false); // invalid
      expect(auth.form['fields'].email[1].test('a'.repeat(251))).toBe(false); // long

      expect(auth.form['fields'].password[0].test('short')).toBe(false); // short
      expect(auth.form['fields'].password[1].test('a'.repeat(21))).toBe(false); // long
      expect(auth.form['fields'].password[2].test('hello123')).toBe(false); // weak
    });
  });

  describe('register', () => {
    let auth: any;
    let req: any;
    let res: any;

    beforeEach(() => {
      auth = new Auth({ mailer: jest.fn() });

      req = {
        getHeader: jest.fn(),
        fields: { email: 'test@example.com', password: 'pass@123' },
      };

      res = { cookie: jest.fn() };

      jest.clearAllMocks();
    });

    it('should throw BadRequestError if req.fields is missing', async () => {
      req.fields = undefined;
      await expect(auth.register(req, res)).rejects.toThrow(BadRequestError);
    });

    it('should resolve early if there are validation errors', async () => {
      req.errors = { email: ['Invalid email'] };
      await expect(auth.register(req, res)).resolves.toBeUndefined();
    });

    it('should resolve if the email is already registered', async () => {
      connection.query.mockResolvedValueOnce([{ email: 'test@example.com' }]);
      await expect(auth.register(req, res)).resolves.toBeUndefined();
      expect(req.errors).toEqual({ email: [auth.messages.emailTaken] });
    });

    it('should hash the password and insert the user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      await expect(auth.register(req, res)).resolves.toBeUndefined();
      expect(bcrypt.hash).toHaveBeenCalledWith('pass@123', 10);
    });

    it('should generate a JWT token in smart mode', async () => {
      auth.mode = 'smart';
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      (jwt.sign as jest.Mock).mockReturnValue('test-token');

      await expect(auth.register(req, res)).resolves.toBeUndefined();

      expect(req.authToken).toBe('test-token');
      expect(jwt.sign).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        'test-app-key',
        { expiresIn: auth.expires }
      );
    });

    it('should set an authToken cookie in web mode', async () => {
      config.mode = 'web';
      auth.mode = 'smart';
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      (jwt.sign as jest.Mock).mockReturnValue('test-token');

      await expect(auth.register(req, res)).resolves.toBeUndefined();

      expect(res.cookie).toHaveBeenCalledWith(
        'authToken',
        'test-token',
        auth.cookie
      );
    });

    it('should call builder with correct arguments', async () => {
      config.mode = 'web';
      auth.mode = 'smart';
      auth.createdAt = false;

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      (jwt.sign as jest.Mock).mockReturnValue('test-token');

      await expect(auth.register(req, res)).resolves.toBeUndefined();

      // Check user
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ?;',
        ['test@example.com']
      );
      // Insert user
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO users (email, password) VALUES (?, ?);',
        ['test@example.com', 'hashed-password']
      );
    });
  });

  describe('login', () => {
    let auth: any;
    let req: any;
    let res: any;

    beforeEach(() => {
      auth = new Auth({ mailer: jest.fn() });

      req = {
        getHeader: jest.fn(),
        fields: { email: 'test@example.com', password: 'pass@123' },
      };

      res = { cookie: jest.fn() };

      jest.clearAllMocks();
    });

    it('should throw BadRequestError if req.fields is missing', async () => {
      req.fields = undefined;
      await expect(auth.login(req, res)).rejects.toThrow(BadRequestError);
    });

    it('should resolve early if there are validation errors', async () => {
      req.errors = { email: ['Invalid email'] };
      await expect(auth.login(req, res)).resolves.toBeUndefined();
    });

    it('should return error if user is not found', async () => {
      connection.query.mockResolvedValueOnce([]);
      await expect(auth.login(req, res)).resolves.toBeUndefined();
      expect(req.errors).toEqual({ email: [auth.messages.userNotFound] });
    });

    it('should return error if password does not match', async () => {
      connection.query.mockResolvedValueOnce([
        { email: 'test@example.com', password: 'hashed-pass' },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(auth.login(req, res)).resolves.toBeUndefined();
      expect(req.errors).toEqual({ email: [auth.messages.userNotFound] });
    });

    it('should generate a JWT token on successful login', async () => {
      connection.query.mockResolvedValueOnce([
        { email: 'test@example.com', password: 'hashed-pass' },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('test-token');

      await expect(auth.login(req, res)).resolves.toBeUndefined();

      expect(jwt.sign).toHaveBeenCalledWith(
        { email: 'test@example.com' },
        'test-app-key',
        { expiresIn: auth.expires }
      );
      expect(req.authToken).toBe('test-token');
    });

    it('should set authToken cookie in web mode', async () => {
      config.mode = 'web';
      connection.query.mockResolvedValueOnce([
        { email: 'test@example.com', password: 'hashed-pass' },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('test-token');

      await expect(auth.login(req, res)).resolves.toBeUndefined();

      expect(res.cookie).toHaveBeenCalledWith(
        'authToken',
        'test-token',
        auth.cookie
      );
    });

    it('should call builder with correct arguments', async () => {
      connection.query.mockResolvedValueOnce([
        { email: 'test@example.com', password: 'hashed-pass' },
      ]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('test-token');

      await expect(auth.login(req, res)).resolves.toBeUndefined();

      // Check user
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ?;',
        ['test@example.com']
      );
    });
  });

  describe('logout', () => {
    let auth: Auth;
    let req: any;
    let res: any;

    beforeEach(() => {
      auth = new Auth({ mailer: jest.fn() });
      req = {};
      res = { clearCookie: jest.fn() };
    });

    it('should clear the authToken cookie in web mode', async () => {
      config.mode = 'web';

      await auth.logout(req, res);
      expect(res.clearCookie).toHaveBeenCalledWith('authToken', '/');
    });

    it('should not clear the authToken cookie in API mode', async () => {
      config.mode = 'api';
      await auth.logout(req, res);
      expect(res.clearCookie).not.toHaveBeenCalled();
    });
  });

  describe('mail', () => {
    let auth: any;
    let req: any;
    let res: any;

    beforeEach(() => {
      auth = new Auth({ mailer: jest.fn() });

      req = {
        getHeader: jest.fn(),
        fields: { email: 'test@example.com' },
        protocol: 'http',
        host: 'localhost',
        port: '3000',
      };

      res = {};

      jest.clearAllMocks();
    });

    it('should throw BadRequestError if req.fields is missing', async () => {
      req.fields = undefined;
      await expect(auth.mail(req, res)).rejects.toThrow(BadRequestError);
    });

    it('should resolve early if there are validation errors', async () => {
      req.errors = { email: ['Invalid email'] };
      await expect(auth.mail(req, res)).resolves.toBeUndefined();
    });

    it('should resolve if the email is not found', async () => {
      connection.query.mockResolvedValueOnce([]);
      await expect(auth.mail(req, res)).resolves.toBeUndefined();
    });

    it('should insert a reset token and send an email if user exists', async () => {
      connection.query.mockResolvedValueOnce([{ email: 'test@example.com' }]);

      await expect(auth.mail(req, res)).resolves.toBeUndefined();

      // Check user lookup
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = ?;',
        ['test@example.com']
      );

      // Insert reset token
      expect(connection.query).toHaveBeenCalledWith(
        'INSERT INTO reset_tokens (email, token, expires_at) VALUES (?, ?, ?);',
        expect.any(Array)
      );

      // Mailer should be called
      expect(auth.mailer).toHaveBeenCalledWith(
        'test@example.com',
        auth.subject,
        expect.any(String)
      );

      // Component should be rendered
      expect(render).toHaveBeenCalledWith(auth.component, {
        link: expect.stringContaining(
          `${req.protocol}://${req.host}:${req.port}/${auth.base}/`
        ),
      });
    });
  });

  describe('reset', () => {
    let auth: any;
    let req: any;
    let res: any;

    beforeEach(() => {
      auth = new Auth({ mailer: jest.fn() });

      req = {
        getHeader: jest.fn(),
        params: { token: 'test-token' },
        fields: { password: 'newPass@123' },
      };

      res = {};

      jest.spyOn(UTC.get, 'datetime').mockReturnValue('2025-03-01T12:00:00Z');

      jest.clearAllMocks();
    });

    it('should throw BadRequestError if req.fields is missing', async () => {
      req.fields = undefined;
      await expect(auth.reset(req, res)).rejects.toThrow(
        'No fields found for authentication.'
      );
    });

    it('should throw BadRequestError if req.params.token is missing', async () => {
      req.params.token = undefined;
      await expect(auth.reset(req, res)).rejects.toThrow(
        'Invalid or expired token.'
      );
    });

    it('should resolve early if there are validation errors', async () => {
      req.errors = { password: ['Invalid password'] };
      await expect(auth.reset(req, res)).resolves.toBeUndefined();
    });

    it('should return error if token is invalid or expired', async () => {
      connection.query.mockResolvedValueOnce([]);

      await expect(auth.reset(req, res)).rejects.toThrow(
        'Invalid or expired token.'
      );

      expect(connection.query).toHaveBeenCalledWith(
        `SELECT * FROM reset_tokens INNER JOIN users ON users.email = reset_tokens.email WHERE reset_tokens.token = ? AND reset_tokens.expires_at > ?;`,
        [expect.any(String), '2025-03-01T12:00:00Z']
      );
    });

    it('should hash the password and update the user', async () => {
      connection.query.mockResolvedValueOnce([{ email: 'test@example.com' }]);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      auth.updatedAt = false;

      await expect(auth.reset(req, res)).resolves.toBeUndefined();

      expect(connection.query).toHaveBeenLastCalledWith(
        'UPDATE users SET password = ? WHERE email = ?;',
        ['hashed-password', 'test@example.com']
      );
    });

    it('should update the timestamp if updatedAt is enabled', async () => {
      auth.updatedAt = 'updated_at';
      connection.query.mockResolvedValueOnce([{ email: 'test@example.com' }]);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      await expect(auth.reset(req, res)).resolves.toBeUndefined();

      expect(connection.query).toHaveBeenLastCalledWith(
        'UPDATE users SET password = ?, updated_at = ? WHERE email = ?;',
        ['hashed-password', '2025-03-01T12:00:00Z', 'test@example.com']
      );
    });
  });

  describe('auth', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
      req = { cookies: {}, headers: {} };
      res = {};
      jest.clearAllMocks();
      console.log = jest.fn();
    });

    it('should reject if no token is provided (web mode)', async () => {
      config.mode = 'web';

      await expect(Auth.auth(req, res)).rejects.toThrow(
        new ForbiddenError('This route requires authentication.')
      );
    });

    it('should reject if no token is provided (API mode)', async () => {
      config.mode = 'api';

      await expect(Auth.auth(req, res)).rejects.toThrow(
        new ForbiddenError('This route requires authentication.')
      );
    });

    it('should resolve if token is valid (web mode)', async () => {
      config.mode = 'web';
      req.cookies.authToken = 'valid-token';

      (jwt.verify as jest.Mock).mockReturnValue({
        id: 1,
        email: 'test@example.com',
      });

      await expect(Auth.auth(req, res)).resolves.toBeUndefined();

      expect(req.user).toEqual({ id: 1, email: 'test@example.com' });
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-app-key');
    });

    it('should resolve if token is valid (API mode)', async () => {
      config.mode = 'api';
      req.headers['x-auth-token'] = 'valid-token';

      (jwt.verify as jest.Mock).mockReturnValue({
        id: 1,
        email: 'test@example.com',
      });

      await expect(Auth.auth(req, res)).resolves.toBeUndefined();

      expect(req.user).toEqual({ id: 1, email: 'test@example.com' });
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-app-key');
    });

    it('should reject if token is invalid', async () => {
      config.mode = 'web';
      req.cookies!.authToken = 'invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(Auth.auth(req, res)).rejects.toThrow(
        new ForbiddenError('Authentication token has expired.')
      );

      expect(jwt.verify).toHaveBeenCalledWith('invalid-token', 'test-app-key');
    });

    it('should log error if token is invalid and env is dev', async () => {
      config.mode = 'web';
      config.env = 'dev';
      req.cookies.authToken = 'invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(Auth.auth(req, res)).rejects.toThrow(ForbiddenError);

      expect(console.log).toHaveBeenCalledWith(new Error('Invalid token'));
    });

    it('should not log error if env is not dev', async () => {
      config.mode = 'web';
      config.env = 'pro';
      req.cookies.authToken = 'invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(Auth.auth(req, res)).rejects.toThrow(ForbiddenError);

      expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle req.cookies', async () => {
      config.mode = 'web';
      req.cookies = undefined;

      await expect(Auth.auth(req, res)).rejects.toThrow(
        new ForbiddenError('This route requires authentication.')
      );
    });
  });

  describe('guest', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
      req = { cookies: {}, headers: {} };
      res = {};
      jest.clearAllMocks();
    });

    it('should resolve if no token is provided (web mode)', async () => {
      config.mode = 'web';

      await expect(Auth.guest(req, res)).resolves.toBeUndefined();
    });

    it('should resolve if no token is provided (API mode)', async () => {
      config.mode = 'api';

      await expect(Auth.guest(req, res)).resolves.toBeUndefined();
    });

    it('should reject if a token is provided (web mode)', async () => {
      config.mode = 'web';
      req.cookies.authToken = 'valid-token';

      await expect(Auth.guest(req, res)).rejects.toThrow(
        new ForbiddenError('This route restricted to guests only.')
      );
    });

    it('should reject if a token is provided (API mode)', async () => {
      config.mode = 'api';
      req.headers['x-auth-token'] = 'valid-token';

      await expect(Auth.guest(req, res)).rejects.toThrow(
        new ForbiddenError('This route restricted to guests only.')
      );
    });

    it('should handle req.cookies', async () => {
      config.mode = 'web';
      req.cookies = undefined;

      await expect(Auth.guest(req, res)).resolves.toBeUndefined();
    });
  });

  describe('any', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
      req = { cookies: {}, headers: {} };
      res = {};
      jest.clearAllMocks();
      console.log = jest.fn();
    });

    it('should resolve if no token is provided (web mode)', async () => {
      config.mode = 'web';

      await expect(Auth.any(req, res)).resolves.toBeUndefined();
    });

    it('should resolve if no token is provided (API mode)', async () => {
      config.mode = 'api';

      await expect(Auth.any(req, res)).resolves.toBeUndefined();
    });

    it('should resolve and set user if token is valid (web mode)', async () => {
      config.mode = 'web';
      req.cookies.authToken = 'valid-token';

      (jwt.verify as jest.Mock).mockReturnValue({
        id: 1,
        email: 'test@example.com',
      });

      await expect(Auth.any(req, res)).resolves.toBeUndefined();
      expect(req.user).toEqual({ id: 1, email: 'test@example.com' });
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-app-key');
    });

    it('should resolve and set user if token is valid (API mode)', async () => {
      config.mode = 'api';
      req.headers['x-auth-token'] = 'valid-token';

      (jwt.verify as jest.Mock).mockReturnValue({
        id: 1,
        email: 'test@example.com',
      });

      await expect(Auth.any(req, res)).resolves.toBeUndefined();
      expect(req.user).toEqual({ id: 1, email: 'test@example.com' });
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-app-key');
    });

    it('should resolve even if token is invalid', async () => {
      config.mode = 'web';
      req.cookies!.authToken = 'invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(Auth.any(req, res)).resolves.toBeUndefined();
      expect(req.user).toBeUndefined();
    });

    it('should log error if token is invalid and env is dev', async () => {
      config.mode = 'web';
      config.env = 'dev';
      req.cookies.authToken = 'invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(Auth.any(req, res)).resolves.toBeUndefined();

      expect(console.log).toHaveBeenCalledWith(new Error('Invalid token'));
    });

    it('should not log error if env is not dev', async () => {
      config.mode = 'web';
      config.env = 'pro';
      req.cookies.authToken = 'invalid-token';

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(Auth.any(req, res)).resolves.toBeUndefined();

      expect(console.log).not.toHaveBeenCalled();
    });

    it('should handle req.cookies', async () => {
      config.mode = 'web';
      req.cookies = undefined;

      await expect(Auth.any(req, res)).resolves.toBeUndefined();
    });
  });

  describe('break', () => {
    let options: any;

    beforeEach(() => {
      options = { mailer: jest.fn() };
    });

    it('should return an instance of Auth', () => {
      const instance = Auth.break(options);
      expect(instance).toBeInstanceOf(Auth);
    });

    it('should bind instance methods correctly', () => {
      const instance = Auth.break(options);

      expect(instance.register).toBeInstanceOf(Function);
      expect(instance.login).toBeInstanceOf(Function);
      expect(instance.logout).toBeInstanceOf(Function);
      expect(instance.mail).toBeInstanceOf(Function);
      expect(instance.reset).toBeInstanceOf(Function);
    });
  });
});
