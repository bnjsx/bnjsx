import { Tool } from '../../../src/core/template/Tool';
import { ParserError } from '../../../src/core/template/Parser';

// Test the Tool class
describe('Tool Class Tests', () => {
  it('should create Tool instance for valid pattern', () => {
    const name = 'testComponent';
    const line = 1;

    // Create a Tool instance with a valid pattern
    const tool = new Tool(
      `@key(1, true, null, undefined, 'str', keys[0], #obj.prop, ref, @key(123))`,
      'testComponent',
      1
    );

    // Validate the result
    expect(tool).toBeInstanceOf(Tool);
    expect(tool.key).toBe('key');
    expect(tool.args).toEqual([
      { name, line, value: 1 }, // Scalar
      { name, line, value: true }, // Scalar
      { name, line, value: null }, // Scalar
      { name, line, value: undefined }, // Scalar
      { name, line, value: 'str' }, // Scalar
      { name, line, key: 'keys', path: '[0]' }, // Ref
      { name, line, key: 'obj', path: '.prop' }, // Globals
      { name, line, key: 'ref' }, // Reference (path is undefined)
      // You can also have tools as arguments of other tools!
      {
        name,
        line,
        key: 'key',
        args: [{ name, line, value: 123 }],
      },
    ]);
  });

  it('should create tool instance with no arguments', () => {
    const name = 'testComponent';
    const line = 1;

    // Create a Tool instance with no arguments
    expect(new Tool(`@key()`, 'testComponent', 1)).toEqual({
      name,
      line,
      key: 'key',
      args: undefined,
    });

    // Create a Tool instance using a Tool with no arguments
    expect(new Tool(`@key(@key())`, 'testComponent', 1)).toEqual({
      name,
      line,
      key: 'key',
      args: [{ name, line, key: 'key', args: undefined }],
    });
  });

  it('should create tool instance with a valid path', () => {
    const name = 'testComponent';
    const line = 1;

    expect(new Tool(`@key()[0].foo[1][2].bar`, 'testComponent', 1)).toEqual({
      name,
      line,
      key: 'key',
      args: undefined,
      path: '[0].foo[1][2].bar',
    });

    expect(new Tool(`@key().foo.bar`, 'testComponent', 1)).toEqual({
      name,
      line,
      key: 'key',
      args: undefined,
      path: '.foo.bar',
    });
  });

  it('should match correct tool reference pattern', () => {
    expect(Tool.check('@tool')).toBe(true);
    expect(Tool.check('$invalidPattern')).toBe(false);
  });

  it('should throw for invalid path', () => {
    expect(() => new Tool(`@key()..hello`, 'testComponent', 1)).toThrow(
      SyntaxError
    );

    expect(() => new Tool(`@key(1,2,3)[3].123`, 'testComponent', 1)).toThrow(
      SyntaxError
    );

    expect(() => new Tool(`@key(123,).123`, 'testComponent', 1)).toThrow(
      SyntaxError
    );
  });

  it('should throw for invalid arguments', () => {
    // Create a Tool instance with an invalid reference
    expect(() => new Tool(`@key(123hey)`, 'testComponent', 1)).toThrow(
      SyntaxError
    );

    // Create a Tool instance with invalid arguments
    expect(() => new Tool(`@key(, , ,)`, 'testComponent', 1)).toThrow(
      SyntaxError
    );

    expect(() => new Tool(`@key(123,)`, 'testComponent', 1)).toThrow(
      SyntaxError
    );
  });

  it('should throw for missing tool arguments', () => {
    expect(() => new Tool(`@key`, 'testComponent', 1)).toThrow(SyntaxError);
  });

  it('should throw SyntaxError for invalid pattern', () => {
    expect(() => {
      new Tool('$invalidPattern', 'testComponent', 1);
    }).toThrow(SyntaxError);
  });

  it('should throw ParserError for invalid arguments', () => {
    const arg = null as any;
    expect(() => new Tool(arg, arg, arg)).toThrow(ParserError);
  });
});
