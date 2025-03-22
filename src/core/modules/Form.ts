import { extname, isAbsolute, resolve as resolver } from 'path';
import {
  isArrOfStr,
  isBool,
  isEmptyArr,
  isEmptyStr,
  toSize,
} from '../../helpers';
import { isArr, isFunc, isInt, isObj, isStr } from '../../helpers';
import { createWriteStream, WriteStream } from 'fs';
import { Request } from './Request';
import { Response } from './Response';
import { randomUUID } from 'crypto';
import { config } from '../../config';
import { unlink } from 'fs/promises';
import { BadRequestError } from '../../errors';
import busboy, { Busboy } from 'busboy';

/** One Kilobyte (KB) is equal to 1024 bytes. */
export const KB = 1024; // Kilobyte

/** One Megabyte (MB) is equal to 1024 Kilobytes (1,048,576 bytes). */
export const MB = 1024 * 1024; // Megabyte

/** One Gigabyte (GB) is equal to 1024 Megabytes (1,073,741,824 bytes). */
export const GB = 1024 * 1024 * 1024; // Gigabyte

/** One Terabyte (TB) is equal to 1024 Gigabytes (1,099,511,627,776 bytes). */
export const TB = 1024 * 1024 * 1024 * 1024; // Terabyte

/**
 * Defines the options for file validation and storage.
 *
 * This interface allows you to configure file validation rules, such as the
 * expected number of files, size limits, accepted types, required status,
 * and storage location. It also provides customizable error messages, which
 * are useful for applications that support multiple languages.
 */
export interface FileOptions {
  /**
   * The maximum number of files allowed.
   */
  count?: number;

  /**
   * The allowed size range for files, defined in bytes.
   * - `min`: The minimum file size allowed.
   * - `max`: The maximum file size allowed.
   */
  size?: { min?: number; max?: number };

  /**
   * An array of allowed file MIME types.
   */
  type?: Array<string>;

  /**
   * Specifies whether the file is required.
   * If `true`, the user must upload a file.
   */
  required?: boolean;

  /**
   * The absolute path where the uploaded file should be stored.
   */
  location?: string;

  /**
   * Custom error messages for validation failures.
   * Allows you to define localized or user-friendly error messages.
   */
  messages?: {
    /**
     * Error message when the uploaded file count exceeds the allowed limit.
     */
    count?: string;

    /**
     * Error message when the uploaded file type is not allowed.
     */
    type?: string;

    /**
     * Error messages related to file size constraints.
     * - `min`: Error message when the file is too small.
     * - `max`: Error message when the file is too large.
     */
    size?: { min?: string; max?: string };

    /**
     * Error message when a required file is missing.
     */
    required?: string;
  };
}

/**
 * Represents a validation rule for form fields.
 *
 * The `test` function is used to validate a field value, returning `true` if
 * the value passes and `false` otherwise. If validation fails, the `message`
 * provides the corresponding error message.
 */
export interface Tester {
  /**
   * Function to test the validity of a field value.
   *
   * - Returns `true` if the test passes, meaning the value is valid.
   * - Returns `false` if the test fails, meaning the value is invalid.
   */
  test: (value: string) => boolean;

  /** Error message to display if validation fails. */
  message: string;
}

/**
 * Represents the properties of an uploaded file after validation.
 *
 * This type contains essential details about an uploaded file, including its
 * size, MIME type, storage path, and original name.
 */
export interface File {
  /** File size in bytes after validation. */
  size: number;

  /** MIME type of the validated file. */
  type: string;

  /** Absolute path where the validated file is stored. */
  path: string;

  /** Original name of the uploaded file. */
  name: string;
}

/**
 * Defines the mode for handling unexpected files and fields during file upload.
 *
 * - `strict`  - Rejects any unexpected files and fields.
 * - `strong`  - Rejects unexpected files but allows unexpected fields.
 * - `ignore`  - Ignores unexpected files and fields.
 */
export type Mode = 'strict' | 'strong' | 'ignore';

/**
 * Represents an error related to form processing.
 */
export class FormError extends Error {}

/**
 * Represents a form handler for processing file uploads and field validations.
 *
 * The Form class manages the configuration and processing of files and fields,
 * allowing you to specify how unexpected files and fields should be handled
 * during the upload process. It supports different modes for validation and
 * error handling.
 */
export class Form {
  /**
   * The mode of the form, determining how to handle unexpected files and fields.
   * - `strict`: Reject unexpected files and fields.
   * - `strong`: Reject unexpected files.
   * - `ignore`: Ignore unexpected files and fields.
   */
  private mode: Mode = 'strong';

  /**
   * A record of file options for each expected file field.
   */
  private files: Record<string, FileOptions> = {};

  /**
   * A record of validators for each field, where each field can have multiple tests.
   */
  private fields: Record<string, Array<Tester>> = {};

  /**
   * A record to track the count of expected files for each field.
   */
  private count: Record<string, number> = {};

  /**
   * An array of writable streams for handling file uploads.
   */
  private streams: Array<WriteStream> = [];

  /**
   * A flag indicating if there was an issue during the upload process.
   */
  private issue: boolean = false;

  /**
   * The Busboy instance used for parsing incoming form data.
   */
  private bb: Busboy;

  /**
   * The incoming request object.
   */
  private req: Request;

  /**
   * The response object for sending responses back to the client.
   */
  private res: Response;

  /**
   * Creates a new instance of the Form class with an optional mode.
   *
   * @param mode - The mode of the form, which can be: `strict` or `strong` or `ignore`.
   * @throws `FormError` if the provided mode is invalid.
   */
  constructor(mode?: Mode) {
    if (mode) {
      if (!['strict', 'strong', 'ignore'].includes(mode)) {
        throw new FormError('Invalid form mode');
      }

      this.mode = mode;
    }
  }

  /**
   * Adds an error message for a specific field or file.
   *
   * @param name - The name of the field or file.
   * @param messages - The error messages to add.
   */
  private addError(name: string, ...messages: string[]): void {
    if (!this.req.errors) this.req.errors = {};
    if (!this.req.errors[name]) this.req.errors[name] = [];
    this.req.errors[name].push(...messages);
  }

  /**
   * Stores file data in the request body.
   *
   * @param name - The name of the file field.
   * @param data - The file object containing size, type, path, and name.
   */
  private addFile(name: string, data: File): void {
    if (!this.req.body) this.req.body = {};

    if (isObj(this.req.body[name])) {
      const arr = new Array(this.req.body[name], data);
      return (this.req.body[name] = arr), undefined;
    }

    if (isArr(this.req.body[name])) {
      return this.req.body[name].push(data), undefined;
    }

    this.req.body[name] = data;
  }

  /**
   * Stores field data in the request body.
   *
   * @param name - The name of the field.
   * @param value - The field value.
   */
  private addField(name: string, value: string | undefined): void {
    if (!this.req.body) this.req.body = {};

    if (isEmptyStr(value)) value = undefined;

    if (isStr(this.req.body[name])) {
      const arr = new Array(this.req.body[name], value);
      return (this.req.body[name] = arr), undefined;
    }

    if (isArr(this.req.body[name])) {
      return this.req.body[name].push(value), undefined;
    }

    this.req.body[name] = value;
  }

  /**
   * Parses the incoming request data as URL-encoded form data.
   *
   * This method listens for 'data' events from the request stream, accumulating
   * incoming chunks of data until the 'end' event is emitted. Once all data is
   * received, it processes the parameters using `URLSearchParams`. For each parameter,
   * it checks against defined fields, applying validation tests and collecting error
   * messages if any tests fail.
   *
   * In `strict` mode, any unexpected field will result in a `BadRequestError`. In
   * `ignore` mode, unexpected fields are simply skipped.
   *
   * @returns A promise that resolves when parsing is complete.
   * @throws `BadRequestError` if an unexpected field is encountered in `strict` mode.
   */
  private encoded(): Promise<void> {
    return new Promise((resolve, reject) => {
      const chunks = [];

      this.req.on('data', (chunk) => chunks.push(chunk));
      this.req.on('end', () => {
        return resolve(
          new Promise((resolve) => {
            const data = Buffer.concat(chunks).toString('utf-8');
            const params = new URLSearchParams(data);

            for (const [key, value] of params.entries()) {
              if (!this.fields[key]) {
                if (this.mode === 'strict') {
                  this.issue = true;
                  throw new BadRequestError(`Unexpected field '${key}'`);
                }

                // Ignore unexpected fields
                if (this.mode === 'ignore') continue;
              }

              const messages = new Array();

              this.fields[key].forEach((tester) => {
                if (!tester.test(value)) messages.push(tester.message);
              });

              if (isEmptyArr(messages)) this.addField(key, value);
              else this.addError(key, ...messages);
            }

            resolve();
          })
        );
      });
    });
  }

  /**
   * Parses and validates multipart form data using Busboy.
   *
   * This method handles both fields and files, applying validation rules.
   * - Field validation: Ensures expected fields exist and pass all test functions.
   * - File validation: Checks for expected files, required status, count limits, type restrictions, and size constraints.
   * - Error handling: Rejects the promise if an issue occurs (e.g., unexpected fields/files).
   * - Cleanup: Deletes partially processed files if an error occurs.
   *
   * @returns
   * - Resolves when parsing is complete and all fields/files are validated.
   * - Rejects on unexpected fields/files (in strict/strong mode) or any error during processing.
   */
  private multipart(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.bb = busboy({ headers: this.req.headers });

      this.bb.on(
        'error',
        (e) => !this.issue && ((this.issue = true), reject(e))
      );

      this.bb.on('close', () => !this.issue && resolve());

      this.res.on('finish', () => {
        if (this.issue) {
          this.streams.forEach((stream) => {
            try {
              stream.destroy();
              unlink(stream.path).catch(
                (e) => config().loadSync().env !== 'pro' && console.log(e)
              );
            } catch (e) {
              config().loadSync().env !== 'pro' && console.log(e);
            }
          });
        }
      });

      this.bb.on('field', (name, value) => {
        if (!this.fields[name]) {
          if (this.mode === 'strict') {
            this.issue = true;
            return reject(new BadRequestError(`Unexpected field '${name}'`));
          }

          // Ignore unexpected fields
          if (this.mode === 'ignore') return;
        }

        const messages = new Array();

        this.fields[name].forEach((tester) => {
          if (!tester.test(value)) messages.push(tester.message);
        });

        if (isEmptyArr(messages)) this.addField(name, value);
        else this.addError(name, ...messages);
      });

      this.bb.on('file', (name, readStream, { mimeType, filename }) => {
        readStream.on(
          'error',
          (e) => !this.issue && ((this.issue = true), reject(e))
        );

        if (this.issue) return readStream.resume();

        // Expected Check
        if (!this.files[name]) {
          if (this.mode === 'strict' || this.mode === 'strong') {
            this.issue = true;
            readStream.resume();
            return reject(new BadRequestError(`Unexpected file '${name}'`));
          }

          if (this.mode === 'ignore') return readStream.resume();
        }

        // Required Check
        if (!filename) {
          if (this.files[name].required) {
            this.issue = true;
            this.addError(name, this.files[name].messages.required);
            return readStream.resume(), resolve();
          }

          readStream.resume();
          return this.addFile(name, undefined);
        }

        if (this.count[name]) this.count[name]++;
        else this.count[name] = 1;

        // Count Check
        if (this.count[name] > this.files[name].count) {
          this.issue = true;
          this.addError(name, this.files[name].messages.count);
          return readStream.resume(), resolve();
        }

        // Type Check
        if (this.files[name].type.length !== 0) {
          if (!this.files[name].type.includes(mimeType)) {
            this.issue = true;
            this.addError(name, this.files[name].messages.type);
            return readStream.resume(), resolve();
          }
        }

        const random = randomUUID().concat(extname(filename));
        const path = resolver(this.files[name].location, random);
        const writeStream = createWriteStream(path);

        this.streams.push(writeStream);

        writeStream.on(
          'error',
          (e) => !this.issue && ((this.issue = true), reject(e))
        );

        let size = 0;

        readStream.on('data', (chunk: Buffer) => {
          if (!this.issue) {
            size += chunk.length;

            if (size > this.files[name].size.max) {
              this.issue = true;
              this.addError(name, this.files[name].messages.size.max);
              return readStream.resume(), resolve();
            }
          }
        });

        readStream.on('end', () => {
          if (!this.issue) {
            if (size < this.files[name].size.min) {
              this.issue = true;
              this.addError(name, this.files[name].messages.size.min);
              return readStream.resume(), resolve();
            }

            this.addFile(name, { name: filename, path, size, type: mimeType });
          }
        });

        readStream.pipe(writeStream);
      });

      this.req.pipe(this.bb);
    });
  }

  /**
   * Middleware for parsing form data and file uploads.
   *
   * - Supports both `application/x-www-form-urlencoded` and `multipart/form-data`.
   * - Validates fields and files according to predefined rules.
   *
   * @param req - The incoming HTTP request.
   * @param res - The HTTP response object.
   * @returns A promise that resolves when parsing is complete.
   */
  public parse(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      const header = req.getHeader('content-type') || '';

      this.res = res;
      this.req = req;

      if (header.includes('application/x-www-form-urlencoded')) {
        return resolve(this.encoded());
      }

      if (header.includes('multipart/form-data')) {
        return resolve(this.multipart());
      }

      return resolve();
    });
  }

  /**
   * Registers a file input with validation rules.
   *
   * This method allows defining the expected properties for an uploaded file,
   * including its type, size constraints, location, and validation messages.
   *
   * @param name - The name of the file field.
   * @param options - The validation options for the file upload.
   *
   * @throws `FormError` if `name` is not a string.
   * @throws `FormError` if `options` is not an object.
   * @throws `FormError` if `options.type` is not an array of strings.
   * @throws `FormError` if `options.count` is not a positive integer.
   * @throws `FormError` if `options.size` is not an object with valid `min` and `max` values.
   * @throws `FormError` if `options.required` is not a boolean.
   * @throws `FormError` if `options.location` is not an absolute string path.
   * @throws `FormError` if `options.messages` is not a valid object.
   */
  public file(name: string, options: FileOptions = {}): void {
    if (!isStr(name)) throw new FormError('Invalid file name');
    if (!isObj(options)) throw new FormError('Invalid file options');

    if (options.type) {
      if (!isArrOfStr(options.type)) {
        throw new FormError('Invalid file type');
      }
    } else options.type = [];

    if (options.count) {
      if (!isInt(options.count) || options.count <= 0) {
        throw new FormError('Invalid file count');
      }
    } else options.count = Number.MAX_SAFE_INTEGER;

    if (options.size) {
      if (!isObj(options.size)) throw new FormError('Invalid file size');

      const { min, max } = options.size;

      if (!isInt(min)) {
        throw new FormError('Invalid minimum file size');
      }
      if (!isInt(max)) {
        throw new FormError('Invalid maximum file size');
      }
      if (min > max) {
        throw new FormError('File size min cannot be greater than max');
      }
    } else options.size = { min: 0, max: Number.MAX_SAFE_INTEGER };

    if (options.required) {
      if (!isBool(options.required)) {
        throw new FormError('Invalid required flag');
      }
    } else options.required = false;

    if (options.location) {
      if (!isStr(options.location)) {
        throw new FormError('Invalid file location');
      }
      if (!isAbsolute(options.location)) {
        throw new FormError('File location path must be absolute');
      }
    } else options.location = resolver(config().resolveSync(), './uploads');

    if (options.messages) {
      if (!isObj(options.messages)) {
        throw new FormError('Invalid messages object');
      }

      if (options.messages.count) {
        if (!isStr(options.messages.count)) {
          throw new FormError('Invalid count message');
        }
      } else {
        options.messages.count = `Too many files. Maximum allowed is ${options.count}.`;
      }

      if (options.messages.required) {
        if (!isStr(options.messages.required)) {
          throw new FormError('Invalid required message');
        }
      } else options.messages.required = `This field is required.`;

      if (options.messages.type) {
        if (!isStr(options.messages.type)) {
          throw new FormError('Invalid type message');
        }
      } else options.messages.type = `File must be ${options.type.join(', ')}.`;

      if (options.messages.size) {
        if (!isObj(options.messages.size)) {
          throw new FormError('Invalid size message object');
        }

        if (options.messages.size.min && !isStr(options.messages.size.min)) {
          throw new FormError('Invalid min size message');
        }

        if (options.messages.size.max && !isStr(options.messages.size.max)) {
          throw new FormError('Invalid max size message');
        }
      } else {
        options.messages.size = {
          min: `File must be at least ${toSize(options.size.min)}.`,
          max: `File must not exceed ${toSize(options.size.max)}.`,
        };
      }
    } else {
      options.messages = {
        count: `Too many files. Maximum allowed is ${options.count}.`,
        required: `This field is required.`,
        type: `File must be ${options.type.join(', ')}.`,
        size: {
          min: `File must be at least ${toSize(options.size.min)}.`,
          max: `File must not exceed ${toSize(options.size.max)}.`,
        },
      };
    }

    this.files[name] = options;
  }

  /**
   * Registers a field with validation testers.
   *
   * This method defines validation rules for a field, where each tester includes:
   * - `test`: A function to validate the field value.
   * - `message`: The error message to display if validation fails.
   *
   * @param name - The name of the field.
   * @param testers - An array of validation testers.
   *
   * @throws `FormError` if `name` is not a string.
   * @throws `FormError` if `tester.test` is not a function.
   * @throws `FormError` if `tester.message` is not a string.
   */
  public field(name: string, ...testers: Array<Tester>): void {
    if (!isStr(name)) throw new FormError('Invalid field name');

    testers.forEach((tester) => {
      if (!isObj(tester)) throw new FormError('Invalid field tester');
      if (!isFunc(tester.test)) throw new FormError('Invalid field test');
      if (!isStr(tester.message)) throw new FormError('Invalid field message');
    });

    this.fields[name] = testers;
  }
}
