import { BadRequestError, ValidatorError } from '../../errors';
import { Form, UploadedFile } from './Form';
import { Request } from './Request';
import { Response } from './Response';
import { isArr, isArrOfStr, isBool, isInt, isObj, isStr } from '../../helpers';
import { Field } from '../validation/Field';
import { File } from '../validation/File';
import { ValidationMessages } from '../validation/Messages';

/**
 * A single flash message used for UI error or info notifications.
 */
export type Flash = {
  type: 'error' | 'info' | 'success';
  message: string;
};

/**
 * A map of validation errors where each key maps to an array of error messages.
 */
export type Errors = Record<string, string[]>;

/**
 * Internal state used by the ValidatorGetter to store parsed data, validation results,
 * and explicitly validated fields and files.
 */
type State = {
  data?: Record<string, any>; // All parsed fields and files
  files?: string[]; // Keys of validated file inputs
  fields?: string[]; // Keys of validated field inputs
  errors?: Record<string, string[]>; // Validation errors
};

/**
 * Provides accessors for validated fields, files, and errors after validation.
 *
 * Used internally by the Validator to expose clean getters for retrieved values,
 * casted types, error lists, and flash messages.
 */
export class ValidatorGetter {
  private state: State;

  constructor(state: State) {
    if (!isObj(state)) state = {};
    if (!isObj(state.data)) state.data = {};
    if (!isArr(state.files)) state.files = [];
    if (!isArr(state.fields)) state.fields = [];
    if (!isObj(state.errors)) state.errors = {};

    this.state = state;
  }

  /**
   * Returns all validated files.
   */
  public files(): Record<string, UploadedFile> {
    if (!this.state.files.length) return {};

    const out: Record<string, UploadedFile> = {};
    for (const key of this.state.files) {
      out[key] = this.state.data[key];
    }

    return out;
  }

  /**
   * Returns all validated body fields.
   */
  public fields<T = any>(): Record<string, T> {
    if (!this.state.fields.length) return {};

    const out: Record<string, T> = {};
    for (const key of this.state.fields) {
      out[key] = this.state.data[key];
    }

    return out;
  }

  /**
   * Returns all validated field values that are not `undefined`
   */
  public defined<T = any>(): Record<string, T> {
    const fields = this.fields();

    return Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined)
    );
  }

  /**
   * Returns all validation errors.
   */
  public errors(): Errors {
    return this.state.errors;
  }

  /**
   * Flattens all error messages into a single array.
   */
  public errorList(length?: number): string[] {
    const errors = Object.values(this.state.errors).flat();
    if (!isInt(length) || length <= 0) length = errors.length;
    return errors.slice(0, length);
  }

  /**
   * Flattens all error messages into a single array.
   */
  public flashList(length?: number): Flash[] {
    return this.errorList(length).map((message) => ({
      type: 'error',
      message,
    }));
  }

  /**
   * Returns the first error message, if any.
   */
  public firstError(): string {
    return this.errorList()[0] || '';
  }

  /**
   * Returns the first flash error message, if any.
   */
  public firstFlash(): Flash {
    return { type: 'error', message: this.firstError() };
  }

  /**
   * Gets a raw value from the parsed body.
   */
  public value<T = any>(key: string, def: T = null): T {
    if (!isStr(key)) return def;
    const val = this.state.data[key];
    return val === undefined ? def : val;
  }

  /**
   * Returns the parsed body.
   */
  public body(): Record<string, any> {
    return this.state.data;
  }

  /**
   * Casts a value to number or array of numbers.
   */
  public asNumber(key: string): number | number[] {
    const val = this.value(key);

    const cast = (v: string): number | null => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };

    if (isStr(val)) return cast(val);
    if (isArr(val)) return val.map(cast);

    return 0;
  }

  /**
   * Casts a value to boolean or array of booleans.
   */
  public asBoolean(key: string): boolean | boolean[] {
    const v = this.value(key);

    const parse = (v: string): boolean => {
      const s = v.trim().toLowerCase();
      return ['true', '1', 'yes', 'on'].includes(s);
    };

    if (isBool(v)) return v;
    if (isArrOfStr(v)) return v.map(parse);
    if (isStr(v)) return parse(v);

    return false;
  }
}

/**
 * Type definition for the `get` method used in Validator.
 *
 * - `() => ValidatorGetter` returns a helper for accessing validated data and errors
 * - `<T>(key: string)` returns the raw value or null
 * - `<T>(key: string, def: T)` returns the raw value or fallback
 */
export type ValidatorGet = {
  (): ValidatorGetter;
  <T = any>(key: string): T;
  <T = any>(key: string, def: T): T;
};

/**
 * A unified class for parsing, validating, and casting HTTP request body data.
 */
export class Validator {
  protected messages: ValidationMessages = {
    required: ':field is required.',
    min: ':field must be at least :length characters.',
    max: ':field must be at most :length characters.',
    length: ':field must be exactly :length characters.',
    is: ':field format is invalid.',
    hasLower: ':field must contain a lowercase letter.',
    hasUpper: ':field must contain an uppercase letter.',
    hasLetter: ':field must contain a letter.',
    hasNumber: ':field must contain a number.',
    hasSpecial: ':field must contain a special character.',
    hasSpace: ':field must contain a space.',
    id: ':field must be a valid id.',
    email: ':field must be a valid email address.',
    path: ':field must be a valid path.',
    url: ':field must be a valid URL.',
    route: ':field must be a valid route.',
    href: ':field must be a valid href.',
    number: ':field must be a number.',
    integer: ':field must be an integer.',
    float: ':field must be a decimal number.',
    positive: ':field must be a positive number.',
    negative: ':field must be a negative number.',
    boolean: ':field must be boolean.',
    in: ':field must be: :values.',
    alpha: ':field must contain only letters.',
    alphaNum: ':field must contain only letters and numbers.',
    date: ':field must be a valid date.',
    datetime: ':field must be a valid datetime (yyyy-mm-dd hh:mm:ss).',
    json: ':field must be valid JSON.',
    creditCard: ':field must be a valid credit card number.',
    phone: ':field must be a valid phone number.',
    match: ':field must match :matchField.',
    hex: ':field must be a valid hex color.',
    username:
      ':field must be :min-:max chars, letters, numbers, hyphens or underscores.',
    between: ':field must be a number between :min and :max.',
    file: {
      count: ':field must have exactly :count file(s).',
      type: ':field must be type(s): :types.',
      minSize: ':field file must be at least :min.',
      maxSize: ':field file must be at most :max.',
      required: ':field is required.',
    },
    array: {
      type: ':field must be an array.',
      min: ':field must have at least :length items.',
      max: ':field must have at most :length items.',
      length: ':field must have exactly :length items.',
      includes: ':field must contain ":value".',
      unique: ':field must contain unique values.',
      ofString: ':field must contain strings only.',
      ofNumber: ':field must contain numbers only.',
      ofIds: ':field must contain valid IDs.',
      notEmpty: ':field must be non-empty values.',
      some: ':field requires at least one valid entry.',
      none: ':field cannot contain invalid entries.',
      all: ':field requires all entries to be valid.',
    },
  };

  private files: Array<File> = new Array();
  private fields: Array<Field> = new Array();
  private errors: Record<string, string[]> = {};
  private data: Record<string, string | string[] | UploadedFile> = {};

  constructor(private request: Request, private response: Response) {}

  /**
   * Registers a file input for validation.
   * @param name Field name.
   * @param display Name to display in error messages (optional).
   * @returns File instance.
   */
  public file = (name: string, display?: string): File => {
    if (!isStr(name)) {
      throw new ValidatorError(
        `File name must be a string, got ${typeof name}`
      );
    }

    const file = new File(name, this.messages, display);
    this.files.push(file);
    return file;
  };

  /**
   * Registers a form field for validation.
   *
   * @param name Field name.
   * @param display Name to display in error messages (optional).
   * @returns Field instance.
   */
  public field = (name: string, display?: string): Field => {
    if (!isStr(name)) {
      throw new ValidatorError(
        `Field name must be a string, got ${typeof name}`
      );
    }

    const field = new Field(name, this.messages, display);
    this.fields.push(field);
    return field;
  };

  /**
   * Validates the `csrfToken` field during body parsing.
   *
   * Should be used for `multipart/form-data` requests that include file uploads.
   * If the token is missing or does not match the expected value, the request is rejected
   * and any uploaded files are removed.
   *
   * @returns The Validator instance for chaining.
   * @throws BadRequestError - If the CSRF token is invalid.
   */
  public csrf = (): this => {
    const field = new Field('csrfToken', this.messages);
    const token = this.request.csrfToken;

    field.test((v) => {
      if (!isStr(v) || !isStr(token) || v !== token) {
        throw new BadRequestError('Invalid or missing CSRF token');
      }

      return true;
    }, 'Bad Request');

    this.fields.push(field);
    return this;
  };

  /**
   * Validates the `honeyPot` field during body parsing.
   *
   * Should be used for multipart/form-data requests that include file uploads.
   * If the field contains a value, the request is rejected and any uploaded files are removed.
   *
   * @returns The Validator instance for chaining.
   * @throws BadRequestError - If a honeypot value is detected.
   */
  public bot = (): this => {
    const field = new Field('honeyPot', this.messages);

    const message = 'honeyPot';
    const test = (value) => {
      if (isStr(value)) {
        throw new BadRequestError('Bot detected via honeypot field');
      }

      return true;
    };

    field['state'].name = 'honeyPot';
    field['state'].testers = [{ test, message }];

    this.fields.push(field);
    return this;
  };

  /**
   * Parses and validates the incoming request body and files.
   * Populates `this.data` and `this.messages`.
   */
  public validate = async (): Promise<void> => {
    const form = new Form();

    for (const file of this.files) {
      form.file(file['state'].name, file['state'].options);
    }

    for (const field of this.fields) {
      form.field(field['state'].name, ...field['state'].testers);
    }

    await form.parse(this.request, this.response);

    this.request.validator = this;
    this.data = this.request.body;
    this.errors = this.request.errors;
  };

  /**
   * Returns true if there are validation errors.
   */
  public fail = (): boolean => {
    return isObj(this.errors) && Object.keys(this.errors).length > 0;
  };

  /**
   * Returns the raw value for the given key if it exists, otherwise returns the provided default value.
   *
   * @param key - The key to retrieve.
   * @param def - A fallback value to return if the key is not found.
   * @returns The raw value associated with the key, or the default value.
   */
  public get: ValidatorGet = <T = any>(
    key?: string,
    def: T = null
  ): T | ValidatorGetter => {
    if (key === undefined) {
      return new ValidatorGetter({
        data: this.data,
        files: this.files.map((file) => file['state'].name),
        fields: this.fields.map((field) => field['state'].name),
        errors: this.errors,
      });
    }

    return this.data[key] === undefined ? def : (this.data[key] as T);
  };

  /**
   * Checks if a key exists in the parsed data.
   *
   * @param key - Field name.
   * @returns True if key exists, false otherwise.
   * @throws ValidatorError if key is not a string.
   */
  public has = (key: string): boolean => {
    if (!isStr(key)) {
      throw new ValidatorError(`Key must be a string, got ${typeof key}`);
    }

    return Object.prototype.hasOwnProperty.call(this.data, key);
  };

  /**
   * Checks if there is at least one available field in the parsed data.
   *
   * Unlike {@link has}, which checks for the existence of a specific key,
   * this method ensures that the request body is not completely empty.
   * Useful when all fields are optional but at least one must be provided.
   *
   * @returns True if at least one field is present, false if body is empty.
   */
  public any = (): boolean => {
    return Object.keys(this.get().defined()).length > 0;
  };

  /**
   * Sets or updates a value in the parsed data.
   *
   * @param key - Field name.
   * @param value - New value to set.
   * @throws ValidatorError if key is not a string.
   */
  public set = (key: string, value: string | string[]): void => {
    if (!isStr(key)) {
      throw new ValidatorError(`Key must be a string, got ${typeof key}`);
    }

    this.data[key] = value;
  };
}

export class ValidatorFR extends Validator {
  protected messages: ValidationMessages = {
    required: ':field est obligatoire.',
    min: ':field doit contenir au moins :length caractères.',
    max: ':field doit contenir au maximum :length caractères.',
    length: ':field doit contenir exactement :length caractères.',
    is: 'Le format de :field est invalide.',
    hasLower: ':field doit contenir une lettre minuscule.',
    hasUpper: ':field doit contenir une lettre majuscule.',
    hasLetter: ':field doit contenir une lettre.',
    hasNumber: ':field doit contenir un chiffre.',
    hasSpecial: ':field doit contenir un caractère spécial.',
    hasSpace: ':field doit contenir un espace.',
    id: ':field doit être un id valide.',
    email: ':field doit être un email valide.',
    url: ':field doit être une URL valide.',
    path: ':field doit être un chemin valide.',
    route: ':field doit être une route valide.',
    href: ':field doit être un chemin d’URL valide.',
    number: ':field doit être un nombre.',
    integer: ':field doit être un entier.',
    float: ':field doit être un nombre à virgule flottante.',
    positive: ':field doit être un nombre positif.',
    negative: ':field doit être un nombre négatif.',
    boolean: ':field doit être vrai ou faux.',
    in: ':field doit être parmi :values.',
    alpha: ':field doit contenir seulement des lettres.',
    alphaNum: ':field doit contenir seulement des lettres et chiffres.',
    date: ':field doit être une date valide.',
    datetime:
      ':field doit être une date et heure valide (aaaa-mm-jj hh:mm:ss).',
    json: ':field doit être un JSON valide.',
    creditCard: ':field doit être un numéro de carte valide.',
    phone: ':field doit être un numéro de téléphone valide.',
    match: ':field doit correspondre à :matchField.',
    hex: ':field doit être une couleur hexadécimale valide.',
    username:
      ':field doit contenir entre :min et :max caractères, lettres, chiffres, - ou _.',
    between: ':field doit être un nombre entre :min et :max.',
    file: {
      count: ':field doit contenir exactement :count fichier(s).',
      type: ':field doit être de type(s) : :types.',
      minSize: ':field doit faire au moins :min octets.',
      maxSize: ':field doit faire au maximum :max octets.',
      required: ':field est obligatoire.',
    },
    array: {
      type: ':field doit être un tableau.',
      min: ':field doit contenir au moins :length éléments.',
      max: ':field doit contenir au maximum :length éléments.',
      length: ':field doit contenir exactement :length éléments.',
      includes: ':field doit inclure ":value".',
      unique: ':field ne doit pas contenir de doublons.',
      ofString: 'Tous les éléments de :field doivent être des chaînes.',
      ofNumber: 'Tous les éléments de :field doivent être des nombres.',
      ofIds:
        'Tous les éléments de :field doivent être des identifiants valides.',
      notEmpty: 'Tous les éléments de :field doivent être non vides.',
      some: ':field doit contenir au moins une entrée valide.',
      none: ':field ne peut pas contenir d’entrées invalides.',
      all: ':field doit contenir uniquement des entrées valides.',
    },
  };
}
