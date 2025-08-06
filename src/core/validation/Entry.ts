import {
  isArr,
  isDefined,
  isFloat,
  isFunc,
  isInt,
  isNan,
  isNull,
  isNum,
  isObj,
  isRegex,
  isStr,
  isUndefined,
} from '../../helpers';

/**
 * Custom error used when invalid parameters are passed (e.g., non-RegExp to `.is()`).
 */
export class InputError extends Error {}

/**
 * Options for the `.array()` method to control array conversion behavior.
 *
 * @property cast - If `true`, comma-separated strings will be split into arrays.
 * @property sep - The separator string used to split the input string when `cast` is enabled. Defaults to `","`.
 */
export type ArrayOptions = {
  cast?: boolean;
  sep?: string;
};

/**
 * The `Input<T>` class represents a single input value (or array of values) that can be casted and validated fluently.
 * Each method applies transformation or validation immediately, failing fast by nullifying the value if invalid.
 *
 * @example
 *   new Input('42').number().positive().between(18, 99).get(); // 42
 */
export class Input<T> {
  /**
   * The current value held by the `Entry` instance.
   *
   * This value is the target of validation and transformation operations.
   * It can be a single value, an array of values, or `null` if invalidated.
   */
  private value: any;

  /**
   * Indicates whether the current `Entry` is in array mode.
   *
   * When `true`, validation and transformation methods operate on each element
   * of the array individually rather than the entire array as a single value.
   * This flag is set when `.array()` is called to signal array-specific behavior.
   */
  private isArrayMode = false;

  /**
   * @param value - The raw value to wrap and validate (string or string array)
   */
  constructor(value: string | string[]) {
    this.value = value;
  }

  /**
   * Marks the current entry as failed by setting its value to null.
   *
   * This method is used internally to indicate that the validation or transformation
   * did not succeed, effectively invalidating the value.
   *
   * @returns The current `Entry` instance with value set to `null`.
   */
  private fail(): this {
    this.value = null;
    return this;
  }

  /**
   * Applies a transformation or validation function to the current value.
   *
   * If the value is `null`, this method returns immediately without changes.
   * If the value is an array and `isArrayMode` is false, it marks the entry as failed.
   * If the value is an array and `isArrayMode` is true, applies the function to each element;
   * if any application throws, the entire entry fails.
   * If the value is a single value, applies the function and catches any error to fail the entry.
   *
   * @param fn - A function that receives the current value (or each array element) and returns the transformed value.
   * @returns The current `Entry` instance, possibly with transformed or null value on failure.
   */
  private apply(fn: (val: any) => any): this {
    if (this.value === null) return this;

    if (isArr(this.value) && !this.isArrayMode) {
      return this.fail();
    }

    if (isArr(this.value)) {
      const mapped = [];
      for (const v of this.value) {
        try {
          mapped.push(fn(v));
        } catch {
          return this.fail();
        }
      }

      // the null part never executed...
      this.value = mapped.length ? mapped : null;
    } else {
      try {
        this.value = fn(this.value);
      } catch {
        return this.fail();
      }
    }

    return this;
  }

  /**
   * Converts the value into an array.
   *
   * - Casts comma-separated strings if `cast` is true.
   * - Wraps single values in an array.
   * - Leaves `null`/`undefined` unchanged.
   */
  public array<T = string>(options?: ArrayOptions): Input<T[]> {
    this.isArrayMode = true;

    if (isNull(this.value) || isUndefined(this.value)) return this;

    const cast = options?.cast ?? false;
    const sep = isStr(options?.sep) ? options.sep : ',';

    if (cast && isStr(this.value)) {
      this.value = this.value.split(sep).map((s) => s.trim());
      return this;
    }

    if (!isArr(this.value)) {
      this.value = [this.value];
    }

    return this;
  }

  /**
   * Applies a custom validation function to the current value.
   *
   * @param fn - A function that receives the current value (or each value if array) and returns a boolean.
   * @throws `InputError` If the provided argument is not a function.
   */
  public test(fn: (val: any) => boolean): this {
    if (!isFunc(fn)) throw new InputError('Invalid test fn');

    return this.apply((val) => {
      if (!fn(val)) throw new Error();
      return val;
    });
  }

  /**
   * Validates that the string matches a given `RegExp`.
   * Throws `InputError` if the argument is not a `RegExp`.
   *
   * @param regex - The regular expression to match against.
   */
  public is(regex: RegExp): Input<string> {
    if (!isRegex(regex)) throw new InputError('Invalid regex');
    return this.apply((val) => {
      if (!isStr(val) || !regex.test(val)) throw new Error();
      return val;
    });
  }

  /**
   * Ensures the value is one of the allowed values.
   * Performs strict `===` comparison.
   *
   * @param allowed - An array of allowed values (string | number | boolean).
   */
  public in(...allowed: Array<string | number | boolean>): this {
    return this.apply((val) => {
      if (!allowed.includes(val)) throw new Error();
      return val;
    });
  }

  /**
   * Validates UUID v4 format.
   */
  public uuid(): Input<string> {
    return this.is(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  }

  /**
   * Validates a slug (lowercase words separated by hyphens).
   */
  public slug(): Input<string> {
    return this.is(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }

  /**
   * Validates an email address.
   */
  public email(): Input<string> {
    return this.is(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  }

  /**
   * Validates a URL (starts with http or https).
   */
  public url(): Input<string> {
    return this.is(/^https?:\/\/[\w\-]+(\.[\w\-]+)+[\/\#\?]?.*$/i);
  }

  /**
   * Validates alphanumeric token with minimum length of 10.
   */
  public token(): Input<string> {
    return this.is(/^[a-zA-Z0-9]{10,}$/);
  }

  /**
   * Validates a positive non-zero integer (usually used for IDs).
   */
  public id(): Input<number> {
    return this.apply((val) => {
      if (!/^[1-9][0-9]*$/.test(val)) throw new Error();
      return Number(val);
    });
  }

  /**
   * Validates and casts the value as a positive non-zero integer suitable for pagination.
   */
  public page(): Input<number> {
    return this.id();
  }

  /**
   * Ensures the number is between the given range (inclusive).
   *
   * @param min - Minimum allowed value.
   * @param max - Maximum allowed value.
   */
  public between(min: number, max: number): Input<number> {
    if (!isNum(min) || isNan(min)) min = 0;
    if (!isNum(max) || isNan(max)) max = Number.MAX_SAFE_INTEGER;

    return this.apply((val) => {
      if (isStr(val)) val = Number(val);
      if (isNan(val)) throw new Error();
      if (!isNum(val) || val < min || val > max) throw new Error();
      return val;
    });
  }

  /**
   * Joins an array of values into a single string using the given separator.
   * This is useful after applying `.array()` to parse comma-separated strings,
   * validate each item, and then rejoin the array for database storage.
   *
   * If the value is not an array, this method does nothing.
   *
   * @param sep - The separator string to use. Defaults to `,`.
   * @returns The current Input instance with the joined string as value.
   */
  public join(sep: string = ','): Input<string> {
    if (!isStr(sep)) sep = ',';
    if (isArr(this.value)) this.value = this.value.join(sep);
    return this;
  }

  /**
   * Ensures the value is a string.
   */
  public str(): Input<number> {
    return this.apply((val) => {
      if (isStr(val)) return val;
      throw new Error();
    });
  }

  /**
   * Ensures the value is a number.
   */
  public number(): Input<number> {
    return this.apply((val) => {
      if (isNum(val)) return val;

      if (isStr(val)) {
        if (!/^-?\d+(\.\d+)?$/.test(val)) throw new Error();
        return Number(val);
      }

      throw new Error();
    });
  }

  /**
   * Validates the number is an integer.
   */
  public integer(): Input<number> {
    return this.apply((val) => {
      if (isStr(val)) val = Number(val);
      if (!isInt(val)) throw new Error();
      return val;
    });
  }

  /**
   * Validates the number is a float (has decimal part).
   */
  public float(): Input<number> {
    return this.apply((val) => {
      if (isStr(val)) val = Number(val);
      if (!isFloat(val)) throw new Error();
      return val;
    });
  }

  /**
   * Ensures the number is positive.
   */
  public positive(): Input<number> {
    return this.apply((val) => {
      if (isStr(val)) val = Number(val);
      if (isNan(val)) throw new Error();
      if (!isNum(val) || val <= 0) throw new Error();
      return val;
    });
  }

  /**
   * Ensures the number is negative.
   */
  public negative(): Input<number> {
    return this.apply((val) => {
      if (isStr(val)) val = Number(val);
      if (isNan(val)) throw new Error();
      if (!isNum(val) || val >= 0) throw new Error();
      return val;
    });
  }

  /**
   * Casts common boolean-like strings into actual boolean.
   * - `true`, `1`, `yes`, `on` → true
   * - `false`, `0`, `no`, `off` → false
   */
  public boolean(): Input<boolean> {
    return this.apply((val) => {
      const v = isStr(val) ? val.trim().toLowerCase() : '';
      if (['true', '1', 'yes', 'on'].includes(v)) return true;
      if (['false', '0', 'no', 'off'].includes(v)) return false;
      throw new Error();
    });
  }

  /**
   * Parses the value as JSON. Fails if JSON is invalid.
   */
  public json(): Input<any> {
    return this.apply((val) => {
      if (!isStr(val)) throw new Error();

      try {
        return JSON.parse(val);
      } catch {
        throw new Error();
      }
    });
  }

  /**
   * Returns the validated (and possibly casted) value.
   * Returns fallback `def` if the value is invalid.
   *
   * @param def - Optional default value if validation failed.
   */
  public get<U = T>(): U;
  public get<U = T>(def: U): U;
  public get<U = T>(def?: U): U {
    if (isNull(this.value) || isUndefined(this.value)) return def ?? null;
    return this.value;
  }
}

/**
 * The `Entry` class wraps request query params & route params
 * and provides a safe and chainable API for casting and vaidation.
 */
export class Entry {
  private data: Record<string, any>;

  /**
   * Creates a new Entry instance from an object or array.
   *
   * @param source - Source input data, usually an object or an array.
   */
  constructor(source: Record<string, any> | Array<string>) {
    if (isObj(source)) this.data = { ...source };
    else if (isArr(source)) this.data = [...source];
    else this.data = {};
  }

  /**
   * Returns an `Input` instance for a given key or index.
   *
   * @param key - The key (or index, if source was an array) to extract.
   * @returns A chainable api for validation and transformation.
   */
  ensure(key: string | number): Input<string | string[]> {
    return new Input(this.data[key] ?? null);
  }

  /**
   * Checks if a specific key or index exists in the data source.
   *
   * @param key - The key or index to check.
   * @returns `true` if the key exists, otherwise `false`.
   */
  has(key: string | number): boolean {
    return isDefined(this.data[key]);
  }

  /**
   * Returns the raw value for a given key or index, or `null` if not found.
   *
   * @param key - The key or index to retrieve.
   * @returns The raw value or `null`.
   */
  get<T extends unknown>(key: string | number): T {
    return this.data[key] ?? null;
  }

  /**
   * Returns the raw value or the first element if the value is an array.
   *
   * @param key - The key or numeric index to retrieve from the internal data.
   * @returns A single string value or `null` if unavailable.
   */
  one(key: string | number): string {
    const value = this.data[key];

    if (isStr(value)) return value;
    if (isArr(value) && value[0]) return value[0];
    return null;
  }
}
