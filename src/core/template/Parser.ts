import { randomUUID } from 'crypto';
import {
  isBool,
  isFullArr,
  isInt,
  isRegex,
  isStr,
  isUndefined,
} from '../../helpers';

// Tag Position
type TagPosition = {
  sign: '$if' | '$include' | '$foreach' | '$render' | '$print';
  index: number;
};

// Statement Type
export type StatementType =
  | 'if'
  | 'elseif'
  | 'include'
  | 'foreach'
  | 'render'
  | 'print'
  | 'place'
  | 'log'
  | 'short-print';

// Statement
export type State = {
  definition: string;
  type: StatementType;
  line: number;
};

// Template Statement with placeholder
export type Statement = State & { placeholder: string };

// Template
export type Template = {
  name: string; // Template Name
  layout: string; // Template Layout
  statements?: Statement[]; // Template Statements
};

export class ParserError extends Error {}

/**
 * Calculates the line number in a string based on a given character index.
 *
 * @param template - The string template to analyze.
 * @param pos - The character index for which the line number is calculated.
 * @param at - The starting line number (default is 1).
 * @returns The line number corresponding to the character index.
 * @throws `ParserError` if the pos exceeds the length of the template.
 */
export function parseLine(
  template: string,
  pos: number,
  at: number = 1
): number {
  if (!(isStr(template) && isInt(pos) && isInt(at))) {
    throw new ParserError('Invalid arguments provided');
  }

  if (pos > template.length) {
    throw new ParserError('Invalid position provided');
  }

  let line = at;

  for (let index = 0; index < pos; index++) {
    const character = template[index];

    if (character === '\n') {
      line++;
    }
  }

  return line;
}

/**
 * Parses the arguments from a component statement.
 *
 * @param name - Name of the component where the statement is located.
 * @param statement - The full statement to parse arguments from.
 * @param line - The line number of the statement for error reporting.
 * @param type - The type of statement (`if`, `elseif`, `include`, `foreach`, `render`, `print`, `place`, `log`).
 * @returns The parsed arguments as a string.
 * @throws` SyntaxError` if the statement contains syntax errors, such as mismatched parentheses or invalid formatting.
 */
export function parseStatementArguments(
  name: string,
  statement: string,
  line: number,
  type: StatementType
): string {
  if (!(isStr(name) && isStr(statement) && isInt(line) && isStr(type))) {
    throw new ParserError('Invalid arguments provided');
  }

  if (type !== 'short-print') {
    const test = new RegExp(`\\$${type}[\\s\\n]*\\(`).exec(statement);

    if (!test || test.index !== 0) {
      throw new SyntaxError(
        `Invalid statement in '${name}' at line number ${line}`
      );
    }
  }

  const regex = /[()]/g;

  let start: undefined | number = undefined;
  let indexes: number[] = [];
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(statement)) !== null) {
    const paren = match[0];

    // Set the first match
    if (isUndefined(start)) start = match.index;

    if (paren === '(') indexes.push(match.index);
    else indexes.pop();

    if (indexes.length === 0) {
      // Todo: Next match should be missing or '('
      const regex = /[()]/g;
      regex.lastIndex = match.index + 1;
      const nextMatch = regex.exec(statement);

      // Extra closing paren
      if (nextMatch && nextMatch[0] === ')') {
        throw new SyntaxError(
          `Unexpected closing parentheses found in '${name}' at line number ${parseLine(
            statement,
            nextMatch.index,
            line
          )}`
        );
      }

      return statement.slice(start + 1, match.index).trim();
    }
  }

  if (indexes.length > 0) {
    const index = indexes.pop() as number;
    throw new SyntaxError(
      `Unexpected opening parentheses found in '${name}' at line number ${parseLine(
        statement,
        index,
        line
      )}`
    );
  }
}

/**
 * Parses component statements from a template.
 *
 * @param name - The name of the component being parsed.
 * @param template - The template content to analyze and parse statements from.
 * @param place - Whether to parse `$place` statements as well.
 * @param at - The starting line number (default is 1).
 * @returns An array of parsed statements or `undefined` if no statements are found.
 * @throws `ParserError` if invalid arguments are provided.
 * @throws `SyntaxError` if there are unmatched or unexpected tags in the template.
 */
export function parseStatements(
  name: string,
  template: string,
  place: boolean = false,
  at: number = 1
): State[] | undefined {
  if (!(isStr(name) && isStr(template) && isBool(place) && isInt(at))) {
    throw new ParserError('Invalid arguments provided');
  }

  const regex =
    /\$if|\$endif|\$foreach|\$endforeach|\$render|\$endrender|\$include|\$print|\$\(|\$log|\$place|\$replace/g;
  const openingTags: TagPosition[] = [];

  let match: RegExpExecArray | null;
  let statements: State[] = [];

  while ((match = regex.exec(template)) !== null) {
    const tag = match[0];
    const index = match.index;

    if (tag === '$if') {
      openingTags.push({ sign: '$if', index });
    } else if (tag === '$foreach') {
      openingTags.push({ sign: '$foreach', index });
    } else if (tag === '$render') {
      openingTags.push({ sign: '$render', index });
    } else if (tag === '$endif') {
      // calculate the statement ending position
      match.index = match.index + match[0].length;

      const openingTag = openingTags.pop();
      const closingTag = match;

      if (openingTag?.sign === '$if') {
        if (openingTags.length === 0) {
          const definition = template.slice(openingTag.index, closingTag.index);
          const line = parseLine(template, openingTag.index, at);

          statements.push({
            definition,
            line: line,
            type: 'if',
          });
        }
      } else {
        throw new SyntaxError(
          `Unexpected $endif tag in '${name}' at line number ${parseLine(
            template,
            index,
            at
          )}`
        );
      }
    } else if (tag === '$endforeach') {
      // calculate the statement ending position
      match.index = match.index + match[0].length;

      const openingTag = openingTags.pop();
      const closingTag = match;

      if (openingTag?.sign === '$foreach') {
        if (openingTags.length === 0) {
          const definition = template.slice(openingTag.index, closingTag.index);
          const line = parseLine(template, openingTag.index, at);

          statements.push({
            definition,
            line: line,
            type: 'foreach',
          });
        }
      } else {
        throw new SyntaxError(
          `Unexpected $endforeach tag in '${name}' at line number ${parseLine(
            template,
            index,
            at
          )}`
        );
      }
    } else if (tag === '$endrender') {
      // calculate the statement ending position
      match.index = match.index + match[0].length;

      const openingTag = openingTags.pop();
      const closingTag = match;

      if (openingTag?.sign === '$render') {
        if (openingTags.length === 0) {
          const definition = template.slice(openingTag.index, closingTag.index);

          const line = parseLine(template, openingTag.index, at);

          statements.push({
            definition,
            line: line,
            type: 'render',
          });
        }
      } else {
        throw new SyntaxError(
          `Unexpected $endrender tag in '${name}' at line number ${parseLine(
            template,
            index,
            at
          )}`
        );
      }
    } else if (tag === '$include' && openingTags.length === 0) {
      const line = parseLine(template, index, at);
      const args = parseStatementArguments(
        name,
        template.slice(index),
        line,
        'include'
      );

      statements.push({
        definition: `$include(${args})`,
        line: line,
        type: 'include',
      });
    } else if (tag === '$print' && openingTags.length === 0) {
      const line = parseLine(template, index, at);
      const args = parseStatementArguments(
        name,
        template.slice(index),
        line,
        'print'
      );

      statements.push({
        definition: `$print(${args})`,
        line: line,
        type: 'print',
      });
    } else if (tag === '$(' && openingTags.length === 0) {
      const line = parseLine(template, index, at);
      const args = parseStatementArguments(
        name,
        template.slice(index),
        line,
        'short-print'
      );

      statements.push({
        definition: `$(${args})`,
        line: line,
        type: 'short-print',
      });
    } else if (tag === '$log' && openingTags.length === 0) {
      const line = parseLine(template, index, at);
      const args = parseStatementArguments(
        name,
        template.slice(index),
        line,
        'log'
      );

      statements.push({
        definition: `$log(${args})`,
        line: line,
        type: 'log',
      });
    } else if (tag === '$place') {
      if (!place) {
        throw new SyntaxError(
          `Unexpected $place tag in '${name}' at line number ${parseLine(
            template,
            index,
            at
          )}`
        );
      } else if (openingTags.length === 0) {
        const line = parseLine(template, index, at);
        const args = parseStatementArguments(
          name,
          template.slice(index),
          line,
          'place'
        );

        statements.push({
          definition: `$place(${args})`,
          line: line,
          type: 'place',
        });
      }
    } else if (tag === '$replace') {
      const previousTag = openingTags.pop() as TagPosition;

      if (!previousTag || previousTag.sign !== '$render') {
        throw new SyntaxError(
          `Unexpected $replace tag in '${name}' at line number ${parseLine(
            template,
            index,
            at
          )}`
        );
      }

      openingTags.push(previousTag);
    }
  }

  if (openingTags.length > 0) {
    const openingTag = openingTags.pop() as TagPosition;
    throw new SyntaxError(
      `Invalid ${openingTag.sign.slice(
        1
      )} statement in '${name}' at line number ${parseLine(
        template,
        openingTag.index,
        at
      )}`
    );
  }

  return statements.length > 0 ? statements : undefined;
}

/**
 * Parses statements in the given template and replaces them with placeholders.
 * Each placeholder is uniquely identified using a random UUID.
 *
 * @param name - The name of the template.
 * @param template - The content of the template to be parsed.
 * @param place - Whether to parse placeholders within the template (default: false).
 * @param at - The starting line number (default is 1).
 * @returns A `Template` object containing the template `name`, `layout` and `statement` if any .
 */
export function parseTemplate(
  name: string,
  template: string,
  place: boolean = false,
  at: number = 1
): Template {
  const statements: any = parseStatements(name, template, place, at);

  if (!statements) return { name, layout: template };

  const temp: Template = { name, layout: template, statements };

  statements.forEach((state) => {
    state.placeholder = `{{ ${state.type}: ${randomUUID()} }}`;
    temp.layout = temp.layout.replace(state.definition, state.placeholder);
  });

  return temp;
}

/**
 * Parses a template string into an array of tokens while handling quoted substrings.
 * Quoted substrings are temporarily replaced with placeholders to ensure correct splitting,
 * then restored in the resulting tokens.
 *
 * @param pattern - The template string to parse.
 * @param sep - The regular expression used to separate tokens (default: `/([(),])/g`).
 * @returns An array of parsed tokens with trimmed whitespace.
 */
export function parseTokens(
  pattern: string,
  sep: RegExp = /([(),])/g
): string[] {
  if (!(isStr(pattern) && isRegex(sep))) {
    throw new ParserError('Invalid arguments provided');
  }

  const matches = pattern.match(/'[^']*'|"[^"]*"/g);
  const strings = matches
    ? matches.map((match) => ({ match, key: randomUUID() }))
    : [];

  strings.forEach((string) => {
    pattern = pattern.replace(string.match, string.key);
  });

  const tokens = pattern
    .split(sep)
    .filter((token) => token.trim() !== '')
    .map((token) => token.trim())
    .map((token) => {
      strings.forEach((string) => {
        if (token.includes(string.key)) {
          token = token.replace(string.key, string.match);
        }
      });
      return token;
    });

  return tokens;
}

/**
 * Parses arguments from a list of tokens, ensuring proper syntax and balance of parentheses.
 *
 * @param tokens - The list of tokens to parse, starting with an opening parenthesis `(`.
 * @param name - The name of the component for error reporting.
 * @param line - The line number of the component for error reporting.
 * @returns An array of parsed arguments or `undefined` if no arguments are present.
 * @throws `ParserError` If the provided tokens are invalid.
 * @throws `SyntaxError` If the parentheses are unbalanced or unexpected tokens are found.
 */
export function parseArguments(
  tokens: string[],
  name: string,
  line: number
): string[] | undefined {
  if (!(isFullArr(tokens) && isStr(name) && isInt(line))) {
    throw new ParserError('Invalid arguments provided');
  }

  const token = tokens.shift();
  const args = [];

  if (token !== '(') {
    throw new SyntaxError(`Unexpected token in ${name} at line number ${line}`);
  }

  let level = 1;

  while (tokens.length > 0) {
    const token = tokens.shift();

    if (token === '(') level++;
    else if (token === ')' && level > 0) level--;

    if (level === 0) break;

    args.push(token);
  }

  if (level !== 0) {
    throw new SyntaxError(`Unexpected token in ${name} at line number ${line}`);
  }

  return args.length > 0 ? args : undefined;
}

export class Parser {
  static parseArguments = parseArguments;
  static parseTokens = parseTokens;
  static parseStatements = parseStatements;
  static parseStatementArguments = parseStatementArguments;
  static parseTemplate = parseTemplate;
  static parseLine = parseLine;
}
