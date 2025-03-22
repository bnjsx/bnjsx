import { Scalar } from "./Scalar";
import { Reference } from "./Reference";
import { Global } from "./Global";
import { parseArguments, ParserError, parseTokens } from "./Parser";
import { isEmptyArr, isNum, isStr } from "../../helpers";

type ToolArguments = Array<Tool | Global | Scalar | Reference>;

/**
 * Represents a tool reference in a component, including its key, associated arguments,
 * and methods to parse and validate its structure.
 */
export class Tool {
  /**
   * The line number in the component.
   */
  public line: number;

  /**
   * The name of the component.
   */
  public name: string;

  /**
   * The key identifying the tool.
   */
  public key: string;

  /**
   * The arguments associated with the tool, if any.
   */
  public args?: ToolArguments;

  /**
   * The path associated with the tool, if any.
   */
  public path?: string;

  /**
   * Creates an instance of Tool.
   *
   * @param pattern - The string pattern representing the tool. It must follow the tool reference pattern.
   * @param name - The name of the component where the tool is used.
   * @param line - The line number in the component where the tool is located.
   *
   * @throws `SyntaxError` If the tool string does not match the expected pattern or has invalid arguments.
   */
  constructor(pattern: string, name: string, line: number) {
    if (!(isStr(pattern) && isStr(name) && isNum(line))) {
      throw new ParserError(`Invalid arguments provided`);
    }

    this.name = name;
    this.line = line;

    const tokens = parseTokens(pattern);
    const token = tokens.shift() as string;

    const match = /^\@(?<key>(?:[a-zA-Z_\$][a-zA-Z0-9_\$]*))$/.exec(token);

    if (!match) {
      throw new SyntaxError(
        `Invalid tool reference in '${name}' at line number ${line}`
      );
    }

    if (isEmptyArr(tokens)) {
      throw new SyntaxError(
        `Missing tool arguments in '${name}' at line number ${line}`
      );
    }

    this.key = match.groups.key;
    const args = parseArguments(tokens, name, line);
    const path = tokens.join();

    if (path) {
      if (!/^(?:(?:\[[0-9]+\]|\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)$/.test(path)) {
        throw new SyntaxError(
          `Invalid tool path in '${name}' at line number ${line}`
        );
      }

      this.path = path;
    }

    this.args = this.process(args);
  }

  /**
   * Processes tokens and generates tool arguments.
   *
   * This method parses tokens to create instances of supported argument types:
   * `Tool`, `Global`, `Local`, `Scalar`, or `Reference`.
   *
   * @param tokens - An array of tokens to process.
   * @returns An array of `ToolArguments` objects representing the parsed arguments.
   *
   * @throws `SyntaxError` If the tokens do not follow the expected argument structure.
   */
  private process(tokens: string[] | undefined): ToolArguments | undefined {
    if (!tokens) return undefined;

    const result: ToolArguments = [];
    const components = [];

    while (tokens.length > 0) {
      const token = tokens.shift() as string;

      if (token === ",") components.push(",");
      else if (Tool.check(token)) {
        const args = parseArguments(tokens, this.name, this.line);

        const pattern = args
          ? token.concat("(", ...args, ")")
          : token.concat("()");

        result.push(new Tool(pattern, this.name, this.line));
        components.push("arg");
      } else if (Global.check(token)) {
        result.push(new Global(token, this.name, this.line));
        components.push("arg");
      } else if (Scalar.check(token)) {
        result.push(new Scalar(token, this.name, this.line));
        components.push("arg");
      } else if (Reference.check(token)) {
        result.push(new Reference(token, this.name, this.line));
        components.push("arg");
      } else {
        throw new SyntaxError(
          `Invalid tool arguments provided in ${this.name} at line number ${this.line}`
        );
      }
    }

    if (!/^(arg(,arg)*)$/.test(components.join(""))) {
      throw new SyntaxError(
        `Invalid tool arguments provided in ${this.name} at line number ${this.line}`
      );
    }

    return result;
  }

  /**
   * Checks if a given string matches the expected tool reference pattern.
   *
   * @param pattern - The string to be checked.
   * @returns `true` if the string matches the pattern; otherwise, `false`.
   */
  public static check(pattern: string): boolean {
    return /^\@(?<key>(?:[a-zA-Z_\$][a-zA-Z0-9_\$]*))$/.test(pattern);
  }
}
