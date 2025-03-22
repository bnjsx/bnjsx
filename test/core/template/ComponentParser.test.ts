import { ComponentParser } from '../../../src/core/template/ComponentParser';
import { Condition } from '../../../src/core/template/Condition';
import { Scalar } from '../../../src/core/template/Scalar';
import { Reference } from '../../../src/core/template/Reference';

describe('ComponentParser', () => {
  const name = 'component';

  it('should parse if statements', () => {
    let template = `$if(con) body $elseif(con) body $else body $endif`;

    expect(new ComponentParser(name, template).nodes).toEqual([
      {
        type: 'if',
        line: 1,
        placeholder: expect.any(String),
        if: {
          condition: expect.any(Condition),
          body: expect.any(String),
          nodes: undefined,
          line: 1,
        },
        elseif: [
          {
            condition: expect.any(Condition),
            body: expect.any(String),
            nodes: undefined,
            line: 1,
          },
        ],
        else: {
          condition: undefined,
          body: expect.any(String),
          nodes: undefined,
          line: 1,
        },
      },
    ]);
  });

  it('should parse if nested statements', () => {
    let template = `
    $if(con) $log('hello from if')
    $elseif(con) $log('hello from elseif')
    $else $log('hello from else')
    $endif`;

    expect(new ComponentParser(name, template).nodes).toEqual([
      {
        type: 'if',
        line: 2,
        placeholder: expect.any(String),
        if: {
          condition: expect.any(Condition),
          body: expect.any(String),
          nodes: [
            {
              type: 'log',
              line: 2,
              placeholder: expect.any(String),
              describer: expect.any(Scalar),
            },
          ],
          line: 2,
        },
        elseif: [
          {
            condition: expect.any(Condition),
            body: expect.any(String),
            nodes: [
              {
                type: 'log',
                line: 3,
                placeholder: expect.any(String),
                describer: expect.any(Scalar),
              },
            ],
            line: 3,
          },
        ],
        else: {
          condition: undefined,
          body: expect.any(String),
          nodes: [
            {
              type: 'log',
              line: 4,
              placeholder: expect.any(String),
              describer: expect.any(Scalar),
            },
          ],
          line: 4,
        },
      },
    ]);
  });

  it('should parse foreach statements', () => {
    let template = `$foreach(item, index, items) body $endforeach`;

    expect(new ComponentParser(name, template).nodes).toEqual([
      {
        type: 'foreach',
        line: 1,
        placeholder: expect.any(String),
        item: 'item',
        collection: expect.any(Reference),
        body: expect.any(String),
        index: 'index',
        nodes: undefined,
      },
    ]);
  });

  it('should parse foreach nested statements', () => {
    let template = `
    $foreach(item, index, items)
      $print(123)
      $foreach(item, collection) $log(123) $endforeach
    $endforeach`;

    expect(new ComponentParser(name, template).nodes).toEqual([
      {
        type: 'foreach',
        line: 2,
        placeholder: expect.any(String),
        item: 'item',
        collection: expect.any(Reference),
        body: expect.any(String),
        index: 'index',
        nodes: [
          {
            type: 'print',
            line: 3,
            placeholder: expect.any(String),
            describer: expect.any(Scalar),
          },
          {
            type: 'foreach',
            line: 4,
            placeholder: expect.any(String),
            item: 'item',
            collection: expect.any(Reference),
            body: expect.any(String),
            index: undefined,
            nodes: [
              {
                type: 'log',
                placeholder: expect.any(String),
                line: 4,
                describer: expect.any(Scalar),
              },
            ],
          },
        ],
      },
    ]);
  });

  it('should parse render statements', () => {
    let template = `
    $render('button', title='Click Me!', color='green')
      $replace('css') some css $endreplace
      $replace('js')
        $if(con) some js
        $else some js
        $endif
      $endreplace
    $endrender`;

    expect(new ComponentParser(name, template).nodes).toEqual([
      {
        type: 'render',
        line: 2,
        placeholder: expect.any(String),
        path: 'button',
        locals: [
          { key: 'title', value: expect.any(Scalar) },
          { key: 'color', value: expect.any(Scalar) },
        ],
        replaceNodes: [
          {
            key: 'css',
            body: expect.any(String),
          },
          {
            key: 'js',
            body: expect.any(String),
            nodes: [
              {
                type: 'if',
                line: 5,
                placeholder: expect.any(String),
                if: {
                  line: 5,
                  condition: expect.any(Condition),
                  body: expect.any(String),
                },
                else: {
                  line: 6,
                  body: expect.any(String),
                },
              },
            ],
          },
        ],
      },
    ]);
  });

  it('should parse include statements', () => {
    let template = `$include('components.name')`;

    expect(new ComponentParser(name, template).nodes).toEqual([
      {
        type: 'include',
        line: 1,
        placeholder: expect.any(String),
        path: 'components.name',
      },
    ]);
  });

  it('should parse log statements', () => {
    let template = `$log('hello world')`;

    expect(new ComponentParser(name, template).nodes).toEqual([
      {
        type: 'log',
        line: 1,
        placeholder: expect.any(String),
        describer: expect.any(Scalar),
      },
    ]);
  });

  it('should parse print statements', () => {
    let template = `$print('hello world')`;
    expect(new ComponentParser(name, template).nodes).toEqual([
      {
        type: 'print',
        line: 1,
        placeholder: expect.any(String),
        describer: expect.any(Scalar),
      },
    ]);
  });

  it('should parse short-print statements', () => {
    let template = `$('hello world')`;
    expect(new ComponentParser(name, template).nodes).toEqual([
      {
        type: 'print',
        line: 1,
        placeholder: expect.any(String),
        describer: expect.any(Scalar),
      },
    ]);
  });

  it('should parse place statements from the root', () => {
    let template = `$place('key')`;

    expect(new ComponentParser(name, template).nodes).toEqual([
      {
        type: 'place',
        line: 1,
        placeholder: expect.any(String),
        key: 'key',
      },
    ]);
  });

  it('should throw for nested place statements', () => {
    let template = `$if(con) $place(key) $endif`;
    expect(() => new ComponentParser(name, template)).toThrow(SyntaxError);

    template = `$if(con) body $elseif(con) $place(key) $endif`;
    expect(() => new ComponentParser(name, template)).toThrow(SyntaxError);

    template = `$if(con) body $elseif(con) body $else $place(key) $endif`;
    expect(() => new ComponentParser(name, template)).toThrow(SyntaxError);

    template = `$foreach(item, items) $place(key) $endforeach`;
    expect(() => new ComponentParser(name, template)).toThrow(SyntaxError);

    // Should ignore them
    template = `$render('path') $place('key') $endrender`;
    expect(() => new ComponentParser(name, template)).not.toThrow(SyntaxError);
  });

  it('should remove comments from the component', () => {
    let template = ` $comment hello world $endcomment `;
    expect(new ComponentParser(name, template).layout).toBe('  ');
  });

  it('should remove comments and preserve lines', () => {
    let template = `
    $comment hello

    world $endcomment
    `;
    expect(new ComponentParser(name, template).layout).toBe('\n    \n\n\n    ');
  });

  it('should throw for invalid comments syntax', () => {
    expect(() => new ComponentParser(name, `$comment $comment`).layout).toThrow(
      SyntaxError
    );

    expect(
      () => new ComponentParser(name, `$endcomment $endcomment`).layout
    ).toThrow(SyntaxError);

    expect(
      () => new ComponentParser(name, `$comment $endcomment $comment`).layout
    ).toThrow(SyntaxError);
  });
});
