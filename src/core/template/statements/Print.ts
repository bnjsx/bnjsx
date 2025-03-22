import { Reference } from '../Reference';
import { Scalar } from '../Scalar';
import { Global } from '../Global';
import { Tool } from '../Tool';

import { isObj, isStr } from '../../../helpers';

import {
  ParserError,
  parseStatementArguments,
  parseTokens,
  Statement,
} from '../Parser';

/**
 * Represents a `$print` statement in a component, used for displaying a value.
 */
export class Print {
  /**
   * The name of the component in which the `$print` statement is defined.
   */
  public name: string;

  /**
   * The line number where the `$print` statement is defined.
   */
  public line: number;

  /**
   * The print statement placeholder.
   */
  public placeholder: string;

  /**
   * The value to be printed, resolved to a specific type.
   */
  public value: Scalar | Global | Tool | Reference;

  /**
   * Constructs a new `Print` instance.
   *
   * @param name - The name of the component in which the `$print` statement is defined.
   * @param statement - The `Statement` object containing the `$print` definition and metadata.
   * @throws `SyntaxError` If the `$print` statement value is missing or invalid.
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
   * Resolves the type of the value being printed.
   *
   * @param value - The value name or expression to resolve.
   * @returns The resolved type of the value, which can be a `Reference`, `Global`, `Tool`, or `Scalar`.
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
        `Missing or invalid print statement value provided in '${this.name}' at line number ${this.line}`
      );
    }

    if (Tool.check(tokens[0])) {
      return new Tool(value, this.name, this.line);
    }

    throw new SyntaxError(
      `Missing or invalid print statement value provided in '${this.name}' at line number ${this.line}`
    );
  }
}
