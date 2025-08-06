import { chrono, Chrono, diff } from '../../src/helpers/Chrono';

const now = Date.now();
const fromNow = (ms: number) => new Date(now - ms);

describe('chrono', () => {
  describe('Default language fallback', () => {
    test('uses "en" when no language is provided', () => {
      expect(chrono(fromNow(1000))).toBe('1 second ago');
    });

    test('uses "en" when unknown language is passed', () => {
      expect(chrono(fromNow(1000), 'unknown')).toBe('1 second ago');
    });
  });

  describe('ENGLISH template', () => {
    describe('now()', () => {
      test('returns "just now" when diff is 0', () => {
        expect(chrono(fromNow(0), 'en')).toBe('just now');
      });
    });

    describe('second()', () => {
      test('returns "1 second ago"', () => {
        expect(chrono(fromNow(1_000), 'en')).toBe('1 second ago');
      });

      test('returns "2 seconds ago"', () => {
        expect(chrono(fromNow(2_000), 'en')).toBe('2 seconds ago');
      });
    });

    describe('minute()', () => {
      test('returns "1 minute ago"', () => {
        expect(chrono(fromNow(60_000), 'en')).toBe('1 minute ago');
      });

      test('returns "2 minutes ago"', () => {
        expect(chrono(fromNow(2 * 60_000), 'en')).toBe('2 minutes ago');
      });
    });

    describe('hour()', () => {
      test('returns "1 hour ago"', () => {
        expect(chrono(fromNow(60 * 60_000), 'en')).toBe('1 hour ago');
      });

      test('returns "2 hours ago"', () => {
        expect(chrono(fromNow(2 * 60 * 60_000), 'en')).toBe('2 hours ago');
      });
    });

    describe('day()', () => {
      test('returns "1 day ago"', () => {
        expect(chrono(fromNow(24 * 60 * 60_000), 'en')).toBe('1 day ago');
      });

      test('returns "2 days ago"', () => {
        expect(chrono(fromNow(2 * 24 * 60 * 60_000), 'en')).toBe('2 days ago');
      });
    });

    describe('month()', () => {
      test('returns "1 month ago"', () => {
        expect(chrono(fromNow(30 * 24 * 60 * 60_000), 'en')).toBe(
          '1 month ago'
        );
      });

      test('returns "2 months ago"', () => {
        expect(chrono(fromNow(2 * 30 * 24 * 60 * 60_000), 'en')).toBe(
          '2 months ago'
        );
      });
    });

    describe('year()', () => {
      test('returns "1 year ago"', () => {
        expect(chrono(fromNow(365 * 24 * 60 * 60_000), 'en')).toBe(
          '1 year ago'
        );
      });

      test('returns "2 years ago"', () => {
        expect(chrono(fromNow(2 * 365 * 24 * 60 * 60_000), 'en')).toBe(
          '2 years ago'
        );
      });
    });
  });

  describe('FRENCH template', () => {
    describe('now()', () => {
      test('returns "à l\'instant" when diff is 0', () => {
        expect(chrono(fromNow(0), 'fr')).toBe("à l'instant");
      });
    });

    describe('second()', () => {
      test('returns "il y a 1 seconde"', () => {
        expect(chrono(fromNow(1_000), 'fr')).toBe('il y a 1 seconde');
      });

      test('returns "il y a 2 secondes"', () => {
        expect(chrono(fromNow(2_000), 'fr')).toBe('il y a 2 secondes');
      });
    });

    describe('minute()', () => {
      test('returns "il y a 1 minute"', () => {
        expect(chrono(fromNow(60_000), 'fr')).toBe('il y a 1 minute');
      });

      test('returns "il y a 2 minutes"', () => {
        expect(chrono(fromNow(2 * 60_000), 'fr')).toBe('il y a 2 minutes');
      });
    });

    describe('hour()', () => {
      test('returns "il y a 1 heure"', () => {
        expect(chrono(fromNow(60 * 60_000), 'fr')).toBe('il y a 1 heure');
      });

      test('returns "il y a 2 heures"', () => {
        expect(chrono(fromNow(2 * 60 * 60_000), 'fr')).toBe('il y a 2 heures');
      });
    });

    describe('day()', () => {
      test('returns "il y a 1 jour"', () => {
        expect(chrono(fromNow(24 * 60 * 60_000), 'fr')).toBe('il y a 1 jour');
      });

      test('returns "il y a 2 jours"', () => {
        expect(chrono(fromNow(2 * 24 * 60 * 60_000), 'fr')).toBe(
          'il y a 2 jours'
        );
      });
    });

    describe('month()', () => {
      test('returns "il y a 1 mois"', () => {
        expect(chrono(fromNow(30 * 24 * 60 * 60_000), 'fr')).toBe(
          'il y a 1 mois'
        );
      });

      test('returns "il y a 2 mois"', () => {
        expect(chrono(fromNow(2 * 30 * 24 * 60 * 60_000), 'fr')).toBe(
          'il y a 2 mois'
        );
      });
    });

    describe('year()', () => {
      test('returns "il y a 1 an"', () => {
        expect(chrono(fromNow(365 * 24 * 60 * 60_000), 'fr')).toBe(
          'il y a 1 an'
        );
      });

      test('returns "il y a 2 ans"', () => {
        expect(chrono(fromNow(2 * 365 * 24 * 60 * 60_000), 'fr')).toBe(
          'il y a 2 ans'
        );
      });
    });
  });

  describe('Input types', () => {
    test('accepts ISO date string', () => {
      const iso = new Date(fromNow(2000)).toISOString();
      expect(chrono(iso)).toBe('2 seconds ago');
    });

    test('accepts date string with space (yyyy-mm-dd hh:mm:ss)', () => {
      const d = new Date(fromNow(60_000))
        .toISOString()
        .replace('T', ' ')
        .slice(0, 19);
      expect(chrono(d)).toBe('1 minute ago');
    });

    test('accepts timestamp (number)', () => {
      expect(chrono(fromNow(3600_000).getTime())).toBe('1 hour ago');
    });

    test('accepts Date instance', () => {
      expect(chrono(new Date(now - 86_400_000))).toBe('1 day ago');
    });
  });

  describe('Invalid input', () => {
    test('returns just now for non-date string', () => {
      expect(chrono('hello')).toBe('just now');
    });

    test('returns just now for undefined', () => {
      expect(chrono(undefined as any)).toBe('just now');
    });

    test('returns just now for null', () => {
      expect(chrono(null as any)).toBe('just now');
    });

    test('returns just now for object', () => {
      expect(chrono({} as any)).toBe('just now');
    });

    test('falls back to "en" if lang is invalid or missing', () => {
      const past = new Date(Date.now() - 1000);
      expect(chrono(past)).toBe('1 second ago');
    });

    test('returns "just now" if date is NaN', () => {
      const badDate = '2025-13-99T99:99:99Z';
      expect(chrono(badDate, 'en')).toBe('just now');
    });
  });

  describe('Future dates', () => {
    test('returns now() string if the date is in the future', () => {
      expect(chrono(new Date(now + 100_000), 'en')).toBe('just now');
      expect(chrono(new Date(now + 100_000), 'fr')).toBe("à l'instant");
    });
  });
});

describe('diff() alias', () => {
  test('returns same result as chrono()', () => {
    const date = fromNow(5_000);
    expect(diff(date, 'en')).toBe(chrono(date, 'en'));
    expect(diff(date, 'fr')).toBe(chrono(date, 'fr'));
  });

  test('works with invalid inputs just like chrono()', () => {
    expect(diff('invalid', 'en')).toBe('just now');
    expect(diff('invalid', 'fr')).toBe("à l'instant");
  });
});

describe('Chrono.set()', () => {
  test('throws if lang is not a string', () => {
    expect(() => Chrono.set(123 as any, {} as any)).toThrow(
      'Language code must be a string'
    );
  });

  test('throws if language already exists', () => {
    expect(() => Chrono.set('en', {} as any)).toThrow(
      'Language code already exist'
    );
  });

  test('throws if template is not an object', () => {
    expect(() => Chrono.set('xx', undefined as any)).toThrow(
      'Expected an object but recived undefined'
    );
  });

  test('throws if any required template function is missing', () => {
    expect(() =>
      Chrono.set('xx', {
        now: () => 'x',
        second: () => 'x',
        minute: () => 'x',
        hour: () => 'x',
        day: () => 'x',
        month: () => 'x',
        // missing 'year'
      } as any)
    ).toThrow("Invalid or missing 'year' function.");
  });

  test('can register a new valid language (es)', () => {
    expect(() =>
      Chrono.set('es', {
        now: () => 'justo ahora',
        second: (n) => `${n} segundo${n === 1 ? '' : 's'} atrás`,
        minute: (n) => `${n} minuto${n === 1 ? '' : 's'} atrás`,
        hour: (n) => `${n} hora${n === 1 ? '' : 's'} atrás`,
        day: (n) => `${n} día${n === 1 ? '' : 's'} atrás`,
        month: (n) => `${n} mes${n === 1 ? '' : 'es'} atrás`,
        year: (n) => `${n} año${n === 1 ? '' : 's'} atrás`,
      })
    ).not.toThrow();

    expect(chrono(Date.now() - 1000, 'es')).toBe('1 segundo atrás');
    expect(chrono(Date.now() - 2000, 'es')).toBe('2 segundos atrás');
  });
});
