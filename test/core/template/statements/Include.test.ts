import { ParserError } from '../../../../src/core/template/Parser';
import { Include } from '../../../../src/core/template/statements/Include';

describe('Include class', () => {
  const statement: any = {
    line: 1,
    definition: '$include("folder.subfolder.name")',
    type: 'include',
  };

  test('should create Include instance with valid dot notation path', () => {
    // Create Include instance with the valid statement
    const include = new Include('TestComponent', statement);

    // Check if the instance was created correctly
    expect(include.name).toBe('TestComponent');
    expect(include.line).toBe(1);
    expect(include.path).toBe('folder.subfolder.name');
  });

  test('should throw SyntaxError for invalid dot notation path', () => {
    // Override the mock implementation to simulate an invalid path
    statement.definition = '$include(invalid-path)';

    expect(() => {
      new Include('TestComponent', statement);
    }).toThrow(SyntaxError);
  });

  test('should throw SyntaxError for empty path', () => {
    // Set up an empty path
    statement.definition = '$include()';

    // Test that SyntaxError is thrown for empty path
    expect(() => {
      new Include('TestComponent', statement);
    }).toThrow(SyntaxError);
  });

  test('should throw SyntaxError for invalid include definition', () => {
    // Define the statement without parentheses
    statement.definition = '$includefolder.subfolder';

    expect(() => {
      new Include('TestComponent', statement);
    }).toThrow(SyntaxError);
  });

  test('should correctly parse complex dot notation paths', () => {
    // Set up a valid, complex path
    statement.definition = "$include('folder.subfolder.deep.path')";

    // Create Include instance
    const include = new Include('TestComponent', statement);

    // Ensure the path is correctly parsed
    expect(include.path).toBe('folder.subfolder.deep.path');
  });

  it('should throw an error for invalid arguments', () => {
    const arg = null as any;
    expect(() => new Include(arg, arg)).toThrow(ParserError);
  });
});
