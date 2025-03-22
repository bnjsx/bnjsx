import { Select } from '../../../src/core';
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

import {
  EQUAL,
  LESS,
  LESS_OR_EQUAL,
  MORE,
  MORE_OR_EQUAL,
  NOT_EQUAL,
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
    return { id: Symbol('MySQL') };
  },
  sqlite: () => {
    return { id: Symbol('SQLite') };
  },
  pg: () => {
    return { id: Symbol('PostgreSQL') };
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
  const con = mock.connection();

  test('should hanlde MySQL', () => {
    con.driver = mock.mysql();

    expect(exTime('created_at', con)).toBe('TIME(created_at)');
  });

  test('should handle PostgreSQL', () => {
    con.driver = mock.pg();

    expect(exTime('created_at', con)).toBe("TO_CHAR(created_at, 'HH24:MI:SS')");
  });

  test('should handle SQLite', () => {
    con.driver = mock.sqlite();

    expect(exTime('created_at', con)).toBe("STRFTIME('%H:%M:%S', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exTime(123 as any, con)).toThrow(QueryError);
  });

  test('should throw QueryError for invalid connection', () => {
    expect(() => exTime('created_at', {} as any)).toThrow(QueryError);
  });
});

describe('exYear', () => {
  const con = mock.connection();

  test('should handle MySQL', () => {
    con.driver = mock.mysql();

    expect(exYear('created_at', con)).toBe('YEAR(created_at)');
  });

  test('should handle PostgreSQL', () => {
    con.driver = mock.pg();

    expect(exYear('created_at', con)).toBe('EXTRACT(YEAR FROM created_at)');
  });

  test('should handle SQLite', () => {
    con.driver = mock.sqlite();

    expect(exYear('created_at', con)).toBe("STRFTIME('%Y', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exYear(123 as any, con)).toThrow(QueryError);
  });

  test('should throw QueryError for invalid connection', () => {
    expect(() => exYear('created_at', {} as any)).toThrow(QueryError);
  });
});

describe('exMonth', () => {
  const con = mock.connection();

  test('should handle MySQL', () => {
    con.driver = mock.mysql();

    expect(exMonth('created_at', con)).toBe('MONTH(created_at)');
  });

  test('should handle PostgreSQL', () => {
    con.driver = mock.pg();

    expect(exMonth('created_at', con)).toBe('EXTRACT(MONTH FROM created_at)');
  });

  test('should handle SQLite', () => {
    con.driver = mock.sqlite();

    expect(exMonth('created_at', con)).toBe("STRFTIME('%m', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exMonth(123 as any, con)).toThrow(QueryError);
  });

  test('should throw QueryError for invalid connection', () => {
    expect(() => exMonth('created_at', {} as any)).toThrow(QueryError);
  });
});

describe('exDay', () => {
  const con = mock.connection();

  test('should handle MySQL', () => {
    con.driver = mock.mysql();

    expect(exDay('created_at', con)).toBe('DAY(created_at)');
  });

  test('should handle PostgreSQL', () => {
    con.driver = mock.pg();

    expect(exDay('created_at', con)).toBe('EXTRACT(DAY FROM created_at)');
  });

  test('should handle SQLite', () => {
    con.driver = mock.sqlite();

    expect(exDay('created_at', con)).toBe("STRFTIME('%d', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exDay(123 as any, con)).toThrow(QueryError);
  });

  test('should throw QueryError for invalid connection', () => {
    expect(() => exDay('created_at', {} as any)).toThrow(QueryError);
  });
});

describe('exHour', () => {
  const con = mock.connection();

  test('should handle MySQL', () => {
    con.driver = mock.mysql();

    expect(exHour('created_at', con)).toBe('HOUR(created_at)');
  });

  test('should handle PostgreSQL', () => {
    con.driver = mock.pg();

    expect(exHour('created_at', con)).toBe('EXTRACT(HOUR FROM created_at)');
  });

  test('should handle SQLite', () => {
    con.driver = mock.sqlite();

    expect(exHour('created_at', con)).toBe("STRFTIME('%H', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exHour(123 as any, con)).toThrow(QueryError);
  });

  test('should throw QueryError for invalid connection', () => {
    expect(() => exHour('created_at', {} as any)).toThrow(QueryError);
  });
});

describe('exMinute', () => {
  const con = mock.connection();

  test('should handle MySQL', () => {
    con.driver = mock.mysql();

    expect(exMinute('created_at', con)).toBe('MINUTE(created_at)');
  });

  test('should handle PostgreSQL', () => {
    con.driver = mock.pg();

    expect(exMinute('created_at', con)).toBe('EXTRACT(MINUTE FROM created_at)');
  });

  test('should handle SQLite', () => {
    con.driver = mock.sqlite();

    expect(exMinute('created_at', con)).toBe("STRFTIME('%M', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exMinute(123 as any, con)).toThrow(QueryError);
  });

  test('should throw QueryError for invalid connection', () => {
    expect(() => exMinute('created_at', {} as any)).toThrow(QueryError);
  });
});

describe('exSecond', () => {
  const con = mock.connection();

  test('should handle MySQL', () => {
    con.driver = mock.mysql();

    expect(exSecond('created_at', con)).toBe('SECOND(created_at)');
  });

  test('should handle PostgreSQL', () => {
    con.driver = mock.pg();

    expect(exSecond('created_at', con)).toBe('EXTRACT(SECOND FROM created_at)');
  });

  test('should handle SQLite', () => {
    con.driver = mock.sqlite();

    expect(exSecond('created_at', con)).toBe("STRFTIME('%S', created_at)");
  });

  test('should throw QueryError for invalid column', () => {
    expect(() => exSecond(123 as any, con)).toThrow(QueryError);
  });

  test('should throw QueryError for invalid connection', () => {
    expect(() => exSecond('created_at', {} as any)).toThrow(QueryError);
  });
});

describe('Condition', () => {
  let condition: any;
  let query: Select;

  beforeEach(() => {
    query = mock.query();
    condition = new Condition(query);

    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should throw an error if an invalid query instance is provided', () => {
      expect(() => new Condition({} as any)).toThrow(QueryError);
    });

    it('should initialize correctly with a valid query instance', () => {
      expect(new Condition(query)).toBeInstanceOf(Condition);
    });
  });

  describe('build', () => {
    test('should return the valid condition string', () => {
      condition.col('age').greaterThan(18).and().col('status').equal('active');
      expect(condition.build()).toBe('age > ? AND status = ?');
    });

    test('should throw an error for unmatched parentheses', () => {
      condition.col('age').greaterThan(18).open();
      expect(() => condition.build()).toThrow(
        new QueryError('Syntax error: Unmatched parentheses.')
      );
    });

    test('should throw an error for AND/OR following an opening parenthesis', () => {
      condition.open().and().col('age').equal(18).close();
      expect(() => condition.build()).toThrow(
        new QueryError(
          'Invalid syntax: AND/OR cannot directly follow an opening parenthesis.'
        )
      );
    });

    test('should throw an error for AND/OR preceding a closing parenthesis', () => {
      condition.open().col('age').equal(18).and().close();
      expect(() => condition.build()).toThrow(
        new QueryError(
          'Invalid syntax: AND/OR cannot directly precede a closing parenthesis.'
        )
      );
    });

    test('should throw an error for consecutive AND/OR operators', () => {
      condition.col('age').equal(18).and().and().col('status').equal('active');
      expect(() => condition.build()).toThrow(
        new QueryError('Invalid syntax: Consecutive AND/OR operators found.')
      );
    });

    test('should throw an error for empty parentheses', () => {
      condition.open().close().col('status').equal('active');
      expect(() => condition.build()).toThrow(
        new QueryError('Invalid syntax: Empty parentheses found.')
      );
    });

    test('should throw an error if condition ends with AND/OR', () => {
      condition.col('age').equal(18).and();
      expect(() => condition.build()).toThrow(
        new QueryError('Invalid syntax: Condition cannot end with an operator.')
      );
    });

    test('should throw an error if condition starts with AND/OR', () => {
      condition.and().col('age').equal(18);
      expect(() => condition.build()).toThrow(
        new QueryError(
          'Invalid syntax: Condition cannot start with an operator.'
        )
      );
    });

    test('should throw an error if condition string is empty', () => {
      expect(() => condition.build()).toThrow(
        new QueryError('Invalid syntax: Condition cannot be empty.')
      );
    });
  });

  describe('raw', () => {
    test('should add a valid raw SQL condition with values', () => {
      condition.raw('age > ? AND status = ?', 18, 'active');
      expect(condition.stack).toContain('age > ? AND status = ?');
      expect(condition.query.values).toEqual([18, 'active']);
    });

    test('should add a valid raw SQL condition without values', () => {
      condition.raw('age > 18');
      expect(condition.stack).toContain('age > 18');
      expect(condition.query.values).toEqual([]);
    });

    test('should throw an error if condition is not a string', () => {
      expect(() => condition.raw(123 as any)).toThrow(
        new QueryError('Invalid condition: 123')
      );
    });

    test('should throw an error for invalid value types in the values array', () => {
      expect(() => condition.raw('age > ?', null, {})).toThrow(
        new QueryError('Invalid condition value: null')
      );
    });

    test('should add condition when values array is empty', () => {
      condition.raw('age > ?');
      expect(condition.stack).toContain('age > ?');
      expect(condition.query.values).toEqual([]);
    });

    test('should correctly add multiple valid values to the query values array', () => {
      condition.raw('age > ? AND name = ?', 25, 'John');
      expect(condition.query.values).toEqual([25, 'John']);
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
      expect(condition.query.values).toEqual(['2023-05-01']);
    });

    test('should add a valid date comparison condition with a reference', () => {
      condition.column = 'created_at';
      condition.inDate(ref('orders.date'));
      expect(condition.stack).toContain('DATE(created_at) = orders.date');
      expect(condition.query.values).toEqual([]);
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
      expect(condition.query.values).toEqual(['2023-05-01']);
    });
  });

  describe('inTime', () => {
    test('should add a valid time comparison condition for MySQL', () => {
      condition.column = 'created_at';

      // Use a MySQL driver
      condition.query.connection.driver = mock.mysql();

      condition.inTime('15:30:00');
      expect(condition.stack).toContain('TIME(created_at) = ?');
      expect(condition.query.values).toEqual(['15:30:00']);
    });

    test('should add a valid time comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';

      // Use an PostgreSQL driver
      condition.query.connection.driver = mock.pg();

      condition.inTime('15:30:00');
      expect(condition.stack).toContain(
        "TO_CHAR(created_at, 'HH24:MI:SS') = ?"
      );
      expect(condition.query.values).toEqual(['15:30:00']);
    });

    test('should add a valid time comparison condition for SQLite', () => {
      condition.column = 'created_at';

      // Use an SQLite driver
      condition.query.connection.driver = mock.sqlite();

      condition.inTime('15:30:00');
      expect(condition.stack).toContain("STRFTIME('%H:%M:%S', created_at) = ?");
      expect(condition.query.values).toEqual(['15:30:00']);
    });

    test('should add a valid time comparison condition with a reference', () => {
      condition.column = 'created_at';

      // Use a MySQL driver
      condition.query.connection.driver = mock.mysql();

      condition.inTime(ref('orders.time'));
      expect(condition.stack).toContain('TIME(created_at) = orders.time');
      expect(condition.query.values).toEqual([]);
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
      condition.query.connection.driver = mock.mysql();

      condition.negate = true;
      condition.inTime('15:30:00');
      expect(condition.stack).toContain('NOT TIME(created_at) = ?');
      expect(condition.query.values).toEqual(['15:30:00']);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inTime('23:33:40')).toThrow(QueryError);
    });
  });

  describe('inYear', () => {
    test('should add a valid year comparison condition for MySQL', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.query.connection.driver = mock.mysql();

      condition.inYear(2023);
      expect(condition.stack).toContain('YEAR(created_at) = ?');
      expect(condition.query.values).toEqual([2023]);
    });

    test('should add a valid year comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';

      // Use PostgreSQL driver
      condition.query.connection.driver = mock.pg();

      condition.inYear(2023);
      expect(condition.stack).toContain('EXTRACT(YEAR FROM created_at) = ?');
      expect(condition.query.values).toEqual([2023]);
    });

    test('should add a valid year comparison condition for SQLite', () => {
      condition.column = 'created_at';

      // Use SQLite driver
      condition.query.connection.driver = mock.sqlite();

      condition.inYear(2023);
      expect(condition.stack).toContain("STRFTIME('%Y', created_at) = ?");
      expect(condition.query.values).toEqual([2023]);
    });

    test('should add a valid year comparison condition with a reference', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.query.connection.driver = mock.mysql();

      condition.inYear(ref('orders.year'));
      expect(condition.stack).toContain('YEAR(created_at) = orders.year');
      expect(condition.query.values).toEqual([]);
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
      condition.query.connection.driver = mock.mysql();

      condition.negate = true;
      condition.inYear(2023);
      expect(condition.stack).toContain('NOT YEAR(created_at) = ?');
      expect(condition.query.values).toEqual([2023]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inYear(2000)).toThrow(QueryError);
    });
  });

  describe('inMonth', () => {
    test('should add a valid month comparison condition for MySQL', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.query.connection.driver = mock.mysql();

      condition.inMonth(5); // May
      expect(condition.stack).toContain('MONTH(created_at) = ?');
      expect(condition.query.values).toEqual([5]);
    });

    test('should add a valid month comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';

      // Use PostgreSQL driver
      condition.query.connection.driver = mock.pg();

      condition.inMonth(5); // May
      expect(condition.stack).toContain('EXTRACT(MONTH FROM created_at) = ?');
      expect(condition.query.values).toEqual([5]);
    });

    test('should add a valid month comparison condition for SQLite', () => {
      condition.column = 'created_at';

      // Use SQLite driver
      condition.query.connection.driver = mock.sqlite();

      condition.inMonth(5); // May
      expect(condition.stack).toContain("STRFTIME('%m', created_at) = ?");
      expect(condition.query.values).toEqual([5]);
    });

    test('should add a valid month comparison condition with a reference', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.query.connection.driver = mock.mysql();

      condition.inMonth(ref('orders.month')); // May
      expect(condition.stack).toContain('MONTH(created_at) = orders.month');
      expect(condition.query.values).toEqual([]);
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
      condition.query.connection.driver = mock.mysql();

      condition.negate = true;
      condition.inMonth(5);
      expect(condition.stack).toContain('NOT MONTH(created_at) = ?');
      expect(condition.query.values).toEqual([5]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inMonth(11)).toThrow(QueryError);
    });
  });

  describe('inDay', () => {
    test('should add a valid day comparison condition for MySQL', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.query.connection.driver = mock.mysql();

      condition.inDay(15); // 15th day of the month
      expect(condition.stack).toContain('DAY(created_at) = ?');
      expect(condition.query.values).toEqual([15]);
    });

    test('should add a valid day comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';

      // Use PostgreSQL driver
      condition.query.connection.driver = mock.pg();

      condition.inDay(15); // 15th day of the month
      expect(condition.stack).toContain('EXTRACT(DAY FROM created_at) = ?');
      expect(condition.query.values).toEqual([15]);
    });

    test('should add a valid day comparison condition for SQLite', () => {
      condition.column = 'created_at';

      // Use SQLite driver
      condition.query.connection.driver = mock.sqlite();

      condition.inDay(15); // 15th day of the month
      expect(condition.stack).toContain("STRFTIME('%d', created_at) = ?");
      expect(condition.query.values).toEqual([15]);
    });

    test('should add a valid day comparison condition with a reference', () => {
      condition.column = 'created_at';

      // Use MySQL driver
      condition.query.connection.driver = mock.mysql();

      condition.inDay(ref('orders.day')); // May
      expect(condition.stack).toContain('DAY(created_at) = orders.day');
      expect(condition.query.values).toEqual([]);
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
      condition.query.connection.driver = mock.mysql();

      condition.negate = true;
      condition.inDay(15);
      expect(condition.stack).toContain('NOT DAY(created_at) = ?');
      expect(condition.query.values).toEqual([15]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inDay(23)).toThrow(QueryError);
    });
  });

  describe('inHour', () => {
    test('should add a valid hour comparison condition for MySQL', () => {
      condition.column = 'created_at';
      condition.query.connection.driver = mock.mysql();

      condition.inHour(12);

      expect(condition.stack).toContain('HOUR(created_at) = ?');
      expect(condition.query.values).toEqual([12]);
    });

    test('should add a valid hour comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';
      condition.query.connection.driver = mock.pg();

      condition.inHour(12);

      expect(condition.stack).toContain('EXTRACT(HOUR FROM created_at) = ?');
      expect(condition.query.values).toEqual([12]);
    });

    test('should add a valid hour comparison condition for SQLite', () => {
      condition.column = 'created_at';
      condition.query.connection.driver = mock.sqlite();

      condition.inHour(12);

      expect(condition.stack).toContain("STRFTIME('%H', created_at) = ?");
      expect(condition.query.values).toEqual([12]);
    });

    test('should add a valid hour comparison condition with a reference', () => {
      condition.column = 'created_at';
      condition.query.connection.driver = mock.mysql();

      condition.inHour(ref('orders.hour'));

      expect(condition.stack).toContain('HOUR(created_at) = orders.hour');
      expect(condition.query.values).toEqual([]);
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
      condition.query.connection.driver = mock.mysql();

      condition.negate = true;
      condition.inHour(15);
      expect(condition.stack).toContain('NOT HOUR(created_at) = ?');
      expect(condition.query.values).toEqual([15]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inHour(25)).toThrow(QueryError);
    });
  });

  describe('inMinute', () => {
    test('should add a valid minute comparison condition for MySQL', () => {
      condition.column = 'created_at';
      condition.query.connection.driver = mock.mysql();

      condition.inMinute(34);

      expect(condition.stack).toContain('MINUTE(created_at) = ?');
      expect(condition.query.values).toEqual([34]);
    });

    test('should add a valid minute comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';
      condition.query.connection.driver = mock.pg();

      condition.inMinute(34);

      expect(condition.stack).toContain('EXTRACT(MINUTE FROM created_at) = ?');
      expect(condition.query.values).toEqual([34]);
    });

    test('should add a valid minute comparison condition for SQLite', () => {
      condition.column = 'created_at';
      condition.query.connection.driver = mock.sqlite();

      condition.inMinute(34);

      expect(condition.stack).toContain("STRFTIME('%M', created_at) = ?");
      expect(condition.query.values).toEqual([34]);
    });

    test('should add a valid minute comparison condition with a reference', () => {
      condition.column = 'created_at';

      condition.query.connection.driver = mock.mysql();

      condition.inMinute(ref('orders.minute'));

      expect(condition.stack).toContain('MINUTE(created_at) = orders.minute');
      expect(condition.query.values).toEqual([]);
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
      condition.query.connection.driver = mock.mysql();

      condition.negate = true;
      condition.inMinute(15);
      expect(condition.stack).toContain('NOT MINUTE(created_at) = ?');
      expect(condition.query.values).toEqual([15]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inMinute(25)).toThrow(QueryError);
    });
  });

  describe('inSecond', () => {
    test('should add a valid second comparison condition for MySQL', () => {
      condition.column = 'created_at';
      condition.query.connection.driver = mock.mysql();

      condition.inSecond(56);

      expect(condition.stack).toContain('SECOND(created_at) = ?');
      expect(condition.query.values).toEqual([56]);
    });

    test('should add a valid second comparison condition for PostgreSQL', () => {
      condition.column = 'created_at';
      condition.query.connection.driver = mock.pg();

      condition.inSecond(56);

      expect(condition.stack).toContain('EXTRACT(SECOND FROM created_at) = ?');
      expect(condition.query.values).toEqual([56]);
    });

    test('should add a valid second comparison condition for SQLite', () => {
      condition.column = 'created_at';
      condition.query.connection.driver = mock.sqlite();

      condition.inSecond(56);

      expect(condition.stack).toContain("STRFTIME('%S', created_at) = ?");
      expect(condition.query.values).toEqual([56]);
    });

    test('should add a valid second comparison condition with a reference', () => {
      condition.column = 'created_at';

      condition.query.connection.driver = mock.mysql();

      condition.inSecond(ref('orders.second'));

      expect(condition.stack).toContain('SECOND(created_at) = orders.second');
      expect(condition.query.values).toEqual([]);
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
      condition.query.connection.driver = mock.mysql();

      condition.negate = true;
      condition.inSecond(15);
      expect(condition.stack).toContain('NOT SECOND(created_at) = ?');
      expect(condition.query.values).toEqual([15]);
    });

    test('should throw an error for invalid column name', () => {
      expect(() => condition.inSecond(25)).toThrow(QueryError);
    });
  });

  describe('equal', () => {
    it('should generate the correct equality condition for numbers', () => {
      const query = condition.col('age').equal(30).build();
      expect(query).toBe('age = ?');
      expect(condition.query.values).toEqual([30]);
    });

    it('should generate the correct equality condition with a reference', () => {
      const query = condition
        .col('users.id')
        .equal(ref('profiles.user_id'))
        .build();
      expect(query).toBe('users.id = profiles.user_id');
      expect(condition.query.values).toEqual([]);
    });

    it('should generate the correct equality condition for strings', () => {
      const query = condition.col('username').equal('JohnDoe').build();
      expect(query).toBe('username = ?');
    });

    it('should throw an error for invalid value type', () => {
      expect(() => condition.col('age').equal(undefined).build()).toThrow(
        QueryError
      );
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
      expect(condition.query.values).toEqual([100]);
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
      expect(condition.query.values).toEqual([]);
    });

    it('should throw an error for invalid value type', () => {
      expect(() => condition.col('price').lessThan(undefined).build()).toThrow(
        QueryError
      );
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
      expect(condition.query.values).toEqual([50]);
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
      expect(condition.query.values).toEqual([]);
    });

    it('should throw an error for invalid value type', () => {
      expect(() =>
        condition.col('stock').lessThanOrEqual(undefined).build()
      ).toThrow(QueryError);
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
      expect(condition.query.values).toEqual([50000]);
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
      expect(condition.query.values).toEqual([]);
    });

    it('should throw an error for invalid value type', () => {
      expect(() =>
        condition.col('salary').greaterThan(undefined).build()
      ).toThrow(QueryError);
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

      expect(condition.query.values).toEqual([18]);
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

      expect(condition.query.values).toEqual([]);
    });

    it('should throw an error for invalid value type', () => {
      expect(() =>
        condition.col('age').greaterThanOrEqual(undefined).build()
      ).toThrow(QueryError);
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
      expect(condition.query.values).toEqual([100, 200]);
    });

    it('should generate the correct BETWEEN condition for string values', () => {
      const query = condition
        .col('created_at')
        .between('2023-01-01', '2023-12-31')
        .build();
      expect(query).toBe('created_at BETWEEN ? AND ?');
      expect(condition.query.values).toEqual(['2023-01-01', '2023-12-31']);
    });

    it('should generate the correct BETWEEN condition with a reference', () => {
      const query = condition
        .col('price')
        .between(ref('table.column'), ref('table.column'))
        .build();
      expect(query).toBe('price BETWEEN table.column AND table.column');
      expect(condition.query.values).toEqual([]);
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
      expect(condition.query.values).toEqual([1, 2, 3]);
    });

    it('should generate the correct IN condition for strings', () => {
      const query = condition
        .col('status')
        .in('active', 'pending', 'inactive')
        .build();
      expect(query).toBe('status IN (?, ?, ?)');
      expect(condition.query.values).toEqual(['active', 'pending', 'inactive']);
    });

    it('should generate the correct IN condition with a reference', () => {
      const query = condition.col('id').in(ref('table.column'), 2, 3).build();
      expect(query).toBe('id IN (table.column, ?, ?)');
      expect(condition.query.values).toEqual([2, 3]);
    });

    it('should throw an error if the values array is empty', () => {
      expect(() => {
        condition.col('status').in().build();
      }).toThrow(new QueryError('Values array cannot be empty for IN clause'));
    });

    it('should throw an error if one of the values is invalid', () => {
      expect(() => {
        condition.col('status').in(1, 'active', {}).build();
      }).toThrow(new QueryError('Invalid value: [object Object]'));
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

  describe('inSubquery', () => {
    it('should generate the correct IN condition with a subquery', () => {
      const subquery = (select) => {
        select
          .col('id')
          .from('users')
          .where((col) => col('status').equal('active'));
      };

      const query = condition.col('user_id').inSubquery(subquery).build();
      expect(query).toBe('user_id IN (SELECT id FROM users WHERE status = ?)');
      expect(condition.query.values).toEqual(['active']);
    });

    it('should throw an error if the subquery is not a function', () => {
      expect(() => {
        condition.col('user_id').inSubquery('not a function').build();
      }).toThrow(new QueryError('Invalid subquery: not a function'));
    });

    it('should throw an error for invalid column name', () => {
      expect(() => {
        condition.inSubquery(() => {}).build();
      }).toThrow(QueryError);
    });

    it('should handle the NOT condition for inSubquery', () => {
      const query = condition
        .col('user_id')
        .not()
        .inSubquery((select) => {
          select
            .col('id')
            .from('users')
            .where((col) => col('status').equal('active'));
        })
        .build();
      expect(query).toBe(
        'NOT user_id IN (SELECT id FROM users WHERE status = ?)'
      );
    });
  });

  describe('like', () => {
    it('should generate the correct LIKE condition', () => {
      const query = condition.col('name').like('%John%').build();
      expect(query).toBe('name LIKE ?');
      expect(condition.query.values).toEqual(['%John%']);
    });

    it('should generate the correct LIKE condition with a reference', () => {
      const query = condition.col('name').like(ref('table.column')).build();
      expect(query).toBe('name LIKE table.column');
      expect(condition.query.values).toEqual([]);
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
      expect(condition.query.values).toEqual([]); // No values for IS NULL
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

  describe('exists', () => {
    it('should generate the correct EXISTS condition for a subquery', () => {
      const subquery = (select) => {
        select.from('users').where((col) => col('status').equal('active'));
      };

      const query = condition.col('user_id').exists(subquery).build();
      expect(query).toBe('EXISTS (SELECT * FROM users WHERE status = ?)');
      expect(condition.query.values).toEqual(['active']);
    });

    it('should handle the NOT EXISTS condition when negated', () => {
      const subquery = (select) => {
        select.from('users').where((col) => col('status').equal('inactive'));
      };

      const query = condition.col('user_id').not().exists(subquery).build();
      expect(query).toBe('NOT EXISTS (SELECT * FROM users WHERE status = ?)');
      expect(condition.query.values).toEqual(['inactive']);
    });

    it('should throw an error if the subquery is not a function', () => {
      expect(() => {
        condition.col('user_id').exists('not a function').build();
      }).toThrow(new QueryError('Invalid subquery: not a function'));
    });
  });

  describe('any', () => {
    it('should generate the correct ANY condition for a subquery', () => {
      const subquery = (select) => {
        select.col('age').from('users');
      };

      const query = condition.col('age').any(MORE, subquery).build();
      expect(query).toBe('age > ANY (SELECT age FROM users)');
      expect(condition.query.values).toEqual([]);
    });

    it('should handle the NOT ANY condition when negated', () => {
      const subquery = (select) => {
        select.col('age').from('users');
      };

      const query = condition.col('age').not().any(MORE, subquery).build();
      expect(query).toBe('NOT age > ANY (SELECT age FROM users)');
    });

    it('should throw an error if the operator is invalid', () => {
      const subquery = (select) => {
        select.col('age').from('users');
      };

      expect(() => {
        condition.col('age').any('invalid_operator', subquery).build();
      }).toThrow(new QueryError('Invalid operator: invalid_operator'));

      expect(() => {
        condition.col('age').any(Symbol('hi'), subquery).build();
      }).toThrow(new QueryError('Invalid operator: Symbol(hi)'));
    });

    it('should throw an error if the subquery is not a function', () => {
      expect(() => {
        condition.col('age').any(LESS, 'not a function').build();
      }).toThrow(new QueryError('Invalid subquery: not a function'));
    });

    it('should throw an error for invalid column name', () => {
      expect(() => {
        condition.any(LESS, (select) => {}).build();
      }).toThrow(QueryError);
    });

    it('should reference subquery values', () => {
      // get the name of the first user
      const subquery = (select: Select) =>
        select
          .col('name')
          .from('users')
          .where((col) => col('id').equal(1));

      // get all active users with the same name
      expect(
        condition
          .col('status')
          .equal('active')
          .and()
          .col('name')
          .any(EQUAL, subquery)
          .build()
      ).toBe('status = ? AND name = ANY (SELECT name FROM users WHERE id = ?)');

      expect(condition.query.values).toEqual(['active', 1]);
    });
  });

  describe('all', () => {
    it('should generate the correct ALL condition for a subquery', () => {
      const subquery = (select) => {
        select
          .col('age')
          .from('users')
          .where((col) => col('id').equal(1));
      };

      expect(
        new Condition(mock.query()).col('age').all(MORE, subquery).build()
      ).toBe('age > ALL (SELECT age FROM users WHERE id = ?)');

      expect(
        new Condition(mock.query()).col('age').all(LESS, subquery).build()
      ).toBe('age < ALL (SELECT age FROM users WHERE id = ?)');

      expect(
        new Condition(mock.query())
          .col('age')
          .all(MORE_OR_EQUAL, subquery)
          .build()
      ).toBe('age >= ALL (SELECT age FROM users WHERE id = ?)');

      expect(
        new Condition(mock.query())
          .col('age')
          .all(LESS_OR_EQUAL, subquery)
          .build()
      ).toBe('age <= ALL (SELECT age FROM users WHERE id = ?)');

      expect(
        new Condition(mock.query()).col('age').all(EQUAL, subquery).build()
      ).toBe('age = ALL (SELECT age FROM users WHERE id = ?)');

      expect(
        new Condition(mock.query()).col('age').all(NOT_EQUAL, subquery).build()
      ).toBe('age != ALL (SELECT age FROM users WHERE id = ?)');
    });

    it('should handle the NOT ALL condition when negated', () => {
      const subquery = (select) => {
        select.col('age').from('users');
      };

      expect(condition.col('age').not().all(EQUAL, subquery).build()).toBe(
        'NOT age = ALL (SELECT age FROM users)'
      );
    });

    it('should throw an error if the operator is invalid', () => {
      const subquery = (select) => {
        select.col('age').from('users');
      };

      expect(() => {
        condition.col('age').all('invalid_operator', subquery).build();
      }).toThrow(new QueryError('Invalid operator: invalid_operator'));

      expect(() => {
        condition.col('age').all(Symbol('hi'), subquery).build();
      }).toThrow(new QueryError('Invalid operator: Symbol(hi)'));
    });

    it('should throw an error if the subquery is not a function', () => {
      expect(() => {
        condition.col('age').all(LESS, 'not a function').build();
      }).toThrow(new QueryError('Invalid subquery: not a function'));
    });

    it('should throw an error for invalid column name', () => {
      expect(() => {
        condition.all(LESS, (select) => {}).build();
      }).toThrow(QueryError);
    });
  });
});
