import { Print } from '../../../../src/core/template/statements/Print';
import { ParserError, Statement } from '../../../../src/core/template/Parser';
import { Scalar } from '../../../../src/core/template/Scalar';
import { Global } from '../../../../src/core/template/Global';
import { Reference } from '../../../../src/core/template/Reference';
import { Tool } from '../../../../src/core/template/Tool';

describe('Print', () => {
  const createStatement = (definition: string, line = 1): Statement => ({
    line,
    definition,
    type: 'print',
    placeholder: 'uuid',
  });

  it('should create a Print instance with a scalar value', () => {
    const statement = createStatement('$print("Hello World")');
    const print = new Print('testComponent', statement);

    expect(print.name).toBe('testComponent');
    expect(print.line).toBe(1);
    expect(print.value).toBeInstanceOf(Scalar);
  });

  it('should create a Print instance with a global variable', () => {
    const statement = createStatement('$print(#myVar)');
    const print = new Print('testComponent', statement);

    expect(print.value).toBeInstanceOf(Global);
  });

  it('should create a Print instance with a reference', () => {
    const statement = createStatement('$print(myReference)');
    const print = new Print('testComponent', statement);

    expect(print.value).toBeInstanceOf(Reference);
  });

  it('should create a Print instance with a tool call', () => {
    const statement = createStatement('$print(@doSomething("arg"))');
    const print = new Print('testComponent', statement);

    expect(print.value).toBeInstanceOf(Tool);
  });

  it('should throw a SyntaxError if the $print statement has an invalid value', () => {
    const statement = createStatement('$print(invalid value)');

    expect(() => new Print('testComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw a SyntaxError if the $print statement has no value', () => {
    const statement = createStatement('$print()');

    expect(() => new Print('testComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw a SyntaxError if the $print statement is empty', () => {
    const statement = createStatement('');

    expect(() => new Print('testComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw an error for invalid arguments', () => {
    const arg = null as any;
    expect(() => new Print(arg, arg)).toThrow(ParserError);
  });
});
