import { ResetCommand } from '../../../src/cli/commands/ResetCommand';
import { CommandError } from '../../../src/cli/Command';
import { GeneratorHandler } from '../../../src/cli/handlers/GeneratorHandler';

import { config as loader } from '../../../src/config';
import { Cluster } from '../../../src/core';
import { join, resolve } from 'path';

const con = {
  id: Symbol('PoolConnection'),
} as any;

loader().resolveSync = jest.fn(() => '/root/project');

describe('ResetCommand', () => {
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
          generators: 'generators', // relative
        },
      };

      expect(ResetCommand['path'](config)).toBe(
        resolve('/root/project', 'generators')
      );

      config.paths.generators = '/absolute/path/generators'; // absolute
      expect(ResetCommand['path'](config)).toBe('/absolute/path/generators');
    });

    it('should resolve when TypeScript is enabled and generators path is relative', () => {
      const config = {
        cluster: new Cluster(),
        default: 'main',
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          generators: 'generators', // relative
        },
      };

      expect(ResetCommand['path'](config)).toBe(
        resolve('/root/project', 'dist', 'generators')
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
          generators: 'generators', // relative
        },
      };

      expect(ResetCommand['path'](config)).toBe(
        join('/absolute/dist', 'generators')
      );
    });

    it('should reject if generators path is absolute and TypeScript is enabled', () => {
      const config = {
        cluster: new Cluster(),
        default: 'main',
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          generators: '/absolute/path/generators', // absolute
        },
      };

      expect(() => ResetCommand['path'](config)).toThrow(
        new CommandError(
          'paths.generators cannot be absolute if typescript is enabled'
        )
      );
    });
  });

  describe('exec', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve with a success message', async () => {
      const path = '/resolved/path/generators';
      const message = 'Command executed successfully';
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      // Mock dependencies
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(ResetCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(Cluster.prototype, 'request').mockResolvedValue(con);
      jest
        .spyOn(GeneratorHandler.prototype, 'reset')
        .mockResolvedValue(message);
      jest.spyOn(ResetCommand, 'success').mockReturnValue(undefined);

      // Execute the method
      const result = await ResetCommand.exec();

      // Assertions
      expect(result).toBeUndefined();
      expect(loader().load).toHaveBeenCalledWith();
      expect((ResetCommand as any).path).toHaveBeenCalledWith(config);
      expect(loader().exist).toHaveBeenCalledWith(path);
      expect(config.cluster.request).toHaveBeenCalledWith(undefined);
      expect(GeneratorHandler.prototype.reset).toHaveBeenCalledWith(path);
      expect(ResetCommand.success).toHaveBeenCalledWith(message);
    });

    it('should reject if load fails', async () => {
      const error = new Error('Ops');

      // Mock dependencies
      jest.spyOn(ResetCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockRejectedValue(error);

      await expect(ResetCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if path fails', async () => {
      const error = new Error('Ops');
      const config = { typescript: { enabled: true } };

      // Mock dependencies
      jest.spyOn(ResetCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(ResetCommand as any, 'path').mockImplementation(() => {
        throw error;
      });

      await expect(ResetCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if exist fails', async () => {
      const path = '/resolved/path/generators';
      const error = new Error('Ops');
      const config = { typescript: { enabled: true } };

      // Mock dependencies
      jest.spyOn(ResetCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(ResetCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'exist').mockRejectedValue(error);

      await expect(ResetCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if request fails', async () => {
      const path = '/resolved/path/generators';
      const error = new Error('Ops');
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      // Mock dependencies
      jest.spyOn(ResetCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(ResetCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(Cluster.prototype, 'request').mockRejectedValue(error);

      await expect(ResetCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if reset fails', async () => {
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };
      const path = '/resolved/path/generators';
      const error = new Error('Ops');

      // Mock dependencies
      jest.spyOn(ResetCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(ResetCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(Cluster.prototype, 'request').mockResolvedValue(con);
      jest.spyOn(GeneratorHandler.prototype, 'reset').mockRejectedValue(error);

      await expect(ResetCommand.exec()).rejects.toThrow(error);
    });
  });
});
