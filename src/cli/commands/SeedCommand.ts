import { SeederHandler } from '../handlers/SeederHandler';
import { Builder } from '../../core';
import { Command, CommandError } from '../Command';
import { AppOptions, config as loader } from '../../config';
import { isAbsolute, join, resolve as resolver } from 'path';

/**
 * Represents a command to execute all seeder files in the project's seeders folder in order.
 *
 * The command performs the following actions:
 * - Resolves the path to the seeders folder based on the configuration.
 * - Identifies all seeder files in the folder.
 * - Executes each seeder file in the correct order to populate tables with data.
 *
 * This ensures that the seeding process is orderly and consistent, allowing for the initialization
 * or population of database tables as defined by the seeder files.
 *
 * @extends Command
 */
export class SeedCommand extends Command {
  protected static syntax: string = '<? table>';

  /**
   * Resolves the appropriate path for the seeders folder based on the configuration.
   *
   * @param config The configuration object.
   * @returns The resolved path for the seeders folder.
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

      if (isAbsolute(config.typescript.dist)) {
        return join(config.typescript.dist, config.paths.seeders);
      }

      return resolver(
        loader().resolveSync(),
        config.typescript.dist,
        config.paths.seeders
      );
    }

    if (isAbsolute(config.paths.seeders)) {
      return config.paths.seeders;
    }

    return resolver(loader().resolveSync(), config.paths.seeders);
  }

  /**
   * Executes the command to process and run all seeder files.
   *
   * The command identifies all seeder files in the folder and executes them
   * in the correct order to seed the database tables with data.
   *
   * @returns A promise that resolves when all seeder files have been executed successfully
   * or rejects with an error if any of the seeders fail.
   */
  public static exec() {
    return new Promise((resolve, reject) => {
      const t = this.argument('table');

      loader()
        .load()
        .then((config: AppOptions) => {
          const p = this.path(config);

          loader()
            .exist(p)
            .then(() => config.cluster.request(config.default))
            .then((con) => Promise.resolve(new Builder(con)))
            .then((builder) => Promise.resolve(new SeederHandler(builder)))
            .then((handler) => handler.seed(p, t as string | undefined))
            .then((message) => resolve(this.success(message)))
            .catch(reject);
        })
        .catch(reject);
    });
  }
}
