import { EchoError, Echo } from '../../src/helpers';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Echo', () => {
  describe('Echo.sleep', () => {
    it('should sleep for 100ms', async () => {
      const timestamp = Date.now();
      await Echo.sleep(100).then(() => {
        expect(Date.now() - timestamp > 100);
      });
    });

    it('should not sleep at all', async () => {
      const timestamp = Date.now();
      await Echo.sleep(0).then(() => {
        expect(Date.now() - timestamp > 0);
      });
    });
  });

  describe('Echo.retry', () => {
    test('job must be a function', async () => {
      const echo = new Echo();
      await expect(echo.retry('function' as any)).rejects.toBeInstanceOf(
        EchoError
      );
    });

    test('retry fails if the async job rejects every time', async () => {
      const sleep = jest.fn(
        (delay: number): Promise<void> => Promise.resolve()
      );
      Echo.sleep = sleep;

      const job = jest.fn(() => Promise.reject(new Error('message')));
      const echo = new Echo();

      await expect(echo.retry(job)).rejects.toMatchObject({
        message: 'message',
      });

      expect(sleep).toHaveBeenCalledTimes(3);
      expect(sleep).toHaveBeenCalledWith(500);
      expect(job).toHaveBeenCalledTimes(3);
      expect(job).toHaveBeenCalledWith();
    });

    test('retry fails if the job throws every time', async () => {
      const sleep = jest.fn(
        (delay: number): Promise<void> => Promise.resolve()
      );
      Echo.sleep = sleep;

      const job = jest.fn(() => {
        throw new Error('message');
      });

      const echo = new Echo();

      await expect(echo.retry(job)).rejects.toMatchObject({
        message: 'message',
      });

      expect(sleep).toHaveBeenCalledTimes(3);
      expect(sleep).toHaveBeenCalledWith(500);
      expect(job).toHaveBeenCalledTimes(3);
      expect(job).toHaveBeenCalledWith();
    });

    test('retry success if the async job resolves', async () => {
      const sleep = jest.fn(
        (delay: number): Promise<void> => Promise.resolve()
      );
      Echo.sleep = sleep;

      const job = jest.fn(() => Promise.resolve('value'));

      const echo = new Echo();

      await expect(echo.retry(job)).resolves.toBe('value');

      expect(sleep).toHaveBeenCalledTimes(1);
      expect(sleep).toHaveBeenCalledWith(500);
      expect(job).toHaveBeenCalledTimes(1);
      expect(job).toHaveBeenCalledWith();
    });

    test('retry success if the job returns a value', async () => {
      const sleep = jest.fn(
        (delay: number): Promise<void> => Promise.resolve()
      );
      Echo.sleep = sleep;

      const job = jest.fn(() => 'value');

      const echo = new Echo();

      await expect(echo.retry(job)).resolves.toBe('value');

      expect(sleep).toHaveBeenCalledTimes(1);
      expect(sleep).toHaveBeenCalledWith(500);
      expect(job).toHaveBeenCalledTimes(1);
      expect(job).toHaveBeenCalledWith();
    });

    test('retry success in the second try', async () => {
      const sleep = jest.fn(
        (delay: number): Promise<void> => Promise.resolve()
      );
      Echo.sleep = sleep;

      const job = jest
        .fn()
        .mockImplementationOnce(() => Promise.reject(new Error('message')))
        .mockImplementationOnce(() => Promise.resolve('value'));

      const echo = new Echo();

      await expect(echo.retry(job)).resolves.toBe('value');

      expect(sleep).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledWith(500);
      expect(job).toHaveBeenCalledTimes(2);
      expect(job).toHaveBeenCalledWith();
    });

    test('increase the delay by 500', async () => {
      const sleep = jest.fn(
        (delay: number): Promise<void> => Promise.resolve()
      );
      Echo.sleep = sleep;

      const job = jest
        .fn()
        .mockImplementationOnce(() => Promise.reject(new Error('message')))
        .mockImplementationOnce(() => Promise.resolve('value'));

      const echo = new Echo(3, 500, 500);

      await expect(echo.retry(job)).resolves.toBe('value');

      expect(sleep).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenNthCalledWith(1, 500);
      expect(sleep).toHaveBeenNthCalledWith(2, 1000);
      expect(job).toHaveBeenCalledTimes(2);
      expect(job).toHaveBeenCalledWith();
    });
  });

  describe('Echo Setters and Getters', () => {
    test('set.maxRetry and get.maxRetry should work correctly', () => {
      const echo = new Echo();

      expect(() => echo.set.maxRetry(0)).toThrow(
        `The 'maxRetry' option must be an integer greater than 0`
      );

      echo.set.maxRetry(5);
      expect(echo.get.maxRetry()).toBe(5);
    });

    test('set.retryDelay and get.retryDelay should work correctly', () => {
      const echo = new Echo();

      expect(() => echo.set.retryDelay(-1)).toThrow(
        `The 'retryDelay' option must be an integer greater than 0`
      );
      echo.set.retryDelay(500);
      expect(echo.get.retryDelay()).toBe(500);
    });

    test('set.extraDelay and get.extraDelay should work correctly', () => {
      const echo = new Echo();

      expect(() => echo.set.extraDelay(-1)).toThrow(
        `The 'extraDelay' option must be an integer greater than or equal 0`
      );
      echo.set.extraDelay(50);
      expect(echo.get.extraDelay()).toBe(50);
    });
  });
});
