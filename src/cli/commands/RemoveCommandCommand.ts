import { CommandHandler } from '../handlers/CommandHandler';
import { Command, CommandError } from '../Command';
import { AppOptions, config as loader } from '../../config';
import { isAbsolute, join, resolve as resolver } from 'path';
import { ConfigError } from '../../helpers';

/**
 * Represents a command to remove a command file from specific folders in the project
 * based on MegaORM configuration.
 *
 * @extends Command
 */
export class RemoveCommandCommand extends Command {
  protected static syntax: string = '<! name>';

  /**
   * Resolves the appropriate paths for removing command files based on the configuration.
   *
   * @param config The MegaORM configuration object.
   * @returns An array of resolved paths for the command files to be removed.
   * @throws `CommandError` if `paths.commands` is absolute and TypeScript is enabled.
   */
  private static paths(config: AppOptions): Array<string> {
    const paths = [];

    if (config.typescript.enabled === true) {
      // Cannot be absolute
      if (isAbsolute(config.paths.commands)) {
        throw new CommandError(
          `paths.commands cannot be absolute if typescript is enabled`
        );
      }

      if (isAbsolute(config.typescript.src)) {
        paths.push(join(config.typescript.src, config.paths.commands));
      } else {
        paths.push(
          resolver(
            loader().resolveSync(),
            config.typescript.src,
            config.paths.commands
          )
        );
      }

      if (isAbsolute(config.typescript.dist)) {
        paths.push(join(config.typescript.dist, config.paths.commands));
      } else {
        paths.push(
          resolver(
            loader().resolveSync(),
            config.typescript.dist,
            config.paths.commands
          )
        );
      }

      return paths;
    }

    if (isAbsolute(config.paths.commands)) {
      paths.push(config.paths.commands);
      return paths;
    }

    paths.push(resolver(loader().resolveSync(), config.paths.commands));
    return paths;
  }

  /**
   * Removes the command file with the specified name.
   *
   * @returns A promise that resolves when the command files have been successfully removed or rejects with an error.
   */
  public static exec(): Promise<void> {
    return new Promise((resolve, reject) => {
      const filename = this.argument('name') as string;

      loader()
        .load()
        .then((config: AppOptions) => {
          const paths = this.paths(config);
          const handler = new CommandHandler();

          Promise.all(
            paths.map((path) => {
              return new Promise<void>((resolve, reject) => {
                loader()
                  .exist(path)
                  .then(() => {
                    handler
                      .remove(filename, path)
                      .then((message) => resolve(this.success(message)))
                      .catch(reject);
                  })
                  .catch(() => {
                    this.info(`Path not found: ${path}`);
                    resolve();
                  });
              });
            })
          )
            .then(resolve as any)
            .catch(reject);
        })
        .catch(reject);
    });
  }
}
