import { isNum, isStr } from '../../helpers';
import { ParserError } from './Parser';

/**
 * Represents a reference to a variable or function in a component.
 */
export class Reference {
  /**
   * The line number in the component where the reference is located.
   */
  public line: number;

  /**
   * The name of the component where the reference is used.
   */
  public name: string;

  /**
   * The reference path, if any.
   */
  public path?: string;

  /**
   * The referenced variable or function name.
   */
  public key: string;

  /**
   * Creates an instance of Reference.
   *
   * @param reference - The reference string to be parsed.
   * @param name - The name of the component where the reference is used.
   * @param line - The line number in the component where the reference is located.
   *
   * @throws `ParserError` If the arguments provided are invalid.
   * @throws `SyntaxError` If the reference string does not match the expected pattern.
   */
  constructor(reference: string, name: string, line: number) {
    if (!(isStr(reference) && isStr(name) && isNum(line))) {
      throw new ParserError(`Invalid arguments provided`);
    }

    this.line = line;
    this.name = name;

    const match =
      /^(?<key>[a-zA-Z_$][a-zA-Z0-9_$]*)(?<path>(\[[0-9]+\]|\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)?$/.exec(
        reference
      );

    // Optional
    if (match?.groups?.path) this.path = match.groups.path;

    // Required
    if (match?.groups?.key) this.key = match.groups.key;
    else {
      throw new SyntaxError(
        `Invalid reference in '${name}' at line number ${line}`
      );
    }
  }

  /**
   * Checks if the given string value matches the reference pattern.
   *
   * @param value - The string value to be checked against the reference pattern.
   * @returns `true` if the value matches the pattern, `false` otherwise.
   */
  public static check(value: string): boolean {
    return /^(?<key>[a-zA-Z_$][a-zA-Z0-9_$]*)(?<path>(\[[0-9]+\]|\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)?$/.test(
      value
    );
  }
}
