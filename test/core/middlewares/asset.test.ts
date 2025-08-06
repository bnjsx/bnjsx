jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs'),
  stat: jest.fn(),
  access: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn((path) => 'fake'),
  createReadStream: jest.fn(),
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

import { EventEmitter } from 'events';
import { asset, ranger } from '../../../src/core';
import { ForbiddenError } from '../../../src/errors';

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
