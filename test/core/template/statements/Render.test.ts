import { Render } from '../../../../src/core/template/statements/Render';
import { Statement, ParserError } from '../../../../src/core/template/Parser';
import { Reference } from '../../../../src/core/template/Reference';
import { Scalar } from '../../../../src/core/template/Scalar';
import { Tool } from '../../../../src/core/template/Tool';
import { Global } from '../../../../src/core/template/Global';

function createStatement(definition: string): Statement {
  return {
    line: 1,
    placeholder: 'placeholder',
    definition,
    type: 'render',
  };
}

describe('Render Class Tests', () => {
  it('should parse a valid $render statement with path and locals', () => {
    const statement: Statement = createStatement(
      '$render("path.to.component", var1=ref, var2=name, var3=@func(), var4=123, var5=@name(123), var6=#name)$endrender'
    );

    const render = new Render('TestComponent', statement);

    expect(render.name).toBe('TestComponent');
    expect(render.line).toBe(1);
    expect(render.placeholder).toBe('placeholder');
    expect(render.path).toBe('path.to.component');

    // Verify locals
    expect(render.locals).toEqual([
      {
        key: 'var1',
        value: expect.any(Reference), // Expect a Scalar object
      },
      {
        key: 'var2',
        value: expect.any(Reference), // Expect a Scalar object
      },
      {
        key: 'var3',
        value: expect.any(Tool), // Expect a Tool object
      },
      {
        key: 'var4',
        value: expect.any(Scalar), // Expect a Scalar object
      },
      {
        key: 'var5',
        value: expect.any(Tool), // Expect a Tool object
      },
      {
        key: 'var6',
        value: expect.any(Global), // Expect a Tool object
      },
    ]);
  });

  it('should parse a valid $render statement with replacements', () => {
    const statement: Statement = createStatement(
      '$render("path.to.component") $replace("key") body $endreplace $replace("key") $print(123) $endreplace $endrender'
    );

    const render = new Render('TestComponent', statement);

    expect(render.replacements).toEqual([
      {
        key: 'key',
        body: expect.any(String),
        statements: undefined,
      },
      {
        key: 'key',
        body: expect.any(String),
        statements: expect.any(Array),
      },
    ]);
  });

  it('should throw SyntaxError for missing render path', () => {
    const definition = '$render()$endrender';
    const statement: Statement = createStatement(definition);

    expect(() => new Render('TestComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw SyntaxError for invalid local variable format', () => {
    const definition = '$render("path.to.component", var=val, ,)$endrender';
    const statement: Statement = createStatement(definition);

    expect(() => new Render('TestComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw SyntaxError for mismatched $replace and $endreplace tags', () => {
    const statement: Statement = createStatement(
      '$render("path.to.component")  $replace("key") body $endrender'
    );

    expect(() => new Render('TestComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw SyntaxError for unexpected $replace tag without matching $endreplace', () => {
    const statement: Statement = createStatement(
      '$render("path.to.component") $replace("key") body $endreplace $replace("key") body $endrender'
    );

    expect(() => new Render('TestComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw SyntaxError for invalid local values', () => {
    const statement: Statement = createStatement(
      '$render("path.to.component", invalidLocal=)$endrender'
    );

    expect(() => new Render('TestComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw SyntaxError for invalid local key value paires', () => {
    const statement: Statement = createStatement(
      '$render("path.to.component", invalidPaires)$endrender'
    );

    expect(() => new Render('TestComponent', statement)).toThrow(SyntaxError);
  });

  it('should throw SyntaxError for nested replacements', () => {
    expect(
      () =>
        new Render(
          'TestComponent',
          createStatement(
            '$render("path.to.component") $replace("key") $replace("key") $endreplace $endrender'
          )
        )
    ).toThrow(SyntaxError);

    expect(
      () =>
        new Render(
          'TestComponent',
          createStatement(
            '$render("path.to.component") $endreplace $endreplace $endrender'
          )
        )
    ).toThrow(SyntaxError);
  });

  it('should throw an error for invalid replace key', () => {
    expect(
      () =>
        new Render(
          'TestComponent',
          createStatement(
            '$render("path.to.component") $replace(123) $endreplace $endrender'
          )
        )
    ).toThrow(SyntaxError);
  });

  it('should IGNORE anything between replace tags', () => {
    expect(
      () =>
        new Render(
          'TestComponent',
          createStatement(
            '$render("path.to.component") hello world $replace("key") body $endreplace  hello world $endrender'
          )
        )
    ).not.toThrow(SyntaxError);
  });

  it('should throw error for an empty replace body', () => {
    expect(
      () =>
        new Render(
          'TestComponent',
          createStatement(
            '$render("path.to.component") $replace("key") $endreplace $endrender'
          )
        )
    ).toThrow(SyntaxError);
  });

  it('should throw an error for invalid arguments', () => {
    const arg = null as any;
    expect(() => new Render(arg, arg)).toThrow(ParserError);
  });
});
