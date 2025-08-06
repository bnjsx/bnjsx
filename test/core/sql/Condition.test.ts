import { config } from '../../../src/config';
import { Driver, Select } from '../../../src/core';
import { Condition, ref } from '../../../src/core';

import {
  exDate,
  exTime,
  exYear,
  exMonth,
  exDay,
  exHour,
  exMinute,
  exSecond,
} from '../../../src/core';

import { QueryError } from '../../../src/errors';

const mock = {
  connection: () => {
    return {
      id: Symbol('PoolConnection'),
      driver: { id: Symbol('MySQL') },
      query: jest.fn(() => Promise.resolve()),
    } as any;
  },
  mysql: () => {
    return { id: Symbol('MySQL') } as any as Driver;
  },
  sqlite: () => {
    return { id: Symbol('SQLite') } as any as Driver;
  },
  pg: () => {
    return { id: Symbol('PostgreSQL') } as any as Driver;
  },
  query: () => new Select(mock.connection()),
};

describe('ref', () => {
  test('should return a Ref instance for valid column name', () => {
    const result = ref('column_name');
    expect(result).toBeInstanceOf(Object);
    expect(result.column).toBe('column_name');
  });

  test('should throw QueryError for invalid column name', () => {
    expect(() => ref(123 as any)).toThrow(QueryError);
  });
});

describe('exDate', () => {
  test('should return DATE(col) for valid column', () => {
    expect(exDate('created_at')).toBe('DATE(created_at)');
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exDate(123 as any)).toThrow(QueryError);
  });
});

describe('exTime', () => {
  const driver = mock.mysql();

  test('should hanlde MySQL', () => {
    const driver = mock.mysql();

    expect(exTime('created_at', driver)).toBe('TIME(created_at)');
  });

  test('should handle PostgreSQL', () => {
    const driver = mock.pg();

    expect(exTime('created_at', driver)).toBe(
      "TO_CHAR(created_at, 'HH24:MI:SS')"
    );
  });

  test('should handle SQLite', () => {
    const driver = mock.sqlite();

    expect(exTime('created_at', driver)).toBe(
      "STRFTIME('%H:%M:%S', created_at)"
    );
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exTime(123 as any, driver)).toThrow(QueryError);
  });
});

describe('exYear', () => {
  const driver = mock.mysql();

  test('should handle MySQL', () => {
    const driver = mock.mysql();

    expect(exYear('created_at', driver)).toBe('YEAR(created_at)');
  });

  test('should handle PostgreSQL', () => {
    const driver = mock.pg();

    expect(exYear('created_at', driver)).toBe('EXTRACT(YEAR FROM created_at)');
  });

  test('should handle SQLite', () => {
    const driver = mock.sqlite();

    expect(exYear('created_at', driver)).toBe("STRFTIME('%Y', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exYear(123 as any, driver)).toThrow(QueryError);
  });
});

describe('exMonth', () => {
  const driver = mock.mysql();

  test('should handle MySQL', () => {
    const driver = mock.mysql();

    expect(exMonth('created_at', driver)).toBe('MONTH(created_at)');
  });

  test('should handle PostgreSQL', () => {
    const driver = mock.pg();

    expect(exMonth('created_at', driver)).toBe(
      'EXTRACT(MONTH FROM created_at)'
    );
  });

  test('should handle SQLite', () => {
    const driver = mock.sqlite();

    expect(exMonth('created_at', driver)).toBe("STRFTIME('%m', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exMonth(123 as any, driver)).toThrow(QueryError);
  });
});

describe('exDay', () => {
  const driver = mock.mysql();

  test('should handle MySQL', () => {
    const driver = mock.mysql();

    expect(exDay('created_at', driver)).toBe('DAY(created_at)');
  });

  test('should handle PostgreSQL', () => {
    const driver = mock.pg();

    expect(exDay('created_at', driver)).toBe('EXTRACT(DAY FROM created_at)');
  });

  test('should handle SQLite', () => {
    const driver = mock.sqlite();

    expect(exDay('created_at', driver)).toBe("STRFTIME('%d', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exDay(123 as any, driver)).toThrow(QueryError);
  });
});

describe('exHour', () => {
  const driver = mock.mysql();

  test('should handle MySQL', () => {
    const driver = mock.mysql();

    expect(exHour('created_at', driver)).toBe('HOUR(created_at)');
  });

  test('should handle PostgreSQL', () => {
    const driver = mock.pg();

    expect(exHour('created_at', driver)).toBe('EXTRACT(HOUR FROM created_at)');
  });

  test('should handle SQLite', () => {
    const driver = mock.sqlite();

    expect(exHour('created_at', driver)).toBe("STRFTIME('%H', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exHour(123 as any, driver)).toThrow(QueryError);
  });
});

describe('exMinute', () => {
  const driver = mock.mysql();

  test('should handle MySQL', () => {
    const driver = mock.mysql();

    expect(exMinute('created_at', driver)).toBe('MINUTE(created_at)');
  });

  test('should handle PostgreSQL', () => {
    const driver = mock.pg();

    expect(exMinute('created_at', driver)).toBe(
      'EXTRACT(MINUTE FROM created_at)'
    );
  });

  test('should handle SQLite', () => {
    const driver = mock.sqlite();

    expect(exMinute('created_at', driver)).toBe("STRFTIME('%M', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exMinute(123 as any, driver)).toThrow(QueryError);
  });
});

describe('exSecond', () => {
  const driver = mock.mysql();

  test('should handle MySQL', () => {
    const driver = mock.mysql();

    expect(exSecond('created_at', driver)).toBe('SECOND(created_at)');
  });

  test('should handle PostgreSQL', () => {
    const driver = mock.pg();

    expect(exSecond('created_at', driver)).toBe(
      'EXTRACT(SECOND FROM created_at)'
    );
  });

  test('should handle SQLite', () => {
    const driver = mock.sqlite();

    expect(exSecond('created_at', driver)).toBe("STRFTIME('%S', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exSecond(123 as any, driver)).toThrow(QueryError);
  });
});

describe('Condition', () => {
  let condition: any;
  let driver: Driver;

  beforeEach(() => {
    driver = mock.connection().driver;
    condition = new Condition(driver);

    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should throw an error if an invalid query instance is provided', () => {
      expect(() => new Condition({} as any)).toThrow(QueryError);
    });

    it('should initialize correctly with a valid query instance', () => {
      expect(new Condition(driver)).toBeInstanceOf(Condition);
    });
  });

  describe('build', () => {
    test('should return the valid condition string', () => {
      condition.col('age').greaterThan(18).and().col('status').equal('active');
      expect(condition.build()).toBe('age > ? AND status = ?');
    });
  });

  describe('raw', () => {
    test('should add a valid raw SQL condition with values', () => {
      condition.raw('age > ? AND status = ?', 18, 'active');
      expect(condition.stack).toContain('age > ? AND status = ?');
      expect(condition.values).toEqual([18, 'active']);
    });

    test('should add a valid raw SQL condition without values', () => {
      condition.raw('age > 18');
      expect(condition.stack).toContain('age > 18');
      expect(condition.values).toEqual([]);
    });

    test('should throw an error if condition is not a string', () => {
      expect(() => condition.raw(123 as any)).toThrow(
        new QueryError('Invalid condition: 123')
      );
    });

    test('should add condition when values array is empty', () => {
      condition.raw('age > ?');
      expect(condition.stack).toContain('age > ?');
      expect(condition.values).toEqual([]);
    });

    test('should correctly add multiple valid values to the query values array', () => {
      condition.raw('age > ? AND name = ?', 25, 'John');
      expect(condition.values).toEqual([25, 'John']);
    });
  });

  describe('not', () => {
    it('should set negate flag to true', () => {
      condition.not();
      expect(condition.negate).toBe(true);
    });
  });

  describe('open / close', () => {
    it('should add opening and closing parentheses to stack', () => {
      condition.open().col('age').lessThan('18').close();
      expect(condition.build()).toBe('(age < ?)');
    });
  });

  describe('and / or', () => {
    it('should add AND operator to the stack', () => {
      condition.col('age').lessThan('18').and().col('status').equal('active');
      expect(condition.build()).toBe('age < ? AND status = ?');
    });

    it('should add OR operator to the stack', () => {
      condition.col('age').lessThan('18').or().col('status').equal('active');
      expect(condition.build()).toBe('age < ? OR status = ?');
    });
  });

  describe('paren', () => {
    it('should toggle open and close parentheses based on opened count', () => {
      condition.paren().col('age').lessThan(18).paren();
      expect(condition.build()).toBe('(age < ?)');
    });
  });

  describe('col', () => {
    it('should set the column name if it is valid snake_case', () => {
      condition.col('user_id');
      expect(condition.column).toBe('user_id');
    });

    it('should throw an error for invalid column name', () => {
      expect(() => condition.col('')).toThrow(QueryError);
    });
  });

  describe('inDate', () => {
    test('should add a valid date comparison condition', () => {
      condition.column = 'created_at';
      condition.inDate('2023-05-01');
      expect(condition.stack).toContain('DATE(created_at) = ?');
      expect(condition.values).toEqual(['2023-05-01']);
    });

    test('should add a valid date comparison condition with a reference', () => {
      condition.column = 'created_at';
      condition.inDate(ref('orders.date'));
      expect(condition.stack).toContain('DATE(created_at) = orders.date');
      expect(condition.values).toEqual([]);
    });

    test('should throw an error for an invalid column', () => {
      expect(() => condition.inDate('2023-05-01')).toThrow(QueryError);
    });

    test('should throw an error for an invalid date', () => {
      condition.column = 'created_at';
      expect(() => condition.inDate('')).toThrow(
        new QueryError('Invalid date: ')
      );
    });

    test('should apply NOT condition when negate is set', () => {
      condition.column = 'created_at';
      condition.negate = true;
      condition.inDate('2023-05-01');
      expect(condition.stack).toContain('NOT DATE(created_at) = ?');
      expect(condition.values).toEqual(['2023-05-01']);
    });
  });

  describe('inTime', () => {
    test('should add a valid time comparison condition for MySQL', () => {
      condition.column = 'created_at';

      // Use a MySQL driver
      condition.driver = mock.mysql();

      condition.inTime('15:30:00');
      expect(condition.stack).toContain('TIME(created_at) = ?');
      expect(condition.values).toEqual(['15:30:00']);
    });

    test('should add a valid time comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';

      // Use an PostgreSQL driver
      condition.driver = mock.pg();

      condition.inTime('15:30:00');
      expect(condition.stack).toContain(
        "TO_CHAR(created_at, 'HH24:MI:SS') = ?"
      );
      expect(condition.values).toEqual(['15:30:00']);
    });

    test('should add a valid time comparison condition for SQLite', () => {
      condition.column = 'created_at';

      // Use an SQLite driver
      condition.driver = mock.sqlite();

      condition.inTime('15:30:00');
      expect(condition.stack).toContain("STRFTIME('%H:%M:%S', created_at) = ?");
      expect(condition.values).toEqual(['15:30:00']);
    });

    test('should add a valid time comparison condition with a reference', () => {
      condition.column = 'created_at';

      // Use a MySQL driver
      condition.driver = mock.mysql();

      condition.inTime(ref('orders.time'));
      expect(condition.stack).toContain('TIME(created_at) = orders.time');
      expect(condition.values).toEqual([]);
    });

    test('should throw an error for an invalid time', () => {
      condition.column = 'created_at';

      expect(() => condition.inTime('')).toThrow(
        new QueryError('Invalid time: ')
      );
    });

    test('should apply NOT condition when negate is set', () => {
      condition.column = 'created_at';

      // Spy on ORMTEST.is.mysql
      condition.driver = mock.mysql();

      condition.negate = true;
      condition.inTime('15:30:00');
      expect(condition.stack).toContain('NOT TIME(created_at) = ?');
      expect(condition.values).toEqual(['15:30:00']);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inTime('23:33:40')).toThrow(QueryError);
    });
  });

  describe('inYear', () => {
    test('should add a valid year comparison condition for MySQL', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.driver = mock.mysql();

      condition.inYear(2023);
      expect(condition.stack).toContain('YEAR(created_at) = ?');
      expect(condition.values).toEqual([2023]);
    });

    test('should add a valid year comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';

      // Use PostgreSQL driver
      condition.driver = mock.pg();

      condition.inYear(2023);
      expect(condition.stack).toContain('EXTRACT(YEAR FROM created_at) = ?');
      expect(condition.values).toEqual([2023]);
    });

    test('should add a valid year comparison condition for SQLite', () => {
      condition.column = 'created_at';

      // Use SQLite driver
      condition.driver = mock.sqlite();

      condition.inYear(2023);
      expect(condition.stack).toContain("STRFTIME('%Y', created_at) = ?");
      expect(condition.values).toEqual([2023]);
    });

    test('should add a valid year comparison condition with a reference', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.driver = mock.mysql();

      condition.inYear(ref('orders.year'));
      expect(condition.stack).toContain('YEAR(created_at) = orders.year');
      expect(condition.values).toEqual([]);
    });

    test('should throw an error for invalid year format', () => {
      condition.column = 'created_at';

      expect(() => condition.inYear(0)).toThrow(
        new QueryError('Invalid year: 0')
      );

      expect(() => condition.inYear(-2023)).toThrow(
        new QueryError('Invalid year: -2023')
      );

      expect(() => condition.inYear('2023')).toThrow(
        new QueryError('Invalid year: 2023')
      );
    });

    test('should apply NOT condition when negate is set', () => {
      condition.column = 'created_at';

      // Spy on ORMTest.is.mysql
      condition.driver = mock.mysql();

      condition.negate = true;
      condition.inYear(2023);
      expect(condition.stack).toContain('NOT YEAR(created_at) = ?');
      expect(condition.values).toEqual([2023]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inYear(2000)).toThrow(QueryError);
    });
  });

  describe('inMonth', () => {
    test('should add a valid month comparison condition for MySQL', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.driver = mock.mysql();

      condition.inMonth(5); // May
      expect(condition.stack).toContain('MONTH(created_at) = ?');
      expect(condition.values).toEqual([5]);
    });

    test('should add a valid month comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';

      // Use PostgreSQL driver
      condition.driver = mock.pg();

      condition.inMonth(5); // May
      expect(condition.stack).toContain('EXTRACT(MONTH FROM created_at) = ?');
      expect(condition.values).toEqual([5]);
    });

    test('should add a valid month comparison condition for SQLite', () => {
      condition.column = 'created_at';

      // Use SQLite driver
      condition.driver = mock.sqlite();

      condition.inMonth(5); // May
      expect(condition.stack).toContain("STRFTIME('%m', created_at) = ?");
      expect(condition.values).toEqual([5]);
    });

    test('should add a valid month comparison condition with a reference', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.driver = mock.mysql();

      condition.inMonth(ref('orders.month')); // May
      expect(condition.stack).toContain('MONTH(created_at) = orders.month');
      expect(condition.values).toEqual([]);
    });

    test('should throw an error for invalid month value', () => {
      condition.column = 'created_at';

      expect(() => condition.inMonth(0)).toThrow(
        new QueryError('Invalid month: 0')
      );

      expect(() => condition.inMonth(13)).toThrow(
        new QueryError('Invalid month: 13')
      );

      expect(() => condition.inMonth('May')).toThrow(
        new QueryError('Invalid month: May')
      );
    });

    test('should apply NOT condition when negate is set', () => {
      condition.column = 'created_at';

      // Spy on ORMTest.is.mysql
      condition.driver = mock.mysql();

      condition.negate = true;
      condition.inMonth(5);
      expect(condition.stack).toContain('NOT MONTH(created_at) = ?');
      expect(condition.values).toEqual([5]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inMonth(11)).toThrow(QueryError);
    });
  });

  describe('inDay', () => {
    test('should add a valid day comparison condition for MySQL', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.driver = mock.mysql();

      condition.inDay(15); // 15th day of the month
      expect(condition.stack).toContain('DAY(created_at) = ?');
      expect(condition.values).toEqual([15]);
    });

    test('should add a valid day comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';

      // Use PostgreSQL driver
      condition.driver = mock.pg();

      condition.inDay(15); // 15th day of the month
      expect(condition.stack).toContain('EXTRACT(DAY FROM created_at) = ?');
      expect(condition.values).toEqual([15]);
    });

    test('should add a valid day comparison condition for SQLite', () => {
      condition.column = 'created_at';

      // Use SQLite driver
      condition.driver = mock.sqlite();

      condition.inDay(15); // 15th day of the month
      expect(condition.stack).toContain("STRFTIME('%d', created_at) = ?");
      expect(condition.values).toEqual([15]);
    });

    test('should add a valid day comparison condition with a reference', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.driver = mock.mysql();

      condition.inDay(ref('orders.day')); // May
      expect(condition.stack).toContain('DAY(created_at) = orders.day');
      expect(condition.values).toEqual([]);
    });

    test('should throw an error for invalid day value', () => {
      condition.column = 'created_at';

      expect(() => condition.inDay(0)).toThrow(
        new QueryError('Invalid day: 0')
      );
      expect(() => condition.inDay(32)).toThrow(
        new QueryError('Invalid day: 32')
      );
      expect(() => condition.inDay('15')).toThrow(
        new QueryError('Invalid day: 15')
      );
    });

    test('should apply NOT condition when negate is set', () => {
      condition.column = 'created_at';

      // Spy on ORMTest.is.mysql
      condition.driver = mock.mysql();

      condition.negate = true;
      condition.inDay(15);
      expect(condition.stack).toContain('NOT DAY(created_at) = ?');
      expect(condition.values).toEqual([15]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inDay(23)).toThrow(QueryError);
    });
  });

  describe('inHour', () => {
    test('should add a valid hour comparison condition for MySQL', () => {
      condition.column = 'created_at';
      condition.driver = mock.mysql();

      condition.inHour(12);

      expect(condition.stack).toContain('HOUR(created_at) = ?');
      expect(condition.values).toEqual([12]);
    });

    test('should add a valid hour comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';
      condition.driver = mock.pg();

      condition.inHour(12);

      expect(condition.stack).toContain('EXTRACT(HOUR FROM created_at) = ?');
      expect(condition.values).toEqual([12]);
    });

    test('should add a valid hour comparison condition for SQLite', () => {
      condition.column = 'created_at';
      condition.driver = mock.sqlite();

      condition.inHour(12);

      expect(condition.stack).toContain("STRFTIME('%H', created_at) = ?");
      expect(condition.values).toEqual([12]);
    });

    test('should add a valid hour comparison condition with a reference', () => {
      condition.column = 'created_at';
      condition.driver = mock.mysql();

      condition.inHour(ref('orders.hour'));

      expect(condition.stack).toContain('HOUR(created_at) = orders.hour');
      expect(condition.values).toEqual([]);
    });

    test('should throw an error for invalid hour value', () => {
      condition.column = 'created_at';

      expect(() => condition.inHour(-1)).toThrow(
        new QueryError('Invalid hour: -1')
      );

      expect(() => condition.inHour(24)).toThrow(
        new QueryError('Invalid hour: 24')
      );

      expect(() => condition.inHour('23')).toThrow(
        new QueryError('Invalid hour: 23')
      );
    });

    test('should apply NOT condition when negate is set', () => {
      condition.column = 'created_at';

      // Spy on ORMTest.is.mysql
      condition.driver = mock.mysql();

      condition.negate = true;
      condition.inHour(15);
      expect(condition.stack).toContain('NOT HOUR(created_at) = ?');
      expect(condition.values).toEqual([15]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inHour(25)).toThrow(QueryError);
    });
  });

  describe('inMinute', () => {
    test('should add a valid minute comparison condition for MySQL', () => {
      condition.column = 'created_at';
      condition.driver = mock.mysql();

      condition.inMinute(34);

      expect(condition.stack).toContain('MINUTE(created_at) = ?');
      expect(condition.values).toEqual([34]);
    });

    test('should add a valid minute comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';
      condition.driver = mock.pg();

      condition.inMinute(34);

      expect(condition.stack).toContain('EXTRACT(MINUTE FROM created_at) = ?');
      expect(condition.values).toEqual([34]);
    });

    test('should add a valid minute comparison condition for SQLite', () => {
      condition.column = 'created_at';
      condition.driver = mock.sqlite();

      condition.inMinute(34);

      expect(condition.stack).toContain("STRFTIME('%M', created_at) = ?");
      expect(condition.values).toEqual([34]);
    });

    test('should add a valid minute comparison condition with a reference', () => {
      condition.column = 'created_at';

      condition.driver = mock.mysql();

      condition.inMinute(ref('orders.minute'));

      expect(condition.stack).toContain('MINUTE(created_at) = orders.minute');
      expect(condition.values).toEqual([]);
    });

    test('should throw an error for invalid minute value', () => {
      condition.column = 'created_at';

      expect(() => condition.inMinute(-1)).toThrow(
        new QueryError('Invalid minute: -1')
      );

      expect(() => condition.inMinute(60)).toThrow(
        new QueryError('Invalid minute: 60')
      );

      expect(() => condition.inMinute('23')).toThrow(
        new QueryError('Invalid minute: 23')
      );
    });

    test('should apply NOT condition when negate is set', () => {
      condition.column = 'created_at';

      // Spy on ORMTest.is.mysql
      condition.driver = mock.mysql();

      condition.negate = true;
      condition.inMinute(15);
      expect(condition.stack).toContain('NOT MINUTE(created_at) = ?');
      expect(condition.values).toEqual([15]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inMinute(25)).toThrow(QueryError);
    });
  });

  describe('inSecond', () => {
    test('should add a valid second comparison condition for MySQL', () => {
      condition.column = 'created_at';
      condition.driver = mock.mysql();

      condition.inSecond(56);

      expect(condition.stack).toContain('SECOND(created_at) = ?');
      expect(condition.values).toEqual([56]);
    });

    test('should add a valid second comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';
      condition.driver = mock.pg();

      condition.inSecond(56);

      expect(condition.stack).toContain('EXTRACT(SECOND FROM created_at) = ?');
      expect(condition.values).toEqual([56]);
    });

    test('should add a valid second comparison condition for SQLite', () => {
      condition.column = 'created_at';
      condition.driver = mock.sqlite();

      condition.inSecond(56);

      expect(condition.stack).toContain("STRFTIME('%S', created_at) = ?");
      expect(condition.values).toEqual([56]);
    });

    test('should add a valid second comparison condition with a reference', () => {
      condition.column = 'created_at';

      condition.driver = mock.mysql();

      condition.inSecond(ref('orders.second'));

      expect(condition.stack).toContain('SECOND(created_at) = orders.second');
      expect(condition.values).toEqual([]);
    });

    test('should throw an error for invalid second value', () => {
      condition.column = 'created_at';

      expect(() => condition.inSecond(-1)).toThrow(
        new QueryError('Invalid second: -1')
      );

      expect(() => condition.inSecond(60)).toThrow(
        new QueryError('Invalid second: 60')
      );

      expect(() => condition.inSecond('23')).toThrow(
        new QueryError('Invalid second: 23')
      );
    });

    test('should apply NOT condition when negate is set', () => {
      condition.column = 'created_at';

      // Spy on ORMTest.is.mysql
      condition.driver = mock.mysql();

      condition.negate = true;
      condition.inSecond(15);
      expect(condition.stack).toContain('NOT SECOND(created_at) = ?');
      expect(condition.values).toEqual([15]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inSecond(25)).toThrow(QueryError);
    });
  });

  describe('equal', () => {
    it('should generate the correct equality condition for numbers', () => {
      const query = condition.col('age').equal(30).build();
      expect(query).toBe('age = ?');
      expect(condition.values).toEqual([30]);
    });

    it('should support null values', () => {
      const query = condition.col('age').equal(null).build();
      expect(query).toBe('age IS NULL');
      expect(condition.values).toEqual([]);
    });

    it('should generate the correct equality condition with a reference', () => {
      const query = condition
        .col('users.id')
        .equal(ref('profiles.user_id'))
        .build();
      expect(query).toBe('users.id = profiles.user_id');
      expect(condition.values).toEqual([]);
    });

    it('should generate the correct equality condition for strings', () => {
      const query = condition.col('username').equal('JohnDoe').build();
      expect(query).toBe('username = ?');
    });

    it('should throw an error for invalid column name', () => {
      expect(() => condition.equal(100).build()).toThrow(QueryError);
    });

    it('should handle the NOT condition for equal', () => {
      const query = condition.col('age').not().equal(30).build();
      expect(query).toBe('NOT age = ?');
    });
  });

  describe('lessThan', () => {
    it('should generate the correct less-than condition for numbers', () => {
      const query = condition.col('price').lessThan(100).build();
      expect(query).toBe('price < ?');
      expect(condition.values).toEqual([100]);
    });

    it('should generate the correct less-than condition for date strings', () => {
      const query = condition.col('order_date').lessThan('2023-01-01').build();
      expect(query).toBe('order_date < ?');
    });

    it('should generate the correct less-than condition with a reference', () => {
      const query = condition
        .col('price')
        .lessThan(ref('table.column'))
        .build();
      expect(query).toBe('price < table.column');
      expect(condition.values).toEqual([]);
    });

    it('should throw an error for invalid column name', () => {
      expect(() => condition.lessThan(100).build()).toThrow(QueryError);
    });

    it('should handle the NOT condition for lessThan', () => {
      const query = condition.col('price').not().lessThan(100).build();
      expect(query).toBe('NOT price < ?');
    });
  });

  describe('lessThanOrEqual', () => {
    it('should generate the correct less-than-or-equal condition for numbers', () => {
      expect(condition.col('stock').lessThanOrEqual(50).build()).toBe(
        'stock <= ?'
      );
      expect(condition.values).toEqual([50]);
    });

    it('should generate the correct less-than-or-equal condition for date strings', () => {
      expect(
        condition.col('order_date').lessThanOrEqual('2023-01-01').build()
      ).toBe('order_date <= ?');
    });

    it('should generate the correct less-than-or-equal condition with a reference', () => {
      expect(
        condition.col('stock').lessThanOrEqual(ref('table.column')).build()
      ).toBe('stock <= table.column');
      expect(condition.values).toEqual([]);
    });

    it('should throw an error for invalid column name', () => {
      expect(() => condition.lessThanOrEqual(50).build()).toThrow(QueryError);
    });

    it('should handle the NOT condition for lessThanOrEqual', () => {
      const query = condition.col('stock').not().lessThanOrEqual(50).build();
      expect(query).toBe('NOT stock <= ?');
    });
  });

  describe('greaterThan', () => {
    it('should generate the correct greater-than condition for numbers', () => {
      expect(condition.col('salary').greaterThan(50000).build()).toBe(
        'salary > ?'
      );
      expect(condition.values).toEqual([50000]);
    });

    it('should generate the correct greater-than condition for date strings', () => {
      expect(
        condition.col('start_date').greaterThan('2023-01-01').build()
      ).toBe('start_date > ?');
    });

    it('should generate the correct greater-than condition with a reference', () => {
      expect(
        condition.col('salary').greaterThan(ref('table.column')).build()
      ).toBe('salary > table.column');
      expect(condition.values).toEqual([]);
    });

    it('should throw an error for invalid column name', () => {
      expect(() => condition.greaterThan(50000).build()).toThrow(QueryError);
    });

    it('should handle the NOT condition for greaterThan', () => {
      const query = condition.col('salary').not().greaterThan(50000).build();
      expect(query).toBe('NOT salary > ?');
    });
  });

  describe('greaterThanOrEqual', () => {
    it('should generate the correct greater-than-or-equal condition for numbers', () => {
      expect(condition.col('age').greaterThanOrEqual(18).build()).toBe(
        'age >= ?'
      );

      expect(condition.values).toEqual([18]);
    });

    it('should generate the correct greater-than-or-equal condition for date strings', () => {
      expect(
        condition.col('signup_date').greaterThanOrEqual('2023-01-01').build()
      ).toBe('signup_date >= ?');
    });

    it('should generate the correct greater-than-or-equal condition with a reference', () => {
      expect(
        condition.col('age').greaterThanOrEqual(ref('table.column')).build()
      ).toBe('age >= table.column');

      expect(condition.values).toEqual([]);
    });

    it('should throw an error for invalid column name', () => {
      expect(() => condition.greaterThanOrEqual(18).build()).toThrow(
        QueryError
      );
    });

    it('should handle the NOT condition for greaterThanOrEqual', () => {
      const query = condition.col('age').not().greaterThanOrEqual(18).build();
      expect(query).toBe('NOT age >= ?');
    });
  });

  describe('between', () => {
    it('should generate the correct BETWEEN condition for numbers', () => {
      const query = condition.col('price').between(100, 200).build();
      expect(query).toBe('price BETWEEN ? AND ?');
      expect(condition.values).toEqual([100, 200]);
    });

    it('should generate the correct BETWEEN condition for string values', () => {
      const query = condition
        .col('created_at')
        .between('2023-01-01', '2023-12-31')
        .build();
      expect(query).toBe('created_at BETWEEN ? AND ?');
      expect(condition.values).toEqual(['2023-01-01', '2023-12-31']);
    });

    it('should generate the correct BETWEEN condition with a reference', () => {
      const query = condition
        .col('price')
        .between(ref('table.column'), ref('table.column'))
        .build();
      expect(query).toBe('price BETWEEN table.column AND table.column');
      expect(condition.values).toEqual([]);
    });

    it('should throw an error if the start value is invalid', () => {
      expect(() => {
        condition.col('price').between({}, 200).build();
      }).toThrow(new QueryError('Invalid start value: [object Object]'));
    });

    it('should throw an error if the end value is invalid', () => {
      expect(() => {
        condition.col('price').between(100, {}).build();
      }).toThrow(new QueryError('Invalid end value: [object Object]'));
    });

    it('should throw an error for invalid column name', () => {
      expect(() => condition.between(30, 50).build()).toThrow(QueryError);
    });

    it('should handle the NOT condition for between', () => {
      const query = condition
        .col('created_at')
        .not()
        .between('2023-01-01', '2023-12-31')
        .build();
      expect(query).toBe('NOT created_at BETWEEN ? AND ?');
    });
  });

  describe('in', () => {
    it('should generate the correct IN condition for numbers', () => {
      const query = condition.col('id').in(1, 2, 3).build();
      expect(query).toBe('id IN (?, ?, ?)');
      expect(condition.values).toEqual([1, 2, 3]);
    });

    it('should generate the correct IN condition for strings', () => {
      const query = condition
        .col('status')
        .in('active', 'pending', 'inactive')
        .build();
      expect(query).toBe('status IN (?, ?, ?)');
      expect(condition.values).toEqual(['active', 'pending', 'inactive']);
    });

    it('should generate the correct IN condition with a reference', () => {
      const query = condition.col('id').in(ref('table.column'), 2, 3).build();
      expect(query).toBe('id IN (table.column, ?, ?)');
      expect(condition.values).toEqual([2, 3]);
    });

    it('should throw an error if the values array is empty', () => {
      expect(() => {
        condition.col('status').in().build();
      }).toThrow(new QueryError('Values array cannot be empty for IN clause'));
    });

    it('should throw an error for invalid column name', () => {
      expect(() => condition.in([30, 123]).build()).toThrow(QueryError);
    });

    it('should handle the NOT condition for in', () => {
      const query = condition
        .col('status')
        .not()
        .in('active', 'pending', 'inactive')
        .build();
      expect(query).toBe('NOT status IN (?, ?, ?)');
    });
  });

  describe('like', () => {
    it('should generate the correct LIKE condition', () => {
      const query = condition.col('name').like('%John%').build();
      expect(query).toBe('name LIKE ?');
      expect(condition.values).toEqual(['%John%']);
    });

    it('should generate the correct LIKE condition with a reference', () => {
      const query = condition.col('name').like(ref('table.column')).build();
      expect(query).toBe('name LIKE table.column');
      expect(condition.values).toEqual([]);
    });

    it('should throw an error if the value is not a non-empty string', () => {
      expect(() => {
        condition.col('name').like('').build();
      }).toThrow(new QueryError('Invalid value: '));

      expect(() => {
        condition.col('name').like(123).build();
      }).toThrow(new QueryError('Invalid value: 123'));
    });

    it('should throw an error for invalid column name', () => {
      expect(() => {
        condition.like('%John%').build();
      }).toThrow(QueryError);
    });

    it('should handle the NOT condition for like', () => {
      const query = condition.col('name').not().like('%John%').build();
      expect(query).toBe('NOT name LIKE ?');
    });
  });

  describe('isNull', () => {
    it('should generate the correct IS NULL condition', () => {
      const query = condition.col('email').isNull().build();
      expect(query).toBe('email IS NULL');
      expect(condition.values).toEqual([]); // No values for IS NULL
    });

    it('should handle the NOT condition when negated', () => {
      const query = condition.col('email').not().isNull().build();
      expect(query).toBe('NOT email IS NULL');
    });

    it('should throw an error for invalid column name', () => {
      expect(() => {
        condition.isNull().build();
      }).toThrow(QueryError);
    });
  });

  describe('isTrue', () => {
    it('should generate the correct condition', () => {
      const query = condition.col('has_email').isTrue().build();
      expect(query).toBe('has_email = ?');
      expect(condition.values).toEqual([true]); // No values for IS NULL
    });

    it('should handle the NOT condition when negated', () => {
      const query = condition.col('has_email').not().isTrue().build();
      expect(query).toBe('NOT has_email = ?');
      expect(condition.values).toEqual([true]); // No values for IS NULL
    });

    it('should throw an error for invalid column name', () => {
      expect(() => {
        condition.isTrue().build();
      }).toThrow(QueryError);
    });
  });

  describe('isFalse', () => {
    it('should generate the correct condition', () => {
      const query = condition.col('has_email').isFalse().build();
      expect(query).toBe('has_email = ?');
      expect(condition.values).toEqual([false]); // No values for IS NULL
    });

    it('should handle the NOT condition when negated', () => {
      const query = condition.col('has_email').not().isFalse().build();
      expect(query).toBe('NOT has_email = ?');
      expect(condition.values).toEqual([false]); // No values for IS NULL
    });

    it('should throw an error for invalid column name', () => {
      expect(() => {
        condition.isFalse().build();
      }).toThrow(QueryError);
    });
  });
});
