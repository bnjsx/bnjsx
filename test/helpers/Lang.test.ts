jest.mock('fs');

const options = {
  lang: {
    default: 'en',
    root: './lang',
  },
};

// Mock config
jest.mock('../../src/config', () => ({
  config: () => ({
    loadSync: () => options,
    resolveSync: () => __dirname,
  }),
}));

import { Lang, lang, LangError } from '../../src/helpers/Lang';
import * as helpers from '../../src/helpers';
import fs from 'fs';
import { resolve } from 'path';

// Silence console logs
const warnSPY = jest.spyOn(helpers, 'warn').mockImplementation(() => {});

describe('Lang class', () => {
  beforeEach(() => {
    Lang['instance'] = null;
    Lang['translations'].clear();

    // @ts-ignore
    fs.existsSync.mockReturnValue(true);

    // @ts-ignore
    fs.readdirSync.mockReturnValue(['en.json', 'fr.json']);

    // @ts-ignore
    fs.readFileSync.mockImplementation((path) => {
      if (path.endsWith('en.json')) {
        return JSON.stringify({
          greeting: 'Hello, :name!',
          errors: {
            not_found: 'Item not found',
          },
        });
      } else if (path.endsWith('fr.json')) {
        return JSON.stringify({
          greeting: 'Bonjour, :name!',
          errors: {
            not_found: 'Élément non trouvé',
          },
        });
      }

      return '';
    });
  });

  describe('constructor()', () => {
    test('should load translations and set defaults', () => {
      const instance = new Lang();
      expect(instance['lang']).toBe('en');
      expect(Lang['translations'].has('en')).toBe(true);
      expect(Lang['translations'].has('fr')).toBe(true);
      expect(instance['root']).toBe(resolve(__dirname, './lang'));
    });

    test('should reuse existing singleton', () => {
      const one = new Lang();
      const two = new Lang();
      expect(one).toBe(two);
    });

    test('should fallback to default lang/root if missing or invalid', () => {
      options.lang = null as any;
      const instance = new Lang();
      expect(instance['lang']).toBe('en');
      expect(instance['root']).toBe(resolve(__dirname, './lang'));
      options.lang = { default: 'en', root: './lang' }; // reset
    });

    test('should resolve non-absolute root paths', () => {
      options.lang.root = './lang';
      const instance = new Lang();
      expect(instance['root']).toBe(resolve(__dirname, './lang'));
    });

    test('should handle missing language folder', () => {
      (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
      new Lang();
      expect(warnSPY).toHaveBeenCalledWith(
        'No language folder found',
        expect.anything(),
        'Lang'
      );
    });

    test('should handle empty language folder', () => {
      (fs.readdirSync as jest.Mock).mockReturnValueOnce([]);
      new Lang();
      expect(warnSPY).toHaveBeenCalledWith(
        'No language files found',
        expect.anything(),
        'Lang'
      );
    });

    test('should skip non-json files', () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['readme.txt', 'en.json']);
      new Lang();
      expect(Lang['translations'].has('en')).toBe(true);
      expect(Lang['translations'].has('readme')).toBe(false);
    });

    test('should handle missing lang files', () => {
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to load file');
      });
      new Lang();
      expect(warnSPY).toHaveBeenCalledWith(
        'Failed to load translation file',
        expect.objectContaining({ error: expect.any(String) }),
        'Lang'
      );
    });

    test('should handle unexpected error during load()', () => {
      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected FS error');
      });

      new Lang();
      expect(warnSPY).toHaveBeenCalledWith(
        'Error while loading language files',
        expect.objectContaining({ error: 'Unexpected FS error' }),
        'Lang'
      );
    });
  });

  describe('use()', () => {
    test('changes language when valid', () => {
      const instance = new Lang();
      instance.use('fr');
      expect(instance['lang']).toBe('fr');
    });

    test('throws if invalid language is passed', () => {
      const instance = new Lang();
      expect(() => instance.use('de')).toThrow(LangError);
    });
  });

  describe('has()', () => {
    test('returns true if translation key exists', () => {
      const instance = new Lang();
      expect(instance.has('errors.not_found')).toBe(true);
    });

    test('returns false if key does not exist', () => {
      const instance = new Lang();
      expect(instance.has('errors.fake')).toBe(false);
    });

    test('returns false if key is not string', () => {
      const instance = new Lang();
      expect(instance.has(null as any)).toBe(false);
    });

    test('returns false if language is not loaded', () => {
      const instance = new Lang();
      expect(instance.has('errors.not_found', 'xx')).toBe(false);
    });
  });

  describe('get()', () => {
    test('returns translated string with default language', () => {
      expect(lang('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    });

    test('returns translated string with specific language', () => {
      expect(lang('greeting', 'fr')).toBe('Bonjour, :name!');
    });

    test('formats string using params with specific language', () => {
      expect(lang('greeting', 'fr', { name: 'Claire' })).toBe(
        'Bonjour, Claire!'
      );
    });

    test('formats string when params passed first then language', () => {
      expect(lang('greeting', { name: 'Tom' }, 'fr')).toBe('Bonjour, Tom!');
    });

    test('throws LangError when translation key is missing', () => {
      expect(() => lang('missing.key')).toThrow(LangError);
    });

    test('throws LangError when key is not a string', () => {
      expect(() => lang(null as any)).toThrow(LangError);
    });

    test('throws LangError when language is not found', () => {
      expect(() => lang('greeting', 'zz')).toThrow(LangError);
    });

    test('returns unformatted string if params are missing', () => {
      expect(lang('greeting')).toBe('Hello, :name!');
    });

    test('ignores extra arguments after 3', () => {
      // @ts-ignore
      expect(lang('greeting', 'en', { name: 'Extra' }, 'extra')).toBe(
        'Hello, Extra!'
      );
    });
  });

  describe('getNested()', () => {
    const instance = new Lang();

    test('returns nested value for valid path', () => {
      const data = { a: { b: { c: 'hello' } } };
      const result = instance['getNested'](data, 'a.b.c');
      expect(result).toBe('hello');
    });

    test('returns undefined for missing path', () => {
      const data = { a: { b: {} } };
      const result = instance['getNested'](data, 'a.b.c');
      expect(result).toBeUndefined();
    });

    test('returns undefined for invalid input', () => {
      const result = instance['getNested'](null as any, 'a.b');
      expect(result).toBeUndefined();
    });
  });
});
