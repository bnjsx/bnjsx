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

import { secure } from '../../../src/core';

describe('secure', () => {
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
