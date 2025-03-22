import {
  ParserError,
  parseStatementArguments,
  parseTemplate,
  parseTokens,
  Statement,
} from '../Parser';

import { Reference } from '../Reference';
import { Global } from '../Global';
import { Tool } from '../Tool';

import { isObj, isStr } from '../../../helpers';

/**
 * Represents the parsed arguments of a `foreach` statement.
 */
type Arguments = {
  /**
   * The full matched string representing the `foreach` statement arguments.
   */
  match: string;

  /**
   * The variable name representing the current item in the iteration.
   */
  item: string;

  /**
   * The variable name representing the index of the current item in the iteration (optional).
   */
  index?: string;

  /**
   * The collection being iterated over.
   * This can be a reference, local variable, global variable, or tool.
   */
  collection: Reference | Global | Tool;
};

/**
 * Represents a `foreach` statement in a template.
 * This class parses and validates the `foreach` statement, extracting its arguments,
 * resolving the collection type, and processing its body and nested statements.
 */
export class ForEach {
  /**
   * The name of the component containing the `foreach` statement.
   */
  public name: string;

  /**
   * The line number where the `foreach` statement is located.
   */
  public line: number;

  /**
   * The placeholder in the component representing the `foreach` statement.
   */
  public placeholder: string;

  /**
   * The variable name representing the current item in the iteration.
   */
  public item: string;

  /**
   * The variable name representing the index of the current item in the iteration (optional).
   */
  public index?: string;

  /**
   * The collection being iterated over.
   * This can be a reference, local variable, global variable, or tool.
   */
  public collection: Reference | Global | Tool;

  /**
   * The content of the `foreach` statement.
   */
  public body: string;

  /**
   * The nested statements within the `foreach` body, if any.
   */
  public statements?: Statement[];

  /**
   * Creates a new `ForEach` statement.
   *
   * @param name - The name of the component.
   * @param statement - The `foreach` statement object, including its placeholder, line, and definition.
   * @throws `SyntaxError` If the statement body is Missing or invalid.
   */
  constructor(name: string, statement: Statement) {
    if (!(isStr(name) && isObj(statement))) {
      throw new ParserError('Invalid arguments provided');
    }

    this.name = name;
    this.line = statement.line;
    this.placeholder = statement.placeholder;

    const args = this.extract(statement.definition);

    this.item = args.item;
    this.index = args.index;
    this.collection = args.collection;

    const regex = /^(?:\$foreach[\s\n]*\(args\)(?<body>[\s\S]*)\$endforeach)$/;
    const match = regex.exec(statement.definition.replace(args.match, 'args'));

    if (!match || match.groups.body.trim().length === 0) {
      throw new SyntaxError(
        `Missing foreach statement body in '${this.name}' at line number ${statement.line}`
      );
    }

    // Parse nested statements from body
    const template = parseTemplate(
      this.name,
      match.groups.body,
      false, // No nested place statements
      statement.line
    );

    this.body = template.layout;
    this.statements = template.statements;
  }

  /**
   * Extracts and validates the arguments from the `foreach` statement definition.
   *
   * @param statement - The `foreach` statement definition.
   * @returns The parsed arguments, including the item, index (optional), and collection.
   * @throws `SyntaxError` If the arguments are Missing or invalid.
   */
  private extract(statement: string): Arguments {
    const args = parseStatementArguments(
      this.name,
      statement,
      this.line,
      'foreach'
    );

    const match =
      /^(?<item>[a-zA-Z_$][a-zA-Z0-9_$]*)[\s\n]*(?:,[\s\n]*(?<index>[a-zA-Z_$][a-zA-Z0-9_$]*))?[\s\n]*,[\s\n]*(?<collection>[\s\S]+)$/.exec(
        args
      );

    if (match?.groups.item && match.groups.collection) {
      return {
        match: match[0],
        item: match.groups.item,
        index: match.groups.index ? match.groups.index : undefined,
        collection: this.resolve(match.groups.collection.trim()),
      };
    }

    throw new SyntaxError(
      `Missing or invalid foreach statement arguments in '${this.name}' at line number ${this.line}`
    );
  }

  /**
   * Resolves the type of the collection being iterated over in the `foreach` statement.
   *
   * @param collection - The collection name or expression.
   * @returns The resolved type of the collection, which can be a reference, local, global, or tool.
   * @throws `SyntaxError` If the collection is Missing or invalid.
   */
  private resolve(collection: string): Reference | Global | Tool {
    const tokens = parseTokens(collection);

    if (tokens.length === 1) {
      const token = tokens.shift() as string;

      if (Global.check(token)) {
        return new Global(collection, this.name, this.line);
      }

      if (Reference.check(token)) {
        return new Reference(collection, this.name, this.line);
      }

      throw new SyntaxError(
        `Missing or invalid foreach statement collection in '${this.name}' at line number ${this.line}`
      );
    }

    const pattern = tokens.shift() as string;

    if (Tool.check(pattern)) {
      return new Tool(collection, this.name, this.line);
    }

    throw new SyntaxError(
      `Missing or invalid foreach statement collection in '${this.name}' at line number ${this.line}`
    );
  }
}
