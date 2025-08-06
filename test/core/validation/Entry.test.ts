import { Input, InputError, Entry } from '../../../src/core/validation/Entry';

describe('Input', () => {
  const entry = (source: any) => new Input(source);

  describe('array()', () => {
    it('leaves null value unchanged', () => {
      const val = entry(null).array();
      expect(val.get()).toBeNull();
    });

    it('leaves undefined value unchanged', () => {
      const val = entry(undefined).array();
      expect(val.get()).toBeNull();
    });

    it('wraps a single string value into an array', () => {
      const val = entry('single').array();
      expect(val.get()).toEqual(['single']);
    });

    it('returns the original array if value is already an array', () => {
      const arr = ['a', 'b'];
      const val = entry(arr).array();
      expect(val.get()).toEqual(arr);
    });

    it('casts a comma-separated string into an array with default separator', () => {
      const val = entry('a,b,c').array({ cast: true });
      expect(val.get()).toEqual(['a', 'b', 'c']);
    });

    it('casts a string into an array with custom separator', () => {
      const val = entry('a;b;c').array({ cast: true, sep: ';' });
      expect(val.get()).toEqual(['a', 'b', 'c']);
    });

    it('trims whitespace when casting a string into an array', () => {
      const val = entry('  a ,  b , c  ').array({ cast: true });
      expect(val.get()).toEqual(['a', 'b', 'c']);
    });

    it('does not cast string to array if cast option is false', () => {
      const val = entry('a,b,c').array({ cast: false });
      expect(val.get()).toEqual(['a,b,c']);
    });

    it('sets isArrayMode to true', () => {
      const val = entry('x');
      val.array();

      // @ts-ignore access private
      expect(val.isArrayMode).toBe(true);
    });
  });

  describe('test()', () => {
    it('throws InputError if argument is not a function', () => {
      const val = entry('foo');
      expect(() => val.test(null as any)).toThrow(InputError);
      expect(() => val.test('not a fn' as any)).toThrow(InputError);
      expect(() => val.test(123 as any)).toThrow(InputError);
    });

    it('passes when test function returns true for single value', () => {
      const val = entry('hello');
      expect(val.test((v) => v === 'hello').get()).toBe('hello');
    });

    it('fails when test function returns false for single value', () => {
      const val = entry('hello');
      expect(val.test((v) => v === 'world').get()).toBeNull();
    });

    it('passes when test function returns true for all array items', () => {
      const val = entry(['a', 'b']);
      expect(
        val
          .array()
          .test((v) => v.length === 1)
          .get()
      ).toEqual(['a', 'b']);
    });

    it('fails when test function returns false for any array item', () => {
      const val = entry(['a', 'bb']);
      expect(
        val
          .array()
          .test((v) => v.length === 1)
          .get()
      ).toBeNull();
    });

    it('catches errors thrown in test function and fails gracefully', () => {
      const val = entry('foo');
      expect(
        val
          .test(() => {
            throw new Error('fail');
          })
          .get()
      ).toBeNull();
    });
  });

  describe('is()', () => {
    it('throws InputError if argument is not a RegExp', () => {
      const val = entry('test');
      expect(() => val.is(null as any)).toThrow(InputError);
      expect(() => val.is('not-a-regex' as any)).toThrow(InputError);
      expect(() => val.is(123 as any)).toThrow(InputError);
      expect(() => val.is({} as any)).toThrow(InputError);
    });

    it('passes if string matches the regex', () => {
      const val = entry('hello123');
      expect(val.is(/^[a-z0-9]+$/i).get()).toBe('hello123');
    });

    it('fails if string does not match the regex', () => {
      const val = entry('hello 123');
      expect(val.is(/^[a-z0-9]+$/i).get()).toBeNull();
    });

    it('fails if value is not a string', () => {
      const val = entry(123);
      expect(val.is(/./).get()).toBeNull();
    });

    it('works correctly with array input, validating each item', () => {
      const val = entry(['abc', '123']);
      expect(val.array().is(/^\w+$/).get()).toEqual(['abc', '123']);
    });

    it('fails if any array item does not match regex', () => {
      const val = entry(['abc', '123!', 'xyz']);
      expect(val.array().is(/^\w+$/).get()).toBeNull();
    });
  });

  describe('Input.in()', () => {
    it('passes if value is in allowed list', () => {
      const val = entry('dog');
      expect(val.in('cat', 'dog', 'bird').get()).toBe('dog');
    });

    it('fails if value is not in allowed list', () => {
      const val = entry('lion');
      expect(val.in('cat', 'dog', 'bird').get()).toBeNull();
    });

    it('handles allowed list with numbers and booleans', () => {
      expect(entry(5).in(1, 2, 3, 5).get()).toBe(5);
      expect(entry(true).in(false, true).get()).toBe(true);
      expect(entry(false).in(true).get()).toBeNull();
    });

    it('works correctly with array input, validating each item', () => {
      const val = entry(['cat', 'dog']);
      expect(val.array().in('cat', 'dog', 'bird').get()).toEqual([
        'cat',
        'dog',
      ]);
    });

    it('fails if any array item is not in allowed list', () => {
      const val = entry(['cat', 'lion']);
      expect(val.array().in('cat', 'dog', 'bird').get()).toBeNull();
    });
  });

  describe('Input.uuid()', () => {
    it('passes for valid UUID v4', () => {
      const val = entry('550e8400-e29b-41d4-a716-446655440000');
      expect(val.uuid().get()).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('fails for invalid UUID', () => {
      const val = entry('not-a-uuid');
      expect(val.uuid().get()).toBeNull();
    });

    it('fails for null or undefined', () => {
      expect(entry(null).uuid().get()).toBeNull();
      expect(entry(undefined).uuid().get()).toBeNull();
    });

    it('fails for non-string input', () => {
      expect(entry(123).uuid().get()).toBeNull();
      expect(entry({}).uuid().get()).toBeNull();
    });

    it('works for uppercase UUID', () => {
      const val = entry('550E8400-E29B-41D4-A716-446655440000');
      expect(val.uuid().get()).toBe('550E8400-E29B-41D4-A716-446655440000');
    });
  });

  describe('Input.slug()', () => {
    it('passes for valid slug', () => {
      const val = entry('valid-slug-123');
      expect(val.slug().get()).toBe('valid-slug-123');
    });

    it('fails for slug with uppercase letters', () => {
      const val = entry('Invalid-Slug');
      expect(val.slug().get()).toBeNull();
    });

    it('fails for slug with underscores', () => {
      const val = entry('invalid_slug');
      expect(val.slug().get()).toBeNull();
    });

    it('fails for slug with spaces', () => {
      const val = entry('invalid slug');
      expect(val.slug().get()).toBeNull();
    });

    it('fails for slug with trailing hyphen', () => {
      const val = entry('invalid-');
      expect(val.slug().get()).toBeNull();
    });

    it('fails for slug with leading hyphen', () => {
      const val = entry('-invalid');
      expect(val.slug().get()).toBeNull();
    });

    it('fails for slug with multiple consecutive hyphens', () => {
      const val = entry('invalid--slug');
      expect(val.slug().get()).toBeNull();
    });

    it('passes for single word slug', () => {
      const val = entry('slug');
      expect(val.slug().get()).toBe('slug');
    });

    it('fails for non-string input', () => {
      expect(entry(123).slug().get()).toBeNull();
      expect(entry(null).slug().get()).toBeNull();
      expect(entry(undefined).slug().get()).toBeNull();
    });
  });

  describe('Input.email()', () => {
    it('passes for valid email address', () => {
      const val = entry('user@example.com');
      expect(val.email().get()).toBe('user@example.com');
    });

    it('fails for missing "@" symbol', () => {
      const val = entry('userexample.com');
      expect(val.email().get()).toBeNull();
    });

    it('fails for missing domain', () => {
      const val = entry('user@');
      expect(val.email().get()).toBeNull();
    });

    it('fails for missing username', () => {
      const val = entry('@example.com');
      expect(val.email().get()).toBeNull();
    });

    it('fails for missing dot in domain', () => {
      const val = entry('user@examplecom');
      expect(val.email().get()).toBeNull();
    });

    it('fails for space in email', () => {
      const val = entry('user @example.com');
      expect(val.email().get()).toBeNull();
    });

    it('fails for multiple "@" symbols', () => {
      const val = entry('user@@example.com');
      expect(val.email().get()).toBeNull();
    });

    it('passes for email with subdomain', () => {
      const val = entry('user@mail.example.com');
      expect(val.email().get()).toBe('user@mail.example.com');
    });

    it('fails for non-string input', () => {
      expect(entry(123).email().get()).toBeNull();
      expect(entry(null).email().get()).toBeNull();
      expect(entry(undefined).email().get()).toBeNull();
    });
  });

  describe('Input.url()', () => {
    it('passes for valid http URL', () => {
      const val = entry('http://example.com');
      expect(val.url().get()).toBe('http://example.com');
    });

    it('passes for valid https URL', () => {
      const val = entry('https://example.com');
      expect(val.url().get()).toBe('https://example.com');
    });

    it('passes for URL with subdomain and path', () => {
      const val = entry('https://sub.example.com/path/to/page');
      expect(val.url().get()).toBe('https://sub.example.com/path/to/page');
    });

    it('passes for URL with query string', () => {
      const val = entry('https://example.com/search?q=entry');
      expect(val.url().get()).toBe('https://example.com/search?q=entry');
    });

    it('passes for URL with hash fragment', () => {
      const val = entry('https://example.com#section');
      expect(val.url().get()).toBe('https://example.com#section');
    });

    it('fails for non-http/https protocols', () => {
      const val = entry('ftp://example.com');
      expect(val.url().get()).toBeNull();
    });

    it('fails for missing protocol', () => {
      const val = entry('example.com');
      expect(val.url().get()).toBeNull();
    });

    it('fails for invalid domain', () => {
      const val = entry('https://');
      expect(val.url().get()).toBeNull();
    });

    it('fails for string without slashes after protocol', () => {
      const val = entry('https:example.com');
      expect(val.url().get()).toBeNull();
    });

    it('fails for non-string input', () => {
      expect(entry(42).url().get()).toBeNull();
      expect(entry(null).url().get()).toBeNull();
      expect(entry(undefined).url().get()).toBeNull();
    });
  });

  describe('Input.token()', () => {
    it('passes for valid alphanumeric token with length 10', () => {
      const val = entry('a1b2C3d4E5');
      expect(val.token().get()).toBe('a1b2C3d4E5');
    });

    it('passes for longer valid token', () => {
      const val = entry('abc123XYZ789');
      expect(val.token().get()).toBe('abc123XYZ789');
    });

    it('fails for token shorter than 10 characters', () => {
      const val = entry('abc123');
      expect(val.token().get()).toBeNull();
    });

    it('fails for token with special characters', () => {
      const val = entry('abc123!@#$');
      expect(val.token().get()).toBeNull();
    });

    it('fails for token with spaces', () => {
      const val = entry('abc123 456');
      expect(val.token().get()).toBeNull();
    });

    it('fails for non-string input', () => {
      expect(entry(1234567890).token().get()).toBeNull();
      expect(entry(null).token().get()).toBeNull();
      expect(entry(undefined).token().get()).toBeNull();
    });
  });

  describe('Input.id()', () => {
    it('passes for a string representing a positive non-zero integer', () => {
      const val = entry('123');
      expect(val.id().get()).toBe(123);
    });

    it('passes for a large integer string', () => {
      const val = entry('999999');
      expect(val.id().get()).toBe(999999);
    });

    it('fails for "0"', () => {
      const val = entry('0');
      expect(val.id().get()).toBeNull();
    });

    it('fails for a negative number string', () => {
      const val = entry('-5');
      expect(val.id().get()).toBeNull();
    });

    it('fails for a decimal string', () => {
      const val = entry('3.14');
      expect(val.id().get()).toBeNull();
    });

    it('fails for a non-numeric string', () => {
      const val = entry('abc');
      expect(val.id().get()).toBeNull();
    });

    it('fails for an empty string', () => {
      const val = entry('');
      expect(val.id().get()).toBeNull();
    });

    it('fails for non-string input', () => {
      expect(entry(null).id().get()).toBeNull();
      expect(entry(undefined).id().get()).toBeNull();
      expect(entry({}).id().get()).toBeNull();
    });
  });

  describe('Input.page()', () => {
    it('passes for a valid page number string', () => {
      const val = entry('2');
      expect(val.page().get()).toBe(2);
    });

    it('fails for "0"', () => {
      const val = entry('0');
      expect(val.page().get()).toBeNull();
    });

    it('fails for a negative number', () => {
      const val = entry('-1');
      expect(val.page().get()).toBeNull();
    });

    it('fails for a non-integer string', () => {
      const val = entry('3.5');
      expect(val.page().get()).toBeNull();
    });

    it('fails for a non-numeric string', () => {
      const val = entry('page');
      expect(val.page().get()).toBeNull();
    });

    it('returns null for undefined input', () => {
      const val = entry(undefined);
      expect(val.page().get()).toBeNull();
    });

    it('returns null for null input', () => {
      const val = entry(null);
      expect(val.page().get()).toBeNull();
    });
  });

  describe('Input.between()', () => {
    const entry = (val: any) => new Input(val);

    it('uses default min=0 and max=Number.MAX_SAFE_INTEGER if invalid min/max provided', () => {
      // invalid min/max inputs: undefined, null, string, etc
      const val1 = entry('50').between(NaN, NaN).get();
      expect(val1).toBe(50);

      // @ts-ignore
      const val2 = entry('0').between(undefined, undefined).get();
      expect(val2).toBe(0);

      const val3 = entry(String(Number.MAX_SAFE_INTEGER))
        // @ts-ignore
        .between(null, 'foo' as any)
        .get();
      expect(val3).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('passes for a number within the range', () => {
      const val = entry(5).between(1, 10);
      expect(val.get()).toBe(5);
    });

    it('passes for a string number within the range', () => {
      const val = entry('7').between(1, 10);
      expect(val.get()).toBe(7);
    });

    it('fails for a number below the range', () => {
      const val = entry(0).between(1, 10);
      expect(val.get()).toBeNull();
    });

    it('fails for a number above the range', () => {
      const val = entry(11).between(1, 10);
      expect(val.get()).toBeNull();
    });

    it('fails for a non-numeric string', () => {
      const val = entry('abc').between(1, 10);
      expect(val.get()).toBeNull();
    });

    it('fails for null input', () => {
      const val = entry(null).between(1, 10);
      expect(val.get()).toBeNull();
    });

    it('fails for undefined input', () => {
      const val = entry(undefined).between(1, 10);
      expect(val.get()).toBeNull();
    });

    it('passes if value is equal to min boundary', () => {
      const val = entry(1).between(1, 10);
      expect(val.get()).toBe(1);
    });

    it('passes if value is equal to max boundary', () => {
      const val = entry(10).between(1, 10);
      expect(val.get()).toBe(10);
    });

    it('passes for all values in array within the range', () => {
      const val = entry(['3', 5, 10]).array().between(1, 10);
      expect(val.get()).toEqual([3, 5, 10]);
    });

    it('fails if one value in array is out of range', () => {
      const val = entry(['3', 0, 7]).array().between(1, 10);
      expect(val.get()).toBeNull();
    });

    it('fails if one value in array is not numeric', () => {
      const val = entry(['3', 'abc', 7]).array().between(1, 10);
      expect(val.get()).toBeNull();
    });

    it('fails if array contains null', () => {
      const val = entry([5, null]).array().between(1, 10);
      expect(val.get()).toBeNull();
    });

    it('fails if array contains undefined', () => {
      const val = entry([5, undefined]).array().between(1, 10);
      expect(val.get()).toBeNull();
    });
  });

  describe('Input.join()', () => {
    const entry = (val: any) => new Input(val);

    it('joins array of strings with default separator', () => {
      const val = entry(['a', 'b', 'c']).join();
      expect(val.get()).toBe('a,b,c');
    });

    it('joins array of strings with custom separator', () => {
      const val = entry(['a', 'b', 'c']).join(' | ');
      expect(val.get()).toBe('a | b | c');
    });

    it('joins array of numbers as strings', () => {
      const val = entry([1, 2, 3]).join('-');
      expect(val.get()).toBe('1-2-3');
    });

    it('returns the same value if not an array', () => {
      const val = entry('hello').join();
      expect(val.get()).toBe('hello');
    });

    it('ignores non-string separator and defaults to comma', () => {
      const val = entry(['x', 'y']).join(null as any);
      expect(val.get()).toBe('x,y');
    });

    it('joins empty array into empty string', () => {
      const val = entry([]).join('/');
      expect(val.get()).toBe('');
    });

    it('can be used after array() and validation', () => {
      const val = entry('1,2,3').array({ cast: true }).between(1, 9).join('-');
      expect(val.get()).toBe('1-2-3');
    });

    it('fails if any array element is invalid before joining', () => {
      const val = entry('1,2,x').array({ cast: true }).between(1, 9).join('|');
      expect(val.get()).toBeNull();
    });
  });

  describe('Input.str()', () => {
    it('returns the string value as is', () => {
      expect(entry('hello').str().get()).toBe('hello');
    });

    it('fails and returns null for non-string values', () => {
      expect(entry(123).str().get()).toBeNull();
      expect(entry(true).str().get()).toBeNull();
      expect(entry(null).str().get()).toBeNull();
      expect(entry(undefined).str().get()).toBeNull();
      expect(entry(['a', 'b']).str().get()).toBeNull();
    });

    it('works for array mode with all strings', () => {
      expect(entry(['a', 'b']).array().str().get()).toEqual(['a', 'b']);
    });

    it('fails for array mode with any non-string', () => {
      expect(entry(['a', 1]).array().str().get()).toBeNull();
    });
  });

  describe('Input.number()', () => {
    it('returns number as is', () => {
      expect(entry(42).number().get()).toBe(42);
      expect(entry(-1.23).number().get()).toBe(-1.23);
    });

    it('parses numeric strings', () => {
      expect(entry('42').number().get()).toBe(42);
      expect(entry('-1.23').number().get()).toBe(-1.23);
    });

    it('fails on invalid numeric strings', () => {
      expect(entry('abc').number().get()).toBeNull();
      expect(entry('12abc').number().get()).toBeNull();
      expect(entry('1.2.3').number().get()).toBeNull();
    });

    it('fails on non-number, non-string values', () => {
      expect(entry(true).number().get()).toBeNull();
      expect(entry(null).number().get()).toBeNull();
      expect(entry(undefined).number().get()).toBeNull();
      expect(entry(['1']).number().get()).toBeNull();
    });

    it('works for array mode with all valid numbers', () => {
      expect(entry(['1', '2.5']).array().number().get()).toEqual([1, 2.5]);
    });

    it('fails for array mode with any invalid number', () => {
      expect(entry(['1', 'abc']).array().number().get()).toBeNull();
    });
  });

  describe('Input.integer()', () => {
    it('accepts integer numbers', () => {
      expect(entry(5).integer().get()).toBe(5);
      expect(entry('10').integer().get()).toBe(10);
    });

    it('rejects floats and non-numbers', () => {
      expect(entry(3.14).integer().get()).toBeNull();
      expect(entry('3.14').integer().get()).toBeNull();
      expect(entry('abc').integer().get()).toBeNull();
      expect(entry(null).integer().get()).toBeNull();
    });

    it('works with array mode for all integers', () => {
      expect(entry(['1', 2, '3']).array().integer().get()).toEqual([1, 2, 3]);
    });

    it('fails array mode if any value is not an integer', () => {
      expect(entry(['1', 2.5]).array().integer().get()).toBeNull();
    });
  });

  describe('Input.float()', () => {
    it('accepts float numbers', () => {
      expect(entry(3.14).float().get()).toBe(3.14);
      expect(entry('2.718').float().get()).toBe(2.718);
    });

    it('rejects integers', () => {
      expect(entry(5).float().get()).toBeNull();
      expect(entry('10').float().get()).toBeNull();
    });

    it('rejects invalid strings and non-numbers', () => {
      expect(entry('abc').float().get()).toBeNull();
      expect(entry(null).float().get()).toBeNull();
    });

    it('works with array mode for all floats', () => {
      expect(entry(['1.1', 2.5, '3.3']).array().float().get()).toEqual([
        1.1, 2.5, 3.3,
      ]);
    });

    it('fails array mode if any value is not a float', () => {
      expect(entry(['1.1', 2]).array().float().get()).toBeNull();
    });
  });

  describe('Input.positive()', () => {
    it('accepts positive numbers', () => {
      expect(entry(1).positive().get()).toBe(1);
      expect(entry('10').positive().get()).toBe(10);
      expect(entry(0.1).positive().get()).toBe(0.1);
    });

    it('rejects zero, negative, and non-numbers', () => {
      expect(entry(0).positive().get()).toBeNull();
      expect(entry(-5).positive().get()).toBeNull();
      expect(entry('-1').positive().get()).toBeNull();
      expect(entry('abc').positive().get()).toBeNull();
    });

    it('works with array mode for all positive numbers', () => {
      expect(entry(['1', 2, '3.5']).array().positive().get()).toEqual([
        1, 2, 3.5,
      ]);
    });

    it('fails array mode if any value is not positive', () => {
      expect(entry(['1', -2]).array().positive().get()).toBeNull();
    });
  });

  describe('Input.negative()', () => {
    it('accepts negative numbers', () => {
      expect(entry(-1).negative().get()).toBe(-1);
      expect(entry('-10').negative().get()).toBe(-10);
      expect(entry(-0.1).negative().get()).toBe(-0.1);
    });

    it('rejects zero, positive, and non-numbers', () => {
      expect(entry(0).negative().get()).toBeNull();
      expect(entry(5).negative().get()).toBeNull();
      expect(entry('1').negative().get()).toBeNull();
      expect(entry('abc').negative().get()).toBeNull();
    });

    it('works with array mode for all negative numbers', () => {
      expect(entry(['-1', -2, '-3.5']).array().negative().get()).toEqual([
        -1, -2, -3.5,
      ]);
    });

    it('fails array mode if any value is not negative', () => {
      expect(entry(['-1', 2]).array().negative().get()).toBeNull();
    });
  });

  describe('Input.boolean()', () => {
    const trueValues = ['true', '1', 'yes', 'on', ' TRUE ', 'Yes'];
    const falseValues = ['false', '0', 'no', 'off', ' FALSE ', 'No'];

    trueValues.forEach((val) => {
      it(`parses "${val}" as true`, () => {
        expect(entry(val).boolean().get()).toBe(true);
      });
    });

    falseValues.forEach((val) => {
      it(`parses "${val}" as false`, () => {
        expect(entry(val).boolean().get()).toBe(false);
      });
    });

    it('throws on unrecognized string', () => {
      expect(entry('maybe').boolean().get()).toBeNull();
    });

    it('throws on non-string value', () => {
      expect(entry(123).boolean().get()).toBeNull();
      expect(entry(null).boolean().get()).toBeNull();
      expect(entry(undefined).boolean().get()).toBeNull();
    });

    it('works with array mode on all boolean-like values', () => {
      expect(entry(['true', 'no', '1']).array().boolean().get()).toEqual([
        true,
        false,
        true,
      ]);
    });

    it('fails array mode if any value is invalid', () => {
      expect(entry(['true', 'maybe']).array().boolean().get()).toBeNull();
    });
  });

  describe('Input.json()', () => {
    it('parses valid JSON string', () => {
      expect(entry('{"a":1,"b":true}').json().get()).toEqual({ a: 1, b: true });
    });

    it('parses JSON array', () => {
      expect(entry('[1, 2, 3]').json().get()).toEqual([1, 2, 3]);
    });

    it('throws on invalid JSON', () => {
      expect(entry('{a:1}').json().get()).toBeNull();
      expect(entry('not json').json().get()).toBeNull();
    });

    it('throws on non-string input', () => {
      expect(entry(123).json().get()).toBeNull();
      expect(entry(null).json().get()).toBeNull();
    });

    it('works with array mode for valid JSON strings', () => {
      const arr = ['{"x":1}', '{"y":2}'];
      expect(entry(arr).array().json().get()).toEqual([{ x: 1 }, { y: 2 }]);
    });

    it('fails array mode if any JSON is invalid', () => {
      expect(entry(['{"x":1}', 'bad']).array().json().get()).toBeNull();
    });
  });

  describe('Input.get()', () => {
    it('returns the validated value when valid', () => {
      const val = entry('42').number();
      expect(val.get()).toBe(42);
    });

    it('returns null when value is null or undefined and no default is provided', () => {
      expect(entry(null).get()).toBeNull();
      expect(entry(undefined).get()).toBeNull();
    });

    it('returns the default value if the original value is null or undefined', () => {
      expect(entry(null).get('default')).toBe('default');
      expect(entry(undefined).get(123)).toBe(123);
    });

    it('returns the default value even if it is falsy', () => {
      expect(entry(null).get(false)).toBe(false);
      expect(entry(undefined).get(0)).toBe(0);
      expect(entry(undefined).get('')).toBe('');
    });

    it('returns the validated value if present even if a default is provided', () => {
      const val = entry('true').boolean();
      expect(val.get(false)).toBe(true);
    });
  });

  describe('Input.apply()', () => {
    it('sets value to null if the array is empty', () => {
      expect(new Input([]).array().number().get()).toBeNull();
    });
  });
});

describe('Entry', () => {
  const entry = (source: any) => new Entry(source);

  describe('constructor', () => {
    it('clones a plain object', () => {
      const source = { a: 'x' };
      const instance = entry(source);
      expect(instance.get('a')).toBe('x');
      expect(instance['data']).not.toBe(source);
    });

    it('clones an array of entries', () => {
      const instance = entry([{ a: '1' }, { a: '2' }]);
      expect(Array.isArray(instance['data'])).toBe(true);
      expect(instance['data'].length).toBe(2);
      expect(instance['data'][0].a).toBe('1');
    });

    it('defaults to empty object if input is null', () => {
      const instance = entry(null);
      expect(instance['data']).toEqual({});
    });

    it('defaults to empty object if input is undefined', () => {
      const instance = entry(undefined);
      expect(instance['data']).toEqual({});
    });
  });

  describe('has()', () => {
    describe('object', () => {
      const instance = entry({ bar: 'zero', foo: 'bar' });

      it('returns true if string key exists', () => {
        expect(instance.has('foo')).toBe(true);
        expect(instance.has('bar')).toBe(true);
      });

      it('returns false if number key is used (no coercion)', () => {
        expect(instance.has(0)).toBe(false);
        expect(instance.has(1)).toBe(false);
      });

      it('returns false if missing string key', () => {
        expect(instance.has('missing')).toBe(false);
      });
    });

    describe('array', () => {
      const instance = entry(['a', 'b']);

      it('returns true if numeric index exists', () => {
        expect(instance.has(0)).toBe(true);
        expect(instance.has(1)).toBe(true);
      });

      it('returns false if numeric index does not exist', () => {
        expect(instance.has(2)).toBe(false);
      });

      it('returns false for non-numeric string keys', () => {
        expect(instance.has('foo')).toBe(false);
        expect(instance.has('bar')).toBe(false);
      });
    });
  });

  describe('get()', () => {
    describe('object', () => {
      const objInstance = entry({ bar: 'zero', foo: 'bar' });

      it('returns value when using string key that exists', () => {
        expect(objInstance.get('foo')).toBe('bar');
        expect(objInstance.get('bar')).toBe('zero');
      });

      it('returns null when using number key (no coercion)', () => {
        expect(objInstance.get(0)).toBeNull();
        expect(objInstance.get(1)).toBeNull();
      });
    });

    describe('array', () => {
      const arrInstance = entry(['a', 'b', 'c']);

      it('returns value when using number index', () => {
        expect(arrInstance.get(0)).toBe('a');
        expect(arrInstance.get(2)).toBe('c');
      });

      it('returns null when using string key (no coercion)', () => {
        expect(arrInstance.get('bar')).toBeNull();
        expect(arrInstance.get('foo')).toBeNull();
      });
    });
  });

  describe('one()', () => {
    it('returns string if value is a string', () => {
      const instance = entry({ a: 'hello' });
      expect(instance.one('a')).toBe('hello');
    });

    it('returns first string if value is array', () => {
      const instance = entry({ b: ['x', 'y'] });
      expect(instance.one('b')).toBe('x');
    });

    it('returns null if key does not exist', () => {
      const instance = entry({});
      expect(instance.one('missing')).toBeNull();
    });

    it('returns null if value is neither string nor array', () => {
      const instance = entry({ c: 123 });
      expect(instance.one('c')).toBeNull();
    });
  });

  describe('ensure()', () => {
    const instance = entry({ a: 'hello', b: ['x', 'y'], c: null });

    it('returns an Input instance for existing string key', () => {
      const result = instance.ensure('a');
      expect(result).toBeInstanceOf(Input);
      expect(result.get()).toBe('hello');
    });

    it('returns an Input instance for existing array key', () => {
      const result = instance.ensure('b');
      expect(result).toBeInstanceOf(Input);
      expect(result.get()).toEqual(['x', 'y']);
    });

    it('returns an Input instance with null value for missing key', () => {
      const result = instance.ensure('missing');
      expect(result).toBeInstanceOf(Input);
      expect(result.get()).toBeNull();
    });

    it('returns an Input instance with null value if key value is explicitly null', () => {
      const result = instance.ensure('c');
      expect(result).toBeInstanceOf(Input);
      expect(result.get()).toBeNull();
    });

    it('supports numeric keys for array source', () => {
      const arrInstance = entry(['first', 'second']);
      const result = arrInstance.ensure(1);
      expect(result).toBeInstanceOf(Input);
      expect(result.get()).toBe('second');
    });

    it('returns Input with null for out-of-bound index on array source', () => {
      const arrInstance = entry(['first']);
      const result = arrInstance.ensure(5);
      expect(result).toBeInstanceOf(Input);
      expect(result.get()).toBeNull();
    });
  });
});
