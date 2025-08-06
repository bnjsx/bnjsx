import { resolve } from 'path';
import { Command } from '../Command';
import { config } from '../../config';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';

export class UpCommand extends Command {
  protected static syntax = '';

  public static async exec(): Promise<void> {
    try {
      const path = resolve(config().resolveSync(), '.maintenance');

      if (!existsSync(path)) {
        this.info(`Maintenance mode is already OFF.`);
        return;
      }

      await unlink(path);
      this.success(`Maintenance mode deactivated. The site is back online.`);
    } catch (error) {
      this.error(`Oops! Failed to deactivate maintenance mode.`);
    }
  }
}
