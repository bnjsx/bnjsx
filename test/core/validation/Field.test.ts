import { Validator } from '../../../src/core/modules/Validator';
import { Field } from '../../../src/core/validation/Field';

function field(name = 'field', display?: string) {
  // @ts-ignore
  const validator = new Validator({}, {});
  return validator.field(name, display);
}

describe('Field', () => {
  describe('constructor', () => {
    test('Creates instance with valid name and messages', () => {
      const messages = { string: {}, array: {} }; // Minimal valid shape
      const field = new Field('tags', messages as any);

      expect(field).toBeInstanceOf(Field);
      expect(field['state'].name).toBe('tags');
      expect(field['messages']).toBe(messages);
    });

    test('Throws if name is not a string', () => {
      const messages = { string: {}, array: {} };

      expect(() => {
        new Field(null as any, messages as any);
      }).toThrow('Invalid field name: null');

      expect(() => {
        new Field(123 as any, messages as any);
      }).toThrow('Invalid field name: 123');
    });

    test('Throws if messages is not an object', () => {
      expect(() => {
        new Field('tags', null as any);
      }).toThrow('Invalid field messages: null');

      expect(() => {
        new Field('tags', 'oops' as any);
      }).toThrow('Invalid field messages: oops');
    });
  });

  describe('display', () => {
    it('should use display in error messages', () => {
      expect(
        field('email', 'The email address').email(3, 16).run({ email: 'foo' })
      ).toEqual(['The email address must be a valid email address.']);

      expect(
        field('ids', 'The array of ids')
          .array({ force: true })
          .ofIds()
          .run({ ids: 'foo' })
      ).toEqual(['The array of ids must contain valid IDs.']);
    });
  });

  describe('username()', () => {
    test('Fails if value is too short', () => {
      expect(field('username').username(3, 16).run({ username: 'ab' })).toEqual(
        [
          'username must be 3-16 chars, letters, numbers, hyphens or underscores.',
        ]
      );
    });

    test('Fails if value is too long', () => {
      expect(
        field('username')
          .username(3, 16)
          .run({ username: 'a'.repeat(17) })
      ).toEqual([
        'username must be 3-16 chars, letters, numbers, hyphens or underscores.',
      ]);
    });

    test('Fails if value contains invalid characters', () => {
      expect(
        field('username').username(3, 16).run({ username: 'john.doe' })
      ).toEqual([
        'username must be 3-16 chars, letters, numbers, hyphens or underscores.',
      ]);
    });

    test('Passes with valid username (min length)', () => {
      expect(
        field('username').username(3, 16).run({ username: 'abc' })
      ).toEqual([]);
    });

    test('Passes with valid username (max length)', () => {
      expect(
        field('username')
          .username(3, 16)
          .run({ username: 'a'.repeat(16) })
      ).toEqual([]);
    });

    test('Passes with hyphen and underscore', () => {
      expect(
        field('username').username(3, 16).run({ username: 'john_doe-123' })
      ).toEqual([]);
    });

    test('Uses default min=1 and max=20 when not provided', () => {
      expect(
        field('username')
          .username()
          .run({ username: 'a'.repeat(33) })
      ).toEqual([
        'username must be 3-20 chars, letters, numbers, hyphens or underscores.',
      ]);
    });

    test('Uses custom error message if provided', () => {
      expect(
        field('username')
          .username(3, 16, 'Invalid username format')
          .run({ username: 'john.doe' })
      ).toEqual(['Invalid username format']);
    });
  });

  describe('match()', () => {
    test('Fails if values do not match (both defined)', () => {
      expect(
        field('confirm').match('password').run({
          password: 'abc123',
          confirm: 'abc321',
        })
      ).toEqual(['confirm must match password.']);
    });

    test('Fails if value is defined but other field is undefined', () => {
      expect(
        field('confirm').match('password').run({
          confirm: 'abc123',
        })
      ).toEqual(['confirm must match password.']);
    });

    test('Passes if values match (strings)', () => {
      expect(
        field('confirm').match('password').run({
          password: 'abc123',
          confirm: 'abc123',
        })
      ).toEqual([]);
    });

    test('Passes if values match (numbers)', () => {
      expect(
        field('confirm').match('code').run({
          code: 123,
          confirm: 123,
        })
      ).toEqual([]);
    });

    test('Skips validation if field is missing (undefined)', () => {
      expect(
        field('confirm').match('password').run({
          password: 'abc123',
        })
      ).toEqual([]); // confirm is optional and not defined → skip
    });

    test('Skips validation if field is null (optional)', () => {
      expect(
        field('confirm').match('password').run({
          password: 'abc123',
          confirm: null,
        })
      ).toEqual([]); // confirm is optional and null → skip
    });

    test("Fails if field is required but missing and doesn't match", () => {
      expect(
        field('confirm').required().match('password').run({
          password: 'abc123',
        })
      ).toEqual(['confirm is required.', 'confirm must match password.']);
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('confirm').match('password', 'Passwords must match').run({
          password: 'abc123',
          confirm: 'wrong',
        })
      ).toEqual(['Passwords must match']);
    });
  });

  describe('creditCard()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('card').creditCard().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('card').creditCard().run({ card: null })).toEqual([]);
    });

    test('Fails if value is not a string', () => {
      expect(
        field('card').creditCard().run({ card: 4111111111111111 })
      ).toEqual(['card must be a valid credit card number.']);
    });

    test('Fails if value contains invalid characters', () => {
      expect(
        field('card').creditCard().run({ card: '4111-xxxx-xxxx-1234' })
      ).toEqual(['card must be a valid credit card number.']);
    });

    test('Fails if value is all zeros', () => {
      expect(
        field('card').creditCard().run({ card: '0000 0000 0000 0000' })
      ).toEqual(['card must be a valid credit card number.']);
    });

    test('Fails if value is not Luhn valid', () => {
      expect(
        field('card').creditCard().run({ card: '4111 1111 1111 1112' })
      ).toEqual(['card must be a valid credit card number.']);
    });

    test('Passes for a valid Visa card (Luhn valid)', () => {
      expect(
        field('card').creditCard().run({ card: '4111 1111 1111 1111' })
      ).toEqual([]);
    });

    test('Passes for a valid MasterCard (Luhn valid)', () => {
      expect(
        field('card').creditCard().run({ card: '5500 0000 0000 0004' })
      ).toEqual([]);
    });

    test('Passes for a valid Amex (Luhn valid)', () => {
      expect(
        field('card').creditCard().run({ card: '3400 0000 0000 009' })
      ).toEqual([]);
    });

    test('Custom error message is returned when provided', () => {
      expect(
        field('card')
          .creditCard('Invalid card!')
          .run({ card: '1234 5678 9012 3456' })
      ).toEqual(['Invalid card!']);
    });
  });

  describe('json()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('data').json().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('data').json().run({ data: null })).toEqual([]);
    });

    test('Fails if value is not a string', () => {
      expect(field('data').json().run({ data: 123 })).toEqual([
        'data must be valid JSON.',
      ]);
    });

    test('Fails if value is invalid JSON', () => {
      expect(field('data').json().run({ data: '{invalid}' })).toEqual([
        'data must be valid JSON.',
      ]);
    });

    test('Passes with valid JSON object', () => {
      expect(field('data').json().run({ data: '{"name":"John"}' })).toEqual([]);
    });

    test('Passes with valid JSON array', () => {
      expect(field('data').json().run({ data: '[1,2,3]' })).toEqual([]);
    });

    test('Passes with valid JSON primitive (string)', () => {
      expect(field('data').json().run({ data: '"hello"' })).toEqual([]);
    });

    test('Passes with valid JSON number', () => {
      expect(field('data').json().run({ data: '123' })).toEqual([]);
    });

    test('Passes with valid JSON boolean', () => {
      expect(field('data').json().run({ data: 'true' })).toEqual([]);
    });

    test('Custom error message is returned when provided', () => {
      expect(
        field('data').json('Not a valid JSON!').run({ data: '{oops}' })
      ).toEqual(['Not a valid JSON!']);
    });
  });

  describe('datetime()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('start').datetime().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('start').datetime().run({ start: null })).toEqual([]);
    });

    test('Fails if value is not a string', () => {
      expect(field('start').datetime().run({ start: 1234567890 })).toEqual([
        'start must be a valid datetime (yyyy-mm-dd hh:mm:ss).',
      ]);
    });

    test('Fails if value does not match datetime format', () => {
      expect(field('start').datetime().run({ start: '2025-08-03' })).toEqual([
        'start must be a valid datetime (yyyy-mm-dd hh:mm:ss).',
      ]);
    });

    test('Fails if value matches format but is not a real datetime', () => {
      expect(
        field('start').datetime().run({ start: '2025-02-36 12:00:00' })
      ).toEqual(['start must be a valid datetime (yyyy-mm-dd hh:mm:ss).']);
    });

    test('Passes with valid datetime string', () => {
      expect(
        field('start').datetime().run({ start: '2025-08-03 14:30:00' })
      ).toEqual([]);
    });

    test('Custom error message is returned when provided', () => {
      expect(
        field('start').datetime('Invalid datetime format').run({
          start: 'not-a-datetime',
        })
      ).toEqual(['Invalid datetime format']);
    });
  });

  describe('date()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('birthdate').date().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('birthdate').date().run({ birthdate: null })).toEqual([]);
    });

    test('Fails if value is not a string or number', () => {
      expect(
        field('birthdate')
          .date()
          .run({ birthdate: { year: 2025 } })
      ).toEqual(['birthdate must be a valid date.']);
    });

    test('Fails if value is an invalid date string', () => {
      expect(
        field('birthdate').date().run({ birthdate: 'not-a-date' })
      ).toEqual(['birthdate must be a valid date.']);
    });

    test('Fails if value is an invalid date number (NaN)', () => {
      expect(field('birthdate').date().run({ birthdate: NaN })).toEqual([
        'birthdate must be a valid date.',
      ]);
    });

    test('Passes with a valid ISO date string', () => {
      expect(
        field('birthdate').date().run({ birthdate: '2025-08-03' })
      ).toEqual([]);
    });

    test('Passes with a valid full date-time string', () => {
      expect(
        field('birthdate').date().run({ birthdate: '2025-08-03T12:00:00Z' })
      ).toEqual([]);
    });

    test('Passes with a valid timestamp (number)', () => {
      expect(
        field('birthdate').date().run({ birthdate: 1722681600000 })
      ).toEqual([]); // Valid timestamp
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('birthdate')
          .date('Not a valid date!')
          .run({ birthdate: 'nonsense' })
      ).toEqual(['Not a valid date!']);
    });
  });

  describe('in()', () => {
    test('Throws if allowed values is not an array', () => {
      expect(() => {
        // @ts-ignore
        field('status').in(null);
      }).toThrow('Expected an array of allowed values');
    });

    test('Skips validation if value is undefined (optional)', () => {
      expect(field('status').in(['active', 'pending']).run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(
        field('status').in(['active', 'pending']).run({ status: null })
      ).toEqual([]);
    });

    test('Fails if value is not in allowed list', () => {
      expect(
        field('status').in(['active', 'pending']).run({ status: 'disabled' })
      ).toEqual(['status must be: active, pending.']);
    });

    test('Passes if value is in allowed list', () => {
      expect(
        field('status').in(['active', 'pending']).run({ status: 'active' })
      ).toEqual([]);
    });

    test('Passes if value is number and in allowed list', () => {
      expect(field('level').in([1, 2, 3]).run({ level: 2 })).toEqual([]);
    });

    test('Custom error message is returned when provided', () => {
      expect(
        field('status')
          .in(['active', 'pending'], 'Invalid status!')
          .run({ status: 'disabled' })
      ).toEqual(['Invalid status!']);
    });
  });

  describe('boolean()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('flag').boolean().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('flag').boolean().run({ flag: null })).toEqual([]);
    });

    test('Fails if value is not a string or boolean', () => {
      expect(field('flag').boolean().run({ flag: 123 })).toEqual([
        'flag must be boolean.',
      ]);
    });

    test('Passes if value is boolean true', () => {
      expect(field('flag').boolean().run({ flag: true })).toEqual([]);
    });

    test('Passes if value is boolean false', () => {
      expect(field('flag').boolean().run({ flag: false })).toEqual([]);
    });

    const strings = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
    strings.forEach((val) => {
      test(`Passes if value is string '${val}' (case insensitive)`, () => {
        expect(
          field('flag').boolean().run({ flag: val.toUpperCase() })
        ).toEqual([]);
      });
    });

    test('Fails if string value is not in allowed boolean strings', () => {
      expect(field('flag').boolean().run({ flag: 'maybe' })).toEqual([
        'flag must be boolean.',
      ]);
    });

    test('Passes if string value has surrounding spaces', () => {
      expect(field('flag').boolean().run({ flag: ' yes ' })).toEqual([]);
    });

    test('Custom error message is returned when provided', () => {
      expect(
        field('flag').boolean('Must be a boolean!').run({ flag: 'nope' })
      ).toEqual(['Must be a boolean!']);
    });
  });

  describe('positive()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('amount').positive().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('amount').positive().run({ amount: null })).toEqual([]);
    });

    test('Passes if value is a positive number', () => {
      expect(field('amount').positive().run({ amount: 42 })).toEqual([]);
    });

    test('Passes if value is a positive number string', () => {
      expect(field('amount').positive().run({ amount: '42' })).toEqual([]);
    });

    test('Fails if value is zero', () => {
      expect(field('amount').positive().run({ amount: 0 })).toEqual([
        'amount must be a positive number.',
      ]);
    });

    test('Fails if value is a negative number', () => {
      expect(field('amount').positive().run({ amount: -1 })).toEqual([
        'amount must be a positive number.',
      ]);
    });

    test('Fails if value is a negative number string', () => {
      expect(field('amount').positive().run({ amount: '-1' })).toEqual([
        'amount must be a positive number.',
      ]);
    });

    test('Fails if value is a non-numeric string', () => {
      expect(field('amount').positive().run({ amount: 'abc' })).toEqual([
        'amount must be a positive number.',
      ]);
    });

    test('Fails if value is an empty string', () => {
      expect(field('amount').positive().run({ amount: '' })).toEqual([
        'amount must be a positive number.',
      ]);
    });

    test('Custom error message is returned when provided', () => {
      expect(
        field('amount').positive('Must be positive!').run({ amount: -5 })
      ).toEqual(['Must be positive!']);
    });
  });

  describe('negative()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('debt').negative().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('debt').negative().run({ debt: null })).toEqual([]);
    });

    test('Passes if value is a negative number', () => {
      expect(field('debt').negative().run({ debt: -42 })).toEqual([]);
    });

    test('Passes if value is a negative number string', () => {
      expect(field('debt').negative().run({ debt: '-42' })).toEqual([]);
    });

    test('Fails if value is zero', () => {
      expect(field('debt').negative().run({ debt: 0 })).toEqual([
        'debt must be a negative number.',
      ]);
    });

    test('Fails if value is a positive number', () => {
      expect(field('debt').negative().run({ debt: 1 })).toEqual([
        'debt must be a negative number.',
      ]);
    });

    test('Fails if value is a positive number string', () => {
      expect(field('debt').negative().run({ debt: '1' })).toEqual([
        'debt must be a negative number.',
      ]);
    });

    test('Fails if value is a non-numeric string', () => {
      expect(field('debt').negative().run({ debt: 'abc' })).toEqual([
        'debt must be a negative number.',
      ]);
    });

    test('Fails if value is an empty string', () => {
      expect(field('debt').negative().run({ debt: '' })).toEqual([
        'debt must be a negative number.',
      ]);
    });

    test('Custom error message is returned when provided', () => {
      expect(
        field('debt').negative('Must be negative!').run({ debt: 5 })
      ).toEqual(['Must be negative!']);
    });
  });

  describe('integer()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('count').integer().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('count').integer().run({ count: null })).toEqual([]);
    });

    test('Passes if value is an integer number', () => {
      expect(field('count').integer().run({ count: 42 })).toEqual([]);
    });

    test('Passes if value is an integer string', () => {
      expect(field('count').integer().run({ count: '42' })).toEqual([]);
    });

    test('Fails if value is a float number', () => {
      expect(field('count').integer().run({ count: 3.14 })).toEqual([
        'count must be an integer.',
      ]);
    });

    test('Fails if value is a float string', () => {
      expect(field('count').integer().run({ count: '3.14' })).toEqual([
        'count must be an integer.',
      ]);
    });

    test('Fails if value is a non-numeric string', () => {
      expect(field('count').integer().run({ count: 'abc' })).toEqual([
        'count must be an integer.',
      ]);
    });

    test('Fails if value is an object', () => {
      expect(
        field('count')
          .integer()
          .run({ count: { num: 42 } })
      ).toEqual(['count must be an integer.']);
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('count').integer('Must be int!').run({ count: 3.5 })
      ).toEqual(['Must be int!']);
    });
  });

  describe('float()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('price').float().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('price').float().run({ price: null })).toEqual([]);
    });

    test('Passes if value is a float number', () => {
      expect(field('price').float().run({ price: 3.14 })).toEqual([]);
    });

    test('Fails if value is an integer number', () => {
      expect(field('price').float().run({ price: 42 })).toEqual([
        'price must be a decimal number.',
      ]);
    });

    test('Passes if value is a float string', () => {
      expect(field('price').float().run({ price: '3.14' })).toEqual([]);
    });

    test('Fails if value is an integer string', () => {
      expect(field('price').float().run({ price: '42' })).toEqual([
        'price must be a decimal number.',
      ]);
    });

    test('Fails if value is a non-numeric string', () => {
      expect(field('price').float().run({ price: 'abc' })).toEqual([
        'price must be a decimal number.',
      ]);
    });

    test('Fails if value is an object', () => {
      expect(
        field('price')
          .float()
          .run({ price: { value: 3.14 } })
      ).toEqual(['price must be a decimal number.']);
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('price').float('Must be a float!').run({ price: 'abc' })
      ).toEqual(['Must be a float!']);
    });
  });

  describe('number()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('value').number().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('value').number().run({ value: null })).toEqual([]);
    });

    test('Passes if value is a number', () => {
      expect(field('value').number().run({ value: 123 })).toEqual([]);
    });

    test('Passes if value is a numeric string', () => {
      expect(field('value').number().run({ value: '123.5' })).toEqual([]);
    });

    test('Fails if value is a non-numeric string', () => {
      expect(field('value').number().run({ value: 'abc' })).toEqual([
        'value must be a number.',
      ]);
    });

    test('Fails if value is empty string', () => {
      expect(field('value').number().run({ value: '' })).toEqual([
        'value must be a number.',
      ]);
    });

    test('Fails if value is an object', () => {
      expect(field('value').number().run({ value: {} })).toEqual([
        'value must be a number.',
      ]);
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('value').number('Must be numeric!').run({ value: 'abc' })
      ).toEqual(['Must be numeric!']);
    });
  });

  describe('between()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('score').between(1, 10).run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('score').between(1, 10).run({ score: null })).toEqual([]);
    });

    test('Fails if value is neither string nor number', () => {
      expect(field('score').between(1, 10).run({ score: {} })).toEqual([
        'score must be a number between 1 and 10.',
      ]);
    });

    test('Fails if value is not a number (NaN)', () => {
      expect(field('score').between(1, 10).run({ score: 'abc' })).toEqual([
        'score must be a number between 1 and 10.',
      ]);
    });

    test('Fails if value is less than min', () => {
      expect(field('score').between(1, 10).run({ score: 0 })).toEqual([
        'score must be a number between 1 and 10.',
      ]);
    });

    test('Fails if value is greater than max', () => {
      expect(field('score').between(1, 10).run({ score: 11 })).toEqual([
        'score must be a number between 1 and 10.',
      ]);
    });

    test('Passes if value equals min', () => {
      expect(field('score').between(1, 10).run({ score: 1 })).toEqual([]);
    });

    test('Passes if value equals max', () => {
      expect(field('score').between(1, 10).run({ score: 10 })).toEqual([]);
    });

    test('Passes if value is between min and max', () => {
      expect(field('score').between(1, 10).run({ score: 5 })).toEqual([]);
    });

    test('Passes if value is a numeric string within bounds', () => {
      expect(field('score').between(1, 10).run({ score: '7' })).toEqual([]);
    });

    test('Uses default min=0 and max=Number.MAX_SAFE_INTEGER if not provided', () => {
      expect(field('score').between().run({ score: -1 })).toEqual([
        `score must be a number between 0 and ${Number.MAX_SAFE_INTEGER}.`,
      ]);
      expect(field('score').between().run({ score: 100 })).toEqual([]);
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('score').between(1, 10, 'Out of range!').run({ score: 20 })
      ).toEqual(['Out of range!']);
    });
  });

  describe('phone()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('phone').phone().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('phone').phone().run({ phone: null })).toEqual([]);
    });

    test('Passes valid E.164 phone numbers', () => {
      expect(field('phone').phone().run({ phone: '+12345678' })).toEqual([]);
      expect(field('phone').phone().run({ phone: '+19876543210' })).toEqual([]);
      expect(field('phone').phone().run({ phone: '+123456789012345' })).toEqual(
        []
      );

      // My phone number ;)
      expect(field('phone').phone().run({ phone: '+212694339037' })).toEqual(
        []
      );
    });

    test('Fails for invalid phone numbers', () => {
      expect(field('phone').phone().run({ phone: '+12' })).toEqual([
        'phone must be a valid phone number.',
      ]);
      expect(field('phone').phone().run({ phone: '12345678' })).toEqual([
        'phone must be a valid phone number.',
      ]);
      expect(field('phone').phone().run({ phone: '+0123456789' })).toEqual([
        'phone must be a valid phone number.',
      ]);
      expect(
        field('phone').phone().run({ phone: '+1234567890123456' })
      ).toEqual(['phone must be a valid phone number.']);
    });

    test('Custom error message is returned when provided', () => {
      expect(
        field('phone').phone('Invalid phone!').run({ phone: '1234' })
      ).toEqual(['Invalid phone!']);
    });
  });

  describe('hex()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('color').hex().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('color').hex().run({ color: null })).toEqual([]);
    });

    test('Passes valid 3-digit hex codes', () => {
      expect(field('color').hex().run({ color: '#FFF' })).toEqual([]);
      expect(field('color').hex().run({ color: '#abc' })).toEqual([]);
    });

    test('Passes valid 6-digit hex codes', () => {
      expect(field('color').hex().run({ color: '#123456' })).toEqual([]);
      expect(field('color').hex().run({ color: '#abcdef' })).toEqual([]);
    });

    test('Fails invalid hex codes', () => {
      expect(field('color').hex().run({ color: '123456' })).toEqual([
        'color must be a valid hex color.',
      ]);
      expect(field('color').hex().run({ color: '#12345' })).toEqual([
        'color must be a valid hex color.',
      ]);
      expect(field('color').hex().run({ color: '#1234567' })).toEqual([
        'color must be a valid hex color.',
      ]);
      expect(field('color').hex().run({ color: '#GGG' })).toEqual([
        'color must be a valid hex color.',
      ]);
    });

    test('Custom error message is returned when provided', () => {
      expect(field('color').hex('Invalid hex!').run({ color: 'zzz' })).toEqual([
        'Invalid hex!',
      ]);
    });
  });

  describe('alpha()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('name').alpha().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('name').alpha().run({ name: null })).toEqual([]);
    });

    test('Passes valid alphabetic strings', () => {
      expect(field('name').alpha().run({ name: 'John' })).toEqual([]);
      expect(field('name').alpha().run({ name: 'Alpha' })).toEqual([]);
    });

    test('Fails string with numbers or symbols', () => {
      expect(field('name').alpha().run({ name: 'John123' })).toEqual([
        'name must contain only letters.',
      ]);
      expect(field('name').alpha().run({ name: 'hello-world' })).toEqual([
        'name must contain only letters.',
      ]);
      expect(field('name').alpha().run({ name: '123' })).toEqual([
        'name must contain only letters.',
      ]);
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('name').alpha('Only letters allowed!').run({ name: 'John123' })
      ).toEqual(['Only letters allowed!']);
    });
  });

  describe('alphaNum()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('username').alphaNum().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('username').alphaNum().run({ username: null })).toEqual([]);
    });

    test('Passes valid alphanumeric strings', () => {
      expect(field('username').alphaNum().run({ username: 'john123' })).toEqual(
        []
      );
      expect(
        field('username').alphaNum().run({ username: 'AlphaBeta' })
      ).toEqual([]);
      expect(field('username').alphaNum().run({ username: 'A1B2C3' })).toEqual(
        []
      );
    });

    test('Fails string with special characters or spaces', () => {
      expect(
        field('username').alphaNum().run({ username: 'john_doe' })
      ).toEqual(['username must contain only letters and numbers.']);
      expect(
        field('username').alphaNum().run({ username: 'user 123' })
      ).toEqual(['username must contain only letters and numbers.']);
      expect(field('username').alphaNum().run({ username: '123!' })).toEqual([
        'username must contain only letters and numbers.',
      ]);
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('username')
          .alphaNum('Only letters and numbers!')
          .run({ username: 'user!' })
      ).toEqual(['Only letters and numbers!']);
    });
  });

  describe('id()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('user_id').id().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('user_id').id().run({ user_id: null })).toEqual([]);
    });

    test('Passes with positive integers', () => {
      expect(field('user_id').id().run({ user_id: 1 })).toEqual([]);
      expect(field('user_id').id().run({ user_id: 123 })).toEqual([]);
    });

    test('Passes with numeric strings representing positive integers', () => {
      expect(field('user_id').id().run({ user_id: '1' })).toEqual([]);
      expect(field('user_id').id().run({ user_id: '42' })).toEqual([]);
      expect(field('user_id').id().run({ user_id: '  99  ' })).toEqual([]);
    });

    test('Fails if number is zero or negative', () => {
      expect(field('user_id').id().run({ user_id: 0 })).toEqual([
        'user_id must be a valid id.',
      ]);
      expect(field('user_id').id().run({ user_id: -10 })).toEqual([
        'user_id must be a valid id.',
      ]);
    });

    test('Fails if string is negative or zero', () => {
      expect(field('user_id').id().run({ user_id: '-5' })).toEqual([
        'user_id must be a valid id.',
      ]);
      expect(field('user_id').id().run({ user_id: '0' })).toEqual([
        'user_id must be a valid id.',
      ]);
    });

    test('Fails for non-integer values', () => {
      expect(field('user_id').id().run({ user_id: 3.14 })).toEqual([
        'user_id must be a valid id.',
      ]);
      expect(field('user_id').id().run({ user_id: '7.2' })).toEqual([
        'user_id must be a valid id.',
      ]);
    });

    test('Fails for non-numeric input', () => {
      expect(field('user_id').id().run({ user_id: 'abc' })).toEqual([
        'user_id must be a valid id.',
      ]);
      expect(field('user_id').id().run({ user_id: {} })).toEqual([
        'user_id must be a valid id.',
      ]);
      expect(field('user_id').id().run({ user_id: [] })).toEqual([
        'user_id must be a valid id.',
      ]);
    });

    test('Custom message is returned if provided', () => {
      expect(
        field('user_id').id('ID is required').run({ user_id: '0' })
      ).toEqual(['ID is required']);
    });
  });

  describe('route()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('route').route().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('route').route().run({ route: null })).toEqual([]);
    });

    test('Passes valid clean routes', () => {
      expect(field('route').route().run({ route: '/users' })).toEqual([]);
      expect(field('route').route().run({ route: '/blog/posts/123' })).toEqual(
        []
      );

      expect(
        field('route').route().run({ route: '/api/v1/resources' })
      ).toEqual([]);

      expect(field('route').route().run({ route: '/one-two-three' })).toEqual(
        []
      );
    });

    test('Fails routes with file extensions or query strings', () => {
      expect(field('route').route().run({ route: '/file.txt' })).toEqual([
        'route must be a valid route.',
      ]);
      expect(
        field('route').route().run({ route: '/img/photo.jpg?size=large' })
      ).toEqual(['route must be a valid route.']);
      expect(field('route').route().run({ route: 'home/index.html' })).toEqual([
        'route must be a valid route.',
      ]);
    });

    test('Fails values not starting with a slash', () => {
      expect(field('route').route().run({ route: 'users' })).toEqual([
        'route must be a valid route.',
      ]);
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('route')
          .route('Invalid route format!')
          .run({ route: '/file.txt' })
      ).toEqual(['Invalid route format!']);
    });
  });

  describe('url()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('site').url().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('site').url().run({ site: null })).toEqual([]);
    });

    test('Passes valid HTTP and HTTPS URLs', () => {
      expect(field('site').url().run({ site: 'http://example.com' })).toEqual(
        []
      );
      expect(field('site').url().run({ site: 'https://example.com' })).toEqual(
        []
      );
      expect(
        field('site')
          .url()
          .run({ site: 'https://www.example.co.uk/path?query=1' })
      ).toEqual([]);
    });

    test('Fails if value is not a valid URL format', () => {
      expect(field('site').url().run({ site: 'ftp://example.com' })).toEqual([
        'site must be a valid URL.',
      ]);
      expect(field('site').url().run({ site: 'example.com' })).toEqual([
        'site must be a valid URL.',
      ]);
      expect(field('site').url().run({ site: 'https//example.com' })).toEqual([
        'site must be a valid URL.',
      ]);
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('site').url('Invalid website link!').run({ site: 'invalid-url' })
      ).toEqual(['Invalid website link!']);
    });
  });

  describe('href()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('path').href().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('path').href().run({ path: null })).toEqual([]);
    });

    test('Passes valid paths with and without query strings', () => {
      expect(field('path').href().run({ path: '/home' })).toEqual([]);
      expect(field('path').href().run({ path: '/user?id=42' })).toEqual([]);
      expect(
        field('path').href().run({ path: '/api/data?page=1&limit=10' })
      ).toEqual([]);
      expect(field('path').href().run({ path: '/' })).toEqual([]);
    });

    test('Fails if path does not start with "/"', () => {
      expect(field('path').href().run({ path: 'home' })).toEqual([
        'path must be a valid href.',
      ]);
    });

    test('Fails if path contains space or invalid characters', () => {
      expect(field('path').href().run({ path: '/home page' })).toEqual([
        'path must be a valid href.',
      ]);
      expect(field('path').href().run({ path: '/user?name=John Doe' })).toEqual(
        ['path must be a valid href.']
      );
    });

    test('Fails if path includes fragment/hash (#)', () => {
      expect(field('path').href().run({ path: '/home#section' })).toEqual([
        'path must be a valid href.',
      ]);
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('path').href('Not a clean path').run({ path: 'invalid' })
      ).toEqual(['Not a clean path']);
    });
  });

  describe('path()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('file').path().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('file').path().run({ file: null })).toEqual([]);
    });

    test('Passes valid Unix-style file paths', () => {
      expect(field('file').path().run({ file: '/home/user/file.txt' })).toEqual(
        []
      );
      expect(field('file').path().run({ file: '/var/www/index.html' })).toEqual(
        []
      );
      expect(field('file').path().run({ file: '/tmp/data.backup' })).toEqual(
        []
      );
      expect(field('file').path().run({ file: '/' })).toEqual([]);
    });

    test('Fails if path does not start with "/"', () => {
      expect(field('file').path().run({ file: 'home/user/file.txt' })).toEqual([
        'file must be a valid path.',
      ]);
    });

    test('Fails if path contains space', () => {
      expect(
        field('file').path().run({ file: '/home/user/my file.txt' })
      ).toEqual(['file must be a valid path.']);
    });

    test('Fails if path contains query string or hash', () => {
      expect(
        field('file').path().run({ file: '/file.txt?download=true' })
      ).toEqual(['file must be a valid path.']);
      expect(field('file').path().run({ file: '/file.txt#section' })).toEqual([
        'file must be a valid path.',
      ]);
    });

    test('Custom error message is used when provided', () => {
      expect(
        field('file').path('Invalid path').run({ file: 'bad/path' })
      ).toEqual(['Invalid path']);
    });
  });

  describe('email()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('email').email().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('email').email().run({ email: null })).toEqual([]);
    });

    test('Passes with valid email addresses', () => {
      expect(field('email').email().run({ email: 'user@example.com' })).toEqual(
        []
      );
      expect(
        field('email').email().run({ email: 'john.doe@domain.co.uk' })
      ).toEqual([]);
    });

    test('Fails if email is too short', () => {
      expect(field('email').email(10).run({ email: 'a@b.co' })).toEqual([
        'email must be at least 10 characters.',
      ]);
    });

    test('Fails if email is too long', () => {
      const longEmail = 'a'.repeat(250) + '@e.com';
      expect(field('email').email().run({ email: longEmail })).toEqual([
        'email must be at most 254 characters.',
      ]);
    });

    test('Fails if email is not in valid format', () => {
      expect(field('email').email().run({ email: 'notanemail' })).toEqual([
        'email must be a valid email address.',
      ]);
      expect(field('email').email().run({ email: 'user@.com' })).toEqual([
        'email must be a valid email address.',
      ]);
      expect(field('email').email().run({ email: '@domain.com' })).toEqual([
        'email must be a valid email address.',
      ]);
    });

    test('Custom message is returned if email format is invalid', () => {
      expect(
        field('email')
          .email(6, 254, 'Invalid email format')
          .run({ email: 'x@x' })
      ).toEqual([
        'email must be at least 6 characters.',
        'Invalid email format',
      ]);
    });
  });

  describe('hasLower()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('field').hasLower().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('field').hasLower().run({ field: null })).toEqual([]);
    });

    test('Passes when value contains lowercase letter', () => {
      expect(field('field').hasLower().run({ field: 'abc' })).toEqual([]);
      expect(field('field').hasLower().run({ field: 'ABCd' })).toEqual([]);
    });

    test('Fails when value does not contain lowercase letter', () => {
      expect(field('field').hasLower().run({ field: 'ABC' })).toEqual([
        'field must contain a lowercase letter.',
      ]);
      expect(field('field').hasLower().run({ field: '123' })).toEqual([
        'field must contain a lowercase letter.',
      ]);
    });

    test('Uses custom error message when provided', () => {
      expect(
        field('field').hasLower('Custom error').run({ field: '123' })
      ).toEqual(['Custom error']);
    });
  });

  describe('hasUpper()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('field').hasUpper().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('field').hasUpper().run({ field: null })).toEqual([]);
    });

    test('Passes when value contains uppercase letter', () => {
      expect(field('field').hasUpper().run({ field: 'ABC' })).toEqual([]);
      expect(field('field').hasUpper().run({ field: 'abcD' })).toEqual([]);
    });

    test('Fails when value does not contain uppercase letter', () => {
      expect(field('field').hasUpper().run({ field: 'abc' })).toEqual([
        'field must contain an uppercase letter.',
      ]);
      expect(field('field').hasUpper().run({ field: '123' })).toEqual([
        'field must contain an uppercase letter.',
      ]);
    });

    test('Uses custom error message when provided', () => {
      expect(
        field('field').hasUpper('Custom error').run({ field: '123' })
      ).toEqual(['Custom error']);
    });
  });

  describe('hasLetter()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('field').hasLetter().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('field').hasLetter().run({ field: null })).toEqual([]);
    });

    test('Passes when value contains letter', () => {
      expect(field('field').hasLetter().run({ field: 'abc' })).toEqual([]);
      expect(field('field').hasLetter().run({ field: 'ABC' })).toEqual([]);
      expect(field('field').hasLetter().run({ field: 'abc123' })).toEqual([]);
    });

    test('Fails when value does not contain letter', () => {
      expect(field('field').hasLetter().run({ field: '123' })).toEqual([
        'field must contain a letter.',
      ]);
      expect(field('field').hasLetter().run({ field: '!@#' })).toEqual([
        'field must contain a letter.',
      ]);
    });

    test('Uses custom error message when provided', () => {
      expect(
        field('field').hasLetter('Custom error').run({ field: '123' })
      ).toEqual(['Custom error']);
    });
  });

  describe('hasNumber()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('field').hasNumber().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('field').hasNumber().run({ field: null })).toEqual([]);
    });

    test('Passes when value contains number', () => {
      expect(field('field').hasNumber().run({ field: '1' })).toEqual([]);
      expect(field('field').hasNumber().run({ field: 'abc123' })).toEqual([]);
    });

    test('Fails when value does not contain number', () => {
      expect(field('field').hasNumber().run({ field: 'abc' })).toEqual([
        'field must contain a number.',
      ]);
      expect(field('field').hasNumber().run({ field: '!@#' })).toEqual([
        'field must contain a number.',
      ]);
    });

    test('Uses custom error message when provided', () => {
      expect(
        field('field').hasNumber('Custom error').run({ field: 'abc' })
      ).toEqual(['Custom error']);
    });
  });

  describe('hasSpecial()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('field').hasSpecial().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('field').hasSpecial().run({ field: null })).toEqual([]);
    });

    test('Passes when value contains special character', () => {
      expect(field('field').hasSpecial().run({ field: '!' })).toEqual([]);
      expect(field('field').hasSpecial().run({ field: 'abc!' })).toEqual([]);
      expect(field('field').hasSpecial().run({ field: '?{}' })).toEqual([]);
    });

    test('Fails when value does not contain special character', () => {
      expect(field('field').hasSpecial().run({ field: 'abc' })).toEqual([
        'field must contain a special character.',
      ]);
      expect(field('field').hasSpecial().run({ field: '123' })).toEqual([
        'field must contain a special character.',
      ]);
    });

    test('Uses custom error message when provided', () => {
      expect(
        field('field').hasSpecial('Custom error').run({ field: 'abc' })
      ).toEqual(['Custom error']);
    });
  });

  describe('hasSpace()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('field').hasSpace().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('field').hasSpace().run({ field: null })).toEqual([]);
    });

    test('Passes when value contains whitespace', () => {
      expect(field('field').hasSpace().run({ field: ' ' })).toEqual([]);
      expect(field('field').hasSpace().run({ field: 'a b' })).toEqual([]);
      expect(field('field').hasSpace().run({ field: '\t' })).toEqual([]);
      expect(field('field').hasSpace().run({ field: '\n' })).toEqual([]);
    });

    test('Fails when value does not contain whitespace', () => {
      expect(field('field').hasSpace().run({ field: 'abc' })).toEqual([
        'field must contain a space.',
      ]);
      expect(field('field').hasSpace().run({ field: '123' })).toEqual([
        'field must contain a space.',
      ]);
    });

    test('Uses custom error message when provided', () => {
      expect(
        field('field').hasSpace('Custom error').run({ field: 'abc' })
      ).toEqual(['Custom error']);
    });
  });

  describe('min()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('field').min(3).run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('field').min(3).run({ field: null })).toEqual([]);
    });

    test('passes if no minimum is specified (defaults to 0)', () => {
      expect(field('field').min().run({ field: 'a' })).toEqual([]);
      expect(field('field').min().run({ field: '' })).toEqual([]); // empty string is >= 0
    });

    test('Fails if value is not a string', () => {
      expect(field('field').min(3).run({ field: 123 })).toEqual([
        'field must be at least 3 characters.',
      ]);
    });

    test('Fails if string length is less than minimum without trim', () => {
      expect(field('field').min(4).run({ field: 'abc' })).toEqual([
        'field must be at least 4 characters.',
      ]);
    });

    test('Passes if string length equals or exceeds minimum without trim', () => {
      expect(field('field').min(3).run({ field: 'abc' })).toEqual([]);
      expect(field('field').min(3).run({ field: 'abcd' })).toEqual([]);
    });

    test('Fails if string length less than minimum with trimming enabled', () => {
      const f = field('field').trim();
      expect(f.min(4).run({ field: ' abc ' })).toEqual([
        'field must be at least 4 characters.',
      ]); // 'abc' length 3 after trim
    });

    test('Passes if string length meets minimum with trimming enabled', () => {
      const f = field('field').trim();
      expect(f.min(3).run({ field: ' abc ' })).toEqual([]); // 'abc' length 3 after trim
    });

    test('Uses custom error message if provided', () => {
      expect(
        field('field').min(4, 'Custom min error').run({ field: 'abc' })
      ).toEqual(['Custom min error']);
    });
  });

  describe('max()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('field').max(5).run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('field').max(5).run({ field: null })).toEqual([]);
    });

    test('passes if no maximum is specified (defaults to very large number)', () => {
      const long = 'a'.repeat(10_000); // much smaller than MAX_SAFE_INTEGER
      expect(field('field').max().run({ field: long })).toEqual([]);
    });

    test('Fails if value is not a string', () => {
      expect(field('field').max(5).run({ field: 123 })).toEqual([
        'field must be at most 5 characters.',
      ]);
    });

    test('Fails if string length exceeds maximum without trim', () => {
      expect(field('field').max(3).run({ field: 'abcd' })).toEqual([
        'field must be at most 3 characters.',
      ]);
    });

    test('Passes if string length equals or below maximum without trim', () => {
      expect(field('field').max(3).run({ field: 'abc' })).toEqual([]);
      expect(field('field').max(3).run({ field: 'ab' })).toEqual([]);
    });

    test('Fails if string length exceeds maximum with trimming enabled', () => {
      const f = field('field').trim();
      expect(f.max(3).run({ field: ' abcd ' })).toEqual([
        'field must be at most 3 characters.',
      ]); // 'abcd' length 4 after trim
    });

    test('Passes if string length is within maximum with trimming enabled', () => {
      const f = field('field').trim();
      expect(f.max(4).run({ field: ' abcd ' })).toEqual([]); // 'abcd' length 4 after trim
    });

    test('Uses custom error message if provided', () => {
      expect(
        field('field').max(3, 'Custom max error').run({ field: 'abcd' })
      ).toEqual(['Custom max error']);
    });
  });

  describe('length()', () => {
    test('Throws error if length is not a number', () => {
      const f = field('field');
      expect(() => f.length('not-a-number' as any)).toThrow(
        'Invalid length: not-a-number'
      );
    });

    test('Skips validation if value is undefined (optional)', () => {
      expect(field('field').length(3).run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('field').length(3).run({ field: null })).toEqual([]);
    });

    test('Fails if value is not a string', () => {
      expect(field('field').length(3).run({ field: 123 })).toEqual([
        'field must be exactly 3 characters.',
      ]);
    });

    test('Fails if string length does not equal specified length without trim', () => {
      expect(field('field').length(4).run({ field: 'abc' })).toEqual([
        'field must be exactly 4 characters.',
      ]);
      expect(field('field').length(2).run({ field: 'abc' })).toEqual([
        'field must be exactly 2 characters.',
      ]);
    });

    test('Passes if string length equals specified length without trim', () => {
      expect(field('field').length(3).run({ field: 'abc' })).toEqual([]);
    });

    test('Fails if string length does not equal specified length with trimming enabled', () => {
      const f = field('field').trim();
      expect(f.length(3).run({ field: ' abc ' })).toEqual([]); // trimmed length 3
      expect(f.length(4).run({ field: ' abc ' })).toEqual([
        'field must be exactly 4 characters.',
      ]);
    });

    test('Uses custom error message if provided', () => {
      expect(
        field('field').length(3, 'Custom length error').run({ field: 'ab' })
      ).toEqual(['Custom length error']);
    });
  });

  describe('test()', () => {
    test('throws if message is not a string', () => {
      expect(() => field('field').test(() => true, undefined as any)).toThrow(
        'Invalid message: undefined'
      );
    });

    test('throws if validation function is not a function', () => {
      expect(() => field('field').test('not-a-fn' as any, 'message')).toThrow(
        'Invalid function: not-a-fn'
      );
    });

    test('passes automatically if value is null or undefined and field is optional', () => {
      expect(
        field('field')
          .test(() => false, 'error')
          .run({})
      ).toEqual([]);
      expect(
        field('field')
          .test(() => false, 'error')
          .run({ field: null })
      ).toEqual([]);
    });

    test('runs the validation function and returns error if it returns false', () => {
      expect(
        field('field')
          .test((v) => v === 'ok', 'invalid value')
          .run({ field: 'no' })
      ).toEqual(['invalid value']);
    });

    test('passes if the validation function returns true', () => {
      expect(
        field('field')
          .test((v) => v === 'ok', 'invalid value')
          .run({ field: 'ok' })
      ).toEqual([]);
    });
  });

  describe('required()', () => {
    test('sets the field as non-optional', () => {
      const f = field('field').required();
      expect(f['optional']).toBe(false);
    });

    test('fails if the field is missing', () => {
      expect(field('field').required().run({})).toEqual(['field is required.']);
    });

    test('fails if the field is undefined', () => {
      expect(field('field').required().run({ field: undefined })).toEqual([
        'field is required.',
      ]);
    });

    test('fails if the field is null', () => {
      expect(field('field').required().run({ field: null })).toEqual([
        'field is required.',
      ]);
    });

    test('fails if the field is an empty string', () => {
      expect(field('field').required().run({ field: '' })).toEqual([
        'field is required.',
      ]);
    });

    test('fails if the field is whitespace only', () => {
      expect(field('field').required().run({ field: '   ' })).toEqual([
        'field is required.',
      ]);
    });

    test('passes if the field is zero (0)', () => {
      expect(field('field').required().run({ field: 0 })).toEqual([]);
    });

    test('passes if the field is boolean false', () => {
      expect(field('field').required().run({ field: false })).toEqual([]);
    });

    test('passes if the field is boolean true', () => {
      expect(field('field').required().run({ field: true })).toEqual([]);
    });

    test('passes if the field is a non-empty string', () => {
      expect(field('field').required().run({ field: 'valid' })).toEqual([]);
    });

    test('uses a custom error message if provided', () => {
      expect(field('field').required('Field is mandatory').run({})).toEqual([
        'Field is mandatory',
      ]);
    });
  });

  describe('array()', () => {
    test('passes if value is an array', () => {
      expect(
        field('tags')
          .array()
          .run({ tags: ['a', 'b'] })
      ).toEqual([]);
    });

    test('fails if value is not an array and no options given', () => {
      expect(field('tags').array().run({ tags: 'not-an-array' })).toEqual([
        'tags must be an array.',
      ]);
    });

    test('wraps non-array into array if force is true', () => {
      const body = { tags: 'hello' };
      const result = field('tags').array({ force: true }).run(body);
      expect(result).toEqual([]);
      expect(body.tags).toEqual(['hello']);
    });

    test('wraps undefined into empty array if force is true', () => {
      const body = {} as any;
      const result = field('tags').array({ force: true }).run(body);
      expect(result).toEqual([]);
      expect(body.tags).toEqual([]);
    });

    test('wraps null into empty array if force is true', () => {
      const body = { tags: null };
      const result = field('tags').array({ force: true }).run(body);
      expect(result).toEqual([]);
      expect(body.tags).toEqual([]);
    });

    test('casts comma-separated string into array if cast is true', () => {
      const body = { tags: 'a, b ,c' };
      const result = field('tags').array({ cast: true }).run(body);
      expect(result).toEqual([]);
      expect(body.tags).toEqual(['a', 'b', 'c']);
    });

    test('casts string with custom separator if sep is provided', () => {
      const body = { tags: 'a|b|c' };
      const result = field('tags').array({ cast: true, sep: '|' }).run(body);
      expect(result).toEqual([]);
      expect(body.tags).toEqual(['a', 'b', 'c']);
    });

    test('fails if cast string is not an array and no cast option', () => {
      const body = { tags: 'a,b,c' };
      const result = field('tags').array().run(body);
      expect(result).toEqual(['tags must be an array.']);
    });

    test('passes if value is undefined or null and field is optional', () => {
      expect(field('tags').array().run({ tags: null })).toEqual([]);
      expect(field('tags').array().run({})).toEqual([]);
    });

    test('fails if value is undefined or null and field is required', () => {
      expect(field('tags').required().array().run({})).toEqual([
        'tags is required.',
        'tags must be an array.',
      ]);

      expect(field('tags').required().array().run({ tags: null })).toEqual([
        'tags is required.',
        'tags must be an array.',
      ]);
    });

    test('uses custom error message if provided', () => {
      const result = field('tags').array({}, 'This must be an array').run({
        tags: 123,
      });
      expect(result).toEqual(['This must be an array']);
    });

    test('throws if message is not a string', () => {
      expect(() => field('tags').array({}, 123 as any)).toThrow(
        'Invalid message: 123'
      );
    });

    test('returns instance of ArrayField', () => {
      const f = field('tags').array();
      expect(f.constructor.name).toBe('ArrayField');
    });
  });

  describe('is()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('field').is(/abc/).run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('field').is(/abc/).run({ field: null })).toEqual([]);
    });

    test('Fails if value is not a string', () => {
      expect(field('field').is(/abc/).run({ field: 123 })).toEqual([
        'field format is invalid.',
      ]);
    });

    test('Fails if regex does not match the string', () => {
      expect(field('field').is(/^abc$/).run({ field: 'xyz' })).toEqual([
        'field format is invalid.',
      ]);
    });

    test('Passes if regex matches the string', () => {
      expect(field('field').is(/^abc$/).run({ field: 'abc' })).toEqual([]);
    });

    test('Uses custom error message if provided', () => {
      expect(
        field('field').is(/abc/, 'Custom is error').run({ field: 'xyz' })
      ).toEqual(['Custom is error']);
    });

    test('Throws if regex is invalid', () => {
      expect(() => field('field').is(null as any)).toThrow('Invalid regex');
    });
  });

  describe('isNot()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('field').isNot(/abc/).run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('field').isNot(/abc/).run({ field: null })).toEqual([]);
    });

    test('Fails if regex matches the string', () => {
      expect(field('field').isNot(/^abc$/).run({ field: 'abc' })).toEqual([
        'field format is invalid.',
      ]);
    });

    test('Passes if regex does not match the string', () => {
      expect(field('field').isNot(/^abc$/).run({ field: 'xyz' })).toEqual([]);
    });

    test('Fails if value is not a string', () => {
      expect(field('field').isNot(/abc/).run({ field: 123 })).toEqual([
        'field format is invalid.',
      ]);
    });

    test('Uses custom error message if provided', () => {
      expect(
        field('field').isNot(/abc/, 'Custom isNot error').run({ field: 'abc' })
      ).toEqual(['Custom isNot error']);
    });

    test('Throws if regex is invalid', () => {
      expect(() => field('field').isNot(undefined as any)).toThrow(
        'Invalid regex'
      );
    });
  });

  describe('array().min()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('tags').array().min(2).run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('tags').array().min(2).run({ tags: null })).toEqual([]);
    });

    test('Fails if value is not an array', () => {
      expect(
        field('tags').array().min(2).run({ tags: 'not-an-array' })
      ).toEqual(['tags must be an array.', 'tags must have at least 2 items.']);
    });

    test('Fails if array length is less than minimum', () => {
      expect(
        field('tags')
          .array()
          .min(3)
          .run({ tags: ['one', 'two'] })
      ).toEqual(['tags must have at least 3 items.']);
    });

    test('Passes if array length equals or exceeds minimum', () => {
      expect(
        field('tags')
          .array()
          .min(2)
          .run({ tags: ['one', 'two'] })
      ).toEqual([]);
      expect(
        field('tags')
          .array()
          .min(2)
          .run({ tags: ['one', 'two', 'three'] })
      ).toEqual([]);
    });

    test('Uses custom error message if provided', () => {
      expect(
        field('tags')
          .array()
          .min(3, 'Too few tags!')
          .run({ tags: ['one'] })
      ).toEqual(['Too few tags!']);
    });

    test('Defaults to 0 if non-numeric length is passed', () => {
      expect(field('tags').array().min().run({ tags: [] })).toEqual([]);
    });
  });

  describe('array().max()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('tags').array().max(3).run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('tags').array().max(3).run({ tags: null })).toEqual([]);
    });

    test('Fails if value is not an array', () => {
      expect(
        field('tags').array().max(3).run({ tags: 'not-an-array' })
      ).toEqual(['tags must be an array.', 'tags must have at most 3 items.']);
    });

    test('Fails if array length exceeds maximum', () => {
      expect(
        field('tags')
          .array()
          .max(2)
          .run({ tags: ['one', 'two', 'three'] })
      ).toEqual(['tags must have at most 2 items.']);
    });

    test('Passes if array length is within maximum', () => {
      expect(
        field('tags')
          .array()
          .max(3)
          .run({ tags: ['one', 'two'] })
      ).toEqual([]);
      expect(
        field('tags')
          .array()
          .max(3)
          .run({ tags: ['one', 'two', 'three'] })
      ).toEqual([]);
    });

    test('Uses custom error message if provided', () => {
      expect(
        field('tags')
          .array()
          .max(2, 'Too many tags!')
          .run({ tags: ['one', 'two', 'three'] })
      ).toEqual(['Too many tags!']);
    });

    test('Defaults to MAX_SAFE_INTEGER if non-numeric length is passed', () => {
      expect(
        field('tags')
          .array()
          .max()
          .run({ tags: Array(100).fill('x') })
      ).toEqual([]);
    });
  });

  describe('array().length()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('tags').array().length(2).run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('tags').array().length(2).run({ tags: null })).toEqual([]);
    });

    test('Fails if value is not an array', () => {
      expect(
        field('tags').array().length(2).run({ tags: 'not-an-array' })
      ).toEqual(['tags must be an array.', 'tags must have exactly 2 items.']);
    });

    test('Fails if array length does not match', () => {
      expect(
        field('tags')
          .array()
          .length(3)
          .run({ tags: ['a', 'b'] })
      ).toEqual(['tags must have exactly 3 items.']);
    });

    test('Passes if array length matches', () => {
      expect(
        field('tags')
          .array()
          .length(2)
          .run({ tags: ['x', 'y'] })
      ).toEqual([]);
    });

    test('Uses custom error message if provided', () => {
      expect(
        field('tags')
          .array()
          .length(1, 'Exactly one tag is required!')
          .run({ tags: ['a', 'b'] })
      ).toEqual(['Exactly one tag is required!']);
    });

    test('Throws if called without a valid length number', () => {
      expect(() =>
        field('tags')
          .array()
          .length(undefined as any)
      ).toThrow('Invalid array length: undefined');
      expect(() =>
        field('tags')
          .array()
          .length('bad' as any)
      ).toThrow('Invalid array length: bad');
    });
  });

  describe('array().includes()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('tags').array().includes('x').run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('tags').array().includes('x').run({ tags: null })).toEqual(
        []
      );
    });

    test('Fails if value is not an array', () => {
      expect(
        field('tags').array().includes('x').run({ tags: 'not-an-array' })
      ).toEqual(['tags must be an array.', 'tags must contain "x".']);
    });

    test('Fails if array does not include the required value', () => {
      expect(
        field('tags')
          .array()
          .includes('x')
          .run({ tags: ['a', 'b'] })
      ).toEqual(['tags must contain "x".']);
    });

    test('Passes if array includes the required value', () => {
      expect(
        field('tags')
          .array()
          .includes('x')
          .run({ tags: ['x', 'y'] })
      ).toEqual([]);
    });

    test('Supports custom error message', () => {
      expect(
        field('tags')
          .array()
          .includes('banana', 'You must contain a banana!')
          .run({ tags: ['apple', 'orange'] })
      ).toEqual(['You must contain a banana!']);
    });
  });

  describe('array().unique()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('items').array().unique().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('items').array().unique().run({ items: null })).toEqual([]);
    });

    test('Fails if array contains duplicates', () => {
      expect(
        field('items')
          .array()
          .unique()
          .run({ items: ['a', 'b', 'a'] })
      ).toEqual(['items must contain unique values.']);
    });

    test('Passes if array contains unique values', () => {
      expect(
        field('items')
          .array()
          .unique()
          .run({ items: ['a', 'b', 'c'] })
      ).toEqual([]);
    });

    test('Supports custom message', () => {
      expect(
        field('items')
          .array()
          .unique('No duplicates allowed!')
          .run({ items: [1, 2, 2] })
      ).toEqual(['No duplicates allowed!']);
    });
  });

  describe('array().ofString()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('tags').array().ofString().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('tags').array().ofString().run({ tags: null })).toEqual([]);
    });

    test('Fails if any value is a number or numeric string', () => {
      expect(
        field('tags')
          .array()
          .ofString()
          .run({ tags: ['hello', '42'] })
      ).toEqual(['tags must contain strings only.']);
      expect(
        field('tags')
          .array()
          .ofString()
          .run({ tags: ['a', 1] })
      ).toEqual(['tags must contain strings only.']);
    });

    test('Passes if all values are pure strings', () => {
      expect(
        field('tags')
          .array()
          .ofString()
          .run({ tags: ['x', 'y', 'z'] })
      ).toEqual([]);
    });

    test('Supports custom message', () => {
      expect(
        field('tags')
          .array()
          .ofString('Only pure strings are allowed.')
          .run({ tags: ['1', 'two'] })
      ).toEqual(['Only pure strings are allowed.']);
    });
  });

  describe('array().ofNumber()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('nums').array().ofNumber().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('nums').array().ofNumber().run({ nums: null })).toEqual([]);
    });

    test('Passes if array contains all numbers', () => {
      expect(
        field('nums')
          .array()
          .ofNumber()
          .run({ nums: [1, 2, 3] })
      ).toEqual([]);
    });

    test('Passes if array contains numeric strings', () => {
      expect(
        field('nums')
          .array()
          .ofNumber()
          .run({ nums: ['1', '2.5', ' 3 '] })
      ).toEqual([]);
    });

    test('Fails if any item is a non-numeric string', () => {
      expect(
        field('nums')
          .array()
          .ofNumber()
          .run({ nums: ['5', 'oops'] })
      ).toEqual(['nums must contain numbers only.']);
    });

    test('Fails if any item is an empty string', () => {
      expect(
        field('nums')
          .array()
          .ofNumber()
          .run({ nums: [''] })
      ).toEqual(['nums must contain numbers only.']);
    });

    test('Supports custom message', () => {
      expect(
        field('nums')
          .array()
          .ofNumber('Only numbers allowed!')
          .run({ nums: [1, 'two'] })
      ).toEqual(['Only numbers allowed!']);
    });
  });

  describe('array().ofIds()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('ids').array().ofIds().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('ids').array().ofIds().run({ ids: null })).toEqual([]);
    });

    test('Fails if any value is not a positive integer', () => {
      expect(
        field('ids')
          .array()
          .ofIds()
          .run({ ids: ['0', '12'] })
      ).toEqual(['ids must contain valid IDs.']);
      expect(
        field('ids')
          .array()
          .ofIds()
          .run({ ids: [-1, 2] })
      ).toEqual(['ids must contain valid IDs.']);
      expect(
        field('ids')
          .array()
          .ofIds()
          .run({ ids: ['abc', '2'] })
      ).toEqual(['ids must contain valid IDs.']);
    });

    test('Passes if values are valid numbers or numeric strings > 0', () => {
      expect(
        field('ids')
          .array()
          .ofIds()
          .run({ ids: [1, '2', 3] })
      ).toEqual([]);
    });

    test('Supports custom message', () => {
      expect(
        field('ids')
          .array()
          .ofIds('Only valid IDs!')
          .run({ ids: [0, 2] })
      ).toEqual(['Only valid IDs!']);
    });
  });

  describe('array().ofItems()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(field('values').array().ofItems().run({})).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(field('values').array().ofItems().run({ values: null })).toEqual(
        []
      );
    });

    test('Fails if any item is empty, falsy, or just whitespace', () => {
      expect(
        field('values')
          .array()
          .ofItems()
          .run({ values: ['a', ''] })
      ).toEqual(['values must be non-empty values.']);
      expect(
        field('values')
          .array()
          .ofItems()
          .run({ values: [null, 'ok'] })
      ).toEqual(['values must be non-empty values.']);
      expect(
        field('values')
          .array()
          .ofItems()
          .run({ values: ['   '] })
      ).toEqual(['values must be non-empty values.']);
    });

    test('Passes if all values are non-empty and not blank', () => {
      expect(
        field('values')
          .array()
          .ofItems()
          .run({ values: ['x', ' y ', 'z'] })
      ).toEqual([]);
    });

    test('Supports custom message', () => {
      expect(
        field('values')
          .array()
          .ofItems('No empty items allowed.')
          .run({ values: ['ok', ''] })
      ).toEqual(['No empty items allowed.']);
    });
  });

  describe('array().some()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(
        field('tags')
          .array()
          .some(() => true)
          .run({})
      ).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(
        field('tags')
          .array()
          .some(() => true)
          .run({ tags: null })
      ).toEqual([]);
    });

    test('Fails if none of the items match the test', () => {
      const result = field('tags')
        .array()
        .some((x) => x === 'foo')
        .run({ tags: ['bar', 'baz'] });
      expect(result).toEqual(['tags requires at least one valid entry.']);
    });

    test('Passes if at least one item matches the test', () => {
      const result = field('tags')
        .array()
        .some((x) => x === 'foo')
        .run({ tags: ['foo', 'baz'] });
      expect(result).toEqual([]);
    });

    test('Supports custom message', () => {
      const result = field('tags')
        .array()
        .some(() => false, 'Custom fail')
        .run({ tags: ['x'] });
      expect(result).toEqual(['Custom fail']);
    });
  });

  describe('array().none()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(
        field('blocked')
          .array()
          .none(() => true)
          .run({})
      ).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(
        field('blocked')
          .array()
          .none(() => true)
          .run({ blocked: null })
      ).toEqual([]);
    });

    test('Fails if at least one item matches the test', () => {
      const result = field('blocked')
        .array()
        .none((x) => typeof x === 'string')
        .run({ blocked: ['a', 1] });
      expect(result).toEqual(['blocked cannot contain invalid entries.']);
    });

    test('Fails if all items match the test', () => {
      const result = field('blocked')
        .array()
        .none((x) => typeof x === 'string')
        .run({ blocked: ['a', 'b'] });
      expect(result).toEqual(['blocked cannot contain invalid entries.']);
    });

    test('Passes if none of the items match the test', () => {
      const result = field('blocked')
        .array()
        .none((x) => typeof x === 'string')
        .run({ blocked: [1, 2, 3] });
      expect(result).toEqual([]);
    });

    test('Supports custom message', () => {
      const result = field('blocked')
        .array()
        .none(() => true, 'Custom none fail')
        .run({ blocked: [1, 2] });
      expect(result).toEqual(['Custom none fail']);
    });
  });

  describe('array().all()', () => {
    test('Skips validation if value is undefined (optional)', () => {
      expect(
        field('nums')
          .array()
          .all(() => true)
          .run({})
      ).toEqual([]);
    });

    test('Skips validation if value is null (optional)', () => {
      expect(
        field('nums')
          .array()
          .all(() => true)
          .run({ nums: null })
      ).toEqual([]);
    });

    test('Fails if not all items match the test', () => {
      const result = field('nums')
        .array()
        .all((x) => typeof x === 'number')
        .run({ nums: [1, 'a', 3] });
      expect(result).toEqual(['nums requires all entries to be valid.']);
    });

    test('Passes if all items match the test', () => {
      const result = field('nums')
        .array()
        .all((x) => typeof x === 'number')
        .run({ nums: [1, 2, 3] });
      expect(result).toEqual([]);
    });

    test('Supports custom message', () => {
      const result = field('nums')
        .array()
        .all(() => false, 'All failed!')
        .run({ nums: [1] });
      expect(result).toEqual(['All failed!']);
    });
  });

  describe('array().join()', () => {
    test('Skips if field is missing', () => {
      const body: any = {};
      const errors = field('tags').array().join().run(body);
      expect(errors).toEqual([]);
      expect(body.tags).toBe('');
    });

    test('Skips if value is not an array', () => {
      const body: any = { tags: 123 };
      const errors = field('tags').array().join().run(body);
      expect(errors).toEqual(['tags must be an array.']);
      expect(body.tags).toBe('');
    });

    test('Joins array with default comma separator', () => {
      const body: any = { tags: ['a', 'b', 'c'] };
      const errors = field('tags').array().join().run(body);
      expect(errors).toEqual([]);
      expect(body.tags).toBe('a,b,c');
    });

    test('Joins array with custom separator', () => {
      const body: any = { tags: ['a', 'b', 'c'] };
      const errors = field('tags').array().join('|').run(body);
      expect(errors).toEqual([]);
      expect(body.tags).toBe('a|b|c');
    });

    test('Joins empty array into empty string', () => {
      const body: any = { tags: [] };
      const errors = field('tags').array().join().run(body);
      expect(errors).toEqual([]);
      expect(body.tags).toBe('');
    });

    test('Handles invalid separator gracefully', () => {
      const body: any = { tags: ['x', 'y'] };
      const errors = field('tags')
        .array()
        .join(null as any)
        .run(body);
      expect(errors).toEqual([]);
      expect(body.tags).toBe('x,y');
    });
  });

  describe('array().test()', () => {
    test('Applies custom validation and returns error if it fails', () => {
      const body = { tags: ['a', 'b'] };
      const errors = field('tags')
        .array()
        .test((v) => v.length > 3, 'Too short')
        .run(body);

      expect(errors).toEqual(['Too short']);
    });

    test('Passes if custom test returns true', () => {
      const body = { tags: ['x', 'y', 'z'] };
      const errors = field('tags')
        .array()
        .test((v) => v.length === 3, 'Invalid length')
        .run(body);

      expect(errors).toEqual([]);
    });

    test('Skips custom test if field is optional and value is undefined', () => {
      const body: any = {};
      const spy = jest.fn();
      const errors = field('tags')
        .array()
        .test(spy, 'Should not run')
        .run(body);

      expect(errors).toEqual([]);
      expect(spy).not.toHaveBeenCalled();
    });

    test('Skips custom test if field is optional and value is empty array', () => {
      const body = { tags: [] };
      const spy = jest.fn();
      const errors = field('tags')
        .array()
        .test(spy, 'Should not run')
        .run(body);

      expect(errors).toEqual([]);
      expect(spy).not.toHaveBeenCalled();
    });

    test('Throws if test function is not provided', () => {
      expect(() =>
        field('tags')
          .array()
          .test(null as any, 'Invalid')
      ).toThrow('Invalid function: null');
    });

    test('Throws if message is not a string', () => {
      expect(() =>
        field('tags')
          .array()
          .test(() => true, null as any)
      ).toThrow('Invalid message: null');
    });
  });

  describe('ArrayField.run()', () => {
    test('Defaults body to empty object if not provided', () => {
      expect(
        field('tags')
          .test(() => false, 'error!')
          .run()
      ).toEqual([]); // no body passed
    });
  });
});
