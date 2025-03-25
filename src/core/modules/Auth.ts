import { Form } from './Form';
import { Request } from './Request';
import { CookieOptions, Response } from './Response';
import { render } from '../template/Component';
import { Controller } from './Controller';
import { createHash, randomBytes } from 'crypto';
import { isFalse, isInt, isPassword, isStr, UTC } from '../../helpers';
import { isEmail, isFunc, isObj } from '../../helpers';
import { config } from '../../config';
import { ForbiddenError, BadRequestError } from '../../errors';
import { appKey } from './App';
import { ref } from '..';

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * A mailer function used for sending emails.
 *
 * @template R - The return type of the mailer function (default is `any`).
 * @param to - The recipient's email address.
 * @param subject - The subject of the email.
 * @param html - The HTML content of the email.
 * @param text - (Optional) The plain text version of the email.
 * @returns A promise resolving to the result of the mailer function.
 */
export type Mailer<R = any> = (
  to: string,
  subject: string,
  html: string,
  text?: string
) => Promise<R>;

/**
 * Error messages for authentication validation.
 */
export type AuthMessages = {
  /** Invalid email format. */
  invalidEmail?: string;

  /** Email exceeds the maximum allowed length. */
  longEmail?: string;

  /** Password is too short. */
  shortPassword?: string;

  /** Password exceeds the maximum allowed length. */
  longPassword?: string;

  /** Password is too weak. */
  weakPassword?: string;

  /** The provided email is already taken. */
  emailTaken?: string;

  /** User not found in the system. */
  userNotFound?: string;
};

/**
 * Authentication options for configuring the Auth class.
 */
export type AuthOptions = {
  /**
   * Form validation error messages. Provide your own for localization.
   */
  messages?: AuthMessages;

  /**
   * Cookie options for the authToken cookie.
   */
  cookie?: CookieOptions;

  /**
   * The column name for the creation timestamp in your users table.
   */
  createdAt?: string | false;

  /**
   * The column name for the update timestamp in your users table.
   */
  updatedAt?: string | false;

  /**
   * The base path for your password reset link.
   * Default: "password-reset" (final link will be "password-reset/:token").
   */
  base?: string;

  /**
   * The name of your password reset component view.
   * Default: "emails.reset_email" (stored in `views/email/reset_email.fx`).
   * You can modify or replace this with another component using dot notation.
   */
  component?: string;

  /**
   * The JWT expiration time in **seconds**.
   */
  expires?: number;

  /**
   * The email subject for the password reset email.
   * Default: "Password Reset Link".
   */
  subject?: string;

  /**
   * Determines whether the user should be logged in automatically after registration.
   * - `smart`: Automatically logs in the user.
   * - `lazy`: Requires the user to log in manually after registration.
   */
  mode?: string;

  /**
   * A mailer function required for password reset.
   * Used to send the password reset email.
   * You can use Nodemailer or any other mailing solution.
   */
  mailer: Mailer;
};

/**
 * Custom error class for authentication-related errors.
 */
export class AuthError extends Error {}

/**
 * Token based authentication controller for the Bnjsx framework.
 *
 * Handles user authentication, including login, registration,
 * password reset.
 */
export class Auth extends Controller {
  /**
   * Form instance for handling authentication-related form data.
   */
  public form = new Form();

  /**
   * Mailer function for sending emails, required for password reset functionality.
   */
  private mailer: Mailer;

  /**
   * Base path for password reset links. Defaults to "password-reset".
   */
  private base: string = 'password-reset';

  /**
   * Column name for the user creation timestamp in the database. Defaults to "created_at".
   */
  private createdAt: string | false = 'created_at';

  /**
   * Column name for the user update timestamp in the database. Defaults to "updated_at".
   */
  private updatedAt: string | false = 'updated_at';

  /**
   * Subject of the password reset email. Defaults to "Password Reset Link".
   */
  private subject: string = 'Password Reset Link';

  /**
   * Expiration time for the authentication token in seconds. Defaults to 1 day (86400 seconds).
   */
  private expires: number = 24 * 60 * 60; // 1 day in seconds

  /**
   * Name of the email component used for password reset. Defaults to "emails.reset_email".
   */
  private component: string = 'emails.reset_email';

  /**
   * Determines whether the user should be logged in automatically after registration.
   * - `smart`: Automatically logs in the user.
   * - `lazy`: Requires the user to log in manually after registration.
   */
  private mode: string = 'lazy';

  /**
   * Cookie options for storing authentication tokens securely.
   */
  private cookie: CookieOptions = {
    httpOnly: true,
    secure: this.config.env === 'pro',
    sameSite: 'Strict',
    maxAge: 24 * 60 * 60, // 1 day in seconds
    path: '/',
    priority: 'High',
  };

  /**
   * Default validation messages for authentication-related errors.
   */
  private messages: AuthMessages = {
    invalidEmail: 'Invalid email address.',
    longEmail: 'Email address must not exceed 254 characters.',
    shortPassword: 'Password must be at least 8 characters long.',
    longPassword: 'Password must not exceed 20 characters.',
    weakPassword: 'Password must contain letters, numbers, and symbols.',
    emailTaken: 'This email is already registered.',
    userNotFound: 'Invalid email or password.',
  };

  /**
   * Initializes the authentication system with the provided options.
   *
   * @param options - Configuration options for authentication.
   * @throws  If the `mailer` function is not provided.
   */
  constructor(options: AuthOptions) {
    super();

    if (!isObj(options) || !isFunc(options.mailer)) {
      throw new AuthError('The mailer is required in password reset');
    }

    this.mailer = options.mailer;

    if (isObj(options.messages)) {
      Object.keys(options.messages).forEach((key) => {
        if (this.messages[key] && isStr(options.messages[key])) {
          this.messages[key] = options.messages[key];
        }
      });
    }

    if (isObj(options.cookie)) {
      this.cookie = options.cookie;
    }

    if (isStr(options.createdAt) || isFalse(options.createdAt)) {
      this.createdAt = options.createdAt;
    }

    if (isStr(options.updatedAt) || isFalse(options.updatedAt)) {
      this.updatedAt = options.updatedAt;
    }

    if (isStr(options.subject)) {
      this.subject = options.subject;
    }

    if (isStr(options.component)) {
      this.component = options.component;
    }

    if (isInt(options.expires)) {
      this.expires = options.expires;
    }

    if (isStr(options.base)) {
      this.base = options.base;
    }

    if (['lazy', 'smart'].includes(options.mode)) {
      this.mode = options.mode;
    }

    this.form.field(
      'email',
      {
        test: (email: string) => isEmail(email),
        message: this.messages.invalidEmail,
      },
      {
        test: (email: string) => email.length < 250,
        message: this.messages.longEmail,
      }
    );

    this.form.field(
      'password',
      {
        test: (passwrd: string) => passwrd.length >= 8,
        message: this.messages.shortPassword,
      },
      {
        test: (passwrd: string) => passwrd.length < 20,
        message: this.messages.longPassword,
      },
      {
        test: (passwrd: string) => isPassword(passwrd),
        message: this.messages.weakPassword,
      }
    );
  }

  /**
   * Registers a new user if the email is not already taken.
   *
   * **Requirements:**
   * - A `users` table must exist with `email` and `password` fields.
   *
   * **Behavior:**
   * - Checks if the email is already registered.
   * - Hashes the password before storing it in the database.
   * - If `createdAt` is defined, sets the creation timestamp.
   * - In `smart` mode:
   *   - Generates a JWT token upon successful registration.
   *   - In `web` mode, sets the token as an `authToken` cookie.
   *   - In `api` mode, the token is assigned to `req.authToken`, and must be handled manually.
   *
   * @param req - The request object.
   * @param res - The response object.
   * @throws `BadRequestError` If no fields are found in the request.
   * @returns Resolves when the registration process is complete.
   */
  public async register(req: Request, res: Response): Promise<void> {
    await this.form.parse(req, res);

    if (!req.fields) {
      throw new BadRequestError('No fields found for authentication.');
    }

    if (req.errors) return;

    const users = await this.builder((builder) =>
      builder
        .select()
        .from('users')
        .where((col) => col('email').equal(req.fields.email))
        .exec()
    );

    if (users[0]) {
      req.errors = { email: [this.messages.emailTaken] };
      return;
    }

    const hash = await bcrypt.hash(req.fields.password, 10);
    const row = { email: req.fields.email, password: hash };

    if (this.createdAt) {
      row[this.createdAt] = UTC.get.datetime();
    }

    await this.builder((builder) =>
      builder.insert().into('users').row(row).exec()
    );

    if (this.mode === 'smart') {
      // Create JWT token
      const token = jwt.sign({ email: req.fields.email }, appKey(), {
        expiresIn: this.expires,
      });

      // Set cookie for web
      if (this.config.mode === 'web') {
        res.cookie('authToken', token, this.cookie);
      }

      req.authToken = token;
    }
  }

  /**
   * Authenticates a user using email and password.
   *
   * **Requirements:**
   * - A `users` table must exist with `email` and `password` fields.
   *
   * **Behavior:**
   * - Verifies if the email exists in the database.
   * - Checks if the provided password matches the stored hash.
   * - Generates a JWT token after successful authentication.
   * - In `web` mode, sets the token as an `authToken` cookie.
   * - In `api` mode, the token is assigned to `req.authToken`, and must be handled manually.
   *
   * @param req - The request object.
   * @param res - The response object.
   * @throws `BadRequestError` If no fields are found in the request.
   * @returns Resolves when the login process is complete.
   */
  public async login(req: Request, res: Response): Promise<void> {
    await this.form.parse(req, res);

    if (!req.fields) {
      throw new BadRequestError('No fields found for authentication.');
    }

    if (req.errors) return;

    const user = await this.builder((builder) =>
      builder
        .select()
        .from('users')
        .where((col) => col('email').equal(req.fields.email))
        .first()
    );

    if (!user) {
      req.errors = { email: [this.messages.userNotFound] };
      return;
    }

    if (!(await bcrypt.compare(req.fields.password, user.password as string))) {
      req.errors = { email: [this.messages.userNotFound] };
      return;
    }

    // Create JWT token
    const token = jwt.sign({ email: user.email }, appKey(), {
      expiresIn: this.expires,
    });

    // Set JWT token cookie for web
    if (this.config.mode === 'web') {
      res.cookie('authToken', token, this.cookie);
    }

    req.authToken = token;
  }

  /**
   * Logs out the user by clearing the authentication cookie.
   *
   * **Requirements:**
   * - This method is only meant to be used in `web` mode.
   * - It should **not** be used in `api` mode since tokens are managed by the client.
   *
   * @param req - The request object.
   * @param res - The response object.
   * @returns Resolves when the logout process is complete.
   */
  public async logout(req: Request, res: Response): Promise<void> {
    if (this.config.mode === 'web') {
      res.clearCookie('authToken', this.cookie.path);
    }
  }

  /**
   * Sends a password reset email if the provided email exists in the database.
   *
   * **Requirements:**
   * - A `users` table must exist with `email` and `password` fields.
   * - A `reset_tokens` table must exist to store tokens and expiration times.
   * - A mailer function must be provided to handle email delivery.
   * - An email component must be located in the `views` folder.
   *   - A default component is available, but you can update it.
   *   - To use a custom component, set `this.component` to its path.
   *
   * **Behavior:**
   * - Generates a unique reset token and stores it in the database.
   * - Renders the email component with the reset link.
   * - Sends the email using the configured mailer function.
   *
   * @param req - The request object.
   * @param res - The response object.
   * @throws `BadRequestError` If no fields are found in the request.
   * @returns Resolves when the email is sent.
   */
  public async mail(req: Request, res: Response): Promise<void> {
    await this.form.parse(req, res);

    if (!req.fields) {
      throw new BadRequestError('No fields found for authentication.');
    }

    if (req.errors) return;

    const user = await this.builder((builder) =>
      builder
        .select()
        .from('users')
        .where((col) => col('email').equal(req.fields.email))
        .first()
    );

    // Just ignore the request if the email is wrong
    if (!user) return;

    const token = randomBytes(23).toString('hex');

    // Store a reset token for the email
    await this.builder((builder) =>
      builder
        .insert()
        .into('reset_tokens')
        .row({
          email: req.fields.email,
          token: createHash('sha256').update(token).digest('hex'),
          expires_at: UTC.future.minute(10),
        })
        .exec()
    );

    const link = `${req.protocol}://${req.host}:${req.port}/${this.base}/${token}`;
    const body = await render(this.component, { link });
    await this.mailer(req.fields.email, this.subject, body);
  }

  /**
   * Resets the user's password if the provided token is valid.
   *
   * **Requirements:**
   * - A `users` table must exist with `email` and `password` fields.
   * - A `reset_tokens` table must exist to store tokens and expiration times.
   * - The request must include a valid token as a URL parameter (`req.params.token`).
   *
   * **Behavior:**
   * - Verifies the token's validity and expiration time.
   * - Updates the user's password if the token is valid.
   * - Updates the `updatedAt` timestamp if `this.updatedAt` is set.
   *
   * @param req - The request object.
   * @param res - The response object.
   * @throws `BadRequestError` If no fields are found in the request.
   * @throws `BadRequestError` If the token is missing, invalid, or expired.
   * @returns Resolves when the password is successfully reset.
   */
  public async reset(req: Request, res: Response): Promise<void> {
    await this.form.parse(req, res);

    if (!req.fields) {
      throw new BadRequestError('No fields found for authentication.');
    }

    if (!req.params.token) {
      throw new BadRequestError('Invalid or expired token.');
    }

    if (req.errors) return;

    const token = createHash('sha256').update(req.params.token).digest('hex');

    const user = await this.builder((builder) =>
      builder
        .select()
        .from('reset_tokens')
        .join('users', (col) =>
          col('users.email').equal(ref('reset_tokens.email'))
        )
        .where((col) => col('reset_tokens.token').equal(token))
        .and()
        .where((col) =>
          col('reset_tokens.expires_at').greaterThan(UTC.get.datetime())
        )
        .first()
    );

    if (!user) {
      throw new BadRequestError('Invalid or expired token.');
    }

    const hash = await bcrypt.hash(req.fields.password, 10);
    const row = { password: hash };

    if (this.updatedAt) {
      row[this.updatedAt] = UTC.get.datetime();
    }

    await this.builder((builder) =>
      builder
        .update()
        .table('users')
        .set(row)
        .where((col) => col('email').equal(user.email))
        .exec()
    );
  }

  /**
   * Ensures the user is authenticated before accessing the route.
   *
   * **Behavior:**
   * - Expects an `authToken` cookie for `web` mode.
   * - Expects an `x-auth-token` headers for `api` mode.
   * - If a valid token is found, it decodes and attaches the user data to `req.user`.
   * - Rejects the request if the token is missing or invalid.
   *
   * **Errors:**
   * - Throws `ForbiddenError` if the authentication token is missing.
   * - Throws `ForbiddenError` if the token is expired or invalid.
   *
   * @param req - The request object.
   * @param res - The response object.
   * @returns Resolves when authentication is successful.
   */
  public static auth(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      const token =
        config().loadSync().mode === 'web'
          ? req.cookies?.authToken
          : req.headers['x-auth-token'];

      if (!isStr(token)) {
        return reject(
          new ForbiddenError('This route requires authentication.')
        );
      }

      try {
        req.user = jwt.verify(token, appKey());
        return resolve();
      } catch (error) {
        if (config().loadSync().env === 'dev') {
          console.log(error);
        }

        return reject(new ForbiddenError('Authentication token has expired.'));
      }
    });
  }

  /**
   * Ensures the user is **not** authenticated before accessing the route.
   *
   * **Behavior:**
   * - Allows access only if no authentication token is found.
   * - If a token is found, rejects the request.
   *
   * **Errors:**
   * - Throws `ForbiddenError` if the user is already authenticated.
   *
   * @param req - The request object.
   * @param res - The response object.
   * @returns Resolves for guests, rejects for authenticated users.
   */
  public static guest(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      const token =
        config().loadSync().mode === 'web'
          ? req.cookies?.authToken
          : req.headers['x-auth-token'];

      if (!isStr(token)) return resolve();
      return reject(
        new ForbiddenError('This route restricted to guests only.')
      );
    });
  }

  /**
   * Allows access to both authenticated and unauthenticated users.
   *
   * **Behavior:**
   * - If a valid authentication token is found, it decodes and attaches the user data to `req.user`.
   * - If no token is found, the request proceeds without authentication.
   * - If an invalid token is found, the request proceeds without attaching user data.
   *
   * @param req - The request object.
   * @param res - The response object.
   * @returns Resolves in all cases.
   */
  public static any(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      const token =
        config().loadSync().mode === 'web'
          ? req.cookies?.authToken
          : req.headers['x-auth-token'];

      if (!isStr(token)) return resolve();

      try {
        req.user = jwt.verify(token, appKey());
        return resolve();
      } catch (error) {
        if (config().loadSync().env === 'dev') {
          console.log(error);
        }

        return resolve();
      }
    });
  }

  /**
   * Creates a new `Auth` instance and binds its methods.
   *
   * **Behavior:**
   * - Instantiates the `Auth` class with the provided options.
   * - Binds methods (`register`, `login`, `logout`, `mail`, `reset`) to the instance.
   *
   * @param options - The authentication configuration options.
   * @returns A new `Auth` instance.
   */
  public static break(options: AuthOptions): Auth {
    const instance = new Auth(options);

    instance.register = instance.register.bind(instance);
    instance.login = instance.login.bind(instance);
    instance.logout = instance.logout.bind(instance);
    instance.mail = instance.mail.bind(instance);
    instance.reset = instance.reset.bind(instance);

    return instance;
  }
}
