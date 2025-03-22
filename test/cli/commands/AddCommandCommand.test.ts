import { AddCommandCommand } from '../../../src/cli/commands/AddCommandCommand';
import { CommandHandler } from '../../../src/cli/handlers/CommandHandler';
import { CommandError } from '../../../src/cli/Command';

import { config as loader } from '../../../src/config';
import { Cluster } from '../../../src/core';
import { join, resolve } from 'path';

loader().resolveSync = jest.fn(() => '/root/project');

describe('AddCommandCommand', () => {
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
          commands: 'commands', // relative
        },
      };

      expect(AddCommandCommand['path'](config)).toBe(
        resolve('/root/project', 'commands')
      );

      config.paths.commands = '/absolute/path/commands'; // absolute
      expect(AddCommandCommand['path'](config)).toBe('/absolute/path/commands');
    });

    it('should resolve when TypeScript is enabled and commands path is relative', () => {
      const config = {
        cluster: new Cluster(),
        default: 'main',
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          commands: 'commands', // relative
        },
      };

      expect(AddCommandCommand['path'](config)).toBe(
        resolve('/root/project', 'src', 'commands')
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
          commands: 'commands', // relative
        },
      };

      expect(AddCommandCommand['path'](config)).toBe(
        join('/absolute/src', 'commands')
      );
    });

    it('should reject if commands path is absolute and TypeScript is enabled', () => {
      const config = {
        cluster: new Cluster(),
        default: 'main',
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          commands: '/absolute/path/commands', // absolute
        },
      };

      expect(() => AddCommandCommand['path'](config)).toThrow(
        new CommandError(
          'paths.commands cannot be absolute if typescript is enabled'
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
      jest.spyOn(AddCommandCommand as any, 'argument').mockReturnValue('name');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(AddCommandCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(CommandHandler.prototype, 'add').mockResolvedValue(message);
      jest.spyOn(AddCommandCommand, 'success').mockReturnValue(undefined);

      // Execute the method
      const result = await AddCommandCommand.exec();

      // Assertions
      expect(result).toBeUndefined();
      expect((AddCommandCommand as any).argument).toHaveBeenCalledWith('name');
      expect(loader().load).toHaveBeenCalledWith();
      expect((AddCommandCommand as any).path).toHaveBeenCalledWith(config);
      expect(loader().mkdir).toHaveBeenCalledWith(path);
      expect(CommandHandler.prototype.add).toHaveBeenCalledWith(
        'name',
        path,
        true
      );
      expect(AddCommandCommand.success).toHaveBeenCalledWith(message);
    });

    it('should reject if argument fails', async () => {
      const error = new Error('Ops');

      // Mock dependencies
      jest
        .spyOn(AddCommandCommand as any, 'argument')
        .mockImplementation(() => {
          throw error;
        });

      await expect(AddCommandCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if load fails', async () => {
      const error = new Error('Ops');

      // Mock dependencies
      jest.spyOn(AddCommandCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockRejectedValue(error);

      await expect(AddCommandCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if path fails', async () => {
      const error = new Error('Ops');
      const config = { typescript: { enabled: true } };

      // Mock dependencies
      jest.spyOn(AddCommandCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(AddCommandCommand as any, 'path').mockImplementation(() => {
        throw error;
      });

      await expect(AddCommandCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if mkdir fails', async () => {
      const path = '/resolved/path';
      const error = new Error('Ops');
      const config = { typescript: { enabled: true } };

      // Mock dependencies
      jest.spyOn(AddCommandCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(AddCommandCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'mkdir').mockRejectedValue(error);

      await expect(AddCommandCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if add fails', async () => {
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };
      const path = '/resolved/path';
      const error = new Error('Ops');

      // Mock dependencies
      jest.spyOn(AddCommandCommand as any, 'argument').mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(AddCommandCommand as any, 'path').mockReturnValue(path);
      jest.spyOn(loader(), 'mkdir').mockResolvedValue(undefined);
      jest.spyOn(CommandHandler.prototype, 'add').mockRejectedValue(error);

      await expect(AddCommandCommand.exec()).rejects.toThrow(error);
    });
  });
});
