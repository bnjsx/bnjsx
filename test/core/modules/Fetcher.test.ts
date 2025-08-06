import { Condition, ref } from '../../../src/core/sql/Condition';
import {
  Clause,
  HavingClause,
  JoinClause,
  Fetcher,
  WhereClause,
} from '../../../src/core/modules/Fetcher';

import { QueryError } from '../../../src/errors';
import { Builder } from '../../../src/core/modules/Builder';
import { PoolConnection } from '../../../src/core/modules/Pool';

// Mock driver (adjust as necessary for your Condition constructor)
const mockDriver = { id: Symbol('MySQL') } as any;

const mock = {
  connection: () => {
    return {
      id: Symbol('PoolConnection'),
      driver: { id: Symbol('MySQL') },
      query: jest.fn().mockResolvedValue([{ name: 'a' }, { name: 'b' }]),
      release: jest.fn(() => Promise.resolve()),
    } as any;
  },
};

describe('Clause', () => {
  let clause: Clause;
  let condition: Condition;

  beforeEach(() => {
    const driver = {} as any;

    condition = {
      equal: jest.fn(() => condition),
      lessThan: jest.fn(() => condition),
      lessThanOrEqual: jest.fn(() => condition),
      greaterThan: jest.fn(() => condition),
      greaterThanOrEqual: jest.fn(() => condition),
      like: jest.fn(() => condition),
      in: jest.fn(() => condition),
      between: jest.fn(() => condition),
      not: jest.fn(() => condition),
    } as unknown as Condition;

    clause = new Clause(driver);
  });

  it('should apply "=" operator', () => {
    const result = clause['add'](condition, '=', 'value');
    expect(condition.equal).toHaveBeenCalledWith('value');
    expect(result).toBe(condition);
  });

  it('should apply "<" operator', () => {
    const result = clause['add'](condition, '<', 10);
    expect(condition.lessThan).toHaveBeenCalledWith(10);
    expect(result).toBe(condition);
  });

  it('should apply "<=" operator', () => {
    const result = clause['add'](condition, '<=', 5);
    expect(condition.lessThanOrEqual).toHaveBeenCalledWith(5);
    expect(result).toBe(condition);
  });

  it('should apply ">" operator', () => {
    const result = clause['add'](condition, '>', 100);
    expect(condition.greaterThan).toHaveBeenCalledWith(100);
    expect(result).toBe(condition);
  });

  it('should apply ">=" operator', () => {
    const result = clause['add'](condition, '>=', 25);
    expect(condition.greaterThanOrEqual).toHaveBeenCalledWith(25);
    expect(result).toBe(condition);
  });

  it('should apply "!=" operator', () => {
    const result = clause['add'](condition, '!=', 'x');
    expect(condition.not).toHaveBeenCalled();
    expect(condition.equal).toHaveBeenCalledWith('x');
    expect(result).toBe(condition);
  });

  it('should apply "<>" operator', () => {
    const result = clause['add'](condition, '<>', 'y');
    expect(condition.not).toHaveBeenCalled();
    expect(condition.equal).toHaveBeenCalledWith('y');
    expect(result).toBe(condition);
  });

  it('should apply "like" operator', () => {
    const result = clause['add'](condition, 'like', '%pattern%');
    expect(condition.like).toHaveBeenCalledWith('%pattern%');
    expect(result).toBe(condition);
  });

  it('should apply "in" operator with array', () => {
    const result = clause['add'](condition, 'in', [1, 2, 3]);
    expect(condition.in).toHaveBeenCalledWith(1, 2, 3);
    expect(result).toBe(condition);
  });

  it('should apply "in" operator with non-array', () => {
    const result = clause['add'](condition, 'in', 'x');
    expect(condition.in).toHaveBeenCalledWith('x');
    expect(result).toBe(condition);
  });

  it('should apply "between" operator with valid values', () => {
    const result = clause['add'](condition, 'between', [10, 20]);
    expect(condition.between).toHaveBeenCalledWith(10, 20);
    expect(result).toBe(condition);
  });

  it('should throw for "between" with invalid value (not array)', () => {
    expect(() => clause['add'](condition, 'between', 'oops')).toThrow(
      "'between' requires an array with two values."
    );
  });

  it('should throw for "between" with wrong array length', () => {
    expect(() => clause['add'](condition, 'between', [1])).toThrow(
      "'between' requires an array with two values."
    );
  });

  it('should apply "not like" operator', () => {
    const result = clause['add'](condition, 'not like', '%pattern%');
    expect(condition.not).toHaveBeenCalled();
    expect(condition.like).toHaveBeenCalledWith('%pattern%');
    expect(result).toBe(condition);
  });

  it('should apply "not in" operator with array', () => {
    const result = clause['add'](condition, 'not in', [4, 5, 6]);
    expect(condition.not).toHaveBeenCalled();
    expect(condition.in).toHaveBeenCalledWith(4, 5, 6);
    expect(result).toBe(condition);
  });

  it('should apply "not in" operator with non-array', () => {
    const result = clause['add'](condition, 'not in', 'z');
    expect(condition.not).toHaveBeenCalled();
    expect(condition.in).toHaveBeenCalledWith('z');
    expect(result).toBe(condition);
  });

  it('should apply "not between" operator with valid values', () => {
    const result = clause['add'](condition, 'not between', [30, 40]);
    expect(condition.not).toHaveBeenCalled();
    expect(condition.between).toHaveBeenCalledWith(30, 40);
    expect(result).toBe(condition);
  });

  it('should throw for "not between" with invalid value (not array)', () => {
    expect(() => clause['add'](condition, 'not between', 'oops')).toThrow(
      `'not between' requires an array with two values.`
    );
  });

  it('should throw for "not between" with wrong array length', () => {
    expect(() => clause['add'](condition, 'not between', [1])).toThrow(
      `'not between' requires an array with two values.`
    );
  });

  it('should return same condition for unknown operator', () => {
    expect(() => clause['add'](condition, '??' as any, 'val')).toThrow(
      QueryError
    );
  });
});

describe('WhereClause', () => {
  let clause: any;

  beforeEach(() => {
    clause = new WhereClause(mockDriver);
  });

  test('where(cb) builds correct condition', () => {
    clause.where((col) => col('name').equal('simon'));
    expect(clause.state.where.build()).toBe('name = ?');
    expect(clause.state.where.values).toEqual(['simon']);
  });

  test('where(col, val) builds equality', () => {
    clause.where('age', 30);
    expect(clause.state.where.build()).toBe('age = ?');
    expect(clause.state.where.values).toEqual([30]);
  });

  test('where(col, op, val) builds condition with operator', () => {
    clause.where('age', '>=', 18);
    expect(clause.state.where.build()).toBe('age >= ?');
    expect(clause.state.where.values).toEqual([18]);
  });

  test('andWhere() chains with AND', () => {
    clause.where('id', 1).andWhere('name', 'John');
    expect(clause.state.where.build()).toBe('id = ? AND name = ?');
    expect(clause.state.where.values).toEqual([1, 'John']);
  });

  test('orWhere() chains with OR', () => {
    clause.where('id', 1).orWhere('name', 'John');
    expect(clause.state.where.build()).toBe('id = ? OR name = ?');
    expect(clause.state.where.values).toEqual([1, 'John']);
  });

  test('andWhere(cb) chains with AND', () => {
    clause.where('id', 1).andWhere((col) => col('age').greaterThan(22));
    expect(clause.state.where.build()).toBe('id = ? AND age > ?');
    expect(clause.state.where.values).toEqual([1, 22]);
  });

  test('orWhere(cb) chains with OR', () => {
    clause.where('id', 1).orWhere((col) => col('age').lessThan(18));
    expect(clause.state.where.build()).toBe('id = ? OR age < ?');
    expect(clause.state.where.values).toEqual([1, 18]);
  });

  test('andWhere falls back to where if no prior condition', () => {
    clause.andWhere('age', '>=', 18);
    expect(clause.state.where.build()).toBe('age >= ?');
    expect(clause.state.where.values).toEqual([18]);
  });

  test('orWhere falls back to where if no prior condition', () => {
    clause.orWhere('age', '<', 30);
    expect(clause.state.where.build()).toBe('age < ?');
    expect(clause.state.where.values).toEqual([30]);
  });

  test('throws error if invalid where syntax', () => {
    expect(() => (clause as any).where()).toThrow(QueryError);
    expect(() => (clause as any).where('only', 'one', 'too', 'many')).toThrow(
      QueryError
    );
  });

  test('throws if where(cb) is passed a non-function', () => {
    expect(() => clause.where(123 as any)).toThrow(
      "Expected a function in 'where()'."
    );
  });

  // .when()

  test('when(true, callback) applies condition', () => {
    clause.when(true, (col) => col('name').equal('simon'));
    expect(clause.state.where.build()).toBe('name = ?');
    expect(clause.state.where.values).toEqual(['simon']);
  });

  test('when(false, callback) does nothing', () => {
    clause.when(false, (col) => col('name').equal('simon'));
    expect(clause.state.where).toBeNull();
  });

  test('when(true, column, value) applies condition', () => {
    clause.when(true, 'age', 30);
    expect(clause.state.where.build()).toBe('age = ?');
    expect(clause.state.where.values).toEqual([30]);
  });

  test('when(false, column, value) does nothing', () => {
    clause.when(false, 'age', 30);
    expect(clause.state.where).toBeNull();
  });

  test('when(true, column, operator, value) applies condition', () => {
    clause.when(true, 'age', '>=', 18);
    expect(clause.state.where.build()).toBe('age >= ?');
    expect(clause.state.where.values).toEqual([18]);
  });

  test('when(false, column, operator, value) does nothing', () => {
    clause.when(false, 'age', '>=', 18);
    expect(clause.state.where).toBeNull();
  });

  // .andWhen()

  test('andWhen(true, column, value) chains AND condition', () => {
    clause.where('id', 1);
    clause.andWhen(true, 'name', 'John');
    expect(clause.state.where.build()).toBe('id = ? AND name = ?');
    expect(clause.state.where.values).toEqual([1, 'John']);
  });

  test('andWhen(false, column, value) does nothing', () => {
    clause.where('id', 1);
    clause.andWhen(false, 'name', 'John');
    expect(clause.state.where.build()).toBe('id = ?');
    expect(clause.state.where.values).toEqual([1]);
  });

  test('andWhen(true, callback) chains AND condition', () => {
    clause.where('id', 1);
    clause.andWhen(true, (col) => col('age').greaterThan(22));
    expect(clause.state.where.build()).toBe('id = ? AND age > ?');
    expect(clause.state.where.values).toEqual([1, 22]);
  });

  test('andWhen(false, callback) does nothing', () => {
    clause.where('id', 1);
    clause.andWhen(false, (col) => col('age').greaterThan(22));
    expect(clause.state.where.build()).toBe('id = ?');
    expect(clause.state.where.values).toEqual([1]);
  });

  // .orWhen()

  test('orWhen(true, column, value) chains OR condition', () => {
    clause.where('id', 1);
    clause.orWhen(true, 'name', 'John');
    expect(clause.state.where.build()).toBe('id = ? OR name = ?');
    expect(clause.state.where.values).toEqual([1, 'John']);
  });

  test('orWhen(false, column, value) does nothing', () => {
    clause.where('id', 1);
    clause.orWhen(false, 'name', 'John');
    expect(clause.state.where.build()).toBe('id = ?');
    expect(clause.state.where.values).toEqual([1]);
  });

  test('orWhen(true, callback) chains OR condition', () => {
    clause.where('id', 1);
    clause.orWhen(true, (col) => col('age').lessThan(18));
    expect(clause.state.where.build()).toBe('id = ? OR age < ?');
    expect(clause.state.where.values).toEqual([1, 18]);
  });

  test('orWhen(false, callback) does nothing', () => {
    clause.where('id', 1);
    clause.orWhen(false, (col) => col('age').lessThan(18));
    expect(clause.state.where.build()).toBe('id = ?');
    expect(clause.state.where.values).toEqual([1]);
  });

  // .if()

  test('if(true, callback) runs callback', () => {
    clause.if(true, (qb) => {
      qb.where('age', '>=', 18);
    });
    expect(clause.state.where.build()).toBe('age >= ?');
    expect(clause.state.where.values).toEqual([18]);
  });

  test('if(false, callback) skips callback', () => {
    clause.if(false, (qb) => {
      qb.where('age', '>=', 18);
    });
    expect(clause.state.where).toBeNull();
  });

  test('if(true, non-function) does nothing and does not throw', () => {
    expect(() => clause.if(true, null as any)).not.toThrow();
    expect(clause.state.where).toBeNull();
  });
});

describe('HavingClause', () => {
  let clause: any;

  beforeEach(() => {
    clause = new HavingClause(mockDriver);
  });

  test('having(cb) builds correct condition', () => {
    clause.having((col) => col('score').greaterThan(80));
    expect(clause.state.having.build()).toBe('score > ?');
    expect(clause.state.having.values).toEqual([80]);
  });

  test('having(col, val) builds equality', () => {
    clause.having('points', 100);
    expect(clause.state.having.build()).toBe('points = ?');
    expect(clause.state.having.values).toEqual([100]);
  });

  test('having(col, op, val) builds condition with operator', () => {
    clause.having('points', '<', 50);
    expect(clause.state.having.build()).toBe('points < ?');
    expect(clause.state.having.values).toEqual([50]);
  });

  test('andHaving() chains with AND', () => {
    clause.having('id', 1).andHaving('points', '>=', 10);
    expect(clause.state.having.build()).toBe('id = ? AND points >= ?');
    expect(clause.state.having.values).toEqual([1, 10]);
  });

  test('orHaving() chains with OR', () => {
    clause.having('id', 1).orHaving('points', '<', 5);
    expect(clause.state.having.build()).toBe('id = ? OR points < ?');
    expect(clause.state.having.values).toEqual([1, 5]);
  });

  test('andHaving falls back to having if no prior condition', () => {
    clause.andHaving('age', '>=', 18);
    expect(clause.state.having.build()).toBe('age >= ?');
    expect(clause.state.having.values).toEqual([18]);
  });

  test('orHaving falls back to having if no prior condition', () => {
    clause.orHaving('age', '<', 30);
    expect(clause.state.having.build()).toBe('age < ?');
    expect(clause.state.having.values).toEqual([30]);
  });

  test('throws error if invalid having syntax (wrong number of args)', () => {
    expect(() => (clause as any).having()).toThrow(QueryError);
    expect(() =>
      (clause as any).having('only', 'one', 'two', 'tooMany')
    ).toThrow(QueryError);
  });

  test('having(cb) throws error if argument is not a function', () => {
    expect(() => clause.having(123 as any)).toThrow(QueryError);
    expect(() => clause.having('not a function' as any)).toThrow(QueryError);
    expect(() => clause.having(null as any)).toThrow(QueryError);
    expect(() => clause.having(undefined as any)).toThrow(QueryError);
  });
});

describe('JoinClause', () => {
  let clause: any;

  beforeEach(() => {
    clause = new JoinClause(mockDriver);
  });

  test('join with callback builds condition correctly', () => {
    clause.join('left', 'users', (col, con) => {
      col('users.id').equal(ref('posts.user_id'));
      con.and().col('posts.published').equal(true);
    });

    expect(clause.state.joins.length).toBe(1);
    expect(clause.state.joins[0].type).toBe('left');
    expect(clause.state.joins[0].table).toBe('users');

    const conditionSql = clause.state.joins[0].condition.build();
    const values = clause.state.joins[0].condition.values;

    expect(conditionSql).toBe(
      'users.id = posts.user_id AND posts.published = ?'
    );
    expect(values).toEqual([true]);
  });

  test('join with two columns defaults to equal operator', () => {
    clause.join('inner', 'profiles', 'users.id', 'profiles.user_id');

    expect(clause.state.joins.length).toBe(1);
    expect(clause.state.joins[0].type).toBe('inner');
    expect(clause.state.joins[0].table).toBe('profiles');

    expect(clause.state.joins[0].condition.build()).toBe(
      'users.id = profiles.user_id'
    );
    expect(clause.state.joins[0].condition.values).toEqual([]);
  });

  test('join with operator', () => {
    clause.join('right', 'orders', 'orders.total', '>', 'orders.price');

    expect(clause.state.joins.length).toBe(1);
    expect(clause.state.joins[0].type).toBe('right');
    expect(clause.state.joins[0].table).toBe('orders');

    expect(clause.state.joins[0].condition.build()).toBe(
      'orders.total > orders.price'
    );
    expect(clause.state.joins[0].condition.values).toEqual([]);
  });

  test('innerJoin() uses join with inner type', () => {
    clause.innerJoin('comments', 'posts.id', 'comments.post_id');
    expect(clause.state.joins.length).toBe(1);
    expect(clause.state.joins[0].type).toBe('inner');
    expect(clause.state.joins[0].table).toBe('comments');
  });

  test('leftJoin() uses join with left type', () => {
    clause.leftJoin('tags', 'posts.id', 'tags.post_id');
    expect(clause.state.joins.length).toBe(1);
    expect(clause.state.joins[0].type).toBe('left');
    expect(clause.state.joins[0].table).toBe('tags');
  });

  test('rightJoin() uses join with right type', () => {
    clause.rightJoin('categories', 'posts.category_id', 'categories.id');
    expect(clause.state.joins.length).toBe(1);
    expect(clause.state.joins[0].type).toBe('right');
    expect(clause.state.joins[0].table).toBe('categories');
  });

  test('throws error on invalid join type', () => {
    expect(() => clause.join('invalid', 'table', 'col1', 'col2')).toThrow(
      "Invalid join type: invalid. Use 'left', 'right', or 'inner'."
    );
  });

  test('throws error on invalid table name', () => {
    expect(() => clause.join('left', '', 'col1', 'col2')).toThrow(
      'Invalid table name for join: '
    );
  });

  test('throws error on invalid join syntax', () => {
    expect(() => clause.join('left', 'table', 'col1')).toThrow(
      'Invalid join syntax'
    );
    expect(() =>
      // too many args
      clause.join('left', 'table', 'c1', '=', '=', 'c2')
    ).toThrow('Invalid join syntax');
  });
});

describe('Fetcher', () => {
  let tq: Fetcher;
  let con: PoolConnection;
  let builder: Builder;

  beforeEach(() => {
    con = mock.connection(); // Ensure this returns a mocked connection with query() mocked
    builder = new Builder(con);
    tq = new Fetcher('users', 'default', con.driver, builder);
  });

  test('innerJoin with simple equal condition', async () => {
    tq.innerJoin('orders', 'users.id', 'orders.user_id');
    await tq.first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id;',
      []
    );
  });

  test('innerJoin with operator condition', async () => {
    tq.innerJoin('orders', 'users.created_at', '>=', 'orders.created_at');
    await tq.first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users INNER JOIN orders ON users.created_at >= orders.created_at;',
      []
    );
  });

  test('innerJoin with callback condition', async () => {
    tq.innerJoin('orders', (col) =>
      col('users.id').equal(ref('orders.user_id'))
    );
    await tq.first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id;',
      []
    );
  });

  test('leftJoin with simple equal condition', async () => {
    tq.leftJoin('profiles', 'users.id', 'profiles.user_id');
    await tq.first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users LEFT JOIN profiles ON users.id = profiles.user_id;',
      []
    );
  });

  test('leftJoin with operator condition', async () => {
    tq.leftJoin('profiles', 'users.updated_at', '<', 'profiles.updated_at');
    await tq.first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users LEFT JOIN profiles ON users.updated_at < profiles.updated_at;',
      []
    );
  });

  test('leftJoin with callback condition', async () => {
    tq.leftJoin('profiles', (col) =>
      col('users.id').equal(ref('profiles.user_id'))
    );
    await tq.first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users LEFT JOIN profiles ON users.id = profiles.user_id;',
      []
    );
  });

  test('rightJoin with simple equal condition', async () => {
    tq.rightJoin('payments', 'users.id', 'payments.user_id');
    await tq.first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users RIGHT JOIN payments ON users.id = payments.user_id;',
      []
    );
  });

  test('rightJoin with operator condition', async () => {
    tq.rightJoin('payments', 'users.balance', '>=', 'payments.amount');
    await tq.first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users RIGHT JOIN payments ON users.balance >= payments.amount;',
      []
    );
  });

  test('rightJoin with callback condition', async () => {
    tq.rightJoin('payments', (col) =>
      col('users.id').equal(ref('payments.user_id'))
    );
    await tq.first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users RIGHT JOIN payments ON users.id = payments.user_id;',
      []
    );
  });

  test('multiple joins combined', async () => {
    tq.innerJoin('orders', 'users.id', 'orders.user_id')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .rightJoin('payments', 'users.id', 'payments.user_id');
    await tq.first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users INNER JOIN orders ON users.id = orders.user_id LEFT JOIN profiles ON users.id = profiles.user_id RIGHT JOIN payments ON users.id = payments.user_id;',
      []
    );
  });

  test('Should build basic SELECT * query', async () => {
    await tq.first();
    expect(con.query).toHaveBeenCalledWith('SELECT * FROM users;', []);
  });

  test('Should build query with selected columns', async () => {
    await tq.columns('id', 'name').first();
    expect(con.query).toHaveBeenCalledWith('SELECT id, name FROM users;', []);
    await tq.columns().first();
    expect(con.query).toHaveBeenCalledWith('SELECT * FROM users;', []);

    await tq.only('id', 'name').first();
    expect(con.query).toHaveBeenCalledWith('SELECT id, name FROM users;', []);
    await tq.only().first();
    expect(con.query).toHaveBeenCalledWith('SELECT * FROM users;', []);
  });

  test('Should build query with distinct', async () => {
    await tq.distinct().columns('email').first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT DISTINCT email FROM users;',
      []
    );
  });

  test('Should build query with where clause', async () => {
    await tq.where('age', '>', 18).first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE age > ?;',
      [18]
    );
  });

  test('Should build query with multiple where clauses', async () => {
    await tq.where('age', '>', 18).andWhere('name', 'john').first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users WHERE age > ? AND name = ?;',
      [18, 'john']
    );
  });

  test('Should build query with groupBy and having', async () => {
    await tq
      .columns('role', 'COUNT(*) as total')
      .groupBy('role')
      .having('total', '>', 5)
      .first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT role, COUNT(*) as total FROM users GROUP BY role HAVING total > ?;',
      [5]
    );
  });

  test('Should build query with multiple having clauses', async () => {
    await tq
      .groupBy('role')
      .having('total', '>', 5)
      .orHaving('total', '<', 1)
      .first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT * FROM users GROUP BY role HAVING total > ? OR total < ?;',
      [5, 1]
    );
  });

  test('Should build query with limit and orderBy', async () => {
    await tq.columns('id').orderBy('created_at').limit(10).first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT id FROM users ORDER BY created_at ASC LIMIT 10;',
      []
    );
  });

  test('Should build query with random', async () => {
    await tq.random().columns('id').limit(1).first();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT id FROM users ORDER BY RAND() LIMIT 1;',
      []
    );
  });

  test('Should build count query', async () => {
    await tq.where('role', 'admin').count();
    expect(con.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS count FROM (SELECT * FROM users WHERE role = ?) AS sub',
      ['admin']
    );
  });

  test('Should build count distinct query', async () => {
    await tq.count({ column: 'email', distinct: true });
    expect(con.query).toHaveBeenCalledWith(
      'SELECT COUNT(DISTINCT email) AS count FROM (SELECT * FROM users) AS sub',
      []
    );
  });

  test('Should execute paginate', async () => {
    await tq.columns('id').paginate(2, 10);
    expect(con.query).toHaveBeenCalled();
  });

  test('Should call debug logging', async () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await tq.columns('id').where('id', 1).debug().first();
    await tq.columns('id').where('id', 1).debug().all();
    await tq.columns('id').where('id', 1).debug().paginate(1, 20);
    expect(spy).toHaveBeenCalledTimes(3);
    spy.mockRestore();
  });

  test('Should return flat values by column', async () => {
    const result = await tq.columns('name').flat('name');
    expect(result).toEqual(['a', 'b']);
  });

  test('Should return all flattened values when column is omitted', async () => {
    con.query = jest.fn().mockResolvedValueOnce([
      { name: 'a', id: 1 },
      { name: 'b', id: 2 },
    ]);
    const result = await tq.columns('name', 'id').flat();
    expect(result).toEqual(['a', 1, 'b', 2]);
  });
});
