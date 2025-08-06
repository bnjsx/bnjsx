import { isFunc, isInt } from './Test';

type Job<T> = () => T | Promise<T>;

export class EchoError extends Error {}

/**
 * @class Echo
 * @property maxRetry: the max number of retries
 * @property retyrDelay: the number of miliseconds between each retry
 * @property extraDelay: the number of miliseconds to add after each retry
 */
export class Echo {
  /**
   * The max number of retries
   * @type integer should be greater than 0
   */
  private maxRetry: number = 3;

  /**
   * The number of miliseconds between each retry
   * @type integer should be greater than 0
   */
  private retryDelay: number = 500;

  /**
   * The number of miliseconds to add after each retry
   * @type integer should be greater than or euqles to 0
   */
  private extraDelay: number = 0;

  /**
   * Creates a new Echo instance
   * @param maxRetry The max number of retries
   * @param retryDelay The number of miliseconds between each retry
   * @param extraDelay The number of miliseconds to add after each retry
   */
  constructor(
    maxRetry: number = 3,
    retryDelay: number = 500,
    extraDelay: number = 0
  ) {
    this.set.maxRetry(maxRetry);
    this.set.retryDelay(retryDelay);
    this.set.extraDelay(extraDelay);
  }

  /**
   * Retries the given job the number of times specified
   * @param job The function to execute and retry
   * @returns Promise resolves with the job's return value or rejects with the caught error
   */
  public retry<T>(job: Job<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!isFunc(job)) {
        return reject(new EchoError('The job must be a function'));
      }

      // resolves if the job returns a value or resolves
      // rejects if the job throws an error or rejects
      const task = (): Promise<T> => {
        return new Promise((resolve) => resolve(job()));
      };

      let retryDelay = this.retryDelay;

      const executor = (maxRetry: number = 1) => {
        Echo.sleep(retryDelay).then(() => {
          task()
            .then((result) => resolve(result))
            .catch((error) => {
              if (maxRetry < this.maxRetry) {
                retryDelay += this.extraDelay;
                executor((maxRetry += 1));
              } else return reject(error);
            });
        });
      };

      executor();
    });
  }

  /**
   * Delay execution the specified number of miliseconds
   * @param delay The number of miliseconds to delay execution
   * @returns Promise always resolves with void after the given number of miliseconds pass
   */
  public static sleep(delay: number): Promise<void> {
    return new Promise((resolve) => {
      if (!isInt(delay) || delay <= 0) return resolve();
      setTimeout(() => resolve(), delay);
    });
  }

  public set = {
    maxRetry: (maxRetry: number) => {
      if (!isInt(maxRetry) || maxRetry <= 0) {
        throw new EchoError(
          `The 'maxRetry' option must be an integer greater than 0`
        );
      }

      this.maxRetry = maxRetry;
    },
    retryDelay: (retryDelay: number) => {
      if (!isInt(retryDelay) || retryDelay <= 0) {
        throw new EchoError(
          `The 'retryDelay' option must be an integer greater than 0`
        );
      }

      this.retryDelay = retryDelay;
    },
    extraDelay: (extraDelay: number) => {
      if (!isInt(extraDelay) || extraDelay < 0) {
        throw new EchoError(
          `The 'extraDelay' option must be an integer greater than or equal 0`
        );
      }

      this.extraDelay = extraDelay;
    },
  };

  public get = {
    maxRetry: () => this.maxRetry,
    retryDelay: () => this.retryDelay,
    extraDelay: () => this.extraDelay,
  };
}
