import { resolve } from 'path';
import { Command } from '../Command';
import { randomBytes } from 'crypto';
import { existsSync, writeFileSync } from 'fs';
import { config } from '../../config';

/**
 * This is a base command template for creating a custom command.
 *
 * @extends `Command`
 */
export class AddEnvCommand extends Command {
  /**
   * Define the command syntax, as the following:
   * - `<! name>`: required argument
   * - `<? name>`: optional argument
   * - `<- name>`: option
   */
  protected static syntax = '';

  /**
   * This method is called when the command is executed.
   */
  public static exec(): any {
    const path = resolve(config().resolveSync(), '.env');

    // Generate a random 256-bit secret key
    const secretKey = randomBytes(32).toString('hex');

    // Check if the .env file exists
    if (existsSync(path)) {
      return this.success(`Env already exist in: ${path}`);
    }

    // Create the .env file with the new secret key
    writeFileSync(path, `APP_KEY=${secretKey}\n`);
    this.success(`Env added in: ${path}`);
  }
}
