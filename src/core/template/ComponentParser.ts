import { parseLine, parseTemplate, Statement } from './Parser';
import { Locals, Render } from './statements/Render';
import { ForEach } from './statements/ForEach';
import { Include } from './statements/Include';
import { Block, If } from './statements/If';
import { Place } from './statements/Place';
import { Print } from './statements/Print';
import { Log } from './statements/Log';
import { Reference } from './Reference';
import { Condition } from './Condition';
import { Global } from './Global';
import { Scalar } from './Scalar';
import { Tool } from './Tool';
import { isDefined } from '../../helpers';

/**
 * Describer type, representing different entities in a template.
 */
export type Describer = Global | Tool | Reference | Scalar;

/**
 * Represents a block inside an if statement.
 */
export interface IfNodeBlock {
  line: number; // Line number of the block
  body: string; // Body content of the block
  nodes?: Node[]; // Nodes within the block
  condition?: Condition; // Optional condition of the block
}

/**
 * Represents an IfNode, which corresponds to an `if` statement.
 */
export interface IfNode {
  type: 'if'; // Type of the statement (if)
  line: number; // Line number of the `if` statement
  placeholder: string; // Placeholder associated with the `if` statement
  if: IfNodeBlock; // Main block of the `if` statement
  elseif?: IfNodeBlock[]; // Array of elseif blocks
  else?: IfNodeBlock; // Optional else block
}

/**
 * Represents a ForEachNode, corresponding to a `foreach` statement.
 */
export interface ForEachNode {
  type: 'foreach'; // Type of the statement (foreach)
  line: number; // Line number of the `foreach` statement
  placeholder: string; // Placeholder associated with the `foreach` statement
  item: string; // Item variable of the iteration
  collection: Tool | Global | Reference; // Collection being iterated
  body: string; // Body content of the `foreach` block
  index?: string; // Optional index variable
  nodes?: Node[]; // Nodes inside the `foreach` block
}

/**
 * Represents a replacement node for a RenderNode.
 */
export interface ReplaceNode {
  key: string; // Place key
  body: string; // Body of the replacement
  nodes?: Node[]; // Nodes inside the replacement
}

/**
 * Represents a RenderNode, corresponding to a `render` statement.
 */
export interface RenderNode {
  type: 'render'; // Type of the statement (render)
  line: number; // Line number of the `render` statement
  placeholder: string; // Placeholder associated with the `render` statement
  path: string; // Path of the component to render
  locals?: Locals; // Local variables for the render
  replaceNodes?: ReplaceNode[]; // Replacement nodes for the render
}

/**
 * Represents an IncludeNode, corresponding to an `include` statement.
 */
export interface IncludeNode {
  type: 'include'; // Type of the statement (include)
  line: number; // Line number of the `include` statement
  placeholder: string; // Placeholder associated with the `include` statement
  path: string; // Path of the included component
}

/**
 * Represents a PrintNode, corresponding to a `print` statement.
 */
export interface PrintNode {
  type: 'print'; // Type of the statement (print)
  line: number; // Line number of the `print` statement
  placeholder: string; // Placeholder associated with the `print` statement
  describer: Describer; // Describer to print
}

/**
 * Represents a LogNode, corresponding to a `log` statement.
 */
export interface LogNode {
  type: 'log'; // Type of the statement (log)
  line: number; // Line number of the `log` statement
  placeholder: string; // Placeholder associated with the `log` statement
  describer: Describer; // Describer to log
}

/**
 * Represents a PlaceNode, corresponding to a `place` statement.
 */
export interface PlaceNode {
  type: 'place'; // Type of the statement (place)
  line: number; // Line number of the `place` statement
  placeholder: string; // Placeholder associated with the `place` statement
  key: string; // Place key
}

/**
 * Represents all supported template node.
 */
export type Node =
  | IfNode
  | ForEachNode
  | RenderNode
  | IncludeNode
  | PrintNode
  | LogNode
  | PlaceNode;

/**
 * `ComponentParser` class for parsing and representing a component template.
 */
export class ComponentParser {
  public name: string; // Name of the component
  public layout: string; // Layout of the component
  public nodes: Node[]; // Nodes within the component

  /**
   * Constructs a new `ComponentParser` instance.
   *
   * @param name - Name of the component.
   * @param template - Template string of the component.
   */
  constructor(name: string, template: string) {
    this.name = name;

    const { layout, statements } = parseTemplate(
      name,
      this.deleteComments(template),
      true
    );

    this.layout = layout;

    if (statements) {
      this.nodes = this.setNodes(statements);
    }
  }

  /**
   * Processes a list of statements and converts them into corresponding nodes.
   *
   * @param statements - Array of statements to be converted into nodes.
   * @returns An array of nodes representing the given statements.
   * @throws `ParserError` if an unexpected node type is encountered.
   */
  private setNodes(statements: Statement[]): Node[] {
    const nodes: Node[] = [];

    statements.forEach((statement) => {
      switch (statement.type) {
        case 'if':
          nodes.push(this.ifNode(statement));
          break;
        case 'foreach':
          nodes.push(this.forEachNode(statement));
          break;
        case 'render':
          nodes.push(this.renderNode(statement));
          break;
        case 'include':
          nodes.push(this.includeNode(statement));
          break;
        case 'print':
          nodes.push(this.printNode(statement));
          break;
        case 'short-print':
          nodes.push(this.printNode(statement));
          break;
        case 'log':
          nodes.push(this.logNode(statement));
          break;
        case 'place':
          nodes.push(this.placeNode(statement));
          break;
      }
    });

    return nodes;
  }

  /**
   * Creates an IfNodeBlock from an IfBlock object.
   *
   * @param block - Block object to convert into an IfNodeBlock.
   * @returns An IfNodeBlock representing the given Block.
   */
  private ifNodeBlock(block: Block): IfNodeBlock {
    const node: IfNodeBlock = {
      line: block.line,
      body: block.body,
    };

    if (block.condition) node.condition = block.condition;
    if (block.statements) node.nodes = this.setNodes(block.statements);

    return node;
  }

  /**
   * Creates a `IfNode` for the given statement.
   *
   * @param statement - The `if` statement to convert.
   * @returns An `IfNode` representing the given Statement.
   */
  private ifNode(statement: Statement): IfNode {
    const instance = new If(this.name, statement);

    const node: IfNode = {
      line: statement.line,
      type: 'if',
      placeholder: statement.placeholder,
      if: this.ifNodeBlock(instance.if),
    };

    if (instance.elseif) {
      node.elseif = [];

      instance.elseif.forEach((block) => {
        node.elseif.push(this.ifNodeBlock(block));
      });
    }

    if (instance.else) {
      node.else = this.ifNodeBlock(instance.else);
    }

    return node;
  }

  /**
   * Creates a `ForEachNode` for the given statement.
   *
   * @param statement - The `foreach` statement to convert.
   * @returns A `ForEachNode` representing the given Statement.
   */
  private forEachNode(statement: Statement): ForEachNode {
    const forEach = new ForEach(this.name, statement);

    const node: ForEachNode = {
      line: statement.line,
      type: 'foreach',
      placeholder: statement.placeholder,
      item: forEach.item,
      collection: forEach.collection,
      body: forEach.body,
      index: forEach.index,
    };

    if (forEach.statements) {
      node.nodes = this.setNodes(forEach.statements);
    }

    return node;
  }

  /**
   * Creates a `RenderNode` for the given statement.
   *
   * @param statement - The `render` statement to convert.
   * @returns A `RenderNode` representing the given Statement.
   */
  private renderNode(statement: Statement): RenderNode {
    const render = new Render(this.name, statement);

    const node: RenderNode = {
      line: statement.line,
      type: 'render',
      placeholder: statement.placeholder,
      path: render.path,
      locals: render.locals,
    };

    if (render.replacements) {
      node.replaceNodes = [];

      render.replacements.forEach((replacement) => {
        const replaceNode: ReplaceNode = {
          key: replacement.key,
          body: replacement.body,
        };

        if (replacement.statements) {
          replaceNode.nodes = this.setNodes(replacement.statements);
        }

        node.replaceNodes.push(replaceNode);
      });
    }

    return node;
  }

  /**
   * Creates a `PrintNode` for the given statement.
   *
   * @param statement - The `print` statement to convert.
   * @returns A `PrintNode` representing the given Statement.
   */
  private printNode(statement: Statement): PrintNode {
    const print = new Print(this.name, statement);

    return {
      type: 'print',
      line: statement.line,
      placeholder: statement.placeholder,
      describer: print.value,
    };
  }

  /**
   * Creates a `LogNode` for the given statement.
   *
   * @param statement - The `log` statement to convert.
   * @returns A `LogNode` representing the given Statement.
   */
  private logNode(statement: Statement): LogNode {
    const log = new Log(this.name, statement);

    return {
      type: 'log',
      line: statement.line,
      placeholder: statement.placeholder,
      describer: log.value,
    };
  }

  /**
   * Creates an `IncludeNode` for the given statement.
   *
   * @param statement - The `include` statement to convert.
   * @returns An `IncludeNode` representing the given Statement.
   */
  private includeNode(statement: Statement): IncludeNode {
    const include = new Include(this.name, statement);

    return {
      type: 'include',
      line: statement.line,
      placeholder: statement.placeholder,
      path: include.path,
    };
  }

  /**
   * Creates a `PlaceNode` for the given statement.
   *
   * @param statement - The `print` statement to convert.
   * @returns A `PlaceNode` representing the given Statement.
   */
  private placeNode(statement: Statement): PlaceNode {
    const place = new Place(this.name, statement);

    return {
      type: 'place',
      line: statement.line,
      placeholder: statement.placeholder,
      key: place.key,
    };
  }

  /**
   * Extracts all comments from the provided template string.
   *
   * Comments are identified by the `$comment` and `$endcomment` tags.
   * Nested `$comment` tags or mismatched `$comment` and `$endcomment` tags
   * will result in a `SyntaxError`.
   *
   * @param template - The template string to parse for comments.
   * @returns An array of comment strings or `undefined` if no comments are found.
   * @throws SyntaxError - If `$comment` and `$endcomment` tags are mismatched or improperly nested.
   */
  private parseComments(template: string): string[] | undefined {
    const regex = /\$comment|\$endcomment/g;
    const comments: string[] = [];

    let openingTags: number[] = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
      const tag = match[0];
      const index = match.index;

      if (tag === '$comment') {
        if (openingTags.length > 0) {
          const line = parseLine(template, index);
          throw new SyntaxError(
            `Unexpected $comment tag found in '${this.name}' at line number ${line}`
          );
        }
        openingTags.push(index);
      } else if (tag === '$endcomment') {
        const openingTagIndex = openingTags.pop();

        if (isDefined(openingTagIndex)) {
          const comment = template.slice(
            openingTagIndex,
            index + '$endcommnet'.length
          );
          comments.push(comment);
        } else {
          const line = parseLine(template, index);
          throw new SyntaxError(
            `Unexpected $endcomment tag found in '${this.name}' at line number ${line}`
          );
        }
      }
    }

    if (openingTags.length > 0) {
      const index = openingTags.pop() as number;
      const line = parseLine(template, index);
      throw new SyntaxError(
        `Unexpected $comment tag found in '${this.name}' at line number ${line}`
      );
    }

    return comments.length > 0 ? comments : null;
  }

  /**
   * Removes all comments from the provided template string.
   *
   * Comments are identified and extracted using the `parseComments` method.
   * The content of comments is replaced with equivalent newlines to maintain
   * line structure in the resulting template.
   *
   * @param template - The template string from which comments should be removed.
   * @returns A new string with all comments removed and line structure preserved.
   */
  private deleteComments(template: string): string {
    const comments = this.parseComments(template);

    if (comments) {
      comments.forEach((comment) => {
        let lines = 0;

        for (let index = 0; index < comment.length; index++) {
          const character = comment[index];
          if (character === '\n') lines++;
        }

        template = template.replace(comment, '\n'.repeat(lines));
      });
    }

    return template;
  }
}
