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

import {
  App,
  appKey,
  START,
  STARTED,
  STOP,
  STOPPED,
} from '../../../src/core/modules/App';

import { NotFoundError, AppError } from '../../../src/errors';

import { Router } from '../../../src/core/modules/Router';
import { Service } from '../../../src/core/modules/Service';
import * as helpers from '../../../src/helpers';

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

      // @ts-ignore
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

    it('should add a service to a namespace', () => {
      class User extends Service {}
      app.namespace('/', User);
      app.namespace('/users', User);

      expect(app['routers']['/']).toEqual([User]);
      expect(app['routers']['/users']).toEqual([User]);
    });

    it('should throw an error for invalid router or namespace', () => {
      expect(() => app.namespace(123 as any, {} as any)).toThrow(AppError);
      expect(() => app.namespace('/', {} as any)).toThrow(AppError);
    });
  });

  describe('register', () => {
    beforeEach(() => {
      // Initialize app before each test
      (App as any).app = undefined;
      app = new App();
    });

    it('should add a router to the root namespace', () => {
      const router = new Router();
      app.register(router);
      app.register(router);

      expect(app['routers']['/']).toEqual([router, router]);
    });

    it('should add a service to the root', () => {
      class User extends Service {}
      app.register(User).register(User);

      expect(app['routers']['/']).toEqual([User, User]);
    });

    it('should throw an error for invalid router', () => {
      expect(() => app.register({} as any)).toThrow(AppError);
      expect(() => app.register(123 as any)).toThrow(AppError);
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

  describe('process', () => {
    let app: any;
    let req: any;
    let res: any;

    beforeEach(() => {
      (App as any).app = undefined;
      app = new App();
      app.handler = jest.fn(async () => {});
      req = {
        url: '/',
        method: 'GET',
        getIp: jest.fn(),
        getBase: jest.fn(() => 'http://localhost:2025'),
      };
      res = {
        writableEnded: false,
        end: jest.fn(() => (res.writableEnded = true)),
      };
    });

    it('should execute middlewares for a valid route (Service)', async () => {
      // URL && Method
      req.url = 'http://localhost:3030/users//';
      req.method = 'GET';

      // Global middlewares
      const global1 = jest.fn(async () => {}); // exec
      const global2 = jest.fn(async () => {}); // exec

      // Register Global middlewares
      app.use(global1).use(global2);

      // Local middleware
      const getPosts = jest.fn(async () => res.end());
      const getUsers = jest.fn(async () => res.end()); // exec
      const postUsers = jest.fn(async () => res.end());

      const router = new Router().get('/posts', getPosts);

      const User = class extends Service {
        constructor(req: any, res: any) {
          super(req, res);

          this.get('/users', getUsers); // match and exec getUsers
          this.post('/users', postUsers);
        }
      };

      // Register router/service
      app.register(router).register(User);

      await expect(app.process(req, res)).resolves.toBeUndefined();

      expect(global1).toHaveBeenCalledWith(req, res, undefined);
      expect(global2).toHaveBeenCalledWith(req, res, undefined);
      expect(getUsers).toHaveBeenCalledWith(req, res, undefined);
    });

    it('should execute middlewares for a valid route (Router)', async () => {
      // URL && Method
      req.url = 'http://localhost:3030/posts';
      req.method = 'GET';

      // Global middlewares
      const global1 = jest.fn(async () => {}); // exec
      const global2 = jest.fn(async () => {}); // exec

      // Register Global middlewares
      app.use(global1).use(global2);

      // Local middleware
      const getPosts = jest.fn(async () => res.end()); // exec
      const getUsers = jest.fn(async () => res.end());
      const postUsers = jest.fn(async () => res.end());

      const router = new Router().get('/posts', getPosts);

      const User = class extends Service {
        constructor(req: any, res: any) {
          super(req, res);

          this.get('/users', getUsers); // match and exec getUsers
          this.post('/users', postUsers);
        }
      };

      // Register router/service
      app.register(router).register(User);

      await expect(app.process(req, res)).resolves.toBeUndefined();

      expect(global1).toHaveBeenCalledWith(req, res, undefined);
      expect(global2).toHaveBeenCalledWith(req, res, undefined);
      expect(getPosts).toHaveBeenCalledWith(req, res, undefined);
    });

    it('should execute middlewares for a valid route (Namespace)', async () => {
      // URL && Method
      req.url = 'http://localhost:3030/posts';
      req.method = 'GET';

      // Global middlewares
      const global1 = jest.fn(async () => {}); // exec
      const global2 = jest.fn(async () => {}); // exec

      // Register Global middlewares
      app.use(global1).use(global2);

      // Local middleware
      const getPosts = jest.fn(async () => res.end()); // exec
      const getUsers = jest.fn(async () => res.end());
      const postUsers = jest.fn(async () => res.end());

      const router = new Router().get('/', getPosts);

      const User = class extends Service {
        constructor(req: any, res: any) {
          super(req, res);

          this.get('/', getUsers); // match and exec getUsers
          this.post('/', postUsers);
        }
      };

      // Register router/service
      app.namespace('/posts', router).namespace('/users', User);

      await expect(app.process(req, res)).resolves.toBeUndefined();

      expect(global1).toHaveBeenCalledWith(req, res, undefined);
      expect(global2).toHaveBeenCalledWith(req, res, undefined);
      expect(getPosts).toHaveBeenCalledWith(req, res, undefined);
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

    it('should store multiple query params as array', async () => {
      req.url = '/users?keywords=1&keywords=2';
      req.method = 'GET';

      const getUsers = jest.fn(async function (this: any) {
        const query = this.query; // validation entry
        expect(query.get('keywords')).toEqual(['1', '2']);
        res.end();
      });

      const User = class extends Service {
        constructor(req: any, res: any) {
          super(req, res);
          this.get('/users', getUsers);
        }
      };

      app.register(User);

      await expect(app.process(req, res)).resolves.toBeUndefined();
      expect(getUsers).toHaveBeenCalled();
    });

    it('should store single query param as string', async () => {
      req.url = '/users?keywords=1';
      req.method = 'GET';

      const getUsers = jest.fn(async function (this: any) {
        const query = this.query;
        expect(query.get('keywords')).toBe('1');
        res.end();
      });

      const User = class extends Service {
        constructor(req: any, res: any) {
          super(req, res);
          this.get('/users', getUsers);
        }
      };

      app.register(User);

      await expect(app.process(req, res)).resolves.toBeUndefined();
      expect(getUsers).toHaveBeenCalled();
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

  describe('handler', () => {
    let app: any;
    let req: any;
    let res: any;
    let err: Error;
    let buggerSpy: jest.SpyInstance;

    beforeEach(() => {
      (App as any).app = undefined;
      app = new App();
      app['handlers'] = [];
      err = new Error('test error');

      req = {};
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockResolvedValue(undefined),
        html: jest.fn().mockResolvedValue(undefined),
      };

      buggerSpy = jest.spyOn(helpers, 'bugger').mockImplementation(() => {});
    });

    afterEach(() => {
      buggerSpy.mockRestore();
    });

    it('should execute handlers if no error in dev env', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);
      app['handlers'] = [handler];

      await expect(app['handler'](req, res, err)).resolves.toBeUndefined();

      expect(handler).toHaveBeenCalledWith(req, res, err);
      expect(buggerSpy).toHaveBeenCalledWith(err);
    });

    it('should return JSON response if execute fails and mode is api', async () => {
      app.options.mode = 'api';
      const executeMock = jest
        .spyOn(app, 'execute')
        .mockRejectedValue(new Error('exec fail'));

      await expect(app['handler'](req, res, err)).resolves.toBeUndefined();

      expect(executeMock).toHaveBeenCalled();
      expect(buggerSpy).toHaveBeenCalledTimes(2); // once before, once after fail
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          name: 'ServerError',
          message: 'Ops! Something went wrong.',
        },
      });
    });

    it('should return HTML response if execute fails and mode is web', async () => {
      app.options.mode = 'web';
      const executeMock = jest
        .spyOn(app, 'execute')
        .mockRejectedValue(new Error('exec fail'));

      await expect(app['handler'](req, res, err)).resolves.toBeUndefined();

      expect(executeMock).toHaveBeenCalled();
      expect(buggerSpy).toHaveBeenCalledTimes(2);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.html).toHaveBeenCalledWith(
        expect.stringContaining('<h1>500 | SERVER ERROR</h1>')
      );
    });

    it('should catch final render errors and still resolve', async () => {
      app.options.mode = 'web';
      jest.spyOn(app, 'execute').mockRejectedValue(new Error('fail'));
      res.html = jest.fn().mockRejectedValue(new Error('fail render'));

      await expect(app['handler'](req, res, err)).resolves.toBeUndefined();
      expect(res.html).toHaveBeenCalled();
    });

    it('should catch json render errors and still resolve', async () => {
      app.options.mode = 'api';
      jest.spyOn(app, 'execute').mockRejectedValue(new Error('fail'));
      res.json = jest.fn().mockRejectedValue(new Error('fail render'));

      await expect(app['handler'](req, res, err)).resolves.toBeUndefined();
      expect(res.json).toHaveBeenCalled();
    });
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
      'Missing APP_KEY: execute "node exec mk:env" to generate a new APP_KEY'
    );
  });
});
