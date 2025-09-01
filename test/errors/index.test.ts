import {
  AppError,
  BadRequestError,
  BeginTransactionError,
  CloseConnectionError,
  CommitTransactionError,
  CreateConnectionError,
  ForbiddenError,
  MaintenanceError,
  MaxConnectionError,
  MaxQueueSizeError,
  MaxQueueTimeError,
  NotFoundError,
  QueryError,
  RollbackTransactionError,
  ServerError,
  ShutdownError,
  ValidatorError,
} from '../../src';

describe('AppError', () => {
  test('should create an error with the default message', () => {
    const error = new AppError();
    expect(error.message).toBe('Something went wrong');
    expect(error.code).toBe(undefined);
    expect(error).toBeInstanceOf(AppError);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Custom error message';
    const customCode = 'DBP';
    const error = new AppError(customMessage, customCode);
    expect(error.message).toBe(customMessage);
    expect(error.code).toBe(customCode);
    expect(error).toBeInstanceOf(AppError);
  });
});

describe('QueryError', () => {
  test('should create an error with the default message', () => {
    const error = new QueryError();
    expect(error.message).toBe('Query execution failed');
    expect(error).toBeInstanceOf(QueryError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Custom error message';
    const error = new QueryError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(QueryError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('MaxQueueSizeError', () => {
  test('should create an error with the default message', () => {
    const error = new MaxQueueSizeError();
    expect(error.message).toBe('Max queue size passed');
    expect(error).toBeInstanceOf(MaxQueueSizeError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Custom error message';
    const error = new MaxQueueSizeError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(MaxQueueSizeError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('MaxQueueTimeError', () => {
  test('should create an error with the default message', () => {
    const error = new MaxQueueTimeError();
    expect(error.message).toBe('Max queue time passed');
    expect(error).toBeInstanceOf(MaxQueueTimeError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Custom error message';
    const error = new MaxQueueTimeError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(MaxQueueTimeError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('RollbackTransactionError', () => {
  test('should create an error with the default message', () => {
    const error = new RollbackTransactionError();
    expect(error.message).toBe('Rollback transaction failed');
    expect(error).toBeInstanceOf(RollbackTransactionError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Custom error message';
    const error = new RollbackTransactionError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(RollbackTransactionError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('CreateConnectionError', () => {
  test('should create an error with the default message', () => {
    const error = new CreateConnectionError();
    expect(error.message).toBe('Create connection failed');
    expect(error).toBeInstanceOf(CreateConnectionError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Custom error message';
    const error = new CreateConnectionError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(CreateConnectionError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('BeginTransactionError', () => {
  test('should create an error with the default message', () => {
    const error = new BeginTransactionError();
    expect(error.message).toBe('Begin transaction failed');
    expect(error).toBeInstanceOf(BeginTransactionError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Custom error message';
    const error = new BeginTransactionError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(BeginTransactionError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('CloseConnectionError', () => {
  test('should create an error with the default message', () => {
    const error = new CloseConnectionError();
    expect(error.message).toBe('Close connection failed');
    expect(error).toBeInstanceOf(CloseConnectionError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Custom close connection error';
    const error = new CloseConnectionError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(CloseConnectionError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('ShutdownError', () => {
  test('should create an error with the default message', () => {
    const error = new ShutdownError();
    expect(error.message).toBe('shutdown failed');
    expect(error).toBeInstanceOf(ShutdownError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Custom error message';
    const error = new ShutdownError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(ShutdownError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('CommitTransactionError', () => {
  test('should create an error with the default message', () => {
    const error = new CommitTransactionError();
    expect(error.message).toBe('Commit transaction failed');
    expect(error).toBeInstanceOf(CommitTransactionError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Custom error message';
    const error = new CommitTransactionError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(CommitTransactionError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('MaxConnectionError', () => {
  test('should create an error with the default message', () => {
    const error = new MaxConnectionError();
    expect(error.message).toBe('Max number of connections passed');
    expect(error).toBeInstanceOf(MaxConnectionError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Custom error message';
    const error = new MaxConnectionError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(MaxConnectionError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('BadRequestError', () => {
  test('should create an error with the default message', () => {
    const error = new BadRequestError();
    expect(error.message).toBe('Bad request');
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Invalid input';
    const error = new BadRequestError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('NotFoundError', () => {
  test('should create an error with the default message', () => {
    const error = new NotFoundError();
    expect(error.message).toBe('Resource not found');
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Page not found';
    const error = new NotFoundError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('ForbiddenError', () => {
  test('should create an error with the default message', () => {
    const error = new ForbiddenError();
    expect(error.message).toBe('Access forbidden');
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Permission denied';
    const error = new ForbiddenError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('ServerError', () => {
  test('should create an error with the default message', () => {
    const error = new ServerError();
    expect(error.message).toBe('Internal server error');
    expect(error).toBeInstanceOf(ServerError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Unexpected failure';
    const error = new ServerError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(ServerError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('MaintenanceError', () => {
  test('should create an error with the default message', () => {
    const error = new MaintenanceError();
    expect(error.message).toBe('Service unavailable');
    expect(error).toBeInstanceOf(MaintenanceError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Unexpected failure';
    const error = new MaintenanceError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(MaintenanceError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('ValidatorError', () => {
  test('should create an error with the default message', () => {
    const error = new ValidatorError();
    expect(error.message).toBe('Validator issue');
    expect(error).toBeInstanceOf(ValidatorError);
    expect(error).toBeInstanceOf(Error);
  });

  test('should create an error with a custom message', () => {
    const customMessage = 'Unexpected failure';
    const error = new ValidatorError(customMessage);
    expect(error.message).toBe(customMessage);
    expect(error).toBeInstanceOf(ValidatorError);
    expect(error).toBeInstanceOf(Error);
  });
});
