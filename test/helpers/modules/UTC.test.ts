import {
  getDateTime,
  getDate,
  getTime,
  getYear,
  getMonth,
  getDay,
  getHour,
  getMinute,
  getSecond,
  setYear,
  setMonth,
  setDay,
  setHour,
  setMinute,
  addSeconds,
  addYears,
  addMonths,
  addDays,
  addHours,
  addMinutes,
  formatDate,
  parseDate,
  parseTime,
  removeDays,
  removeHours,
  removeMinutes,
  removeMonths,
  removeSeconds,
  removeYears,
  setSecond,
  toUTC,
  UTCError,
} from '../../../src/helpers';

describe('formatDate', () => {
  test('formats a valid Date object to the correct string format', () => {
    const inputDate = new Date('2024-10-24T10:00:00Z');
    const result = formatDate(inputDate);
    expect(result).toBe('2024-10-24 10:00:00');
  });

  test('throws an error if an invalid date object is provided', () => {
    const invalidDate = '2024-10-24T10:00:00Z'; // String, not a Date object
    expect(() => formatDate(invalidDate as any)).toThrow('Invalid date object');
  });
});

describe('parseDate', () => {
  test('should extract the date part from a valid datetime string', () => {
    const result = parseDate('2024-10-24 10:00:00');
    expect(result).toBe('2024-10-24');
  });

  test('should throw an error for an invalid datetime string', () => {
    expect(() => parseDate('invalid-datetime')).toThrow(
      'Invalid datetime: invalid-datetime'
    );
  });
});

describe('parseTime', () => {
  test('should extract the time part from a valid datetime string', () => {
    const result = parseTime('2024-10-24 10:00:00');
    expect(result).toBe('10:00:00');
  });

  test('should throw an error for an invalid datetime string', () => {
    expect(() => parseTime('invalid-datetime')).toThrow(
      'Invalid datetime: invalid-datetime'
    );
  });
});

describe('toUTC', () => {
  test('should throw UTCError for invalid datetime', () => {
    const datetime1 = 'invalid-datetime';
    const datetime2 = 123 as any;
    const timezone = 'Europe/London';

    expect(() => toUTC(datetime1, timezone)).toThrow(UTCError);
    expect(() => toUTC(datetime2, timezone)).toThrow(UTCError);
  });

  test('should throw UTCError for invalid timezone', () => {
    const datetime = '2024-06-15 12:00:00';
    const timezone1 = 'invalid-timezone';
    const timezone2 = 123 as any;

    expect(() => toUTC(datetime, timezone1)).toThrow(UTCError);
    expect(() => toUTC(datetime, timezone2)).toThrow(UTCError);
  });

  test('should handle a timezone with extreme offsets', () => {
    const datetime = '2024-12-31 23:59:59';
    const timezone = 'Pacific/Kiritimati'; // UTC+14:00

    const result = toUTC(datetime, timezone);
    expect(result).toBe('2024-12-31 09:59:59'); // Adjust for the expected output
  });

  test('should handle daylight saving time transitions', () => {
    const datetime = '2024-03-31 01:30:00';
    const timezone = 'Europe/London'; // DST begins at 01:00 UTC

    const result = toUTC(datetime, timezone);
    expect(result).toBe('2024-03-31 00:30:00'); // Adjust for the expected output
  });

  test('should handle standard time', () => {
    const datetime = '2024-12-15 15:00:00';
    const timezone = 'America/New_York'; // UTC-5 during standard time

    const result = toUTC(datetime, timezone);
    expect(result).toBe('2024-12-15 20:00:00'); // Adjust for the expected output
  });

  test('should handle multiple-hour differences', () => {
    const datetime = '2024-06-15 12:00:00';
    const timezone = 'Asia/Tokyo'; // UTC+9

    const result = toUTC(datetime, timezone);
    expect(result).toBe('2024-06-15 03:00:00'); // Adjust for the expected output
  });

  test('should handle fractional-hour timezones', () => {
    const datetime = '2024-06-15 12:00:00';
    const timezone = 'Asia/Kolkata'; // UTC+5:30

    const result = toUTC(datetime, timezone);
    expect(result).toBe('2024-06-15 06:30:00'); // Adjust for the expected output
  });

  test('should handle negative UTC offsets', () => {
    const datetime = '2024-06-15 12:00:00';
    const timezone = 'America/Los_Angeles'; // UTC-7 during daylight saving

    const result = toUTC(datetime, timezone);
    expect(result).toBe('2024-06-15 19:00:00'); // Adjust for the expected output
  });

  test('should handle a timezone at UTC', () => {
    const datetime = '2024-06-15 12:00:00';
    const timezone = 'UTC';

    const result = toUTC(datetime, timezone);
    expect(result).toBe('2024-06-15 12:00:00'); // UTC input matches UTC output
  });
});

describe('get', () => {
  const validDatetime = '2024-06-15 12:00:00';

  describe('getDateTime', () => {
    test('should return the current UTC datetime in YYYY-MM-DD HH:MM:SS format', () => {
      const result = getDateTime();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('getDate', () => {
    test('should return the current UTC date in YYYY-MM-DD format', () => {
      const result = getDate();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('should return the date portion of a valid datetime', () => {
      const result = getDate(validDatetime);
      expect(result).toBe('2024-06-15');
    });

    test('should throw UTCError for an invalid datetime', () => {
      expect(() => getDate('invalid-datetime')).toThrow(UTCError);
    });
  });

  describe('getTime', () => {
    test('should return the current UTC time in hh:mm:ss format', () => {
      const result = getTime();
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    test('should return the time portion of a valid datetime', () => {
      const result = getTime(validDatetime);
      expect(result).toBe('12:00:00');
    });

    test('should throw UTCError for an invalid datetime', () => {
      expect(() => getTime('invalid-datetime')).toThrow(UTCError);
    });
  });

  describe('getYear', () => {
    test('should return the current UTC year', () => {
      const year = new Date().getUTCFullYear();
      expect(getYear()).toBe(year);
    });

    test('should return the year from a valid datetime', () => {
      expect(getYear(validDatetime)).toBe(2024);
    });

    test('should throw UTCError for an invalid datetime', () => {
      expect(() => getYear('invalid-datetime')).toThrow(UTCError);
    });
  });

  describe('getMonth', () => {
    test('should return the current UTC month (0-11)', () => {
      const month = new Date().getUTCMonth();
      expect(getMonth()).toBe(month);
    });

    test('should return the month from a valid datetime', () => {
      expect(getMonth(validDatetime)).toBe(5); // June is month 5 in zero-based indexing
    });

    test('should throw UTCError for an invalid datetime', () => {
      expect(() => getMonth('invalid-datetime')).toThrow(UTCError);
    });
  });

  describe('getDay', () => {
    test('should return the current UTC day of the month', () => {
      const day = new Date().getUTCDate();
      expect(getDay()).toBe(day);
    });

    test('should return the day from a valid datetime', () => {
      expect(getDay(validDatetime)).toBe(15);
    });

    test('should throw UTCError for an invalid datetime', () => {
      expect(() => getDay('invalid-datetime')).toThrow(UTCError);
    });
  });

  describe('getHour', () => {
    test('should return the current UTC hour', () => {
      const hour = new Date().getUTCHours();
      expect(getHour()).toBe(hour);
    });

    test('should return the hour from a valid datetime', () => {
      expect(getHour(validDatetime)).toBe(12);
    });

    test('should throw UTCError for an invalid datetime', () => {
      expect(() => getHour('invalid-datetime')).toThrow(UTCError);
    });
  });

  describe('getMinute', () => {
    test('should return the current UTC minute', () => {
      const minute = new Date().getUTCMinutes();
      expect(getMinute()).toBe(minute);
    });

    test('should return the minute from a valid datetime', () => {
      expect(getMinute(validDatetime)).toBe(0);
    });

    test('should throw UTCError for an invalid datetime', () => {
      expect(() => getMinute('invalid-datetime')).toThrow(UTCError);
    });
  });

  describe('getSecond', () => {
    test('should return the current UTC second', () => {
      const second = new Date().getUTCSeconds();
      expect(getSecond()).toBe(second);
    });

    test('should return the second from a valid datetime', () => {
      expect(getSecond(validDatetime)).toBe(0);
    });

    test('should throw UTCError for an invalid datetime', () => {
      expect(() => getSecond('invalid-datetime')).toThrow(UTCError);
    });
  });
});

describe('set', () => {
  const validDatetime = '2024-11-27 10:00:00';

  describe('setYear()', () => {
    it('should set the year correctly', () => {
      const result = setYear(validDatetime, 2025);
      expect(result).toBe('2025-11-27 10:00:00');
    });

    it('should throw an error for invalid datetime', () => {
      expect(() => setYear('invalid-datetime', 2025)).toThrow(UTCError);
    });

    it('should throw an error for invalid year', () => {
      expect(() => setYear(validDatetime, -1)).toThrow(UTCError);
      expect(() => setYear(validDatetime, 'not-a-number' as any)).toThrow(
        UTCError
      );
    });
  });

  describe('setMonth()', () => {
    // First and last month check
    it('should set the first month correctly', () => {
      const result = setMonth(validDatetime, 0); // January
      expect(result).toBe('2024-01-27 10:00:00');
    });

    it('should set the last month correctly', () => {
      const result = setMonth(validDatetime, 11); // December
      expect(result).toBe('2024-12-27 10:00:00');
    });

    it('should throw an error for invalid datetime', () => {
      expect(() => setMonth('invalid-datetime', 5)).toThrow(UTCError);
    });

    it('should throw an error for invalid month', () => {
      expect(() => setMonth(validDatetime, -1)).toThrow(UTCError);
      expect(() => setMonth(validDatetime, 12)).toThrow(UTCError);
    });
  });

  describe('setDay()', () => {
    // First and last day check
    it('should set the first day correctly', () => {
      const result = setDay(validDatetime, 1);
      expect(result).toBe('2024-11-01 10:00:00');
    });

    it('should set the last day correctly', () => {
      const result = setDay('2024-01-12 10:00:00', 31);
      expect(result).toBe('2024-01-31 10:00:00');
    });

    it('should throw an error for invalid datetime', () => {
      expect(() => setDay('invalid-datetime', 15)).toThrow(UTCError);
    });

    it('should throw an error for invalid day', () => {
      expect(() => setDay(validDatetime, 32)).toThrow(UTCError);
      expect(() => setDay(validDatetime, 0)).toThrow(UTCError);
    });
  });

  describe('setHour()', () => {
    // First and last hour check
    it('should set the first hour correctly', () => {
      const result = setHour(validDatetime, 0); // Midnight
      expect(result).toBe('2024-11-27 00:00:00');
    });

    it('should set the last hour correctly', () => {
      const result = setHour(validDatetime, 23); // 11 PM
      expect(result).toBe('2024-11-27 23:00:00');
    });

    it('should throw an error for invalid datetime', () => {
      expect(() => setHour('invalid-datetime', 14)).toThrow(UTCError);
    });

    it('should throw an error for invalid hour', () => {
      expect(() => setHour(validDatetime, -1)).toThrow(UTCError);
      expect(() => setHour(validDatetime, 24)).toThrow(UTCError);
    });
  });

  describe('setMinute()', () => {
    // First and last minute check
    it('should set the first minute correctly', () => {
      const result = setMinute(validDatetime, 0); // First minute
      expect(result).toBe('2024-11-27 10:00:00');
    });

    it('should set the last minute correctly', () => {
      const result = setMinute(validDatetime, 59); // Last minute
      expect(result).toBe('2024-11-27 10:59:00');
    });

    it('should throw an error for invalid datetime', () => {
      expect(() => setMinute('invalid-datetime', 45)).toThrow(UTCError);
    });

    it('should throw an error for invalid minute', () => {
      expect(() => setMinute(validDatetime, -1)).toThrow(UTCError);
      expect(() => setMinute(validDatetime, 60)).toThrow(UTCError);
    });
  });

  describe('setSecond()', () => {
    // First and last second check
    it('should set the first second correctly', () => {
      const result = setSecond(validDatetime, 0); // First second
      expect(result).toBe('2024-11-27 10:00:00');
    });

    it('should set the last second correctly', () => {
      const result = setSecond(validDatetime, 59); // Last second
      expect(result).toBe('2024-11-27 10:00:59');
    });

    it('should throw an error for invalid datetime', () => {
      expect(() => setSecond('invalid-datetime', 30)).toThrow(UTCError);
    });

    it('should throw an error for invalid second', () => {
      expect(() => setSecond(validDatetime, -1)).toThrow(UTCError);
      expect(() => setSecond(validDatetime, 60)).toThrow(UTCError);
    });
  });
});

describe('add', () => {
  describe('addYears', () => {
    test('adds years to current UTC datetime', () => {
      const result = addYears(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCFullYear(currentDate.getUTCFullYear() + 100)
      );
      expect(result).toBe(formatDate(expected)); // Replace with expected formatted string
    });

    test('adds years to a given datetime', () => {
      const result = addYears(1, '2024-01-01 00:00:00');
      expect(result).toBe('2025-01-01 00:00:00');
    });

    test('throws error for invalid number of years', () => {
      expect(() => addYears(-1)).toThrow('Invalid number of years');
      expect(() => addYears('invalid' as any)).toThrow(
        'Invalid number of years'
      );
    });

    test('throws error for invalid datetime', () => {
      expect(() => addYears(1, 'invalid-datetime')).toThrow('Invalid datetime');
    });
  });

  describe('addMonths', () => {
    test('adds months to current UTC datetime', () => {
      const result = addMonths(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCMonth(currentDate.getUTCMonth() + 100)
      );
      expect(result).toBe(formatDate(expected));
    });

    test('adds months to a given datetime', () => {
      const result = addMonths(6, '2024-01-01 00:00:00');
      expect(result).toBe('2024-07-01 00:00:00');
    });

    test('throws error for invalid number of months', () => {
      expect(() => addMonths(-3)).toThrow('Invalid number of months');
      expect(() => addMonths('invalid' as any)).toThrow(
        'Invalid number of months'
      );
    });

    test('throws error for invalid datetime', () => {
      expect(() => addMonths(3, 'invalid-datetime')).toThrow(
        'Invalid datetime'
      );
    });
  });

  describe('addDays', () => {
    test('adds days to current UTC datetime', () => {
      const result = addDays(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCDate(currentDate.getUTCDate() + 100)
      );
      expect(result).toBe(formatDate(expected));
    });

    test('adds days to a given datetime', () => {
      const result = addDays(5, '2024-01-01 00:00:00');
      expect(result).toBe('2024-01-06 00:00:00');
    });

    test('throws error for invalid number of days', () => {
      expect(() => addDays(-5)).toThrow('Invalid number of days');
      expect(() => addDays('invalid' as any)).toThrow('Invalid number of days');
    });

    test('throws error for invalid datetime', () => {
      expect(() => addDays(10, 'invalid-datetime')).toThrow('Invalid datetime');
    });
  });

  describe('addHours', () => {
    test('adds hours to current UTC datetime', () => {
      const result = addHours(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCHours(currentDate.getUTCHours() + 100)
      );
      expect(result).toBe(formatDate(expected));
    });

    test('adds hours to a given datetime', () => {
      const result = addHours(3, '2024-01-01 00:00:00');
      expect(result).toBe('2024-01-01 03:00:00');
    });

    test('throws error for invalid number of hours', () => {
      expect(() => addHours(-5)).toThrow('Invalid number of hours');
      expect(() => addHours('invalid' as any)).toThrow(
        'Invalid number of hours'
      );
    });

    test('throws error for invalid datetime', () => {
      expect(() => addHours(5, 'invalid-datetime')).toThrow('Invalid datetime');
    });
  });

  describe('addMinutes', () => {
    test('adds minutes to current UTC datetime', () => {
      const result = addMinutes(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCMinutes(currentDate.getUTCMinutes() + 100)
      );
      expect(result).toBe(formatDate(expected));
    });

    test('adds minutes to a given datetime', () => {
      const result = addMinutes(15, '2024-01-01 00:00:00');
      expect(result).toBe('2024-01-01 00:15:00');
    });

    test('throws error for invalid number of minutes', () => {
      expect(() => addMinutes(-10)).toThrow('Invalid number of minutes');
      expect(() => addMinutes('invalid' as any)).toThrow(
        'Invalid number of minutes'
      );
    });

    test('throws error for invalid datetime', () => {
      expect(() => addMinutes(30, 'invalid-datetime')).toThrow(
        'Invalid datetime'
      );
    });
  });

  describe('addSeconds', () => {
    test('adds seconds to current UTC datetime', () => {
      const result = addSeconds(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCSeconds(currentDate.getUTCSeconds() + 100)
      );
      expect(result).toBe(formatDate(expected));
    });

    test('adds seconds to a given datetime', () => {
      const result = addSeconds(45, '2024-01-01 00:00:00');
      expect(result).toBe('2024-01-01 00:00:45');
    });

    test('throws error for invalid number of seconds', () => {
      expect(() => addSeconds(-60)).toThrow('Invalid number of seconds');
      expect(() => addSeconds('invalid' as any)).toThrow(
        'Invalid number of seconds'
      );
    });

    test('throws error for invalid datetime', () => {
      expect(() => addSeconds(60, 'invalid-datetime')).toThrow(
        'Invalid datetime'
      );
    });
  });
});

describe('remove', () => {
  describe('removeYears', () => {
    test('removes years to current UTC datetime', () => {
      const result = removeYears(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCFullYear(currentDate.getUTCFullYear() - 100)
      );
      expect(result).toBe(formatDate(expected)); // Replace with expected formatted string
    });

    test('removes years to a given datetime', () => {
      const result = removeYears(1, '2024-01-01 00:00:00');
      expect(result).toBe('2023-01-01 00:00:00');
    });

    test('throws error for invalid number of years', () => {
      expect(() => removeYears(-1)).toThrow('Invalid number of years');
      expect(() => removeYears('invalid' as any)).toThrow(
        'Invalid number of years'
      );
    });

    test('throws error for invalid datetime', () => {
      expect(() => removeYears(1, 'invalid-datetime')).toThrow(
        'Invalid datetime'
      );
    });
  });

  describe('removeMonths', () => {
    test('removes months to current UTC datetime', () => {
      const result = removeMonths(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCMonth(currentDate.getUTCMonth() - 100)
      );
      expect(result).toBe(formatDate(expected));
    });

    test('removes months to a given datetime', () => {
      const result = removeMonths(6, '2024-07-01 00:00:00');
      expect(result).toBe('2024-01-01 00:00:00');
    });

    test('throws error for invalid number of months', () => {
      expect(() => removeMonths(-3)).toThrow('Invalid number of months');
      expect(() => removeMonths('invalid' as any)).toThrow(
        'Invalid number of months'
      );
    });

    test('throws error for invalid datetime', () => {
      expect(() => removeMonths(3, 'invalid-datetime')).toThrow(
        'Invalid datetime'
      );
    });
  });

  describe('removeDays', () => {
    test('removes days to current UTC datetime', () => {
      const result = removeDays(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCDate(currentDate.getUTCDate() - 100)
      );
      expect(result).toBe(formatDate(expected));
    });

    test('removes days to a given datetime', () => {
      const result = removeDays(5, '2024-01-10 00:00:00');
      expect(result).toBe('2024-01-05 00:00:00');
    });

    test('throws error for invalid number of days', () => {
      expect(() => removeDays(-5)).toThrow('Invalid number of days');
      expect(() => removeDays('invalid' as any)).toThrow(
        'Invalid number of days'
      );
    });

    test('throws error for invalid datetime', () => {
      expect(() => removeDays(10, 'invalid-datetime')).toThrow(
        'Invalid datetime'
      );
    });
  });

  describe('removeHours', () => {
    test('removes hours to current UTC datetime', () => {
      const result = removeHours(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCHours(currentDate.getUTCHours() - 100)
      );
      expect(result).toBe(formatDate(expected));
    });

    test('removes hours to a given datetime', () => {
      const result = removeHours(3, '2024-01-01 03:00:00');
      expect(result).toBe('2024-01-01 00:00:00');
    });

    test('throws error for invalid number of hours', () => {
      expect(() => removeHours(-5)).toThrow('Invalid number of hours');
      expect(() => removeHours('invalid' as any)).toThrow(
        'Invalid number of hours'
      );
    });

    test('throws error for invalid datetime', () => {
      expect(() => removeHours(5, 'invalid-datetime')).toThrow(
        'Invalid datetime'
      );
    });
  });

  describe('removeMinutes', () => {
    test('removes minutes to current UTC datetime', () => {
      const result = removeMinutes(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCMinutes(currentDate.getUTCMinutes() - 100)
      );
      expect(result).toBe(formatDate(expected));
    });

    test('removes minutes to a given datetime', () => {
      const result = removeMinutes(15, '2024-01-01 00:15:00');
      expect(result).toBe('2024-01-01 00:00:00');
    });

    test('throws error for invalid number of minutes', () => {
      expect(() => removeMinutes(-10)).toThrow('Invalid number of minutes');
      expect(() => removeMinutes('invalid' as any)).toThrow(
        'Invalid number of minutes'
      );
    });

    test('throws error for invalid datetime', () => {
      expect(() => removeMinutes(30, 'invalid-datetime')).toThrow(
        'Invalid datetime'
      );
    });
  });

  describe('removeSeconds', () => {
    test('removes seconds to current UTC datetime', () => {
      const result = removeSeconds(100);
      const currentDate = new Date();
      const expected = new Date(
        currentDate.setUTCSeconds(currentDate.getUTCSeconds() - 100)
      );
      expect(result).toBe(formatDate(expected));
    });

    test('removes seconds to a given datetime', () => {
      const result = removeSeconds(45, '2024-01-01 00:00:45');
      expect(result).toBe('2024-01-01 00:00:00');
    });

    test('throws error for invalid number of seconds', () => {
      expect(() => removeSeconds(-60)).toThrow('Invalid number of seconds');
      expect(() => removeSeconds('invalid' as any)).toThrow(
        'Invalid number of seconds'
      );
    });

    test('throws error for invalid datetime', () => {
      expect(() => removeSeconds(60, 'invalid-datetime')).toThrow(
        'Invalid datetime'
      );
    });
  });
});
