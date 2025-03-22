jest.mock('crypto');

import { ForEach } from '../../../../src/core/template/statements/ForEach';
import { Statement } from '../../../../src/core/template/Parser';
import { ParserError } from '../../../../src/core/template/Parser';

import { Global } from '../../../../src/core/template/Global';
import { Reference } from '../../../../src/core/template/Reference';
import { Tool } from '../../../../src/core/template/Tool';

import { randomUUID } from 'crypto';

let statement = (definition: string): Statement => {
  return {
    placeholder: 'placeholder-id',
    type: 'foreach',
    line: 10,
    definition,
  };
};

describe('ForEach Class', () => {
  describe('Constructor', () => {
    it('should create a valid instance when given proper arguments', () => {
      const instance = new ForEach(
        'component-name',
        statement('$foreach(item, index, collection) body $endforeach')
      );

      expect(instance.name).toBe('component-name');
      expect(instance.line).toBe(10);
      expect(instance.placeholder).toBe('placeholder-id');
      expect(instance.item).toBe('item');
      expect(instance.index).toBe('index');
      expect(instance.collection).toBeInstanceOf(Reference); // Collection type may vary
      expect(instance.body).toContain(' body ');
      expect(instance.statements).toBeUndefined();
    });

    it('should still work if the index is missing', () => {
      const instance = new ForEach(
        'component-name',
        statement('$foreach(item, collection) body $endforeach')
      );

      expect(instance.index).toBeUndefined(); // Undefined
    });

    it('should throw ParserError if arguments are invalid', () => {
      const arg = null as any;
      expect(() => new ForEach(arg, arg)).toThrow(ParserError);
    });

    it('should throw SyntaxError if the body is missing or empty', () => {
      expect(
        () =>
          new ForEach(
            'component-name',
            statement('$foreach(item, index, collection) $endforeach')
          )
      ).toThrow(SyntaxError);
    });

    it('should throw SyntaxError for invalid statement arguments', () => {
      expect(
        () =>
          new ForEach(
            'component-name',
            statement('$foreach() body $endforeach')
          )
      ).toThrow(SyntaxError);
    });

    it('should throw SyntaxError for invalid definition', () => {
      expect(
        () =>
          new ForEach(
            'component-name',
            statement('$foreach (item, collection)')
          )
      ).toThrow(SyntaxError);
    });

    it('should hanlde nested statements', () => {
      (randomUUID as jest.Mock).mockImplementation(() => 'uuid');

      const instance = new ForEach('component-name', {
        placeholder: '{{ foreach: uuid }}',
        type: 'foreach',
        definition: `$foreach(item, collection) 
         $print(value)
         $log(value)
         $if(con) do this $endif
         $render(component) $endrender
        $endforeach`,
        line: 1, // found at line 1
      });

      expect(instance.statements).toEqual([
        {
          placeholder: '{{ print: uuid }}',
          type: 'print',
          line: 2,
          definition: '$print(value)',
        },
        {
          placeholder: '{{ log: uuid }}',
          type: 'log',
          line: 3,
          definition: '$log(value)',
        },
        {
          placeholder: '{{ if: uuid }}',
          type: 'if',
          line: 4,
          definition: '$if(con) do this $endif',
        },
        {
          placeholder: '{{ render: uuid }}',
          type: 'render',
          line: 5,
          definition: '$render(component) $endrender',
        },
      ]);
    });
  });

  describe('Resolving', () => {
    it('should resolve collection as Global', () => {
      expect(
        new ForEach(
          'component-name',
          statement('$foreach(item, index, #key) body $endforeach')
        ).collection
      ).toBeInstanceOf(Global);
    });

    it('should resolve collection as Reference', () => {
      expect(
        new ForEach(
          'component-name',
          statement('$foreach(item, index, ref) body $endforeach')
        ).collection
      ).toBeInstanceOf(Reference);
    });

    it('should resolve collection as Tool', () => {
      expect(
        new ForEach(
          'component-name',
          statement('$foreach(item, index, @name()) body $endforeach')
        ).collection
      ).toBeInstanceOf(Tool);
    });

    it('should throw SyntaxError for unresolved collection', () => {
      expect(
        () =>
          new ForEach(
            'component-name',
            statement('$foreach(item, index, 123) body $endforeach')
          )
      ).toThrow(SyntaxError);

      expect(
        () =>
          new ForEach(
            'component-name',
            statement('$foreach(item, index in [1,2,3]) body $endforeach')
          )
      ).toThrow(SyntaxError);
    });
  });
});
