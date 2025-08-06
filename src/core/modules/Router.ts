import { isArrOfFunc, isHTTPMethod, isRegex, isStr } from '../../helpers';
import { Middleware } from '../middlewares';
import { HTTPMethod } from '../../config';

/**
 * Represents a route in the router.
 *
 * @property `method` The HTTP method for the route (e.g., 'GET', 'POST', or '*').
 * @property `pattern` The regular expression pattern used to match the route path.
 * @property `params` Optional array of parameter names extracted from the route path.
 * @property `middlewares` The middleware functions to execute for this route.
 */
type Route = {
  method: HTTPMethod | '*';
  pattern: RegExp;
  params?: string[];
  middlewares: Middleware[];
};

/**
 * Represents the result of a matched route.
 *
 * @property `middlewares` The middleware functions associated with the matched route.
 * @property `params` Extracted route parameters as a key-value object or an array.
 */
export type RouteMatch = {
  middlewares: Middleware[];
  params: Record<string, string> | Array<string>;
};

/**
 * Custom error class for router-related errors.
 */
export class RouterError extends Error {}

/**
 * A simple router for handling HTTP requests.
 *
 * The `Router` class allows defining routes with specific HTTP methods and paths,
 * associating them with middleware functions. It supports dynamic route parameters
 * and regular expressions for flexible route matching.
 */
export class Router {
  /**
   * The list of registered routes.
   */
  public routes: Array<Route> = new Array();

  /**
   * Adds a new route to the router.
   *
   * @param method The HTTP method for the route (e.g., `GET`, `POST`) or `*` for all methods.
   * @param  path The route path, which can be a string (supports dynamic parameters) or a RegExp.
   * @param middlewares The middleware functions to be executed for this route.
   * @throws `RouterError` If the method, path, or middlewares are invalid.
   */
  public add(
    method: HTTPMethod | '*',
    path: string | RegExp,
    ...middlewares: Middleware[]
  ): this {
    if (!isHTTPMethod(method) && method !== '*') {
      throw new RouterError('Invalid route method');
    }

    if (!(isStr(path) || isRegex(path))) {
      throw new RouterError('Invalid route path');
    }

    if (!isArrOfFunc(middlewares)) {
      throw new RouterError('Invalid route middlewares');
    }

    if (isRegex(path)) {
      this.routes.push({ method, pattern: path, middlewares });
      return;
    }

    const params: string[] = [];

    const pattern = new RegExp(
      `^${path
        .replace('*', '.*')
        .replace(/\/:([^\/\?]+)/g, (_, name: string) => {
          params.push(name);
          return '(?:\\/([^\\/]+))';
        })}\/?$`
    );

    if (params.length === 0) {
      this.routes.push({ method, pattern, middlewares });
      return;
    }

    this.routes.push({ method, pattern, params, middlewares });

    return this;
  }

  /**
   * Adds a `GET` route to the router.
   *
   * @param path The route path as a string (supports dynamic parameters) or a RegExp.
   * @param middlewares The middleware functions to be executed for this route.
   */
  public get(path: string | RegExp, ...middlewares: Middleware[]): this {
    this.add('GET', path, ...middlewares);
    return this;
  }

  /**
   * Adds a `POST` route to the router.
   *
   * @param path The route path as a string (supports dynamic parameters) or a RegExp.
   * @param middlewares The middleware functions to be executed for this route.
   */
  public post(path: string | RegExp, ...middlewares: Middleware[]): this {
    this.add('POST', path, ...middlewares);
    return this;
  }

  /**
   * Adds a `PUT` route to the router.
   *
   * @param path The route path as a string (supports dynamic parameters) or a RegExp.
   * @param middlewares The middleware functions to be executed for this route.
   */
  public put(path: string | RegExp, ...middlewares: Middleware[]): this {
    this.add('PUT', path, ...middlewares);
    return this;
  }

  /**
   * Adds a `DELETE` route to the router.
   *
   * @param path The route path as a string (supports dynamic parameters) or a RegExp.
   * @param middlewares The middleware functions to be executed for this route.
   */
  public delete(path: string | RegExp, ...middlewares: Middleware[]): this {
    this.add('DELETE', path, ...middlewares);
    return this;
  }

  /**
   * Adds a `PATCH` route to the router.
   *
   * @param path The route path as a string (supports dynamic parameters) or a RegExp.
   * @param middlewares The middleware functions to be executed for this route.
   */
  public patch(path: string | RegExp, ...middlewares: Middleware[]): this {
    this.add('PATCH', path, ...middlewares);
    return this;
  }

  /**
   * Adds an `OPTIONS` route to the router.
   *
   * @param path The route path as a string (supports dynamic parameters) or a RegExp.
   * @param middlewares The middleware functions to be executed for this route.
   */
  public options(path: string | RegExp, ...middlewares: Middleware[]): this {
    this.add('OPTIONS', path, ...middlewares);
    return this;
  }

  /**
   * Adds a `HEAD` route to the router.
   *
   * @param path The route path as a string (supports dynamic parameters) or a RegExp.
   * @param middlewares The middleware functions to be executed for this route.
   */
  public head(path: string | RegExp, ...middlewares: Middleware[]): this {
    this.add('HEAD', path, ...middlewares);
    return this;
  }

  /**
   * Adds a route that matches all HTTP methods.
   *
   * @param path The route path as a string (supports dynamic parameters) or a RegExp.
   * @param middlewares The middleware functions to be executed for this route.
   */
  public all(path: string | RegExp, ...middlewares: Middleware[]): this {
    this.add('*', path, ...middlewares);
    return this;
  }

  /**
   * Matches a given path and HTTP method against the registered routes.
   *
   * @param path The request path to match against the routes.
   * @param method The HTTP method of the request (e.g., `GET`, `POST`).
   * @returns The matched route with its middlewares and parameters, or `undefined` if no match is found.
   */
  public match(path: string, method: string): RouteMatch | undefined {
    const route = this.routes
      .filter((route) => route.method === method || route.method === '*')
      .find((route) => route.pattern.test(path));

    if (route) {
      const match = route.pattern.exec(path);

      if (route.params) {
        const params: Record<string, string> = {};

        route.params.forEach((param, index) => {
          params[param] = match[index + 1];
        });

        return { middlewares: route.middlewares, params };
      }

      const params = match.slice(1);
      return { middlewares: route.middlewares, params };
    }
  }
}
