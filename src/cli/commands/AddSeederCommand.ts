import { SeederHandler } from '../handlers/SeederHandler';
import { Builder } from '../../core';
import { Command, CommandError } from '../Command';
import { AppOptions, config as loader } from '../../config';
import { isAbsolute, join, resolve as resolver } from 'path';

/**
 * Represents a command to add a seeder file to a specific folder in the project
 * based on MegaORM configuration.
 *
 * @extends Command
 */
export class AddSeederCommand extends Command {
  protected static syntax: string = '<! table>';

  /**
   * Resolves the appropriate path for adding a seeder file based on the configuration.
   *
   * @param config The MegaORM configuration object.
   * @returns The resolved path for the seeder file.
   * @throws `CommandError` if `paths.seeders` is absolute and TypeScript is enabled.
   */
  private static path(config: AppOptions): string {
    if (config.typescript.enabled === true) {
      // Cannot be absolute
      if (isAbsolute(config.paths.seeders)) {
        throw new CommandError(
          `paths.seeders cannot be absolute if typescript is enabled`
        );
      }

      if (isAbsolute(config.typescript.src)) {
        return join(config.typescript.src, config.paths.seeders);
      }

      return resolver(
        loader().resolveSync(),
        config.typescript.src,
        config.paths.seeders
      );
    }

    if (isAbsolute(config.paths.seeders)) {
      return config.paths.seeders;
    }

    return resolver(loader().resolveSync(), config.paths.seeders);
  }

  /**
   * Executes the command to add a seeder.
   *
   * @returns A promise that resolves when the seeder has been added successfully or rejects with an error.
   */
  public static exec(): Promise<void> {
    return new Promise((resolve, reject) => {
      const t = this.argument('table') as string;

      loader()
        .load()
        .then((config: AppOptions) => {
          const p = this.path(config);
          const ts = config.typescript.enabled;

          loader()
            .mkdir(p)
            .then(() => config.cluster.request(config.default))
            .then((con) => Promise.resolve(new Builder(con)))
            .then((builder) => Promise.resolve(new SeederHandler(builder)))
            .then((handler) => handler.add(t, p, ts))
            .then((message) => resolve(this.success(message)))
            .catch(reject);
        })
        .catch(reject);
    });
  }
}
