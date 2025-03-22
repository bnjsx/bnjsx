import { Condition } from '../../../src/core/template/Condition';
import { Scalar } from '../../../src/core/template/Scalar';
import { Global } from '../../../src/core/template/Global';
import { Tool } from '../../../src/core/template/Tool';
import { ParserError } from '../../../src/core/template/Parser';
import { Reference } from '../../../src/core/template/Reference';

describe('Condition', () => {
  describe('constructor', () => {
    it('should initialize with the given name, line number, and process the pattern', () => {
      const pattern = 'x === 10';
      const condition = new Condition(pattern, 'TestComponent', 5);

      expect(condition.name).toBe('TestComponent');
      expect(condition.line).toBe(5);
      expect(condition.description).toEqual({
        type: 'binary',
        paren: false,
        operator: { type: 'comparison', sign: '===' },
        left: {
          type: 'operand',
          paren: false,
          value: expect.any(Reference),
        },
        right: {
          type: 'operand',
          paren: false,
          value: expect.any(Scalar),
        },
      });
    });

    it('should throw a SyntaxError for invalid patterns', () => {
      expect(() => new Condition('x ===', 'TestComponent', 5)).toThrow(
        SyntaxError
      );

      expect(() => new Condition('x @ 10', 'TestComponent', 5)).toThrow(
        SyntaxError
      );
    });

    it('should throw a SyntaxError for invalid arguments', () => {
      const arg = null as any;
      expect(() => new Condition(arg, arg, arg)).toThrow(ParserError);
    });
  });

  describe('process', () => {
    it('should parse a binary condition', () => {
      const condition = new Condition('a && b', 'BinaryTest', 10);
      expect(condition.description).toEqual({
        type: 'binary',
        paren: false,
        operator: { type: 'logical', sign: '&&' },
        left: {
          type: 'operand',
          paren: false,
          value: expect.any(Reference),
        },
        right: {
          type: 'operand',
          paren: false,
          value: expect.any(Reference),
        },
      });
    });

    it('should parse a unary condition', () => {
      const condition = new Condition('!x', 'UnaryTest', 8);
      expect(condition.description).toEqual({
        type: 'unary',
        paren: false,
        operator: { type: 'not', sign: '!' },
        operand: {
          type: 'operand',
          paren: false,
          value: expect.any(Reference),
        },
      });
    });

    it('should handle nested parentheses', () => {
      const condition = new Condition('(a && (b || c))', 'ParenTest', 15);
      expect(condition.description).toEqual({
        type: 'binary',
        paren: true,
        operator: { type: 'logical', sign: '&&' },
        left: {
          type: 'operand',
          paren: false,
          value: expect.any(Reference),
        },
        right: {
          type: 'binary',
          paren: true,
          operator: { type: 'logical', sign: '||' },
          left: {
            type: 'operand',
            paren: false,
            value: expect.any(Reference),
          },
          right: {
            type: 'operand',
            paren: false,
            value: expect.any(Reference),
          },
        },
      });
    });
  });

  describe('Error handling', () => {
    it('should throw SyntaxError for unbalanced parentheses', () => {
      expect(() => new Condition('(a && b', 'ErrorTest', 12)).toThrow(
        SyntaxError
      );
    });

    it('should throw SyntaxError for invalid operator usage', () => {
      expect(() => new Condition('a && && b', 'ErrorTest', 20)).toThrow(
        SyntaxError
      );
    });

    it('should throw ParserError for unknown tokens', () => {
      expect(() => new Condition('a ?? b', 'ErrorTest', 25)).toThrow(
        SyntaxError
      );
    });
  });

  describe('Integration with Operand types', () => {
    it('should correctly identify and process a Scalar operand', () => {
      const condition = new Condition('5', 'ScalarTest', 1);
      expect(condition.description).toEqual({
        type: 'operand',
        paren: false,
        value: expect.any(Scalar),
      });
    });

    it('should correctly identify and process a Global operand', () => {
      const condition = new Condition('#var', 'GlobalTest', 2);
      expect(condition.description).toEqual({
        type: 'operand',
        paren: false,
        value: expect.any(Global),
      });
    });

    it('should correctly identify and process a Tool operand', () => {
      expect(new Condition('@key(arg)', 'ToolTest', 3).description).toEqual({
        type: 'operand',
        paren: false,
        value: expect.any(Tool),
      });

      expect(new Condition('@name()', 'ToolTest', 3).description).toEqual({
        type: 'operand',
        paren: false,
        value: expect.any(Tool),
      });
    });
  });
});
