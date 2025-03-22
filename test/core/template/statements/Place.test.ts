import { Place } from '../../../../src/core/template/statements/Place';
import { ParserError, Statement } from '../../../../src/core/template/Parser';

describe('Place', () => {
  const createStatement = (definition: string, line = 1): Statement => ({
    line,
    definition,
    type: 'place',
    placeholder: 'uuid',
  });

  it('should create a Place instance with a valid key', () => {
    const statement = createStatement('$place("validKey")');
    const place = new Place('testComponent', statement);

    expect(place.name).toBe('testComponent');
    expect(place.line).toBe(1);
    expect(place.key).toBe('validKey');
  });

  it('should create a Place instance with a key containing special characters', () => {
    const statement = createStatement("$place('$valid_Key123')");
    const place = new Place('testComponent', statement);

    expect(place.key).toBe('$valid_Key123');
  });

  it('should throw a SyntaxError if the `$place` statement is missing a key', () => {
    const statement = createStatement('$place()');

    expect(() => new Place('testComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw a SyntaxError if the `$place` statement has an invalid key', () => {
    const statement = createStatement('$place(123Invalid)');

    expect(() => new Place('testComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw a SyntaxError if the `$place` statement is empty', () => {
    const statement = createStatement('');

    expect(() => new Place('testComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw an error for invalid arguments', () => {
    const arg = null as any;
    expect(() => new Place(arg, arg)).toThrow(ParserError);
  });
});
