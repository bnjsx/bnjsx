jest.mock('fs', () => ({
  ...jest.requireActual('fs'), // Keep the actual `fs` methods
  existsSync: jest.fn(), // Mock `existsSync`
  readFileSync: jest.fn(),
  promises: {
    ...jest.requireActual('fs').promises,
    mkdir: jest.fn(),
    writeFile: jest.fn(),
    readFile: jest.fn(),
    access: jest.fn(), // Mock `access` method in `fs.promises`
  },
}));

import * as fs from 'fs';
import path, { join } from 'path';
import { Config, ConfigError } from '../../../src/helpers';

describe('Config', () => {
  const App = class extends Config {} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    App.config = undefined; // Reset the cached config
    App.root = undefined; // Reset cache
    App.validators = undefined;
  });

  describe('resolveSync', () => {
    const cwd = jest.spyOn(process, 'cwd');
    const existSync = jest.spyOn(fs, 'existsSync');

    test('should return the root directory if node_modules is found', () => {
      cwd.mockReturnValue('/mock/root/project');
      existSync
        .mockImplementationOnce(() => false) // First directory, no node_modules
        .mockImplementationOnce(() => true); // Second directory, node_modules found

      expect(App.resolveSync()).toBe('/mock/root');
      expect(existSync).toHaveBeenCalledTimes(2);

      // Should cache the root
      expect(App.resolveSync()).toBe('/mock/root'); // Same
      expect(existSync).toHaveBeenCalledTimes(2); // Never executed again
    });

    test('should throw ConfigError if no node_modules is found', () => {
      cwd.mockReturnValue('/mock/root');
      existSync.mockReturnValue(false);

      expect(() => App.resolveSync()).toThrow(ConfigError);
      expect(existSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('resolve', () => {
    const cwd = jest.spyOn(process, 'cwd');
    const access = jest.spyOn(fs.promises, 'access');

    test('should resolve the root directory if node_modules is found', async () => {
      cwd.mockReturnValue('/mock/root/project');

      access
        .mockRejectedValueOnce(new Error()) // First directory, no node_modules
        .mockResolvedValueOnce(); // Second directory, node_modules found

      await expect(App.resolve()).resolves.toBe('/mock/root');
      expect(access).toHaveBeenCalledTimes(2);

      // Should cache the root
      expect(App.resolve()).resolves.toBe('/mock/root'); // Same
      expect(access).toHaveBeenCalledTimes(2); // Never executed again
    });

    test('should reject with ConfigError if no node_modules is found', async () => {
      cwd.mockReturnValue('/mock/root');

      access.mockRejectedValue(new Error());

      await expect(App.resolve()).rejects.toThrow(ConfigError);
      expect(access).toHaveBeenCalledTimes(2);
    });
  });

  describe('exist', () => {
    const access = jest.spyOn(fs.promises, 'access');

    test('should resolve if path exists', async () => {
      access.mockResolvedValueOnce(undefined); // Simulate path exists

      await expect(App.exist('/valid/path')).resolves.toBeUndefined();
      expect(access).toHaveBeenCalledWith('/valid/path');
    });

    test('should reject with ConfigError if path does not exist', async () => {
      access.mockRejectedValueOnce(new Error('ENOENT')); // Simulate path does not exist

      await expect(App.exist('/invalid/path')).rejects.toThrow(ConfigError);
      expect(access).toHaveBeenCalledWith('/invalid/path');
    });

    test('should reject with ConfigError if path is invalid', async () => {
      await expect(App.exist(123 as any)).rejects.toThrow(ConfigError); // Invalid path (empty string)
    });
  });

  describe('existMany', () => {
    const access = jest.spyOn(fs.promises, 'access');

    test('should resolve if all paths exist', async () => {
      access.mockResolvedValueOnce(undefined); // Simulate first path exists
      access.mockResolvedValueOnce(undefined); // Simulate second path exists

      await expect(
        App.existMany(['/valid/path1', '/valid/path2'])
      ).resolves.toBeUndefined();
      expect(access).toHaveBeenCalledTimes(2);
    });

    test('should reject with ConfigError if any path does not exist', async () => {
      access.mockResolvedValueOnce(undefined); // Simulate first path exists
      access.mockRejectedValueOnce(new Error('ENOENT')); // Simulate second path does not exist

      await expect(
        App.existMany(['/valid/path1', '/invalid/path2'])
      ).rejects.toThrow(ConfigError);
      expect(access).toHaveBeenCalledTimes(2);
    });

    test('should reject with ConfigError if any path is invalid', async () => {
      await expect(App.existMany([123 as any, '/valid/path2'])).rejects.toThrow(
        ConfigError
      ); // Invalid path (empty string)
    });
  });

  describe('mkdir', () => {
    const mkdir = jest.spyOn(fs.promises, 'mkdir');
    const access = jest.spyOn(fs.promises, 'access');

    test('should resolve if the directory already exists', async () => {
      access.mockResolvedValueOnce(undefined); // Directory exists

      await expect(App.mkdir('/existing/directory')).resolves.toBeUndefined();
      expect(mkdir).not.toHaveBeenCalled(); // No need to create
    });

    test('should create the directory if it does not exist', async () => {
      access.mockRejectedValueOnce(new Error('ENOENT')); // Directory does not exist

      mkdir.mockResolvedValueOnce(undefined); // Simulate successful mkdir

      await expect(App.mkdir('/new/directory')).resolves.toBeUndefined();
      expect(mkdir).toHaveBeenCalledWith('/new/directory', { recursive: true });
    });

    test('should reject with ConfigError if path is invalid', async () => {
      await expect(App.mkdir(123 as any)).rejects.toThrow(ConfigError); // Invalid path (empty string)
    });

    test('should reject with ConfigError if mkdir fails', async () => {
      access.mockRejectedValueOnce(new Error('ENOENT')); // Directory does not exist
      mkdir.mockRejectedValueOnce(new Error('Failed to create directory')); // mkdir fails

      await expect(App.mkdir('/new/directory')).rejects.toThrow(ConfigError);
      expect(mkdir).toHaveBeenCalledWith('/new/directory', { recursive: true });
    });
  });

  describe('mkfile', () => {
    const writeFile = jest.spyOn(fs.promises, 'writeFile');
    const access = jest.spyOn(fs.promises, 'access');
    const mkdir = jest.spyOn(fs.promises, 'mkdir');
    const dirname = jest.spyOn(path, 'dirname');

    test('should resolve if the file already exists', async () => {
      access.mockResolvedValueOnce(undefined); // File exists

      await expect(App.mkfile('/existing/file.txt')).resolves.toBeUndefined();
      expect(mkdir).not.toHaveBeenCalled(); // No need to create directory
      expect(writeFile).not.toHaveBeenCalled(); // No need to write file
    });

    test('should create the file and directories if they do not exist', async () => {
      access.mockRejectedValueOnce(new Error('ENOENT')); // File does not exist
      mkdir.mockResolvedValueOnce(undefined); // Directory creation success
      writeFile.mockResolvedValueOnce(undefined); // File write success

      await expect(
        App.mkfile('/new/file.txt', 'content')
      ).resolves.toBeUndefined();
      expect(mkdir).toHaveBeenCalledWith('/new', { recursive: true }); // Ensure directory exists
      expect(writeFile).toHaveBeenCalledWith('/new/file.txt', 'content'); // Write the file
    });

    test('should reject with ConfigError if path is invalid', async () => {
      await expect(App.mkfile(123 as any, 'content')).rejects.toThrow(
        ConfigError
      ); // Invalid path
    });

    test('should reject with ConfigError if content is invalid', async () => {
      await expect(App.mkfile('/new/file.txt', 123 as any)).rejects.toThrow(
        ConfigError
      ); // Invalid content
    });

    test('should reject with ConfigError if file creation fails', async () => {
      access.mockRejectedValueOnce(new Error('ENOENT')); // File does not exist
      mkdir.mockResolvedValueOnce(undefined); // Directory creation success
      writeFile.mockRejectedValueOnce(new Error('Failed to create file')); // File write failure

      await expect(App.mkfile('/new/file.txt', 'content')).rejects.toThrow(
        ConfigError
      );
    });

    test('should reject with ConfigError if dir creation fails', async () => {
      access.mockRejectedValueOnce(new Error('ENOENT')); // File does not exist
      mkdir.mockRejectedValueOnce(new Error('Failed to create dir')); // Directory creation success

      await expect(App.mkfile('/new/file.txt', 'content')).rejects.toThrow(
        ConfigError
      );
    });
  });

  describe('register', () => {
    test('should register a valid validator', () => {
      const validator = jest.fn((config) => ({ ...config, validated: true }));

      App.register(validator);

      // Ensure that the validator has been added to the validators array
      expect(App.validators).toHaveLength(1);
      expect(App.validators[0]).toBe(validator);
    });

    test('should throw ConfigError if the validator is not a function', () => {
      expect(() => App.register('invalidValidator' as any)).toThrow(
        ConfigError
      );

      expect(() => App.register('invalidValidator' as any)).toThrow(
        'Invalid validator: invalidValidator'
      );
    });
  });

  describe('validate', () => {
    test('should apply all registered validators to the config', () => {
      const validator1 = jest.fn((config) => ({ ...config, step1: true }));
      const validator2 = jest.fn((config) => ({ ...config, step2: true }));

      App.register(validator1);
      App.register(validator2);

      const config = { initial: true };
      const validatedConfig = App.validate(config);

      // Ensure validators were applied in order
      expect(validator1).toHaveBeenCalledWith(config);
      expect(validator2).toHaveBeenCalledWith({ ...config, step1: true });
      expect(validatedConfig).toEqual({
        initial: true,
        step1: true,
        step2: true,
      });
    });

    test('should throw ConfigError if validators are not properly registered', () => {
      App.validators = null; // Invalid state for validators

      const config = { initial: true };
      expect(() => App.validate(config)).toThrow(ConfigError);
      expect(() => App.validate(config)).toThrow('Invalid validators: null');
    });

    test('should throw ConfigError if any validator throws an error', () => {
      const validator1 = jest.fn((config) => ({ ...config, step1: true }));
      const validator2 = jest.fn(() => {
        throw new Error('Validation failed');
      });

      App.register(validator1);
      App.register(validator2);

      const config = { initial: true };
      expect(() => App.validate(config)).toThrow('Validation failed');
    });
  });

  describe('load', () => {
    test('should return cached config if already loaded', async () => {
      const mockConfig = { key: 'cached' };
      App.config = mockConfig;

      expect(await App.load()).toEqual(mockConfig);
    });

    test('should load JS config successfully', async () => {
      const file = 'config.js';
      const root = 'root';
      const mockConfig = { key: 'value' };
      App.file = file;

      App.resolve = jest.fn().mockResolvedValue(root);
      jest.doMock(join(root, file), () => mockConfig, { virtual: true });

      expect(await App.load()).toEqual(mockConfig);
    });

    test('should load JSON config successfully', async () => {
      const mockConfig = { key: 'value' };
      App.file = 'config.json';

      App.resolve = jest.fn().mockResolvedValue('root');
      jest
        .spyOn(fs.promises, 'readFile')
        .mockResolvedValue(JSON.stringify(mockConfig));

      expect(await App.load()).toEqual(mockConfig);
    });

    test('should reject with ConfigError if file extension is unsupported', async () => {
      const mockPath = 'config.txt';
      App.file = mockPath;

      await expect(() => App.load()).rejects.toThrow(ConfigError);
      await expect(() => App.load()).rejects.toThrow(
        'Unsupported config file extension: .txt'
      );
    });
  });

  describe('loadSync', () => {
    test('should return cached config if already loaded', () => {
      const mockConfig = { key: 'cached' };
      App.config = mockConfig;

      expect(App.loadSync()).toEqual(mockConfig);
    });

    test('should load JS config successfully', () => {
      const file = 'config.js';
      const root = 'root';
      const mockConfig = { key: 'value' };
      App.file = file;

      App.resolveSync = jest.fn().mockReturnValue(root);
      jest.doMock(join(root, file), () => mockConfig, { virtual: true });

      expect(App.loadSync()).toEqual(mockConfig);
    });

    test('should load JSON config successfully', () => {
      const mockConfig = { key: 'value' };
      App.file = 'config.json';

      App.resolveSync = jest.fn().mockReturnValue('root');
      jest
        .spyOn(fs, 'readFileSync')
        .mockReturnValue(JSON.stringify(mockConfig));

      expect(App.loadSync()).toEqual(mockConfig);
    });

    test('should throw ConfigError if file extension is unsupported', () => {
      const mockPath = 'config.txt';
      App.file = mockPath;

      expect(() => App.loadSync()).toThrow(ConfigError);
      expect(() => App.loadSync()).toThrow(
        'Unsupported config file extension: .txt'
      );
    });
  });

  describe('reload', () => {
    test('should reset and execute load again', async () => {
      jest.spyOn(Config, 'load').mockResolvedValue({ key: 'value 1' });
      App.config = { key: 'value 2' };

      expect(await App.reload()).toEqual({ key: 'value 1' });
      expect(App.load).toHaveBeenCalled();
    });
  });

  describe('reloadSync', () => {
    test('should reset and execute loadSync again', () => {
      jest.spyOn(Config, 'loadSync').mockReturnValue({ key: 'value 1' });
      App.config = { key: 'value 2' };

      expect(App.reloadSync()).toEqual({ key: 'value 1' });
      expect(App.loadSync).toHaveBeenCalled();
    });
  });
});
