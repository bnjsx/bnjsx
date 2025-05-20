import { isObj, isStr } from '../../../helpers';

import { Reference } from '../Reference';
import { Scalar } from '../Scalar';
import { Tool } from '../Tool';
import {
  parseLine,
  parseStatementArguments,
  parseTemplate,
  parseTokens,
  Statement,
  ParserError,
  parseArguments,
} from '../Parser';
import { Global } from '../Global';

export type Locals = Array<{
  key: string;
  value: Scalar | Global | Tool | Reference;
}>;

type Replacement = {
  key: string;
  body: string;
  statements: Statement[] | undefined;
};

/**
 * Represents a `$render` statement in a component.
 */
export class Render {
  /**
   * The line number where the `$render` statement is defined.
   */
  public line: number;

  /**
   * The name of the component in which the `$render` statement is defined.
   */
  public name: string;

  /**
   * The placeholder associated with the `$render` statement.
   */
  public placeholder: string;

  /**
   * The path to the component to be rendered.
   */
  public path: string;

  /**
   * The local variables to be passed to the rendered component.
   */
  public locals?: Locals;

  /**
   * The replacements to be made within the rendered component.
   */
  public replacements?: Replacement[];

  /**
   * Constructs a new `Render` instance.
   *
   * @param name - The name of the component in which the `$render` statement is defined.
   * @param statement - The `Statement` object containing the `$render` definition and metadata.
   * @throws `SyntaxError` If the `$render` statement has missing or invalid values.
   */
  constructor(name: string, statement: Statement) {
    if (!(isStr(name) && isObj(statement))) {
      throw new ParserError('Invalid arguments provided');
    }

    this.name = name;
    this.line = statement.line;
    this.placeholder = statement.placeholder;

    const args = parseStatementArguments(
      name,
      statement.definition,
      statement.line,
      'render'
    );

    const match = /^\s*(?:'([^']+)'|"([^"]+)")\s*(,[\s\S]*)?$/.exec(args);

    if (!match) {
      throw new SyntaxError(
        `Missing or Invalid render path in '${this.name}' at line number ${this.line}`
      );
    }

    if (match[3]) {
      this.locals = this.parseLocals(match[3]);
    }

    this.path = match[1] ? match[1] : match[2];
    this.replacements = this.parseReplacements(statement.definition);
  }

  /**
   * Parses local variables passed to the `$render` statement.
   *
   * @param template - The string representing the local variables.
   * @returns An array of local variables.
   * @throws `SyntaxError` If the local variables have an invalid format.
   */
  parseLocals(template: string): Locals | undefined {
    const tokens = parseTokens(template);
    const locals: Locals = [];
    const structure: (',' | 'local')[] = [];

    while (tokens.length > 0) {
      const token = tokens.shift() as string;

      if (token === ',') structure.push(',');
      else {
        const match =
          /^(?:(?<key>[a-zA-Z_\$][a-zA-Z0-9_\$]*)\s*=\s*(?<value>[\s\S]*))$/.exec(
            token
          );

        if (match) {
          if (Tool.check(match.groups.value)) {
            structure.push('local');
            const args = parseArguments(tokens, this.name, this.line);
            const pattern = args
              ? match.groups.value.concat('(', ...args, ')')
              : match.groups.value.concat('()');

            locals.push({
              key: match.groups.key,
              value: new Tool(pattern, this.name, this.line),
            });
          } else if (Scalar.check(match.groups.value)) {
            structure.push('local');
            locals.push({
              key: match.groups.key,
              value: new Scalar(match.groups.value, this.name, this.line),
            });
          } else if (Global.check(match.groups.value)) {
            structure.push('local');
            locals.push({
              key: match.groups.key,
              value: new Global(match.groups.value, this.name, this.line),
            });
          } else if (Reference.check(match.groups.value)) {
            structure.push('local');
            locals.push({
              key: match.groups.key,
              value: new Reference(match.groups.value, this.name, this.line),
            });
          } else {
            throw new SyntaxError(
              `Invalid local value provided in '${this.name}' at line number ${this.line}`
            );
          }
        } else {
          throw new SyntaxError(
            `Invalid local key value paires provided in '${this.name}' at line number ${this.line}`
          );
        }
      }
    }

    if (/^(?:(,\s*local\s*)+)$/.test(structure.join(''))) return locals;

    throw new SyntaxError(
      `Invalid local key value paires provided in '${this.name}' at line number ${this.line}`
    );
  }

  /**
   * Parses replacement tags in the `$render` statement.
   *
   * @param template - The string representing the replacement tags.
   * @returns An array of replacements.
   * @throws `SyntaxError` If the replacement tags have an invalid format or structure.
   */
  parseReplacements(template: string): Replacement[] | undefined {
    const replacements: Replacement[] = [];
    const regex = /\$replace|\$endreplace/g;

    let openingTags: number[] = [];
    let match: RegExpExecArray | null = null;

    while ((match = regex.exec(template)) !== null) {
      const tag = match[0];
      const index = match.index;

      if (tag === '$replace') {
        openingTags.push(index);
      } else if (tag === '$endreplace') {
        const openingTag = openingTags.pop() as number;

        if (!openingTag) {
          throw new SyntaxError(
            `Unexpected $replace tag found in '${
              this.name
            }' at line number ${parseLine(template, index, this.line)}`
          );
        }

        if (openingTags.length === 0) {
          const definition = template.slice(
            openingTag,
            index + '$endreplace'.length
          );

          replacements.push(
            this.processReplacement(
              definition,
              parseLine(template, openingTag, this.line)
            )
          );
        }
      }
    }

    if (openingTags.length > 0) {
      const openingTag = openingTags.pop() as number;
      throw new SyntaxError(
        `Unexpected $replace tag found in '${
          this.name
        }' at line number ${parseLine(template, openingTag, this.line)}`
      );
    }

    return replacements.length > 0 ? replacements : undefined;
  }

  /**
   * Processes a single `$replace` block and extracts its key and body.
   *
   * @param replacement - The string representing the replacement block.
   * @param line - The line number where the replacement block starts.
   * @returns A `Replacement` object containing the key, body, and associated statements.
   * @throws `SyntaxError` If the replacement block has an invalid format.
   */
  processReplacement(replacmenet: string, line: number): Replacement {
    const match =
      /^\s*\$replace\s*\(\s*['"]\s*([a-zA-Z_\$][a-zA-Z0-9_\$]*)\s*['"]\s*\)([\s\S]*)\$endreplace\s*$/.exec(
        replacmenet
      );

    if (!match) {
      throw new SyntaxError(
        `Missing or invalid replace key in '${this.name}' at line number ${line}`
      );
    }

    if (match[2].trim().length === 0) {
      throw new SyntaxError(
        `Missing replace body in '${this.name}' at line number ${line}`
      );
    }

    const template = parseTemplate(this.name, match[2], false, line);

    return {
      key: match[1],
      body: template.layout,
      statements: template.statements,
    };
  }
}
