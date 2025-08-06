import { isArr, isError, isObj, isStr, isSymbol } from './Test';

export * from './Echo';
export * from './Faker';
export * from './Logger';
export * from './Test';
export * from './Text';
export * from './UTC';
export * from './Zone';
export * from './Config';
export * from './Vite';
export * from './Folder';
export * from './Store';
export * from './Chrono';
export * from './Mime';
export * from './Lang';
export * from './Mixer';

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

/**
 * Logs a formatted SQL query and its associated argument values to the console.
 * Useful for debugging raw SQL queries and inspecting runtime values.
 *
 * @param query - The raw SQL query string.
 * @param values - The array of argument values bound to the query.
 */
export function logSQL(query: string, values: Array<any>) {
  if (!isStr(query)) query = '';
  if (!isArr(values)) values = [];

  console.log(
    `\n${blue(`[SQL]`)}\n${formatQuery(query)}\n${blue('[ARGS]')}\n${orange(
      JSON.stringify(values)
    )}\n`
  );
}

export function formatQuery(query: string): string {
  return query
    .replace(/\s+/g, ' ') // normalize spaces
    .replace(
      /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LEFT JOIN|RIGHT JOIN|INNER JOIN|AND|OR|LIMIT|OFFSET)\b/g,
      '\n$1'
    )
    .replace(/\n\s+/g, '\n') // trim leading space on new lines
    .trim()
    .split('\n')
    .map((line) => green(line.trim())) // trim trailing spaces here
    .join('\n');
}

/**
 * Replaces `:placeholders` in a template string with corresponding values from the given params.
 *
 * - Placeholders are prefixed with a colon (e.g., `:name`, `:count`).
 * - If a key is missing in the params object, the placeholder is left unchanged.
 *
 * @param template - The string containing colon-prefixed placeholders.
 * @param params - An object mapping keys to replacement values.
 * @returns A formatted string with placeholders replaced by parameter values.
 */
export function format(
  template: string,
  params: Record<string, string | number>
): string {
  if (!isStr(template)) template = '';
  if (!isObj(params)) params = {};

  return template.replace(/:(\w+)/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `:${key}`;
  });
}

/**
 * Logs a structured, colorful dev warning.
 *
 * @param message - Short message describing the warning.
 * @param context - Optional key-value pairs for additional context.
 * @param label - Optional block title (default: "Warning").
 */
export function warn(
  message: string,
  context?: Record<string, any>,
  label?: string
) {
  if (!isStr(message)) message = 'Heads up';
  if (!isStr(label)) label = 'Warning';
  if (!isObj(context)) context = {};

  const contextEntries = Object.entries(context);
  const keyWidth =
    contextEntries.reduce((max, [key]) => Math.max(max, key.length), 0) + 1;

  console.log(blue(`\n╭─ ${label} ${'─'.repeat(50 - label.length)}`));
  console.log(`│ ${red('⚠ ')} ${message}`);

  if (contextEntries.length > 0) {
    console.log(blue(`├─ Context ${'─'.repeat(50 - 9)}`));
    for (const [key, value] of contextEntries) {
      const paddedKey = green(`${key}:`).padEnd(keyWidth + 1);
      console.log(`│ ${paddedKey} ${value}`);
    }
  }

  console.log(blue(`╰${'─'.repeat(52)}\n`));
}
