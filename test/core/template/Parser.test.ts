jest.mock('crypto');

import { randomUUID } from 'crypto';
import {
  parseArguments,
  parseLine,
  parseStatementArguments,
  parseStatements,
  parseTemplate,
  parseTokens,
  ParserError,
} from '../../../src/core/template/Parser';

describe('parseLine', () => {
  it('should return the correct line number for a valid position', () => {
    const template = `line1\nline2\nline3`;
    const position = 12; // Position at the start of 'line3'
    const line = parseLine(template, position);

    expect(line).toBe(3);
  });

  it('should return the start number when no newlines are present', () => {
    const template = `single line`;
    const position = 6; // Position in the middle of the string
    const line = parseLine(template, position, 5);

    expect(line).toBe(5);
  });

  it('should throw a ParserError if the position is greater than the template length', () => {
    const template = `line1\nline2`;

    expect(() => parseLine(template, 20)).toThrow(ParserError);
  });

  it('should handle templates with no newlines', () => {
    const template = `this is a single line`;
    const position = 10; // Position within the single line
    const line = parseLine(template, position);

    expect(line).toBe(1);
  });

  it('should correctly handle templates starting with a newline', () => {
    const template = `\nfirst line\nsecond line`;
    const position = 12; // Position at the start of 'second line'
    const line = parseLine(template, position);

    expect(line).toBe(3);
  });

  it('should correctly count lines with multiple consecutive newlines', () => {
    const template = `line1\n\nline3\n\n\nline6`;
    const position = 15; // Position at the start of 'line6'
    const line = parseLine(template, position);

    expect(line).toBe(6);
  });

  it('should correctly calculate line numbers for the last character', () => {
    const template = `line1\nline2\nline3`;
    const position = template.length; // Last character in the string
    const line = parseLine(template, position);

    expect(line).toBe(3);
  });

  it('should throw an error for an invalid arguments', () => {
    const arg = null as any;

    expect(() => {
      parseLine(arg, arg, arg);
    }).toThrow(ParserError);
  });
});

describe('parseStatementArguments', () => {
  it('should parse arguments correctly for a valid statement', () => {
    const statement = `$if(condition) content $endif`;
    const args = parseStatementArguments('TestComponent', statement, 1, 'if');

    expect(args).toBe('condition');
  });

  it('should handle multiline statements with spaces', () => {
    const statement = `$if ( condition ) content $endif`;
    const args = parseStatementArguments('TestComponent', statement, 1, 'if');

    expect(args).toBe('condition');
  });

  it('should throw an error for mismatched parentheses (extra closing/opening)', () => {
    expect(() => {
      parseStatementArguments(
        'TestComponent',
        `$if(condition)) content $endif`,
        1,
        'if'
      );
    }).toThrow(SyntaxError);

    expect(() => {
      parseStatementArguments(
        'TestComponent',
        `$if((condition) content $endif`,
        1,
        'if'
      );
    }).toThrow(SyntaxError);
  });

  it('should throw an error for mismatched parentheses (missing closing/opening)', () => {
    expect(() => {
      parseStatementArguments(
        'TestComponent',
        `$if(condition content $endif`,
        1,
        'if'
      );
    }).toThrow(SyntaxError);

    expect(() => {
      parseStatementArguments(
        'TestComponent',
        `$ifcondition) content $endif`,
        1,
        'if'
      );
    }).toThrow(SyntaxError);
  });

  it('should throw an error for an invalid statement', () => {
    const statement = `if(condition)`;

    expect(() => {
      parseStatementArguments('TestComponent', statement, 1, 'if');
    }).toThrow(SyntaxError);
  });

  it('should throw an error for an invalid arguments', () => {
    const arg = null as any;

    expect(() => {
      parseStatementArguments(arg, arg, arg, arg);
    }).toThrow(ParserError);
  });

  it('should handle nested parentheses correctly', () => {
    const statement = `$if((nestedCondition)) content $endif`;
    const args = parseStatementArguments('TestComponent', statement, 1, 'if');

    expect(args).toBe('(nestedCondition)');
  });

  it('should handle statements with no arguments', () => {
    const statement = `$if() content $endif`;

    const args = parseStatementArguments('TestComponent', statement, 1, 'if');
    expect(args).toBe('');
  });

  it('should throw an error for multiple opening parentheses without closing', () => {
    const statement = `$if((nestedCondition)`;

    expect(() => {
      parseStatementArguments('TestComponent', statement, 1, 'if');
    }).toThrow(SyntaxError);
  });
});

describe('parseStatements', () => {
  it('should parse $if statements', () => {
    expect(parseStatements('TestComponent', `$if(condition)\n$endif`)).toEqual([
      { definition: `$if(condition)\n$endif`, line: 1, type: 'if' },
    ]);

    expect(
      parseStatements(
        'TestComponent',
        `$if(condition)\n$elseif(condition)\n$else\n$endif`
      )
    ).toEqual([
      {
        definition: `$if(condition)\n$elseif(condition)\n$else\n$endif`,
        line: 1,
        type: 'if',
      },
    ]);

    expect(
      parseStatements(
        'TestComponent',
        `$if(condition)\n$if(condition)\n$endif\n$endif`
      )
    ).toEqual([
      {
        definition: `$if(condition)\n$if(condition)\n$endif\n$endif`,
        line: 1,
        type: 'if',
      },
    ]);
  });

  it('should parse $foreach statements', () => {
    expect(
      parseStatements('TestComponent', `$foreach(item in items)\n$endforeach`)
    ).toEqual([
      {
        definition: `$foreach(item in items)\n$endforeach`,
        line: 1,
        type: 'foreach',
      },
    ]);

    expect(
      parseStatements(
        'TestComponent',
        `$foreach(item, index in items)\n$endforeach`
      )
    ).toEqual([
      {
        definition: `$foreach(item, index in items)\n$endforeach`,
        line: 1,
        type: 'foreach',
      },
    ]);

    expect(
      parseStatements(
        'TestComponent',
        `$foreach(item in items)\n$foreach(item in items)\n$endforeach\n$endforeach`
      )
    ).toEqual([
      {
        definition: `$foreach(item in items)\n$foreach(item in items)\n$endforeach\n$endforeach`,
        line: 1,
        type: 'foreach',
      },
    ]);
  });

  it('should parse $render statements', () => {
    expect(
      parseStatements('TestComponent', `$render(path, locals)\n$endrender`)
    ).toEqual([
      {
        definition: `$render(path, locals)\n$endrender`,
        line: 1,
        type: 'render',
      },
    ]);

    expect(
      parseStatements(
        'TestComponent',
        `$render(path, locals)\n $replace(key) content $endreplace $endrender`
      )
    ).toEqual([
      {
        definition: `$render(path, locals)\n $replace(key) content $endreplace $endrender`,
        line: 1,
        type: 'render',
      },
    ]);

    expect(
      parseStatements(
        'TestComponent',
        `$render(path, locals)\n $replace(key) $if(condition) $endif $endreplace $endrender`
      )
    ).toEqual([
      {
        definition: `$render(path, locals)\n $replace(key) $if(condition) $endif $endreplace $endrender`,
        line: 1,
        type: 'render',
      },
    ]);
  });

  it('should parse $include statements', () => {
    expect(parseStatements('TestComponent', `$include(path)`)).toEqual([
      {
        definition: `$include(path)`,
        line: 1,
        type: 'include',
      },
    ]);

    expect(
      parseStatements('TestComponent', `$include(path1)\n$include(path2)`)
    ).toEqual([
      {
        definition: `$include(path1)`,
        line: 1,
        type: 'include',
      },
      {
        definition: `$include(path2)`,
        line: 2,
        type: 'include',
      },
    ]);
  });

  it('should parse $print statements', () => {
    expect(parseStatements('TestComponent', `$print(value)`)).toEqual([
      {
        definition: `$print(value)`,
        line: 1,
        type: 'print',
      },
    ]);

    expect(
      parseStatements('TestComponent', `$print(value1)\n$print(value2)`)
    ).toEqual([
      {
        definition: `$print(value1)`,
        line: 1,
        type: 'print',
      },
      {
        definition: `$print(value2)`,
        line: 2,
        type: 'print',
      },
    ]);
  });

  it('should parse $log statements', () => {
    expect(parseStatements('TestComponent', `$log(value)`)).toEqual([
      {
        definition: `$log(value)`,
        line: 1,
        type: 'log',
      },
    ]);

    expect(
      parseStatements('TestComponent', `$log(value1)\n$log(value2)`)
    ).toEqual([
      {
        definition: `$log(value1)`,
        line: 1,
        type: 'log',
      },
      {
        definition: `$log(value2)`,
        line: 2,
        type: 'log',
      },
    ]);
  });

  it('should parse $place statements', () => {
    expect(parseStatements('TestComponent', `$place(key)`, true)).toEqual([
      {
        definition: `$place(key)`,
        line: 1,
        type: 'place',
      },
    ]);

    expect(
      parseStatements('TestComponent', `$place(key1)\n$place(key2)`, true)
    ).toEqual([
      {
        definition: `$place(key1)`,
        line: 1,
        type: 'place',
      },
      {
        definition: `$place(key2)`,
        line: 2,
        type: 'place',
      },
    ]);
  });

  it('should throw if place is false', () => {
    expect(() =>
      parseStatements('TestComponent', `$place(key)`, false)
    ).toThrow(SyntaxError);
  });

  it('should throw if a $replace tag is found outside $render', () => {
    // invalid replacement
    expect(() =>
      parseStatements('TestComponent', `$replace(key) $endreplace`)
    ).toThrow(SyntaxError);

    // invalid replacement
    expect(() =>
      parseStatements(
        'TestComponent',
        `$if(con) $replace(key) $endreplace $endif`
      )
    ).toThrow(SyntaxError);

    // valid replacement
    expect(() =>
      parseStatements(
        'TestComponent',
        `$render(path) $replace(key) content $endreplace $endrender`
      )
    ).not.toThrow(SyntaxError);
  });

  it('should throw for unmatched tags', () => {
    // Missing $endif
    expect(() => parseStatements('TestComponent', `$if`)).toThrow(SyntaxError);

    // Missing $endforeach
    expect(() => parseStatements('TestComponent', `$foreach`)).toThrow(
      SyntaxError
    );

    // Missing $endrender
    expect(() => parseStatements('TestComponent', `$render`)).toThrow(
      SyntaxError
    );

    // Extra $endif
    expect(() =>
      parseStatements('TestComponent', `$if(condition)\n$endif\n$endif`)
    ).toThrow(SyntaxError);

    // Extra $endforeach
    expect(() =>
      parseStatements(
        'TestComponent',
        `$foreach(item in items)\n$endforeach\n$endforeach`
      )
    ).toThrow(SyntaxError);

    // Extra $render
    expect(() =>
      parseStatements('TestComponent', `$render(path)\n$endrender\n$endrender`)
    ).toThrow(SyntaxError);
  });

  it('should throw for invalid arguments', () => {
    const arg = null as any;
    expect(() => parseStatements(arg, arg, arg, arg)).toThrow(ParserError);
  });

  it('should return undefined if no statements found', () => {
    expect(parseStatements('TestComponent', 'hello world')).toBe(undefined);
  });

  it('should resolve the line number exactly', () => {
    expect(
      parseStatements('Test', '$if(con) content $endif\n\n\n$print("hello")')
    ).toEqual([
      { definition: '$if(con) content $endif', line: 1, type: 'if' },
      { definition: '$print("hello")', line: 4, type: 'print' },
    ]);
  });
});

describe('parseTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the template unchanged if no states are found', () => {
    const result = parseTemplate('TestTemplate', 'No statements here');

    expect(result).toEqual({
      name: 'TestTemplate',
      layout: 'No statements here',
    });
  });

  it('should replace statements with placeholders', () => {
    const mockUUID = '123e4567-e89b-12d3-a456-426614174000';
    (randomUUID as jest.Mock).mockImplementation(() => mockUUID);

    const result = parseTemplate(
      'TestTemplate',
      '$if(con) content $endif  $print(123)'
    );

    expect(result).toEqual({
      name: 'TestTemplate',
      layout: `{{ if: ${mockUUID} }}  {{ print: ${mockUUID} }}`,
      statements: [
        {
          definition: '$if(con) content $endif',
          placeholder: `{{ if: ${mockUUID} }}`,
          line: 1,
          type: 'if',
        },
        {
          definition: '$print(123)',
          placeholder: `{{ print: ${mockUUID} }}`,
          line: 1,
          type: 'print',
        },
      ],
    });
  });
});

describe('parseTokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should split a simple string using the default separator', () => {
    const result = parseTokens('a,b,c');
    expect(result).toEqual(['a', ',', 'b', ',', 'c']);
  });

  it('should handle quoted substrings', () => {
    const mockUUIDs = ['uuid1', 'uuid2'];
    (randomUUID as jest.Mock).mockImplementation(() => mockUUIDs.shift());

    const result = parseTokens(`"hello, world",'test'`);

    expect(result).toEqual(['"hello, world"', ',', "'test'"]);
  });

  it('should use a custom separator to split tokens', () => {
    const result = parseTokens('a:b:c', /(:)/g);
    expect(result).toEqual(['a', ':', 'b', ':', 'c']);
  });

  it('should handle a string with no matches for the separator', () => {
    const result = parseTokens('abc');
    expect(result).toEqual(['abc']);
  });

  it('should remove whitespace around tokens', () => {
    const result = parseTokens('  a ,  b ,  c  ');
    expect(result).toEqual(['a', ',', 'b', ',', 'c']);
  });

  it('should handle a pattern with nested quotes', () => {
    const mockUUIDs = ['uuid1'];
    (randomUUID as jest.Mock).mockImplementation(() => mockUUIDs.shift());

    const result = parseTokens(`"nested 'quotes'", 123`);

    expect(result).toEqual([`"nested 'quotes'"`, ',', '123']);
  });

  it('should handle multiple quoted strings', () => {
    const mockUUIDs = ['uuid1', 'uuid2'];
    (randomUUID as jest.Mock).mockImplementation(() => mockUUIDs.shift());

    const result = parseTokens(`"first", 'second'`);

    expect(result).toEqual([`"first"`, ',', `'second'`]);
  });

  it('should throw for invalid arguments', () => {
    const arg = null as any;
    expect(() => parseTokens(arg, arg)).toThrow(ParserError);
  });
});

describe('parseArguments', () => {
  it('should parse arguments from valid tokens', () => {
    const tokens = ['(', 'arg1', ',', 'arg2', ')'];

    const result = parseArguments(tokens, 'TestComponent', 5);

    expect(result).toEqual(['arg1', ',', 'arg2']);
  });

  it('should return undefined if no arguments are present', () => {
    const tokens = ['(', ')'];

    const result = parseArguments(tokens, 'TestComponent', 5);

    expect(result).toBeUndefined();
  });

  it('should throw SyntaxError for missing closing parentheses', () => {
    const tokens = ['(', 'arg1', ',', 'arg2'];

    expect(() => {
      parseArguments(tokens, 'TestComponent', 5);
    }).toThrow(SyntaxError);
  });

  it('should IGNORE unbalanced closing parentheses', () => {
    const tokens = ['(', 'arg1', ')', ')'];

    expect(() => {
      parseArguments(tokens, 'TestComponent', 5);
    }).not.toThrow(SyntaxError);

    // This method parses the first valid arguments set
  });

  it('should throw SyntaxError for missing opening parentheses', () => {
    const tokens = ['arg1', 'arg2', ')'];

    expect(() => {
      parseArguments(tokens, 'TestComponent', 5);
    }).toThrow(SyntaxError);
  });

  it('should throw SyntaxError for unbalanced opening parentheses', () => {
    const tokens = ['(', '(', 'arg', ')'];

    expect(() => {
      parseArguments(tokens, 'TestComponent', 5);
    }).toThrow(SyntaxError);
  });

  it('should throw ParserError for invalid arguments', () => {
    const arg = null as any;
    expect(() => {
      parseArguments(arg, arg, arg);
    }).toThrow(ParserError);
  });
});
