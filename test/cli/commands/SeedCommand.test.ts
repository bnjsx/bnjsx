import { SeederHandler } from '../../../src/cli/handlers/SeederHandler';
import { SeedCommand } from '../../../src/cli/commands/SeedCommand';
import { CommandError } from '../../../src/cli/Command';

import { config as loader } from '../../../src/config';
import { Cluster } from '../../../src/core';
import { join, resolve } from 'path';

const con = {
  id: Symbol('PoolConnection'),
} as any;

loader().resolveSync = jest.fn(() => '/root/project');

describe('SeedCommand', () => {
  describe('path', () => {
    it('should resolve when TypeScript is disabled', () => {
      const config = {
        cluster: new Cluster(),
        default: 'main',
        typescript: {
          enabled: false, // disabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          seeders: 'seeders', // relative
        },
      };

      expect(SeedCommand['path'](config)).toBe(
        resolve('/root/project', 'seeders')
      );

      config.paths.seeders = '/absolute/path/seeders'; // absolute
      expect(SeedCommand['path'](config)).toBe('/absolute/path/seeders');
    });

    it('should resolve when TypeScript is enabled and seeders path is relative', () => {
      const config = {
        cluster: new Cluster(),
        default: 'main',
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          seeders: 'seeders', // relative
        },
      };

      expect(SeedCommand['path'](config)).toBe(
        resolve('/root/project', 'dist', 'seeders')
      );
    });

    it('should resolve when TypeScript is enabled and dist is absolute', () => {
      const config = {
        cluster: new Cluster(),
        default: 'main',
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: '/absolute/dist',
        },
        paths: {
          seeders: 'seeders', // relative
        },
      };

      expect(SeedCommand['path'](config)).toBe(
        join('/absolute/dist', 'seeders')
      );
    });

    it('should reject if seeders path is absolute and TypeScript is enabled', () => {
      const config = {
        cluster: new Cluster(),
        default: 'main',
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          seeders: '/absolute/path/seeders', // absolute
        },
      };

      expect(() => SeedCommand['path'](config)).toThrow(
        new CommandError(
          'paths.seeders cannot be absolute if typescript is enabled'
        )
      );
    });
  });

  describe('exec', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve with a success message', async () => {
      const path = '/resolved/path/seeders';
      const message = 'Command executed successfully';
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      // Mock dependencies
      jest.spyOn(SeedCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(SeedCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(Cluster.prototype, 'request').mockResolvedValue(con);
      jest.spyOn(SeederHandler.prototype, 'seed').mockResolvedValue(message);
      jest.spyOn(SeedCommand, 'success').mockReturnValue(undefined);

      // Execute the method
      const result = await SeedCommand.exec();

      // Assertions
      expect(result).toBeUndefined();
      expect((SeedCommand as any).argument).toHaveBeenCalledWith('table');
      expect(loader().load).toHaveBeenCalledWith();
      expect((SeedCommand as any).path).toHaveBeenCalledWith(config);
      expect(loader().exist).toHaveBeenCalledWith(path);
      expect(config.cluster.request).toHaveBeenCalledWith(undefined);
      expect(SeederHandler.prototype.seed).toHaveBeenCalledWith(path, 'table');
      expect(SeedCommand.success).toHaveBeenCalledWith(message);
    });

    it('should reject if argument fails', async () => {
      const error = new Error('Ops');

      // Mock dependencies
      jest.spyOn(SeedCommand as any, 'argument').mockImplementation(() => {
        throw error;
      });

      await expect(SeedCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if load fails', async () => {
      const error = new Error('Ops');

      // Mock dependencies
      jest.spyOn(SeedCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockRejectedValue(error);

      await expect(SeedCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if path fails', async () => {
      const error = new Error('Ops');
      const config = { typescript: { enabled: true } };

      // Mock dependencies
      jest.spyOn(SeedCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(SeedCommand as any, 'path').mockImplementation(() => {
        throw error;
      });

      await expect(SeedCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if exist fails', async () => {
      const path = '/resolved/path/seeders';
      const error = new Error('Ops');
      const config = { typescript: { enabled: true } };

      // Mock dependencies
      jest.spyOn(SeedCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(SeedCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'exist').mockRejectedValue(error);

      await expect(SeedCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if request fails', async () => {
      const path = '/resolved/path/seeders';
      const error = new Error('Ops');
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      // Mock dependencies
      jest.spyOn(SeedCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(SeedCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(Cluster.prototype, 'request').mockRejectedValue(error);

      await expect(SeedCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if seed fails', async () => {
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };
      const path = '/resolved/path/seeders';
      const error = new Error('Ops');

      // Mock dependencies
      jest.spyOn(SeedCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(SeedCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(Cluster.prototype, 'request').mockResolvedValue(con);
      jest.spyOn(SeederHandler.prototype, 'seed').mockRejectedValue(error);

      await expect(SeedCommand.exec()).rejects.toThrow(error);
    });
  });
});
