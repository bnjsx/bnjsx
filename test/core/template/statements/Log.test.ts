import { Log } from '../../../../src/core/template/statements/Log';
import { ParserError, Statement } from '../../../../src/core/template/Parser';

import { Scalar } from '../../../../src/core/template/Scalar';
import { Global } from '../../../../src/core/template/Global';
import { Tool } from '../../../../src/core/template/Tool';
import { Reference } from '../../../../src/core/template/Reference';

describe('Log', () => {
  const createStatement = (definition: string, line = 1): Statement => ({
    line,
    definition,
    type: 'log',
    placeholder: 'uuid',
  });

  it('should create a Log instance with a Scalar value', () => {
    const statement = createStatement('$log("scalar value")');
    const log = new Log('testComponent', statement);

    expect(log.value).toBeInstanceOf(Scalar);
    expect(log.name).toBe('testComponent');
    expect(log.line).toBe(1);
  });

  it('should create a Log instance with a Global value', () => {
    const statement = createStatement('$log(#somePath)');
    const log = new Log('testComponent', statement);

    expect(log.value).toBeInstanceOf(Global);
    expect(log.name).toBe('testComponent');
    expect(log.line).toBe(1);
  });

  it('should create a Log instance with a Tool value', () => {
    const statement = createStatement('$log(@someTool(args))');
    const log = new Log('testComponent', statement);

    expect(log.value).toBeInstanceOf(Tool);
    expect(log.name).toBe('testComponent');
    expect(log.line).toBe(1);
  });

  it('should create a Log instance with a Reference value', () => {
    const statement = createStatement('$log(ref)');
    const log = new Log('testComponent', statement);

    expect(log.value).toBeInstanceOf(Reference);
    expect(log.name).toBe('testComponent');
    expect(log.line).toBe(1);
  });

  it('should throw a ParserError if name is not a string', () => {
    const statement = createStatement('$log(ref)');

    expect(() => new Log(null as unknown as string, statement)).toThrow(
      ParserError
    );
  });

  it('should throw a ParserError if statement is not an object', () => {
    expect(
      () => new Log('testComponent', null as unknown as Statement)
    ).toThrow(ParserError);
  });

  it('should throw a SyntaxError if the log statement is missing value', () => {
    const statement = createStatement('$log()');

    expect(() => new Log('testComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw a SyntaxError if the log statement has an invalid value', () => {
    const statement = createStatement('$log(123ref)');

    expect(() => new Log('testComponent', statement)).toThrow(SyntaxError);
  });
});
