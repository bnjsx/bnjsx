jest.mock('../../../src/config');
jest.mock('fs/promises');

import { config } from '../../../src/config';

(config as jest.Mock).mockReturnValue({
  resolveSync: jest.fn().mockReturnValue('root'),
  loadSync: jest.fn().mockReturnValue({
    env: 'dev',
    cache: false,
    paths: {
      views: 'views',
    },
    globals: {
      name: 'bnjsx',
      users: [
        { name: 'simon', age: 23 },
        { name: 'john', age: 33 },
        { name: 'james', age: 18, hobbies: ['gaming', 'reading', 'coding'] },
      ],
    },
    tools: {
      getName: () => 'bnjsx',
      isActive: () => true,
      numbers: () => [2, 4, 6, 8],
      fetchUser: () => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve({ name: 'simon', age: 23 });
          }, 100);
        });
      },
      fetchName: () => {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve('bnjsx');
          }, 100);
        });
      },
      getUser: (name: string) => {
        return config()
          .loadSync()
          .globals.users.find((user) => user.name === name);
      },
    },
  }),
});

import {
  Component,
  ComponentError,
  render,
} from '../../../src/core/template/Component';

import * as fs from 'fs/promises';

describe('render', () => {
  beforeEach(() => {
    // Ignore warn() logs
    console.log = jest.fn();
  });

  afterAll(() => {
    // Reset
    jest.resetAllMocks();
  });

  describe('Caching', () => {
    beforeAll(() => {
      // Enable caching
      config().loadSync().cache = true;
      config().loadSync().paths.views = '/views'; // absolute
    });

    beforeEach(() => jest.clearAllMocks());

    afterAll(() => {
      // Disable caching
      config().loadSync().cache = false;
      config().loadSync().paths.views = 'views'; // relative
    });

    const component = Component as any;

    it('should cache the component template, layout, nodes', async () => {
      // Cache is empty
      expect(component.cache).toEqual({});

      const mock = jest
        .spyOn(fs, 'readFile')
        .mockResolvedValue(`$if('foo') foo $endif`);

      await expect(render('foo')).resolves.toBe('foo');

      // Cached components
      const keys = Object.keys(component.cache);

      expect(keys.length).toBe(1);
      expect(keys[0].endsWith('foo.fx')).toBeTruthy();
      expect(component.cache[keys[0]].template).not.toBeUndefined();
      expect(component.cache[keys[0]].layout).not.toBeUndefined();
      expect(component.cache[keys[0]].nodes).not.toBeUndefined();

      // The 2nd render
      await expect(render('foo')).resolves.toBe('foo');

      // The 3th render
      await expect(render('foo')).resolves.toBe('foo');

      // The 4th render
      await expect(render('foo')).resolves.toBe('foo');

      // Never executed again! this means cache is used..
      expect(mock).toHaveBeenCalledTimes(1);
    });

    it('should cache the included component template', async () => {
      const mock = jest
        .spyOn(fs, 'readFile')
        .mockResolvedValueOnce(`$include('header')`)
        .mockResolvedValueOnce(`<header>Some Header</header>`);

      await expect(render('bar')).resolves.toBe('<header>Some Header</header>');

      // Cached components
      const keys = Object.keys(component.cache);

      expect(keys.length).toBe(3); // foo.fx bar.fx and header.fx cached
      expect(keys[0].endsWith('foo.fx')).toBeTruthy();
      expect(keys[1].endsWith('bar.fx')).toBeTruthy();
      expect(keys[2].endsWith('header.fx')).toBeTruthy();

      // header.fx is included that's why layout and nodes are undefined
      expect(component.cache[keys[2]].template).not.toBeUndefined();
      expect(component.cache[keys[2]].layout).toBeUndefined(); // no render
      expect(component.cache[keys[2]].nodes).toBeUndefined(); // no render

      // The 2nd render
      await expect(render('bar')).resolves.toBe('<header>Some Header</header>');

      // The 3th render
      await expect(render('bar')).resolves.toBe('<header>Some Header</header>');

      // The 4th render
      await expect(render('bar')).resolves.toBe('<header>Some Header</header>');

      // Never executed again! this means cache is used..
      expect(mock).toHaveBeenCalledTimes(2);
    });

    it('what if we render our header component?', async () => {
      // The header component is included before and the template is cached
      // We can still render this component as well!
      // Even tho it's safe but it not recommanded!

      await expect(render('header')).resolves.toBe(
        '<header>Some Header</header>'
      );

      // Cached components
      const keys = Object.keys(component.cache);

      expect(keys.length).toBe(3); // foo.fx bar.fx and header.fx cached
      expect(keys[0].endsWith('foo.fx')).toBeTruthy();
      expect(keys[1].endsWith('bar.fx')).toBeTruthy();
      expect(keys[2].endsWith('header.fx')).toBeTruthy();

      // header.fx is included that's why layout and nodes are undefined
      expect(component.cache[keys[2]].template).not.toBeUndefined();
      expect(component.cache[keys[2]].layout).not.toBeUndefined();
      expect(component.cache[keys[2]].nodes).toBeUndefined(); // component has no nodes that's why

      // The 2nd render
      await expect(render('bar')).resolves.toBe('<header>Some Header</header>');

      // The 3th render
      await expect(render('bar')).resolves.toBe('<header>Some Header</header>');

      // The 4th render
      await expect(render('bar')).resolves.toBe('<header>Some Header</header>');

      // Never executed again! this means cache is used..
      expect(jest.spyOn(fs, 'readFile')).toHaveBeenCalledTimes(0);
    });
  });

  describe('Sad Path', () => {
    it('should throw an error for invalid path', () => {
      expect(() => render(123 as any)).rejects.toThrow(
        'Invalid component path: 123'
      );
    });

    it('should throw an error for invalid locals', () => {
      expect(() =>
        render('valid/path', 'not-an-object' as any)
      ).rejects.toThrow('Invalid locals: not-an-object');
    });

    it('should throw an error for invalid replacements', () => {
      expect(() =>
        render('valid/path', { key: 'value' }, 'not-an-object' as any)
      ).rejects.toThrow('Invalid replacements: not-an-object');
    });

    it('Should reject if the component is not found', async () => {
      const error = new Error('some message') as any;
      error.code = 'ENOENT';

      jest.spyOn(fs, 'readFile').mockRejectedValue(error);
      await expect(render('foo')).rejects.toThrow(ComponentError);
    });

    it('Should reject if there are syntax issues', async () => {
      const error = new Error('some syntax issue');
      jest.spyOn(fs, 'readFile').mockRejectedValue(error);
      await expect(render('foo')).rejects.toThrow(Error);
    });

    it('Should resolve if you access a value on undefined', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValue(`$(foo.bar)`);
      await expect(render('foo', { foo: undefined })).resolves.toBe(
        'undefined'
      );
    });

    it('Should resolve if you access a value on null', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValue(`$(foo.bar)`);
      await expect(render('foo', { foo: null })).resolves.toBe('null');
    });

    it('Should resolve if you access an index on undefined', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValue(`$(foo[0])`);
      await expect(render('foo', { foo: undefined })).resolves.toBe(
        'undefined'
      );
    });

    it('Should resolve if you access an index on null', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValue(`$(foo[0])`);
      await expect(render('foo', { foo: null })).resolves.toBe('null');
    });

    it('Should reject if you access an undefined global', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValue(`$(#undefined)`);
      await expect(render('foo')).rejects.toThrow(ComponentError);
    });

    it('Should reject if you access an undefined tool', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValue(`$(@undefined())`);
      await expect(render('foo')).rejects.toThrow(ComponentError);
    });

    it('Should print undefined if your reference is undefined', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValue(`$(foo)`);
      await expect(render('foo')).resolves.toBe('undefined');
    });
  });

  describe('Happy Path', () => {
    describe('If Statements', () => {
      describe('Scalar Types', () => {
        test('Conditions Rendering - Truthy String', async () => {
          jest.spyOn(fs, 'readFile').mockResolvedValue(`$if('foo') foo $endif`);
          await expect(render('path')).resolves.toBe('foo');
        });

        test('Conditions Rendering - Falsy String', async () => {
          jest.spyOn(fs, 'readFile').mockResolvedValue(`$if('') empty $endif`);
          await expect(render('path')).resolves.toBe('');
        });

        test('Conditions Rendering - Truthy Number', async () => {
          jest.spyOn(fs, 'readFile').mockResolvedValue(`$if(42) number $endif`);
          await expect(render('path')).resolves.toBe('number');
        });

        test('Conditions Rendering - Falsy Number', async () => {
          jest.spyOn(fs, 'readFile').mockResolvedValue(`$if(0) zero $endif`);
          await expect(render('path')).resolves.toBe('');
        });

        test('Conditions Rendering - Truthy Boolean (true)', async () => {
          jest.spyOn(fs, 'readFile').mockResolvedValue(`$if(true) true $endif`);
          await expect(render('path')).resolves.toBe('true');
        });

        test('Conditions Rendering - Falsy Boolean (false)', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(false) false $endif`);
          await expect(render('path')).resolves.toBe('');
        });

        test('Conditions Rendering - Null', async () => {
          jest.spyOn(fs, 'readFile').mockResolvedValue(`$if(null) null $endif`);
          await expect(render('path')).resolves.toBe('');
        });

        test('Conditions Rendering - Undefined', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(undefined) undefined $endif`);
          await expect(render('path')).resolves.toBe('');
        });
      });

      describe('Other Types', () => {
        test('Conditions Rendering - Reference', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(name) $(name) $endif`);
          await expect(render('path', { name: 'bnjsx' })).resolves.toBe(
            'bnjsx'
          );
        });

        test('Conditions Rendering - Globals', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(#name) $(#name) $endif`);
          await expect(render('path')).resolves.toBe('bnjsx');
        });

        test('Conditions Rendering - Tools', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(
              `$if(@isActive('simon')) $(@getUser('simon').age) $endif`
            );
          await expect(render('path')).resolves.toBe('23');
        });
      });

      describe('Logical Operators', () => {
        test('Logical Operators - OR', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(1 || 0) $('bnjsx') $endif`);
          await expect(render('path')).resolves.toBe('bnjsx');
        });

        test('Logical Operators - AND', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(1 && 0) $('bnjsx') $endif`);
          await expect(render('path')).resolves.toBe('');
        });
      });

      describe('Comparison Operators', () => {
        test('Comparison Operators - Strict Equal', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(1 === 0) $('bnjsx') $endif`);
          await expect(render('path')).resolves.toBe('');
        });

        test('Comparison Operators - Equal', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(1 == 0) $('bnjsx') $endif`);
          await expect(render('path')).resolves.toBe('');
        });

        test('Comparison Operators - Not Equal', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(1 != 0) $('bnjsx') $endif`);
          await expect(render('path')).resolves.toBe('bnjsx');
        });

        test('Comparison Operators - Not Strict Equal', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(1 !== 0) $('bnjsx') $endif`);
          await expect(render('path')).resolves.toBe('bnjsx');
        });

        test('Comparison Operators - Less Than', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(1 < 0) $('bnjsx') $endif`);
          await expect(render('path')).resolves.toBe('');
        });

        test('Comparison Operators - Greater Than', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(1 > 0) $('bnjsx') $endif`);
          await expect(render('path')).resolves.toBe('bnjsx');
        });

        test('Comparison Operators - Less Than Or Eqaul', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(1 <= 0) $('bnjsx') $endif`);
          await expect(render('path')).resolves.toBe('');
        });

        test('Comparison Operators - Greater Than Or Eqaul', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(1 >= 0) $('bnjsx') $endif`);
          await expect(render('path')).resolves.toBe('bnjsx');
        });
      });

      describe('Complex Conditions', () => {
        test('Nested Conditions - True && False', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(true && (false || true)) true $endif`);
          await expect(render('path')).resolves.toBe('true');
        });

        test('Nested Conditions - False || (True && False)', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(false || (true && false)) true $endif`);
          await expect(render('path')).resolves.toBe('');
        });

        test('Mixed Logical and Comparison - Greater Than and AND', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(5 > 3 && 2 <= 2) valid $endif`);
          await expect(render('path')).resolves.toBe('valid');
        });

        test('Mixed Logical and Comparison - OR with Strict Equality', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(
              `$if('test' === 'test' || 10 < 5) success $endif`
            );
          await expect(render('path')).resolves.toBe('success');
        });

        test('Double Negation - !!True', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(!!true) double true $endif`);
          await expect(render('path')).resolves.toBe('double true');
        });

        test('Complex Parentheses - Multiple Nesting', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(
              `$if(((true || false) && (5 > 2)) || (null == undefined)) complex $endif`
            );
          await expect(render('path')).resolves.toBe('complex');
        });

        test('Reference and Logical - Name Check', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(name && name === 'bnjsx') valid $endif`);
          await expect(render('path', { name: 'bnjsx' })).resolves.toBe(
            'valid'
          );
        });

        test('Globals and Logical - Global Exists', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(#name && #name === 'bnjsx') global $endif`);
          await expect(render('path')).resolves.toBe('global');
        });

        test('Tools and Logical - Function Check', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(
              `$if(@isActive() && @getName() === 'bnjsx') tool $endif`
            );
          await expect(render('path')).resolves.toBe('tool');
        });

        test('Undefined in Complex Condition', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(
              `$if((undefined || false) && true) undefined $endif`
            );
          await expect(render('path')).resolves.toBe('');
        });

        test('Null in Complex Condition', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if((null || true) && false) null $endif`);
          await expect(render('path')).resolves.toBe('');
        });

        test('Edge Case - Mixed Types', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(
              `$if(('5' == 5) && (5 === '5' || true) && (!false && null == undefined)) edge $endif`
            );
          await expect(render('path')).resolves.toBe('edge');
        });

        test('Edge Case - Negated Unary Condition', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(!('foo' === 'bar')) edge $endif`);
          await expect(render('path')).resolves.toBe('edge');
        });

        test('Edge Case - Unary Condition', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(('foo') || ('bar')) edge $endif`);
          await expect(render('path')).resolves.toBe('edge');
        });
      });

      describe('Complex If Statements', () => {
        it('If with ElseIf', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(false) false $elseif(true) true $endif`);
          await expect(render('path')).resolves.toBe('true');
        });

        it('If with ElseIf and Else', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(
              `$if(false) false $elseif(false) false $else true $endif`
            );
          await expect(render('path')).resolves.toBe('true');
        });

        it('If with Else', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(false) false $else true $endif`);
          await expect(render('path')).resolves.toBe('true');
        });
      });

      describe('Nested If Statements', () => {
        it('Nested in If', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(`$if(true) $if(true) true $endif $endif`);
          await expect(render('path')).resolves.toBe('true');
        });
        it('Nested in Elseif', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(
              `$if(false) false $elseif(true) $if(true) true $endif $endif`
            );

          await expect(render('path')).resolves.toBe('true');
        });
        it('Nested in Else', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValue(
              `$if(false) false $else $if(true) true $endif $endif`
            );
          await expect(render('path')).resolves.toBe('true');
        });
      });
    });

    describe('Foreach Statements', () => {
      it('Collection should be a Local Reference', async () => {
        jest
          .spyOn(fs, 'readFile')
          .mockResolvedValue(
            `$foreach(item, collection) $print(item) $endforeach`
          );

        await expect(render('path', { collection: [1, 2, 3] })).resolves.toBe(
          '1  2  3'
        );
      });

      it('Collection should be a Global Reference', async () => {
        jest
          .spyOn(fs, 'readFile')
          .mockResolvedValue(
            `$foreach(user, #users) $print(user.name) $endforeach`
          );
        await expect(render('path')).resolves.toBe('simon  john  james');
      });

      it('Collection should be a Tool Reference', async () => {
        jest
          .spyOn(fs, 'readFile')
          .mockResolvedValue(
            `$foreach(number, @numbers()) $print(number) $endforeach`
          );
        await expect(render('path')).resolves.toBe('2  4  6  8');
      });

      it('Collection must be an array', async () => {
        jest
          .spyOn(fs, 'readFile')
          .mockResolvedValue(`$foreach(item, name) $print(item) $endforeach`);
        await expect(render('path', { name: 'bnjsx' })).rejects.toThrow(
          ComponentError
        );
      });

      it('You can access the index of every item', async () => {
        jest
          .spyOn(fs, 'readFile')
          .mockResolvedValue(
            `$foreach(number, index, @numbers()) $print(index) $endforeach`
          );
        await expect(render('path')).resolves.toBe('0  1  2  3');
      });

      it('Your body is repeated the for every item', async () => {
        jest
          .spyOn(fs, 'readFile')
          .mockResolvedValue(`$foreach(number, @numbers()) body $endforeach`);
        await expect(render('path')).resolves.toBe('body  body  body  body');
      });

      it('You can have nested statements of any type', async () => {
        jest.spyOn(fs, 'readFile').mockResolvedValue(
          `$foreach(user, #users)
              $if(user.hobbies)
                $foreach(hobbie, user.hobbies)
                  $print(user.name): $print(hobbie)
                $endforeach
              $endif
            $endforeach`
        );

        await expect(render('path')).resolves.toBe(
          'james: gaming\njames: reading\njames: coding'
        );
      });
    });

    describe('Render Statements', () => {
      it('render a component', async () => {
        jest
          .spyOn(fs, 'readFile')
          .mockResolvedValueOnce(
            `$render('components.buttons.active')$endrender`
          )
          .mockResolvedValueOnce(`<button>Active</button>`);
        await expect(render('path')).resolves.toBe('<button>Active</button>');
      });

      describe('Render Locals', () => {
        it('Provide a string scalar value', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(
              `$render('components.button', title='Active')$endrender`
            )
            .mockResolvedValueOnce(`<button>$print(title)</button>`);
          await expect(render('path')).resolves.toBe('<button>Active</button>');
        });

        it('Provide a number scalar value', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(
              `$render('components.button', title=10.33)$endrender`
            )
            .mockResolvedValueOnce(`<button>$print(title)</button>`);
          await expect(render('path')).resolves.toBe('<button>10.33</button>');
        });

        it('Provide a boolean scalar value', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(
              `$render('components.button', title=true)$endrender`
            )
            .mockResolvedValueOnce(`<button>$print(title)</button>`);
          await expect(render('path')).resolves.toBe('<button>true</button>');
        });

        it('Provide a undefined scalar value', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(
              `$render('components.button', title=undefined)$endrender`
            )
            .mockResolvedValueOnce(`<button>$print(title)</button>`);
          await expect(render('path')).resolves.toBe(
            '<button>undefined</button>'
          );
        });

        it('Provide a null scalar value', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(
              `$render('components.button', title=null)$endrender`
            )
            .mockResolvedValueOnce(`<button>$print(title)</button>`);
          await expect(render('path')).resolves.toBe('<button>null</button>');
        });

        it('Provide a Local value', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(
              `$render('components.button', user=user)$endrender`
            )
            .mockResolvedValueOnce(`<button>$print(user.name)</button>`);
          await expect(
            render('path', { user: { name: 'simon' } })
          ).resolves.toBe('<button>simon</button>');
        });

        it('Provide a Global value', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(
              `$render('components.button', name=#name)$endrender`
            )
            .mockResolvedValueOnce(`<button>$print(name)</button>`);
          await expect(render('path')).resolves.toBe('<button>bnjsx</button>');
        });

        it('Provide a Tool retrun value', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(
              `$render('components.button', numbers=@numbers())$endrender`
            )
            .mockResolvedValueOnce(`<button>$print(numbers[0])</button>`);
          await expect(render('path')).resolves.toBe('<button>2</button>');
        });

        it('Provide multiple values', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(
              `$render('components.button', n1=#users[0].name, n2=#users[1].name, n3=#users[2].name)$endrender`
            )
            .mockResolvedValueOnce(`<button>$(n1) $(n2) $(n3)</button>`);
          await expect(render('path')).resolves.toBe(
            '<button>simon john james</button>'
          );
        });
      });

      describe('Render Replacements', () => {
        it('Replace a key with a value', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(
              `$render('components.button')
                $replace('content') Click Me! $endreplace
              $endrender`
            )
            .mockResolvedValueOnce(`<button>$place('content')</button>`);
          await expect(render('path')).resolves.toBe(
            '<button> Click Me! </button>'
          );
        });

        it('You can have nested statements in replacements', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(
              `$render('layout')
                $replace('main')
                  <ul>
                    $foreach(user, #users)
                      <li>$(user.name) is $(user.age) years old!</li>
                    $endforeach
                  </ul>
                $endreplace
              $endrender`
            )
            .mockResolvedValueOnce(
              `<header></header><main>$place('main')</main><footer></footer>`
            );
          await expect(render('path')).resolves.toBe(
            '<header></header><main>\n<ul>\n<li>simon is 23 years old!</li>\n<li>john is 33 years old!</li>\n<li>james is 18 years old!</li>\n</ul>\n</main><footer></footer>'
          );
        });

        it('Should reject if the replacement is undefined', async () => {
          jest
            .spyOn(fs, 'readFile')
            .mockResolvedValueOnce(`$render('component')$endrender`)
            .mockResolvedValueOnce(`$place('bar')`); // 'bar' has no replacement
          await expect(render('path')).rejects.toThrow(ComponentError);
        });
      });
    });

    describe('Include Statements', () => {
      it('include a component', async () => {
        jest
          .spyOn(fs, 'readFile')
          .mockResolvedValueOnce(`$include('components.header')`)
          .mockResolvedValueOnce(`<header>Some Header</header>`);
        await expect(render('path')).resolves.toBe(
          '<header>Some Header</header>'
        );
      });

      it('Should reject if the component is not found', async () => {
        const error = new Error('some message') as any;
        error.code = 'ENOENT';

        jest
          .spyOn(fs, 'readFile')
          .mockResolvedValueOnce(`$include('components.header')`)
          .mockRejectedValueOnce(error);

        await expect(render('path')).rejects.toThrow(ComponentError);
      });

      it('Should reject if there are syntax issues', async () => {
        const error = new Error('some syntax issue');

        jest
          .spyOn(fs, 'readFile')
          .mockResolvedValueOnce(`$include('components.header')`)
          .mockRejectedValueOnce(error);

        await expect(render('path')).rejects.toThrow(Error);
      });
    });

    describe('Log Statements', () => {
      it('log a value to the console', async () => {
        jest.spyOn(fs, 'readFile').mockResolvedValueOnce(`$log('bnjsx')`);
        const mock = jest.spyOn(console, 'log').mockImplementation(() => {});
        await expect(render('path')).resolves.toBe('');
        expect(mock).toHaveBeenCalledWith('bnjsx');
      });
    });

    describe('Print Statements', () => {
      it('print a value', async () => {
        jest.spyOn(fs, 'readFile').mockResolvedValueOnce(`$print('bnjsx')`);
        await expect(render('path')).resolves.toBe('bnjsx');
      });

      it('short print', async () => {
        jest.spyOn(fs, 'readFile').mockResolvedValueOnce(`$('bnjsx')`);
        await expect(render('path')).resolves.toBe('bnjsx');
      });

      it('print a reference', async () => {
        jest.spyOn(fs, 'readFile').mockResolvedValueOnce(`$print(name)`);
        await expect(render('path', { name: 'bnjsx' })).resolves.toBe('bnjsx');
      });
    });

    describe('Tools', () => {
      it('Should handle promises', async () => {
        jest.spyOn(fs, 'readFile').mockResolvedValue(`$(@fetchUser().name)`);
        await expect(render('foo')).resolves.toBe('simon');

        jest.spyOn(fs, 'readFile').mockResolvedValue(`$(@fetchName())`);
        await expect(render('foo')).resolves.toBe('bnjsx');
      });
    });
  });
});
