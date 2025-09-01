import { isDefined, isUndefined, isObj, isStr } from '../helpers';

/**
 * Represents a parsed parameter with a key (name) and its type (required, optional, or option).
 *
 * @property `key` The name of the parameter (e.g., 'name', 'male').
 * @property `type` The type of the parameter (e.g., '!', '?', '-').
 */
type Parameters = Array<{ key: string; type: string }>;

/**
 * Represents a parsed argument with a key (name) and its associated value (string).
 *
 * @property `key` The name of the argument (e.g., 'name', 'male').
 * @property `value` The value of the argument (e.g., 'John', 'true').
 */
type Arguments = Array<{ key: string; value: string }>;

/**
 * The result of validating command arguments, consisting of parsed arguments and options.
 *
 * @property `arguments` An array of parsed arguments.
 * @property `options` An array of parsed options.
 */
type Result = { arguments: Arguments; options: Set<string> };

/**
 * Custom error class used in Command for handling command-related errors.
 */
export class CommandError extends Error {}

/**
 * Abstract class representing a command with a specific syntax, arguments, and options.
 * The class validates and parses the provided command-line arguments according to the defined syntax.
 *
 * @property `syntax` The command syntax that defines the required/optional parameters and options.
 *
 * @throws `CommandError` Throws an error if the provided syntax is invalid.
 */
export abstract class Command {
  /**
   * The command syntax that defines parameters and options.
   */
  protected static syntax: string;

  /**
   * Parsed arguments & options provided during command execution.
   */
  private static result: Result;

  /**
   * Parses the syntax string to extract command parameters.
   * It identifies required arguments (`<!`), optional arguments (`<?`), and options (`<-`).
   *
   * @param syntax The command syntax string to be parsed.
   * @returns An array of parsed parameters with their type and key.
   */
  private static parse(syntax: string): Parameters {
    if (!isStr(syntax)) {
      throw new CommandError(`Invalid syntax: ${String(syntax)}`);
    }

    // Regular expression to match required <!>, optional <?>, and options <-> patterns
    const pattern = /<(\!|\?)\s*([a-z0-9_]+)\s*>/g;

    // Array to store the parsed result (each parameter with its type and name)
    const result: { key: string; type: string }[] = [];

    let match;

    // Match all occurrences of <! name>, <? name>, and <- name> patterns
    while ((match = pattern.exec(syntax)) !== null) {
      // Add the matched parameter (key and type) to the result array
      result.push({ key: match[2], type: match[1] });
    }

    // Return the parsed parameters
    return result;
  }

  /**
   * Validates command arguments based on the provided parameters.
   * Ensures that required arguments are present, optional arguments are handled properly,
   * and options are validated and parsed correctly.
   *
   * @param params An array of parameter definitions (each with a name and type).
   * @param args An array of command-line arguments provided by the user.
   * @returns The parsed result containing arguments and options.
   * @throws `CommandError` if there are too many arguments, missing required arguments, or unexpected options.
   */
  private static validate(params: Parameters, args: Array<string>): Result {
    const result: Result = {
      arguments: new Array(),
      options: new Set(),
    };

    result.options = new Set(args.filter((arg) => arg.startsWith('-')));
    args = args.filter((arg) => !arg.startsWith('-'));

    // Check if the number of arguments exceeds the expected parameters
    if (args.length > params.length) {
      throw new CommandError(`Too many arguments provided`);
    }

    // Iterate through each parameter definition to validate the arguments
    for (let i = 0; i < params.length; i++) {
      const type = params[i].type; // The type of the parameter (!, ?)
      const param = params[i].key; // The name of the parameter
      const arg = args[i]; // The corresponding argument provided by the user

      // Handle optional arguments (type '?')
      if (type === '?') {
        // Add the optional argument to the result (value can be undefined)
        result.arguments.push({ key: param, value: arg });
        continue;
      }

      // Handle required arguments (type '!')
      if (type === '!' && isDefined(arg)) {
        // Add the required argument to the result
        result.arguments.push({ key: param, value: arg });
        continue;
      }

      // If a required argument is missing or invalid, throw an error
      throw new CommandError(`Missing required argument: ${param}`);
    }

    // Return the parsed result containing arguments and options
    return result;
  }

  /**
   * Retrieves the value of a specific argument by its name.
   *
   * @param name The name of the argument to retrieve.
   * @returns The value of the argument.
   * @throws `CommandError` if the argument name is invalid or not found.
   */
  public static argument(name: string): string | void {
    if (!isStr(name)) {
      throw new CommandError(`Invalid argument name: ${String(name)}`);
    }

    if (!isObj(this.result)) {
      // Cache result arguemnts and options
      this.result = this.validate(
        this.parse(this.syntax),
        process.argv.slice(3)
      );
    }

    const argument = this.result.arguments.find(
      (argument) => argument.key === name
    );

    if (isUndefined(argument)) {
      throw new CommandError(`Undefined argument name: ${String(name)}`);
    }

    return argument.value;
  }

  /**
   * Retrieves the value of a specific option by its name.
   *
   * @param name The name of the option to retrieve.
   * @returns The value of the option.
   * @throws `CommandError` if the option name is invalid or not found.
   */
  public static option(name: string): boolean {
    if (!isStr(name)) {
      throw new CommandError(`Invalid option name: ${String(name)}`);
    }

    if (!isObj(this.result)) {
      // Cache result arguemnts and options
      this.result = this.validate(
        this.parse(this.syntax),
        process.argv.slice(3)
      );
    }

    return this.result.options.has('-'.concat(name));
  }

  /**
   * Logs an informational message in blue color.
   *
   * @param message The message to log.
   */
  public static info(message: string) {
    console.log(`\x1b[34m${message}\x1b[0m`);
  }

  /**
   * Logs an error message in red color.
   *
   * @param message The error message to log.
   */
  public static error(message: string) {
    console.log(`\x1b[31m${message}\x1b[0m`);
  }

  /**
   * Logs a warning message in yellow color.
   *
   * @param message The warning message to log.
   */
  public static warning(message: string) {
    console.log(`\x1b[33m${message}\x1b[0m`);
  }

  /**
   * Logs a success message in green color.
   *
   * @param message The success message to log.
   */
  public static success(message: string) {
    console.log(`\x1b[32m${message}\x1b[0m`);
  }

  /**
   * Executes the command logic.
   * This is an abstract method and should be implemented in a subclass.
   *
   * @returns The result of the command execution.
   */
  public static exec(): unknown {
    throw new CommandError(`${this.name}.exec implementation is missing`);
  }
}
