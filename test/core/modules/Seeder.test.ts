jest.mock('../../../src/core/modules/Builder');

import { Builder } from '../../../src/core/modules/Builder';
import { Faker } from '../../../src/helpers';
import { Mixer, Seeder, SeederError } from '../../../src/core';

class TestSeeder extends Seeder {}

const mock = {
  builder: (reject: boolean = false) => {
    const builder = new (Builder as any)();
    const promise = reject
      ? Promise.reject(new Error('Ops'))
      : Promise.resolve();

    const insert = {
      into: jest.fn(() => insert),
      rows: jest.fn(() => insert),
      row: jest.fn(() => insert),
      exec: jest.fn(() => promise),
    };

    builder.raw = jest.fn(() => promise);
    builder.insert = jest.fn(() => insert);

    return builder;
  },
};

describe('Seeder', () => {
  let seeder: any;

  beforeEach(() => {
    // Create a new instance of TestSeeder before each test
    seeder = new TestSeeder();
  });

  describe('constructor', () => {
    it('should throw an error when attempting to create an instance of Seeder directly', () => {
      expect(() => new (Seeder as any)()).toThrow(SeederError);
      expect(() => new (Seeder as any)()).toThrow(
        'Cannot construct Seeder instances directly'
      );
    });

    it('should allow instantiation of subclasses of Seeder', () => {
      // Create a subclass of Seeder for testing
      class TestSeeder extends Seeder {}

      // Expect no error when creating an instance of the subclass
      expect(() => new TestSeeder()).not.toThrow();
    });
  });

  describe('set.table', () => {
    it('should set the table name if it is in snake_case', () => {
      expect(seeder.set.table('users')).toBe(seeder);
      expect(seeder.table).toBe('users');
    });

    it('should throw an error if the table name is not in snake_case', () => {
      expect(() => seeder.set.table('Users')).toThrow(SeederError);
      expect(() => seeder.set.table('usersTable')).toThrow(SeederError);
    });
  });

  describe('set.rows', () => {
    it('should set the number of rows if it is a positive integer', () => {
      expect(seeder.set.rows(5)).toBe(seeder);
      expect(seeder.rows).toBe(5);
    });

    it('should throw an error if the rows number is invalid', () => {
      expect(() => seeder.set.rows(-1)).toThrow(SeederError);
      expect(() => seeder.set.rows('5' as any)).toThrow(SeederError);
    });
  });

  describe('set.builder', () => {
    it('should set the builder if it is an instance of Builder', () => {
      const builder = mock.builder();
      expect(seeder.set.builder(builder)).toBe(seeder);
      expect(seeder.builder).toBe(builder);
    });

    it('should throw if the builder is not an instance of Builder', () => {
      expect(() => seeder.set.builder({} as any)).toThrow(SeederError);
    });
  });

  describe('set.faker', () => {
    it('should set the faker if it is an instance of Faker', () => {
      const faker = new Faker();
      expect(seeder.set.faker(faker)).toBe(seeder);
      expect(seeder.faker).toBe(faker);
    });

    it('should throw if the faker is not an instance of Faker', () => {
      expect(() => seeder.set.faker({} as any)).toThrow(SeederError);
    });
  });

  describe('get.table', () => {
    it('should return the table name if it is in snake_case', () => {
      seeder.table = 'users';
      expect(seeder.get.table()).toBe('users');
    });

    it('should throw an error if the table name is not in snake_case', () => {
      seeder.table = 'Users'; // invalid
      expect(() => seeder.get.table()).toThrow(SeederError);

      seeder.table = 'usersTable'; // invalid
      expect(() => seeder.get.table()).toThrow(SeederError);
    });
  });

  describe('get.rows', () => {
    it('should return the number of rows if it is a positive integer', () => {
      seeder.rows = 5;
      expect(seeder.get.rows()).toBe(5);
    });

    it('should throw an error if the rows number is invalid', () => {
      seeder.rows = -1; // invalid
      expect(() => seeder.get.rows()).toThrow(SeederError);

      seeder.rows = '5'; // invalid type
      expect(() => seeder.get.rows()).toThrow(SeederError);
    });
  });

  describe('get.builder', () => {
    it('should return the builder instance if it is valid', () => {
      seeder.builder = mock.builder();
      expect(seeder.get.builder()).toBeInstanceOf(Builder);
    });

    it('should throw an error if the builder is invalid', () => {
      seeder.builder = {} as any;
      expect(() => seeder.get.builder()).toThrow(SeederError);
    });
  });

  describe('get.faker', () => {
    it('should return the faker instance if it is valid', () => {
      seeder.faker = new Faker();
      expect(seeder.get.faker()).toBeInstanceOf(Faker);
    });

    it('should throw an error if the faker is invalid', () => {
      seeder.faker = {} as any; // invalid
      expect(() => seeder.get.faker()).toThrow(SeederError);
    });
  });

  describe('get.mixer', () => {
    it('should return an existing mixer if key was already set', () => {
      const mixer = new Mixer();
      seeder.mixers.set('foo', mixer);

      expect(seeder.get.mixer('foo')).toBe(mixer);
    });

    it('should create and store a new mixer if not already set', () => {
      const mixer = seeder.get.mixer('newKey');

      expect(mixer).toBeInstanceOf(Mixer);
      expect(seeder.mixers.get('newKey')).toBe(mixer);
    });

    it('should throw error if key is not a string', () => {
      expect(() => seeder.get.mixer(null as any)).toThrow(SeederError);
      expect(() => seeder.get.mixer(123 as any)).toThrow(
        'Invalid mixer key in: TestSeeder'
      );
    });
  });

  describe('get.index', () => {
    it('should return the current index or default to 0', () => {
      expect(seeder.get.index()).toBe(0);
      seeder.index = 5;
      expect(seeder.get.index()).toBe(5);
    });
  });

  describe('get.row', () => {
    it('should return the current row or default to 1', () => {
      expect(seeder.get.row()).toBe(1);
      seeder.row = 7;
      expect(seeder.get.row()).toBe(7);
    });
  });

  describe('get.size', () => {
    it('should return the size of all mixers when no key is passed', () => {
      const m1 = new Mixer();
      const m2 = new Mixer();

      jest.spyOn(m1, 'size').mockReturnValue(3);
      jest.spyOn(m2, 'size').mockReturnValue(2);

      seeder.mixers.set('one', m1);
      seeder.mixers.set('two', m2);

      expect(seeder.get.size()).toBe(5);
    });

    it('should return the size of only specified mixers', () => {
      const m1 = new Mixer();
      const m2 = new Mixer();

      jest.spyOn(m1, 'size').mockReturnValue(2);
      jest.spyOn(m2, 'size').mockReturnValue(4);

      seeder.mixers.set('a', m1);
      seeder.mixers.set('b', m2);

      expect(seeder.get.size('a')).toBe(2);
      expect(seeder.get.size('b')).toBe(4);
      expect(seeder.get.size('a', 'b')).toBe(6);
    });

    it('should skip undefined mixers in size calculation', () => {
      const m = new Mixer();
      jest.spyOn(m, 'size').mockReturnValue(1);
      seeder.mixers.set('exists', m);

      expect(seeder.get.size('exists', 'notExists')).toBe(1);
    });
  });

  describe('seed', () => {
    it('should seed one row', async () => {
      // Implement layout
      const layout = {
        name: 'simon',
        email: 'simon@gmail.com',
        password: '123abc.z',
      };

      seeder.layout = jest.fn(() => layout);

      // Set rows
      seeder.set.rows(1); // seed one row

      // Set table
      seeder.set.table('users');

      // Set builder
      const builder = mock.builder();
      seeder.set.builder(builder);

      // Expect seed to resolve
      await expect(seeder.seed()).resolves.toBeUndefined();

      // Expect insert to be called
      expect(builder.insert).toHaveBeenCalledTimes(1);

      // Expect into to be called with table name
      expect(builder.insert().into).toHaveBeenCalledTimes(1);
      expect(builder.insert().into).toHaveBeenCalledWith('users');

      // Expect row to be called with row
      expect(builder.insert().rows).toHaveBeenCalledTimes(1);
      expect(builder.insert().rows).toHaveBeenCalledWith([layout]);

      // Expect exec to be called
      expect(builder.insert().exec).toHaveBeenCalledTimes(1);
    });

    it('should seed more than one row', async () => {
      // Implement layout
      const layout = {
        name: 'simon',
        email: 'simon@gmail.com',
        password: '123abc.z',
      };
      seeder.layout = jest.fn(() => layout);

      // Set rows
      seeder.set.rows(2);

      // Set table
      seeder.set.table('users');

      // Set builder
      const builder = mock.builder();
      seeder.set.builder(builder);

      // Expect seed to resolve
      await expect(seeder.seed()).resolves.toBeUndefined();

      // Expect insert to be called
      expect(builder.insert).toHaveBeenCalledTimes(1);

      // Expect into to be called with table name
      expect(builder.insert().into).toHaveBeenCalledTimes(1);
      expect(builder.insert().into).toHaveBeenCalledWith('users');

      // Expect rows to be called with rows
      expect(builder.insert().rows).toHaveBeenCalledTimes(1);
      expect(builder.insert().rows).toHaveBeenCalledWith([layout, layout]);

      // Expect exec to be called
      expect(builder.insert().exec).toHaveBeenCalledTimes(1);
    });

    it('should reject if the layout is invalid', async () => {
      // Override layout method to return an invalid layout
      seeder.layout = jest.fn(() => null);

      // Set rows
      seeder.set.rows(2);

      await expect(seeder.seed()).rejects.toThrow(SeederError);
      await expect(seeder.seed()).rejects.toThrow(
        'Invalid seeder layout in: TestSeeder'
      );
    });

    it('should handle database insertion failures', async () => {
      // Set layout
      seeder.layout = jest.fn(() => ({ name: 'simon' }));

      // Set the builder
      seeder.set.builder(mock.builder(true));

      // Set table
      seeder.set.table('users');

      // Set rows
      seeder.set.rows(2);

      // Expect seed to reject
      await expect(seeder.seed()).rejects.toThrow('Ops');
    });

    it('should handle missing layout', async () => {
      // Set layout => missing

      // Set the builder
      seeder.set.builder(mock.builder());

      // Set table
      seeder.set.table('users');

      // Set rows
      seeder.set.rows(10);

      // Execute seed
      expect(seeder.seed()).rejects.toThrow(
        'Seeder layout is missing in: TestSeeder'
      );
    });

    it('should handle missing builder', async () => {
      // Set layout
      seeder.layout = jest.fn(() => ({ name: 'simon' }));

      // Set the builder => missing

      // Set table
      seeder.set.table('users');

      // Set rows
      seeder.set.rows(10);

      // Execute seed
      expect(seeder.seed()).rejects.toThrow('Invalid builder in: TestSeeder');
    });

    it('should hanlde missing table', async () => {
      // Set layout
      seeder.layout = jest.fn(() => ({ name: 'simon' }));

      // Set the builder
      seeder.set.builder(mock.builder());

      // Set table => missing

      // Set rows
      seeder.set.rows(10);

      // Execute seed
      expect(seeder.seed()).rejects.toThrow(
        'Invalid table name in: TestSeeder'
      );
    });

    it('should handle missing rows', async () => {
      // Set layout
      seeder.layout = jest.fn(() => ({ name: 'simon' }));

      // Set the builder
      seeder.set.builder(mock.builder());

      // Set table
      seeder.set.table('users');

      // Set rows => missing

      // Execute seed
      expect(seeder.seed()).rejects.toThrow(
        'Invalid rows number in: TestSeeder'
      );
    });

    it('should seed 0 rows', async () => {
      // Set layout
      seeder.layout = jest.fn(() => ({ name: 'simon' }));

      // Set the builder
      seeder.set.builder(mock.builder());

      // Set table
      seeder.set.table('users');

      // Set rows
      seeder.set.rows(0); // disable seeding

      // Execute seed
      expect(seeder.seed()).resolves.toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should resolve when DELETE query succeeds', async () => {
      // Set builder
      seeder.set.builder(mock.builder());

      // Set table
      seeder.set.table('users');

      await expect(seeder.clear()).resolves.toBeUndefined();
      expect(seeder.get.builder().raw).toHaveBeenCalledWith(
        `DELETE FROM ${seeder.get.table()}`
      );
    });

    it('should reject when DELETE query fails', async () => {
      // Set builder
      seeder.set.builder(mock.builder(true)); // Reject

      // Set table
      seeder.set.table('users');

      await expect(seeder.clear()).rejects.toThrow('Ops');
    });
  });

  describe('consume', () => {
    it('should consume all rows from first mixer before using the next', () => {
      const first = new Mixer().set('a', [1, 2]);
      const second = new Mixer().set('b', ['x', 'y']);
      seeder.mixers.set('first', first);
      seeder.mixers.set('second', second);

      const rows = [
        seeder.consume(), // a:1 (from first)
        seeder.consume(), // a:2 (from first)
        seeder.consume(), // b:'x' (now we move to second)
        seeder.consume(), // b:'y'
      ];

      expect(rows[0]).toEqual({ a: 1 });
      expect(rows[1]).toEqual({ a: 2 });
      expect(rows[2]).toEqual({ b: 'x' });
      expect(rows[3]).toEqual({ b: 'y' });
    });

    it('should throw if all mixers are exhausted', () => {
      const m = new Mixer().set('z', [1]);
      seeder.mixers.set('z', m);

      seeder.consume(); // ok
      expect(() => seeder.consume()).toThrow(
        'No more rows available from mixers'
      );
    });

    it('should filter unwanted mixers and only use defined ones', () => {
      const all = new Mixer().set('a', [1, 2]); // should be ignored
      const wanted = new Mixer().set('b', ['x', 'y']);

      seeder.mixers.set('all', all);
      seeder.mixers.set('wanted', wanted);

      const r1 = seeder.consume('wanted'); // b: 'x'
      const r2 = seeder.consume('wanted'); // b: 'y'

      expect(r1).toEqual({ b: 'x' });
      expect(r2).toEqual({ b: 'y' });

      // Verify that 'all' was never used
      expect(() => seeder.consume('wanted')).toThrow(
        'No more rows available from mixers'
      );
    });
  });
});
