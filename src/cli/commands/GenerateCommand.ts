import { GeneratorHandler } from '../handlers/GeneratorHandler';
import { Builder } from '../../core';
import { Command, CommandError } from '../Command';
import { AppOptions, config as loader } from '../../config';
import { isAbsolute, join, resolve as resolver } from 'path';

/**
 * Represents a command to execute generator files in the project's generators folder.
 *
 * The command performs the following actions:
 * - Resolves the path to the generators folder based on the configuration.
 * - Identifies generator files that have not been executed yet.
 * - Executes only the new generator files to create tables.
 *
 * This ensures that previously executed generator files are not re-executed, maintaining efficiency
 * and avoiding duplication of database operations.
 *
 * @extends Command
 */
export class GenerateCommand extends Command {
  /**
   * Resolves the appropriate path for the generators folder based on the configuration.
   *
   * @param config The MegaORM configuration object.
   * @returns The resolved path for the generators folder.
   * @throws `CommandError` if `paths.generators` is absolute and TypeScript is enabled.
   */
  private static path(config: AppOptions): string {
    if (config.typescript.enabled === true) {
      // Cannot be absolute
      if (isAbsolute(config.paths.generators)) {
        throw new CommandError(
          `paths.generators cannot be absolute if typescript is enabled`
        );
      }

      if (isAbsolute(config.typescript.dist)) {
        return join(config.typescript.dist, config.paths.generators);
      }

      return resolver(
        loader().resolveSync(),
        config.typescript.dist,
        config.paths.generators
      );
    }

    if (isAbsolute(config.paths.generators)) {
      return config.paths.generators;
    }

    return resolver(loader().resolveSync(), config.paths.generators);
  }

  /**
   * Executes the command to process generator files.
   *
   * The command identifies generator files that have not been executed yet
   * and executes them to create tables as defined in the files.
   *
   * @returns A promise that resolves when the new generator files have been executed successfully
   * or rejects with an error.
   */
  public static exec() {
    return new Promise((resolve, reject) => {
      loader()
        .load()
        .then((config: AppOptions) => {
          const p = this.path(config);

          loader()
            .exist(p)
            .then(() => config.cluster.request(config.default))
            .then((con) => Promise.resolve(new Builder(con)))
            .then((builder) => Promise.resolve(new GeneratorHandler(builder)))
            .then((handler) => handler.generate(p))
            .then((message) => resolve(this.success(message)))
            .catch(reject);
        })
        .catch(reject);
    });
  }
}
