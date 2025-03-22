import { Scalar } from '../../../src/core/template/Scalar';
import { ParserError } from '../../../src/core/template/Parser';

describe('Scalar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should cast a string scalar to its actual value', () => {
      const scalar = new Scalar('"test"', 'TestComponent', 10);

      expect(scalar.value).toBe('test');
      expect(scalar.name).toBe('TestComponent');
      expect(scalar.line).toBe(10);
    });

    it('should cast a numeric scalar to its actual value', () => {
      expect(new Scalar('42', 'TestComponent', 15).value).toBe(42);
    });

    it('should cast a boolean scalar to its actual value', () => {
      expect(new Scalar('true', 'TestComponent', 20).value).toBe(true);
      expect(new Scalar('false', 'TestComponent', 20).value).toBe(false);
    });

    it('should cast an undefined scalar to `undefined`', () => {
      expect(
        new Scalar('undefined', 'TestComponent', 25).value
      ).toBeUndefined();
    });

    it('should cast a null scalar to `null`', () => {
      expect(new Scalar('null', 'TestComponent', 30).value).toBeNull();
    });

    it('should throw for invalid scalar values', () => {
      expect(() => new Scalar('invalid', 'TestComponent', 30)).toThrow(
        SyntaxError
      );
    });

    it('should throw a ParserError for invalid argument types', () => {
      const arg = null as any;
      expect(() => new Scalar(arg, arg, arg)).toThrow(ParserError);
    });
  });

  describe('check', () => {
    it('should return true if value matches a scalar type', () => {
      expect(Scalar.check('42')).toBe(true);
    });

    it('should return false if value does not match any scalar type', () => {
      expect(Scalar.check('invalid')).toBe(false);
    });
  });
});
