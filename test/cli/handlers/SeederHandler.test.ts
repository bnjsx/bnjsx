jest.mock('fs/promises');
jest.mock('../../../src/core/modules/Builder');
jest.mock('../../../src/core/modules/Seeder');

import * as fs from 'fs/promises';
import * as path from 'path';

import { SeederHandler } from '../../../src/cli/handlers/SeederHandler';
import { SeederHandlerError } from '../../../src/cli/handlers/SeederHandler';

import { Builder } from '../../../src/core/modules/Builder';
import { Seeder } from '../../../src/core/modules/Seeder';

const mock = {
  builder: (): Builder => {
    return new Builder({} as any);
  },
  seeder: (table?: string, reject: boolean = false) => {
    table = table === undefined ? 'users' : table;

    const seeder = new (Seeder as any)();

    seeder.set = { builder: jest.fn(() => seeder) };
    seeder.get = { table: jest.fn(() => table) };

    seeder.seed = jest.fn(() => Promise.resolve());
    seeder.clear = jest.fn(() => Promise.resolve());

    if (reject) {
      seeder.seed = jest.fn(() => Promise.reject(new Error('Ops')));
      seeder.clear = jest.fn(() => Promise.reject(new Error('Ops')));
    }

    return seeder;
  },
};

describe('SeederHandler', () => {
  describe('constructor', () => {
    it('should work with a valid Builder', () => {
      const builder = mock.builder();
      const handler = new SeederHandler(builder) as any;

      expect(handler).toBeInstanceOf(SeederHandler);
      expect(handler.builder).toBe(builder);
      expect(handler.assets).toBe(path.resolve(__dirname, '../../../assets'));
    });

    it('should throw with an invalid Builder', () => {
      const invalidBuilder = '-invalid-' as any; // Not an instance of Builder

      expect(() => new SeederHandler(invalidBuilder)).toThrow(
        SeederHandlerError
      );

      expect(() => new SeederHandler(invalidBuilder)).toThrow(
        'Invalid builder: -invalid-'
      );
    });
  });

  describe('collectPaths', () => {
    it('should resolve if the directory is empty', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([]);

      const handler = new SeederHandler(mock.builder()) as any;
      await expect(handler.collectPaths('path', false)).resolves.toEqual([]);
    });

    it('should remove maps if map is false', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        '01_seed_users_table.js',
        '01_seed_users_table.js.map',
      ]);

      const handler = new SeederHandler(mock.builder()) as any;

      await expect(handler.collectPaths('root', false)).resolves.toEqual([
        path.resolve('root', '01_seed_users_table.js'),
      ]);
    });

    it('should keep maps if map is true', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        '01_seed_users_table.js',
        '01_seed_users_table.js.map',
      ]);

      const handler = new SeederHandler(mock.builder()) as any;

      await expect(handler.collectPaths('root', true)).resolves.toEqual([
        path.resolve('root', '01_seed_users_table.js'),
        path.resolve('root', '01_seed_users_table.js.map'),
      ]);
    });

    it('should reject if any file is invalid', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        '01_seed_users_table.js',
        '01_seed_users_table.js.map',
        123, // invalid file
      ]);

      const handler = new SeederHandler(mock.builder()) as any;
      await expect(handler.collectPaths('root', false)).rejects.toThrow(
        SeederHandlerError
      );
    });

    it('should reject if fs.readdir rejects', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(
        new Error('Failed to read directory')
      );

      const handler = new SeederHandler(mock.builder()) as any;
      await expect(handler.collectPaths('root', false)).rejects.toThrow(
        'Failed to read directory'
      );
    });
  });

  describe('collectSeeders', () => {
    const mockRequire = (modulePath: string, moduleExports: any) => {
      jest.mock(modulePath, () => moduleExports, { virtual: true });
    };

    afterEach(() => {
      jest.resetModules();
    });

    it('should collect valid default seeders', () => {
      const path = 'path/to/seeder/file';
      const seeder = mock.seeder();

      // Export default seeder
      mockRequire(path, seeder);

      const handler = new SeederHandler(mock.builder()) as any;
      const seeders = handler.collectSeeders([path]);

      expect(seeders).toHaveLength(1);
      expect(seeders).toContain(seeder);
    });

    it('should collect valid named seeders', () => {
      const path = 'path/to/seeder/file';
      const seeder = mock.seeder();

      // Export named seeder
      mockRequire(path, { name: seeder });

      const handler = new SeederHandler(mock.builder()) as any;
      const seeders = handler.collectSeeders([path]);

      expect(seeders).toHaveLength(1);
      expect(seeders).toContain(seeder);
    });

    it('should throw if module does not export valid seeder', () => {
      const path = 'path/to/seeder/file';

      // Export invalid seeder
      mockRequire(path, {});

      const handler = new SeederHandler(mock.builder()) as any;
      expect(() => handler.collectSeeders([path])).toThrow(SeederHandlerError);
    });

    it('should throw if module does not exist', () => {
      const path = 'does/not/exist';

      const handler = new SeederHandler(mock.builder()) as any;
      expect(() => handler.collectSeeders([path])).toThrow(SeederHandlerError);
    });

    it('should throw if paths array is empty', () => {
      const handler = new SeederHandler(mock.builder()) as any;
      expect(() => handler.collectSeeders([])).toThrow(SeederHandlerError);
    });
  });

  describe('clear', () => {
    let seeder: any;

    beforeEach(() => {
      // Create an instance of SeederHandler before each test
      seeder = new SeederHandler(mock.builder());
    });

    test('should resolve and clear all tables', async () => {
      const paths = ['path1', 'path2'];
      const seeders = [mock.seeder(), mock.seeder()];

      seeder.collectPaths = jest.fn(() => Promise.resolve(paths));
      seeder.collectSeeders = jest.fn(() => seeders);

      const result = await seeder.clear('./seeders');

      expect(result).toBe('2/2 tables cleared');
      expect(seeders[0].clear).toHaveBeenCalled();
      expect(seeders[1].clear).toHaveBeenCalled();
    });

    test('should resolve and clear one table', async () => {
      const paths = ['path1', 'path2'];
      const seeders = [mock.seeder('users'), mock.seeder('profiles')];

      seeder.collectPaths = jest.fn(() => Promise.resolve(paths));
      seeder.collectSeeders = jest.fn(() => seeders);

      const result = await seeder.clear('./seeders', 'users');

      expect(result).toBe('Table cleared successfully');
      expect(seeders[0].clear).toHaveBeenCalled();
      expect(seeders[1].clear).not.toHaveBeenCalled();
    });

    test('should reject if clearing a specific table fails', async () => {
      const paths = ['path1', 'path2'];
      const seeders = [mock.seeder('users', true), mock.seeder('profiles')];

      seeder.collectPaths = jest.fn(() => Promise.resolve(paths));
      seeder.collectSeeders = jest.fn(() => seeders);

      await expect(seeder.clear('./seeders', 'users')).rejects.toThrow(
        'Failed to clear table: Ops'
      );

      expect(seeders[0].clear).toHaveBeenCalled();
      expect(seeders[1].clear).not.toHaveBeenCalled();
    });

    test('should reject if clearing any table fails', async () => {
      const paths = ['path1', 'path2'];
      const seeders = [
        mock.seeder('users', true),
        mock.seeder('profiles', true),
      ];

      seeder.collectPaths = jest.fn(() => Promise.resolve(paths));
      seeder.collectSeeders = jest.fn(() => seeders);

      await expect(seeder.clear('./seeders')).rejects.toThrow(
        '0/2 tables cleared: Ops'
      );

      expect(seeders[0].clear).toHaveBeenCalled();
      expect(seeders[1].clear).not.toHaveBeenCalled();
    });

    test('should reject for an invalid table name', async () => {
      await expect(
        seeder.clear('./seeders', 'InvalidTableName')
      ).rejects.toThrow('Invalid table: InvalidTableName');
    });

    test('should reject for an invalid path', async () => {
      await expect(seeder.clear(123)).rejects.toThrow('Invalid path: 123');
    });

    test('should reject if no seeder is found', async () => {
      const paths = ['path1', 'path2'];
      const seeders = [mock.seeder('products'), mock.seeder('profiles')];

      seeder.collectPaths = jest.fn(() => Promise.resolve(paths));
      seeder.collectSeeders = jest.fn(() => seeders);

      await expect(seeder.clear('./seeders', 'users')).rejects.toThrow(
        'No seeder found for table: users'
      );
    });
  });

  describe('seed', () => {
    let seeder: any;

    beforeEach(() => {
      // Create an instance of SeederHandler before each test
      seeder = new SeederHandler(mock.builder());
    });

    test('should resolve and seed all tables', async () => {
      const paths = ['path1', 'path2'];
      const seeders = [mock.seeder(), mock.seeder()];

      seeder.collectPaths = jest.fn(() => Promise.resolve(paths));
      seeder.collectSeeders = jest.fn(() => seeders);

      const result = await seeder.seed('./seeders');

      expect(result).toBe('2/2 tables seeded');
      expect(seeders[0].seed).toHaveBeenCalled();
      expect(seeders[1].seed).toHaveBeenCalled();
    });

    test('should resolve and seed one table', async () => {
      const paths = ['path1', 'path2'];
      const seeders = [mock.seeder('users'), mock.seeder('profiles')];

      seeder.collectPaths = jest.fn(() => Promise.resolve(paths));
      seeder.collectSeeders = jest.fn(() => seeders);

      const result = await seeder.seed('./seeders', 'users');

      expect(result).toBe('Table seeded successfully');
      expect(seeders[0].seed).toHaveBeenCalled();
      expect(seeders[1].seed).not.toHaveBeenCalled();
    });

    test('should reject if seeding a specific table fails', async () => {
      const paths = ['path1', 'path2'];
      const seeders = [mock.seeder('users', true), mock.seeder('profiles')];

      seeder.collectPaths = jest.fn(() => Promise.resolve(paths));
      seeder.collectSeeders = jest.fn(() => seeders);

      await expect(seeder.seed('./seeders', 'users')).rejects.toThrow(
        'Failed to seed table: Ops'
      );

      expect(seeders[0].seed).toHaveBeenCalled();
      expect(seeders[1].seed).not.toHaveBeenCalled();
    });

    test('should reject if seeding any table fails', async () => {
      const paths = ['path1', 'path2'];
      const seeders = [
        mock.seeder('users', true),
        mock.seeder('profiles', true),
      ];

      seeder.collectPaths = jest.fn(() => Promise.resolve(paths));
      seeder.collectSeeders = jest.fn(() => seeders);

      await expect(seeder.seed('./seeders')).rejects.toThrow(
        '0/2 tables seeded: Ops'
      );

      expect(seeders[0].seed).toHaveBeenCalled();
      expect(seeders[1].seed).not.toHaveBeenCalled();
    });

    test('should reject for an invalid table name', async () => {
      await expect(
        seeder.seed('./seeders', 'InvalidTableName')
      ).rejects.toThrow('Invalid table: InvalidTableName');
    });

    test('should reject for an invalid path', async () => {
      await expect(seeder.seed(123)).rejects.toThrow('Invalid path: 123');
    });

    test('should reject if no seeder is found', async () => {
      const paths = ['path1', 'path2'];
      const seeders = [mock.seeder('products'), mock.seeder('profiles')];

      seeder.collectPaths = jest.fn(() => Promise.resolve(paths));
      seeder.collectSeeders = jest.fn(() => seeders);

      await expect(seeder.seed('./seeders', 'users')).rejects.toThrow(
        'No seeder found for users table in: ./seeders'
      );
    });
  });

  describe('add', () => {
    it('should resolve if file is created', async () => {
      const template = '[className] - [tableName] - [fileName]';
      const files = ['01_seed_users_table.ts'];

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.readdir to resolve with files
      (fs.readdir as jest.Mock).mockResolvedValue(files);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = new SeederHandler(mock.builder()) as any;
      await expect(handler.add('profiles', 'root', true)).resolves.toBe(
        `Seeder added in: ${path.resolve('root', '02_seed_profiles_table.ts')}`
      );

      // Check readFile
      expect(fs.readFile).toHaveBeenCalledWith(
        path.resolve(handler.assets, 'ts/seeder.txt'),
        'utf-8'
      );

      // Check readdir
      expect(fs.readdir).toHaveBeenCalledWith('root');

      // Check writeFile
      expect(fs.writeFile).toHaveBeenCalledWith(
        path.resolve('root', '02_seed_profiles_table.ts'),
        'ProfilesTableSeeder - profiles - 02_seed_profiles_table.ts',
        'utf-8'
      );
    });

    it('should resolve with the first file', async () => {
      const template = '[className] - [tableName] - [fileName]';
      const files = []; // no files in the folder

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.readdir to resolve with files
      (fs.readdir as jest.Mock).mockResolvedValue(files);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = new SeederHandler(mock.builder()) as any;
      await expect(handler.add('users', 'root', true)).resolves.toBe(
        `Seeder added in: ${path.resolve(
          'root',
          '01_seed_users_table.ts' // first file
        )}`
      );
    });

    it('should reject if an invalid file found', async () => {
      const template = '[className] - [tableName] - [fileName]';
      const files = ['-invalid-']; //invalid file found

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.readdir to resolve with files
      (fs.readdir as jest.Mock).mockResolvedValue(files);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const handler = new SeederHandler(mock.builder()) as any;
      await expect(handler.add('users', 'root', true)).rejects.toThrow(
        'Invalid seeder file: -invalid-'
      );
    });

    it('should reject if table name check fails', async () => {
      const handler = new SeederHandler(mock.builder()) as any;
      await expect(handler.add(123, 'root')).rejects.toThrow(
        'Invalid table name: 123'
      );
    });

    it('should reject if path check fails', async () => {
      const handler = new SeederHandler(mock.builder()) as any;
      await expect(handler.add('profiles', 123)).rejects.toThrow(
        'Invalid path: 123'
      );
    });

    it('should reject if fs.readFile fails', async () => {
      const error = new Error('Ops');

      // Mock fs.readFile to reject
      (fs.readFile as jest.Mock).mockRejectedValue(error);

      const handler = new SeederHandler(mock.builder()) as any;
      await expect(handler.add('profiles', 'root')).rejects.toThrow('Ops');
    });

    it('should reject if fs.readdir fails', async () => {
      const template = '[className] - [tableName] - [fileName]';
      const error = new Error('Ops');

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.readdir to reject
      (fs.readdir as jest.Mock).mockRejectedValue(error);

      const handler = new SeederHandler(mock.builder()) as any;
      await expect(handler.add('profiles', 'root')).rejects.toThrow('Ops');
    });

    it('should reject if fs.writeFile fails', async () => {
      const template = '[className] - [tableName] - [fileName]';
      const files = ['01_seed_users_table.ts'];
      const error = new Error('Ops');

      // Mock fs.readFile to resolve with template
      (fs.readFile as jest.Mock).mockResolvedValue(template);

      // Mock fs.readdir to resolve with files
      (fs.readdir as jest.Mock).mockResolvedValue(files);

      // Mock fs.writeFile to resolve
      (fs.writeFile as jest.Mock).mockRejectedValue(error);

      const handler = new SeederHandler(mock.builder()) as any;
      await expect(handler.add('profiles', 'root')).rejects.toThrow('Ops');
    });
  });

  describe('remove', () => {
    it('should resolve if files are removed and renamed', async () => {
      // Arguments
      const table = 'users'; // valid table name
      const root = 'root'; // valid path

      // Create an instance
      const handler = new SeederHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = [
        'root/01_seed_users_table.js',
        'root/02_seed_profiles_table.js',
        'root/03_seed_products_table.js',
      ];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock reset => resolves
      handler.reset = jest.fn(() => Promise.resolve());

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Mock fs.rename => resolves
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to resolve
      await expect(handler.remove(table, root)).resolves.toBe(
        '1 seeder file removed in:\nroot/01_seed_users_table.js'
      );

      // Expect 'root/01_seed_users_table.js' to be unliked
      expect(fs.unlink).toHaveBeenCalledWith('root/01_seed_users_table.js');
      expect(fs.unlink).toHaveBeenCalledTimes(1);

      // Expect the rest to be renamed
      expect(fs.rename).toHaveBeenCalledTimes(2);

      expect(fs.rename).toHaveBeenCalledWith(
        'root/02_seed_profiles_table.js', // From
        'root/01_seed_profiles_table.js' // To
      );

      expect(fs.rename).toHaveBeenCalledWith(
        'root/03_seed_products_table.js', // From
        'root/02_seed_products_table.js' // To
      );
    });

    it('should resolve if rename paths are empty', async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = 'users'; // valid table name
      const root = 'root'; // valid path

      // Create an instance
      const handler = new SeederHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = ['root/01_seed_users_table.js'];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock reset => resolves
      handler.reset = jest.fn(() => Promise.resolve());

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Mock fs.rename => resolves
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to resolve
      await expect(handler.remove(table, root)).resolves.toBe(
        '1 seeder file removed in:\nroot/01_seed_users_table.js'
      );

      // Expect 'root/01_seed_users_table.js' to be unliked
      expect(fs.unlink).toHaveBeenCalledWith('root/01_seed_users_table.js');
      expect(fs.unlink).toHaveBeenCalledTimes(1);

      // Expect the rename not be called
      expect(fs.rename).not.toHaveBeenCalled();
    });

    it('should reject if name is invalid', async () => {
      // Arguments
      const table = '-invalid-'; // invalid name
      const root = 'root'; // valid path

      // Create an instance
      const handler = new SeederHandler(mock.builder()) as any;

      // Expect remove to rejects
      await expect(handler.remove(table, root)).rejects.toThrow(
        'Invalid table name: -invalid-'
      );
    });

    it('should reject if path is invalid', async () => {
      // Arguments
      const table = 'users'; // valid table name
      const root = 123; // invalid path

      // Create an instance
      const handler = new SeederHandler(mock.builder()) as any;

      // Expect remove to rejects
      await expect(handler.remove(table, root)).rejects.toThrow(
        'Invalid path: 123'
      );
    });

    it('should reject if collectPaths rejects', async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = 'users'; // valid table name
      const root = 'root'; // valid path

      // Create an instance
      const handler = new SeederHandler(mock.builder()) as any;

      // Mock collectPaths => rejects
      const error = new Error('Ops');
      handler.collectPaths = jest.fn(() => Promise.reject(error));

      // Mock reset => resolves
      handler.reset = jest.fn(() => Promise.resolve());

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Mock fs.rename => resolves
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to rejects
      await expect(handler.remove(table, root)).rejects.toThrow('Ops');
    });

    it('should reject if unlink rejects', async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = 'users'; // valid table name
      const root = 'root'; // valid path

      // Create an instance
      const handler = new SeederHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = ['root/01_seed_users_table.js'];
      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock reset => resolves
      handler.reset = jest.fn(() => Promise.resolve());

      // Mock fs.unlik => rejects
      const error = new Error('Ops');
      (fs.unlink as jest.Mock).mockRejectedValue(error);

      // Mock fs.rename => resolves
      (fs.rename as jest.Mock).mockResolvedValue(undefined);

      // Expect remove to rejects
      await expect(handler.remove(table, root)).rejects.toThrow('Ops');
    });

    it('should reject if rename rejects', async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = 'users'; // valid table name
      const root = 'root'; // valid path

      // Create an instance
      const handler = new SeederHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = [
        'root/01_seed_users_table.js',
        'root/02_seed_products_table.js',
      ];
      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Mock reset => resolves
      handler.reset = jest.fn(() => Promise.resolve());

      // Mock fs.unlik => resolves
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      // Mock fs.rename => rejects
      const error = new Error('Ops');
      (fs.rename as jest.Mock).mockRejectedValue(error);

      // Expect remove to reject
      await expect(handler.remove(table, root)).rejects.toThrow('Ops');
    });

    it('should reject if no seeder found', async () => {
      // Clear Mocks
      (fs.unlink as jest.Mock).mockClear();
      (fs.rename as jest.Mock).mockClear();

      // Arguments
      const table = 'users'; // table name with no seeder file
      const root = 'root'; // valid path

      // Create an instance
      const handler = new SeederHandler(mock.builder()) as any;

      // Mock collectPaths => resolves
      const paths = [
        'root/01_seed_categories_table.js',
        'root/02_seed_products_table.js',
      ];

      handler.collectPaths = jest.fn(() => Promise.resolve(paths));

      // Expect remove to reject
      await expect(handler.remove(table, root)).rejects.toThrow(
        'No seeder found for users table in: root'
      );
    });
  });
});
