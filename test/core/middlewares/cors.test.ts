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

import { OriginFunc } from '../../../src/config';
import { cors, origin } from '../../../src/core/middlewares/cors';
import { ForbiddenError } from '../../../src/errors';

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
