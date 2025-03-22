import { Condition } from '../../../../src/core/template/Condition';
import { ParserError } from '../../../../src/core/template/Parser';
import { If } from '../../../../src/core/template/statements/If';

describe('If class', () => {
  it('should correctly process a valid if statement', () => {
    const statement: any = {
      line: 1,
      placeholder: 'if-placeholder',
      definition: '$if(con) { if-body } $endif',
    };

    const obj = new If('TestComponent', statement);

    expect(obj.if.condition).toBeInstanceOf(Condition);
    expect(obj.if.body).toBe(' { if-body } ');
    expect(obj.if.statements).toBeUndefined();
  });

  it('should correctly process elseif statements', () => {
    const statement: any = {
      line: 1,
      placeholder: 'if-placeholder',
      definition: '$if(con) { if-body } $elseif(con) { elseif-body } $endif',
    };

    const obj = new If('TestComponent', statement);

    expect(obj.if.condition).toBeInstanceOf(Condition);
    expect(obj.if.body).toBe(' { if-body } ');
    expect(obj.if.statements).toBeUndefined();

    expect(obj.elseif?.length).toBe(1);
    expect((obj as any).elseif[0].condition).toBeInstanceOf(Condition);
    expect((obj as any).elseif[0].body).toBe(' { elseif-body } ');
  });

  it('should correctly process else statements', () => {
    const statement = {
      line: 1,
      placeholder: 'if-placeholder',
      definition: '$if(con) { if-body } $else { else-body } $endif',
    } as any;

    const obj = new If('TestComponent', statement);

    expect(obj.if.condition).toBeInstanceOf(Condition);
    expect(obj.if.body).toBe(' { if-body } ');
    expect(obj.if.statements).toBeUndefined();

    expect(obj.else).toBeDefined();
    expect((obj as any).else.condition).toBeUndefined(); // else has no condition
    expect((obj as any).else.body).toBe(' { else-body } ');
  });

  it('should correctly process multiple elseif and else blocks', () => {
    const statement = {
      line: 1,
      placeholder: 'if-placeholder',
      definition:
        '$if(con) { if-body } $elseif(con) { elseif-body-1 } $elseif(con) { elseif-body-2 } $else { else-body } $endif',
    } as any;

    const obj = new If('TestComponent', statement);

    expect(obj.if.condition).toBeInstanceOf(Condition);
    expect(obj.if.body).toBe(' { if-body } ');
    expect(obj.if.statements).toBeUndefined();

    expect(obj.elseif?.length).toBe(2);
    expect((obj as any).elseif[0].condition).toBeInstanceOf(Condition);
    expect((obj as any).elseif[0].body).toBe(' { elseif-body-1 } ');
    expect((obj as any).elseif[1].condition).toBeInstanceOf(Condition);
    expect((obj as any).elseif[1].body).toBe(' { elseif-body-2 } ');

    expect(obj.else).toBeDefined();
    expect((obj as any).else.condition).toBeUndefined(); // else has no condition
    expect((obj as any).else.body).toBe(' { else-body } ');
  });

  it('should correctly proccess nested statements', () => {
    const statement = {
      line: 1,
      placeholder: 'if-placeholder',
      definition: `
      $if(con) 
        $if(con) nested if $endif
      $elseif(con)
        $if(con) nested if $endif
      $else
        $if(con) nested if
        $elseif(con) nested else if
        $else nested else
        $endif
      $endif`,
    } as any;

    const obj = new If('TestComponent', statement);

    expect(obj.if.condition).toBeInstanceOf(Condition);
    expect(obj.if.body).toEqual(expect.any(String));
    expect(obj.if.statements).toEqual([
      {
        type: 'if',
        line: expect.any(Number),
        placeholder: expect.any(String),
        definition: '$if(con) nested if $endif',
      },
    ]);

    expect(obj.elseif?.length).toBe(1);
    expect((obj as any).elseif[0].condition).toBeInstanceOf(Condition);
    expect((obj as any).elseif[0].body).toEqual(expect.any(String));
    expect((obj as any).elseif[0].statements).toEqual([
      {
        type: 'if',
        line: expect.any(Number),
        placeholder: expect.any(String),
        definition: '$if(con) nested if $endif',
      },
    ]);

    expect(obj.else).toBeDefined();
    expect((obj as any).else.condition).toBeUndefined(); // else has no condition
    expect((obj as any).else.body).toEqual(expect.any(String));
    expect((obj as any).else.statements).toEqual([
      {
        type: 'if',
        line: expect.any(Number),
        placeholder: expect.any(String),
        definition: `$if(con) nested if
        $elseif(con) nested else if
        $else nested else
        $endif`,
      },
    ]);
  });

  it('should throw an error for missing body', () => {
    const definitions = [
      '$if(con) $endif', // Missing $if body
      '$if(con) { body } $elseif(con) $endif', // Missing $elseif body
      '$if(con) { body } $elseif(con) { body } $else $endif', // Missing $else body
    ];

    const statement = {
      line: 1,
      placeholder: 'if-placeholder',
    } as any;

    definitions.forEach((d) => {
      statement.definition = d;
      expect(() => new If('TestComponent', statement)).toThrow(SyntaxError);
    });
  });

  it('should throw an error for unexpected tags', () => {
    const definitions = [
      // Invalid Syntax
      '$if(con body) body $endif', // Invalid condition
      '$ifcon) body $endif', // Missing opening parentheses
      '$if() body $endif', // Empty condition
      '$if(con) body $elseif() body $endif', // Empty $elseif condition
      '$endif body', // $endif without a preceding $if
      '$elseif', // Standalone $elseif without $if
      '$if(con)', // $if with no body or $endif
      '$else body $else body', // Multiple $else without any $if
      '$if(con) body $endif $endif', // Redundant $endif
      '$endif', // $endif without $if or $elseif
      '$if(con) body $else body $endif $endif', // Extra $endif after $else
      '$if(con) body $elseif(con) body', // Missing $endif
      '$elseif(con) body $elseif(con) body $endif', // Missing initial $if
      '$if(con) body $else body $elseif(con) body $endif', // Mixing $else and $elseif
      '$if(con) body $if(con) body $endif', // Multiple $if without $endif
      '$elseif(con) body $endif', // $elseif without $if
      '$else body $endif', // $else without $if or $elseif
      '$if(con) body $else body $endif $else body', // Extra $else
      '$elseif(con) body $elseif(con) body $endif', // Multiple $elseif without $if
      '$if(con) body $else body $elseif(con) body $endif', // $else before $elseif
      '$endif $endif', // Extra $endif tags
      '', // Empty definition
    ];

    const statement = {
      line: 1,
      placeholder: 'if-placeholder',
    } as any;

    definitions.forEach((d) => {
      statement.definition = d;
      expect(() => new If('TestComponent', statement)).toThrow(SyntaxError);
    });
  });

  it('should throw an error for invalid arguments', () => {
    const arg = null as any;
    expect(() => new If(arg, arg)).toThrow(ParserError);
  });
});
