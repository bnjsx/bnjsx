import { isObj, isStr } from '../../../helpers';

import { Reference } from '../Reference';
import { Scalar } from '../Scalar';
import { Global } from '../Global';
import { Tool } from '../Tool';

import {
  ParserError,
  parseStatementArguments,
  parseTokens,
  Statement,
} from '../Parser';

/**
 * Class representing a `Log` statement in a component.
 */
export class Log {
  /**
   * The name of the component.
   */
  public name: string;

  /**
   * The line number where the log statement is defined.
   */
  public line: number;

  /**
   * The log statement placeholder.
   */
  public placeholder: string;

  /**
   * The value associated with the log statement.
   */
  public value: Scalar | Global | Tool | Reference;

  /**
   * Constructs a new `Log` instance.
   *
   * @param name - The name of the log statement.
   * @param statement - The `Statement` object containing the log's definition and metadata.
   * @throws `SyntaxError` If the log statement has missing or invalid values.
   */
  constructor(name: string, statement: Statement) {
    if (!(isStr(name) && isObj(statement))) {
      throw new ParserError('Invalid arguments provided');
    }

    this.name = name;
    this.line = statement.line;
    this.placeholder = statement.placeholder;

    const value = parseStatementArguments(
      name,
      statement.definition,
      statement.line,
      statement.type
    );

    this.value = this.resolve(value);
  }

  /**
   * Resolves the type of the value being logged.
   *
   * @param value - The value name or expression to resolve.
   * @returns The resolved type of the value, which can be a `Reference`, `Local`, `Global`, `Tool`, or `Scalar`.
   * @throws `SyntaxError` If the value is missing or invalid.
   */
  private resolve(value: string): Reference | Global | Tool | Scalar {
    const tokens = parseTokens(value);

    if (tokens.length === 1) {
      if (Scalar.check(tokens[0])) {
        return new Scalar(value, this.name, this.line);
      }

      if (Global.check(tokens[0])) {
        return new Global(value, this.name, this.line);
      }

      if (Reference.check(tokens[0])) {
        return new Reference(value, this.name, this.line);
      }

      throw new SyntaxError(
        `Missing or invalid log statement value provided in '${this.name}' at line number ${this.line}`
      );
    }

    if (Tool.check(tokens[0])) {
      return new Tool(value, this.name, this.line);
    }

    throw new SyntaxError(
      `Missing or invalid log statement value provided in '${this.name}' at line number ${this.line}`
    );
  }
}
