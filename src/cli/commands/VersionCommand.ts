import path from 'path';

import { Command, CommandError } from '../Command';
import { readFile } from 'fs/promises';

/**
 * Command that outputs the current version of the application.
 *
 *
 * @extends Command
 */
export class VersionCommand extends Command {
  /**
   * Logs the current version of the application to the console.
   */
  public static exec(): any {
    return new Promise((resolve, reject) => {
      readFile(path.resolve(__dirname, '../../../package.json'), {
        encoding: 'utf-8',
      })
        .then((config: any) =>
          resolve(this.warning(JSON.parse(config).version))
        )
        .catch(() => reject(new CommandError('Falied to load package.json')));
    });
  }
}
