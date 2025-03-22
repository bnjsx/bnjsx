import { config } from '../../src/config';
import { Cluster } from '../../src/core';

const mock = jest.fn();
jest.doMock('root\\bnjsx.config.js', mock, { virtual: true });

describe('loadSync()', () => {
  let loader: any = config();

  beforeEach(() => {
    jest.resetModules(); // Clears the Jest module cache
    loader.resolveSync = jest.fn().mockReturnValue('root');
    loader.config = undefined;
    mock.mockReset();
  });

  it('should resolve with a valid configuration', () => {
    mock.mockReturnValue({ default: 'default_pool', cluster: new Cluster() });

    const config = loader.loadSync();

    // Required
    expect(config.default).toBe('default_pool');
    expect(config.cluster).toBeInstanceOf(Cluster);

    // Optional
    expect(config.paths.models).toBe('models');
    expect(config.paths.seeders).toBe('seeders');
    expect(config.paths.commands).toBe('commands');
    expect(config.paths.generators).toBe('generators');
    expect(config.paths.views).toBe('views');
    expect(config.typescript.enabled).toBe(false);
    expect(config.typescript.src).toBe('src');
    expect(config.typescript.dist).toBe('dist');
    expect(config.tools).toEqual({});
    expect(config.globals).toEqual({});
  });

  it('should reject with an error if the configuration is not an object', () => {
    mock.mockReturnValue('invalid_config'); // Return something other than an object.

    // Test validation
    expect(() => loader.loadSync()).toThrow(
      'Invalid config: Expected an object but received string.'
    );
  });

  it('should reject with an error if the cluster is invalid', () => {
    mock.mockReturnValue({
      default: 'default_pool',
      cluster: {}, // Invalid cluster.
    });

    // Test validation
    expect(() => loader.loadSync()).toThrow(
      `Invalid cluster: Expected a 'Cluster' instance but received object.`
    );
  });

  it('should reject with an error if the default pool name is invalid', () => {
    mock.mockReturnValue({
      default: 123, // Invalid default pool name (not a string).
      cluster: new Cluster(),
    });

    // Test validation
    expect(() => loader.loadSync()).toThrow(
      'Invalid pool: Expected a valid pool name but received number.'
    );
  });

  it('should reject with an error if globals is not an object', () => {
    mock.mockReturnValue({
      default: 'default pool',
      cluster: new Cluster(),
      globals: 'invalid value', // Invalid globals (not an object).
    });

    // Test validation
    expect(() => loader.loadSync()).toThrow(
      `Invalid globals: Expected an object but received string.`
    );
  });

  it('should reject with an error if tools is not an object', () => {
    mock.mockReturnValue({
      default: 'default pool',
      cluster: new Cluster(),
      tools: 'invalid value', // Invalid tools (not an object).
    });

    // Test validation
    expect(() => loader.loadSync()).toThrow(
      `Invalid tools: Expected an object but received string.`
    );
  });

  describe('public config', () => {
    it('should set default values if public is missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
      });

      const config = loader.loadSync();

      expect(config.public).toBeDefined();
      expect(config.public.root).toBe('public');
      expect(config.public.gzip).toBe(false);
      expect(config.public.cache).toBe(3600);
    });

    it('should apply default values if public properties are invalid', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        public: {
          root: 123, // Invalid type
          gzip: 'yes', // Invalid type
          cache: 'invalid', // Invalid type
        },
      });

      const config = loader.loadSync();

      expect(config.public.root).toBe('public'); // Reset to default
      expect(config.public.gzip).toBe(false); // Reset to default
      expect(config.public.cache).toBe(3600); // Reset to default
    });

    it('should preserve valid public properties', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        public: {
          root: 'assets',
          gzip: true,
          cache: 7200,
        },
      });

      const config = loader.loadSync();

      expect(config.public.root).toBe('assets');
      expect(config.public.gzip).toBe(true);
      expect(config.public.cache).toBe(7200);
    });
  });

  describe('CORS configuration', () => {
    const methods = [
      'GET',
      'POST',
      'PUT',
      'DELETE',
      'PATCH',
      'OPTIONS',
      'HEAD',
    ];

    it('should set default CORS values if missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
      });

      const config = loader.loadSync();

      expect(config.cors).toBeDefined();
      expect(config.cors.methods).toEqual(methods);
      expect(config.cors.origin).toBe('*');
      expect(config.cors.credentials).toBe(false);
      expect(config.cors.headers).toBeUndefined();
      expect(config.cors.expose).toBeUndefined();
      expect(config.cors.maxAge).toBe(86400);
    });

    it('should apply defaults for missing CORS properties', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        cors: {},
      });

      const config = loader.loadSync();

      expect(config.cors.methods).toEqual(methods);
      expect(config.cors.origin).toBe('*');
      expect(config.cors.credentials).toBe(false);
      expect(config.cors.headers).toBeUndefined();
      expect(config.cors.expose).toBeUndefined();
      expect(config.cors.maxAge).toBe(86400);
    });

    it('should preserve valid CORS values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        cors: {
          methods: ['GET', 'POST'],
          origin: ['https://example.com'],
          credentials: true,
          headers: ['Content-Type'],
          expose: ['Authorization'],
          maxAge: 3600,
        },
      });

      const config = loader.loadSync();

      expect(config.cors.methods).toEqual(['GET', 'POST']);
      expect(config.cors.origin).toEqual(['https://example.com']);
      expect(config.cors.credentials).toBe(true);
      expect(config.cors.headers).toEqual(['Content-Type']);
      expect(config.cors.expose).toEqual(['Authorization']);
      expect(config.cors.maxAge).toBe(3600);
    });

    it('should reject invalid CORS origin', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        cors: { origin: 123 }, // Invalid type
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'origin': Expected a string, array of strings, or function.`
      );
    });

    it('should reject invalid CORS methods', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        cors: { methods: ['INVALID'] }, // Invalid method
      });

      expect(() => loader.loadSync()).toThrow(`Invalid cors methods`);
    });

    it('should reject invalid CORS headers', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        cors: { headers: 123 }, // Invalid type
      });

      expect(() => loader.loadSync()).toThrow(`Invalid cors headers`);
    });

    it('should reject invalid CORS expose', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        cors: { expose: 456 }, // Invalid type
      });

      expect(() => loader.loadSync()).toThrow(`Invalid cors expose`);
    });

    it('should reject wildcard origin with credentials enabled', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        cors: { origin: '*', credentials: true },
      });

      expect(() => loader.loadSync()).toThrow(
        `Cannot use wildcard origin (*) with credentials (true).`
      );
    });

    it('should reject non-object CORS config', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        cors: 'invalid', // Invalid type
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'cors': Expected an object but received string.`
      );
    });
  });

  describe('security config', () => {
    it('should set default security values when undefined', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: undefined, // No security settings provided.
      });

      const config = loader.loadSync();

      expect(config.security).toEqual({
        contentSecurityPolicy: {
          defaultSrc: "'self'",
          baseUri: "'self'",
          fontSrc: "'self' https: data:",
          formAction: "'self'",
          frameAncestors: "'self'",
          imgSrc: "'self' data:",
          objectSrc: "'none'",
          scriptSrc: "'self'",
          scriptSrcAttr: "'none'",
          styleSrc: "'self' https: 'unsafe-inline'",
          upgradeInsecureRequests: true,
        },
        strictTransportSecurity: {
          maxAge: 15552000,
          includeSubDomains: true,
          preload: false,
        },
        referrerPolicy: 'origin',
        crossOriginOpenerPolicy: 'same-origin',
        crossOriginResourcePolicy: 'same-origin',
        crossOriginEmbedderPolicy: false,
        originAgentCluster: true,
        xContentTypeOptions: true,
        xDnsPrefetchControl: true,
        xDownloadOptions: true,
        xssProtection: true,
        xFrameOptions: 'SAMEORIGIN',
        xPermittedCrossDomainPolicies: 'none',
      });
    });
  });

  describe('contentSecurityPolicy', () => {
    it('should set default values if contentSecurityPolicy is missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });

      const config = loader.loadSync();
      expect(config.security.contentSecurityPolicy).toBeDefined();
      expect(config.security.contentSecurityPolicy).toEqual({
        defaultSrc: "'self'",
        baseUri: "'self'",
        fontSrc: "'self' https: data:",
        formAction: "'self'",
        frameAncestors: "'self'",
        imgSrc: "'self' data:",
        objectSrc: "'none'",
        scriptSrc: "'self'",
        scriptSrcAttr: "'none'",
        styleSrc: "'self' https: 'unsafe-inline'",
        upgradeInsecureRequests: true,
      });
    });

    it('should apply default values for missing CSP properties', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { contentSecurityPolicy: {} },
      });

      const config = loader.loadSync();
      expect(config.security.contentSecurityPolicy).toEqual({
        defaultSrc: "'self'",
        baseUri: "'self'",
        fontSrc: "'self' https: data:",
        formAction: "'self'",
        frameAncestors: "'self'",
        imgSrc: "'self' data:",
        objectSrc: "'none'",
        scriptSrc: "'self'",
        scriptSrcAttr: "'none'",
        styleSrc: "'self' https: 'unsafe-inline'",
        upgradeInsecureRequests: true,
      });
    });

    it('should preserve valid CSP values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {
          contentSecurityPolicy: {
            defaultSrc: "'none'",
            scriptSrc: ["'self'", 'https://example.com'],
            upgradeInsecureRequests: false,
          },
        },
      });

      const config = loader.loadSync();
      expect(config.security.contentSecurityPolicy.defaultSrc).toBe("'none'");
      expect(config.security.contentSecurityPolicy.scriptSrc).toEqual([
        "'self'",
        'https://example.com',
      ]);
      expect(
        config.security.contentSecurityPolicy.upgradeInsecureRequests
      ).toBe(false);
    });

    it('should reject invalid boolean options', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {
          contentSecurityPolicy: {
            upgradeInsecureRequests: 'true', // Invalid type
          },
        },
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'upgradeInsecureRequests': Expected a boolean but received string.`
      );
    });

    it('should reject invalid CSP directive values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {
          contentSecurityPolicy: {
            scriptSrc: 123, // Invalid type
          },
        },
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'scriptSrc': Expected a string or array of strings but received number.`
      );
    });

    it('should reject non-object contentSecurityPolicy config', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {
          contentSecurityPolicy: 'invalid', // Invalid type
        },
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid content security policy: Expected an object but received string.`
      );
    });
  });

  describe('strictTransportSecurity', () => {
    const defaultHSTS = {
      maxAge: 15552000,
      includeSubDomains: true,
      preload: false,
    };

    it('should set default HSTS values if missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });

      const config = loader.loadSync();
      expect(config.security.strictTransportSecurity).toEqual(defaultHSTS);
    });

    it('should apply default values for missing HSTS properties', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { strictTransportSecurity: {} },
      });

      const config = loader.loadSync();
      expect(config.security.strictTransportSecurity).toEqual(defaultHSTS);
    });

    it('should preserve valid HSTS values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {
          strictTransportSecurity: {
            maxAge: 31536000,
            includeSubDomains: false,
            preload: true,
          },
        },
      });

      const config = loader.loadSync();
      expect(config.security.strictTransportSecurity).toEqual({
        maxAge: 31536000,
        includeSubDomains: false,
        preload: true,
      });
    });

    it('should reject invalid maxAge type', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {
          strictTransportSecurity: { maxAge: 'invalid' },
        },
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'maxAge': Expected a integer but received string.`
      );
    });

    it('should reject invalid includeSubDomains type', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {
          strictTransportSecurity: { includeSubDomains: 'true' },
        },
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'includeSubDomains': Expected a boolean but received string.`
      );
    });

    it('should reject invalid preload type', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {
          strictTransportSecurity: { preload: 'false' },
        },
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'preload': Expected a boolean but received string.`
      );
    });

    it('should allow strictTransportSecurity to be false', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { strictTransportSecurity: false },
      });

      const config = loader.loadSync();
      expect(config.security.strictTransportSecurity).toBe(false);
    });

    it('should reject non-object strictTransportSecurity values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { strictTransportSecurity: 'invalid' },
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'strictTransportSecurity': Expected an object but received string.`
      );
    });
  });

  describe('referrerPolicy', () => {
    it('should set default referrerPolicy to "origin" if missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });

      const config = loader.loadSync();
      expect(config.security.referrerPolicy).toBe('origin');
    });

    it('should reject invalid referrerPolicy values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { referrerPolicy: 'invalid-policy' },
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'referrerPolicy': Expected a valid referrer policy but received 'invalid-policy'.`
      );
    });
  });

  describe('crossOriginResourcePolicy', () => {
    it('should set default crossOriginResourcePolicy to "same-origin" if missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });

      const config = loader.loadSync();
      expect(config.security.crossOriginResourcePolicy).toBe('same-origin');
    });

    it('should reject invalid crossOriginResourcePolicy values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { crossOriginResourcePolicy: 'invalid-policy' },
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'crossOriginResourcePolicy': Expected a valid cross origin resource policy but received 'invalid-policy'.`
      );
    });
  });

  describe('crossOriginOpenerPolicy', () => {
    it('should set default crossOriginOpenerPolicy to "same-origin" if missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });

      const config = loader.loadSync();
      expect(config.security.crossOriginOpenerPolicy).toBe('same-origin');
    });

    it('should reject invalid crossOriginOpenerPolicy values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { crossOriginOpenerPolicy: 'invalid-policy' },
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'crossOriginOpenerPolicy': Expected a valid cross origin opener policy but received 'invalid-policy'.`
      );
    });
  });

  describe('crossOriginEmbedderPolicy', () => {
    it('should set default crossOriginEmbedderPolicy to false if missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });

      const config = loader.loadSync();
      expect(config.security.crossOriginEmbedderPolicy).toBe(false);
    });

    it('should reject invalid crossOriginEmbedderPolicy values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { crossOriginEmbedderPolicy: 'invalid-policy' },
      });

      expect(() => loader.loadSync()).toThrow(
        `Invalid option 'crossOriginEmbedderPolicy': Expected a valid cross origin embedder policy but received 'invalid-policy'.`
      );
    });
  });

  describe('originAgentCluster', () => {
    it('should set default originAgentCluster to true if missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });
      const config = loader.loadSync();
      expect(config.security.originAgentCluster).toBe(true);
    });

    it('should reject invalid originAgentCluster values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { originAgentCluster: 'invalid' },
      });
      expect(() => loader.loadSync()).toThrow(
        "Invalid option 'originAgentCluster': Expected boolean but received string."
      );
    });
  });

  describe('xContentTypeOptions', () => {
    it('should set default xContentTypeOptions to true if missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });
      const config = loader.loadSync();
      expect(config.security.xContentTypeOptions).toBe(true);
    });

    it('should reject invalid xContentTypeOptions values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { xContentTypeOptions: 'invalid' },
      });
      expect(() => loader.loadSync()).toThrow(
        "Invalid option 'xContentTypeOptions': Expected boolean but received string."
      );
    });
  });

  describe('xDnsPrefetchControl', () => {
    it('should set default xDnsPrefetchControl to true if missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });
      const config = loader.loadSync();
      expect(config.security.xDnsPrefetchControl).toBe(true);
    });

    it('should reject invalid xDnsPrefetchControl values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { xDnsPrefetchControl: 'invalid' },
      });
      expect(() => loader.loadSync()).toThrow(
        "Invalid option 'xDnsPrefetchControl': Expected boolean but received string."
      );
    });
  });

  describe('xDownloadOptions', () => {
    it('should set default xDownloadOptions to true if missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });
      const config = loader.loadSync();
      expect(config.security.xDownloadOptions).toBe(true);
    });

    it('should reject invalid xDownloadOptions values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { xDownloadOptions: 'invalid' },
      });
      expect(() => loader.loadSync()).toThrow(
        "Invalid option 'xDownloadOptions': Expected boolean but received string."
      );
    });
  });

  describe('xssProtection', () => {
    it('should set default xssProtection to true if missing', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });
      const config = loader.loadSync();
      expect(config.security.xssProtection).toBe(true);
    });

    it('should reject invalid xssProtection values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { xssProtection: 'invalid' },
      });
      expect(() => loader.loadSync()).toThrow(
        "Invalid option 'xssProtection': Expected boolean but received string."
      );
    });
  });

  describe('xFrameOptions', () => {
    it("should set default xFrameOptions to 'SAMEORIGIN' if missing", () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });
      const config = loader.loadSync();
      expect(config.security.xFrameOptions).toBe('SAMEORIGIN');
    });

    it('should reject invalid xFrameOptions values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { xFrameOptions: 'invalid' },
      });
      expect(() => loader.loadSync()).toThrow(
        "Invalid option 'xFrameOptions': Expected 'SAMEORIGIN' or 'DENY' but received 'invalid'."
      );
    });
  });

  describe('xPermittedCrossDomainPolicies', () => {
    it("should set default xPermittedCrossDomainPolicies to 'none' if missing", () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: {},
      });
      const config = loader.loadSync();
      expect(config.security.xPermittedCrossDomainPolicies).toBe('none');
    });

    it('should reject invalid xPermittedCrossDomainPolicies values', () => {
      mock.mockReturnValue({
        default: 'default_pool',
        cluster: new Cluster(),
        security: { xPermittedCrossDomainPolicies: 'invalid' },
      });
      expect(() => loader.loadSync()).toThrow(
        "Invalid option 'xPermittedCrossDomainPolicies': Expected 'none' or 'master-only' or 'by-content-type' or 'all' but received 'invalid'."
      );
    });
  });
});
