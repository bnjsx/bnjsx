import { Reference } from '../../../src/core/template/Reference';
import { ParserError } from '../../../src/core/template/Parser';

describe('Reference', () => {
  describe('constructor', () => {
    it('should correctly parse a valid reference without a path', () => {
      const ref = new Reference('myVariable', 'TestComponent', 5);

      expect(ref.key).toBe('myVariable');
      expect(ref.path).toBeUndefined();
      expect(ref.name).toBe('TestComponent');
      expect(ref.line).toBe(5);
    });

    it('should correctly parse a valid reference with a path', () => {
      const ref = new Reference('myVariable[0].property', 'TestComponent', 10);

      expect(ref.key).toBe('myVariable');
      expect(ref.path).toBe('[0].property');
      expect(ref.name).toBe('TestComponent');
      expect(ref.line).toBe(10);
    });

    it('should throw a ParserError for invalid argument types', () => {
      const arg = null as any;
      expect(() => {
        new Reference(arg, arg, arg);
      }).toThrow(ParserError);
    });

    it('should throw a SyntaxError for invalid reference strings', () => {
      expect(() => {
        new Reference('123invalid', 'TestComponent', 20);
      }).toThrow(SyntaxError);

      expect(() => {
        new Reference('.missingKey', 'TestComponent', 25);
      }).toThrow(SyntaxError);
    });
  });

  describe('check', () => {
    it('should return true for valid reference strings', () => {
      expect(Reference.check('validName')).toBe(true);
      expect(Reference.check('validName[0]')).toBe(true);
      expect(Reference.check('validName.property')).toBe(true);
      expect(Reference.check('validName[0].property')).toBe(true);
    });

    it('should return false for invalid reference strings', () => {
      expect(Reference.check('123invalid')).toBe(false);
      expect(Reference.check('.missingKey')).toBe(false);
      expect(Reference.check('invalid[]')).toBe(false);
    });
  });
});
