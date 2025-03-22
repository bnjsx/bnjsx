import { Zone, ZoneError } from '../../../src/helpers';

/**
 * Formats a Date object as a string in the format `YYYY-MM-DD hh:mm:ss`.
 *
 * @param date The Date object to format.
 * @returns A string representing the date in the format `YYYY-MM-DD hh:mm:ss`.
 */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

describe('Zone', () => {
  describe('Constructor', () => {
    test('should create Zone instance with valid datetime and timezone - America/New_York', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'America/New_York';

      const zone = new Zone(datetime, timezone);

      expect(zone.year).toBe(2024);
      expect(zone.month).toBe(6); // June
      expect(zone.day).toBe(6);
      expect(zone.hour).toBe(5); // 9:00 AM UTC is 5:00 AM in New York
      expect(zone.minute).toBe(0);
      expect(zone.second).toBe(0);
      expect(zone.timezone).toBe('America/New_York');
    });

    test('should create Zone instance with valid datetime and timezone - Europe/London', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'Europe/London';

      const zone = new Zone(datetime, timezone);

      expect(zone.year).toBe(2024);
      expect(zone.month).toBe(6); // June
      expect(zone.day).toBe(6);
      expect(zone.hour).toBe(10); // 9:00 AM UTC is 10:00 AM in London
      expect(zone.minute).toBe(0);
      expect(zone.second).toBe(0);
      expect(zone.timezone).toBe('Europe/London');
    });

    test('should create Zone instance with valid datetime and timezone - Asia/Tokyo', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'Asia/Tokyo';

      const zone = new Zone(datetime, timezone);

      expect(zone.year).toBe(2024);
      expect(zone.month).toBe(6); // June
      expect(zone.day).toBe(6);
      expect(zone.hour).toBe(18); // 9:00 AM UTC is 6:00 PM in Tokyo
      expect(zone.minute).toBe(0);
      expect(zone.second).toBe(0);
      expect(zone.timezone).toBe('Asia/Tokyo');
    });

    test('should create Zone instance with valid datetime and timezone - UTC', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'UTC';

      const zone = new Zone(datetime, timezone);

      expect(zone.year).toBe(2024);
      expect(zone.month).toBe(6); // June
      expect(zone.day).toBe(6);
      expect(zone.hour).toBe(9); // Same as input, no offset
      expect(zone.minute).toBe(0);
      expect(zone.second).toBe(0);
      expect(zone.timezone).toBe('UTC');
    });

    test('should create Zone instance with valid datetime and timezone - Pacific/Honolulu', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'Pacific/Honolulu';

      const zone = new Zone(datetime, timezone);

      expect(zone.year).toBe(2024);
      expect(zone.month).toBe(6); // June
      expect(zone.day).toBe(5); // Honolulu is UTC-10, so this is 11:00 PM the previous day
      expect(zone.hour).toBe(23);
      expect(zone.minute).toBe(0);
      expect(zone.second).toBe(0);
      expect(zone.timezone).toBe('Pacific/Honolulu');
    });

    test('should create Zone instance with valid datetime and timezone - Australia/Sydney', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'Australia/Sydney';

      const zone = new Zone(datetime, timezone);

      expect(zone.year).toBe(2024);
      expect(zone.month).toBe(6); // June
      expect(zone.day).toBe(6);
      expect(zone.hour).toBe(19); // Sydney is UTC+10
      expect(zone.minute).toBe(0);
      expect(zone.second).toBe(0);
      expect(zone.timezone).toBe('Australia/Sydney');
    });

    test('should handle Daylight Saving Time - America/Los_Angeles (DST)', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'America/Los_Angeles';

      const zone = new Zone(datetime, timezone);

      expect(zone.year).toBe(2024);
      expect(zone.month).toBe(6); // June
      expect(zone.day).toBe(6);
      expect(zone.hour).toBe(2); // Los Angeles is UTC-7 during DST
      expect(zone.minute).toBe(0);
      expect(zone.second).toBe(0);
      expect(zone.timezone).toBe('America/Los_Angeles');
    });

    test('should handle Daylight Saving Time - Europe/Berlin (DST)', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'Europe/Berlin';

      const zone = new Zone(datetime, timezone);

      expect(zone.year).toBe(2024);
      expect(zone.month).toBe(6); // June
      expect(zone.day).toBe(6);
      expect(zone.hour).toBe(11); // Berlin is UTC+2 during DST
      expect(zone.minute).toBe(0);
      expect(zone.second).toBe(0);
      expect(zone.timezone).toBe('Europe/Berlin');
    });

    test('should create Zone instance with valid datetime and timezone - Africa/Johannesburg', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'Africa/Johannesburg';

      const zone = new Zone(datetime, timezone);

      expect(zone.year).toBe(2024);
      expect(zone.month).toBe(6); // June
      expect(zone.day).toBe(6);
      expect(zone.hour).toBe(11); // Johannesburg is UTC+2
      expect(zone.minute).toBe(0);
      expect(zone.second).toBe(0);
      expect(zone.timezone).toBe('Africa/Johannesburg');
    });

    test('should create Zone instance with valid datetime and timezone - Indian/Maldives', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'Indian/Maldives';

      const zone = new Zone(datetime, timezone);

      expect(zone.year).toBe(2024);
      expect(zone.month).toBe(6); // June
      expect(zone.day).toBe(6);
      expect(zone.hour).toBe(14); // Maldives is UTC+5
      expect(zone.minute).toBe(0);
      expect(zone.second).toBe(0);
      expect(zone.timezone).toBe('Indian/Maldives');
    });

    test('should correctly set and format datetime using formatDate function', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'America/New_York';

      const zone = new Zone(datetime, timezone);

      // Validate each property
      expect(zone.year).toBe(2024);
      expect(zone.month).toBe(6);
      expect(zone.day).toBe(6);
      expect(zone.hour).toBe(5); // New York offset
      expect(zone.minute).toBe(0);
      expect(zone.second).toBe(0);

      // Validate the formatted datetime
      expect(zone.datetime).toBe('2024-06-06 05:00:00'); // New York time formatted
    });

    test('should throw ZoneError for invalid datetime format', () => {
      const datetime = '06-06-2024 09:00:00'; // Invalid format
      const timezone = 'America/New_York';

      expect(() => new Zone(datetime, timezone)).toThrow(ZoneError);
      expect(() => new Zone(datetime, timezone)).toThrow(
        'Invalid datetime: 06-06-2024 09:00:00'
      );
    });

    test('should throw ZoneError for invalid timezone', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'Invalid/Timezone'; // Invalid timezone

      expect(() => new Zone(datetime, timezone)).toThrow(ZoneError);
      expect(() => new Zone(datetime, timezone)).toThrow(
        'Invalid time zone specified: Invalid/Timezone'
      );
    });

    test('should throw ZoneError for missing datetime', () => {
      const datetime = '';
      const timezone = 'America/New_York';

      expect(() => new Zone(datetime, timezone)).toThrow(ZoneError);
      expect(() => new Zone(datetime, timezone)).toThrow('Invalid datetime: ');
    });

    test('should throw ZoneError for missing timezone', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = '';

      expect(() => new Zone(datetime, timezone)).toThrow(ZoneError);
      expect(() => new Zone(datetime, timezone)).toThrow('Invalid timezone: ');
    });
  });

  describe('toDateString', () => {
    test('should return date as YYYY-MM-DD formatted string', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'America/New_York';
      const zone = new Zone(datetime, timezone);

      const dateString = zone.toDateString();
      expect(dateString).toBe('2024-06-06');
    });
  });

  describe('toTimestring', () => {
    test('should return time as hh:mm:ss formatted string', () => {
      const datetime = '2024-06-06 09:00:00';
      const timezone = 'America/New_York';
      const zone = new Zone(datetime, timezone);

      const timeString = zone.toTimestring();
      expect(timeString).toBe('05:00:00');
    });
  });

  describe('format', () => {
    test('should return the default datetime string if formatter is not a function', () => {
      const zone = new Zone('2024-06-06 09:00:00', 'UTC');
      const result = zone.format(null as any);
      expect(result).toBe('2024-06-06 09:00:00');
    });

    test('should correctly format the datetime using a valid formatter function', () => {
      const zone = new Zone('2024-06-06 09:00:00', 'UTC');
      const formatter = (
        year: number,
        month: number,
        day: number,
        hour: number,
        min: number,
        sec: number
      ) => `${year}-${month}-${day} ${hour}-${min}-${sec}`;
      const result = zone.format(formatter);
      expect(result).toBe('2024-6-6 9-0-0');
    });

    test('should return the default datetime string if the formatter function returns a non-string value', () => {
      const zone = new Zone('2024-06-06 09:00:00', 'UTC');
      const formatter = () => null;
      const result = zone.format(formatter as any);
      expect(result).toBe('2024-06-06 09:00:00');
    });
  });

  describe('diff', () => {
    test('should return "Just now"', () => {
      const now = new Date();
      const zone = new Zone(formatDate(now), 'UTC');
      expect(zone.diff()).toBe('Just now');
    });

    test('should return "X seconds ago"', () => {
      const now = new Date();
      const oneSecondAgo = new Date(now.setSeconds(now.getSeconds() - 59)); // 59 second ago
      const zone = new Zone(formatDate(oneSecondAgo), 'UTC');
      expect(zone.diff()).toBe('59 seconds ago');
    });

    test('should return "X minutes ago"', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.setMinutes(now.getMinutes() - 59)); // 59 minutes ago
      const zone = new Zone(formatDate(fiveMinutesAgo), 'UTC');
      expect(zone.diff()).toBe('59 minutes ago');
    });

    test('should return "X hours ago"', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.setHours(now.getHours() - 23)); // 23 hours ago
      const zone = new Zone(formatDate(threeHoursAgo), 'UTC');
      expect(zone.diff()).toBe('23 hours ago');
    });

    test('should return "X days ago"', () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.setDate(now.getDate() - 25)); // 25 days ago
      const zone = new Zone(formatDate(tenDaysAgo), 'UTC');
      expect(zone.diff()).toBe('25 days ago');
    });

    test('should return "X months ago"', () => {
      const now = new Date();
      const three = new Date(now.setMonth(now.getMonth() - 11)); // 11 months ago
      const result = new Zone(formatDate(three), 'UTC').diff();
      expect(result).toBe('11 months ago');
    });

    test('should return "X years ago"', () => {
      const now = new Date();
      const twoYearsAgo = new Date(now.setFullYear(now.getFullYear() - 2)); // 2 years ago
      const zone = new Zone(formatDate(twoYearsAgo), 'UTC');
      expect(zone.diff()).toBe('2 years ago');
    });

    test('should return "Just now"', () => {
      const now = new Date();
      const zone = new Zone(formatDate(now), 'UTC');
      expect(zone.diff()).toBe('Just now');
    });

    test('should return "1 second ago"', () => {
      const now = new Date();
      const oneSecondAgo = new Date(now.setSeconds(now.getSeconds() - 1)); // 1 second ago
      const zone = new Zone(formatDate(oneSecondAgo), 'UTC');
      expect(zone.diff()).toBe('1 second ago');
    });

    test('should return "1 minute ago"', () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.setMinutes(now.getMinutes() - 1)); // 1 minute ago
      const zone = new Zone(formatDate(fiveMinutesAgo), 'UTC');
      expect(zone.diff()).toBe('1 minute ago');
    });

    test('should return "1 hour ago"', () => {
      const now = new Date();
      const threeHoursAgo = new Date(now.setHours(now.getHours() - 1)); // 1 hour ago
      const zone = new Zone(formatDate(threeHoursAgo), 'UTC');
      expect(zone.diff()).toBe('1 hour ago');
    });

    test('should return "1 day ago"', () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.setDate(now.getDate() - 1)); // 1 day ago
      const zone = new Zone(formatDate(tenDaysAgo), 'UTC');
      expect(zone.diff()).toBe('1 day ago');
    });

    test('should return "1 month ago"', () => {
      const now = new Date();
      const three = new Date(now.setMonth(now.getMonth() - 1)); // Correctly subtract 1 month
      const result = new Zone(formatDate(three), 'UTC').diff();
      expect(result).toBe('1 month ago');
    });

    test('should return "1 year ago"', () => {
      const now = new Date();
      const twoYearsAgo = new Date(now.setFullYear(now.getFullYear() - 1)); // 1 year ago
      const zone = new Zone(formatDate(twoYearsAgo), 'UTC');
      expect(zone.diff()).toBe('1 year ago');
    });

    test('should return "Just now" for future dates', () => {
      const now = new Date();
      const future = new Date(now.setFullYear(now.getFullYear() + 1)); // 1 year ago
      const zone = new Zone(formatDate(future), 'UTC');
      expect(zone.diff()).toBe('Just now');
    });
  });

  describe('ampm method', () => {
    test('should return "12:00 AM" for midnight (00:00)', () => {
      const midnight = new Zone('2024-06-06 00:00:00', 'UTC');
      const result = midnight.ampm();
      expect(result).toBe('12:00 AM');
    });

    test('should return "1:30 AM" for 01:30', () => {
      const oneThirtyAM = new Zone('2024-06-06 01:30:00', 'UTC');
      const result = oneThirtyAM.ampm();
      expect(result).toBe('1:30 AM');
    });

    test('should return "12:00 PM" for noon (12:00)', () => {
      const noon = new Zone('2024-06-06 12:00:00', 'UTC');
      const result = noon.ampm();
      expect(result).toBe('12:00 PM');
    });

    test('should return "3:45 PM" for 15:45', () => {
      const threeFortyFivePM = new Zone('2024-06-06 15:45:00', 'UTC');
      const result = threeFortyFivePM.ampm();
      expect(result).toBe('3:45 PM');
    });

    test('should return "11:59 PM" for 23:59', () => {
      const elevenFiftyNinePM = new Zone('2024-06-06 23:59:00', 'UTC');
      const result = elevenFiftyNinePM.ampm();
      expect(result).toBe('11:59 PM');
    });
  });
});
