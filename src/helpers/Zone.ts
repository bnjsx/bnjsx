import { isDateTime, isFullStr, isFunc, isStr } from './Test';

/**
 * Formats a Date object as a string in the format `YYYY-MM-DD hh:mm:ss`.
 *
 * @param date The Date object to format.
 * @returns A string representing the date in the format `YYYY-MM-DD hh:mm:ss`.
 */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Custom error class for handling errors specific to the Zone class.
 */
export class ZoneError extends Error {}

/**
 * Type definition for a formatter function used to format date and time components.
 *
 * @param year The year component (e.g., 2024).
 * @param month The month component (1-12).
 * @param day The day of the month (1-31).
 * @param hour The hour component in 24-hour format (0-23).
 * @param minute The minute component (0-59).
 * @param second The second component (0-59).
 * @returns A formatted string representation of the date and time.
 */
type Formatter = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
) => string;

/**
 * Represents a date and time in a specific timezone, providing utilities
 * for formatting and calculating time differences.
 */
export class Zone {
  /**
   * The original date in the local timezone.
   */
  public date: Date;

  /**
   * The formatted datetime string in the specified timezone.
   */
  public datetime: string;

  /**
   * The timezone identifier (e.g., `America/New_York`)..
   */
  public timezone: string;

  /**
   * The year in the specified timezone.
   */
  public year: number;

  /**
   * The month (1-12) in the specified timezone.
   */
  public month: number;

  /**
   * The day of the month (1-31) in the specified timezone.
   */
  public day: number;

  /**
   * The hour (0-23) in the specified timezone.
   */
  public hour: number;

  /**
   * The minute (0-59) in the specified timezone.
   */
  public minute: number;

  /**
   * The second (0-59) in the specified timezone.
   */
  public second: number;

  /**
   * Creates a new Zone instance based on a datetime and timezone.
   *
   * @param datetime The datetime string in `YYYY-MM-DD hh:mm:ss` fromat.
   * @param timezone The timezone identifier (e.g., `America/New_York`).
   * @throws `ZoneError` if the datetime or timezone is invalid.
   */
  constructor(datetime: string, timezone: string) {
    if (!isDateTime(datetime)) {
      throw new ZoneError(`Invalid datetime: ${String(datetime)}`);
    }

    if (!isFullStr(timezone)) {
      throw new ZoneError(`Invalid timezone: ${String(timezone)}`);
    }

    try {
      // Create a UTC date object
      const utcDate = new Date(datetime.concat('Z')); // The datetime is assumed to be in UTC

      // Format the datetime in the specified timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false, // 24-hour format
        timeZone: timezone,
      });

      // Get the local date in the target timezone
      const parts = formatter.formatToParts(utcDate);

      this.year = Number(parts.find((part) => part.type === 'year').value);
      this.month = Number(parts.find((part) => part.type === 'month').value);
      this.day = Number(parts.find((part) => part.type === 'day').value);
      this.hour = Number(parts.find((part) => part.type === 'hour').value);
      this.minute = Number(parts.find((part) => part.type === 'minute').value);
      this.second = Number(parts.find((part) => part.type === 'second').value);

      this.datetime = formatDate(
        new Date(
          Date.UTC(
            this.year,
            this.month - 1,
            this.day,
            this.hour,
            this.minute,
            this.second
          )
        )
      );

      this.date = utcDate;
      this.timezone = timezone;
    } catch (error) {
      throw new ZoneError(error.message);
    }
  }

  /**
   * Formats the datetime using a custom formatter function.
   *
   * @param formatter A function that formats datetime components into a string.
   * @returns The formatted date-time string or the default datetime string.
   */
  public format(formatter: Formatter): string {
    if (!isFunc(formatter)) return this.datetime;

    const result = formatter(
      this.year,
      this.month,
      this.day,
      this.hour,
      this.minute,
      this.second
    );

    return isStr(result) ? result : this.datetime;
  }

  /**
   * Returns the date as a `YYYY-MM-DD` formatted string.
   *
   * @returns The date string.
   */
  public toDateString(): string {
    return `${this.year}-${String(this.month).padStart(2, '0')}-${String(
      this.day
    ).padStart(2, '0')}`;
  }

  /**
   * Returns the time as a `hh:mm:ss` formatted string.
   *
   * @returns The time string.
   */
  public toTimestring(): string {
    return `${String(this.hour).padStart(2, '0')}:${String(
      this.minute
    ).padStart(2, '0')}:${String(this.second).padStart(2, '0')}`;
  }

  /**
   * Returns the time in 12-hour AM/PM format.
   *
   * @returns The formatted time (e.g., `1:30 PM`).
   */
  public ampm(): string {
    let hour = this.hour % 12 || 12; // Converts 0 (midnight) to 12.
    const ampm = this.hour < 12 || this.hour === 24 ? 'AM' : 'PM';
    return `${hour}:${String(this.minute).padStart(2, '0')} ${ampm}`;
  }

  /**
   * Calculates the time difference between now and the Zone's date.
   *
   * @returns A human-readable description of the time difference (e.g., `5 minutes ago`).
   */
  public diff(): string {
    const now = new Date();
    const diff = now.getTime() - this.date.getTime();

    if (diff < 0) return 'Just now'; // Case where the date is in the future

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // Calculate months correctly by considering both years and months
    const yearDiff = now.getFullYear() - this.date.getFullYear();
    let monthDiff = now.getMonth() - this.date.getMonth() + yearDiff * 12;

    // Adjust if the current day is earlier
    if (now.getDate() < this.date.getDate()) monthDiff--;

    const years = Math.floor(monthDiff / 12);
    const months = monthDiff % 12;

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (seconds > 0) return `${seconds} second${seconds > 1 ? 's' : ''} ago`;

    return 'Just now'; // Fallback when the time difference is too small
  }
}
