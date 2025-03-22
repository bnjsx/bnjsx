import { Router } from '../../../src/core/modules/Router';

describe('Router', () => {
  let router: Router;
  const middleware = jest.fn();

  beforeEach(() => {
    router = new Router();
  });

  describe('add()', () => {
    test('should add a route with a string path', () => {
      router.add('GET', '/', middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: 'GET',
        pattern: /^\/$/,
        middlewares: [middleware],
      });
    });

    test('should add a route with a RegExp path', () => {
      router.add('GET', /^\/$/, middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: 'GET',
        pattern: /^\/$/,
        middlewares: [middleware],
      });
    });

    test('should add a route with parameters', () => {
      router.add('GET', '/user/:name/:age', middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: 'GET',
        pattern: /^\/user(?:\/([^\/]+))(?:\/([^\/]+))$/,
        params: ['name', 'age'],
        middlewares: [middleware],
      });
    });

    test('should store middlewares for a route', () => {
      router.add('GET', '/users', middleware, middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: 'GET',
        pattern: /^\/users$/,
        middlewares: [middleware, middleware],
      });
    });

    test('should throw for an invalid route method', () => {
      expect(() => router.add('Invalid' as any, '/users', middleware)).toThrow(
        'Invalid route method'
      );
    });

    test('should throw for an invalid route path', () => {
      expect(() => router.add('GET', 123 as any, middleware)).toThrow(
        'Invalid route path'
      );
    });

    test('should throw for an invalid route middlewares', () => {
      expect(() => router.add('GET', '/users', 'Invalid' as any)).toThrow(
        'Invalid route middlewares'
      );
    });
  });

  describe('get()', () => {
    test('should register a GET route', () => {
      router.get('/users', middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: 'GET',
        pattern: /^\/users$/,
        middlewares: [middleware],
      });
    });
  });

  describe('post()', () => {
    test('should register a POST route', () => {
      router.post('/users', middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: 'POST',
        pattern: /^\/users$/,
        middlewares: [middleware],
      });
    });
  });

  describe('put()', () => {
    test('should register a PUT route', () => {
      router.put('/users', middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: 'PUT',
        pattern: /^\/users$/,
        middlewares: [middleware],
      });
    });
  });

  describe('delete()', () => {
    test('should register a DELETE route', () => {
      router.delete('/users', middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: 'DELETE',
        pattern: /^\/users$/,
        middlewares: [middleware],
      });
    });
  });

  describe('patch()', () => {
    test('should register a PATCH route', () => {
      router.patch('/users', middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: 'PATCH',
        pattern: /^\/users$/,
        middlewares: [middleware],
      });
    });
  });

  describe('options()', () => {
    test('should register an OPTIONS route', () => {
      router.options('/users', middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: 'OPTIONS',
        pattern: /^\/users$/,
        middlewares: [middleware],
      });
    });
  });

  describe('head()', () => {
    test('should register a HEAD route', () => {
      router.head('/users', middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: 'HEAD',
        pattern: /^\/users$/,
        middlewares: [middleware],
      });
    });
  });

  describe('all()', () => {
    test('should register a wildcard route', () => {
      router.all('/users', middleware);

      expect(router.routes).toHaveLength(1);
      expect(router.routes[0]).toEqual({
        method: '*',
        pattern: /^\/users$/,
        middlewares: [middleware],
      });
    });
  });

  describe('match()', () => {
    test('should match a registered route', () => {
      router.get('/users/:id', middleware);

      expect(router.match('/users/23', 'GET')).toEqual({
        middlewares: [middleware],
        params: { id: '23' },
      });

      expect(router.match('/users/23', 'POST')).toBeUndefined();
      expect(router.match('/users/23', 'PUT')).toBeUndefined();
      expect(router.match('/users/23', 'PATCH')).toBeUndefined();
    });

    test('should match routes with wildcard *', () => {
      router.get('/users/:id/token=*', middleware);

      expect(router.match('/users/23/token=foo', 'GET')).toEqual({
        middlewares: [middleware],
        params: { id: '23' },
      });
    });

    test('should match optional routes', () => {
      router.get('/users/:id?/token=*', middleware);

      expect(router.match('/users/23/token=foo', 'GET')).toEqual({
        middlewares: [middleware],
        params: { id: '23' },
      });

      expect(router.match('/users/token=foo', 'GET')).toEqual({
        middlewares: [middleware],
        params: { id: undefined },
      });
    });

    test('should match routes with no params', () => {
      router.get('/users/token=*', middleware);

      expect(router.match('/users/token=foo', 'GET')).toEqual({
        middlewares: [middleware],
        params: [],
      });
    });

    test('should match regex routes', () => {
      router.get(/^\/users\/token=(.*)$/, middleware);

      expect(router.match('/users/token=foo', 'GET')).toEqual({
        middlewares: [middleware],
        params: ['foo'],
      });
    });

    test('should match all methods', () => {
      router.all(/^\/users$/, middleware);

      expect(router.match('/users', 'GET')).toEqual({
        middlewares: [middleware],
        params: [],
      });

      expect(router.match('/users', 'POST')).toEqual({
        middlewares: [middleware],
        params: [],
      });

      expect(router.match('/users', 'OPTIONS')).toEqual({
        middlewares: [middleware],
        params: [],
      });

      expect(router.match('/users', 'PATCH')).toEqual({
        middlewares: [middleware],
        params: [],
      });

      expect(router.match('/users', 'PUT')).toEqual({
        middlewares: [middleware],
        params: [],
      });

      expect(router.match('/users', 'DELETE')).toEqual({
        middlewares: [middleware],
        params: [],
      });

      expect(router.match('/users', 'HEAD')).toEqual({
        middlewares: [middleware],
        params: [],
      });
    });
  });
});
