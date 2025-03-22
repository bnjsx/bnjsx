import { RemoveCommandCommand } from '../../../src/cli/commands/RemoveCommandCommand';
import { CommandHandler } from '../../../src/cli/handlers/CommandHandler';
import { CommandError } from '../../../src/cli/Command';

import { config as loader } from '../../../src/config';
import { join, resolve } from 'path';

loader().resolveSync = jest.fn(() => '/root/project');

describe('RemoveCommandCommand', () => {
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
          commands: 'commands', // relative
        },
      };

      expect(RemoveCommandCommand['paths'](config)).toEqual([
        resolve('/root/project', 'commands'),
      ]);

      config.paths.commands = '/absolute/path/commands'; // absolute
      expect(RemoveCommandCommand['paths'](config)).toEqual([
        '/absolute/path/commands',
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
          commands: 'commands', // relative
        },
      };

      expect(RemoveCommandCommand['paths'](config)).toEqual([
        resolve('/root/project', 'src', 'commands'),
        resolve('/root/project', 'dist', 'commands'),
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
          commands: 'commands', // relative
        },
      };

      expect(RemoveCommandCommand['paths'](config)).toEqual([
        join('/absolute/src', 'commands'),
        join('/absolute/dist', 'commands'),
      ]);
    });

    it('should throw an error if commands path is absolute and TypeScript is enabled', () => {
      const config: any = {
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          commands: '/absolute/path/commands', // absolute
        },
      };

      expect(() => RemoveCommandCommand['paths'](config)).toThrow(
        new CommandError(
          'paths.commands cannot be absolute if typescript is enabled'
        )
      );
    });
  });

  describe('exec', () => {
    it('should resolve with success messages when files are removed', async () => {
      const paths = [
        resolve('/root/project', 'src', 'commands'),
        resolve('/root/project', 'dist', 'commands'),
      ];

      jest
        .spyOn(RemoveCommandCommand as any, 'argument')
        .mockReturnValue('FileName');
      jest
        .spyOn(CommandHandler.prototype, 'remove')
        .mockResolvedValue('message');

      jest.spyOn(loader(), 'load').mockResolvedValue({});
      jest.spyOn(RemoveCommandCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(RemoveCommandCommand, 'success').mockReturnValue(undefined);

      await RemoveCommandCommand.exec();

      expect(CommandHandler.prototype.remove).toHaveBeenCalledTimes(2);
      expect(CommandHandler.prototype.remove).toHaveBeenNthCalledWith(
        1,
        'FileName',
        paths[0]
      );
      expect(CommandHandler.prototype.remove).toHaveBeenNthCalledWith(
        2,
        'FileName',
        paths[1]
      );
    });

    it('should reject if argument fails', async () => {
      const error = new Error('Ops');

      jest
        .spyOn(RemoveCommandCommand as any, 'argument')
        .mockImplementation(() => {
          throw error;
        });

      await expect(RemoveCommandCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if load fails', async () => {
      const error = new Error('Ops');

      jest
        .spyOn(RemoveCommandCommand as any, 'argument')
        .mockReturnValue('FileName');
      jest.spyOn(loader(), 'load').mockRejectedValue(error);

      await expect(RemoveCommandCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if paths fails', async () => {
      const error = new Error('Ops');

      jest
        .spyOn(RemoveCommandCommand as any, 'argument')
        .mockReturnValue('FileName');

      jest
        .spyOn(RemoveCommandCommand as any, 'paths')
        .mockImplementation(() => {
          throw error;
        });

      jest.spyOn(loader(), 'load').mockResolvedValue({});

      await expect(RemoveCommandCommand.exec()).rejects.toThrow(error);
    });

    it('should resolve if exist fails', async () => {
      const error = new Error('Ops');

      jest
        .spyOn(RemoveCommandCommand as any, 'argument')
        .mockReturnValue('FileName');

      jest
        .spyOn(RemoveCommandCommand as any, 'paths')
        .mockReturnValue(['path']);

      jest.spyOn(loader(), 'load').mockResolvedValue({});
      jest.spyOn(loader(), 'exist').mockRejectedValue(error);

      await expect(RemoveCommandCommand.exec()).resolves.toEqual([undefined]);
    });

    it('should reject if remove fails', async () => {
      const paths = ['/resolved/path/commands'];
      const error = new Error('Ops');

      jest
        .spyOn(RemoveCommandCommand as any, 'argument')
        .mockReturnValue('FileName');

      jest.spyOn(loader(), 'load').mockResolvedValue({});
      jest.spyOn(RemoveCommandCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(CommandHandler.prototype, 'remove').mockRejectedValue(error);

      await expect(RemoveCommandCommand.exec()).rejects.toThrow(error);
    });
  });
});
