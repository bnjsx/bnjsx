import { RemoveSeederCommand } from '../../../src/cli/commands/RemoveSeederCommand';
import { SeederHandler } from '../../../src/cli/handlers/SeederHandler';
import { CommandError } from '../../../src/cli/Command';

import { config as loader } from '../../../src/config';
import { Cluster } from '../../../src/core';
import { join, resolve } from 'path';

loader().resolveSync = jest.fn(() => '/root/project');

const con = {
  id: Symbol('PoolConnection'),
} as any;

describe('RemoveSeederCommand', () => {
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
          seeders: 'seeders', // relative
        },
      };

      expect(RemoveSeederCommand['paths'](config)).toEqual([
        resolve('/root/project', 'seeders'),
      ]);

      config.paths.seeders = '/absolute/path/seeders'; // absolute
      expect(RemoveSeederCommand['paths'](config)).toEqual([
        '/absolute/path/seeders',
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
          seeders: 'seeders', // relative
        },
      };

      expect(RemoveSeederCommand['paths'](config)).toEqual([
        resolve('/root/project', 'src', 'seeders'),
        resolve('/root/project', 'dist', 'seeders'),
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
          seeders: 'seeders', // relative
        },
      };

      expect(RemoveSeederCommand['paths'](config)).toEqual([
        join('/absolute/src', 'seeders'),
        join('/absolute/dist', 'seeders'),
      ]);
    });

    it('should throw an error if seeders path is absolute and TypeScript is enabled', () => {
      const config: any = {
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          seeders: '/absolute/path/seeders', // absolute
        },
      };

      expect(() => RemoveSeederCommand['paths'](config)).toThrow(
        new CommandError(
          'paths.seeders cannot be absolute if typescript is enabled'
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

      const config: any = { cluster: new Cluster() };

      jest.spyOn(config.cluster, 'request').mockResolvedValue(con);
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveSeederCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);

      jest
        .spyOn(RemoveSeederCommand as any, 'argument')
        .mockReturnValue('table');

      jest
        .spyOn(SeederHandler.prototype, 'remove')
        .mockResolvedValue('message');
      jest.spyOn(RemoveSeederCommand, 'success').mockReturnValue(undefined);

      await RemoveSeederCommand.exec();

      expect(SeederHandler.prototype.remove).toHaveBeenCalledTimes(2);
      expect(SeederHandler.prototype.remove).toHaveBeenNthCalledWith(
        1,
        'table',
        paths[0]
      );
      expect(SeederHandler.prototype.remove).toHaveBeenNthCalledWith(
        2,
        'table',
        paths[1]
      );
    });

    it('should reject if argument fails', async () => {
      const error = new Error('Ops');

      jest
        .spyOn(RemoveSeederCommand as any, 'argument')
        .mockImplementation(() => {
          throw error;
        });

      await expect(RemoveSeederCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if load fails', async () => {
      const error = new Error('Ops');

      jest
        .spyOn(RemoveSeederCommand as any, 'argument')
        .mockReturnValue('name');
      jest.spyOn(loader(), 'load').mockRejectedValue(error);

      await expect(RemoveSeederCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if paths fails', async () => {
      const error = new Error('Ops');
      const config: any = { cluster: new Cluster() };

      jest
        .spyOn(RemoveSeederCommand as any, 'argument')
        .mockReturnValue('name');

      jest.spyOn(config.cluster, 'request').mockResolvedValue(con);
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveSeederCommand as any, 'paths').mockImplementation(() => {
        throw error;
      });

      await expect(RemoveSeederCommand.exec()).rejects.toThrow(error);
    });

    it('should resolve if exist fails', async () => {
      const paths = ['/resolved/path/commands'];
      const error = new Error('Ops');

      const config: any = { cluster: new Cluster() };
      jest.spyOn(config.cluster, 'request').mockResolvedValue(con);

      jest
        .spyOn(RemoveSeederCommand as any, 'argument')
        .mockReturnValue('name');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveSeederCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockRejectedValue(error);

      await expect(RemoveSeederCommand.exec()).resolves.toEqual([undefined]);
    });

    it('should reject if request fails', async () => {
      const paths = ['/resolved/path/commands'];
      const error = new Error('Ops');

      const config: any = { cluster: new Cluster() };

      jest
        .spyOn(RemoveSeederCommand as any, 'argument')
        .mockReturnValue('name');

      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveSeederCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(config.cluster, 'request').mockRejectedValue(error);

      await expect(RemoveSeederCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if remove fails', async () => {
      const paths = ['/resolved/path/commands'];
      const error = new Error('Ops');
      const config: any = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      jest
        .spyOn(RemoveSeederCommand as any, 'argument')
        .mockReturnValue('name');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveSeederCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(config.cluster, 'request').mockResolvedValue(con);
      jest.spyOn(SeederHandler.prototype, 'remove').mockRejectedValue(error);

      await expect(RemoveSeederCommand.exec()).rejects.toThrow(error);
    });
  });
});
