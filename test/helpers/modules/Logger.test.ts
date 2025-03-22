import fs from 'fs/promises';
import { Logger, LoggerError } from '../../../src/helpers';

jest.mock('fs/promises');

describe('Logger', () => {
  const mockPath = '/path/to/log/file.log';
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger(mockPath);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize the logger with a valid path', () => {
      expect(() => new Logger(mockPath)).not.toThrow();
    });

    it('should throw LoggerError if path is invalid', () => {
      expect(() => new Logger(123 as any)).toThrow(LoggerError);
      expect(() => new Logger(123 as any)).toThrow(
        `Invalid path: ${String(123)}`
      );
    });

    it('should return the correct log file path', () => {
      expect(logger.get.path()).toBe(mockPath);
    });
  });

  describe('log()', () => {
    it('should log a valid message', async () => {
      Date.prototype.toISOString = jest.fn(() => '2024-10-12T12:34:56');
      fs.appendFile = jest.fn(() => Promise.resolve());

      await expect(logger.log('Test log message')).resolves.toBeUndefined();

      expect(fs.appendFile).toHaveBeenCalledWith(
        mockPath,
        '<-- LOG -->\n[2024-10-12 12:34:56] Test log message\n\n'
      );
    });

    it('should filter out invalid log entries', async () => {
      const invalidLogs = `
          <-- LOG -->
          [2024-10-12 12:34:56] Valid log message
    
          <-- LOG -->
          log entry without timestamp
        `;

      fs.readFile = jest.fn(() => Promise.resolve(invalidLogs)) as any;

      const logs = await logger.get.logs();

      expect(logs).toEqual([
        { date: '2024-10-12 12:34:56', message: 'Valid log message' },
      ]);
    });

    it('should throw a LoggerError if appendFile fails', async () => {
      // Mocking appendFile to reject with an error
      fs.appendFile = jest.fn(() =>
        Promise.reject(new Error('Append file failed'))
      ) as any;

      // Expecting log() to reject with LoggerError when appendFile fails
      await expect(logger.log('Test log message')).rejects.toThrow(LoggerError);
      await expect(logger.log('Test log message')).rejects.toThrow(
        'Append file failed'
      );

      // Ensure that appendFile was called correctly before the error
      expect(fs.appendFile).toHaveBeenCalledWith(
        mockPath,
        `<-- LOG -->\n[2024-10-12 12:34:56] Test log message\n\n`
      );
    });

    it('should throw an error if message is not a valid string', async () => {
      await expect(logger.log(123 as any)).rejects.toThrow(LoggerError);
      expect(fs.appendFile).not.toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    it('should clear the log file', async () => {
      fs.writeFile = jest.fn(() => Promise.resolve());

      await expect(logger.clear()).resolves.toBeUndefined();
      expect(fs.writeFile).toHaveBeenCalledWith(mockPath, '');
    });

    it('should throw an error if write fails', async () => {
      fs.writeFile = jest.fn(() =>
        Promise.reject(new Error('Failed to clear log'))
      );

      await expect(logger.clear()).rejects.toThrow(LoggerError);
      await expect(logger.clear()).rejects.toThrow('Failed to clear log');
    });
  });

  describe('get().logs()', () => {
    it('should return all logs', async () => {
      const mockLogs = `
      <-- LOG -->
      [2024-10-12 10:00:00] First log message

      <-- LOG -->
      [2024-10-12 11:00:00] Second log message
      `;

      fs.readFile = jest.fn(() => Promise.resolve(mockLogs)) as any;

      const logs = await logger.get.logs();

      expect(logs).toEqual([
        { date: '2024-10-12 10:00:00', message: 'First log message' },
        { date: '2024-10-12 11:00:00', message: 'Second log message' },
      ]);
    });

    it('should throw a LoggerError if reading log file fails', async () => {
      fs.readFile = jest.fn(() =>
        Promise.reject(new Error('Read file failed'))
      ) as any;

      await expect(logger.get.logs()).rejects.toThrow(LoggerError);
      await expect(logger.get.logs()).rejects.toThrow('Read file failed');
    });

    it('should throw a LoggerError if the log file is missing', async () => {
      fs.readFile = jest.fn(() =>
        Promise.reject(new Error('ENOENT: no such file or directory'))
      ) as any;

      await expect(logger.get.logs()).rejects.toThrow(LoggerError);
      await expect(logger.get.logs()).rejects.toThrow(
        'ENOENT: no such file or directory'
      );
    });
  });

  describe('get().messages()', () => {
    it('should return log messages only', async () => {
      const mockLogs = `
        <-- LOG -->
        [2024-10-11 10:00:00] First log message
  
        <-- LOG -->
        [2024-10-12 10:00:00] Second log message
        `;

      fs.readFile = jest.fn(() => Promise.resolve(mockLogs)) as any;

      const messages = await logger.get.messages();
      expect(messages).toEqual(['First log message', 'Second log message']);
    });
  });

  describe('get().from()', () => {
    it('should return log messages from a specific date', async () => {
      const mockLogs = `
        <-- LOG -->
        [2024-10-11 10:00:00] First log message
  
        <-- LOG -->
        [2024-10-12 10:00:00] Second log message
        `;

      fs.readFile = jest.fn(() => Promise.resolve(mockLogs)) as any;

      const fromDate = '2024-10-12 00:00:00';
      const messages = await logger.get.from(fromDate);
      expect(messages).toEqual(['Second log message']);
    });

    it('should throw a LoggerError if date is not a valid string', async () => {
      await expect(logger.get.from(123 as any)).rejects.toThrow(LoggerError);
      await expect(logger.get.from(123 as any)).rejects.toThrow(
        'Invalid date: 123'
      );
    });

    it('should throw a LoggerError if date is not in the correct format', async () => {
      const invalidDate = '2024/10/12 10:00:00'; // Wrong format (slashes instead of hyphens)

      await expect(logger.get.from(invalidDate)).rejects.toThrow(LoggerError);
      await expect(logger.get.from(invalidDate)).rejects.toThrow(
        'Invalid date! Expected: YYYY-MM-DD hh:mm:ss'
      );
    });
  });
});
