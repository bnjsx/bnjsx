jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn((path) => 'fake'),
  createReadStream: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs'),
  stat: jest.fn(),
  access: jest.fn(),
}));

jest.mock('https', () => ({
  ...jest.requireActual('https'),
  createServer: jest.fn(() => ({
    listen: jest.fn((port, host, callback) => callback()),
    close: jest.fn((callback) => callback()),
  })),
}));

jest.mock('http', () => ({
  ...jest.requireActual('http'),
  createServer: jest.fn(() => ({
    listen: jest.fn((port, host, callback) => callback()),
    close: jest.fn((callback) => callback()),
  })),
}));

const options: any = {
  env: 'dev',
  host: 'localhost',
  protocol: 'http',
  key: undefined,
  cert: undefined,
  port: 2025,
  public: {
    root: __dirname,
    gzip: false,
    cache: 1000,
  },
  cors: {
    origin: ['https://allowed.com'],
    methods: ['GET', 'POST'],
    credentials: true,
    headers: ['Authorization'],
    expose: ['X-Custom-Header'],
    maxAge: 600,
  },
  security: {
    contentSecurityPolicy: {
      defaultSrc: "'self'",
      scriptSrc: ["'self'", 'trusted.com'],
      upgradeInsecureRequests: true,
    },
    strictTransportSecurity: {
      maxAge: 31536000,
      preload: true,
      includeSubDomains: true,
    },
    referrerPolicy: 'no-referrer',
    crossOriginResourcePolicy: 'same-origin',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginEmbedderPolicy: 'require-corp',
    originAgentCluster: true,
    xContentTypeOptions: true,
    xDnsPrefetchControl: 'off',
    xDownloadOptions: 'noopen',
    xFrameOptions: 'SAMEORIGIN',
    xPermittedCrossDomainPolicies: 'none',
    xssProtection: true,
  },
};

jest.mock('../../../src/config', () => ({
  config: () => {
    return {
      loadSync: () => options,
      resolveSync: () => __dirname,
    };
  },
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-token'),
  }),
}));

import EventEmitter from 'events';

import {
  App,
  AppError,
  appKey,
  asset,
  cookie,
  cors,
  csrf,
  json,
  origin,
  ranger,
  secure,
  START,
  STARTED,
  STOP,
  STOPPED,
  text,
} from '../../../src/core/modules/App';

import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from '../../../src/errors';

import { OriginFunc } from '../../../src/config';
import { Router } from '../../../src/core/modules/Router';

describe('App class', () => {
  let app: App;

  beforeEach(() => {
    options.protocol = 'http';
    options.port = 2025;
    options.key = undefined;
    options.cert = undefined;
    console.log = jest.fn();
  });

  afterAll(() => {
    (console.log as jest.Mock).mockReset();
  });

  describe('Constructor', () => {
    beforeEach(() => {
      (App as any).app = undefined;
    });

    it('should return the same instance on multiple calls', () => {
      const app1 = new App();
      const app2 = new App();
      const app3 = new App();

      expect(app1).toBe(app2); // Same instance should be returned
      expect(app3).toBe(app2); // Same instance should be returned
    });

    it('should throw an error if HTTPS is enabled without key and cert', () => {
      options.key = undefined;
      options.cert = undefined;
      options.protocol = 'https';

      expect(() => new App()).toThrow(
        'For HTTPS, key and cert must be provided'
      );
    });

    it('should create an HTTPS server if protocol is https', () => {
      options.key = 'key/path';
      options.cert = 'cert/path';
      options.protocol = 'https';
      const app: any = new App();
      expect(app.server).toBeDefined();
    });

    it('should create an HTTP server if protocol is http', () => {
      options.protocol = 'http';
      const app: any = new App();
      expect(app.server).toBeDefined();
    });
  });

  describe('use', () => {
    beforeEach(() => {
      // Initialize app before each test
      (App as any).app = undefined;
      app = new App();
    });

    it('should add a valid middleware', () => {
      expect(app['handlers']).toHaveLength(0);
      expect(app['middlewares']).toHaveLength(0);

      app.use(async (req, res) => {});
      app.use(async (req, res, err) => {});

      expect(app['handlers']).toHaveLength(1);
      expect(app['middlewares']).toHaveLength(1);
    });

    it('should throw an error for invalid middleware', () => {
      app.use(async (req, res) => {});

      // Invalid middleware function
      expect(() => app.use(((a, b, c, d) => {}) as any)).toThrow(AppError);
      expect(() => app.use('foo' as any)).toThrow(AppError);
    });
  });

  describe('namespace', () => {
    beforeEach(() => {
      // Initialize app before each test
      (App as any).app = undefined;
      app = new App();
    });
    it('should add a router to a namespace', () => {
      const router = new Router();
      app.namespace('/', router);
      app.namespace('/users', router);

      expect(app['routers']['/']).toEqual([router]);
      expect(app['routers']['/users']).toEqual([router]);
    });

    it('should throw an error for invalid router or namespace', () => {
      expect(() => app.namespace(123 as any, {} as any)).toThrow(AppError);
      expect(() => app.namespace('/', {} as any)).toThrow(AppError);
    });
  });

  describe('start', () => {
    beforeEach(() => {
      // Initialize app before each test
      (App as any).app = undefined;
      app = new App();
    });
    it('should start an HTTP server successfully', async () => {
      const mock = jest.fn((port, host, callback) => callback());

      jest.spyOn(app['server'], 'listen').mockImplementation(mock as any);

      await expect(app.start()).resolves.toBeUndefined();

      expect(mock).toHaveBeenCalledWith(
        app['options'].port,
        app['options'].host,
        expect.any(Function)
      );
    });

    // it('should start an HTTPS server successfully', async () => {
    //   const keyPath = 'test-key.pem';
    //   const certPath = 'test-cert.pem';
    //   app = new App({ protocol: 'https', key: keyPath, cert: certPath });

    //   const mock = jest.fn((port, host, callback) => callback());

    //   jest.spyOn(app['server'], 'listen').mockImplementation(mock as any);

    //   await expect(app.start()).resolves.toBeUndefined();

    //   expect(mock).toHaveBeenCalledWith(
    //     app['options'].port,
    //     app['options'].host,
    //     expect.any(Function)
    //   );
    // });

    it('should reject if server fails to start', async () => {
      const mock = jest.fn((port, host, callback) =>
        callback(new Error('Failed to bind port'))
      );

      jest.spyOn(app['server'], 'listen').mockImplementation(mock as any);
      await expect(app.start()).rejects.toThrow('Failed to bind port');
    });

    it('should emit START before and STARTED after starting the server', async () => {
      const spy = jest.spyOn(app, 'emit'); // Spy on the emit method
      const mock = jest.fn((port, host, callback) => callback());
      jest.spyOn(app['server'], 'listen').mockImplementation(mock as any);

      await expect(app.start()).resolves.toBeUndefined();

      // Ensure START event was emitted before starting
      expect(spy).toHaveBeenNthCalledWith(1, START);

      // Ensure STARTED event was emitted after successful start
      expect(spy).toHaveBeenNthCalledWith(2, STARTED);
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      // Initialize app before each test
      (App as any).app = undefined;
      app = new App();
    });
    it('should stop the server gracefully', async () => {
      const mock = jest.fn((callback) => callback()) as any;
      jest.spyOn(app['server'], 'close').mockImplementation(mock);
      await expect(app.stop()).resolves.toBeUndefined();
    });

    it('should reject if server fails to stop', async () => {
      const mock = jest.fn((callback) =>
        callback(new Error('Failed to close'))
      ) as any;

      jest.spyOn(app['server'], 'close').mockImplementation(mock);
      await expect(app.stop()).rejects.toThrow('Failed to close');
    });

    it('should emit STOP before and STOPPED after stopping the server', async () => {
      const spy = jest.spyOn(app, 'emit'); // Spy on the emit method
      const mock = jest.fn((callback) => callback());
      jest.spyOn(app['server'], 'close').mockImplementation(mock);

      await expect(app.stop()).resolves.toBeUndefined();

      // Ensure STOP event was emitted before stopping
      expect(spy).toHaveBeenNthCalledWith(1, STOP);

      // Ensure STOPPED event was emitted after successful stop
      expect(spy).toHaveBeenNthCalledWith(2, STOPPED);
    });
  });

  describe('handler', () => {
    let app: any;
    let req: any;
    let res: any;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      (App as any).app = undefined;
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      app = new App();
      req = {};
      res = {
        writableEnded: false,
        status: jest.fn().mockReturnThis(),
        render: jest.fn(() => Promise.resolve()),
        json: jest.fn(() => Promise.resolve()),
        end: jest.fn(() => (res.writableEnded = true)),
      };
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should execute custom handlers if defined', async () => {
      const customHandler = jest.fn(async () => res.end());
      app.handlers = [customHandler];

      await app.handler(req, res, new Error('Test Error'));

      expect(customHandler).toHaveBeenCalledWith(req, res, expect.any(Error));
    });

    it('should log the error in development mode', async () => {
      app.options.env = 'dev';

      await app.handler(req, res, new Error('Test Error'));

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.any(String));
    });

    it('should render the correct error page for web mode (400)', async () => {
      app.options.mode = 'web';

      await app.handler(req, res, new BadRequestError());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith('errors.400');
    });

    it('should render the correct error page for web mode (403)', async () => {
      app.options.mode = 'web';

      await app.handler(req, res, new ForbiddenError());

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.render).toHaveBeenCalledWith('errors.403');
    });

    it('should render the correct error page for web mode (404)', async () => {
      app.options.mode = 'web';

      await app.handler(req, res, new NotFoundError());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.render).toHaveBeenCalledWith('errors.404');
    });

    it('should return JSON response for API mode (400)', async () => {
      app.options.mode = 'api';

      await app.handler(req, res, new BadRequestError());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'BadRequestError',
        message: 'Bad Request.',
      });
    });

    it('should return JSON response for API mode (403)', async () => {
      app.options.mode = 'api';

      await app.handler(req, res, new ForbiddenError());

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'ForbiddenError',
        message: 'Access Forbidden.',
      });
    });

    it('should return JSON response for API mode (404)', async () => {
      app.options.mode = 'api';

      await app.handler(req, res, new NotFoundError());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'NotFoundError',
        message: 'The requested resource could not be found.',
      });
    });

    it('should return a 500 error response for unknown errors (web mode)', async () => {
      app.options.mode = 'web';

      await app.handler(req, res, new Error('Unknown error'));

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('errors.500');
    });

    it('should return a 500 error response for unknown errors (API mode)', async () => {
      app.options.mode = 'api';

      await app.handler(req, res, new Error('Unknown error'));

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'ServerError',
        message: 'Ops! Something went wrong.',
      });
    });
  });

  describe('process', () => {
    let app: any;
    let req: any;
    let res: any;

    beforeEach(() => {
      (App as any).app = undefined;
      app = new App();
      app.handler = jest.fn(async () => {});
      req = { url: '/', method: 'GET' };
      res = {
        writableEnded: false,
        end: jest.fn(() => (res.writableEnded = true)),
      };
    });

    it('should execute middlewares for a valid route', async () => {
      // Global middlewares
      const middleware1 = jest.fn(async () => {});
      const middleware2 = jest.fn(async () => {});

      // Local middleware
      const middleware3 = jest.fn(async () => res.end());

      // Register Global middlewares
      app.middlewares = [middleware1, middleware2];

      // Register a route
      app.routers = {
        '/': [
          {
            match: jest.fn(() => ({ params: {}, middlewares: [middleware3] })),
          },
        ],
      };

      await expect(app.process(req, res)).resolves.toBeUndefined();

      expect(middleware1).toHaveBeenCalledWith(req, res, undefined);
      expect(middleware2).toHaveBeenCalledWith(req, res, undefined);
      expect(middleware3).toHaveBeenCalledWith(req, res, undefined);
    });

    it('should handle undefined namespace (404)', async () => {
      // Global middlewares
      const middleware1 = jest.fn(async () => {});
      const middleware2 = jest.fn(async () => {});

      // Register Global middlewares
      app.middlewares = [middleware1, middleware2];

      await expect(app.process(req, res)).resolves.toBeUndefined();

      // Our error handler is executed to handle NotFoundError
      expect(app.handler).toHaveBeenCalledWith(
        req,
        res,
        expect.any(NotFoundError)
      );

      // Global middlewares executed for each request
      expect(middleware1).toHaveBeenCalledWith(req, res, undefined);
      expect(middleware2).toHaveBeenCalledWith(req, res, undefined);
    });

    it('should handle undefined route (404)', async () => {
      // Global middlewares
      const middleware1 = jest.fn(async () => {});
      const middleware2 = jest.fn(async () => {});

      // Register Global middlewares
      app.middlewares = [middleware1, middleware2];

      // Name space exist but not route found
      app.routers = { '/': [] };

      await expect(app.process(req, res)).resolves.toBeUndefined();

      // Our error handler is executed to handle NotFoundError
      expect(app.handler).toHaveBeenCalledWith(
        req,
        res,
        expect.any(NotFoundError)
      );

      // Global middlewares executed for each request
      expect(middleware1).toHaveBeenCalledWith(req, res, undefined);
      expect(middleware2).toHaveBeenCalledWith(req, res, undefined);
    });

    it('should handle errors thrown by middlewares', async () => {
      const error = new Error('Middleware error');
      const success = jest.fn(async () => {});
      const fail = jest.fn(async () => {
        throw error;
      });

      app.middlewares = [fail];
      app.routers = {
        '/': [
          {
            match: jest.fn(() => ({ params: {}, middlewares: [success] })),
          },
        ],
      };

      await expect(app.process(req, res)).resolves.toBeUndefined();
      expect(app.handler).toHaveBeenCalledWith(req, res, error);
      expect(fail).toHaveBeenCalled();
      expect(success).not.toHaveBeenCalled();
    });

    it('should extract request properties correctly', async () => {
      req.url = '/products?id=123';
      app.routers = {
        '/products': [
          {
            match: jest.fn(() => ({ params: { id: '123' }, middlewares: [] })),
          },
        ],
      };

      await expect(app.process(req, res)).resolves.toBeUndefined();

      expect(req.protocol).toBe('http');
      expect(req.host).toBe('localhost');
      expect(req.port).toBe('2025');
      expect(req.path).toBe('/products');
      expect(req.query.get('id')).toBe('123');
      expect(req.params).toEqual({ id: '123' });
    });
  });

  describe('execute', () => {
    let app: any;
    let req: any;
    let res: any;

    beforeEach(() => {
      (App as any).app = undefined;
      app = new App();
      req = {};
      res = {
        writableEnded: false,
        end: jest.fn(() => (res.writableEnded = true)),
      };
    });

    it('should execute all middlewares in order', async () => {
      const middleware1 = jest.fn(async () => {});
      const middleware2 = jest.fn(async () => res.end());
      const middleware3 = jest.fn(async () => res.end());

      await expect(
        app.execute([middleware1, middleware2, middleware3], req, res)
      ).resolves.toBeUndefined();

      expect(middleware1).toHaveBeenCalledWith(req, res, undefined);
      expect(middleware2).toHaveBeenCalledWith(req, res, undefined);
      expect(middleware3).not.toHaveBeenCalled();
    });

    it('should resolve immediately if response is already ended', async () => {
      res.writableEnded = true;
      const middleware = jest.fn();

      await expect(
        app.execute([middleware], req, res)
      ).resolves.toBeUndefined();

      expect(middleware).not.toHaveBeenCalled();
    });

    it('should reject if a middleware does not return a promise', async () => {
      const invalidMiddleware = jest.fn(() => 'invalid' as any);

      await expect(app.execute([invalidMiddleware], req, res)).rejects.toThrow(
        'Invalid middleware'
      );
    });

    it('should reject if response is not sent after all middlewares', async () => {
      const middleware = jest.fn(async () => {});

      await expect(app.execute([middleware], req, res)).rejects.toThrow(
        'Response not sent after processing all middlewares.'
      );
    });

    it('should catch middleware errors and reject', async () => {
      const middleware = jest.fn(async () => {
        throw new Error('Middleware error');
      });

      await expect(app.execute([middleware], req, res)).rejects.toThrow(
        'Middleware error'
      );
    });
  });
});

describe('origin', () => {
  it('should allow all origins when "*" is passed', async () => {
    await expect(origin('example.com', '*')).resolves.toBe(true);
  });

  it('should return true when the origin exists in the array', async () => {
    await expect(
      origin('example.com', ['example.com', 'test.com'])
    ).resolves.toBe(true);
  });

  it('should return false when the origin does not exist in the array', async () => {
    await expect(
      origin('example.com', ['test.com', 'another.com'])
    ).resolves.toBe(false);
  });

  it('should execute the function and resolve with its return value', async () => {
    const mockFunc: OriginFunc = jest.fn().mockResolvedValue(true);
    await expect(origin('example.com', mockFunc)).resolves.toBe(true);
    expect(mockFunc).toHaveBeenCalledWith('example.com');
  });

  it('should return false for an invalid origins parameter', async () => {
    await expect(origin('example.com', {} as any)).resolves.toBe(false);
  });
});

describe('ranger', () => {
  it('should parse valid range header', () => {
    expect(ranger('bytes=10-20', 100)).toEqual({
      start: 10,
      end: 20,
      size: 100,
    });
  });

  it('should return null for an invalid range header', () => {
    expect(ranger('invalid-header', 100)).toBeNull();
  });

  it('should handle a range with only an end', () => {
    expect(ranger('bytes=-20', 100)).toEqual({ start: 80, end: 99, size: 100 });
  });

  it('should handle a range with only a start', () => {
    expect(ranger('bytes=30-', 100)).toEqual({ start: 30, end: 99, size: 100 });
  });

  it('should return null for out-of-bounds ranges', () => {
    expect(ranger('bytes=110-120', 100)).toBeNull();
  });

  it('should return null for invalid start > end', () => {
    expect(ranger('bytes=50-40', 100)).toBeNull();
  });

  it('should return null if both start and end are missing or null', () => {
    expect(ranger('bytes=', 100)).toBeNull(); // No start and end specified
    expect(ranger('bytes=-', 100)).toBeNull(); // Neither start nor end
  });
});

describe('cookie', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = { getHeader: jest.fn() };
    res = {};
  });

  it('should correctly parse cookies', async () => {
    req.getHeader.mockReturnValue('name=JohnDoe; session=abc123');

    await cookie(req, res);

    expect(req.cookies).toEqual({
      name: 'JohnDoe',
      session: 'abc123',
    });
  });

  it('should return empty object if cookie header is missing', async () => {
    req.getHeader.mockReturnValue(undefined);

    await cookie(req, res);

    expect(req.cookies).toEqual({});
  });

  it('should return empty object if cookie header is an empty string', async () => {
    req.getHeader.mockReturnValue('');

    await cookie(req, res);

    expect(req.cookies).toEqual({});
  });

  it('should correctly handle multiple cookies', async () => {
    req.getHeader.mockReturnValue('theme=dark; lang=en; token=xyz');

    await cookie(req, res);

    expect(req.cookies).toEqual({
      theme: 'dark',
      lang: 'en',
      token: 'xyz',
    });
  });

  it('should handle cookies with spaces correctly', async () => {
    req.getHeader.mockReturnValue('user=John Doe; city=New York');

    await cookie(req, res);

    expect(req.cookies).toEqual({
      user: 'John Doe',
      city: 'New York',
    });
  });

  it('should decode URL-encoded cookie values', async () => {
    req.getHeader.mockReturnValue('city=New%20York; language=en%20US');

    await cookie(req, res);

    expect(req.cookies).toEqual({
      city: 'New York',
      language: 'en US',
    });
  });

  it('should ignore malformed cookies', async () => {
    req.getHeader.mockReturnValue('valid=good; =bad; incomplete');

    await cookie(req, res);

    expect(req.cookies).toEqual({
      valid: 'good',
    });
  });
});

describe('json', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = new EventEmitter();
    req.getHeader = jest.fn();
    res = {};
  });

  it('should parse a valid JSON request body', async () => {
    req.getHeader.mockReturnValue('application/json');

    const data = { name: 'John' };
    const promise = json(req, res);

    req.emit('data', Buffer.from(JSON.stringify(data)));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toEqual(data);
  });

  it('should do nothing if content type is not application/json', async () => {
    req.getHeader.mockReturnValue('text/plain');

    await expect(json(req, res)).resolves.toBeUndefined();
    expect(req.body).toBeUndefined();
  });

  it('should handle empty request bodies gracefully', async () => {
    req.getHeader.mockReturnValue('application/json');

    const promise = json(req, res);

    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toBeUndefined();
  });

  it('should reject invalid JSON with an error', async () => {
    req.getHeader.mockReturnValue('application/json');

    const promise = json(req, res);

    req.emit('data', Buffer.from('{invalid json}'));
    req.emit('end');

    await expect(promise).rejects.toThrow();
  });

  it('should work with chunked JSON data', async () => {
    req.getHeader.mockReturnValue('application/json');

    const promise = json(req, res);

    req.emit('data', Buffer.from('{"name":'));
    req.emit('data', Buffer.from('"Alice"}'));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toEqual({ name: 'Alice' });
  });

  it('should do nothing if content type is undefined', async () => {
    req.getHeader.mockReturnValue(undefined); // Content type is undefined

    await expect(json(req, res)).resolves.toBeUndefined();
    expect(req.body).toBeUndefined();
  });
});

describe('text', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = new EventEmitter();
    req.getHeader = jest.fn();
    res = {};
  });

  it('should parse a plain text request body', async () => {
    req.getHeader.mockReturnValue('text/plain');

    const data = 'Hello, World!';
    const promise = text(req, res);

    req.emit('data', Buffer.from(data));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toBe(data);
  });

  it('should parse an HTML text request body', async () => {
    req.getHeader.mockReturnValue('text/html');

    const data = '<h1>Hello</h1>';
    const promise = text(req, res);

    req.emit('data', Buffer.from(data));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toBe(data);
  });

  it('should do nothing if content type is not text/plain or text/html', async () => {
    req.getHeader.mockReturnValue('application/json');

    await expect(text(req, res)).resolves.toBeUndefined();
    expect(req.body).toBeUndefined();
  });

  it('should handle empty text request bodies gracefully', async () => {
    req.getHeader.mockReturnValue('text/plain');

    const promise = text(req, res);

    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toBe('');
  });

  it('should work with chunked text data', async () => {
    req.getHeader.mockReturnValue('text/plain');

    const promise = text(req, res);

    req.emit('data', Buffer.from('Hello, '));
    req.emit('data', Buffer.from('World!'));
    req.emit('end');

    await expect(promise).resolves.toBeUndefined();
    expect(req.body).toBe('Hello, World!');
  });

  it('should do nothing if content type is undefined', async () => {
    req.getHeader.mockReturnValue(undefined); // Content type is undefined

    await expect(text(req, res)).resolves.toBeUndefined();
    expect(req.body).toBeUndefined();
  });
});

describe('asset', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = new EventEmitter();
    req.getHeader = jest.fn();
    req.path = '/test.txt';

    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(() => Promise.resolve()),
      stream: jest.fn(() => Promise.resolve()),
    };

    // Disable gzip
    options.public.gzip = false;
    options.public.root = __dirname;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a file when it exists', async () => {
    const stats = {
      isFile: () => true,
      size: 13,
      mtimeMs: new Date().getTime(),
    };

    const mock = require('fs/promises').stat;
    mock.mockResolvedValue(stats);

    await expect(asset(req, res)).resolves.toBeUndefined();

    expect(res.setHeader).toHaveBeenCalledWith('Accept-Ranges', 'bytes');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', stats.size);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; charset=utf-8'
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, max-age=1000'
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      'Last-Modified',
      stats.mtimeMs.toString()
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      'ETag',
      `${stats.mtimeMs}-${stats.size}`
    );

    expect(res.setHeader).toHaveBeenCalledTimes(6);
    expect(res.stream).toHaveBeenCalled();
  });

  it('should return 304 if ETag matches', async () => {
    const mock = require('fs/promises').stat;
    const stats = {
      isFile: () => true,
      size: 13,
      mtimeMs: new Date().getTime(),
    };

    mock.mockResolvedValue(stats);

    req.getHeader.mockImplementation((header: string) => {
      if (header === 'If-None-Match') return `${stats.mtimeMs}-${stats.size}`;
      return null;
    });

    await expect(asset(req, res)).resolves.toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.send).toHaveBeenCalled();
  });

  it('should return 304 if If-Modified-Since matches', async () => {
    const mock = require('fs/promises').stat;
    const stats = {
      isFile: () => true,
      size: 13,
      mtimeMs: new Date().getTime(),
    };

    mock.mockResolvedValue(stats);

    req.getHeader.mockImplementation((header: string) => {
      if (header === 'If-Modified-Since') return stats.mtimeMs.toString();
      return null;
    });

    await expect(asset(req, res)).resolves.toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(304);
    expect(res.send).toHaveBeenCalled();
  });

  it('should resolve if file does not exist', async () => {
    const mock = require('fs/promises').stat;
    mock.mockRejectedValue({ code: 'ENOENT' });

    await expect(asset(req, res)).resolves.toBeUndefined();
  });

  it('should reject with other errors', async () => {
    const mock = require('fs/promises').stat;
    mock.mockRejectedValue(new Error('Some error'));

    await expect(asset(req, res)).rejects.toThrow('Some error');
  });

  it('should return 416 if range is invalid', async () => {
    const mock = require('fs/promises').stat;
    const stats = {
      isFile: () => true,
      size: 13,
      mtimeMs: new Date().getTime(),
    };

    mock.mockResolvedValue(stats);

    req.getHeader.mockImplementation((key: string) => {
      if (key === 'Range') return 'bytes=50-100';
      return null;
    });

    await expect(asset(req, res)).resolves.toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(416);
    expect(res.send).toHaveBeenCalled();
  });

  it('should return 206 (Partial Content) for a valid range', async () => {
    const stats = {
      isFile: () => true,
      size: 1000,
      mtimeMs: new Date().getTime(),
    };

    require('fs/promises').stat.mockResolvedValue(stats);

    req.getHeader.mockImplementation((header: string) => {
      if (header === 'Range') return 'bytes=200-499';
      return null;
    });

    await expect(asset(req, res)).resolves.toBeUndefined();

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Range',
      'bytes 200-499/1000'
    );

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/plain; charset=utf-8'
    );

    expect(res.setHeader).toHaveBeenCalledWith('Accept-Ranges', 'bytes');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', 300);
    expect(res.setHeader).toHaveBeenCalledTimes(4);
    expect(res.status).toHaveBeenCalledWith(206);
    expect(res.stream).toHaveBeenCalled();
  });

  it('should serve gzipped file if Accept-Encoding includes gzip', async () => {
    const stats = {
      isFile: () => true,
      size: 50,
      mtimeMs: new Date().getTime(),
    };

    require('fs/promises').stat.mockResolvedValue(stats);
    require('fs/promises').access.mockResolvedValue();

    options.public.gzip = true; // enable gzip

    req.getHeader.mockImplementation((key: string) => {
      if (key === 'Accept-Encoding') return 'gzip, deflate';
      return null;
    });

    await expect(asset(req, res)).resolves.toBeUndefined();
    expect(res.setHeader).toHaveBeenCalledWith('Content-Encoding', 'gzip');
    expect(res.setHeader).toHaveBeenCalledTimes(7);
    expect(res.stream).toHaveBeenCalled();
  });

  it('should serve gzipped file if Accept-Encoding includes gzip', async () => {
    const stats = {
      isFile: () => true,
      size: 50,
      mtimeMs: new Date().getTime(),
    };

    require('fs/promises').stat.mockResolvedValue(stats);
    require('fs/promises').access.mockRejectedValue();

    options.public.gzip = true; // enable gzip

    req.getHeader.mockImplementation((key: string) => {
      if (key === 'Accept-Encoding') return 'gzip, deflate';
      return null;
    });

    await expect(asset(req, res)).resolves.toBeUndefined();

    expect(res.setHeader).toHaveBeenCalledTimes(6);
    expect(res.stream).toHaveBeenCalled();
  });

  it('should resolve the root if not absolute', async () => {
    const stats = {
      isFile: () => true,
      size: 50,
      mtimeMs: new Date().getTime(),
    };

    require('fs/promises').stat.mockResolvedValue(stats);

    options.public.root = 'public';
    await expect(asset(req, res)).resolves.toBeUndefined();

    expect(require('fs').createReadStream).toHaveBeenCalledWith(
      require('path').resolve(__dirname, 'public', './test.txt')
    );
  });

  it('should reject with ForbiddenError if path is outside root', async () => {
    const stats = {
      isFile: () => true,
      size: 50,
      mtimeMs: new Date().getTime(),
    };

    require('fs/promises').stat.mockResolvedValue(stats);

    req.path = '../../secret.txt';
    await expect(asset(req, res)).rejects.toThrow(ForbiddenError);
  });

  it('should resolve without sending a file if path is not a file', async () => {
    require('fs/promises').stat.mockResolvedValue({
      isFile: () => false,
    });

    await expect(asset(req, res)).resolves.toBeUndefined();
    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.stream).not.toHaveBeenCalled();
  });

  it('should use buffer as a fallback mime type', async () => {
    const stats = {
      isFile: () => true,
      size: 50,
      mtimeMs: new Date().getTime(),
    };

    require('fs/promises').stat.mockResolvedValue(stats);

    // invalid file
    req.path = '/foo';

    await expect(asset(req, res)).resolves.toBeUndefined();
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/octet-stream'
    );
  });
});

describe('CORS Middleware', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      headers: { origin: 'https://allowed.com' },
      method: 'GET',
    };

    res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  it('should allow requests from allowed origins', async () => {
    await expect(cors(req, res)).resolves.toBeUndefined();

    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Origin',
      'https://allowed.com'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Methods',
      'GET, POST'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Credentials',
      'true'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Allow-Headers',
      'Authorization'
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Access-Control-Expose-Headers',
      'X-Custom-Header'
    );
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', 600);
    expect(res.setHeader).toHaveBeenCalledWith('Vary', 'Origin');
  });

  it('should reject requests from disallowed origins', async () => {
    req.headers.origin = 'https://forbidden.com';

    await expect(cors(req, res)).rejects.toThrow(
      new ForbiddenError(`This origin is forbidden: 'https://forbidden.com'`)
    );
  });

  it('should return 204 for preflight OPTIONS request', async () => {
    req.method = 'OPTIONS';

    await expect(cors(req, res)).resolves.toBeUndefined();

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  it('should do nothing if no origin header is present', async () => {
    req.headers.origin = undefined;

    await expect(cors(req, res)).resolves.toBeUndefined();
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});

describe('Security Headers Middleware', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {};
    res = {
      setHeader: jest.fn(),
    };
  });

  it('should set Content-Security-Policy header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' trusted.com; upgrade-insecure-requests"
    );
  });

  it('should set Strict-Transport-Security header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; preload; includeSubDomains'
    );
  });

  it('should set Referrer-Policy header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Referrer-Policy',
      'no-referrer'
    );
  });

  it('should set Cross-Origin-Resource-Policy header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cross-Origin-Resource-Policy',
      'same-origin'
    );
  });

  it('should set Cross-Origin-Opener-Policy header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cross-Origin-Opener-Policy',
      'same-origin'
    );
  });

  it('should set Cross-Origin-Embedder-Policy header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cross-Origin-Embedder-Policy',
      'require-corp'
    );
  });

  it('should set Origin-Agent-Cluster header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('Origin-Agent-Cluster', '?1');
  });

  it('should set X-Content-Type-Options header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff'
    );
  });

  it('should set X-DNS-Prefetch-Control header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('X-DNS-Prefetch-Control', 'off');
  });

  it('should set X-Download-Options header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('X-Download-Options', 'noopen');
  });

  it('should set X-Frame-Options header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
  });

  it('should set X-Permitted-Cross-Domain-Policies header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Permitted-Cross-Domain-Policies',
      'none'
    );
  });

  it('should set X-XSS-Protection header', async () => {
    await secure(req, res);
    expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '0');
  });
});

describe('CSRF Middleware', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      method: 'GET', // Default method
      body: {},
      cookies: {},
      headers: {},
    };
    res = {
      cookie: jest.fn(),
    };
  });

  it('should generate a CSRF token for GET requests', async () => {
    req.cookies = undefined;
    req.method = 'GET';

    await csrf(req, res);

    // Ensure the CSRF token is set in the request
    expect(req.csrfToken).toBe('mock-token');

    // Ensure the cookie is set
    expect(res.cookie).toHaveBeenCalledWith(
      'csrfToken',
      'mock-token',
      expect.objectContaining({
        expires: expect.any(String),
        secure: false, // `secure` will be false since the env is 'dev'
        httpOnly: true,
        sameSite: 'Strict',
        priority: 'High',
      })
    );
  });

  it('should accept a valid CSRF token in POST requests', async () => {
    req.method = 'POST';
    req.cookies.csrfToken = 'valid-token';
    req.body.csrfToken = 'valid-token'; // Simulating valid token

    await expect(csrf(req, res)).resolves.toBeUndefined();
  });

  it('should reject with BadRequestError if CSRF token mismatch', async () => {
    req.method = 'POST';
    req.cookies.csrfToken = 'valid-token';
    req.body.csrfToken = 'invalid-token';

    await expect(csrf(req, res)).rejects.toThrow(
      new BadRequestError('Invalid or missing CSRF token')
    );
  });

  it('should reject with BadRequestError if CSRF token is missing', async () => {
    req.method = 'POST';
    req.cookies.csrfToken = 'valid-token';
    req.body.csrfToken = undefined; // No token

    await expect(csrf(req, res)).rejects.toThrow(
      new BadRequestError('Invalid or missing CSRF token')
    );
  });

  it('should set the CSRF token from cookies if present', async () => {
    req.cookies = { csrfToken: 'existing-token' };

    await csrf(req, res);

    // Ensure that req.csrfToken is set to the token from cookies
    expect(req.csrfToken).toBe('existing-token');

    // Ensure no cookie is set because the CSRF token was already available in the cookies
    expect(res.cookie).not.toHaveBeenCalled();
  });

  it('should handle case when cookies, body are undefined', async () => {
    // Setting cookies, body to undefined
    req.method = 'POST';
    req.cookies = undefined;
    req.body = undefined;

    await expect(csrf(req, res)).rejects.toThrow(
      new BadRequestError('Invalid or missing CSRF token')
    );
  });
});

describe('appKey', () => {
  it('should return the APP_KEY when it is defined', () => {
    process.env.APP_KEY = 'test-key';
    expect(appKey()).toBe('test-key');
  });

  it('should throw an AuthError when APP_KEY is not defined', () => {
    delete process.env.APP_KEY;
    expect(appKey).toThrow(AppError);
    expect(appKey).toThrow(
      'Missing APP_KEY: execute "node cmd new:key" to generate a new APP_KEY'
    );
  });
});
