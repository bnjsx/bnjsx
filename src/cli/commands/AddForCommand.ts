import { Command } from '../Command';
import { AddGeneratorCommand } from './AddGeneratorCommand';
import { AddSeederCommand } from './AddSeederCommand';
import { AddModelCommand } from './AddModelCommand';

/**
 * Represents a command to add a command file to a specific folder in the project
 * based on MegaORM configuration.
 *
 * @extends Command
 */
export class AddForCommand extends Command {
  /**
   * Executes 3 commands to add `generator`, `seeder` and a `model` file for the specified table.
   *
   * @returns A promise that resolves when all files has been added successfully or rejects with an error.
   */
  public static exec() {
    return new Promise((resolve, reject) => {
      AddGeneratorCommand.exec()
        .then(() => AddSeederCommand.exec())
        .then(() => AddModelCommand.exec())
        .then(resolve)
        .catch(reject);
    });
  }
}
