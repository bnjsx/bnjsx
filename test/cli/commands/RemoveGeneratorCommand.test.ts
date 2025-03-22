import { RemoveGeneratorCommand } from '../../../src/cli/commands/RemoveGeneratorCommand';
import { GeneratorHandler } from '../../../src/cli/handlers/GeneratorHandler';
import { CommandError } from '../../../src/cli/Command';

import { config as loader } from '../../../src/config';
import { Cluster } from '../../../src/core';
import { join, resolve } from 'path';

loader().resolveSync = jest.fn(() => '/root/project');

const con = {
  id: Symbol('PoolConnection'),
} as any;

describe('RemoveGeneratorCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  describe('paths', () => {
    it('should resolve paths when TypeScript is disabled', () => {
      const config: any = {
        typescript: {
          enabled: false, // disabled
        },
        paths: {
          generators: 'generators', // relative
        },
      };

      expect(RemoveGeneratorCommand['paths'](config)).toEqual([
        resolve('/root/project', 'generators'),
      ]);

      config.paths.generators = '/absolute/path/generators'; // absolute
      expect(RemoveGeneratorCommand['paths'](config)).toEqual([
        '/absolute/path/generators',
      ]);
    });

    it('should resolve paths when TypeScript is enabled and paths are relative', () => {
      const config: any = {
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          generators: 'generators', // relative
        },
      };

      expect(RemoveGeneratorCommand['paths'](config)).toEqual([
        resolve('/root/project', 'src', 'generators'),
        resolve('/root/project', 'dist', 'generators'),
      ]);
    });

    it('should resolve paths when TypeScript is enabled and src/dist are absolute', () => {
      const config: any = {
        typescript: {
          enabled: true, // enabled
          src: '/absolute/src',
          dist: '/absolute/dist',
        },
        paths: {
          generators: 'generators', // relative
        },
      };

      expect(RemoveGeneratorCommand['paths'](config)).toEqual([
        join('/absolute/src', 'generators'),
        join('/absolute/dist', 'generators'),
      ]);
    });

    it('should throw an error if generators path is absolute and TypeScript is enabled', () => {
      const config: any = {
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          generators: '/absolute/path/generators', // absolute
        },
      };

      expect(() => RemoveGeneratorCommand['paths'](config)).toThrow(
        new CommandError(
          'paths.generators cannot be absolute if typescript is enabled'
        )
      );
    });
  });

  describe('exec', () => {
    it('should resolve with success messages when model files are removed', async () => {
      const paths = [
        resolve('/root/project', 'src', 'commands'),
        resolve('/root/project', 'dist', 'commands'),
      ];

      const config: any = {
        cluster: new Cluster(),
        typescript: {
          enabled: true,
        },
      };

      jest
        .spyOn(RemoveGeneratorCommand as any, 'argument')
        .mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveGeneratorCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(config.cluster, 'request').mockResolvedValue(con);
      jest
        .spyOn(GeneratorHandler.prototype, 'remove')
        .mockResolvedValue('message');
      jest.spyOn(RemoveGeneratorCommand, 'success').mockReturnValue(undefined);

      await RemoveGeneratorCommand.exec();

      expect(GeneratorHandler.prototype.remove).toHaveBeenCalledTimes(2);
      expect(GeneratorHandler.prototype.remove).toHaveBeenNthCalledWith(
        1,
        'table',
        paths[0]
      );
      expect(GeneratorHandler.prototype.remove).toHaveBeenNthCalledWith(
        2,
        'table',
        paths[1]
      );
    });

    it('should reject if argument fails', async () => {
      const error = new Error('Ops');

      jest
        .spyOn(RemoveGeneratorCommand as any, 'argument')
        .mockImplementation(() => {
          throw error;
        });

      await expect(RemoveGeneratorCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if load fails', async () => {
      const error = new Error('Ops');

      jest
        .spyOn(RemoveGeneratorCommand as any, 'argument')
        .mockReturnValue('name');
      jest.spyOn(loader(), 'load').mockRejectedValue(error);

      await expect(RemoveGeneratorCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if paths fails', async () => {
      const error = new Error('Ops');
      const config: any = { cluster: new Cluster() };

      jest
        .spyOn(RemoveGeneratorCommand as any, 'argument')
        .mockReturnValue('name');

      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(config.cluster, 'request').mockResolvedValue(con);

      jest
        .spyOn(RemoveGeneratorCommand as any, 'paths')
        .mockImplementation(() => {
          throw error;
        });

      await expect(RemoveGeneratorCommand.exec()).rejects.toThrow(error);
    });

    it('should resolve if exist fails', async () => {
      const paths = ['/resolved/path/commands'];
      const error = new Error('Ops');
      const config: any = { cluster: new Cluster() };

      jest
        .spyOn(RemoveGeneratorCommand as any, 'argument')
        .mockReturnValue('name');

      jest.spyOn(config.cluster, 'request').mockResolvedValue(con);
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveGeneratorCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockRejectedValue(error);

      await expect(RemoveGeneratorCommand.exec()).resolves.toEqual([undefined]);
    });

    it('should reject if request fails', async () => {
      const paths = ['/resolved/path/commands'];
      const error = new Error('Ops');
      const config: any = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      jest
        .spyOn(RemoveGeneratorCommand as any, 'argument')
        .mockReturnValue('name');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveGeneratorCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(config.cluster, 'request').mockRejectedValue(error);

      await expect(RemoveGeneratorCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if remove fails', async () => {
      const paths = ['/resolved/path/commands'];
      const error = new Error('Ops');
      const config: any = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      jest
        .spyOn(RemoveGeneratorCommand as any, 'argument')
        .mockReturnValue('name');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveGeneratorCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(config.cluster, 'request').mockResolvedValue(con);
      jest.spyOn(GeneratorHandler.prototype, 'remove').mockRejectedValue(error);

      await expect(RemoveGeneratorCommand.exec()).rejects.toThrow(error);
    });
  });
});
