import { isFullStr, isInt, isRegex, isStr } from './Test';

/**
 * Custom error class used in Text helper.
 */
export class TextError extends Error {}

/**
 * Represents the result of `indexesOf(text: string, search: string|RegExp)`,
 * which returns an array of index ranges (start and end positions) for each match.
 */
type Indexes = Array<{ start: number; end: number }>;

/**
 * Contains a list of uncountable terms, irregular terms, and special cases.
 * Each entry consists of a singular and its corresponding plural form.
 * This data is used in `toSingular(plural: string)` and `toPlural(singular: string)`.
 */
const DATA = [
  // Uncountable Terms
  { singular: 'deer', plural: 'deer' },
  { singular: 'news', plural: 'news' },
  { singular: 'advice', plural: 'advice' },
  { singular: 'information', plural: 'information' },
  { singular: 'furniture', plural: 'furniture' },
  { singular: 'knowledge', plural: 'knowledge' },
  { singular: 'luggage', plural: 'luggage' },
  { singular: 'money', plural: 'money' },
  { singular: 'bread', plural: 'bread' },
  { singular: 'coffee', plural: 'coffee' },
  { singular: 'tea', plural: 'tea' },
  { singular: 'salt', plural: 'salt' },
  { singular: 'sugar', plural: 'sugar' },
  { singular: 'water', plural: 'water' },
  { singular: 'homework', plural: 'homework' },
  { singular: 'sheep', plural: 'sheep' },
  { singular: 'bison', plural: 'bison' },

  // Irregular Terms
  { singular: 'child', plural: 'children' },
  { singular: 'man', plural: 'men' },
  { singular: 'woman', plural: 'women' },
  { singular: 'tooth', plural: 'teeth' },
  { singular: 'foot', plural: 'feet' },
  { singular: 'mouse', plural: 'mice' },
  { singular: 'goose', plural: 'geese' },
  { singular: 'cactus', plural: 'cacti' },
  { singular: 'fungus', plural: 'fungi' },
  { singular: 'octopus', plural: 'octopuses' },
  { singular: 'bacterium', plural: 'bacteria' },
  { singular: 'criterion', plural: 'criteria' },
  { singular: 'phenomenon', plural: 'phenomena' },
  { singular: 'medium', plural: 'media' },
  { singular: 'datum', plural: 'data' },
  { singular: 'knife', plural: 'knives' },
  { singular: 'life', plural: 'lives' },
  { singular: 'wolf', plural: 'wolves' },
  { singular: 'loaf', plural: 'loaves' },
  { singular: 'calf', plural: 'calves' },
  { singular: 'thief', plural: 'thieves' },
  { singular: 'wife', plural: 'wives' },
  { singular: 'leaf', plural: 'leaves' },
  { singular: 'elf', plural: 'elves' },
  { singular: 'shelf', plural: 'shelves' },
  { singular: 'half', plural: 'halves' },
  { singular: 'aircraft', plural: 'aircraft' },
  { singular: 'series', plural: 'series' },
  { singular: 'species', plural: 'species' },
  { singular: 'focus', plural: 'foci' },
  { singular: 'radius', plural: 'radii' },
  { singular: 'alumnus', plural: 'alumni' },
  { singular: 'alumna', plural: 'alumnae' },
  { singular: 'parenthesis', plural: 'parentheses' },
  { singular: 'thesis', plural: 'theses' },
  { singular: 'analysis', plural: 'analyses' },
  { singular: 'diagnosis', plural: 'diagnoses' },
  { singular: 'crisis', plural: 'crises' },
  { singular: 'appendix', plural: 'appendices' },
  { singular: 'index', plural: 'indexes' },

  // Special cases
  { singular: 'photo', plural: 'photos' },
  { singular: 'safari', plural: 'safaris' },
  { singular: 'piano', plural: 'pianos' },
  { singular: 'zero', plural: 'zeros' },
  { singular: 'foe', plural: 'foes' },
  { singular: 'ox', plural: 'oxen' },
  { singular: 'die', plural: 'dice' },

  // Tables
  { singular: 'user', plural: 'users' },
  { singular: 'profile', plural: 'profiles' },
  { singular: 'post', plural: 'posts' },
  { singular: 'comment', plural: 'comments' },
  { singular: 'category', plural: 'categories' },
  { singular: 'tag', plural: 'tags' },
  { singular: 'role', plural: 'roles' },
  { singular: 'permission', plural: 'permissions' },
  { singular: 'product', plural: 'products' },
  { singular: 'order', plural: 'orders' },
  { singular: 'invoice', plural: 'invoices' },
  { singular: 'customer', plural: 'customers' },
  { singular: 'address', plural: 'addresses' },
  { singular: 'payment', plural: 'payments' },
  { singular: 'shipment', plural: 'shipments' },
  { singular: 'review', plural: 'reviews' },
  { singular: 'notification', plural: 'notifications' },
  { singular: 'message', plural: 'messages' },
  { singular: 'attachment', plural: 'attachments' },
  { singular: 'file', plural: 'files' },
  { singular: 'image', plural: 'images' },
  { singular: 'video', plural: 'videos' },
  { singular: 'setting', plural: 'settings' },
  { singular: 'log', plural: 'logs' },
  { singular: 'activity', plural: 'activities' },
  { singular: 'event', plural: 'events' },
  { singular: 'session', plural: 'sessions' },
  { singular: 'token', plural: 'tokens' },
  { singular: 'audit', plural: 'audits' },
  { singular: 'subscription', plural: 'subscriptions' },
  { singular: 'report', plural: 'reports' },
  { singular: 'statistic', plural: 'statistics' },
  { singular: 'task', plural: 'tasks' },
  { singular: 'project', plural: 'projects' },
  { singular: 'team', plural: 'teams' },
  { singular: 'department', plural: 'departments' },
  { singular: 'organization', plural: 'organizations' },
  { singular: 'company', plural: 'companies' },
  { singular: 'group', plural: 'groups' },
  { singular: 'module', plural: 'modules' },
  { singular: 'feature', plural: 'features' },
  { singular: 'metric', plural: 'metrics' },
  { singular: 'goal', plural: 'goals' },
];

/**
 * Adds or updates the plural form for a singular word in the dictionary.
 * If the singular word already exists, the plural form will be updated.
 * If the singular doesn't exist, a new entry will be created.
 *
 * @param singular The singular word to be registered.
 * @param plural The plural form to be registered.
 * @throws `TextError` if either the singular or plural is not a valid string.
 */
export function dictionary(singular: string, plural: string): void {
  if (!isFullStr(singular)) {
    throw new TextError(`Invalid singular: ${String(singular)}`);
  }

  if (!isFullStr(plural)) {
    throw new TextError(`Invalid plural: ${String(plural)}`);
  }

  // Check if the singular word already exists in DATA
  const s = DATA.find((entry) => entry.singular === singular);
  const p = DATA.find((entry) => entry.plural === plural);

  // If the singular exists, update the plural form
  if (s) s.plural = plural;

  // If the plural exists, update the singular form
  if (p) p.singular = singular;

  // If it doesn't exist, add a new entry
  if (!(p && s)) DATA.push({ singular, plural });
}

/**
 * Converts a singular word to its plural form based on registered mappings or rules.
 *
 * @param singular The singular word to be pluralized.
 * @returns The plural form of the provided singular word.
 * @throws `TextError` if the input is not a valid string.
 */
export function toPlural(singular: string): string {
  if (!isFullStr(singular)) {
    throw new TextError(`Invalid singular: ${String(singular)}`);
  }

  singular = singular.trim().toLowerCase();

  // Look for the singular word in the DATA array
  const entry = DATA.find((item) => item.singular === singular);

  // Return the plural form if found
  if (entry) return entry.plural;

  // Apply default pluralization rules if not found in DATA

  // For words ending in 'ch', 'sh', 's', 'z', or 'x' we add 'es'
  if (/(?:[sc]h|s|z|x)$/i.test(singular)) {
    return singular + 'es';
  }

  // For words ending in vowel + 'y' we add 's'
  if (/[aeiou]y$/i.test(singular)) {
    return singular + 's';
  }

  // For words ending in consonant + 'y' we replace 'y' with 'ies'
  if (/[bcdfghjklmnpqrstvwxyz]y$/i.test(singular)) {
    return singular.replace(/y$/, 'ies');
  }

  // For words ending in vowel + 'o' we add 's'
  if (/[aeiou]o$/i.test(singular)) {
    return singular + 's';
  }

  // For words ending in consonant + 'o' we add 'es'
  if (/[bcdfghjklmnpqrstvwxyz]o$/i.test(singular)) {
    return singular + 'es';
  }

  // For words ending in 'f' or 'fe' we replace 'f' or 'fe' with 'ves'
  if (/[f]e?$/i.test(singular)) {
    return singular.replace(/[f]e?$/, 'ves');
  }

  // Default rule: add 's' to most words
  return singular + 's';
}

/**
 * Converts a plural word to its singular form based on registered mappings or rules.
 *
 * @param plural The plural word to be converted to singular.
 * @returns The singular form of the provided plural word.
 * @throws `TextError` if the input is not a valid string.
 */
export function toSingular(plural: string): string {
  if (!isFullStr(plural)) {
    throw new TextError(`Invalid plural: ${String(plural)}`);
  }

  plural = plural.trim().toLowerCase();

  // Look for the plural word in the DATA array
  const entry = DATA.find((item) => item.plural === plural);

  // Return the singular form if found
  if (entry) return entry.singular;

  // Apply default singularization rules if not found in DATA

  // For words ending in 'ies', replace with 'y'
  if (/ies$/i.test(plural)) {
    return plural.replace(/ies$/, 'y');
  }

  // For words ending in 'es', remove the 'es' (for words like 'bushes', 'boxes', etc.)
  if (/es$/i.test(plural)) {
    return plural.replace(/es$/, '');
  }

  // For words ending in 's', remove the 's' (default case for most words)
  if (/s$/i.test(plural)) {
    return plural.replace(/s$/, '');
  }

  // Return the plural unchanged if no rule applies (for cases like 'fish' or 'deer')
  return plural;
}

/**
 * Converts a string pattern into a regular expression
 *
 * The function replaces `*` with `.*` to allow for flexible matching:
 * - `hello*` matches strings that start with "hello".
 * - `*hello` matches strings that end with "hello".
 * - `*hello*` matches strings that contain "hello" anywhere.
 *
 * @param text The string pattern to convert into a regular expression.
 * @param flags Optional flags for the regular expression (e.g., 'i' for case-insensitive).
 * @returns A regular expression created from the input string.
 */
export function toRegex(text: string, flags?: string): RegExp {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  if (flags && !isStr(flags)) {
    throw new TextError(`Invalid flags: ${String(flags)}`);
  }

  return new RegExp(`^${text.replace(/\*/g, '.*')}$`, flags);
}

/**
 * Converts a string to uppercase.
 *
 * @param text The string to convert to uppercase.
 * @returns The input string converted to uppercase.
 * @throws `TextError` if the input is not a valid string.
 */
export function toUpper(text: string): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  return text.toUpperCase();
}

/**
 * Converts a string to lowercase.
 *
 * @param text The string to convert to lowercase.
 * @returns The input string converted to lowercase.
 * @throws `TextError` if the input is not a valid string.
 */
export function toLower(text: string): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  return text.toLowerCase();
}

/**
 * Converts the character at a specified index of a string to uppercase.
 *
 * @param text The string in which the character will be converted.
 * @param index The index of the character to convert to uppercase.
 * @returns The input string with the character at the specified index converted to uppercase.
 * @throws `TextError` if the input is not a valid string or index.
 * @throws `TextError` if the index is out of bounds.
 */
export function toUpperAt(text: string, index: number): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  if (!isInt(index)) {
    throw new TextError(`Invalid index: ${String(index)}`);
  }

  // Ensure 'index' is within bounds
  if (index < 0 || index >= text.length) return text; // Return the string as it is if the index is out of bounds

  return text
    .split('')
    .map((char, i) => (i === index ? char.toUpperCase() : char))
    .join('');
}

/**
 * Converts the character at a specified index of a string to lowercase.
 *
 * @param text The string in which the character will be converted.
 * @param index The index of the character to convert to lowercase.
 * @returns The input string with the character at the specified index converted to lowercase.
 * @throws `TextError` if the input is not a valid string or index.
 * @throws `TextError` if the index is out of bounds.
 */
export function toLowerAt(text: string, index: number): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  if (!isInt(index)) {
    throw new TextError(`Invalid index: ${String(index)}`);
  }

  // Ensure 'index' is within bounds
  if (index < 0 || index >= text.length) return text; // Return the string as it is if the index is out of bounds

  return text
    .split('')
    .map((char, i) => (i === index ? char.toLowerCase() : char))
    .join('');
}

/**
 * Converts all characters from a specified index to uppercase in a string.
 *
 * @param text The string to modify.
 * @param index The starting index from which characters will be converted to uppercase.
 * @param to The optional ending index. If not provided, the function will convert from the `index` to the end of the string.
 * @returns The transformed string with characters converted to uppercase.
 * @throws `TextError` if the string is not valid or if the index is not an integer.
 */
export function toUpperFrom(text: string, index: number, to?: number): string {
  // Ensure the input string is valid
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  // Ensure the index is a valid integer
  if (!isInt(index)) {
    throw new TextError(`Invalid index: ${String(index)}`);
  }

  if (!isInt(to)) to = text.length - 1;

  // Ensure 'to' is within bounds
  if (to <= index || to >= text.length) return text; // Return the string as it is if the 'to' is out of bounds

  // Ensure 'index' is within bounds
  if (index < 0 || index >= text.length) return text; // Return the string as it is if the index is out of bounds

  return text
    .split('')
    .map((char, i) => (i >= index && i <= to ? char.toUpperCase() : char))
    .join('');
}

/**
 * Converts all characters from a specified index to lowercase in a string.
 *
 * @param text The string to modify.
 * @param index The starting index from which characters will be converted to lowercase.
 * @param to The optional ending index. If not provided, the function will convert from the `index` to the end of the string.
 * @returns The transformed string with characters converted to lowercase.
 * @throws `TextError` if the string is not valid or if the index is not an integer.
 */
export function toLowerFrom(text: string, index: number, to?: number): string {
  // Ensure the input string is valid
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  // Ensure the index is a valid integer
  if (!isInt(index)) {
    throw new TextError(`Invalid index: ${String(index)}`);
  }

  if (!isInt(to)) to = text.length - 1;

  // Ensure 'to' is within bounds
  if (to <= index || to >= text.length) return text; // Return the string as it is if the 'to' is out of bounds

  // Ensure 'index' is within bounds
  if (index < 0 || index >= text.length) return text; // Return the string as it is if the index is out of bounds

  return text
    .split('')
    .map((char, i) => (i >= index && i <= to ? char.toLowerCase() : char))
    .join('');
}

/**
 * Converts the first character of a string to uppercase.
 *
 * @param text The string whose first character will be converted to uppercase.
 * @returns The string with the first character in uppercase, or the original string if it's invalid.
 * @throws `TextError` if the input is not a valid string.
 */
export function toUpperFirst(text: string): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  return toUpperAt(text, 0);
}

/**
 * Converts a string to camelCase.
 *
 * @param text The string to convert to camelCase.
 * @returns The string converted to camelCase.
 * @throws `TextError` if the input is not a valid string.
 *
 * @example
 * toKamelCase("hello world") // "helloWorld"
 * toKamelCase("Hello world") // "helloWorld"
 * toKamelCase("hello 123 world!") // "hello123World"
 */
export function toKamelCase(text: string): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  return text
    .toLowerCase()
    .replace(/[^0-9a-z\s]/gi, ' ') // Remove all non-alphanumeric and non-space characters
    .replace(/^[0-9\s]+/, '') // Remove leading digits or spaces
    .split(/\s+/) // Split on one or more spaces
    .filter((item) => item.trim() !== '') // Remove empty items after split
    .map((word, index) => (index === 0 ? word : toUpperFirst(word))) // Capitalize all words except the first one
    .join(''); // Join words together without spaces
}

/**
 * Converts a string to PascalCase.
 *
 * @param text The string to convert to PascalCase.
 * @returns The string converted to PascalCase.
 * @throws `TextError` if the input is not a valid string.
 *
 * @example
 * toPascalCase("hello world") // "HelloWorld"
 * toPascalCase("hello 123 world!") // "Hello123World"
 */
export function toPascalCase(text: string): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  return text
    .toLowerCase()
    .replace(/[^0-9a-z\s]/gi, ' ') // Remove all non-alphanumeric and non-space characters
    .replace(/^[0-9\s]+/, '') // Remove leading digits or spaces
    .split(/\s+/) // Split on one or more spaces
    .filter((item) => item.trim() !== '') // Remove empty items after split
    .map((word) => toUpperFirst(word)) // Capitalize all words
    .join(''); // Join words together without spaces
}

/**
 * Converts a string to snake_case.
 *
 * @param text The string to convert to snake_case.
 * @returns The string converted to snake_case.
 * @throws `TextError` if the input is not a valid string.
 *
 * @example
 * toSnakeCase("hello world") // "hello_world"
 * toSnakeCase("hello 123 world!") // "hello_123_world"
 */
export function toSnakeCase(text: string): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  return text
    .toLowerCase()
    .replace(/[^0-9a-z\s]/gi, ' ') // Remove all non-alphanumeric and non-space characters
    .replace(/^[0-9\s]+/, '') // Remove leading digits or spaces
    .trim() // Remove any trailing spaces
    .split(/\s+/) // Split on one or more spaces
    .join('_'); // Join words with underscores
}

/**
 * Converts a string to kebab-case.
 *
 * @param text The string to convert to kebab-case.
 * @returns The string converted to kebab-case.
 * @throws `TextError` if the input is not a valid string.
 *
 * @example
 * toKababCase("hello world") // "hello-world"
 * toKababCase("hello 123 world!") // "hello-123-world"
 */
export function toKababCase(text: string): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  return text
    .toLowerCase()
    .replace(/[^0-9a-z\s]/gi, ' ') // Remove all non-alphanumeric and non-space characters
    .replace(/^[0-9\s]+/, '') // Remove leading digits or spaces
    .trim() // Remove any trailing spaces
    .split(/\s+/) // Split on one or more spaces
    .join('-'); // Join words with hyphens
}

/**
 * Converts the first character of every word to uppercase.
 *
 * @param text The string to be transformed.
 * @returns The input string in a title format.
 * @throws `TextError` if the input is not a valid string.
 */
export function toTitle(text: string): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  return toWords(text)
    .map((word) => toUpperFirst(word))
    .join(' ');
}

/**
 * Converts a string to a slug by converting it to lowercase and replacing spaces and non-alphanumeric characters with hyphens.
 *
 * @param text The string to be converted.
 * @returns The input string converted to a slug (lowercase with hyphens).
 * @throws `TextError` if the input is not a valid string.
 */
export function toSlug(text: string): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  return text
    .toLowerCase()
    .replace(/[^0-9a-z\s]/gi, ' ')
    .trim()
    .split(/\s+/)
    .join('-');
}

/**
 * Trims the string to a specified length and appends an ellipsis ("...") if the string is longer than the specified length.
 *
 * @param text The string to be truncated.
 * @param length The maximum length of the string (excluding the ellipsis).
 * @returns The truncated string with an ellipsis appended if necessary.
 * @throws `TextError` if the input is not a valid string or if the length is not a positive integer.
 */
export function toSnap(text: string, length: number): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  if (!isInt(length) || length <= 0) {
    throw new TextError(`Invalid length: ${String(length)}.`);
  }

  return text.length <= length ? text : text.slice(0, length).trim() + '...';
}

/**
 * Splits a string into an array of characters, optionally excluding certain characters.
 *
 * @param text The string to be split into characters.
 * @param exclude An optional array of characters to exclude from the result.
 * @returns An array of characters from the input string, with any excluded characters removed.
 * @throws `TextError` if the input is not a valid string.
 */
export function toChars(text: string, ...exclude: string[]): string[] {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  return text.split('').filter((char) => !exclude.includes(char));
}

/**
 * Splits a string into an array of words, based on spaces.
 *
 * @param text The string to be split into words.
 * @returns An array of words from the input string.
 * @throws `TextError` if the input is not a valid string.
 */
export function toWords(text: string): string[] {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  return text.split(' ').filter((word) => isFullStr(word));
}

/**
 * Converts a size in bytes to a human-readable string format.
 *
 * This function takes a number of bytes and converts it into a more
 * understandable format, such as KB, MB, GB, etc., depending on the size.
 *
 * @param bytes - The size in bytes to be converted.
 * @returns A string representing the size in the appropriate unit.
 *          The result will have no decimal places for bytes and
 *          up to two decimal places for larger units.
 */
export function toSize(bytes: number): string {
  const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  let index = 0;

  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024;
    index++;
  }

  return `${bytes.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

/**
 * Prefixes a string with a given portion.
 *
 * @param text The string to be prefixed.
 * @param portion The portion to prefix the string with.
 * @returns The new string with the portion prefixed.
 * @throws `TextError` if the `text` or `portion` is not a valid string.
 */
export function prefix(text: string, portion: string): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  if (!isStr(portion)) {
    throw new TextError(`Invalid portion: ${String(portion)}`);
  }

  return portion + text;
}

/**
 * Suffixes a string with a given portion.
 *
 * @param text The string to be suffixed.
 * @param portion The portion to suffix the string with.
 * @returns The new string with the portion suffixed.
 * @throws `TextError` if the `text` or `portion` is not a valid string.
 */
export function suffix(text: string, portion: string): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  if (!isStr(portion)) {
    throw new TextError(`Invalid portion: ${String(portion)}`);
  }

  return text + portion;
}

/**
 * Inserts a portion of text into a string at a specific index.
 *
 * @param text The original string.
 * @param portion The portion to insert.
 * @param index The index at which to insert the portion.
 * @returns The new string with the portion inserted at the specified index.
 * @throws `TextError` if the `text` or `portion` `index` is invalid.
 */
export function infix(text: string, portion: string, index: number): string {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  if (!isStr(portion)) {
    throw new TextError(`Invalid portion: ${String(portion)}`);
  }

  if (!isInt(index)) {
    throw new TextError(`Invalid index: ${String(index)}`);
  }

  return text.slice(0, index).concat(portion, text.slice(index));
}

/**
 * Counts the occurrences of a substring or pattern in a string.
 *
 * @param text The string in which to search.
 * @param search The substring or regular expression to search for.
 * @returns The number of occurrences of the search pattern in the string.
 * @throws `TextError` if `text` is not a string or `search` is neither a string nor a regular expression.
 */
export function countOf(text: string, search: string | RegExp): number {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  if (!isRegex(search) && !isStr(search)) {
    throw new TextError(`Invalid search: ${String(search)}`);
  }

  if (search instanceof RegExp && !search.flags.includes('g')) {
    search = new RegExp(search.source, search.flags + 'g');
  }

  if (isStr(search)) search = new RegExp(search, 'g');

  const matches = text.match(search);
  return matches ? matches.length : 0;
}

/**
 * Finds the first index of a substring or pattern in a string, starting from a specified position.
 *
 * @param text The string in which to search.
 * @param search The substring or regular expression to search for.
 * @param pos The position in the string to start the search from.
 * @returns The index of the first match, or `undefined` if no match is found.
 * @throws `TextError` if `text` is not a string or `search` is neither a string nor a regular expression.
 */
export function indexOf(
  text: string,
  search: string | RegExp,
  pos: number = 0
): number | void {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  if (!isRegex(search) && !isStr(search)) {
    throw new TextError(`Invalid search: ${String(search)}`);
  }

  if (!isRegex(search)) search = new RegExp(search);
  if (!isInt(pos)) pos = 0;

  const index = text.slice(pos).search(search);
  return index >= 0 ? index + pos : undefined; // Adjust the index to the correct position
}

/**
 * Finds all the indexes of a substring or pattern in a string and returns an array of index ranges.
 *
 * @param text The string in which to search.
 * @param search The substring or regular expression to search for.
 * @returns An array of objects containing the start and end indexes of each match, or `undefined` if no matches are found.
 * @throws `TextError` if `text` is not a string or `search` is neither a string nor a regular expression.
 */
export function indexesOf(
  text: string,
  search: string | RegExp
): Indexes | void {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  if (!isRegex(search) && !isStr(search)) {
    throw new TextError(`Invalid search: ${String(search)}`);
  }

  if (search instanceof RegExp && !search.flags.includes('g')) {
    search = new RegExp(search.source, search.flags + 'g');
  }

  if (!isRegex(search)) search = new RegExp(search as any, 'g');

  let match;

  const indexes: Indexes = [];

  while ((match = (search as RegExp).exec(text)) !== null) {
    indexes.push({ start: match.index, end: match.index + match[0].length });
  }

  return indexes.length > 0 ? indexes : undefined;
}

/**
 * Finds the last index of a substring or pattern in a string.
 *
 * @param text The string in which to search.
 * @param search The substring or regular expression to search for.
 * @returns The index of the last match, or `undefined` if no match is found.
 * @throws `TextError` if `text` is not a string or `search` is neither a string nor a regular expression.
 */
export function lastIndexOf(
  text: string,
  search: string | RegExp
): number | void {
  if (!isStr(text)) {
    throw new TextError(`Invalid text: ${String(text)}`);
  }

  if (!isRegex(search) && !isStr(search)) {
    throw new TextError(`Invalid search: ${String(search)}`);
  }

  if (search instanceof RegExp && !search.flags.includes('g')) {
    search = new RegExp(search.source, search.flags + 'g');
  }

  if (!isRegex(search)) search = new RegExp(search, 'g');

  const matches = text.match(search);

  if (matches) {
    const lastMatch = matches[matches.length - 1];
    return text.lastIndexOf(lastMatch);
  }

  return undefined;
}
