import { appendFile, readFile, writeFile } from 'fs/promises';

/**
 * Error class for logger-related issues.
 */
export class LoggerError extends Error {}

/**
 * Log entry with a date and message.
 */
type Log = { date: string; message: string };

/**
 * Array of log entries.
 */
type Logs = Array<Log>;

/**
 * Interface representing the available getter methods for the logger.
 */
interface Getter {
  /**
   * Returns the path of the log file.
   */
  path: () => string;

  /**
   * Retrieves all log entries as an array of objects with date and message.
   * @returns A promise that resolves to an array of log entries.
   * @throws Throws an error if there is an issue reading the log file.
   */
  logs: () => Promise<Logs>;

  /**
   * Retrieves all log messages as an array of strings.
   * @returns A promise that resolves to an array of log messages.
   * @throws Throws an error if there is an issue reading the log file.
   */
  messages: () => Promise<Array<string>>;

  /**
   * Retrieves log messages from a specified date onward.
   * @param date - The date from which to retrieve log messages (format: 'YYYY-MM-DD hh:mm:ss').
   * @returns A promise that resolves to an array of log messages from the specified date.
   * @throws Throws an error if there is an issue reading the log file.
   */
  from: (date: string) => Promise<Array<string>>;
}

/**
 * A simple logger class for logging messages to a log file.
 *
 * This logger class is designed for applications that need to store log messages in a file,
 * with each log message automatically timestamped in UTC format.
 *
 * @example
 * // Create a logger instance with the path to the log file
 * const logger = new Logger('/path/to/log/file.log');
 *
 * // Log a message
 * await logger.log('This is a simple log message');
 *
 * // Retrieve all logs
 * const logs = await logger.get.logs();
 * console.log(logs); // Output: [{ date: '2024-10-12 12:34:56', message: 'This is a simple log message' }]
 *
 * // Retrieve log messages only
 * const logs = await logger.get.messages();
 * console.log(logs); // Output: ['This is a simple log message']
 *
 * // Retrieve log messages from a spesific date
 * const logs = await logger.get.from('2024-10-12 00:00:00');
 * console.log(logs); // Output: ['This is a simple log message']
 *
 * // Clear all logs
 * await logger.clear();
 *
 * @note
 * - Logs are timestamped in UTC timezone by default.
 * - Log entries are stored in the format `[YYYY-MM-DD hh:mm:ss] message`.
 * - The log file will automatically be created if it does not exist.
 *
 * @throws Throws a `LoggerError` if any file operation fails or if invalid input is provided.
 */
export class Logger {
  /** @private The file path where logs are stored */
  private path: string;

  /**
   * Creates an logger new instance
   * @param path - The path to the log file.
   */
  constructor(path: string) {
    if (typeof path !== 'string') {
      throw new LoggerError(`Invalid path: ${String(path)}`);
    }

    this.path = path;
  }

  /**
   * Provides access to various getter methods related to the logger.
   */
  public get: Getter = {
    path: () => this.path,

    logs: (): Promise<Logs> => {
      return new Promise((resolve, reject) => {
        readFile(this.path, 'utf-8')
          .then((content) => {
            resolve(
              content
                .split('<-- LOG -->')
                .filter((entry) => entry.trim().length > 0)
                .map((log) => {
                  const regex = /\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/;
                  const match = log.match(regex);

                  if (match) {
                    const date = match[1];
                    const message = log.replace(regex, '').trim();
                    return { date, message };
                  }

                  return null;
                })
                .filter(Boolean)
            );
          })
          .catch((error) => reject(new LoggerError(error.message)));
      });
    },

    messages: (): Promise<Array<string>> => {
      return new Promise((resolve, reject) => {
        this.get
          .logs()
          .then((logs) => resolve(logs.map((log) => log.message)))
          .catch(reject);
      });
    },

    from: (date: string): Promise<Array<string>> => {
      return new Promise((resolve, reject) => {
        if (typeof date !== 'string') {
          return reject(new LoggerError(`Invalid date: ${String(date)}`));
        }

        if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) {
          return reject(
            new LoggerError('Invalid date! Expected: YYYY-MM-DD hh:mm:ss')
          );
        }

        this.get
          .logs()
          .then((logs) => {
            resolve(
              logs
                .filter((log) => {
                  return (
                    new Date(log.date).getTime() > new Date(date).getTime()
                  );
                })
                .map((log) => log.message)
            );
          })
          .catch(reject);
      });
    },
  };

  /**
   * Logs a message to the log file.
   *
   * @param message The message to be logged. Must be a valid string.
   * @returns A promise that resolves when the message is successfully logged.
   * @throws `LoggerError` If the message is not a string or the log path is not set.
   */
  public log(message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof message !== 'string') {
        return reject(
          new LoggerError(`Invalid log message: ${String(message)}`)
        );
      }

      const date = new Date().toISOString().slice(0, 19).replace('T', ' ');
      appendFile(this.path, `<-- LOG -->\n[${date}] ${message}\n\n`)
        .then(() => resolve())
        .catch((error) => reject(new LoggerError(error.message)));
    });
  }

  /**
   * Clears all log messages in the log file.
   *
   * @returns A promise that resolves when the log file is successfully cleared.
   * @throws `LoggerError` if there is an error during the file write operation.
   */
  public clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      writeFile(this.path, '')
        .then(resolve)
        .catch((error) => reject(new LoggerError(error.message)));
    });
  }
}
