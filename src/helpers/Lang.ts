import fs from 'fs';
import { resolve, isAbsolute, basename, join } from 'path';
import { format, isObj, isStr, warn } from '.';
import { config } from '../config';

/**
 * Represents an error specific to language handling in the Lang class.
 */
export class LangError extends Error {}

/**
 * Defines the structure of the translation files.
 */
type Translations = Record<string, any>;

/**
 * Defines the shape of parameters passed to interpolate translation strings.
 */
type Params = Record<string, string | number | undefined>;

/**
 * The Lang class handles language loading, translation lookup, and interpolation
 * from JSON files stored in a specified directory.
 */
export class Lang {
  private static instance: Lang | null = null;
  private static translations: Map<string, Translations> = new Map();

  private lang: string;
  private root: string;

  /**
   * Constructs a singleton instance, and loads all language files.
   */
  constructor() {
    if (Lang.instance) return Lang.instance;

    const app = config().loadSync();

    if (!isObj(app.lang)) app.lang = {};
    if (!isStr(app.lang.default)) app.lang.default = 'en';
    if (!isStr(app.lang.root)) app.lang.root = './lang';
    if (!isAbsolute(app.lang.root)) {
      app.lang.root = resolve(config().resolveSync(), app.lang.root);
    }

    Lang.instance = this;
    this.root = app.lang.root;
    this.lang = app.lang.default;
    this.load();
  }

  /**
   * Loads translation files from the language directory.
   */
  private load(): void {
    try {
      if (!fs.existsSync(this.root)) {
        return warn('No language folder found', { path: this.root }, 'Lang');
      }

      const files = fs.readdirSync(this.root, { encoding: 'utf-8' });
      if (files.length === 0) {
        return warn('No language files found', { folder: this.root }, 'Lang');
      }

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const code = basename(file, '.json');
        const path = join(this.root, file);

        try {
          const content = fs.readFileSync(path, 'utf-8');
          const data: Translations = JSON.parse(content);
          Lang.translations.set(code, data);
        } catch (e) {
          warn(
            'Failed to load translation file',
            {
              file,
              path,
              error: e.message,
            },
            'Lang'
          );
        }
      }
    } catch (e) {
      warn(
        'Error while loading language files',
        {
          path: this.root,
          error: e.message,
        },
        'Lang'
      );
    }
  }

  /**
   * Switches the active language.
   *
   * @param lang - The language code to use (e.g., 'en', 'fr').
   * @returns The Lang instance (for chaining).
   * @throws `LangError` If the language is not loaded.
   */
  public use(lang: string): this {
    if (!isStr(lang) || !Lang.translations.has(lang)) {
      throw new LangError(`Language '${lang}' is not loaded.`);
    }

    this.lang = lang;
    return this;
  }

  /**
   * Checks if a translation key exists for a given language.
   *
   * @param key - The dot-notated key (e.g., `errors.required`).
   * @param lang - Optional language code. Defaults to the active language.
   * @returns True if the key exists, otherwise false.
   */
  public has(key: string, lang?: string): boolean {
    if (!isStr(key)) return false;
    if (!isStr(lang)) lang = this.lang;

    const data = Lang.translations.get(lang);
    if (!data) return false;
    return this.getNested(data, key) !== undefined;
  }

  /**
   * Get a translation string by key using the default language and no params.
   *
   * @param key - Translation key, e.g. `errors.email.required`
   * @returns The translated string
   */
  public get(key: string): string;

  /**
   * Get a translation string by key for a specific language, no params.
   *
   * @param key - Translation key
   * @param lang - Language code, e.g. `fr`
   * @returns The translated string in the specified language
   */
  public get(key: string, lang: string): string;

  /**
   * Get a translation string by key with parameters, using default language.
   *
   * @param key - Translation key
   * @param params - Params for string interpolation, e.g. { email: `foo@bar.com` }
   * @returns The translated and formatted string
   */
  public get(key: string, params: Params): string;

  /**
   * Get a translation string by key with parameters for a specific language.
   *
   * @param key - Translation key
   * @param lang - Language code
   * @param params - Params for string interpolation
   * @returns The translated and formatted string
   */
  public get(key: string, lang: string, params: Params): string;

  /**
   * Get a translation string by key with parameters for a specific language.
   *
   * @param key - Translation key
   * @param params - Params for string interpolation
   * @param lang - Language code
   * @returns The translated and formatted string
   */
  public get(key: string, params: Params, lang: string): string;

  /**
   * Implementation handling overloads. Accepts `key` and flexible params/lang arguments.
   *
   * @param args - Arguments array: [key, string|Params?, Params|string?]
   * @returns The translated and formatted string
   */
  public get(...args: Array<string | Params>): string {
    const [key, _1, _2] = args;

    if (!isStr(key)) {
      throw new LangError(`Invalid lang key '${String(key)}'`);
    }

    let lang = isStr(_1) ? _1 : _2;
    let params = isObj(_1) ? _1 : _2;

    if (!isStr(lang)) lang = this.lang;
    if (!isObj(params)) params = {};

    const data = Lang.translations.get(lang);
    let text = data ? this.getNested(data, key) : null;

    if (!isStr(text)) {
      throw new LangError(`Missing translation for key '${key}' in '${lang}'`);
    }

    return format(text, params);
  }

  /**
   * Safely retrieves a nested value from a translation object using dot notation.
   *
   * @param obj - The root translation object (e.g., { user: { name: "John" } }).
   * @param key - The dot-notated key path (e.g., "user.name").
   * @returns The nested string value if found, otherwise `undefined`.
   */
  private getNested(obj: Translations, key: string): string | void {
    if (!isObj(obj) || !isStr(key)) return undefined;
    return key.split('.').reduce((obj, key) => {
      if (isObj(obj) && isStr(key) && key in obj) return obj[key];
      return undefined;
    }, obj);
  }
}

/**
 * Get a translation string by key using the default language and no params.
 *
 * @param key - Translation key, e.g. `errors.email.required`
 * @returns The translated string
 */
export function lang(key: string): string;

/**
 * Get a translation string by key for a specific language, no params.
 *
 * @param key - Translation key
 * @param lang - Language code, e.g. `fr`
 * @returns The translated string in the specified language
 */
export function lang(key: string, lang: string): string;

/**
 * Get a translation string by key with parameters, using default language.
 *
 * @param key - Translation key
 * @param params - Params for string interpolation, e.g. { email: `foo@bar.com` }
 * @returns The translated and formatted string
 */
export function lang(key: string, params: Params): string;

/**
 * Get a translation string by key with parameters for a specific language.
 *
 * @param key - Translation key
 * @param lang - Language code
 * @param params - Params for string interpolation
 * @returns The translated and formatted string
 */
export function lang(key: string, lang: string, params: Params): string;

/**
 * Get a translation string by key with parameters for a specific language.
 *
 * @param key - Translation key
 * @param params - Params for string interpolation
 * @param lang - Language code
 * @returns The translated and formatted string
 */
export function lang(key: string, params: Params, lang: string): string;

/**
 * Implementation handling overloads. Accepts `key` and flexible params/lang arguments.
 *
 * @param args - Arguments array: [key, string|Params?, Params|string?]
 * @returns The translated and formatted string
 */
export function lang(...args: Array<string | Params>): string {
  // @ts-ignore
  return new Lang().get(...args);
}
