import { isObj, isStr } from '../../../helpers';
import { ParserError, parseStatementArguments, Statement } from '../Parser';

/**
 * Class representing an `Include` statement in a component.
 */
export class Include {
  /**
   * The name of the component.
   */
  public name: string;

  /**
   * The line number where the include statement was found.
   */
  public line: number;

  /**
   * The include statement placeholder.
   */
  public placeholder: string;

  /**
   * The path specified in the include statement.
   */
  public path: string;

  /**
   * Creates an instance of the `Include` class.
   *
   * @param name - The name of the component that contains the include statement.
   * @param statement - The `Statement` object containing the `include` definition.
   * @throws `SyntaxError` If the parsed path is not a valid dot notation expression.
   */
  constructor(name: string, statement: Statement) {
    if (!(isStr(name) && isObj(statement))) {
      throw new ParserError('Invalid arguments provided');
    }

    this.name = name;
    this.line = statement.line;
    this.placeholder = statement.placeholder;

    const path = parseStatementArguments(
      name,
      statement.definition,
      statement.line,
      statement.type
    );

    // path must be a dot notation expression
    if (!path) {
      throw new SyntaxError(
        `Missing or invalid include statement path in '${this.name}' at line number ${this.line}`
      );
    }

    const match = path.match(/^\s*'([^']+)'|"([^"]+)"\s*$/);

    if (!match) {
      throw new SyntaxError(
        `Missing or invalid include statement path in '${this.name}' at line number ${this.line}`
      );
    }

    this.path = match[1] ? match[1] : match[2];
  }
}
