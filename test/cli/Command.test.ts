import { Command as CMD, CommandError } from '../../src/cli/Command';

describe('Command', () => {
  class Command extends (CMD as any) {}

  describe('parse', () => {
    it('parses syntax with required, optional, and option parameters', () => {
      const syntax = '<! name> <? age> <- verbose>';
      const expected = [
        { key: 'name', type: '!' },
        { key: 'age', type: '?' },
        { key: 'verbose', type: '-' },
      ];

      expect(Command.parse(syntax)).toEqual(expected);
    });

    it('parses syntax with only required parameters', () => {
      const syntax = '<! name> <! id>';
      const expected = [
        { key: 'name', type: '!' },
        { key: 'id', type: '!' },
      ];
      expect(Command.parse(syntax)).toEqual(expected);
    });

    it('parses syntax with only optional parameters', () => {
      const syntax = '<? age> <? gender>';
      const expected = [
        { key: 'age', type: '?' },
        { key: 'gender', type: '?' },
      ];
      expect(Command.parse(syntax)).toEqual(expected);
    });

    it('parses syntax with only options', () => {
      const syntax = '<- verbose> <- debug>';
      const expected = [
        { key: 'verbose', type: '-' },
        { key: 'debug', type: '-' },
      ];
      expect(Command.parse(syntax)).toEqual(expected);
    });

    it('returns an empty array when syntax has no parameters', () => {
      const syntax = '';
      const expected: any[] = [];
      expect(Command.parse(syntax)).toEqual(expected);
    });

    it('ignores invalid syntax and parses valid parameters', () => {
      const syntax = '<! name> <invalid> <? age>';
      const expected = [
        { key: 'name', type: '!' },
        { key: 'age', type: '?' },
      ];
      expect(Command.parse(syntax)).toEqual(expected);
    });

    it('throws an error for non-string input', () => {
      expect(() => Command.parse(null)).toThrow(CommandError);
    });
  });

  describe('validate', () => {
    it('validates arguments with all required parameters provided', () => {
      const params = [
        { key: 'name', type: '!' },
        { key: 'age', type: '!' },
      ];
      const args = ['Alice', '30'];
      const expected = {
        arguments: [
          { key: 'name', value: 'Alice' },
          { key: 'age', value: '30' },
        ],
        options: [],
      };

      expect(Command.validate(params, args)).toEqual(expected);
    });

    it('validates arguments with optional parameters missing', () => {
      const params = [
        { key: 'name', type: '!' },
        { key: 'age', type: '?' },
      ];

      const args = ['Alice'];
      const expected = {
        arguments: [
          { key: 'name', value: 'Alice' },
          { key: 'age', value: undefined },
        ],
        options: [],
      };

      expect(Command.validate(params, args)).toEqual(expected);
    });

    it('validates arguments with options provided', () => {
      const params = [
        { key: 'verbose', type: '-' },
        { key: 'debug', type: '-' },
      ];
      const args = ['-verbose'];
      const expected = {
        arguments: [],
        options: [
          { key: 'verbose', value: true },
          { key: 'debug', value: false },
        ],
      };

      expect(Command.validate(params, args)).toEqual(expected);
    });

    it('throws an error for too many arguments', () => {
      const params = [{ key: 'name', type: '!' }];
      const args = ['Alice', 'Extra'];

      expect(() => Command.validate(params, args)).toThrow(
        new CommandError('Too many arguments provided')
      );
    });

    it('throws an error for missing required arguments', () => {
      const params = [{ key: 'name', type: '!' }];
      const args: string[] = [];

      expect(() => Command.validate(params, args)).toThrow(
        new CommandError('Missing required argument: name')
      );
    });

    it('throws an error for unexpected option arguments', () => {
      const params = [{ key: 'verbose', type: '-' }];
      const args = ['-invalid'];

      expect(() => Command.validate(params, args)).toThrow(
        new CommandError('Unexpected option: -invalid')
      );
    });

    it('validates required, optional, and options together', () => {
      const params = [
        { key: 'name', type: '!' },
        { key: 'age', type: '?' },
        { key: 'verbose', type: '-' },
        { key: 'debug', type: '-' },
      ];

      const args = ['Alice', '-verbose'];

      const expected = {
        arguments: [
          { key: 'name', value: 'Alice' },
          { key: 'age', value: undefined },
        ],
        options: [
          { key: 'verbose', value: true },
          { key: 'debug', value: false },
        ],
      };

      expect(Command.validate(params, args)).toEqual(expected);
    });

    it('validates required, optional, and options with all values provided', () => {
      const params = [
        { key: 'name', type: '!' },
        { key: 'age', type: '?' },
        { key: 'verbose', type: '-' },
        { key: 'debug', type: '-' },
      ];

      const args = ['Alice', '30', '-verbose', '-debug'];

      const expected = {
        arguments: [
          { key: 'name', value: 'Alice' },
          { key: 'age', value: '30' },
        ],
        options: [
          { key: 'verbose', value: true },
          { key: 'debug', value: true },
        ],
      };

      expect(Command.validate(params, args)).toEqual(expected);
    });

    it('validates skipped optional argument with valid options provided', () => {
      const params = [
        { key: 'name', type: '!' },
        { key: 'age', type: '?' },
        { key: 'verbose', type: '-' },
      ];

      const args = ['Alice', '-verbose'];

      const expected = {
        arguments: [
          { key: 'name', value: 'Alice' },
          { key: 'age', value: undefined },
        ],
        options: [{ key: 'verbose', value: true }],
      };

      expect(Command.validate(params, args)).toEqual(expected);
    });

    it('validates no optional arguments and no options provided', () => {
      const params = [
        { key: 'name', type: '!' },
        { key: 'age', type: '?' },
        { key: 'verbose', type: '-' },
      ];

      const args = ['Alice'];

      const expected = {
        arguments: [
          { key: 'name', value: 'Alice' },
          { key: 'age', value: undefined },
        ],
        options: [{ key: 'verbose', value: false }],
      };

      expect(Command.validate(params, args)).toEqual(expected);
    });
  });

  describe('argument', () => {
    it('throws an error if the argument name is not a string', () => {
      expect(() => Command.argument(123 as unknown as string)).toThrow(
        new CommandError('Invalid argument name: 123')
      );
    });

    it('throws an error if the argument is not found', () => {
      Command.result = {
        arguments: [{ key: 'age', value: '30' }],
        options: [],
      };

      expect(() => Command.argument('name')).toThrow(
        new CommandError('Undefined argument name: name')
      );
    });

    it('returns the value of the argument when found', () => {
      Command.result = {
        arguments: [{ key: 'name', value: 'Alice' }],
        options: [],
      };

      const result = Command.argument('name');

      expect(result).toBe('Alice');
    });

    it('caches the result of `validate` if not already cached', () => {
      Command.result = undefined;

      jest.spyOn(Command, 'parse').mockReturnValue([]);
      jest.spyOn(Command, 'validate').mockReturnValue({
        arguments: [{ key: 'name', value: 'John' }],
        options: [],
      });

      Command.argument('name'); // This should invoke `validate` and cache the result.

      expect(Command.result).toEqual({
        arguments: [{ key: 'name', value: 'John' }],
        options: [],
      });
    });
  });

  describe('option', () => {
    it('throws an error if the option name is not a string', () => {
      expect(() => Command.option(123 as unknown as string)).toThrow(
        new CommandError('Invalid option name: 123')
      );
    });

    it('throws an error if the option is not found', () => {
      Command.result = {
        arguments: [],
        options: [{ key: 'debug', value: false }],
      };

      expect(() => Command.option('verbose')).toThrow(
        new CommandError('Undefined option name: verbose')
      );
    });

    it('returns the value of the option when found', () => {
      Command.result = {
        arguments: [],
        options: [{ key: 'verbose', value: true }],
      };

      const result = Command.option('verbose');

      expect(result).toBe(true);
    });

    it('caches the result of `validate` if not already cached', () => {
      Command.result = undefined;
      jest.spyOn(Command, 'parse').mockReturnValue([]);
      jest.spyOn(Command, 'validate').mockReturnValue({
        arguments: [],
        options: [{ key: 'log', value: true }],
      });

      Command.option('log'); // This should invoke `validate` and cache the result.

      expect(Command['result']).toEqual({
        arguments: [],
        options: [{ key: 'log', value: true }],
      });
    });
  });

  describe('Logging Methods', () => {
    // Mock console.log to spy on its calls
    beforeAll(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterAll(() => {
      jest.restoreAllMocks(); // Restore the original console.log after tests
    });

    it('should log the message in blue color', () => {
      const message = 'Info message';
      // Call the info method
      Command.info(message);

      // Check that console.log was called with the correct color code for blue
      expect(console.log).toHaveBeenCalledWith(`\x1b[34m${message}\x1b[0m`);
    });

    it('should log the message in red color', () => {
      const message = 'Error message';
      // Call the error method
      Command.error(message);

      // Check that console.log was called with the correct color code for red
      expect(console.log).toHaveBeenCalledWith(`\x1b[31m${message}\x1b[0m`);
    });

    it('should log the message in yellow color', () => {
      const message = 'Warning message';
      // Call the warning method
      Command.warning(message);

      // Check that console.log was called with the correct color code for yellow
      expect(console.log).toHaveBeenCalledWith(`\x1b[33m${message}\x1b[0m`);
    });

    it('should log the message in green color', () => {
      const message = 'Success message';
      // Call the success method
      Command.success(message);

      // Check that console.log was called with the correct color code for green
      expect(console.log).toHaveBeenCalledWith(`\x1b[32m${message}\x1b[0m`);
    });
  });

  it('should throw an error when exec is not implemented in a subclass', () => {
    // Expect the exec method to throw a CommandError when called
    expect(() => Command.exec()).toThrow(CommandError);
    expect(() => Command.exec()).toThrow(
      `${Command.name}.exec implementation is missing`
    );
  });
});
