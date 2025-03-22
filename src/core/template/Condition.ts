import { isInt, isStr } from "../../helpers";

import { parseArguments, ParserError, parseTokens } from "./Parser";
import { Global } from "./Global";
import { Reference } from "./Reference";
import { Scalar } from "./Scalar";
import { Tool } from "./Tool";

/**
 * Represents a comparison operator in a condition.
 */
type Comparison = {
  /**
   * The type of the operator, which is always 'comparison'.
   */
  type: "comparison";

  /**
   * The comparison operator symbol.
   * Supported symbols: '===', '==', '!==', '!=', '>=', '<=', '<', '>'.
   */
  sign: "===" | "==" | "!==" | "!=" | ">=" | "<=" | "<" | ">";
};

/**
 * Represents a logical operator in a condition.
 */
type Logical = {
  /**
   * The type of the operator, which is always 'logical'.
   */
  type: "logical";

  /**
   * The logical operator symbol.
   * Supported symbols: '&&', '||'.
   */
  sign: "&&" | "||";
};

/**
 * Represents a negation (`not`) operator in a condition.
 */
type Not = {
  /**
   * The type of the operator, which is always 'not'.
   */
  type: "not";

  /**
   * The negation operator symbol.
   * Supported symbol: '!'.
   */
  sign: "!";
};

/**
 * Represents any operator used in conditions, which can be a comparison, logical, or negation operator.
 */
type Operator = Not | Logical | Comparison;

/**
 * Represents a basic operand in a condition.
 * It can reference global, local, tool, scalar, or reference types.
 */
export type Operand = {
  /**
   * The type of this structure, which is always 'operand'.
   */
  type: "operand";

  /**
   * Indicates whether the operand is enclosed in parentheses.
   */
  paren: boolean;

  /**
   * The value of the operand, which can be one of several supported types.
   */
  value: Global | Tool | Scalar | Reference;
};

/**
 * Represents a unary operation in a condition.
 * A unary operation involves a single operand and an operator (e.g., `!operand`).
 */
export type Unary = {
  /**
   * The type of this structure, which is always 'unary'.
   */
  type: "unary";

  /**
   * Indicates whether the unary operation is enclosed in parentheses.
   */
  paren: boolean;

  /**
   * The operator used in the unary operation.
   */
  operator: Operator;

  /**
   * The operand involved in the unary operation.
   * It can be a binary structure or another operand.
   */
  operand: Operand | Binary | Unary;
};

/**
 * Represents a binary operation in a condition.
 * A binary operation involves two operands and an operator (e.g., `operand1 && operand2`).
 */
export type Binary = {
  /**
   * The type of this structure, which is always 'binary'.
   */
  type: "binary";

  /**
   * Indicates whether the binary operation is enclosed in parentheses.
   */
  paren: boolean;

  /**
   * The operator used in the binary operation.
   */
  operator: Operator;

  /**
   * The left operand of the binary operation.
   */
  left: Binary | Unary | Operand;

  /**
   * The right operand of the binary operation.
   */
  right: Binary | Unary | Operand;
};

/**
 * Represents the parts of a parsed condition.
 * It is used for breaking down a condition into its components.
 */
type Parts = {
  /**
   * The tokens that make up the left-hand side of the condition.
   */
  left: string[];

  /**
   * The tokens that make up the right-hand side of the condition.
   */
  right: string[];

  /**
   * The operator token that connects the left and right sides.
   */
  operator: string;
};

/**
 * Checks if the given pattern is a logical operator.
 *
 * Logical operators include `||` (OR) and `&&` (AND).
 *
 * @param pattern - The pattern to be checked.
 * @returns `true` if the pattern is a logical operator, otherwise `false`.
 */
function isLogical(pattern: string): boolean {
  return ["||", "&&"].includes(pattern);
}

/**
 * Checks if the given pattern is a comparison operator.
 *
 * Comparison operators include `===`, `==`, `!==`, `!=`, `<=`, `>=`, `<`, and `>`.
 *
 * @param pattern - The pattern to be checked.
 * @returns `true` if the pattern is a comparison operator, otherwise `false`.
 */
function isComparison(pattern: string): boolean {
  return ["===", "==", "!==", "!=", "<=", ">=", "<", ">"].includes(pattern);
}

/**
 * Checks if the given pattern represents a negation operator.
 *
 * The negation operator is represented by `!`.
 *
 * @param pattern - The pattern to be checked.
 * @returns `true` if the pattern is a negation operator, otherwise `false`.
 */
function isNot(pattern: string): boolean {
  return pattern === "!";
}

/**
 * Resolves the operator type.
 *
 * This method checks if the given token is a comparison operator, a logical operator,
 * or a negation operator. It returns an operator object with a `type` and `sign` field.
 *
 * @param token - The token to be processed, which should be a string representing an operator.
 * @returns An object representing the operator with a `type` and `sign` field.
 * @throws `ParserError` If the token does not match a known operator type.
 */
function resolve(token: string): Operator {
  if (isComparison(token)) {
    return { type: "comparison", sign: token } as Comparison;
  }

  if (isLogical(token)) {
    return { type: "logical", sign: token } as Logical;
  }

  return { type: "not", sign: token } as Not;
}

/**
 * Represents a condition in a component.
 */
export class Condition {
  /**
   * The line number where the condition is located.
   */
  public line: number;

  /**
   * The name of the component where the condition is used.
   */
  public name: string;

  /**
   * The structured representation of the condition, including its logical, comparison, or operand components.
   */
  public description: Binary | Unary | Operand;

  /**
   * Constructs an instance of `Condition`.
   *
   * @param pattern - The condition string to be parsed.
   * @param name - The name of the componen where the condition is found.
   * @param line - The line number in the componen where the condition is located.
   *
   * @throws `SyntaxError` If the condition string does not follow the expected syntax.
   */
  constructor(pattern: string, name: string, line: number) {
    if (!(isStr(pattern) && isStr(name) && isInt(line))) {
      throw new ParserError("Invalid arguments provided");
    }

    this.line = line;
    this.name = name;

    const regex = /([()]|={2,3}|[|&]{2}|[><!]={0,2})/g;
    const tokens = parseTokens(pattern, regex);

    this.description = this.process(tokens);
  }

  /**
   * Splits the given array of tokens based on logical or comparison operators.
   *
   * This method iterates through the tokens and uses the provided validators to split
   * tokens into left and right parts based on the first operator found outside of parentheses.
   *
   * @param tokens - The array of tokens to be parsed and split.
   * @returns A `Parts` object containing the left and right parts of the split tokens along with the operator if a split occurs.
   * @throws `SyntaxError` If the parentheses in the tokens are not properly balanced.
   */
  private split(tokens: string[]): Parts | undefined {
    const validators = [isLogical, isComparison];

    let level = 0;

    for (let i = 0; i < validators.length; i++) {
      const validator = validators[i];

      for (let index = 0; index < tokens.length; index++) {
        const token = tokens[index];

        if (token === "(") level++;
        else if (token === ")") level--;

        if (level === 0 && validator(token)) {
          return {
            left: tokens.slice(0, index),
            right: tokens.slice(index + 1),
            operator: tokens[index],
          };
        }
      }
    }

    if (level !== 0) {
      throw new SyntaxError(
        `Unexpected parentheses in ${this.name} at line number ${this.line}`
      );
    }

    return undefined;
  }

  /**
   * Parses and describes the given condition as a structured representation.
   *
   * This method processes the tokens of a condition recursively to construct:
   * - **Binary expressions**: Comprising a left operand, an operator, and a right operand.
   * - **Unary expressions**: Including an operator and a single operand.
   * - **Operands**: Representing specific values, such as scalars, globals, locals, references, or tools.
   *
   * If parentheses are detected in the condition, the `paren` flag ensures they are correctly represented in the structure.
   *
   * @param tokens - An array of tokens representing the condition to be parsed.
   * @param paren - A flag indicating whether the condition is enclosed in parentheses. Defaults to `false`.
   * @returns A structured representation of the condition as one of the following:
   * - A `Binary` object for binary conditions.
   * - A `Unary` object for unary condition.
   * - An `Operand` object for single values.
   *
   * @throws `SyntaxError` If the condition does not match the expected syntax or structure.
   */
  private process(
    tokens: string[],
    paren: boolean = false
  ): Binary | Unary | Operand {
    const parts = this.split(tokens);

    if (parts) {
      const left = this.process(parts.left);
      const right = this.process(parts.right);
      const operator = resolve(parts.operator);

      return { type: "binary", paren, operator, left, right } as Binary;
    }

    const token = tokens.shift() as string;

    if (token) {
      if (tokens.length === 0) {
        if (Scalar.check(token)) {
          return {
            paren,
            type: "operand",
            value: new Scalar(token, this.name, this.line),
          };
        }

        if (Global.check(token)) {
          return {
            paren,
            type: "operand",
            value: new Global(token, this.name, this.line),
          };
        }

        if (Reference.check(token)) {
          return {
            paren,
            type: "operand",
            value: new Reference(token, this.name, this.line),
          };
        }
      }

      if (token === "(") {
        tokens.unshift(token);
        return this.process(parseArguments(tokens, this.name, this.line), true);
      }

      if (isNot(token)) {
        return {
          type: "unary",
          paren,
          operator: resolve(token),
          operand: this.process(tokens),
        } as Unary;
      }

      if (Tool.check(token)) {
        return {
          paren,
          type: "operand",
          value: new Tool(token.concat(tokens.join("")), this.name, this.line),
        };
      }
    }

    throw new SyntaxError(
      `Invalid condition expression in ${this.name} at line number ${this.line}`
    );
  }
}
