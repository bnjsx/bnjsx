import { CommandHandler } from '../handlers/CommandHandler';
import { Command, CommandError } from '../Command';
import { AppOptions, config as loader } from '../../config';
import { isAbsolute, join, resolve as resolver } from 'path';

/**
 * Represents a command to add a command file to a specific folder in the project
 * based on MegaORM configuration.
 *
 * @extends Command
 */
export class AddCommandCommand extends Command {
  protected static syntax: string = '<! name>';

  /**
   * Resolves the appropriate path for adding a command file based on the configuration.
   *
   * @param config The MegaORM configuration object.
   * @returns The resolved path for the command file.
   * @throws `CommandError` if `paths.commands` is absolute and TypeScript is enabled.
   */
  private static path(config: AppOptions): string {
    if (config.typescript.enabled === true) {
      // Cannot be absolute
      if (isAbsolute(config.paths.commands)) {
        throw new CommandError(
          `paths.commands cannot be absolute if typescript is enabled`
        );
      }

      if (isAbsolute(config.typescript.src)) {
        return join(config.typescript.src, config.paths.commands);
      }

      return resolver(
        loader().resolveSync(),
        config.typescript.src,
        config.paths.commands
      );
    }

    if (isAbsolute(config.paths.commands)) {
      return config.paths.commands;
    }

    return resolver(loader().resolveSync(), config.paths.commands);
  }

  /**
   * Executes the command to add a command.
   *
   * @returns A promise that resolves when the command has been added successfully or rejects with an error.
   */
  public static exec(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Command name
      const n = this.argument('name') as string;

      loader()
        .load()
        .then((config: AppOptions) => {
          const p = this.path(config);
          const ts = config.typescript.enabled;

          loader()
            .mkdir(p)
            .then(() => new CommandHandler().add(n, p, ts))
            .then((message) => resolve(this.success(message)))
            .catch(reject);
        })
        .catch(reject);
    });
  }
}
