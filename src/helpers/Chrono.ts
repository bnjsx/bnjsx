import { isDate, isFunc, isNum, isObj, isStr } from './Test';
import { toISO } from './Text';

/**
 * A template for formatting time differences in various units.
 * Each function receives the number `n` and returns a localized string.
 */
type Template = {
  now: (n: number) => string;
  second: (n: number) => string;
  minute: (n: number) => string;
  hour: (n: number) => string;
  day: (n: number) => string;
  month: (n: number) => string;
  year: (n: number) => string;
};

/**
 * Custom error class used for Chrono-related validation errors.
 */
export class ChronoError extends Error {}

/**
 * Chrono is a utility for formatting time differences (e.g. `2 minutes ago`)
 * using customizable language templates.
 */
export class Chrono {
  /**
   * Internal map of language codes to their formatting templates.
   * Each key is a language code (e.g., `en`, `fr`, `es`) mapped to its `Template`.
   */
  private static templates: Map<string, Template> = new Map();

  /**
   * Validates a given template by ensuring it contains all required time unit functions.
   *
   * @param template - The template object to validate.
   * @returns The validated template if all required keys are valid functions.
   * @throws {ChronoError} If the template is not an object or any required key is missing or invalid.
   */
  private static validate(template: Template): Template {
    if (!isObj(template)) {
      throw new ChronoError(
        `Expected an object but recived ${typeof template}`
      );
    }

    const requiredKeys = [
      'now',
      'second',
      'minute',
      'hour',
      'day',
      'month',
      'year',
    ];

    for (const key of requiredKeys) {
      const fn = template[key];

      if (!isFunc(fn)) {
        throw new ChronoError(`Invalid or missing '${key}' function.`);
      }
    }

    return template;
  }

  /**
   * Register or update a language template
   *
   * @param lang Language code
   * @param template Template object with functions
   */
  public static set(lang: string, template: Template): void {
    if (!isStr(lang)) {
      throw new ChronoError('Language code must be a string');
    }

    if (Chrono.templates.has(lang)) {
      throw new ChronoError('Language code already exist');
    }

    Chrono.templates.set(lang, Chrono.validate(template));
  }

  /**
   * Returns human-readable time string from a date, in a given language
   *
   * @param date Date object, timestamp or ISO string
   * @param lang Language code (defaults to `en`)
   */
  public static get(date: Date | string | number, lang?: string): string {
    if (!isStr(lang)) lang = 'en';
    const template = Chrono.templates.get(lang) || Chrono.templates.get('en');

    if (!isStr(date) && !isNum(date) && !isDate(date)) return template.now(0);
    date = new Date(isStr(date) ? toISO(date) : date);

    if (isNaN(date.getTime())) return template.now(0);

    const now = Date.now();
    const diff = now - date.getTime();

    if (diff < 0) return template.now(0);

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    if (years > 0) return template.year(years);
    if (months > 0) return template.month(months);
    if (days > 0) return template.day(days);
    if (hours > 0) return template.hour(hours);
    if (minutes > 0) return template.minute(minutes);
    if (seconds > 0) return template.second(seconds);

    return template.now(0);
  }
}

// English template
Chrono.set('en', {
  now: () => 'just now',
  second: (n) => `${n} second${n > 1 ? 's' : ''} ago`,
  minute: (n) => `${n} minute${n > 1 ? 's' : ''} ago`,
  hour: (n) => `${n} hour${n > 1 ? 's' : ''} ago`,
  day: (n) => `${n} day${n > 1 ? 's' : ''} ago`,
  month: (n) => `${n} month${n > 1 ? 's' : ''} ago`,
  year: (n) => `${n} year${n > 1 ? 's' : ''} ago`,
});

// French template
Chrono.set('fr', {
  now: () => "à l'instant",
  second: (n) => `il y a ${n} seconde${n > 1 ? 's' : ''}`,
  minute: (n) => `il y a ${n} minute${n > 1 ? 's' : ''}`,
  hour: (n) => `il y a ${n} heure${n > 1 ? 's' : ''}`,
  day: (n) => `il y a ${n} jour${n > 1 ? 's' : ''}`,
  month: (n) => `il y a ${n} mois`,
  year: (n) => `il y a ${n} an${n > 1 ? 's' : ''}`,
});

/**
 * Returns a human-readable time string for the given date,
 * formatted according to the specified language.
 *
 * This is a convenience wrapper around `Chrono.get()`.
 *
 * @param date - The date to format. Can be a Date object, ISO/string date, or timestamp number.
 * @param lang - Optional language code (e.g., `en`, `fr`). Defaults to `en` if not provided.
 * @returns A localized time string (e.g., "2 minutes ago", "à l`instant").
 */
export function chrono(date: Date | string | number, lang?: string): string {
  return Chrono.get(date, lang);
}

/**
 * Alias of `chrono()`. Returns a human-readable time string
 * for the given date and language.
 *
 * @param date - The date to format. Can be a Date object, ISO/string date, or timestamp number.
 * @param lang - Optional language code (e.g., `en`, `fr`). Defaults to `en` if not provided.
 * @returns A localized time string.
 */
export function diff(date: Date | string | number, lang?: string): string {
  return Chrono.get(date, lang);
}
