import { ASC, DESC, Select } from '../../../src/core';
import { ref } from '../../../src/core';

const mock = {
  connection: () => {
    return {
      id: Symbol('PoolConnection'),
      driver: { id: Symbol('MySQL') },
      query: jest.fn(() => Promise.resolve()),
    } as any;
  },
};

describe('Select', () => {
  let select: any;

  beforeEach(() => {
    select = new Select(mock.connection());
    jest.resetAllMocks();
  });

  describe('build', () => {
    it('should throw if table name is invalid or missing', () => {
      select.state.table = '';
      expect(() => select.build()).toThrow('Invalid SELECT table: ');

      select.state.table = null;
      expect(() => select.build()).toThrow('Invalid SELECT table: null');

      select.state.table = undefined;
      expect(() => select.build()).toThrow('Invalid SELECT table: undefined');
    });

    it('should build a basic SELECT query', () => {
      select.from('users');

      expect(select.build()).toBe('SELECT * FROM users;');
    });

    it('should build a SELECT query with columns specified', () => {
      select.from('users').col('id', 'name');

      expect(select.build()).toBe('SELECT id, name FROM users;');
    });

    it('should build a SELECT query with DISTINCT keyword', () => {
      select.from('users').distinct().col('id', 'name');

      expect(select.build()).toBe('SELECT DISTINCT id, name FROM users;');
    });

    it('should build a SELECT query with WHERE clause', () => {
      select.from('users').where((col) => col('status').equal('active'));

      expect(select.build()).toBe('SELECT * FROM users WHERE status = ?;');
      expect(select.values).toEqual(['active']);
    });

    it('should build a SELECT query with GROUP BY clause', () => {
      select.from('users').groupBy('status', 'created_at');

      expect(select.build()).toBe(
        'SELECT * FROM users GROUP BY status, created_at;'
      );
    });

    it('should build a SELECT query with HAVING clause', () => {
      select.from('users').having((col) => col('COUNT(*)').greaterThan(5));

      expect(select.build()).toBe('SELECT * FROM users HAVING COUNT(*) > ?;');
      expect(select.values).toEqual([5]);
    });

    it('should build a SELECT query with ORDER BY clause', () => {
      select.from('users').orderBy('id', ASC);
      expect(select.build()).toBe('SELECT * FROM users ORDER BY id ASC;');

      select.reset().from('users').orderBy('id', DESC);
      expect(select.build()).toBe('SELECT * FROM users ORDER BY id DESC;');
    });

    it('should build a SELECT query with LIMIT clause', () => {
      select.from('users').limit(10);

      expect(select.build()).toBe('SELECT * FROM users LIMIT 10;');
    });

    it('should build a SELECT query with OFFSET clause', () => {
      select.from('users').offset(5);

      expect(select.build()).toBe('SELECT * FROM users OFFSET 5;');
    });

    it('should build a SELECT query with both LIMIT and OFFSET clauses', () => {
      select.from('users').limit(10).offset(5);

      expect(select.build()).toBe('SELECT * FROM users LIMIT 10 OFFSET 5;');
    });

    it('should build a SELECT query with JOIN clause', () => {
      select
        .from('users')
        .join('orders', (col) => col('users.id').equal(ref('orders.user_id')));

      expect(select.build()).toBe(
        'SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id;'
      );

      expect(select.values).toEqual([]);
    });

    it('should build a SELECT query with multiple JOIN clauses', () => {
      select
        .from('users')
        .join('orders', (col) => col('users.id').equal(ref('orders.user_id')))
        .join('profiles', (col) =>
          col('users.id').equal(ref('profiles.user_id'))
        );

      expect(select.build()).toBe(
        'SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id INNER JOIN profiles ON users.id = profiles.user_id;'
      );

      expect(select.values).toEqual([]);
    });

    it('should build a SELECT query with UNION clause', () => {
      select
        .from('users')
        .union((select) =>
          select.from('admins').where((col) => col('status').equal('active'))
        );

      expect(select.build()).toBe(
        'SELECT * FROM users UNION SELECT * FROM admins WHERE status = ?;'
      );

      expect(select.values).toEqual(['active']);
    });

    it('should build a SELECT query with UNION ALL clause', () => {
      select
        .from('users')
        .unionAll((select) =>
          select.from('admins').where((col) => col('status').equal('active'))
        );

      expect(select.build()).toBe(
        'SELECT * FROM users UNION ALL SELECT * FROM admins WHERE status = ?;'
      );

      expect(select.values).toEqual(['active']);
    });

    it('should build a SELECT query with multiple UNION clauses', () => {
      select
        .from('users')
        .union((select) =>
          select.from('admins').where((col) => col('status').equal('active'))
        )
        .unionAll((select) =>
          select.from('guests').where((col) => col('status').equal('active'))
        );

      expect(select.build()).toBe(
        'SELECT * FROM users UNION SELECT * FROM admins WHERE status = ? UNION ALL SELECT * FROM guests WHERE status = ?;'
      );

      expect(select.values).toEqual(['active', 'active']);
    });

    it('should exclude semicolon for subqueries when subquery is true', () => {
      select.from('users').where((col) => col('status').equal('active'));
      expect(select.build(true)).toBe('SELECT * FROM users WHERE status = ?');
    });

    it('should include semicolon by default', () => {
      select.from('users').where((col) => col('status').equal('active'));
      expect(select.build('hi')).toBe('SELECT * FROM users WHERE status = ?;');
    });
  });

  describe('col', () => {
    it('should allow selecting columns', () => {
      select.col('first_name', 'last_name');
      expect(select.state.columns).toEqual(['first_name', 'last_name']);
    });

    it('should throw for invalid column names', () => {
      expect(() => select.col('')).toThrow('Invalid SELECT column: ');
      expect(() => select.col(123)).toThrow('Invalid SELECT column: 123');
      expect(() => select.col('age')).not.toThrow();
    });

    it('should default to selecting all columns if no columns are provided', () => {
      select.from('users');
      expect(select.build()).toBe('SELECT * FROM users;');
    });
  });

  describe('from', () => {
    it('should allow specifying a valid table name', () => {
      select.from('users');
      expect(select.state.table).toBe('users');
    });

    it('should throw for invalid table names', () => {
      expect(() => select.from('')).toThrow('Invalid SELECT table: ');

      expect(() => select.from('users')).not.toThrow();
    });
  });

  describe('join', () => {
    it('should add an INNER JOIN clause', () => {
      select
        .from('users')
        .join('orders', (col) => col('users.id').equal(ref('orders.user_id')));

      expect(select.build()).toBe(
        'SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id;'
      );

      expect(select.values).toEqual([]);
    });

    it('should throw for invalid table name', () => {
      expect(() =>
        select.join('', (col) => col('users.id').equal('orders.user_id'))
      ).toThrow('Invalid JOIN table: ');
    });

    it('should throw for invalid condition (not a function)', () => {
      expect(() => select.join('orders', 'invalid condition')).toThrow(
        'Invalid JOIN condition: invalid condition'
      );
    });
  });

  describe('leftJoin', () => {
    it('should add a LEFT JOIN clause with valid table and condition', () => {
      select
        .from('users')
        .leftJoin('orders', (col) =>
          col('users.id').equal(ref('orders.user_id'))
        );

      expect(select.build()).toBe(
        'SELECT * FROM users LEFT JOIN orders ON users.id = orders.user_id;'
      );

      expect(select.values).toEqual([]);
    });

    it('should throw for invalid table name', () => {
      expect(() =>
        select.leftJoin('', (col) => col('users.id').equal('orders.user_id'))
      ).toThrow('Invalid JOIN table: ');
    });

    it('should throw for invalid condition (not a function)', () => {
      expect(() => select.leftJoin('orders', 'invalid condition')).toThrow(
        'Invalid JOIN condition: invalid condition'
      );
    });
  });

  describe('rightJoin', () => {
    it('should add a RIGHT JOIN clause with valid table and condition', () => {
      select
        .from('users')
        .rightJoin('orders', (col) =>
          col('users.id').equal(ref('orders.user_id'))
        );

      expect(select.build()).toBe(
        'SELECT * FROM users RIGHT JOIN orders ON users.id = orders.user_id;'
      );

      expect(select.values).toEqual([]);
    });

    it('should throw for invalid table name', () => {
      expect(() =>
        select.rightJoin('', (col) => col('users.id').equal('orders.user_id'))
      ).toThrow('Invalid JOIN table: ');
    });

    it('should throw for invalid condition (not a function)', () => {
      expect(() => select.rightJoin('orders', 'invalid condition')).toThrow(
        'Invalid JOIN condition: invalid condition'
      );
    });
  });

  describe('groupBy', () => {
    it('should add a GROUP BY clause with valid columns', () => {
      select.from('users').groupBy('users.status');
      expect(select.build()).toBe('SELECT * FROM users GROUP BY users.status;');
    });

    it('should add a GROUP BY clause with multiple valid columns', () => {
      select.from('products').groupBy('category', 'price');
      expect(select.build()).toBe(
        'SELECT * FROM products GROUP BY category, price;'
      );
    });

    it('should throw if the column is invalid', () => {
      expect(() => select.groupBy(123)).toThrow('Invalid GROUP BY column: 123');
    });
  });

  describe('orderBy', () => {
    it('should add an ORDER BY clause with valid column and ascending order', () => {
      select.from('users').orderBy('users.age', ASC);
      expect(select.build()).toBe(
        'SELECT * FROM users ORDER BY users.age ASC;'
      );
    });

    it('should add an ORDER BY clause with valid column and descending order', () => {
      select.from('products').orderBy('price', DESC);
      expect(select.build()).toBe(
        'SELECT * FROM products ORDER BY price DESC;'
      );
    });

    it('should throw if the column is invalid', () => {
      expect(() => select.orderBy(123)).toThrow('Invalid ORDER BY column: 123');
    });

    it('should throw if the order type is invalid', () => {
      expect(() => select.orderBy('age', 'invalid')).toThrow(
        'Invalid ORDER BY type: invalid'
      );
    });
  });

  describe('distinct', () => {
    it('should add DISTINCT to the query for selected columns', () => {
      select.distinct().col('name').from('users');
      expect(select.build()).toBe('SELECT DISTINCT name FROM users;');
    });

    it('should add DISTINCT to the query with all columns', () => {
      select.distinct().from('products');
      expect(select.build()).toBe('SELECT DISTINCT * FROM products;');
    });

    it('should add DISTINCT correctly with other query clauses', () => {
      select.distinct().col('name').from('users').groupBy('status');
      expect(select.build()).toBe(
        'SELECT DISTINCT name FROM users GROUP BY status;'
      );
    });
  });

  describe('offset', () => {
    it('should correctly add an OFFSET clause with a valid number', () => {
      select.from('users').offset(10);
      expect(select.build()).toBe('SELECT * FROM users OFFSET 10;');
    });

    it('should allow an OFFSET value of 0', () => {
      select.from('users').offset(0);
      expect(select.build()).toBe('SELECT * FROM users OFFSET 0;');
    });

    it('should throw for negative OFFSET values', () => {
      expect(() => {
        select.from('users').offset(-5).build();
      }).toThrow('Invalid OFFSET value: -5');
    });

    it('should throw for non-integer OFFSET values', () => {
      expect(() => {
        select.from('users').offset('invalid').build();
      }).toThrow('Invalid OFFSET value: invalid');
    });
  });

  describe('limit', () => {
    it('should correctly add a LIMIT clause with a valid number', () => {
      select.from('users').limit(10);
      expect(select.build()).toBe('SELECT * FROM users LIMIT 10;');
    });

    it('should allow a LIMIT value of 0', () => {
      select.from('users').limit(0);
      expect(select.build()).toBe('SELECT * FROM users LIMIT 0;');
    });

    it('should throw for negative LIMIT values', () => {
      expect(() => {
        select.from('users').limit(-5).build();
      }).toThrow('Invalid LIMIT value: -5');
    });

    it('should throw for non-integer LIMIT values', () => {
      expect(() => {
        select.from('users').limit('invalid').build();
      }).toThrow('Invalid LIMIT value: invalid');
    });
  });

  describe('where', () => {
    it('should correctly add a WHERE clause with a valid condition', () => {
      select.from('users').where((col) => col('age').greaterThan(18));
      expect(select.build()).toBe('SELECT * FROM users WHERE age > ?;');
      expect(select.values).toEqual([18]);
    });

    it('should correctly chain multiple WHERE conditions with AND/OR', () => {
      select
        .from('users')
        .where((col) => col('status').equal('active'))
        .and()
        .where((col) => col('age').greaterThan(18));

      expect(select.build()).toBe(
        'SELECT * FROM users WHERE status = ? AND age > ?;'
      );

      expect(select.values).toEqual(['active', 18]);
    });

    it('should allow the use of parentheses to group conditions', () => {
      select
        .from('users')
        .paren()
        .where((col) => col('status').equal('inactive'))
        .or()
        .where((col) => col('status').equal('banned'))
        .paren()
        .and()
        .where((col) => col('city').equal('Tokyo'));

      expect(select.build()).toBe(
        'SELECT * FROM users WHERE (status = ? OR status = ?) AND city = ?;'
      );

      expect(select.values).toEqual(['inactive', 'banned', 'Tokyo']);
    });

    it('should throw if the condition is not a function', () => {
      expect(() => {
        select.from('users').where('invalid condition').build();
      }).toThrow('Invalid SELECT condition: invalid condition');
    });

    it('should throw if the condition function is not provided', () => {
      expect(() => {
        select.from('users').where().build();
      }).toThrow('Invalid SELECT condition: undefined');
    });
  });

  describe('and', () => {
    it('should correctly add an AND operator to the WHERE clause', () => {
      select
        .from('users')
        .where((col) => col('status').equal('banned'))
        .and()
        .where((col) => col('city').equal('Tokyo'));

      expect(select.build()).toBe(
        'SELECT * FROM users WHERE status = ? AND city = ?;'
      );
      expect(select.values).toEqual(['banned', 'Tokyo']);
    });

    it('should throw when AND is called at the beginning of the query', () => {
      expect(() => {
        select.from('users').and().build();
      }).toThrow('Invalid SELECT condition');
    });
  });

  describe('or', () => {
    it('should correctly add an OR operator to the WHERE clause', () => {
      select
        .from('users')
        .where((col) => col('status').equal('inactive'))
        .or()
        .where((col) => col('status').equal('banned'));

      expect(select.build()).toBe(
        'SELECT * FROM users WHERE status = ? OR status = ?;'
      );

      expect(select.values).toEqual(['inactive', 'banned']);
    });

    it('should throw when OR is called at the beginning of the query', () => {
      expect(() => {
        select.from('users').or().build();
      }).toThrow('Invalid SELECT condition');
    });
  });

  describe('paren', () => {
    it('should correctly add parentheses around conditions', () => {
      select
        .from('users')
        .where((col) => col('city').equal('Tokyo'))
        .and()
        .paren()
        .where((col) => col('status').equal('inactive'))
        .or()
        .where((col) => col('status').equal('banned'))
        .paren();

      expect(select.build()).toBe(
        'SELECT * FROM users WHERE city = ? AND (status = ? OR status = ?);'
      );

      expect(select.values).toEqual(['Tokyo', 'inactive', 'banned']);
    });

    it('should create a new WHERE condition if none exists before paren()', () => {
      select
        .from('users')
        .paren()
        .where((col) => col('status').equal('inactive'))
        .paren();

      expect(select.build()).toBe('SELECT * FROM users WHERE (status = ?);');
      expect(select.values).toEqual(['inactive']);
    });
  });

  describe('open & close', () => {
    it('should open parentheses for grouping conditions', () => {
      select
        .from('users')
        .open()
        .open()
        .where((col) => col('status').equal('inactive'))
        .or()
        .where((col) => col('status').equal('banned'))
        .close()
        .and()
        .where((col) => col('city').equal('Tokyo'))
        .close()
        .build();

      expect(select.build()).toBe(
        'SELECT * FROM users WHERE ((status = ? OR status = ?) AND city = ?);'
      );
      expect(select.values).toEqual(['inactive', 'banned', 'Tokyo']);
    });

    it('should throw an error if there is no open parenthesis to close', () => {
      expect(() => {
        select.close();
      }).toThrow('Invalid SELECT condition');
    });
  });

  describe('having', () => {
    it('should correctly add a HAVING clause with a valid condition', () => {
      select
        .from('sales')
        .groupBy('product_id')
        .having((col) => col('SUM(price)').greaterThan(1000));

      expect(select.build()).toBe(
        'SELECT * FROM sales GROUP BY product_id HAVING SUM(price) > ?;'
      );
      expect(select.values).toEqual([1000]);
    });

    it('should throw an error if the condition is not a function', () => {
      expect(() => {
        select.from('sales').having('invalid condition');
      }).toThrow('Invalid HAVING condition: invalid condition');
    });

    it('should throw an error if the condition function is not provided', () => {
      expect(() => {
        select.from('sales').having().build();
      }).toThrow('Invalid HAVING condition: undefined');
    });
  });

  describe('union', () => {
    it('should correctly add a UNION with a subquery', () => {
      select
        .from('users')
        .where((col) => col('membership').equal('gold'))
        .union((select) => {
          select.from('users').where((col) => col('membership').equal('vip'));
        });

      expect(select.build()).toBe(
        'SELECT * FROM users WHERE membership = ? ' +
          'UNION ' +
          'SELECT * FROM users WHERE membership = ?;'
      );

      expect(select.values).toEqual(['gold', 'vip']);
    });

    it('should throw an error if the subquery is not a function', () => {
      expect(() => {
        select.union('invalid subquery');
      }).toThrow('Invalid UNION subquery: invalid subquery');
    });

    it('should correctly chain multiple UNIONs', () => {
      select
        .from('users')
        .where((col) => col('membership').equal('gold'))
        .union((select) =>
          select.from('users').where((col) => col('membership').equal('vip'))
        )
        .union((select) =>
          select
            .from('users')
            .where((col) => col('membership').equal('platinum'))
        );

      expect(select.build()).toBe(
        'SELECT * FROM users WHERE membership = ? ' +
          'UNION ' +
          'SELECT * FROM users WHERE membership = ? ' +
          'UNION ' +
          'SELECT * FROM users WHERE membership = ?;'
      );
      expect(select.values).toEqual(['gold', 'vip', 'platinum']);
    });
  });

  describe('unionAll', () => {
    it('should correctly add a UNION ALL with a subquery', () => {
      select
        .from('users')
        .where((col) => col('membership').equal('gold'))
        .unionAll((subSelect) => {
          subSelect
            .from('users')
            .where((col) => col('membership').equal('vip'));
        });

      expect(select.build()).toBe(
        'SELECT * FROM users WHERE membership = ? ' +
          'UNION ALL ' +
          'SELECT * FROM users WHERE membership = ?;'
      );
      expect(select.values).toEqual(['gold', 'vip']);
    });

    it('should throw an error if the subquery is not a function', () => {
      expect(() => {
        select.unionAll('invalid subquery');
      }).toThrow('Invalid UNION ALL subquery: invalid subquery');
    });

    it('should correctly chain multiple UNION ALLs', () => {
      select
        .from('users')
        .where((col) => col('membership').equal('gold'))
        .unionAll((subSelect) => {
          subSelect
            .from('users')
            .where((col) => col('membership').equal('vip'));
        })
        .unionAll((subSelect) => {
          subSelect
            .from('users')
            .where((col) => col('membership').equal('platinum'));
        });

      expect(select.build()).toBe(
        'SELECT * FROM users WHERE membership = ? ' +
          'UNION ALL ' +
          'SELECT * FROM users WHERE membership = ? ' +
          'UNION ALL ' +
          'SELECT * FROM users WHERE membership = ?;'
      );
      expect(select.values).toEqual(['gold', 'vip', 'platinum']);
    });
  });

  describe('count', () => {
    let select;
    let connection;

    beforeEach(() => {
      connection = mock.connection();
      select = new Select(connection);
    });

    it('should resolve with count', async () => {
      // Mock the database response for the query
      const mockResponse = [{ count: 5 }];
      jest.spyOn(connection, 'query').mockResolvedValue(mockResponse);

      // Perform the query and get the count
      const count = await select
        .col('name', 'age') // Ensure the columns are specified
        .from('users')
        .where((col) => col('status').equal('active'))
        .count();

      // Verify the count returned is correct
      expect(count).toBe(5);
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) AS count FROM users WHERE status = ?;',
        ['active']
      );

      // Verify the state is preserved (columns remain intact)
      expect(select.state.columns).toEqual(['name', 'age']);
    });

    it('should reject if there is an issue', async () => {
      // Mock the database response for the query with an error
      const mockError = new Error('Ops');
      jest.spyOn(connection, 'query').mockRejectedValue(mockError);

      // Perform the query and get the count
      select
        .col('name', 'age')
        .from('users')
        .where((col) => col('status').equal('active'));

      await expect(select.count()).rejects.toThrow('Ops');

      // Verify the query was made as expected
      expect(connection.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) AS count FROM users WHERE status = ?;',
        ['active']
      );

      // Verify the state is preserved
      expect(select.state.columns).toEqual(['name', 'age']);
    });

    it('should reject if no table is specified', async () => {
      // Try to call count without specifying a table
      await expect(select.count()).rejects.toThrow(
        'Invalid SELECT table: undefined'
      );
    });
  });

  describe('random', () => {
    let select;
    let connection;

    beforeEach(() => {
      connection = mock.connection();
      select = new Select(connection);
    });

    const testCases = [
      {
        driver: 'MySQL',
        randomFn: 'RAND()',
        expectedQuery: 'SELECT id FROM avatars ORDER BY RAND() LIMIT 1;',
      },
      {
        driver: 'SQLite',
        randomFn: 'RANDOM()',
        expectedQuery: 'SELECT id FROM avatars ORDER BY RANDOM() LIMIT 1;',
      },
      {
        driver: 'PostgreSQL',
        randomFn: 'RANDOM()',
        expectedQuery: 'SELECT id FROM avatars ORDER BY RANDOM() LIMIT 1;',
      },
    ];

    testCases.forEach(({ driver, randomFn, expectedQuery }) => {
      it(`should build correct random query for ${driver}`, async () => {
        // Mock the connection's driver
        connection.driver = { id: Symbol(driver) };

        // Mock query result
        const mockResponse = [{ id: 99 }];
        jest.spyOn(connection, 'query').mockResolvedValue(mockResponse);

        // Build and execute query
        const result = await select
          .col('id')
          .from('avatars')
          .random()
          .limit(1)
          .first();

        // Validate the result
        expect(result).toEqual({ id: 99 });

        // Validate the built SQL and parameters
        expect(connection.query).toHaveBeenCalledWith(expectedQuery, []);
        expect(select.state.columns).toEqual(['id']);
      });
    });
  });

  describe('paginate', () => {
    let select;
    let connection;

    beforeEach(() => {
      connection = mock.connection();
      select = new Select(connection);
    });

    it('should return correct pagination data for valid input', async () => {
      // Mock the database response
      const mockCountResponse = 100; // 100 items total
      const mockResultResponse = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]; // 2 items per page, first page

      jest.spyOn(select, 'count').mockResolvedValue(mockCountResponse);
      jest.spyOn(select, 'exec').mockResolvedValue(mockResultResponse);

      // Call paginate for the first page
      const pagination = await select
        .from('users')
        .where((col) => col('status').equal('active'))
        .paginate(1, 2); // 2 items per page, first page

      // Verify pagination response
      expect(pagination.result).toEqual(mockResultResponse);
      expect(pagination.page).toEqual({
        current: 1,
        prev: undefined,
        next: 2,
        items: 2,
      });
      expect(pagination.total).toEqual({
        pages: 50, // 100 items / 2 per page
        items: 100,
      });
    });

    it('should correctly handle invalid page or items input', async () => {
      // Mock the database response
      const mockCountResponse = 50; // 50 items total
      const mockResultResponse = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];

      jest.spyOn(select, 'count').mockResolvedValue(mockCountResponse);
      jest.spyOn(select, 'exec').mockResolvedValue(mockResultResponse);

      // Call paginate with invalid page number (negative value)
      const invalidPage = await select
        .from('users')
        .where((col) => col('status').equal('active'))
        .paginate(-1, 5); // Invalid page, should default to 1

      expect(invalidPage.page.current).toBe(1);

      // Call paginate with invalid items per page (non-integer)
      const invalidItems = await select
        .from('users')
        .where((col) => col('status').equal('active'))
        .paginate(1, 'abc'); // Invalid items per page, should default to 10

      expect(invalidItems.page.items).toBe(10);

      // Call paginate with invalid items per page (non-integer)
      const missingItems = await select
        .from('users')
        .where((col) => col('status').equal('active'))
        .paginate(1, undefined); // Invalid items per page, should default to 10

      expect(missingItems.page.items).toBe(10);
    });

    it('should handle pagination on the first page correctly', async () => {
      // Mock the database response for the first page
      const mockCountResponse = 50; // 50 items total
      const mockResultResponse = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];

      jest.spyOn(select, 'count').mockResolvedValue(mockCountResponse);
      jest.spyOn(select, 'exec').mockResolvedValue(mockResultResponse);

      // Call paginate for the first page
      const pagination = await select
        .from('users')
        .where((col) => col('status').equal('active'))
        .paginate(1, 2); // 2 items per page, first page

      expect(pagination.page.prev).toBeUndefined();
      expect(pagination.page.next).toBe(2); // Next page should be 2
    });

    it('should handle pagination on the last page correctly', async () => {
      // Mock the database response for the last page
      const mockCountResponse = 50; // 50 items total
      const mockResultResponse = [
        { id: 49, name: 'User 49' },
        { id: 50, name: 'User 50' },
      ];

      jest.spyOn(select, 'count').mockResolvedValue(mockCountResponse);
      jest.spyOn(select, 'exec').mockResolvedValue(mockResultResponse);

      // Call paginate for the last page (page 25)
      const pagination = await select
        .from('users')
        .where((col) => col('status').equal('active'))
        .paginate(25, 2); // 2 items per page, last page

      expect(pagination.page.next).toBeUndefined();
      expect(pagination.page.prev).toBe(24); // Previous page should be 24
    });

    it('should handle pagination with no results', async () => {
      // Mock the database response with 0 items
      const mockCountResponse = 0; // No items total
      const mockResultResponse = []; // No items on the page

      jest.spyOn(select, 'count').mockResolvedValue(mockCountResponse);
      jest.spyOn(select, 'exec').mockResolvedValue(mockResultResponse);

      // Call paginate for the first page
      const pagination = await select
        .from('users')
        .where((col) => col('status').equal('active'))
        .paginate(1, 10); // 10 items per page, no items in total

      expect(pagination.page.next).toBeUndefined();
      expect(pagination.page.prev).toBeUndefined();
      expect(pagination.result).toEqual([]);
      expect(pagination.total).toEqual({ pages: 0, items: 0 });
    });

    it('should correctly calculate total pages with a remainder', async () => {
      // Mock the database response
      const mockCountResponse = 55; // 55 items total
      const mockResultResponse = [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ];

      jest.spyOn(select, 'count').mockResolvedValue(mockCountResponse);
      jest.spyOn(select, 'exec').mockResolvedValue(mockResultResponse);

      // Call paginate for the first page with 10 items per page
      const pagination = await select
        .from('users')
        .where((col) => col('status').equal('active'))
        .paginate(1, 10);

      expect(pagination.total.pages).toBe(6); // Total pages should be 6 (55 items / 10 per page)
    });
  });
});
