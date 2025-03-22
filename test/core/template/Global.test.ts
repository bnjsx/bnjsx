import { Global } from '../../../src/core/template/Global';
import { ParserError } from '../../../src/core/template/Parser';

describe('Global', () => {
  describe('constructor', () => {
    it('should correctly parse a valid global variable without a path', () => {
      const global = new Global('#myVar', 'TestTemplate', 10);

      expect(global.key).toBe('myVar');
      expect(global.path).toBeUndefined();
      expect(global.name).toBe('TestTemplate');
      expect(global.line).toBe(10);
    });

    it('should correctly parse a valid global variable with a path', () => {
      const global = new Global('#myVar[0].property', 'TestTemplate', 15);

      expect(global.key).toBe('myVar');
      expect(global.path).toBe('[0].property');
      expect(global.name).toBe('TestTemplate');
      expect(global.line).toBe(15);
    });

    it('should throw a SyntaxError for invalid local reference', () => {
      expect(() => {
        new Global('#123invalid', 'TestComponent', 20);
      }).toThrow(SyntaxError);

      expect(() => {
        new Global('#.missingKey', 'TestComponent', 25);
      }).toThrow(SyntaxError);
    });

    it('should throw a SyntaxError for invalid global strings', () => {
      const arg = null as any;
      expect(() => new Global(arg, arg, arg)).toThrow(ParserError);
    });
  });

  describe('check', () => {
    it('should return true for valid global strings', () => {
      expect(Global.check('#myVar')).toBe(true);
      expect(Global.check('#myVar[0].property')).toBe(true);
    });

    it('should return false for invalid global strings', () => {
      expect(Global.check('invalidFormat')).toBe(false);
      expect(Global.check('#123invalid')).toBe(false);
      expect(Global.check('#.missingKey')).toBe(false);
    });
  });
});
