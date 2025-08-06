import { resolve } from 'path';
import { Command } from '../Command';
import { config } from '../../config';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';

export class DownCommand extends Command {
  protected static syntax = '';

  public static async exec(): Promise<void> {
    try {
      const path = resolve(config().resolveSync(), '.maintenance');

      if (existsSync(path)) {
        this.info(`Maintenance mode is already ON.`);
        return;
      }

      await writeFile(path, '');
      this.success(`Maintenance mode activated. The site is now offline.`);
    } catch (error) {
      this.error(`Oops! Failed to activate maintenance mode.`);
    }
  }
}
