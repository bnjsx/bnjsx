import { isObj, isStr, isUndefined } from '../../../helpers';
import { Condition } from '../Condition';

import {
  parseLine,
  ParserError,
  parseStatementArguments,
  parseTemplate,
  Statement,
} from '../Parser';

/**
 * Represents a tag within a conditional block.
 */
type Tag = {
  /**
   * The type of tag: `$if`, `$elseif`, `$else`, or `$endif`.
   */
  sign: '$if' | '$elseif' | '$else' | '$endif';

  /**
   * The index of the tag in the source.
   */
  index: number;
};

/**
 * Represents a single branch of a conditional tree.
 */
type Branch = {
  /**
   * The type of the branch: `if`, `elseif`, or `else`.
   */
  type: 'if' | 'elseif' | 'else';

  /**
   * The content of the branch.
   */
  content: string;

  /**
   * The line number where the branch is defined.
   */
  line: number;
};

/**
 * Represents the entire conditional tree.
 */
type Tree = {
  /**
   * The `if` branch of the tree.
   */
  if: Branch;

  /**
   * Optional `elseif` branches.
   */
  elseif?: Branch[];

  /**
   * Optional `else` branch.
   */
  else?: Branch;
};

/**
 * Represents a condition block.
 */
export type Block = {
  /**
   * The condition associated with this block, if any.
   */
  condition?: Condition;

  /**
   * The main body of the block.
   */
  body: string;

  /**
   * Array of nested statements.
   */
  statements?: Statement[];

  /**
   * The line number where the block found.
   */
  line: number;
};

/**
 * Class representing an `if` statement.
 */
export class If {
  /**
   * The name of the component.
   */
  public name: string;

  /**
   * The line number where the statement found.
   */
  public line: number;

  /**
   * Placeholder of this statement.
   */
  public placeholder: string;

  /**
   * The main `if` block description.
   */
  public if: Block;

  /**
   *  Optional `elseif` block descriptions.
   */
  public elseif?: Block[];

  /**
   * Optional `else` block description.
   */
  public else?: Block;

  /**
   * Creates an instance of `If`.
   *
   * @param name - The name of the component.
   * @param statement - The `foreach` statement object, including its placeholder, line, and definition.
   */
  constructor(name: string, statement: Statement) {
    if (!(isStr(name) && isObj(statement))) {
      throw new ParserError('Invalid arguments provided');
    }

    this.name = name;
    this.line = statement.line;
    this.placeholder = statement.placeholder;

    const tree = this.parseTree(statement.definition, this.line);

    this.if = this.processIf(tree.if);

    if (tree.elseif) {
      this.elseif = [];

      tree.elseif.forEach((elseif) => {
        this.elseif.push(this.processElseif(elseif));
      });
    }

    if (tree.else) {
      this.else = this.processElse(tree.else);
    }
  }

  /**
   * Parses a template string into a conditional `Tree` structure.
   *
   * This method identifies and organizes conditional blocks (`$if`, `$elseif`, `$else`, `$endif`)
   * within the provided template. It validates the structure of the tags to ensure proper nesting
   * and syntax, and extracts the content and line numbers for each block.
   *
   * @param template - The template string containing conditional tags.
   * @param at - The line number offset for the template, used to calculate line numbers.
   * @returns A `Tree` object representing the parsed conditional structure.
   * @throws `SyntaxError` If the tags are improperly nested or unexpected tags are encountered.
   */
  parseTree(template: string, at: number): Tree {
    const regex = /\$if|\$elseif|\$else|\$endif/g;
    const tree: Tree = {} as any;

    let level = 0;
    let match: RegExpExecArray | null;
    let prev: Tag[] = []; // previous tag position and sign

    while ((match = regex.exec(template)) !== null) {
      const tag = match[0];
      const index = match.index;

      if (prev.length > 0 && tag === '$if') level++;
      else if (level > 0 && tag === '$endif') level--;
      else if (level === 0) {
        if (tag === '$if') prev.push({ sign: tag, index });
        else if (tag === '$elseif' || tag === '$else') {
          const prevTag: Tag | undefined = prev.pop();
          const nowTag: Tag = { sign: tag, index };

          if (prevTag?.sign === '$if' || prevTag?.sign === '$elseif') {
            const content = template.slice(prevTag.index, nowTag.index);

            if (prevTag.sign === '$if') {
              tree.if = {
                content,
                line: parseLine(template, prevTag.index, at),
                type: 'if',
              };
            } else {
              if (!tree.elseif) tree.elseif = [];

              tree.elseif.push({
                content,
                line: parseLine(template, prevTag.index, at),
                type: 'elseif',
              });
            }

            prev.push(nowTag);
          } else {
            throw new SyntaxError(
              `Unexpected '${tag}' tag in '${
                this.name
              }' at line number ${parseLine(template, index, at)} `
            );
          }
        } else if (tag === '$endif') {
          const prevTag: Tag | undefined = prev.pop();
          const nowTag: Tag = { sign: tag, index };

          if (prevTag) {
            const content = template.slice(prevTag.index, nowTag.index);

            if (prevTag.sign === '$if') {
              tree.if = {
                content,
                line: parseLine(template, prevTag.index, at),
                type: 'if',
              };
            } else if (prevTag.sign === '$elseif') {
              if (!tree.elseif) tree.elseif = [];
              tree.elseif.push({
                content,
                line: parseLine(template, prevTag.index, at),
                type: 'elseif',
              });
            } else {
              tree.else = {
                content,
                line: parseLine(template, prevTag.index, at),
                type: 'else',
              };
            }
          } else {
            throw new SyntaxError(
              `Unexpected '$endif' tag in '${
                this.name
              }' at line number ${parseLine(template, index, at)} `
            );
          }
        }
      }
    }

    if (prev.length > 0) {
      const tag = prev.pop() as Tag;
      throw new SyntaxError(
        `Unexpected '${tag.sign}' tag in '${
          this.name
        }' at line number ${parseLine(template, tag.index, at)}`
      );
    }

    if (isUndefined(tree.if)) {
      throw new SyntaxError(
        `Invalid if statement in '${this.name}' at line number ${this.line}`
      );
    }

    return tree;
  }

  /**
   * Processes an `if` branch and converts it into a `Block` object.
   *
   * This method validates the syntax of the `if` statement, extracts its arguments and body,
   * and parses any nested statements within it.
   *
   * @param branch - The `if` branch to process.
   * @returns A `Block` object representing the processed `if` branch.
   * @throws `SyntaxError` If the `if` statement has a Missing or invalid body.
   */
  processIf(branch: Branch): Block {
    const args = parseStatementArguments(
      this.name,
      branch.content,
      branch.line,
      branch.type as 'if'
    );

    branch.content = branch.content.replace(args, 'condition');

    const regex = /^(?:\$if[\s\n]*\(condition\)(?<body>[\s\S]+))$/;
    const match = regex.exec(branch.content);

    if (!match || match.groups.body.trim().length === 0) {
      throw new SyntaxError(
        `Missing if statement body in '${this.name}' at line number ${branch.line}`
      );
    }

    // Parse nested statements
    const template = parseTemplate(
      this.name,
      match.groups.body,
      false, // No nested place statements
      branch.line
    );

    return {
      condition: new Condition(args, this.name, branch.line),
      body: template.layout,
      statements: template.statements,
      line: branch.line,
    };
  }

  /**
   * Processes an `elseif` branch and converts it into a `Block` object.
   *
   * This method validates the syntax of the `elseif` statement, extracts its arguments and body,
   * and parses any nested statements within it.
   *
   * @param branch - The `elseif` branch to process.
   * @returns A `Block` object representing the processed `elseif` branch.
   * @throws `SyntaxError` If the `elseif` statement has a Missing or invalid body.
   */
  processElseif(branch: Branch): Block {
    const args = parseStatementArguments(
      this.name,
      branch.content,
      branch.line,
      branch.type as 'elseif'
    );

    branch.content = branch.content.replace(args, 'condition');

    const regex = /^(?:\$elseif[\s\n]*\(condition\)(?<body>[\s\S]+))$/;
    const match = regex.exec(branch.content);

    if (!match || match.groups.body.trim().length === 0) {
      throw new SyntaxError(
        `Missing elseif statement body in ''${this.name}'' at line number ${branch.line}`
      );
    }

    // Parse nested statements
    const template = parseTemplate(
      this.name,
      match.groups.body,
      false, // No nested place statements
      branch.line
    );

    return {
      condition: new Condition(args, this.name, branch.line),
      body: template.layout,
      statements: template.statements,
      line: branch.line,
    };
  }

  /**
   * Processes an `else` branch and converts it into a `Block` object.
   *
   * This method validates the syntax of the `else` statement, extracts its body,
   * and parses any nested statements within it.
   *
   * @param branch - The `else` branch to process.
   * @returns A `Block` object representing the processed `else` branch.
   * @throws `SyntaxError` If the `else` statement has a Missing or invalid body.
   */
  processElse(branch: Branch) {
    const regex = /^(?:\$else(?<body>[\s\S]+))$/;
    const match = regex.exec(branch.content);

    if (!match || match.groups.body.trim().length === 0) {
      throw new SyntaxError(
        `Missing else statement body in '${this.name}' at line number ${branch.line}`
      );
    }

    const template = parseTemplate(
      this.name,
      match.groups.body,
      false,
      branch.line
    );

    return {
      body: template.layout,
      statements: template.statements,
      line: branch.line,
    };
  }
}
