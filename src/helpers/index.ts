import { isError, isObj, isSymbol } from './modules/Test';

export * from './modules/Echo';
export * from './modules/Faker';
export * from './modules/Logger';
export * from './modules/Test';
export * from './modules/Text';
export * from './modules/UTC';
export * from './modules/Zone';
export * from './modules/Config';
export * from './tools/Vite';

/**
 * Checks if the given object is a valid `MegaDriver`.
 * @param driver - The object to validate as a `MegaDriver`.
 * @returns `true` if the object is a `MegaDriver`, `false` otherwise.
 */
export function isDriver(driver: any): boolean {
  if (!isObj(driver)) return false;
  if (!isSymbol(driver.id)) return false;
  return ['MySQL', 'SQLite', 'PostgreSQL'].some(
    (name) => name === driver.id.description
  );
}

/**
 * Checks if the given object is a valid `MySQL` instance.
 * @param driver The object to validate.
 * @returns `true` if the object is a `MySQL` instance, `false` otherwise.
 */
export function isMySQL(driver: any): boolean {
  if (!isObj(driver)) return false;
  if (!isSymbol(driver.id)) return false;
  if (driver.id.description !== 'MySQL') return false;
  return true;
}

/**
 * Checks if the given object is a valid `SQLite` instance.
 * @param driver The object to validate.
 * @returns `true` if the object is a `SQLite` instance, `false` otherwise.
 */
export function isSQLite(driver: any): boolean {
  if (!isObj(driver)) return false;
  if (!isSymbol(driver.id)) return false;
  if (driver.id.description !== 'SQLite') return false;
  return true;
}

/**
 * Checks if the given object is a valid `PostgreSQL` instance.
 * @param driver The object to validate.
 * @returns `true` if the object is a `PostgreSQL` instance, `false` otherwise.
 */
export function isPostgreSQL(driver: any): boolean {
  if (!isObj(driver)) return false;
  if (!isSymbol(driver.id)) return false;
  if (driver.id.description !== 'PostgreSQL') return false;
  return true;
}

/**
 * Checks if the given object is a valid `Connection`.
 * @param connection - The object to validate as a `Connection`.
 * @returns `true` if the object is a `Connection`, `false` otherwise.
 */
export function isCon(connection: any): boolean {
  if (!isObj(connection)) return false;
  if (!isSymbol(connection.id)) return false;
  if (connection.id.description !== 'Connection') return false;
  return true;
}

/**
 * Checks if the given object is a valid `PendingConnection`.
 * @param connection - The object to validate as a `PendingConnection`.
 * @returns `true` if the object is a `PendingConnection`, `false` otherwise.
 */
export function isPendingCon(connection: any): boolean {
  if (!isObj(connection)) return false;
  if (!isSymbol(connection.id)) return false;
  if (connection.id.description !== 'PendingConnection') return false;
  return true;
}

/**
 * Checks if the given object is a valid `PoolConnection`.
 * @param connection - The object to validate as a `PoolConnection`.
 * @returns `true` if the object is a `PoolConnection`, `false` otherwise.
 */
export function isPoolCon(connection: any): boolean {
  if (!isObj(connection)) return false;
  if (!isSymbol(connection.id)) return false;
  if (connection.id.description !== 'PoolConnection') return false;
  return true;
}

/**
 * Formats a message in red (error).
 * @param message - The message to format.
 * @returns The formatted message with ANSI escape codes.
 */
export function red(message: string): string {
  return `\x1b[31m${message}\x1b[0m`; // Red
}

/**
 * Formats a message in green (success/info).
 * @param message - The message to format.
 * @returns The formatted message with ANSI escape codes.
 */
export function green(message: string): string {
  return `\x1b[32m${message}\x1b[0m`; // Green
}

/**
 * Formats a message in blue (info).
 * @param message - The message to format.
 * @returns The formatted message with ANSI escape codes.
 */
export function blue(message: string): string {
  return `\x1b[36m${message}\x1b[0m`; // Cyan
}

/**
 * Formats a message in orange (warning).
 * @param message - The message to format.
 * @returns The formatted message with ANSI escape codes.
 */
export function orange(message: string): string {
  return `\x1b[33m${message}\x1b[0m`; // Yellow (ANSI lacks true orange)
}

/**
 * Logs a formatted error message with details.
 * Includes the error type, message, and stack trace.
 *
 * @param error - The error object to log.
 */
export function bugger(error: Error): void {
  if (isError(error)) {
    console.log(red('\n  ❌  ERROR OCCURRED'));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${red('  🔻  Message:')} ${error.message}`);
    console.log(`${red('  🔻  Name:')} ${error.constructor.name}`);

    if (error.stack) {
      console.log('\n' + red('  🔻  Stack Trace:'));
      console.log(
        error.stack
          .split('\n')
          .slice(1)
          .map((line) => `  ▪️  ${line.trim()}`)
          .join('\n')
      );
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}
