import { ModelHandler } from '../handlers/ModelHandler';
import { Command, CommandError } from '../Command';
import { AppOptions, config as loader } from '../../config';
import { isAbsolute, join, resolve as resolver } from 'path';

/**
 * Represents a command to remove a model file from specific folders in the project
 * based on MegaORM configuration.
 *
 * @extends Command
 */
export class RemoveModelCommand extends Command {
  protected static syntax: string = '<! table>';

  /**
   * Resolves the appropriate paths for removing model files based on the configuration.
   *
   * @param config The MegaORM configuration object.
   * @returns An array of resolved paths for the model files to be removed.
   * @throws `CommandError` if `paths.models` is absolute and TypeScript is enabled.
   */
  private static paths(config: AppOptions): Array<string> {
    const paths = [];

    if (config.typescript.enabled === true) {
      // Cannot be absolute
      if (isAbsolute(config.paths.models)) {
        throw new CommandError(
          `paths.models cannot be absolute if typescript is enabled`
        );
      }

      if (isAbsolute(config.typescript.src)) {
        paths.push(join(config.typescript.src, config.paths.models));
      } else {
        paths.push(
          resolver(
            loader().resolveSync(),
            config.typescript.src,
            config.paths.models
          )
        );
      }

      if (isAbsolute(config.typescript.dist)) {
        paths.push(join(config.typescript.dist, config.paths.models));
      } else {
        paths.push(
          resolver(
            loader().resolveSync(),
            config.typescript.dist,
            config.paths.models
          )
        );
      }

      return paths;
    }

    if (isAbsolute(config.paths.models)) {
      paths.push(config.paths.models);
      return paths;
    }

    paths.push(resolver(loader().resolveSync(), config.paths.models));
    return paths;
  }

  /**
   * Removes the model file associated with the specified table name.
   *
   * @returns A promise that resolves when the model files have been successfully removed or rejects with an error.
   */
  public static exec(): Promise<void> {
    return new Promise((resolve, reject) => {
      const table = this.argument('table') as string;

      loader()
        .load()
        .then((config: AppOptions) => {
          const paths = this.paths(config);
          const handler = new ModelHandler();

          Promise.all(
            paths.map((path) => {
              return new Promise<void>((resolve, reject) => {
                loader()
                  .exist(path)
                  .then(() => {
                    handler
                      .remove(table, path)
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
