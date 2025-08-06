import {
  isDate,
  isDateTime,
  isDefined,
  isFullStr,
  isInt,
  isNum,
  isStr,
} from './Test';
import { toISO, toMs } from './Text';

/**
 * Custom error class for handling UTC-related errors.
 *
 */
export class UTCError extends Error {}

/**
 * Formats a Date object as a string in the format `YYYY-MM-DD hh:mm:ss`.
 *
 * @param date The Date object to format.
 * @returns A string representing the date in the format `YYYY-MM-DD hh:mm:ss`.
 *
 * @example
 * const now = new Date();
 * console.log(formatDate(now)); // '2024-10-24 10:00:00'
 */
export function formatDate(date: Date): string {
  if (!isDate(date)) {
    throw new UTCError(`Invalid date object: ${String(date)}`);
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Extracts the date part from a datetime string `YYYY-MM-DD`.
 *
 * @param datetime The datetime string in `YYYY-MM-DD hh:mm:ss` format.
 * @returns A string representing the date part `YYYY-MM-DD`.
 *
 * @example
 * console.log(parseDate('2024-10-24 10:00:00')); // '2024-10-24'
 */
export function parseDate(datetime: string): string {
  if (!isDateTime(datetime)) {
    throw new UTCError(`Invalid datetime: ${String(datetime)}`);
  }

  return datetime.slice(0, 10);
}

/**
 * Extracts the time part from a datetime string `hh:mm:ss`.
 *
 * @param datetime The datetime string in `YYYY-MM-DD hh:mm:ss` format.
 * @returns A string representing the date part `hh:mm:ss`.
 *
 * @example
 * console.log(parseDate('2024-10-24 10:00:00')); // '10:00:00'
 */
export function parseTime(datetime: string): string {
  if (!isDateTime(datetime)) {
    throw new UTCError(`Invalid datetime: ${String(datetime)}`);
  }

  return datetime.slice(11);
}

/**
 * Returns the current UTC date and time in `YYYY-MM-DD hh:mm:ss` format.
 *
 * @returns A string representing the UTC date and time in the format `YYYY-MM-DD hh:mm:ss`.
 */
export function getDateTime(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Returns the current UTC date in 'YYYY-MM-DD' format.
 *
 * @param datetime The UTC datetime string to get the date from in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns A string representing the UTC date in the format `YYYY-MM-DD`.
 */
export function getDate(datetime?: string): string {
  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    return new Date(datetime.concat('Z')).toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Returns the current UTC time in 'hh:mm:ss' format.
 *
 * @param datetime The UTC datetime string to get the time from in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns A string representing the UTC time in the format `hh:mm:ss`.
 */
export function getTime(datetime?: string): string {
  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    return new Date(datetime.concat('Z')).toISOString().slice(11, 19);
  }

  return new Date().toISOString().slice(11, 19);
}

/**
 * Returns the current UTC year as an integer.
 *
 * @param datetime The UTC datetime string to get the year from in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The UTC year as a number.
 */
export function getYear(datetime?: string): number {
  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    return new Date(datetime.concat('Z')).getUTCFullYear();
  }

  return new Date().getUTCFullYear();
}

/**
 * Returns the current UTC month as an integer (0-11).
 *
 * @param datetime The UTC datetime string to get the month from in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The UTC month as a number (0-11, where 0 = January, 11 = December).
 * @throws UTCError if the datetime is not valid.
 */
export function getMonth(datetime?: string): number {
  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    return new Date(datetime.concat('Z')).getUTCMonth();
  }

  return new Date().getUTCMonth();
}

/**
 * Returns the current UTC day of the month as an integer (1-31).
 *
 * @param datetime The UTC datetime string to get the day from in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The UTC day of the month as a number (1-31).
 * @throws UTCError if the datetime is not valid.
 */
export function getDay(datetime?: string): number {
  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    return new Date(datetime.concat('Z')).getUTCDate();
  }

  return new Date().getUTCDate();
}

/**
 * Returns the current UTC hour as an integer.
 *
 * @param datetime The UTC datetime string to get the hour from in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The UTC hour as a number (0-23).
 */
export function getHour(datetime?: string): number {
  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    return new Date(datetime.concat('Z')).getUTCHours();
  }

  return new Date().getUTCHours();
}

/**
 * Returns the current UTC minute as an integer.
 *
 * @param datetime The UTC datetime string to get the minute from in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The UTC minute as a number (0-59).
 */
export function getMinute(datetime?: string): number {
  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    return new Date(datetime.concat('Z')).getUTCMinutes();
  }

  return new Date().getUTCMinutes();
}

/**
 * Returns the current UTC second as an integer.
 *
 * @param datetime The UTC datetime string to get the second from in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The UTC second as a number (0-59).
 */
export function getSecond(datetime?: string): number {
  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    return new Date(datetime.concat('Z')).getUTCSeconds();
  }

  return new Date().getUTCSeconds();
}

/**
 * Sets the UTC year of the given datetime.
 *
 * @param datetime The UTC datetime string to set the year for in 'YYYY-MM-DD hh:mm:ss' format.
 * @param year The year to set.
 * @returns A string representing the updated datetime with the new UTC year.
 * @throws UTCError if the datetime is not valid.
 */
export function setYear(datetime: string, year: number): string {
  if (!isDateTime(datetime)) {
    throw new UTCError(`Invalid datetime: ${datetime}`);
  }

  if (!isInt(year) || year < 0) {
    throw new UTCError(`Invalid year: ${String(year)}`);
  }

  const date = new Date(datetime.concat('Z'));
  date.setUTCFullYear(year);
  return formatDate(date);
}

/**
 * Sets the UTC month of the given datetime.
 *
 * @param datetime The UTC datetime string to set the month for in 'YYYY-MM-DD hh:mm:ss' format.
 * @param month The month to set (0-11, where 0 = January, 11 = December).
 * @returns A string representing the updated datetime with the new UTC month.
 * @throws UTCError if the datetime is not valid.
 */
export function setMonth(datetime: string, month: number): string {
  if (!isDateTime(datetime)) {
    throw new UTCError(`Invalid datetime: ${datetime}`);
  }

  if (!isInt(month) || month < 0 || month > 11) {
    throw new UTCError(`Invalid month: ${String(month)}`);
  }

  const date = new Date(datetime.concat('Z'));
  date.setUTCMonth(month);
  return formatDate(date);
}

/**
 * Sets the UTC day of the given datetime.
 *
 * @param datetime The UTC datetime string to set the day for in 'YYYY-MM-DD hh:mm:ss' format.
 * @param day The day to set (1-31).
 * @returns A string representing the updated datetime with the new UTC day.
 * @throws UTCError if the datetime is not valid.
 */
export function setDay(datetime: string, day: number): string {
  if (!isDateTime(datetime)) {
    throw new UTCError(`Invalid datetime: ${datetime}`);
  }

  if (!isInt(day) || day < 1 || day > 31) {
    throw new UTCError(`Invalid day: ${String(day)}`);
  }

  const date = new Date(datetime.concat('Z'));
  date.setUTCDate(day);
  return formatDate(date);
}

/**
 * Sets the UTC hour of the given datetime.
 *
 * @param datetime The UTC datetime string to set the hour for in 'YYYY-MM-DD hh:mm:ss' format.
 * @param hour The hour to set (0-23).
 * @returns A string representing the updated datetime with the new UTC hour.
 * @throws UTCError if the datetime is not valid.
 */
export function setHour(datetime: string, hour: number): string {
  if (!isDateTime(datetime)) {
    throw new UTCError(`Invalid datetime: ${datetime}`);
  }

  if (!isInt(hour) || hour < 0 || hour > 23) {
    throw new UTCError(`Invalid hour: ${String(hour)}`);
  }

  const date = new Date(datetime.concat('Z'));
  date.setUTCHours(hour);
  return formatDate(date);
}

/**
 * Sets the UTC minute of the given datetime.
 *
 * @param datetime The UTC datetime string to set the minute for in 'YYYY-MM-DD hh:mm:ss' format.
 * @param minute The minute to set (0-59).
 * @returns A string representing the updated datetime with the new UTC minute.
 * @throws UTCError if the datetime is not valid.
 */
export function setMinute(datetime: string, minute: number): string {
  if (!isDateTime(datetime)) {
    throw new UTCError(`Invalid datetime: ${datetime}`);
  }

  if (!isInt(minute) || minute < 0 || minute > 59) {
    throw new UTCError(`Invalid minute: ${String(minute)}`);
  }

  const date = new Date(datetime.concat('Z'));
  date.setUTCMinutes(minute);
  return formatDate(date);
}

/**
 * Sets the UTC second of the given datetime.
 *
 * @param datetime The UTC datetime string to set the second for in 'YYYY-MM-DD hh:mm:ss' format.
 * @param second The second to set (0-59).
 * @returns A string representing the updated datetime with the new UTC second.
 * @throws UTCError if the datetime is not valid.
 */
export function setSecond(datetime: string, second: number): string {
  if (!isDateTime(datetime)) {
    throw new UTCError(`Invalid datetime: ${datetime}`);
  }

  if (!isInt(second) || second < 0 || second > 59) {
    throw new UTCError(`Invalid second: ${String(second)}`);
  }

  const date = new Date(datetime.concat('Z'));
  date.setUTCSeconds(second);
  return formatDate(date);
}

/**
 * Adds a specified number of years to the current UTC datetime or the provided datetime.
 *
 * @param years The number of years to add.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the added years in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of years is not a positive integer or if invalid datetime is provided.
 */
export function addYears(years: number, datetime?: string): string {
  if (!isInt(years) || years < 0) {
    throw new UTCError(`Invalid number of years: ${String(years)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCFullYear(date.getUTCFullYear() + years);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCFullYear(now.getUTCFullYear() + years);
  return formatDate(now);
}

/**
 * Adds a specified number of months to the current UTC datetime or the provided datetime.
 *
 * @param months The number of months to add.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the added months in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of months is not a positive integer or if invalid datetime is provided.
 */
export function addMonths(months: number, datetime?: string): string {
  if (!isInt(months) || months <= 0) {
    throw new UTCError(`Invalid number of months: ${String(months)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCMonth(date.getUTCMonth() + months);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCMonth(now.getUTCMonth() + months);
  return formatDate(now);
}

/**
 * Adds a specified number of days to the current UTC datetime or the provided datetime.
 *
 * @param days The number of days to add.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the added days in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of days is not a positive integer or if invalid datetime is provided.
 */
export function addDays(days: number, datetime?: string): string {
  if (!isInt(days) || days < 0) {
    throw new UTCError(`Invalid number of days: ${String(days)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCDate(date.getUTCDate() + days);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCDate(now.getUTCDate() + days);
  return formatDate(now);
}

/**
 * Adds a specified number of hours to the current UTC datetime or the provided datetime.
 *
 * @param hours The number of hours to add.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the added hours in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of hours is not a positive integer or if invalid datetime is provided.
 */
export function addHours(hours: number, datetime?: string): string {
  if (!isInt(hours) || hours <= 0) {
    throw new UTCError(`Invalid number of hours: ${String(hours)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCHours(date.getUTCHours() + hours);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCHours(now.getUTCHours() + hours);
  return formatDate(now);
}

/**
 * Adds a specified number of minutes to the current UTC datetime or the provided datetime.
 *
 * @param minutes The number of minutes to add.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the added minutes in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of minutes is not a positive integer or if invalid datetime is provided.
 */
export function addMinutes(minutes: number, datetime?: string): string {
  if (!isInt(minutes) || minutes <= 0) {
    throw new UTCError(`Invalid number of minutes: ${String(minutes)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCMinutes(date.getUTCMinutes() + minutes);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCMinutes(now.getUTCMinutes() + minutes);
  return formatDate(now);
}

/**
 * Adds a specified number of seconds to the current UTC datetime or the provided datetime.
 *
 * @param seconds The number of seconds to add.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the added seconds in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of seconds is not a positive integer or if invalid datetime is provided.
 */
export function addSeconds(seconds: number, datetime?: string): string {
  if (!isInt(seconds) || seconds <= 0) {
    throw new UTCError(`Invalid number of seconds: ${String(seconds)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCSeconds(date.getUTCSeconds() + seconds);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCSeconds(now.getUTCSeconds() + seconds);
  return formatDate(now);
}

/**
 * Subtracts a specified number of years from the current UTC datetime or the provided datetime.
 *
 * @param years The number of years to subtract.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the subtracted years in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of years is not a positive integer or if invalid datetime is provided.
 */
export function removeYears(years: number, datetime?: string): string {
  if (!isInt(years) || years < 0) {
    throw new UTCError(`Invalid number of years: ${String(years)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCFullYear(date.getUTCFullYear() - years);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCFullYear(now.getUTCFullYear() - years);
  return formatDate(now);
}

/**
 * Subtracts a specified number of months from the current UTC datetime or the provided datetime.
 *
 * @param months The number of months to subtract.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the subtracted months in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of months is not a positive integer or if invalid datetime is provided.
 */
export function removeMonths(months: number, datetime?: string): string {
  if (!isInt(months) || months <= 0) {
    throw new UTCError(`Invalid number of months: ${String(months)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCMonth(date.getUTCMonth() - months);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCMonth(now.getUTCMonth() - months);
  return formatDate(now);
}

/**
 * Subtracts a specified number of days from the current UTC datetime or the provided datetime.
 *
 * @param days The number of days to subtract.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the subtracted days in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of days is not a positive integer or if invalid datetime is provided.
 */
export function removeDays(days: number, datetime?: string): string {
  if (!isInt(days) || days < 0) {
    throw new UTCError(`Invalid number of days: ${String(days)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCDate(date.getUTCDate() - days);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCDate(now.getUTCDate() - days);
  return formatDate(now);
}

/**
 * Subtracts a specified number of hours from the current UTC datetime or the provided datetime.
 *
 * @param hours The number of hours to subtract.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the subtracted hours in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of hours is not a positive integer or if invalid datetime is provided.
 */
export function removeHours(hours: number, datetime?: string): string {
  if (!isInt(hours) || hours <= 0) {
    throw new UTCError(`Invalid number of hours: ${String(hours)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCHours(date.getUTCHours() - hours);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCHours(now.getUTCHours() - hours);
  return formatDate(now);
}

/**
 * Subtracts a specified number of minutes from the current UTC datetime or the provided datetime.
 *
 * @param minutes The number of minutes to subtract.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the subtracted minutes in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of minutes is not a positive integer or if invalid datetime is provided.
 */
export function removeMinutes(minutes: number, datetime?: string): string {
  if (!isInt(minutes) || minutes <= 0) {
    throw new UTCError(`Invalid number of minutes: ${String(minutes)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCMinutes(date.getUTCMinutes() - minutes);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCMinutes(now.getUTCMinutes() - minutes);
  return formatDate(now);
}

/**
 * Subtracts a specified number of seconds from the current UTC datetime or the provided datetime.
 *
 * @param seconds The number of seconds to subtract.
 * @param datetime The UTC datetime string to modify in 'YYYY-MM-DD hh:mm:ss' format.
 * @returns The modified datetime string with the subtracted seconds in 'YYYY-MM-DD hh:mm:ss' format.
 * @throws `UTCError` if the number of seconds is not a positive integer or if invalid datetime is provided.
 */
export function removeSeconds(seconds: number, datetime?: string): string {
  if (!isInt(seconds) || seconds <= 0) {
    throw new UTCError(`Invalid number of seconds: ${String(seconds)}`);
  }

  if (isDefined(datetime)) {
    if (!isDateTime(datetime)) {
      throw new UTCError(`Invalid datetime: ${String(datetime)}`);
    }

    const date = new Date(datetime.concat('Z'));
    date.setUTCSeconds(date.getUTCSeconds() - seconds);
    return formatDate(date);
  }

  const now = new Date();
  now.setUTCSeconds(now.getUTCSeconds() - seconds);
  return formatDate(now);
}

/**
 * Converts a datetime string from a specific timezone to UTC.
 *
 * @param dateime A string representing a date and time in the format: `YYYY-MM-DD hh:mm:ss`.
 * @param timezone The IANA time zone string (e.g., 'America/New_York').
 * @returns A string representing the equivalent UTC date and time in the format `YYYY-MM-DD hh:mm:ss`.
 * @throws `UTCError` if the date or timezone format is invalid.
 *
 * @example
 * // Convert date in Europe/London to UTC
 * console.log(UTC.from.date('2024-06-15 12:00:00', 'Europe/London'));
 * // Output: '2024-06-15 11:00:00' (1-hour difference)
 *
 * // Convert date in Australia/Sydney to UTC
 * console.log(UTC.from.date('2024-12-25 15:00:00', 'Australia/Sydney'));
 * // Output: '2024-12-25 04:00:00' (11-hour difference from UTC)
 *
 * // Convert an ISO format date in America/New_York to UTC
 * console.log(UTC.from.date('2024-02-09 13:45:30', 'America/New_York'));
 * // Output: '2024-02-09 18:45:30' (5-hour difference)
 */
export function toUTC(datetime: string, timezone: string) {
  if (!isDateTime(datetime)) {
    throw new UTCError(`Invalid datetime: ${String(datetime)}`);
  }

  if (!isFullStr(timezone)) {
    throw new UTCError(`Invalid timezone: ${String(timezone)}`);
  }

  try {
    const localDate = new Date(datetime); // Local timezone

    // Get the time in the specific timezone
    const timeZoneDate = new Date(
      localDate.toLocaleString('en-US', { timeZone: timezone })
    );

    // Calculate the offset in milliseconds
    const offset = timeZoneDate.getTime() - localDate.getTime();

    // Adjust the datetime to UTC
    const utcDate = new Date(localDate.getTime() - offset);

    return formatDate(utcDate); // result as YYYY-MM-DD hh:mm:ss
  } catch (error) {
    throw new UTCError(error.message);
  }
}

/**
 * Checks if a given date is in the past and still considered "fresh" based on a freshness window.
 *
 * A fresh date is one that:
 * - Is in the past (not future)
 * - Is within the given duration from now (default: `'48h'`)
 *
 * Duration strings must be in the format: `'30s'`, `'5m'`, `'12h'`, `'2d'`, `'1M'`, `'1y'`
 *
 * Examples:
 * ```ts
 * fresh('2025-07-27 15:00:00')          // true if within last 48h
 * fresh('2025-07-27T10:00:00Z', '2h')    // true if within last 2 hours
 * fresh('2025-07-25', '3d')              // true if within last 3 days
 * ```
 *
 * @param date - Any parseable date string or object
 * @param level - Optional freshness window (e.g. `'2h'`, `'1d'`). Defaults to `'48h'`.
 * @returns `true` if the date is still fresh, otherwise `false`
 */
export function fresh(date: string | number | Date, level?: string): boolean {
  if (isNum(date)) date = new Date(date);
  if (isStr(date)) date = new Date(toISO(date));
  if (!isDate(date) || isNaN(date.getTime())) return false;

  const now = Date.now();
  const limit = toMs(level);
  const diff = now - date.getTime();

  return diff >= 0 && diff <= limit;
}

/**
 * The `UTC` class provides utility methods to get the current UTC date/time,
 * convert dates and timestamps from specific time zones to UTC,
 * and manipulate future and past UTC dates.
 */
export class UTC {
  public static toUTC = toUTC;
  public static formatDate = formatDate;
  public static parseDate = parseDate;
  public static parseTime = parseTime;
  public static fresh = fresh;

  /**
   * Provides methods to retrieve various formats of the current UTC date and time.
   */
  public static get = {
    date: getDate,
    time: getTime,
    year: getYear,
    month: getMonth,
    day: getDay,
    hour: getHour,
    minute: getMinute,
    second: getSecond,
    datetime: getDateTime,
  };

  /**
   * Provides methods to retrieve various formats of the current UTC date and time.
   */
  public static set = {
    year: setYear,
    month: setMonth,
    day: setDay,
    hour: setHour,
    minute: setMinute,
    second: setSecond,
  };

  /**
   * Provides methods to calculate future dates in UTC by adding a specified amount of time.
   */
  public static future = {
    year: addYears,
    month: addMonths,
    day: addDays,
    hour: addHours,
    minute: addMinutes,
    second: addSeconds,
  };

  /**
   * Provides methods to calculate past dates in UTC by subtracting a specified amount of time.
   */
  public static past = {
    year: removeYears,
    month: removeMonths,
    day: removeDays,
    hour: removeHours,
    minute: removeMinutes,
    second: removeSeconds,
  };

  /**
   * Get duration in seconds
   */
  public static sec = {
    minute: (n: number = 1) => n * 60,
    hour: (n: number = 1) => n * 60 * 60,
    day: (n: number = 1) => n * 60 * 60 * 24,
  };

  /**
   * Get duration in milliseconds
   */
  public static ms = {
    minute: (n: number = 1) => n * 60 * 1000,
    hour: (n: number = 1) => n * 60 * 60 * 1000,
    day: (n: number = 1) => n * 60 * 60 * 24 * 1000,
  };
}
