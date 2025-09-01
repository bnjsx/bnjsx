import { isStr } from '../helpers';

/**
 * Base class for custom application errors.
 */
export class AppError extends Error {
  /** Optional unique code to identify the error. */
  public code: string;

  /** The name of the error class */
  public name: string;

  /**
   * Creates an instance of `AppError`.
   * @param message Optional custom error message. Defaults to 'Something went wrong'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Something went wrong');
    this.code = isStr(code) ? code : undefined;
    this.name = this.constructor.name;
  }
}

/**
 * Represents an error that occurs when starting a database transaction.
 * @extends AppError
 */
export class BeginTransactionError extends AppError {
  /**
   * Creates an instance of `BeginTransactionError`.
   * @param message Optional custom error message. Defaults to 'Begin transaction failed'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Begin transaction failed', code);
  }
}

/**
 * Represents an error that occurs when committing a database transaction.
 * @extends AppError
 */
export class CommitTransactionError extends AppError {
  /**
   * Creates an instance of CommitTransactionError.
   * @param message Optional custom error message. Defaults to 'Commit transaction failed'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Commit transaction failed', code);
  }
}

/**
 * Represents an error that occurs when rolling back a database transaction.
 * @extends AppError
 */
export class RollbackTransactionError extends AppError {
  /**
   * Creates an instance of RollbackTransactionError.
   * @param message Optional custom error message. Defaults to 'Rollback transaction failed'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Rollback transaction failed', code);
  }
}

/**
 * Represents an error that occurs when closing a database connection.
 * @extends AppError
 */
export class CloseConnectionError extends AppError {
  /**
   * Creates an instance of CloseConnectionError.
   * @param message Optional custom error message. Defaults to 'Close connection failed'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Close connection failed', code);
  }
}

/**
 * Represents an error that occurs when creating a database connection.
 * @extends AppError
 */
export class CreateConnectionError extends AppError {
  /**
   * Creates an instance of CreateConnectionError.
   * @param message Optional custom error message. Defaults to 'Create connection failed'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Create connection failed', code);
  }
}

/**
 * Represents an error when the maximum number of database connections is exceeded.
 * @extends AppError
 */
export class MaxConnectionError extends AppError {
  /**
   * Creates an instance of MaxConnectionError.
   * @param message Optional custom error message. Defaults to 'Max number of connections passed'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Max number of connections passed', code);
  }
}

/**
 * Represents an error when the maximum queue size for database connections is exceeded.
 * @extends AppError
 */
export class MaxQueueSizeError extends AppError {
  /**
   * Creates an instance of MaxQueueSizeError.
   * @param message Optional custom error message. Defaults to 'Max queue size passed'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Max queue size passed', code);
  }
}

/**
 * Represents an error when the maximum allowed queue time is exceeded.
 * @extends AppError
 */
export class MaxQueueTimeError extends AppError {
  /**
   * Creates an instance of MaxQueueTimeError.
   * @param message Optional custom error message. Defaults to 'Max queue time passed'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Max queue time passed', code);
  }
}

/**
 * Represents an error that occurs during query execution.
 * @extends AppError
 */
export class QueryError extends AppError {
  /**
   * Creates an instance of QueryError.
   * @param message Optional custom error message. Defaults to 'Query execution failed'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Query execution failed', code);
  }
}

/**
 * Represents an error that occurs during shutdown.
 * @extends AppError
 */
export class ShutdownError extends AppError {
  /**
   * Creates an instance of ShutdownError.
   * @param message Optional custom error message. Defaults to 'Shutdown failed'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'shutdown failed', code);
  }
}

/**
 * Represents a bad request error (400).
 * @extends AppError
 */
export class BadRequestError extends AppError {
  /**
   * Creates an instance of BadRequestError.
   * @param message Optional custom error message. Defaults to 'Bad request'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Bad request', code);
  }
}

/**
 * Represents a not found error (404).
 * @extends AppError
 */
export class NotFoundError extends AppError {
  /**
   * Creates an instance of NotFoundError.
   * @param message Optional custom error message. Defaults to 'Resource not found'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Resource not found', code);
  }
}

/**
 * Represents a forbidden error (403).
 * @extends AppError
 */
export class ForbiddenError extends AppError {
  public code: string;

  /**
   * Creates an instance of ForbiddenError.
   * @param message Optional custom error message. Defaults to 'Access forbidden'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Access forbidden', code);
    this.code = code;
  }
}

/**
 * Represents a server error (500).
 * @extends AppError
 */
export class ServerError extends AppError {
  /**
   * Creates an instance of ServerError.
   * @param message Optional custom error message. Defaults to 'Internal server error'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Internal server error', code);
  }
}

/**
 * Represents a service unavailable (503).
 * @extends AppError
 */
export class MaintenanceError extends AppError {
  /**
   * Creates an instance of MaintenanceError.
   * @param message Optional custom error message. Defaults to 'Internal server error'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Service unavailable', code);
  }
}

/**
 * Represents a `Validator` related error
 * @extends AppError
 */
export class ValidatorError extends AppError {
  /**
   * Creates an instance of ValidatorError.
   * @param message Optional custom error message. Defaults to 'Internal server error'.
   * @param code Optional custom error code to identify the error.
   */
  constructor(message?: string, code?: string) {
    super(isStr(message) ? message : 'Validator issue', code);
  }
}
