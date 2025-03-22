import { AddSeederCommand } from '../../../src/cli/commands/AddSeederCommand';
import { SeederHandler } from '../../../src/cli/handlers/SeederHandler';
import { CommandError } from '../../../src/cli/Command';

import { config as loader } from '../../../src/config';
import { Cluster } from '../../../src/core';
import { join, resolve } from 'path';

const con = {
  id: Symbol('PoolConnection'),
} as any;

loader().resolveSync = jest.fn(() => '/root/project');

describe('AddSeederCommand', () => {
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

      expect(AddSeederCommand['path'](config)).toBe(
        resolve('/root/project', 'seeders')
      );

      config.paths.seeders = '/absolute/path/seeders'; // absolute
      expect(AddSeederCommand['path'](config)).toBe('/absolute/path/seeders');
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

      expect(AddSeederCommand['path'](config)).toBe(
        resolve('/root/project', 'src', 'seeders')
      );
    });

    it('should resolve when TypeScript is enabled and src is absolute', () => {
      const config = {
        cluster: new Cluster(),
        default: 'main',
        typescript: {
          enabled: true, // enabled
          src: '/absolute/src',
          dist: 'dist',
        },
        paths: {
          seeders: 'seeders', // relative
        },
      };

      expect(AddSeederCommand['path'](config)).toBe(
        join('/absolute/src', 'seeders')
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

      expect(() => AddSeederCommand['path'](config)).toThrow(
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
      const path = '/resolved/path';
      const message = 'Command executed successfully';
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      // Mock dependencies
      jest.spyOn(AddSeederCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(AddSeederCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(Cluster.prototype, 'request').mockResolvedValue(con);
      jest.spyOn(SeederHandler.prototype, 'add').mockResolvedValue(message);
      jest.spyOn(AddSeederCommand, 'success').mockReturnValue(undefined);

      // Execute the method
      const result = await AddSeederCommand.exec();

      // Assertions
      expect(result).toBeUndefined();
      expect((AddSeederCommand as any).argument).toHaveBeenCalledWith('table');
      expect(loader().load).toHaveBeenCalledWith();
      expect((AddSeederCommand as any).path).toHaveBeenCalledWith(config);
      expect(loader().mkdir).toHaveBeenCalledWith(path);
      expect(config.cluster.request).toHaveBeenCalledWith(undefined);
      expect(SeederHandler.prototype.add).toHaveBeenCalledWith(
        'table',
        path,
        true
      );
      expect(AddSeederCommand.success).toHaveBeenCalledWith(message);
    });

    it('should reject if argument fails', async () => {
      const error = new Error('Ops');

      // Mock dependencies
      jest.spyOn(AddSeederCommand as any, 'argument').mockImplementation(() => {
        throw error;
      });

      await expect(AddSeederCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if load fails', async () => {
      const error = new Error('Ops');

      // Mock dependencies
      jest.spyOn(AddSeederCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockRejectedValue(error);

      await expect(AddSeederCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if path fails', async () => {
      const error = new Error('Ops');
      const config = { typescript: { enabled: true } };

      // Mock dependencies
      jest.spyOn(AddSeederCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(AddSeederCommand as any, 'path').mockImplementation(() => {
        throw error;
      });

      await expect(AddSeederCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if mkdir fails', async () => {
      const path = '/resolved/path';
      const error = new Error('Ops');
      const config = { typescript: { enabled: true } };

      // Mock dependencies
      jest.spyOn(AddSeederCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(AddSeederCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'mkdir').mockRejectedValue(error);

      await expect(AddSeederCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if request fails', async () => {
      const path = '/resolved/path';
      const error = new Error('Ops');
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      // Mock dependencies
      jest.spyOn(AddSeederCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(AddSeederCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(Cluster.prototype, 'request').mockRejectedValue(error);

      await expect(AddSeederCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if add fails', async () => {
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };
      const path = '/resolved/path';
      const error = new Error('Ops');

      // Mock dependencies
      jest.spyOn(AddSeederCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(AddSeederCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(Cluster.prototype, 'request').mockResolvedValue(con);
      jest.spyOn(SeederHandler.prototype, 'add').mockRejectedValue(error);

      await expect(AddSeederCommand.exec()).rejects.toThrow(error);
    });
  });
});
