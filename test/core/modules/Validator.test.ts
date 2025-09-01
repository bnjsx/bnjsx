import { MB } from '../../../src/core/modules/Form';
import { Request } from '../../../src/core/modules/Request';
import { Response } from '../../../src/core/modules/Response';
import { Validator, ValidatorFR } from '../../../src/core/modules/Validator';
import { ValidatorGetter } from '../../../src/core/modules/Validator';
import { ValidatorError } from '../../../src/errors';

describe('Validator', () => {
  let validator: Validator;
  let req: any;
  let res: any;

  beforeEach(() => {
    res = {};

    req = {
      on: jest.fn(),
      getHeader: jest.fn(() => 'application/x-www-form-urlencoded'),
    };

    validator = new Validator(req as Request, res as Response);
  });

  describe('validate', () => {
    let validator: Validator;
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
      res = {};

      req = {
        on: jest.fn(),
        getHeader: jest.fn(() => 'application/x-www-form-urlencoded'),
      } as any;

      validator = new Validator(req as Request, res as Response);
    });

    function triggerFormData(body: Record<string, any>) {
      const params = new URLSearchParams();

      for (const key in body) {
        const val = body[key];
        if (Array.isArray(val)) {
          for (const v of val) params.append(key, String(v));
        } else {
          params.append(key, String(val));
        }
      }

      const data = params.toString();
      const listeners: Record<string, Function[]> = { data: [], end: [] };

      (req.on as jest.Mock).mockImplementation((event, cb) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(cb);
      });

      setImmediate(() => {
        listeners['data'].forEach((fn) => fn(Buffer.from(data)));
        listeners['end'].forEach((fn) => fn());
      });
    }

    // Password field
    test('accepts password with number and special character', async () => {
      validator.field('password').hasNumber().hasSpecial();
      triggerFormData({ password: 'abc123!' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({});
    });

    test('rejects password missing number', async () => {
      validator.field('password').hasNumber().hasSpecial();
      triggerFormData({ password: 'abc!' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        password: ['password must contain a number.'],
      });
    });

    test('rejects password missing special character', async () => {
      validator.field('password').hasNumber().hasSpecial();
      triggerFormData({ password: 'abc123' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        password: ['password must contain a special character.'],
      });
    });

    // pass field
    test('accepts pass with letter and number within limits', async () => {
      validator.field('pass').min(4).max(10).hasLetter().hasNumber();
      triggerFormData({ pass: 'abc123' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({});
    });

    test('rejects pass below minimum length', async () => {
      validator.field('pass').min(4).max(10).hasLetter().hasNumber();
      triggerFormData({ pass: 'a1' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        pass: ['pass must be at least 4 characters.'],
      });
    });

    test('rejects pass above maximum length', async () => {
      validator.field('pass').min(4).max(10).hasLetter().hasNumber();
      triggerFormData({ pass: 'abcdefghijk1' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        pass: ['pass must be at most 10 characters.'],
      });
    });

    test('rejects pass with no number', async () => {
      validator.field('pass').min(4).max(10).hasLetter().hasNumber();
      triggerFormData({ pass: 'abcdef' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        pass: ['pass must contain a number.'],
      });
    });

    // email
    test('accepts valid email', async () => {
      validator.field('email').email();
      triggerFormData({ email: 'test@example.com' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({});
    });

    test('rejects invalid email', async () => {
      validator.field('email').email();
      triggerFormData({ email: 'bad-email' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        email: ['email must be a valid email address.'],
      });
    });

    test('rejects invalid email in frensh', async () => {
      const validator = new ValidatorFR(req as any, res as any);
      validator.field('email').email();
      triggerFormData({ email: 'bad-email' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        email: ['email doit être un email valide.'],
      });
    });

    // password-confirmation
    test('accepts matching password confirmation', async () => {
      validator.field('password').required();
      validator.field('password-confirmation').required().match('password');
      triggerFormData({
        password: '1234',
        'password-confirmation': '1234',
      });
      await validator.validate();
      expect(validator.get().errors()).toEqual({});
    });

    test('rejects non-matching password confirmation', async () => {
      validator.field('password').required();
      validator.field('password-confirmation').required().match('password');
      triggerFormData({
        password: '1234',
        'password-confirmation': '4321',
      });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        'password-confirmation': ['password-confirmation must match password.'],
      });
    });

    test('rejects missing password confirmation', async () => {
      validator.field('password').required();
      validator.field('password-confirmation').required().match('password');
      triggerFormData({
        password: '1234',
      });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        'password-confirmation': [
          'password-confirmation is required.',
          'password-confirmation must match password.',
        ],
      });
    });

    test('rejects field if not an array', async () => {
      validator.field('tags').array();
      triggerFormData({ tags: 'not-an-array' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        tags: ['tags must be an array.'],
      });
    });

    test('casts comma-separated string to array with default separator', async () => {
      validator.field('tags').array({ cast: true });
      triggerFormData({ tags: 'js, node, react' }); // string with commas and spaces
      await validator.validate();

      // After parse, the 'tags' field should be an array of trimmed strings
      expect(validator['data']['tags']).toEqual(['js', 'node', 'react']);
      expect(validator.fail()).toBe(false); // no error since casted to array
    });

    test('casts string to array with custom separator', async () => {
      validator.field('tags').array({ cast: true, sep: '|' });
      triggerFormData({ tags: 'apple|banana|cherry' }); // pipe separated
      await validator.validate();

      expect(validator['data']['tags']).toEqual(['apple', 'banana', 'cherry']);
      expect(validator.fail()).toBe(false);
    });

    test('rejects array if any item is not a string', async () => {
      validator.field('tags').array().ofString();
      triggerFormData({ tags: ['js', '123'] });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        tags: ['tags must contain strings only.'],
      });
    });

    test('rejects array if any item is not a number', async () => {
      validator.field('tags').array().ofNumber();
      triggerFormData({ tags: ['js', '123'] });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        tags: ['tags must contain numbers only.'],
      });
    });

    test('rejects array if any value is not a valid ID', async () => {
      validator.field('ids').array().ofIds();
      triggerFormData({ ids: ['1', '0', 'abc'] });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        ids: ['ids must contain valid IDs.'],
      });
    });

    test('rejects array missing required value', async () => {
      validator.field('categories').array().includes('featured');
      triggerFormData({ categories: ['news', 'tech'] });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        categories: ['categories must contain "featured".'],
      });
    });

    test('rejects array with duplicate values', async () => {
      validator.field('categories').array().unique();
      triggerFormData({ categories: ['news', 'news'] });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        categories: ['categories must contain unique values.'],
      });
    });

    test('rejects string with incorrect exact length', async () => {
      validator.field('code').length(6);
      triggerFormData({ code: 'abc' });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        code: ['code must be exactly 6 characters.'],
      });
    });

    test('rejects value that does not match referenced field', async () => {
      validator.field('email').required();
      validator.field('confirmEmail').required().match('email');
      triggerFormData({
        email: 'me@site.com',
        confirmEmail: 'other@site.com',
      });
      await validator.validate();
      expect(validator.get().errors()).toEqual({
        confirmEmail: ['confirmEmail must match email.'],
      });
    });

    test('registers validation for files as well', async () => {
      validator
        .file('avatar')
        .required()
        .count(1)
        .size(MB)
        .location('/')
        .type('image/jpg');

      validator.field('email').required();

      triggerFormData({
        email: 'me@site.com',
      });

      await validator.validate();

      expect(validator.fail()).toBeFalsy();
      expect(validator.get().errors()).toEqual({});
    });

    test('accepts valid CSRF token', async () => {
      req.csrfToken = 'secure-token';
      validator.csrf();

      triggerFormData({ csrfToken: 'secure-token' });

      await validator.validate();
      expect(validator.fail()).toBe(false);
    });

    test('rejects invalid CSRF token', async () => {
      req.csrfToken = 'secure-token';
      validator.csrf();

      triggerFormData({ csrfToken: 'wrong-token' });

      await expect(validator.validate()).rejects.toThrow(
        'Invalid or missing CSRF token'
      );
    });

    test('accepts empty honeypot field', async () => {
      validator.bot();

      triggerFormData({});
      await validator.validate();
      expect(validator.fail()).toBe(false);
    });

    test('rejects bot via honeypot field', async () => {
      validator.bot();

      triggerFormData({ honeyPot: 'I am a bot' });

      await expect(validator.validate()).rejects.toThrow(
        'Bot detected via honeypot field'
      );
    });
  });

  describe('file() & filed()', () => {
    test('throws if file name is not string', () => {
      expect(() => validator.file(123 as any)).toThrow(ValidatorError);
      expect(() => validator.file(null as any)).toThrow(ValidatorError);
      expect(() => validator.file({} as any)).toThrow(ValidatorError);
    });

    test('throws if field name is not string', () => {
      expect(() => validator.field(123 as any)).toThrow(ValidatorError);
      expect(() => validator.field(null as any)).toThrow(ValidatorError);
      expect(() => validator.field({} as any)).toThrow(ValidatorError);
    });
  });

  describe('get()', () => {
    test('returns default when key missing', () => {
      expect(validator.get('missing', 'default')).toBe('default');
      expect(validator.get('missing')).toBeNull();
    });

    test('returns stored value for key', () => {
      validator['data']['foo'] = 'bar';
      expect(validator.get('foo')).toBe('bar');
    });
  });

  describe('has()', () => {
    test('returns false if key does not exist', () => {
      expect(validator.has('missing')).toBe(false);
    });

    test('returns true if key exists', () => {
      validator['data']['exists'] = 'value';
      expect(validator.has('exists')).toBe(true);
    });

    test('throws if key is not a string', () => {
      expect(() => validator.has(123 as any)).toThrow(ValidatorError);
    });
  });

  describe('any()', () => {
    test('returns false if no fields', () => {
      expect(validator.any()).toBe(false);
    });

    test('returns true if fields exists', () => {
      validator.field('name').required();
      validator['data']['name'] = 'simon';

      expect(validator.any()).toBe(true);
    });
  });

  describe('set()', () => {
    test('sets a new key-value pair', () => {
      validator.set('foo', 'bar');
      expect(validator['data']['foo']).toBe('bar');
    });

    test('updates an existing key', () => {
      validator['data']['foo'] = 'old';
      validator.set('foo', 'new');
      expect(validator['data']['foo']).toBe('new');
    });

    test('accepts string array as value', () => {
      validator.set('tags', ['a', 'b']);
      expect(validator['data']['tags']).toEqual(['a', 'b']);
    });

    test('throws if key is not a string', () => {
      expect(() => validator.set(456 as any, 'val')).toThrow(ValidatorError);
    });
  });

  test('fail() returns false if no errors found', () => {
    validator['errors'] = undefined as any;
    expect(validator.fail()).toBe(false);
  });

  test('fail() returns true if errors exist', () => {
    validator['errors'] = { foo: ['error'] };
    expect(validator.fail()).toBe(true);
  });

  test('get().errors() returns errors', () => {
    const errors = { foo: ['error'] };
    validator['errors'] = errors;
    expect(validator.get().errors()).toBe(errors);
  });
});

describe('ValidatorGetter', () => {
  describe('constructor()', () => {
    test('initializes with valid state object', () => {
      const getter = new ValidatorGetter({
        data: { a: 1 },
        files: ['file'],
        fields: ['a'],
        errors: { a: ['Invalid'] },
      });

      expect(getter.body()).toEqual({ a: 1 });
    });

    test('sanitizes invalid state shape', () => {
      const getter = new ValidatorGetter(null as any);

      expect(getter.body()).toEqual({});
      expect(getter.errors()).toEqual({});
      expect(getter.fields()).toEqual({});
      expect(getter.files()).toEqual({});
    });
  });

  describe('files()', () => {
    test('returns validated files only', () => {
      const file = { name: 'resume.pdf' };
      const getter = new ValidatorGetter({
        data: { resume: file, ignored: 'x' },
        files: ['resume'],
      });

      expect(getter.files()).toEqual({ resume: file });
    });

    test('returns empty object when no files', () => {
      const getter = new ValidatorGetter({});
      expect(getter.files()).toEqual({});
    });
  });

  describe('fields()', () => {
    test('returns validated fields only', () => {
      const getter = new ValidatorGetter({
        data: { name: 'John', age: 22 },
        fields: ['name'],
      });

      expect(getter.fields()).toEqual({ name: 'John' });
    });

    test('returns empty object when no fields', () => {
      const getter = new ValidatorGetter({});
      expect(getter.fields()).toEqual({});
    });
  });

  describe('defined()', () => {
    test('returns only defined field values', () => {
      const getter = new ValidatorGetter({
        data: { name: 'John', age: undefined },
        fields: ['name', 'age'],
      });

      expect(getter.defined()).toEqual({ name: 'John' });
    });
  });

  describe('errors()', () => {
    test('returns all error records', () => {
      const errors = { name: ['Name is required'] };
      const getter = new ValidatorGetter({ errors });

      expect(getter.errors()).toBe(errors);
    });
  });

  describe('errorList()', () => {
    test('returns all error messages as flat array', () => {
      const getter = new ValidatorGetter({
        errors: {
          name: ['required'],
          email: ['invalid'],
        },
      });

      expect(getter.errorList()).toEqual(['required', 'invalid']);
    });

    test('returns specified number of error messages', () => {
      const getter = new ValidatorGetter({
        errors: {
          name: ['required'],
          email: ['invalid'],
          password: ['missing'],
        },
      });

      expect(getter.errorList(1)).toEqual(['required']);
      expect(getter.errorList(2)).toEqual(['required', 'invalid']);
      expect(getter.errorList(3)).toEqual(['required', 'invalid', 'missing']);
      expect(getter.errorList(100)).toEqual(['required', 'invalid', 'missing']);
      expect(getter.errorList(0)).toEqual(['required', 'invalid', 'missing']); // ignored
      expect(getter.errorList('hi' as any)).toEqual([
        'required',
        'invalid',
        'missing',
      ]);
    });
  });

  describe('flashList()', () => {
    test('returns all flash error messages', () => {
      const getter = new ValidatorGetter({
        errors: {
          name: ['required'],
          email: ['invalid'],
        },
      });

      expect(getter.flashList()).toEqual([
        { type: 'error', message: 'required' },
        { type: 'error', message: 'invalid' },
      ]);
    });
  });

  describe('firstError()', () => {
    test('returns the first error message', () => {
      const getter = new ValidatorGetter({
        errors: { field: ['First error', 'Second error'] },
      });

      expect(getter.firstError()).toBe('First error');
    });

    test('returns empty string when no errors', () => {
      const getter = new ValidatorGetter({});
      expect(getter.firstError()).toBe('');
    });
  });

  describe('firstFlash()', () => {
    test('returns first flash error message', () => {
      const getter = new ValidatorGetter({
        errors: { email: ['Invalid email'] },
      });

      expect(getter.firstFlash()).toEqual({
        type: 'error',
        message: 'Invalid email',
      });
    });

    test('returns empty flash if no errors', () => {
      const getter = new ValidatorGetter({});
      expect(getter.firstFlash()).toEqual({ type: 'error', message: '' });
    });
  });

  describe('value()', () => {
    test('returns raw value from data', () => {
      const getter = new ValidatorGetter({
        data: { a: 10 },
      });

      expect(getter.value('a')).toBe(10);
    });

    test('returns default if key is not present', () => {
      const getter = new ValidatorGetter({});
      expect(getter.value('missing', 123)).toBe(123);
    });

    test('returns default if key is not string', () => {
      const getter = new ValidatorGetter({});
      expect(getter.value(123 as any)).toBe(null);
    });
  });

  describe('body()', () => {
    test('returns raw data body', () => {
      const data = { a: 1, b: 2 };
      const getter = new ValidatorGetter({ data });
      expect(getter.body()).toBe(data);
    });
  });

  describe('asNumber()', () => {
    test('casts string to number', () => {
      const getter = new ValidatorGetter({ data: { count: '42' } });
      expect(getter.asNumber('count')).toBe(42);
    });

    test('casts array of strings to numbers', () => {
      const getter = new ValidatorGetter({
        data: { scores: ['1', '2', '3'] },
      });
      expect(getter.asNumber('scores')).toEqual([1, 2, 3]);
    });

    test('returns 0 if not string or array', () => {
      const getter = new ValidatorGetter({ data: { num: {} } });
      expect(getter.asNumber('num')).toBe(0);
    });

    test('returns 0 if cannot be cast', () => {
      const getter = new ValidatorGetter({ data: { num: 'hello' } });
      expect(getter.asNumber('num')).toBe(0);
    });
  });

  describe('asBoolean()', () => {
    test('parses common truthy string', () => {
      const getter = new ValidatorGetter({ data: { a: 'yes' } });
      expect(getter.asBoolean('a')).toBe(true);
    });

    test('parses false string', () => {
      const getter = new ValidatorGetter({ data: { a: 'no' } });
      expect(getter.asBoolean('a')).toBe(false);
    });

    test('parses array of truthy strings', () => {
      const getter = new ValidatorGetter({
        data: { flags: ['true', 'false', 'on', 'off'] },
      });
      expect(getter.asBoolean('flags')).toEqual([true, false, true, false]);
    });

    test('returns boolean directly if already boolean', () => {
      const getter = new ValidatorGetter({ data: { val: true } });
      expect(getter.asBoolean('val')).toBe(true);
    });

    test('returns false for unsupported values', () => {
      const getter = new ValidatorGetter({ data: { val: {} } });
      expect(getter.asBoolean('val')).toBe(false);
    });
  });
});
