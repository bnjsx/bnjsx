import { Command } from '../Command';
import { RemoveGeneratorCommand } from './RemoveGeneratorCommand';
import { RemoveSeederCommand } from './RemoveSeederCommand';
import { RemoveModelCommand } from './RemoveModelCommand';

/**
 * Represents a command to add a command file to a specific folder in the project
 * based on MegaORM configuration.
 *
 * @extends Command
 */
export class RemoveForCommand extends Command {
  /**
   * Executes 3 commands to add `generator`, `seeder` and a `model` file for the specified table.
   *
   * @returns A promise that resolves when all files has been added successfully or rejects with an error.
   */
  public static exec() {
    return new Promise((resolve, reject) => {
      RemoveGeneratorCommand.exec()
        .then(() => RemoveSeederCommand.exec())
        .then(() => RemoveModelCommand.exec())
        .then(resolve)
        .catch(reject);
    });
  }
}
