import { GeneratorHandler } from '../handlers/GeneratorHandler';
import { Builder } from '../../core';
import { Command, CommandError } from '../Command';
import { AppOptions, config as loader } from '../../config';
import { isAbsolute, join, resolve as resolver } from 'path';

/**
 * Represents a command to add a generator file to a specific folder in the project
 * based on MegaORM configuration.
 *
 * @extends Command
 */
export class AddGeneratorCommand extends Command {
  protected static syntax: string = '<! table>';

  /**
   * Resolves the appropriate path for adding a generator file based on the configuration.
   *
   * @param config The MegaORM configuration object.
   * @returns The resolved path for the generator file.
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

      if (isAbsolute(config.typescript.src)) {
        return join(config.typescript.src, config.paths.generators);
      }

      return resolver(
        loader().resolveSync(),
        config.typescript.src,
        config.paths.generators
      );
    }

    if (isAbsolute(config.paths.generators)) {
      return config.paths.generators;
    }

    return resolver(loader().resolveSync(), config.paths.generators);
  }

  /**
   * Executes the command to add a generator.
   *
   * @returns A promise that resolves when the generator has been added successfully or rejects with an error.
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
            .then((builder) => Promise.resolve(new GeneratorHandler(builder)))
            .then((handler) => handler.add(t, p, ts))
            .then((message) => resolve(this.success(message)))
            .catch(reject);
        })
        .catch(reject);
    });
  }
}
