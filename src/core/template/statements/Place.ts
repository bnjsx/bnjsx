import { isObj, isStr } from '../../../helpers';
import { ParserError, Statement } from '../Parser';

/**
 * Represents a `$place` statement in a component, used to define a placement key.
 */
export class Place {
  /**
   * The name of the component.
   */
  public name: string;

  /**
   * The line number where the `$place` statement is defined.
   */
  public line: number;

  /**
   * The place statement placeholder.
   */
  public placeholder: string;

  /**
   * The key extracted from the `$place` statement.
   */
  public key: string;

  /**
   * Constructs a new `Place` instance.
   *
   * @param name - The name of the component in which the `$place` statement is defined.
   * @param statement - The `Statement` object containing the `$place` definition and metadata.
   * @throws `SyntaxError` If the `$place` statement is missing or contains an invalid key.
   */
  constructor(name: string, statement: Statement) {
    if (!(isStr(name) && isObj(statement))) {
      throw new ParserError('Invalid arguments provided');
    }

    this.name = name;
    this.line = statement.line;
    this.placeholder = statement.placeholder;

    const match = /^\s*\$place\s*\(\s*(?:'([^']+)'|"([^"]+)")\s*\)\s*$/.exec(
      statement.definition
    );

    if (!match) {
      throw new SyntaxError(
        `Missing or invalid place statement key in '${this.name}' at line number ${this.line}`
      );
    }

    this.key = match[1] ? match[1] : match[2];
  }
}
