import {
  isDriver,
  isMySQL,
  isSQLite,
  isPostgreSQL,
  isCon,
  isPendingCon,
  isPoolCon,
  bugger,
  orange,
  blue,
  green,
  red,
} from '../../src/helpers';

describe('isDriver', () => {
  it('should return true for a valid Driver', () => {
    const driver = { id: Symbol('MySQL') };
    expect(isDriver(driver)).toBe(true);
  });

  it('should return false for a driver with an invalid id symbol', () => {
    const driver = { id: Symbol('MongoDB') };
    expect(isDriver(driver)).toBe(false);
  });

  it('should return false for a driver with a non-symbol id', () => {
    const driver = { id: 'MySQL' }; // id is a string, not a symbol
    expect(isDriver(driver)).toBe(false);
  });

  it('should return false for a non-object driver', () => {
    const driver = null; // Not an object
    expect(isDriver(driver)).toBe(false);
  });
});

describe('isMySQL', () => {
  it('should return true for a valid MySQL driver', () => {
    const driver = { id: Symbol('MySQL') };
    expect(isMySQL(driver)).toBe(true);
  });

  it('should return false for a non-MySQL driver', () => {
    const driver = { id: Symbol('PostgreSQL') };
    expect(isMySQL(driver)).toBe(false);
  });

  it('should return false for a driver with an invalid id symbol', () => {
    const driver = { id: Symbol('MongoDB') };
    expect(isMySQL(driver)).toBe(false);
  });

  it('should return false for a non-object driver', () => {
    const driver = null;
    expect(isMySQL(driver)).toBe(false);
  });

  it('should return false for a driver with a non-symbol id', () => {
    const driver = { id: 'MySQL' }; // id is a string, not a symbol
    expect(isMySQL(driver)).toBe(false);
  });
});

describe('isSQLite', () => {
  it('should return true for a valid SQLite driver', () => {
    const driver = { id: Symbol('SQLite') };
    expect(isSQLite(driver)).toBe(true);
  });

  it('should return false for a non-SQLite driver', () => {
    const driver = { id: Symbol('PostgreSQL') };
    expect(isSQLite(driver)).toBe(false);
  });

  it('should return false for a driver with an invalid id symbol', () => {
    const driver = { id: Symbol('MongoDB') };
    expect(isSQLite(driver)).toBe(false);
  });

  it('should return false for a non-object driver', () => {
    const driver = null;
    expect(isSQLite(driver)).toBe(false);
  });

  it('should return false for a driver with a non-symbol id', () => {
    const driver = { id: 'SQLite' }; // id is a string, not a symbol
    expect(isSQLite(driver)).toBe(false);
  });
});

describe('isPostgreSQL', () => {
  it('should return true for a valid PostgreSQL driver', () => {
    const driver = { id: Symbol('PostgreSQL') };
    expect(isPostgreSQL(driver)).toBe(true);
  });

  it('should return false for a non-PostgreSQL driver', () => {
    const driver = { id: Symbol('MySQL') };
    expect(isPostgreSQL(driver)).toBe(false);
  });

  it('should return false for a driver with an invalid id symbol', () => {
    const driver = { id: Symbol('MongoDB') };
    expect(isPostgreSQL(driver)).toBe(false);
  });

  it('should return false for a non-object driver', () => {
    const driver = null;
    expect(isPostgreSQL(driver)).toBe(false);
  });

  it('should return false for a driver with a non-symbol id', () => {
    const driver = { id: 'PostgreSQL' }; // id is a string, not a symbol
    expect(isPostgreSQL(driver)).toBe(false);
  });
});

describe('isCon', () => {
  it('should return true for a valid Connection', () => {
    const connection = { id: Symbol('Connection') };
    expect(isCon(connection)).toBe(true);
  });

  it('should return false for a non-Connection', () => {
    const connection = { id: Symbol('SomeOtherConnection') };
    expect(isCon(connection)).toBe(false);
  });

  it('should return false for a connection with an invalid id symbol', () => {
    const connection = { id: Symbol('InvalidConnection') };
    expect(isCon(connection)).toBe(false);
  });

  it('should return false for a non-object connection', () => {
    const connection = null;
    expect(isCon(connection)).toBe(false);
  });

  it('should return false for a connection with a non-symbol id', () => {
    const connection = { id: 'Connection' }; // id is a string, not a symbol
    expect(isCon(connection)).toBe(false);
  });
});

describe('isPendingCon', () => {
  it('should return true for a valid PendingConnection', () => {
    const connection = { id: Symbol('PendingConnection') };
    expect(isPendingCon(connection)).toBe(true);
  });

  it('should return false for a non-PendingConnection', () => {
    const connection = { id: Symbol('Connection') };
    expect(isPendingCon(connection)).toBe(false);
  });

  it('should return false for a connection with an invalid id symbol', () => {
    const connection = { id: Symbol('SomeOtherConnection') };
    expect(isPendingCon(connection)).toBe(false);
  });

  it('should return false for a non-object connection', () => {
    const connection = null;
    expect(isPendingCon(connection)).toBe(false);
  });

  it('should return false for a connection with a non-symbol id', () => {
    const connection = { id: 'PendingConnection' }; // id is a string, not a symbol
    expect(isPendingCon(connection)).toBe(false);
  });
});

describe('isPoolCon', () => {
  it('should return true for a valid PoolConnection', () => {
    const connection = { id: Symbol('PoolConnection') };
    expect(isPoolCon(connection)).toBe(true);
  });

  it('should return false for a non-PoolConnection', () => {
    const connection = { id: Symbol('Connection') };
    expect(isPoolCon(connection)).toBe(false);
  });

  it('should return false for a connection with an invalid id symbol', () => {
    const connection = { id: Symbol('InvalidConnection') };
    expect(isPoolCon(connection)).toBe(false);
  });

  it('should return false for a non-object connection', () => {
    const connection = null;
    expect(isPoolCon(connection)).toBe(false);
  });

  it('should return false for a connection with a non-symbol id', () => {
    const connection = { id: 'PoolConnection' }; // id is a string, not a symbol
    expect(isPoolCon(connection)).toBe(false);
  });
});

describe('Color Functions', () => {
  test('red function should wrap text in red ANSI codes', () => {
    expect(red('error')).toBe('\x1b[31merror\x1b[0m');
  });

  test('green function should wrap text in green ANSI codes', () => {
    expect(green('success')).toBe('\x1b[32msuccess\x1b[0m');
  });

  test('blue function should wrap text in blue ANSI codes', () => {
    expect(blue('info')).toBe('\x1b[36minfo\x1b[0m');
  });

  test('orange function should wrap text in yellow ANSI codes', () => {
    expect(orange('warning')).toBe('\x1b[33mwarning\x1b[0m');
  });
});

describe('Bugger Function', () => {
  test('bugger should log formatted error message', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const error = new Error('Test error');
    bugger(error);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('❌  ERROR OCCURRED')
    );

    consoleSpy.mockRestore();
  });
});
