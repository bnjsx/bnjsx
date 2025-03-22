import { ModelHandler } from '../handlers/ModelHandler';
import { Command, CommandError } from '../Command';
import { AppOptions, config as loader } from '../../config';
import { isAbsolute, join, resolve as resolver } from 'path';

/**
 * Represents a command to add a model file to a specific folder in the project
 * based on MegaORM configuration.
 *
 * @extends Command
 */
export class AddModelCommand extends Command {
  protected static syntax: string = '<! table>';

  /**
   * Resolves the appropriate path for adding a model file based on the configuration.
   *
   * @param config The MegaORM configuration object.
   * @returns The resolved path for the model file.
   * @throws `CommandError` if `paths.models` is absolute and TypeScript is enabled.
   */
  private static path(config: AppOptions): string {
    if (config.typescript.enabled === true) {
      // Cannot be absolute
      if (isAbsolute(config.paths.models)) {
        throw new CommandError(
          `paths.models cannot be absolute if typescript is enabled`
        );
      }

      if (isAbsolute(config.typescript.src)) {
        return join(config.typescript.src, config.paths.models);
      }

      return resolver(
        loader().resolveSync(),
        config.typescript.src,
        config.paths.models
      );
    }

    if (isAbsolute(config.paths.models)) {
      return config.paths.models;
    }

    return resolver(loader().resolveSync(), config.paths.models);
  }

  /**
   * Executes the command to add a model.
   *
   * @returns A promise that resolves when the model has been added successfully or rejects with an error.
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
            .then(() => new ModelHandler().add(t, p, ts))
            .then((message) => resolve(this.success(message)))
            .catch(reject);
        })
        .catch(reject);
    });
  }
}
