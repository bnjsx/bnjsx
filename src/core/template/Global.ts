import { isNum, isStr } from '../../helpers';
import { ParserError } from './Parser';

/**
 * Represents a global variable reference in a component.
 */
export class Global {
  /**
   * The line number in the component.
   */
  public line: number;

  /**
   * The name of the component.
   */
  public name: string;

  /**
   * The path of the global variable, if any.
   */
  public path?: string;

  /**
   * The name of the global variable.
   */
  public key: string;

  /**
   * Constructs an instance of Global.
   *
   * @param global - The global string to be parsed.
   * @param name - The name of the component where the global string is found.
   * @param line - The line number in the component where the global string is found.
   *
   * @throws `SyntaxError` If the global string does not match the expected pattern.
   */
  constructor(global: string, name: string, line: number) {
    if (!(isStr(global) && isStr(name) && isNum(line))) {
      throw new ParserError(`Invalid arguments provided`);
    }

    this.name = name;
    this.line = line;

    const match =
      /^\#(?<key>[a-zA-Z_$][a-zA-Z0-9_$]*)(?<path>(\[[0-9]+\]|\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)?$/.exec(
        global
      );

    // Optional
    if (match?.groups?.path) this.path = match.groups.path;

    // Required
    if (match?.groups?.key) this.key = match.groups.key;
    else {
      throw new SyntaxError(
        `Invalid global reference in ${name} at line number ${line}`
      );
    }
  }

  /**
   * Checks if the given string matches the pattern for global variable references.
   *
   * @param value - The string to be checked.
   * @returns True if the string matches the pattern, otherwise false.
   */
  public static check(value: string): boolean {
    return /^\#(?<name>[a-zA-Z_$][a-zA-Z0-9_$]*)(?<path>(\[[0-9]+\]|\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)?$/.test(
      value
    );
  }
}
