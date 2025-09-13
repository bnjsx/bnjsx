import { Cluster } from '../core/modules/Cluster';
import {
  Config,
  ConfigError,
  escapeHTML,
  base,
  isDefined,
  isSymbol,
  toFloat,
  toLower,
  toLowerAt,
  toTitle,
  toUpper,
  toUpperAt,
  UTC,
  Vite,
  toShort,
  toSnap,
  toSize,
  round,
  floor,
  percent,
  pad,
  comma,
  trim,
  avg,
  fresh,
  map,
  join,
  isFullArr,
  isFullObj,
  isFullStr,
  isNum,
  isFloat,
  botInput,
  csrfInput,
} from '../helpers';
import { isArr, isArrOfStr, isFunc, isInt } from '../helpers';
import { isBool, isObj, isStr, isUndefined } from '../helpers';
import { chrono, diff } from '../helpers/Chrono';
import { lang } from '../helpers/Lang';

/**
 * A function to check if a given origin is acceptable.
 *
 * The function receives the `origin` as a string and returns a boolean value indicating
 * whether the origin is allowed. The function can either be synchronous or asynchronous,
 * allowing flexibility to check databases or external services.
 *
 * @param origin - The origin string (e.g., "https://example.com") to validate.
 * @returns A boolean or a promise that resolves to a boolean indicating whether the origin is acceptable.
 */
export type OriginFunc = (origin: string) => boolean | Promise<boolean>;

/**
 * Defines the set of standard HTTP methods used in request operations.
 * These methods correspond to actions that can be performed on resources
 * through HTTP requests.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods
 */
export type HTTPMethod =
  /**
   * The `GET` method is used to retrieve data from the server. It does not modify any resources.
   */
  | 'GET'

  /**
   * The `POST` method is used to submit data to be processed to a specified resource,
   * often resulting in a change in server state or the creation of a new resource.
   */
  | 'POST'

  /**
   * The `PUT` method is used to update an existing resource with new data,
   * replacing the current representation of the resource.
   */
  | 'PUT'

  /**
   * The `DELETE` method is used to remove a resource from the server.
   */
  | 'DELETE'

  /**
   * The `PATCH` method is used to apply partial updates to a resource, modifying only the provided data.
   */
  | 'PATCH'

  /**
   * The `OPTIONS` method is used to retrieve the allowed HTTP methods for a specific resource.
   * This can be used for CORS requests or discovering the capabilities of a server.
   */
  | 'OPTIONS'

  /**
   * The `HEAD` method is similar to `GET`, but it only retrieves the headers of the response,
   * not the body content.
   */
  | 'HEAD';

/**
 * Configuration options for the `Strict-Transport-Security` (HSTS) header.
 * This header enforces HTTPS connections to the server and helps protect against man-in-the-middle attacks.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
 */
type HSTS = {
  /**
   * The `max-age` directive specifies the time (in seconds) that the browser should enforce HTTPS connections
   * to the server. This is a required field.
   */
  maxAge: number;

  /**
   * The `includeSubDomains` directive, if set to true, applies the HSTS policy to all subdomains of the site.
   * This is optional, and the default is false (i.e., subdomains are not included).
   */
  includeSubDomains?: boolean;

  /**
   * The `preload` directive, if set to true, requests that the domain be included in the browser's HSTS preload list,
   * making the browser automatically enforce HTTPS for the domain even on the first visit.
   * This is optional.
   */
  preload?: boolean;
};

/**
 * TypeScript-specific configuration options.
 */
export interface TypeScript {
  /**
   * Indicates whether TypeScript is used.
   */
  enabled: boolean;

  /**
   * Name of the source folder for TypeScript files.
   * default folder name is `src`.
   */
  src?: string;

  /**
   * Name of the distribution folder for compiled files.
   * default folder name is `dist`.
   */
  dist?: string;
}

/**
 * Defines folder paths used in your `Bnjsx` project.
 */
export interface Paths {
  /**
   * Path to the generator files folder.
   * default name is `generators`.
   */
  generators?: string;

  /**
   * Path to the seeder files folder.
   * default folder name is `seeders`.
   */
  seeders?: string;

  /**
   * Path to the model files folder.
   * default folder name is `models`.
   */
  models?: string;

  /**
   * Path to the command files folder.
   * default folder name is `commands`.
   */
  commands?: string;

  /**
   * Path to the view files folder.
   * default folder name is `views`.
   */
  views?: string;
}

/**
 * CORS-specific configuration options.
 */
export interface CORS {
  /**
   * Specifies the allowed origins for CORS requests.
   * - `'*'` allows all origins.
   * - An array of strings allows only specific origins.
   * - A function can be used to determine allowed origins dynamically.
   */
  origin?: Array<string> | OriginFunc | '*';

  /**
   * Specifies the allowed HTTP methods for CORS requests.
   * Defaults to `GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`, `HEAD`.
   */
  methods?: Array<HTTPMethod>;

  /**
   * Indicates whether the browser should include credentials.
   * Defaults to `true`.
   */
  credentials?: boolean;

  /**
   * Specifies the allowed headers in the request.
   */
  headers?: Array<string>;

  /**
   * Specifies which headers are exposed to the browser.
   */
  expose?: Array<string>;

  /**
   * Specifies how long (in seconds) the results of a preflight request can be cached.
   */
  maxAge?: number;
}

/**
 * CSP-specific configuration options.
 */
export interface CSP {
  /**
   * Fallback for other directives if not explicitly specified.
   * Example: `'self'`, `'none'`, `https:`, or specific origins.
   **/
  defaultSrc?: string | string[];

  /**
   * Restricts the URLs that can be used in the `<base>` tag.
   * Example: `'self'`, `'none'`, or specific origins.
   **/
  baseUri?: string | string[];

  /**
   * Specifies valid sources for fonts.
   * Example: `'self'`, `https:`, `data:`, or specific origins.
   **/
  fontSrc?: string | string[];

  /**
   * Restricts where forms can be submitted.
   * Example: `'self'`, `'none'`, or specific origins.
   **/
  formAction?: string | string[];

  /**
   * Prevents the page from being embedded in an `<iframe>` by other origins.
   * Example: `'self'`, `'none'`, or specific origins.
   **/
  frameAncestors?: string | string[];

  /**
   * Specifies valid sources for images.
   * Example: `'self'`, `data:`, `https:`, or specific origins.
   **/
  imgSrc?: string | string[];

  /**
   * Disallows loading of plugins (e.g., Flash, Java applets).
   * Example: `'none'`, `'self'`, or specific origins.
   **/
  objectSrc?: string | string[];

  /**
   * Specifies valid sources for JavaScript.
   * Example: `'self'`, `'unsafe-inline'`, `'unsafe-eval'`, or specific origins.
   **/
  scriptSrc?: string | string[];

  /**
   * Prevents the use of inline event handlers (e.g., `onclick="..."`).
   * Example: `'none'`, `'self'`, or specific origins.
   **/
  scriptSrcAttr?: string | string[];

  /**
   * Specifies valid sources for stylesheets.
   * Example: `'self'`, `'unsafe-inline'`, `https:`, or specific origins.
   **/
  styleSrc?: string | string[];

  /**
   * Specifies valid sources for workers and nested browsing contexts.
   * Example: `'self'`, `'none'`, or specific origins.
   **/
  workerSrc?: string | string[];

  /**
   * Specifies valid sources for media (audio, video, etc.).
   * Example: `'self'`, `https:`, or specific origins.
   **/
  mediaSrc?: string | string[];

  /**
   * Specifies valid sources for WebSocket connections.
   * Example: `'self'`, `wss:`, or specific origins.
   **/
  connectSrc?: string | string[];

  /**
   * Specifies valid sources for frames.
   * Example: `'self'`, `https:`, or specific origins.
   **/
  frameSrc?: string | string[];

  /**
   * Specifies valid sources for manifest files.
   * Example: `'self'`, `https:`, or specific origins.
   **/
  manifestSrc?: string | string[];

  /**
   * Specifies valid sources for prefetch and prerender requests.
   * Example: `'self'`, `https:`, or specific origins.
   **/
  prefetchSrc?: string | string[];

  /**
   * Allows the use of WebAssembly with `unsafe-eval`.
   * Set to `true` to enable.
   **/
  wasmUnsafeEval?: boolean;

  /**
   * Instructs the browser to upgrade HTTP requests to HTTPS.
   * Set to `true` to enable.
   **/
  upgradeInsecureRequests?: boolean;

  /**
   * Enables the use of the `sandbox` attribute for iframes.
   * Example: `'allow-scripts'`, `'allow-forms'`, or a combination of sandbox flags.
   **/
  sandbox?: string | string[];

  /**
   * Specifies valid MIME types for plugins.
   * Example: `'application/pdf'`, `'application/x-shockwave-flash'`.
   **/
  pluginTypes?: string | string[];

  /**
   * Specifies a URI for reporting CSP violations.
   * Example: `'/csp-report-endpoint'`.
   **/
  reportUri?: string | string[];

  /**
   * Specifies a reporting group for CSP violations (used with the `Report-To` header).
   * Example: `'csp-endpoint'`.
   **/
  reportTo?: string | string[];

  /**
   * Enables strict CSP mode by requiring trusted types for DOM XSS protection.
   * Example: `'script'`.
   **/
  requireTrustedTypesFor?: string | string[];

  /**
   * Specifies trusted types for DOM XSS protection.
   * Example: `'default'`, `'my-policy'`.
   **/
  trustedTypes?: string | string[];
}

/**
 * Configuration options for security-related HTTP headers.
 *
 * These options define various HTTP headers to enhance the security of your application
 * by mitigating common attacks like XSS, clickjacking, and ensuring secure communications.
 */
export interface Security {
  /**
   * Controls the Content Security Policy (CSP) to restrict the resources (scripts, images, etc.)
   * that can be loaded and executed by the browser.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
   */
  contentSecurityPolicy?: CSP | false;

  /**
   * Enforces HTTPS connections to the server, preventing man-in-the-middle attacks.
   * `max-age` defines the duration (in seconds) to force HTTPS.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security
   */
  strictTransportSecurity?: HSTS | false;

  /**
   * Specifies the referrer information that the browser includes with requests.
   * Can limit what referrer data is sent, enhancing user privacy.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
   */
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url'
    | false;

  /**
   * Defines the Cross-Origin Resource Policy (CORP) for the application.
   * Controls which origins are allowed to access resources from your server.
   *
   * - `same-origin`: Only same-origin requests are allowed.
   * - `same-site`: Requests from the same site (including subdomains) are allowed.
   * - `false`: Disables the Cross-Origin Resource Policy, allowing any origin to request resources.
   */
  crossOriginResourcePolicy:
    | 'same-origin'
    | 'same-site'
    | 'cross-origin'
    | false;

  /**
   * Defines the Cross-Origin Opener Policy (COOP) for the application.
   * Controls the isolation of your page from cross-origin interactions, especially for window/tab isolation.
   *
   * - `same-origin`: Isolates the page from all other origins.
   * - `same-origin-allow-popups`: Allows popups but isolates the page from other origins.
   * - `unsafe-none`: Disables COOP, allowing all origins to interact with the page. Not recommended.
   * - `false`: Disables the Cross-Origin Opener Policy.
   */
  crossOriginOpenerPolicy:
    | 'same-origin'
    | 'same-origin-allow-popups'
    | 'unsafe-none'
    | false;

  /**
   * Specifies the Cross-Origin-Embedder-Policy (COEP) for the response.
   *
   * - `unsafe-none`: No restrictions on cross-origin resource embedding.
   * - `require-corp`: Only embeds resources with a valid CORP header.
   * - `credentialless`: Embeds resources without sending credentials (cookies, auth).
   * - `false`: Disables COEP entirely, no restrictions.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy
   */
  crossOriginEmbedderPolicy?:
    | 'unsafe-none'
    | 'require-corp'
    | 'credentialless'
    | false;

  /**
   * If true, enables "origin-keyed agent clusters" to prevent cross-origin memory leaks.
   * Helps mitigate risks like Spectre.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin-Agent-Cluster
   */
  originAgentCluster?: boolean;

  /**
   * Enables or disables the `X-Content-Type-Options` header to prevent MIME type sniffing
   * and forces browsers to respect the declared content type.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options
   */
  xContentTypeOptions?: boolean;

  /**
   * Controls DNS prefetching, which resolves domain names in the background to speed up browsing.
   * If true, disables DNS prefetching to reduce privacy risks.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control
   */
  xDnsPrefetchControl?: boolean;

  /**
   * If true, prevents automatic opening of downloaded files to avoid potential security risks.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Download-Options
   */
  xDownloadOptions?: boolean;

  /**
   * Enables or disables the `X-XSS-Protection` header to prevent certain types of cross-site scripting attacks.
   * If true, enables the protection, but modern browsers rely on more advanced mechanisms like CSP.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection
   */
  xssProtection?: boolean;

  /**
   * Controls whether your site can be embedded in frames to protect against clickjacking attacks.
   * `DENY` prevents all embedding, while `SAMEORIGIN` only allows embedding within the same origin.
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
   */
  xFrameOptions?: 'DENY' | 'SAMEORIGIN' | false;

  /**
   * Controls whether Flash or Acrobat files can make cross-domain requests to your server.
   * Options include `none` (no cross-domain access), `master-only` (only master policy file),
   * `by-content-type` (based on file content), and `all` (any policy allowed).
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Permitted-Cross-Domain-Policies
   */
  xPermittedCrossDomainPolicies?:
    | 'none'
    | 'master-only'
    | 'by-content-type'
    | 'all'
    | false;
}

/**
 * Options for serving public assets.
 */
export interface Public {
  /**
   * The root directory from which assets are served.
   */
  root?: string;

  /**
   * The number of seconds an asset should be cached.
   */
  cache?: number;

  /**
   * Whether to look for and serve a precompressed `.gz` version of the asset if available.
   */
  gzip?: boolean;
}

/**
 * `Bnjsx` configuration options.
 */
export interface AppOptions {
  /**
   * The environment the app is running in.
   */
  env?: 'dev' | 'pro';

  /**
   * The application mode.
   */
  mode?: 'web' | 'api';

  /**
   * The application endpoint for production (https://example.com).
   */
  base?: string;

  /**
   * The hostname or IP address the server should bind to.
   */
  host?: string;

  /**
   * The port number the server should listen on.
   */
  port?: number;

  /**
   * The protocol used for the server (e.g., 'http' or 'https').
   */
  protocol?: 'http' | 'https';

  /**
   * Enable or disable caching.
   */
  cache?: boolean;

  /**
   * The private key path for HTTPS configuration.
   */
  key?: string;

  /**
   * The certificate path for HTTPS configuration.
   */
  cert?: string;

  /**
   * Configures Cross-Origin Resource Sharing (CORS) settings for the application.
   */
  cors?: CORS;

  /**
   * Configures security settings for the application.
   */
  security?: Security;

  /**
   * The default pool name from which connections will be requested.
   */
  default?: string;

  /**
   * The cluster instance responsible for managing database connections.
   */
  cluster?: Cluster;

  /**
   * Configuration for folder paths used in the project.
   */
  paths?: Paths;

  /**
   * TypeScript configuration.
   */
  typescript?: TypeScript;

  /**
   * Globaly referenced values for your `Flex` components.
   */
  globals?: Record<string, any>;

  /**
   * Globaly referenced functions for your `Flex` components.
   */
  tools?: Record<string, Function>;

  /**
   * Public assets configuration.
   */
  public?: Public;
}

/**
 * `Bnjsx` framework configuration manager
 */
export class Bnjsx extends Config {
  /**
   * The default name of the configuration file.
   */
  protected static file = 'bnjsx.config.js';
}

/**
 * Ensures the configuration is an object before proceeding.
 */
Bnjsx.register((config: AppOptions) => {
  if (!isObj(config)) {
    throw new ConfigError(
      `Invalid config: Expected an object but received ${typeof config}.`
    );
  }

  if (!['dev', 'pro'].includes(config.env)) config.env = 'dev';
  if (!['web', 'api'].includes(config.mode)) config.mode = 'web';
  if (!['http', 'https'].includes(config.protocol)) config.protocol = 'http';
  if (!isStr(config.host)) config.host = 'localhost';
  if (!isInt(config.port)) config.port = 2025;
  if (!isStr(config.key)) config.key = undefined;
  if (!isStr(config.cert)) config.cert = undefined;
  if (!isBool(config.cache)) config.cache = true;

  return config;
});

/**
 * Ensures the `cluster` is an instance of `Cluster`.
 */
Bnjsx.register((config: AppOptions) => {
  if (
    !isObj(config.cluster) ||
    !isSymbol(config.cluster.id) ||
    config.cluster.id.description !== 'Cluster id'
  ) {
    throw new ConfigError(
      `Invalid cluster: Expected a 'Cluster' instance but received ${typeof config.cluster}.`
    );
  }

  return config;
});

/**
 * Ensures the `default` is a string.
 */
Bnjsx.register((config: AppOptions) => {
  if (!isStr(config.default)) {
    throw new ConfigError(
      `Invalid pool: Expected a valid pool name but received ${typeof config.default}.`
    );
  }

  return config;
});

/**
 * Set default values for `paths`.
 */
Bnjsx.register((config: AppOptions) => {
  if (!isObj(config.paths)) config.paths = {};
  if (!isStr(config.paths.models)) config.paths.models = 'models';
  if (!isStr(config.paths.seeders)) config.paths.seeders = 'seeders';
  if (!isStr(config.paths.commands)) config.paths.commands = 'commands';
  if (!isStr(config.paths.generators)) config.paths.generators = 'generators';
  if (!isStr(config.paths.views)) config.paths.views = 'views';

  return config;
});

/**
 * Set default values for `typescript`.
 */
Bnjsx.register((config: AppOptions) => {
  if (!isObj(config.typescript)) config.typescript = {} as any;
  if (!isBool(config.typescript.enabled)) config.typescript.enabled = false;
  if (!isStr(config.typescript.src)) config.typescript.src = 'src';
  if (!isStr(config.typescript.dist)) config.typescript.dist = 'dist';

  return config;
});

/**
 * Set default values for `tools`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.tools)) config.tools = {};
  else if (!isObj(config.tools)) {
    throw new ConfigError(
      `Invalid tools: Expected an object but received ${typeof config.tools}.`
    );
  }

  config.tools = {
    ...config.tools,
    arr: isFullArr,
    obj: isFullObj,
    str: isFullStr,
    num: isNum,
    int: isInt,
    flo: isFloat,
    bot: botInput,
    csrf: csrfInput,
    map,
    fresh, // check if date is still fresh
    chrono, // formats date to human readable format
    diff, // formats date to human readable format
    round, // round float up 6.6 => 7
    floor, // floor float down 6.6 => 6
    percent, // 33 => "33%"
    pad, // 9 => 09
    comma, // 1000 => 1,000
    trim, // 'hi ' => 'hi'
    join, // [1, 2, 3] => '1, 2, 3'
    avg, // counts avg and returns float 9.0
    lang, // load your locals into the template
    html: escapeHTML, // escapes html
    snap: toSnap, // converts long strings to elipsis version 'hello...'
    shorten: toShort, // formate huge numbers properly like 2100 2.1k
    float: toFloat, // converts anything to a float even 'hello' becomse 0.0
    header: toTitle, // formats string to Title
    size: toSize, // returns readbale bytes size 1MB and so on
    upper: toUpper, // upper case string
    lower: toLower, // lower case string
    upperat: toUpperAt, // upert case case at index
    lowerat: toLowerAt, // lower case char at index
    year: UTC.get.year.bind(UTC), // get current year
    date: UTC.get.date.bind(UTC), // get current date
    time: UTC.get.time.bind(UTC), // get current time
    month: UTC.get.month.bind(UTC), // get current month
    day: UTC.get.day.bind(UTC), // get current day
    hour: UTC.get.hour.bind(UTC), // get current hour
    minute: UTC.get.minute.bind(UTC), // get current min
    second: UTC.get.second.bind(UTC), // get current second
    vite: Vite.assets.bind(Vite), // get vite assets
  };

  return config;
});

/**
 * Set default values for `globals`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.globals)) config.globals = {};
  else if (!isObj(config.globals)) {
    throw new ConfigError(
      `Invalid globals: Expected an object but received ${typeof config.globals}.`
    );
  }

  config.globals = {
    ...config.globals,
    base: isStr(config.base)
      ? config.base
      : base(config.host, config.protocol, config.port),
  };

  return config;
});

/**
 * Set default values for `public`.
 */
Bnjsx.register((config: AppOptions) => {
  if (!isObj(config.public)) config.public = {} as any;
  if (!isStr(config.public.root)) config.public.root = 'public';
  if (!isBool(config.public.gzip)) config.public.gzip = false;
  if (!isInt(config.public.cache)) config.public.cache = 3600;

  return config;
});

/**
 * Set default values for `cors`.
 */
Bnjsx.register((config: AppOptions) => {
  const methods: Array<HTTPMethod> = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'OPTIONS',
    'HEAD',
  ];

  if (isUndefined(config.cors)) {
    config.cors = {
      methods,
      origin: '*',
      credentials: false,
      headers: undefined,
      expose: undefined,
      maxAge: 86400, // Default to 24 hours (in seconds)
    };
  } else if (isObj(config.cors)) {
    // Set defaults for missing properties
    if (!config.cors.methods) config.cors.methods = methods;
    if (!config.cors.origin) config.cors.origin = '*';
    if (!config.cors.headers) config.cors.headers = undefined;
    if (!config.cors.expose) config.cors.expose = undefined;
    if (!isBool(config.cors.credentials)) config.cors.credentials = false;
    if (!isInt(config.cors.maxAge)) config.cors.maxAge = 86400; // Default to 24 hours

    // Validate origin type
    if (
      !isStr(config.cors.origin) &&
      !isArrOfStr(config.cors.origin) &&
      !isFunc(config.cors.origin)
    ) {
      throw new ConfigError(
        `Invalid option 'origin': Expected a string, array of strings, or function.`
      );
    }

    // Validate methods
    if (
      !isArr(config.cors.methods) ||
      !config.cors.methods.every((method) => methods.includes(method))
    ) {
      throw new ConfigError(`Invalid cors methods`);
    }

    if (isDefined(config.cors.headers) && !isArrOfStr(config.cors.headers)) {
      throw new ConfigError(`Invalid cors headers`);
    }

    if (isDefined(config.cors.expose) && !isArrOfStr(config.cors.expose)) {
      throw new ConfigError(`Invalid cors expose`);
    }

    // Ensure wildcard origin is not used with credentials
    if (config.cors.origin === '*' && config.cors.credentials === true) {
      throw new ConfigError(
        `Cannot use wildcard origin (*) with credentials (true).`
      );
    }
  } else {
    throw new ConfigError(
      `Invalid option 'cors': Expected an object but received ${typeof config.cors}.`
    );
  }

  return config;
});

/**
 * Set default values for `security`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.security)) {
    config.security = {
      contentSecurityPolicy: {
        defaultSrc: "'self'",
        baseUri: "'self'",
        fontSrc: "'self' https: data:",
        formAction: "'self'",
        frameAncestors: "'self'",
        imgSrc: "'self' https: data:",
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
    };
  }

  return config;
});

/**
 * Set default values for `contentSecurityPolicy`.
 */
Bnjsx.register((config: AppOptions) => {
  const contentSecurityPolicy = {
    defaultSrc: "'self'",
    baseUri: "'self'",
    fontSrc: "'self' https: data:",
    formAction: "'self'",
    frameAncestors: "'self'",
    imgSrc: "'self' https: data:",
    objectSrc: "'none'",
    scriptSrc: "'self'",
    scriptSrcAttr: "'none'",
    styleSrc: "'self' https: 'unsafe-inline'",
    upgradeInsecureRequests: true,
  };

  if (isUndefined(config.security.contentSecurityPolicy)) {
    config.security.contentSecurityPolicy = contentSecurityPolicy;
  } else if (isObj(config.security.contentSecurityPolicy)) {
    config.security.contentSecurityPolicy = {
      ...contentSecurityPolicy,
      ...config.security.contentSecurityPolicy,
    };

    const entries = Object.entries(config.security.contentSecurityPolicy);
    for (const [key, value] of entries) {
      if (key === 'upgradeInsecureRequests' || key === 'wasmUnsafeEval') {
        if (!isBool(value)) {
          throw new ConfigError(
            `Invalid option '${key}': Expected a boolean but received ${typeof value}.`
          );
        }
      } else {
        if (!isStr(value) && !isArrOfStr(value)) {
          throw new ConfigError(
            `Invalid option '${key}': Expected a string or array of strings but received ${typeof value}.`
          );
        }
      }
    }
  } else if (config.security.contentSecurityPolicy !== false) {
    throw new ConfigError(
      `Invalid content security policy: Expected an object but received ${typeof config
        .security.contentSecurityPolicy}.`
    );
  }

  return config;
});

/**
 * Set default values for `strictTransportSecurity`.
 */
Bnjsx.register((config: AppOptions) => {
  const strictTransportSecurity = {
    maxAge: 15552000,
    includeSubDomains: true,
    preload: false,
  };

  if (isUndefined(config.security.strictTransportSecurity)) {
    config.security.strictTransportSecurity = strictTransportSecurity;
  } else if (isObj(config.security.strictTransportSecurity)) {
    config.security.strictTransportSecurity = {
      ...strictTransportSecurity,
      ...config.security.strictTransportSecurity,
    };

    if (!isInt(config.security.strictTransportSecurity.maxAge)) {
      throw new ConfigError(
        `Invalid option 'maxAge': Expected a integer but received ${typeof config
          .security.strictTransportSecurity.maxAge}.`
      );
    }

    if (!isBool(config.security.strictTransportSecurity.includeSubDomains)) {
      throw new ConfigError(
        `Invalid option 'includeSubDomains': Expected a boolean but received ${typeof config
          .security.strictTransportSecurity.includeSubDomains}.`
      );
    }

    if (!isBool(config.security.strictTransportSecurity.preload)) {
      throw new ConfigError(
        `Invalid option 'preload': Expected a boolean but received ${typeof config
          .security.strictTransportSecurity.preload}.`
      );
    }
  } else if (config.security.strictTransportSecurity !== false) {
    throw new ConfigError(
      `Invalid option 'strictTransportSecurity': Expected an object but received ${typeof config
        .security.strictTransportSecurity}.`
    );
  }

  return config;
});

/**
 * Set default values for `referrerPolicy`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.security.referrerPolicy)) {
    config.security.referrerPolicy = 'origin';
  } else {
    const options = [
      'no-referrer',
      'no-referrer-when-downgrade',
      'origin',
      'origin-when-cross-origin',
      'same-origin',
      'strict-origin',
      'strict-origin-when-cross-origin',
      'unsafe-url',
      false,
    ];

    if (!options.includes(config.security.referrerPolicy)) {
      throw new ConfigError(
        `Invalid option 'referrerPolicy': Expected a valid referrer policy but received '${config.security.referrerPolicy}'.`
      );
    }
  }

  return config;
});

/**
 * Set default values for `crossOriginResourcePolicy`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.security.crossOriginResourcePolicy)) {
    config.security.crossOriginResourcePolicy = 'same-origin';
  } else {
    const options = ['same-origin', 'same-site', 'cross-origin', false];

    if (!options.includes(config.security.crossOriginResourcePolicy)) {
      throw new ConfigError(
        `Invalid option 'crossOriginResourcePolicy': Expected a valid cross origin resource policy but received '${config.security.crossOriginResourcePolicy}'.`
      );
    }
  }

  return config;
});

/**
 * Set default values for `crossOriginOpenerPolicy`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.security.crossOriginOpenerPolicy)) {
    config.security.crossOriginOpenerPolicy = 'same-origin';
  } else {
    const options = [
      'same-origin',
      'same-origin-allow-popups',
      'unsafe-none',
      false,
    ];

    if (!options.includes(config.security.crossOriginOpenerPolicy)) {
      throw new ConfigError(
        `Invalid option 'crossOriginOpenerPolicy': Expected a valid cross origin opener policy but received '${config.security.crossOriginOpenerPolicy}'.`
      );
    }
  }

  return config;
});

/**
 * Set default values for `crossOriginEmbedderPolicy`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.security.crossOriginEmbedderPolicy)) {
    config.security.crossOriginEmbedderPolicy = false;
  } else {
    const options = [false, 'unsafe-none', 'require-corp', 'credentialless'];

    if (!options.includes(config.security.crossOriginEmbedderPolicy)) {
      throw new ConfigError(
        `Invalid option 'crossOriginEmbedderPolicy': Expected a valid cross origin embedder policy but received '${config.security.crossOriginEmbedderPolicy}'.`
      );
    }
  }

  return config;
});

/**
 * Set default values for `originAgentCluster`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.security.originAgentCluster)) {
    config.security.originAgentCluster = true;
  } else if (!isBool(config.security.originAgentCluster)) {
    throw new ConfigError(
      `Invalid option 'originAgentCluster': Expected boolean but received ${typeof config
        .security.originAgentCluster}.`
    );
  }

  return config;
});

/**
 * Set default values for `xContentTypeOptions`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.security.xContentTypeOptions)) {
    config.security.xContentTypeOptions = true;
  } else if (!isBool(config.security.xContentTypeOptions)) {
    throw new ConfigError(
      `Invalid option 'xContentTypeOptions': Expected boolean but received ${typeof config
        .security.xContentTypeOptions}.`
    );
  }

  return config;
});

/**
 * Set default values for `xDnsPrefetchControl`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.security.xDnsPrefetchControl)) {
    config.security.xDnsPrefetchControl = true;
  } else if (!isBool(config.security.xDnsPrefetchControl)) {
    throw new ConfigError(
      `Invalid option 'xDnsPrefetchControl': Expected boolean but received ${typeof config
        .security.xDnsPrefetchControl}.`
    );
  }

  return config;
});

/**
 * Set default values for `xDownloadOptions`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.security.xDownloadOptions)) {
    config.security.xDownloadOptions = true;
  } else if (!isBool(config.security.xDownloadOptions)) {
    throw new ConfigError(
      `Invalid option 'xDownloadOptions': Expected boolean but received ${typeof config
        .security.xDownloadOptions}.`
    );
  }

  return config;
});

/**
 * Set default values for `xssProtection`.
 */
Bnjsx.register((config: AppOptions) => {
  if (isUndefined(config.security.xssProtection)) {
    config.security.xssProtection = true;
  } else if (!isBool(config.security.xssProtection)) {
    throw new ConfigError(
      `Invalid option 'xssProtection': Expected boolean but received ${typeof config
        .security.xssProtection}.`
    );
  }

  return config;
});

/**
 * Set default values for `xFrameOptions`.
 */
Bnjsx.register((config: AppOptions) => {
  const options = ['SAMEORIGIN', 'DENY', false];

  if (isUndefined(config.security.xFrameOptions)) {
    config.security.xFrameOptions = 'SAMEORIGIN';
  } else if (!options.includes(config.security.xFrameOptions)) {
    throw new ConfigError(
      `Invalid option 'xFrameOptions': Expected 'SAMEORIGIN' or 'DENY' but received '${config.security.xFrameOptions}'.`
    );
  }

  return config;
});

/**
 * Set default values for `xPermittedCrossDomainPolicies`.
 */
Bnjsx.register((config: AppOptions) => {
  const options = ['none', 'master-only', 'by-content-type', 'all', false];

  if (isUndefined(config.security.xPermittedCrossDomainPolicies)) {
    config.security.xPermittedCrossDomainPolicies = 'none';
  } else if (!options.includes(config.security.xPermittedCrossDomainPolicies)) {
    throw new ConfigError(
      `Invalid option 'xPermittedCrossDomainPolicies': Expected 'none' or 'master-only' or 'by-content-type' or 'all' but received '${config.security.xPermittedCrossDomainPolicies}'.`
    );
  }

  return config;
});

/**
 * Get the framework configuration manager.
 *
 * @returns The configuration manager.
 */
export function config(): typeof Bnjsx {
  return Bnjsx;
}
