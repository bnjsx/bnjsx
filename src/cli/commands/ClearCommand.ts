import { SeederHandler } from '../handlers/SeederHandler';
import { Builder } from '../../core';
import { Command, CommandError } from '../Command';
import { AppOptions, config as loader } from '../../config';
import { isAbsolute, join, resolve as resolver } from 'path';

/**
 * Represents a command to clear tables using seeder files.
 *
 * The command performs the following actions:
 * - Resolves the path to the seeders folder based on the configuration.
 * - Clears all tables associated with seeder files by default.
 * - Optionally allows specifying a single table to clear instead of all tables.
 *
 * This ensures that seeded data can be efficiently removed while providing flexibility
 * to target specific tables or clear all tables if needed.
 *
 * @extends Command
 */
export class ClearCommand extends Command {
  protected static syntax: string = '<? table>';

  /**
   * Resolves the appropriate path for the seeders folder based on the configuration.
   *
   * @param config The MegaORM configuration object.
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
   * Executes the command to clear seeded data from tables.
   *
   * The command clears all tables associated with seeder files by default.
   * If a specific table is provided as an argument, only that table will be cleared.
   *
   * @returns A promise that resolves when the table(s) have been successfully cleared
   * or rejects with an error if the clearing operation fails.
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
            .then((handler) => handler.clear(p, t as string | undefined))
            .then((message) => resolve(this.success(message)))
            .catch(reject);
        })
        .catch(reject);
    });
  }
}
