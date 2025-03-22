import { RemoveModelCommand } from '../../../src/cli/commands/RemoveModelCommand';
import { ModelHandler } from '../../../src/cli/handlers/ModelHandler';
import { CommandError } from '../../../src/cli/Command';

import { config as loader } from '../../../src/config';
import { join, resolve } from 'path';

loader().resolveSync = jest.fn(() => '/root/project');

describe('RemoveModelCommand', () => {
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
          models: 'models', // relative
        },
      };

      expect(RemoveModelCommand['paths'](config)).toEqual([
        resolve('/root/project', 'models'),
      ]);

      config.paths.models = '/absolute/path/models'; // absolute
      expect(RemoveModelCommand['paths'](config)).toEqual([
        '/absolute/path/models',
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
          models: 'models', // relative
        },
      };

      expect(RemoveModelCommand['paths'](config)).toEqual([
        resolve('/root/project', 'src', 'models'),
        resolve('/root/project', 'dist', 'models'),
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
          models: 'models', // relative
        },
      };

      expect(RemoveModelCommand['paths'](config)).toEqual([
        join('/absolute/src', 'models'),
        join('/absolute/dist', 'models'),
      ]);
    });

    it('should throw an error if models path is absolute and TypeScript is enabled', () => {
      const config: any = {
        typescript: {
          enabled: true, // enabled
          src: 'src',
          dist: 'dist',
        },
        paths: {
          models: '/absolute/path/models', // absolute
        },
      };

      expect(() => RemoveModelCommand['paths'](config)).toThrow(
        new CommandError(
          'paths.models cannot be absolute if typescript is enabled'
        )
      );
    });
  });

  describe('exec', () => {
    it('should resolve with success messages when model files are removed', async () => {
      const config: any = {
        typescript: {
          enabled: true,
          src: 'src',
          dist: 'dist',
        },
        paths: {
          commands: 'commands',
        },
      };

      const paths = [
        resolve('/root/project', 'src', 'commands'),
        resolve('/root/project', 'dist', 'commands'),
      ];

      jest
        .spyOn(RemoveModelCommand as any, 'argument')
        .mockReturnValue('table');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveModelCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(ModelHandler.prototype, 'remove').mockResolvedValue('message');
      jest.spyOn(RemoveModelCommand, 'success').mockReturnValue(undefined);

      await RemoveModelCommand.exec();

      expect(ModelHandler.prototype.remove).toHaveBeenCalledTimes(2);
      expect(ModelHandler.prototype.remove).toHaveBeenNthCalledWith(
        1,
        'table',
        paths[0]
      );
      expect(ModelHandler.prototype.remove).toHaveBeenNthCalledWith(
        2,
        'table',
        paths[1]
      );
    });

    it('should reject if argument fails', async () => {
      const error = new Error('Ops');

      jest
        .spyOn(RemoveModelCommand as any, 'argument')
        .mockImplementation(() => {
          throw error;
        });

      await expect(RemoveModelCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if load fails', async () => {
      const error = new Error('Ops');

      jest.spyOn(RemoveModelCommand as any, 'argument').mockReturnValue('name');
      jest.spyOn(loader(), 'load').mockRejectedValue(error);

      await expect(RemoveModelCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if paths fails', async () => {
      const config: any = { typescript: { enabled: true } };
      const error = new Error('Ops');

      jest.spyOn(RemoveModelCommand as any, 'argument').mockReturnValue('name');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveModelCommand as any, 'paths').mockImplementation(() => {
        throw error;
      });

      await expect(RemoveModelCommand.exec()).rejects.toThrow(error);
    });

    it('should resolve if exist fails', async () => {
      const config: any = { typescript: { enabled: true } };
      const paths = ['/resolved/path/commands'];
      const error = new Error('Ops');

      jest.spyOn(RemoveModelCommand as any, 'argument').mockReturnValue('name');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveModelCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockRejectedValue(error);

      await expect(RemoveModelCommand.exec()).resolves.toEqual([undefined]);
    });

    it('should reject if remove fails', async () => {
      const config: any = { typescript: { enabled: true } };
      const paths = ['/resolved/path/commands'];
      const error = new Error('Ops');

      jest.spyOn(RemoveModelCommand as any, 'argument').mockReturnValue('name');
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(RemoveModelCommand as any, 'paths').mockReturnValue(paths);
      jest.spyOn(loader(), 'exist').mockResolvedValue(undefined);
      jest.spyOn(ModelHandler.prototype, 'remove').mockRejectedValue(error);

      await expect(RemoveModelCommand.exec()).rejects.toThrow(error);
    });
  });
});
