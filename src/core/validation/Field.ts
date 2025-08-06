import { ValidatorError } from '../../errors';
import {
  isArr,
  isBool,
  isEmptyArr,
  isFloat,
  isFullArr,
  isFunc,
  isInt,
  isNum,
  isObj,
  isStr,
  format,
  isRegex,
} from '../../helpers';

import { Tester, TestFn } from '../modules/Form';
import { ArrayOptions } from './Entry';
import { ValidationMessages } from './Messages';

/**
 * Executes all registered validators (testers) for a specific field in the body.
 *
 * @param body - The input data object to validate.
 * @param state - The validation state, including the field name and its testers.
 * @returns An array of error messages from failed validations (empty if all pass).
 */
const run = (body: any, state: any): Array<string> => {
  if (!isObj(body)) body = {};

  const errors = [];

  for (const { test, message } of state.testers) {
    const value = body[state.name];
    if (!test(value, body)) errors.push(message);
  }

  return errors;
};

/**
 * A validation class for array fields, allowing rules like length, uniqueness, and item type checks.
 */
class ArrayField {
  /**
   * Creates a new ArrayField instance for validating an array input.
   *
   * @param state - Internal state containing the field name and its registered testers.
   * @param messages - Error message templates used for validation failures.
   * @param optional - Whether the field is optional (affects how required checks are handled).
   */
  constructor(
    private state: { name: string; testers: Tester[] },
    private messages: ValidationMessages,
    private optional: boolean
  ) {}

  /**
   * Registers a custom validation function.
   *
   * If the field is optional and the value is `null` or `undefined`,
   * the function will not be called and validation passes automatically.
   *
   * @param fn Validation function returning `true` if valid, `false` otherwise.
   * @param message Error message returned on failure.
   * @returns The Field instance for chaining.
   */
  public test(fn: TestFn, message: string): this {
    if (!isStr(message)) {
      throw new ValidatorError(`Invalid message: ${String(message)}`);
    }

    if (!isFunc(fn)) {
      throw new ValidatorError(`Invalid function: ${String(fn)}`);
    }

    const test = (value, body) => {
      if ((value === null || value === undefined) && this.optional) return true;
      if (isEmptyArr(value) && this.optional) return true;
      return fn(value, body);
    };

    this.state.testers.push({ test, message });
    return this;
  }

  /**
   * Passes if the array has at least the given number of items.
   *
   * @param length - Minimum number of elements required (defaults to `0` if invalid).
   * @param message - Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public min(length?: number, message?: string): this {
    if (!isInt(length)) length = 0;

    return this.test(
      (v) => isArr(v) && v.length >= length,
      message ??
        format(this.messages.array.min, { field: this.state.name, length })
    );
  }

  /**
   * Passes if the array has at most the given number of items.
   *
   * @param length - Maximum number of elements allowed (defaults to `Number.MAX_SAFE_INTEGER` if invalid).
   * @param message - Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public max(length?: number, message?: string): this {
    if (!isInt(length)) length = Number.MAX_SAFE_INTEGER;

    return this.test(
      (v) => isArr(v) && v.length <= length,
      message ??
        format(this.messages.array.max, { field: this.state.name, length })
    );
  }

  /**
   * Passes if the array has exactly the given number of items.
   *
   * @param length - Exact number of elements required.
   * @param message - Optional custom error message.
   * @throws ValidatorError if `length` is not a valid integer.
   * @returns The Field instance for chaining.
   */
  public length(length?: number, message?: string): this {
    if (!isInt(length)) {
      throw new ValidatorError(`Invalid array length: ${String(length)}`);
    }

    return this.test(
      (v) => isArr(v) && v.length === length,
      message ??
        format(this.messages.array.length, { field: this.state.name, length })
    );
  }

  /**
   * Passes if the array includes the specified value.
   *
   * @param value - The value that must be included in the array.
   * @param message - Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public includes(value: any, message?: string): this {
    return this.test((v) => {
      return isFullArr(v) && v.includes(value);
    }, message ?? format(this.messages.array.includes, { field: this.state.name, value }));
  }

  /**
   * Passes if all items in the array are unique.
   *
   * @param message - Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public unique(message?: string): this {
    return this.test((v) => {
      return isFullArr(v) && new Set(v).size === v.length;
    }, message ?? format(this.messages.array.unique, { field: this.state.name }));
  }

  /**
   * Passes if every item in the array is a string and not a number.
   *
   * @param message - Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public ofString(message?: string): this {
    return this.test((v) => {
      return isFullArr(v) && v.every((i) => isStr(i) && isNaN(Number(i)));
    }, message ?? format(this.messages.array.ofString, { field: this.state.name }));
  }

  /**
   * Passes if every item is a number or a string that can be converted to a number.
   *
   * @param message - Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public ofNumber(message?: string): this {
    return this.test(
      (v) =>
        isFullArr(v) &&
        v.every(
          (i) => isNum(i) || (isStr(i) && i.trim() !== '' && !isNaN(Number(i)))
        ),
      message ??
        format(this.messages.array.ofNumber, { field: this.state.name })
    );
  }

  /**
   * Passes if every item is a positive integer (number or string).
   *
   * @param message - Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public ofIds(message?: string): this {
    return this.test(
      (v) =>
        isFullArr(v) &&
        v.every(
          (i) => (isNum(i) && i > 0) || (isStr(i) && /^[1-9][0-9]*$/.test(i))
        ),
      message ?? format(this.messages.array.ofIds, { field: this.state.name })
    );
  }

  /**
   * Passes if every item is non-null, non-undefined, and has a non-empty string representation.
   *
   * @param message - Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public ofItems(message?: string): this {
    return this.test(
      (v) =>
        isFullArr(v) &&
        v.every(
          (i) => i !== null && i !== undefined && i.toString().trim().length > 0
        ),
      message ??
        format(this.messages.array.notEmpty, { field: this.state.name })
    );
  }

  /**
   * Passes if **at least one** item in the array satisfies the given test function.
   *
   * @param test - A predicate function that takes an item and returns `true` if it passes.
   * @param message - Optional custom error message to return if validation fails.
   * @returns The Field instance for chaining.
   */
  public some(test: (item: any, body: any) => boolean, message?: string): this {
    return this.test((v, b) => {
      return isFullArr(v) && isFunc(test) && v.some((i) => test(i, b));
    }, message ?? format(this.messages.array.some, { field: this.state.name }));
  }

  /**
   * Passes if **none** of the items in the array satisfy the given test function.
   *
   * @param test - A predicate function that takes an item and returns `true` if it matches.
   * @param message - Optional custom error message to return if validation fails.
   * @returns The Field instance for chaining.
   */
  public none(test: (item: any, body: any) => boolean, message?: string): this {
    return this.test((v, b) => {
      return isFullArr(v) && isFunc(test) && !v.some((i) => test(i, b));
    }, message ?? format(this.messages.array.none, { field: this.state.name }));
  }

  /**
   * Passes if **all** items in the array satisfy the given test function.
   *
   * @param test - A predicate function that takes an item and returns `true` if it passes.
   * @param message - Optional custom error message to return if validation fails.
   * @returns The Field instance for chaining.
   */
  public all(test: (item: any, body: any) => boolean, message?: string): this {
    return this.test((v, b) => {
      return isFullArr(v) && isFunc(test) && v.every((i) => test(i, b));
    }, message ?? format(this.messages.array.all, { field: this.state.name }));
  }

  /**
   * Joins an array into a string using the specified separator.
   * This mutates the validated body, replacing the array with the joined string.
   *
   * @param sep - The separator to use. Defaults to ','.
   * @returns This field instance.
   */
  public join(sep: string = ','): this {
    if (!isStr(sep)) sep = ',';

    const message = 'join';
    const test = (value, body) => {
      if (isArr(value)) {
        body[this.state.name] = value.join(sep);
        return true;
      }

      body[this.state.name] = '';
      return true;
    };

    this.state.testers.push({ test, message });
    return this;
  }

  /**
   * Runs all validation tests for this field.
   *
   * @param body The data object to validate against.
   * @returns A list of error messages, or an empty array if all tests pass.
   */
  public run(body?: Record<string, any>): Array<string> {
    return run(body, this.state);
  }
}

/**
 * A field validator that provides chainable validation methods
 * for strings, numbers, and general value constraints.
 */
export class Field {
  /**
   * Collection of error messages for all validation rules.
   */
  private messages: ValidationMessages;

  /**
   * Internal state containing the field name and registered test functions.
   */
  private state = {
    /**
     * The name of the field being validated.
     */
    name: null as string,

    /**
     * Array of test functions used to validate the field's value.
     */
    testers: [] as Tester[],
  };

  /**
   * Indicates whether the field is optional.
   * If true, null or undefined values skip validation.
   */
  private optional = true;

  /**
   * Whether to trim the input value before applying certain validations.
   * This affects validations like `min()`, `max()`, and `length()`.
   */
  private shouldTrim = false;

  /**
   * Creates a new ValidationField instance.
   *
   * @param name - The name of the field being validated.
   * @param messages - Error message templates for this field.
   */
  constructor(name: string, messages: ValidationMessages) {
    if (!isStr(name)) {
      throw new ValidatorError(`Invalid field name: ${String(name)}`);
    }

    if (!isObj(messages)) {
      throw new ValidatorError(`Invalid field messages: ${String(messages)}`);
    }

    this.state.name = name;
    this.messages = messages;
  }

  /**
   * Ensures the field value is an array, with options to cast strings to arrays.
   *
   * @param options Optional settings:
   *  - `force` — Wraps a non-array value in an array (e.g. `value` → `[value]`).
   *  - `cast` — Converts a comma-separated string into an array.
   *  - `sep` — Separator string used when casting (default: `','`).
   * @param message Optional custom error message.
   * @returns A new ArrayField instance for chaining array-specific validations.
   *
   */
  public array(
    options?: ArrayOptions & { force?: boolean },
    message?: string
  ): ArrayField {
    if (message && !isStr(message)) {
      throw new ValidatorError(`Invalid message: ${String(message)}`);
    }

    if (!isObj(options)) options = {};
    const cast = options.cast ?? false;
    const force = options.force ?? false;
    const sep = isStr(options.sep) ? options.sep : ',';

    const test = (v, body) => {
      if (force && !isArr(v)) {
        body[this.state.name] = v !== undefined && v !== null ? [v] : [];
        return true;
      }

      if (cast && isStr(v)) {
        body[this.state.name] = v.split(sep).map((s) => s.trim()) as any;
        return true;
      }

      return [null, undefined].includes(v) && this.optional ? true : isArr(v);
    };

    message =
      message || format(this.messages.array.type, { field: this.state.name });

    this.state.testers.push({ test, message });

    return new ArrayField(this.state, this.messages, this.optional);
  }

  /**
   * Enables trimming of the string value before length validations.
   *
   * When used, string values will be trimmed of whitespace before
   * applying `min()`, `max()`, or `length()` checks.
   *
   * Example: `'  ab  '` becomes `'ab'` before validation.
   *
   * @returns The Field instance for chaining.
   */
  public trim(): this {
    this.shouldTrim = true;
    return this;
  }

  /**
   * Registers a custom validation function.
   *
   * If the field is optional and the value is `null` or `undefined`,
   * the function will not be called and validation passes automatically.
   *
   * @param fn Validation function returning `true` if valid, `false` otherwise.
   * @param message Error message returned on failure.
   * @returns The Field instance for chaining.
   */
  public test(fn: TestFn, message: string): this {
    if (!isStr(message)) {
      throw new ValidatorError(`Invalid message: ${String(message)}`);
    }

    if (!isFunc(fn)) {
      throw new ValidatorError(`Invalid function: ${String(fn)}`);
    }

    const test = (value, body) => {
      if ((value === null || value === undefined) && this.optional) return true;
      return fn(value, body);
    };

    this.state.testers.push({ test, message });
    return this;
  }

  /**
   * Requires the field to be present and not empty.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public required(message?: string): this {
    this.optional = false;

    return this.test(
      (v) => v !== undefined && v !== null && v.toString().trim().length > 0,
      message ?? format(this.messages.required, { field: this.state.name })
    );
  }

  /**
   * Checks that the string length is at least the specified minimum.
   *
   * @param length Minimum required length.
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public min(length?: number, message?: string): this {
    if (!isInt(length)) length = 0;

    return this.test((v) => {
      if (!isStr(v)) return false;
      const val = this.shouldTrim ? v.trim() : v;
      return val.length >= length;
    }, message ?? format(this.messages.min, { field: this.state.name, length }));
  }

  /**
   * Checks that the string length does not exceed the specified maximum.
   *
   * @param length Maximum allowed length.
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public max(length?: number, message?: string): this {
    if (!isInt(length)) length = Number.MAX_SAFE_INTEGER;

    return this.test((v) => {
      if (!isStr(v)) return false;
      const val = this.shouldTrim ? v.trim() : v;
      return val.length <= length;
    }, message ?? format(this.messages.max, { field: this.state.name, length }));
  }

  /**
   * Checks that the string length is exactly the specified value.
   *
   * @param length Exact required length.
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public length(length: number, message?: string): this {
    if (!isInt(length)) {
      throw new ValidatorError(`Invalid length: ${String(length)}`);
    }

    return this.test((v) => {
      if (!isStr(v)) return false;
      const val = this.shouldTrim ? v.trim() : v;
      return val.length === length;
    }, message ?? format(this.messages.length, { field: this.state.name, length }));
  }

  /**
   * Checks if the string matches the given regular expression pattern.
   *
   * @param regex Regular expression to test.
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public is(regex: RegExp, message?: string): this {
    if (!isRegex(regex)) {
      throw new ValidatorError(`Invalid regex: ${String(regex)}`);
    }

    return this.test(
      (v) => isStr(v) && regex.test(v),
      message ?? format(this.messages.is, { field: this.state.name })
    );
  }

  /**
   * Checks if the string does NOT match the given regular expression pattern.
   *
   * @param regex Regular expression that must NOT match.
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public isNot(regex: RegExp, message?: string): this {
    if (!isRegex(regex)) {
      throw new ValidatorError(`Invalid regex: ${String(regex)}`);
    }

    return this.test(
      (v) => isStr(v) && !regex.test(v),
      message ?? format(this.messages.is, { field: this.state.name })
    );
  }

  /**
   * Ensures the value contains at least one lowercase letter (a–z).
   *
   * Commonly used in password or username validations to enforce complexity.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public hasLower(message?: string): this {
    return this.is(
      /[a-z]+/,
      message ?? format(this.messages.hasLower, { field: this.state.name })
    );
  }

  /**
   * Ensures the value contains at least one uppercase letter (A–Z).
   *
   * Useful for validating case-sensitive requirements like passwords.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public hasUpper(message?: string): this {
    return this.is(
      /[A-Z]+/,
      message ?? format(this.messages.hasUpper, { field: this.state.name })
    );
  }

  /**
   * Ensures the value contains at least one letter (uppercase or lowercase).
   *
   * This check passes if the value contains any `A–Z` or `a–z` characters.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public hasLetter(message?: string): this {
    return this.is(
      /[a-zA-Z]/,
      message ?? format(this.messages.hasLetter, { field: this.state.name })
    );
  }

  /**
   * Ensures the value contains at least one numeric digit (0–9).
   *
   * Useful for enforcing numeric presence in fields like passwords or IDs.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public hasNumber(message?: string): this {
    return this.is(
      /[0-9]/,
      message ?? format(this.messages.hasNumber, { field: this.state.name })
    );
  }

  /**
   * Ensures the value contains at least one special character.
   *
   * The allowed set includes: `!@#$%^&*()-_,.?":{}|<>`
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public hasSpecial(message?: string): this {
    return this.is(
      /[!@#$%^&*()\-_,.?":{}|<>]/,
      message ?? format(this.messages.hasSpecial, { field: this.state.name })
    );
  }

  /**
   * Ensures the value contains at least one whitespace character.
   *
   * This includes spaces, tabs, newlines, and other Unicode whitespace.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public hasSpace(message?: string): this {
    return this.is(
      /\s/,
      message ?? format(this.messages.hasSpace, { field: this.state.name })
    );
  }

  /**
   * Validates that the value is a valid email address,
   * and optionally enforces minimum and maximum length constraints.
   *
   * @param min - Minimum length of the email (default is 6).
   * @param max - Maximum length of the email (default is 254).
   * @param message - Optional custom error message for invalid email format.
   * @returns The Field instance for method chaining.
   */
  public email(min = 6, max = 254, message?: string): this {
    return this.min(min)
      .max(max)
      .is(
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message ?? format(this.messages.email, { field: this.state.name })
      );
  }

  /**
   * Validates a Unix-style absolute file path (must start with `/`).
   * Allows any characters except spaces, question marks, and hashes.
   * - Examples: `/home/user/file.txt`, `/var/www/index.html`.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public path(message?: string): this {
    return this.is(
      /^\/[^\s?#]*$/,
      message ?? format(this.messages.path, { field: this.state.name })
    );
  }

  /**
   * Validates a full URL starting with http or https.
   * Matches domain with subdomains, optional port, and optional path/query/hash.
   * - Examples: `https://example.com`, `http://sub.domain.com:8080/path?query=1#hash`.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public url(message?: string): this {
    return this.is(
      /^https?:\/\/[\w\-]+(\.[\w\-]+)+[\/#?]?.*$/i,
      message ?? format(this.messages.url, { field: this.state.name })
    );
  }

  /**
   * Validates a URL-style path (the part after the host).
   * Must start with `/`, optionally followed by any characters except spaces, hashes.
   * Optional query string allowed after `?`.
   * - Examples: `/home`, `/user?id=42`, `/api/data?page=1`.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public href(message?: string): this {
    return this.is(
      /^\/[^\s?#]*(\?[^#\s]*)?$/,
      message ?? format(this.messages.href, { field: this.state.name })
    );
  }

  /**
   * Validates a clean route path (no file extensions, no query strings).
   * Allows only letters, numbers, hyphens, and slashes.
   * Examples:
   * - Valid: `/users`, `/blog/posts/123`, `/api/v1/resources`
   * - Invalid: `/file.txt`, `/image.jpg?size=large`, `home/index.html`
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public route(message?: string): this {
    return this.is(
      /^\/[a-zA-Z0-9\/\-]+$/,
      message ?? format(this.messages.route, { field: this.state.name })
    );
  }

  /**
   * Checks if the value contains only alphabetic letters.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public alpha(message?: string): this {
    return this.is(
      /^[A-Za-z]+$/,
      message ?? format(this.messages.alpha, { field: this.state.name })
    );
  }

  /**
   * Checks if the value contains only alphanumeric characters.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public alphaNum(message?: string): this {
    return this.is(
      /^[A-Za-z0-9]+$/,
      message ?? format(this.messages.alphaNum, { field: this.state.name })
    );
  }

  /**
   * Checks if the value is a valid phone number in E.164 international format.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public phone(message?: string): this {
    return this.is(
      /^\+[1-9]\d{7,14}$/,
      message ?? format(this.messages.phone, { field: this.state.name })
    );
  }

  /**
   * Checks if the value is a valid hex color code (#FFF or #FFFFFF).
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public hex(message?: string): this {
    return this.is(
      /^#([0-9A-Fa-f]{3}){1,2}$/,
      message ?? format(this.messages.hex, { field: this.state.name })
    );
  }

  /**
   * Checks if the value id a valid id (positive integer).
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public id(message?: string): this {
    return this.test((v: any) => {
      if (isStr(v)) v = Number(v.trim());
      if (isInt(v) && v > 0) return true;
      return false;
    }, message ?? format(this.messages.id, { field: this.state.name }));
  }

  /**
   * Checks if the value is numeric (can be cast to a number).
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public number(message?: string): this {
    return this.test((v) => {
      if (isNum(v)) return true;
      return isStr(v) && v.length > 0 && !isNaN(Number(v));
    }, message ?? format(this.messages.number, { field: this.state.name }));
  }

  /**
   * Validates that the field value is a number between a minimum and optional maximum.
   *
   * @param message Optional custom error message.
   * @param min Optional min number.
   * @param max Optional max number.
   * @returns The Field instance for chaining.
   */
  public between(min?: number, max?: number, message?: string): this {
    if (!isNum(max)) max = Number.MAX_SAFE_INTEGER;
    if (!isNum(min)) min = 0;

    return this.test((v) => {
      if (!isStr(v) && !isNum(v)) return false;
      const num = Number(v);
      return !isNaN(num) && num >= min && num <= max;
    }, message ?? format(this.messages.between, { field: this.state.name, min, max }));
  }

  /**
   * Checks if the value is an integer.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public integer(message?: string): this {
    return this.test((v) => {
      if (isInt(v)) return true;
      if (!isStr(v)) return false;
      return isInt(Number(v));
    }, message ?? format(this.messages.integer, { field: this.state.name }));
  }

  /**
   * Checks if the value is a float.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public float(message?: string): this {
    return this.test((v) => {
      if (isFloat(v)) return true;
      if (!isStr(v)) return false;
      return isFloat(Number(v));
    }, message ?? format(this.messages.float, { field: this.state.name }));
  }

  /**
   * Ensures the field value is a positive number.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public positive(message?: string): this {
    return this.test((v) => {
      if (isNum(v) && v > 0) return true;
      return isStr(v) && v.trim() !== '' && !isNaN(Number(v)) && Number(v) > 0;
    }, message ?? format(this.messages.positive, { field: this.state.name }));
  }

  /**
   * Ensures the field value is a negative number.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public negative(message?: string): this {
    return this.test((v) => {
      if (isNum(v) && v < 0) return true;
      return isStr(v) && v.trim() !== '' && !isNaN(Number(v)) && Number(v) < 0;
    }, message ?? format(this.messages.negative, { field: this.state.name }));
  }

  /**
   * Checks if the value is a boolean (`true/false` or `1/0` or `yes/no` or `on/off`).
   * null, undefined, empty strings are casted to false
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public boolean(message?: string): this {
    return this.test((v) => {
      if (!isStr(v) && !isBool(v)) return false;
      return [
        true,
        false,
        'true',
        'false',
        '1',
        '0',
        'yes',
        'no',
        'on',
        'off',
      ].includes(isStr(v) ? v.trim().toLowerCase() : v);
    }, message ?? format(this.messages.boolean, { field: this.state.name }));
  }

  /**
   * Checks if the value is included in the allowed list.
   *
   * @param allowed Array of values.
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public in(allowed: unknown[], message?: string): this {
    if (!isArr(allowed)) {
      throw new ValidatorError('Expected an array of allowed values');
    }

    return this.test(
      (v) => allowed.includes(v),
      message ??
        format(this.messages.in, {
          field: this.state.name,
          values: allowed.join(', '),
        })
    );
  }

  /**
   * Checks if the value is a valid date (any format recognized by `Date`).
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public date(message?: string): this {
    return this.test((v) => {
      if (!isStr(v) && !isNum(v)) return false;
      return !isNaN(new Date(v).getTime());
    }, message ?? format(this.messages.date, { field: this.state.name }));
  }

  /**
   * Checks if the value matches 'yyyy-mm-dd hh:mm:ss' format and is a valid datetime.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public datetime(message?: string): this {
    return this.test((v) => {
      if (!isStr(v)) return false;
      return (
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) &&
        !isNaN(new Date(v.replace(' ', 'T')).getTime())
      );
    }, message ?? format(this.messages.datetime, { field: this.state.name }));
  }

  /**
   * Checks if the value is a valid JSON string.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public json(message?: string): this {
    return this.test((v) => {
      if (!isStr(v)) return false;
      try {
        JSON.parse(v);
        return true;
      } catch {
        return false;
      }
    }, message ?? format(this.messages.json, { field: this.state.name }));
  }

  /**
   * Checks if the value is a valid credit card number using the Luhn algorithm.
   *
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public creditCard(message?: string): this {
    return this.test((v) => {
      if (!isStr(v)) return false;

      const cleaned = v.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(cleaned)) return false;
      if (/^0+$/.test(cleaned)) return false;

      let sum = 0;
      let shouldDouble = false;

      for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned.charAt(i), 10);
        if (shouldDouble) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
      }

      return sum % 10 === 0;
    }, message ?? format(this.messages.creditCard, { field: this.state.name }));
  }

  /**
   * Checks if the value equals the value of another field in the same data object.
   *
   * @param field Name of the other field to compare with.
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public match(field: string, message?: string): this {
    return this.test((v, body) => {
      const other = body[field];
      return v === (other ?? null);
    }, message ?? format(this.messages.match, { field: this.state.name, matchField: field }));
  }

  /**
   * Checks if the value is a valid username (letters, numbers, underscores, hyphens) with length constraints.
   *
   * @param min Minimum length (default 3).
   * @param max Maximum length (default 16).
   * @param message Optional custom error message.
   * @returns The Field instance for chaining.
   */
  public username(min?: number, max?: number, message?: string): this {
    if (!isInt(min)) min = 3;
    if (!isInt(max)) max = 20;

    return this.is(
      new RegExp(`^[a-zA-Z0-9_-]{${min},${max}}$`),
      message ??
        format(this.messages.username, { field: this.state.name, min, max })
    );
  }

  /**
   * Runs all validation tests for this field.
   *
   * @param body The data object to validate against.
   * @returns A list of error messages, or an empty array if all tests pass.
   */
  public run(body?: Record<string, any>): Array<string> {
    return run(body, this.state);
  }
}
