import { isNum, isNumExp, isStr, isStrExp } from '../../helpers';
import { ParserError } from './Parser';

function isBoolExp(val: any): boolean {
  return isStr(val) && ['true', 'false'].includes(val);
}

function isUndefinedExp(val: any): boolean {
  return isStr(val) && val === 'undefined';
}

function isNullExp(val: any): boolean {
  return isStr(val) && val === 'null';
}

/**
 * Represents a scalar value in the component (`string`, `number`, `boolean`, `undefined`, or `null`).
 */
export class Scalar {
  /**
   * The line number where the scalar is located.
   */
  public line: number;

  /**
   * The name of the component.
   */
  public name: string;

  /**
   * The scalar value (casted).
   */
  public value: string | number | boolean | undefined | null;

  /**
   * Creates an instance of Scalar.
   *
   * @param scalar - The scalar value as a string.
   * @param name - The name of the component.
   * @param line - The line number where the scalar is located.
   */
  constructor(scalar: string, name: string, line: number) {
    if (!(isStr(scalar) && isStr(name) && isNum(line))) {
      throw new ParserError(`Invalid arguments provided`);
    }

    if (!Scalar.check(scalar)) {
      throw new SyntaxError(
        `Invalid scalar value in '${name}' at line number ${line}`
      );
    }

    this.name = name;
    this.line = line;

    const casters = [
      { check: isStrExp, cast: (val: string) => val.slice(1, -1) },
      { check: isNumExp, cast: (val: string) => Number(val) },
      {
        check: isBoolExp,
        cast: (val: string) => (val === 'true' ? true : false),
      },
      { check: isUndefinedExp, cast: () => undefined },
      { check: isNullExp, cast: () => null },
    ];

    casters.forEach((caster) => {
      if (caster.check(scalar)) this.value = caster.cast(scalar);
    });
  }

  /**
   * Checks if a given string value matches any of the scalar types.
   *
   * @param value - The string value to check.
   * @returns True if the value matches a scalar type, otherwise false.
   */
  public static check(value: string): boolean {
    return (
      isStrExp(value) ||
      isNumExp(value) ||
      isBoolExp(value) ||
      isUndefinedExp(value) ||
      isNullExp(value)
    );
  }
}
