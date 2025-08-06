import fs from 'fs/promises';
import { Logger, LoggerError } from '../../src/helpers';

jest.mock('fs/promises');

describe('Logger', () => {
  const mockPath = '/path/to/log/file.log';
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger(mockPath);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('initializes with a valid path', () => {
      expect(() => new Logger(mockPath)).not.toThrow();
    });

    test('throws LoggerError if path is invalid', () => {
      expect(() => new Logger(123 as any)).toThrow(LoggerError);
      expect(() => new Logger(123 as any)).toThrow('Invalid path: 123');
    });

    test('returns correct log file path from get.path()', () => {
      expect(logger.get.path()).toBe(mockPath);
    });
  });

  describe('log()', () => {
    test('logs a plain message', async () => {
      const mockDate = '2024-10-12 12:34:56';
      jest
        .spyOn(global.Date.prototype, 'toISOString')
        .mockReturnValue('2024-10-12T12:34:56.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(new Date(mockDate).getTime());
      fs.appendFile = jest.fn(() => Promise.resolve());

      await expect(logger.log('Test message')).resolves.toBeUndefined();

      expect(fs.appendFile).toHaveBeenCalledWith(
        mockPath,
        `<-- LOG -->\n[${mockDate}] [Error] Test message\n\n`
      );
    });

    test('logs an Error object with stack trace', async () => {
      const error = new Error('Something broke');
      error.stack = 'Error: Something broke\n    at test (somefile.js:10:5)';

      const mockDate = '2024-10-12 12:34:56';
      jest
        .spyOn(global.Date.prototype, 'toISOString')
        .mockReturnValue('2024-10-12T12:34:56.000Z');
      jest.spyOn(Date, 'now').mockReturnValue(new Date(mockDate).getTime());
      fs.appendFile = jest.fn(() => Promise.resolve());

      await expect(logger.log(error)).resolves.toBeUndefined();

      expect(fs.appendFile).toHaveBeenCalledWith(
        mockPath,
        expect.stringContaining(
          '[2024-10-12 12:34:56] [Error] Something broke at test (somefile.js:10:5)'
        )
      );
    });

    test('throws if log input is not string or Error', async () => {
      await expect(logger.log({} as any)).rejects.toThrow(LoggerError);
      expect(fs.appendFile).not.toHaveBeenCalled();
    });

    test('throws LoggerError if appendFile fails', async () => {
      fs.appendFile = jest.fn(() => Promise.reject(new Error('fail')));
      jest
        .spyOn(global.Date.prototype, 'toISOString')
        .mockReturnValue('2024-10-12T12:34:56.000Z');
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2024-10-12 12:34:56').getTime());

      await expect(logger.log('fail test')).rejects.toThrow(LoggerError);
      await expect(logger.log('fail test')).rejects.toThrow('fail');
    });

    test('uses default "Error" name and "Unknown error" message when Error properties are missing', async () => {
      const errorLike = new Error();
      // Simulate missing constructor.name and message
      errorLike.constructor = {} as any;
      errorLike.message = '';

      // Provide a simple stack to generate a location
      errorLike.stack = 'Error\n    at someLocation (file.js:10:5)';

      jest
        .spyOn(global.Date.prototype, 'toISOString')
        .mockReturnValue('2024-10-12T12:34:56.000Z');
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(new Date('2024-10-12 12:34:56').getTime());
      fs.appendFile = jest.fn(() => Promise.resolve());

      await expect(logger.log(errorLike)).resolves.toBeUndefined();

      expect(fs.appendFile).toHaveBeenCalledWith(
        mockPath,
        expect.stringContaining(
          '[2024-10-12 12:34:56] [Error] Unknown error at someLocation (file.js:10:5)'
        )
      );
    });
  });

  describe('clear()', () => {
    test('clears the log file', async () => {
      fs.writeFile = jest.fn(() => Promise.resolve());

      await expect(logger.clear()).resolves.toBeUndefined();
      expect(fs.writeFile).toHaveBeenCalledWith(mockPath, '');
    });

    test('throws LoggerError on write fail', async () => {
      fs.writeFile = jest.fn(() => Promise.reject(new Error('clear failed')));

      await expect(logger.clear()).rejects.toThrow(LoggerError);
      await expect(logger.clear()).rejects.toThrow('clear failed');
    });
  });

  describe('get.logs()', () => {
    test('parses valid logs', async () => {
      const mockContent = `
        <-- LOG -->
        [2024-10-12 10:00:00] First log

        <-- LOG -->
        [2024-10-12 11:00:00] Second log
      `;

      fs.access = jest.fn(() => Promise.resolve());
      // @ts-ignore
      fs.readFile = jest.fn(() => Promise.resolve(mockContent));

      const logs = await logger.get.logs();

      expect(logs).toEqual([
        { date: '2024-10-12 10:00:00', message: 'First log' },
        { date: '2024-10-12 11:00:00', message: 'Second log' },
      ]);
    });

    test('filters out logs without valid timestamps', async () => {
      const mockContent = `
        <-- LOG -->
        [2024-10-12 12:34:56] Valid log
        
        <-- LOG -->
        no timestamp here
      `;

      fs.access = jest.fn(() => Promise.resolve());
      // @ts-ignore
      fs.readFile = jest.fn(() => Promise.resolve(mockContent));

      const logs = await logger.get.logs();
      expect(logs).toEqual([
        { date: '2024-10-12 12:34:56', message: 'Valid log' },
      ]);
    });

    test('creates file if missing', async () => {
      fs.access = jest.fn(() => Promise.reject());
      fs.writeFile = jest.fn(() => Promise.resolve());
      // @ts-ignore
      fs.readFile = jest.fn(() => Promise.resolve(''));

      const logs = await logger.get.logs();
      expect(logs).toEqual([]);
    });

    test('throws LoggerError if reading fails', async () => {
      fs.access = jest.fn(() => Promise.resolve());
      // @ts-ignore
      fs.readFile = jest.fn(() => Promise.reject(new Error('read error')));

      await expect(logger.get.logs()).rejects.toThrow(LoggerError);
      await expect(logger.get.logs()).rejects.toThrow('read error');
    });
  });

  describe('get.messages()', () => {
    test('returns all log messages', async () => {
      const mockContent = `
        <-- LOG -->
        [2024-10-12 10:00:00] Message 1

        <-- LOG -->
        [2024-10-12 11:00:00] Message 2
      `;

      fs.access = jest.fn(() => Promise.resolve());
      // @ts-ignore
      fs.readFile = jest.fn(() => Promise.resolve(mockContent));

      const messages = await logger.get.messages();
      expect(messages).toEqual(['Message 1', 'Message 2']);
    });
  });

  describe('get.from()', () => {
    test('returns messages after a given date', async () => {
      const mockContent = `
        <-- LOG -->
        [2024-10-12 10:00:00] Before

        <-- LOG -->
        [2024-10-12 12:00:00] After
      `;

      fs.access = jest.fn(() => Promise.resolve());
      // @ts-ignore
      fs.readFile = jest.fn(() => Promise.resolve(mockContent));

      const messages = await logger.get.from('2024-10-12 11:00:00');
      expect(messages).toEqual(['After']);
    });

    test('throws if input is not a string', async () => {
      await expect(logger.get.from(123 as any)).rejects.toThrow(LoggerError);
      await expect(logger.get.from(123 as any)).rejects.toThrow(
        'Invalid date: 123'
      );
    });

    test('throws if format is invalid', async () => {
      await expect(logger.get.from('2024/10/12 10:00:00')).rejects.toThrow(
        LoggerError
      );
      await expect(logger.get.from('2024/10/12 10:00:00')).rejects.toThrow(
        'Invalid date! Expected: YYYY-MM-DD hh:mm:ss'
      );
    });
  });
});
