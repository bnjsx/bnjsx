import { AppOptions, config } from '../../config';
import { isArr, isTrue } from '../../helpers';
import { Request } from '../modules/Request';
import { Response } from '../modules/Response';

/**
 * Sets security-related HTTP headers for the response.
 *
 * @param req - The request object.
 * @param res - The response object.
 *
 * @returns A promise that resolves once the security headers are set.
 */
export function secure(req: Request, res: Response): Promise<void> {
  return new Promise((resolve) => {
    const options = config().loadSync<AppOptions>().security;

    if (options.contentSecurityPolicy) {
      const policy = Object.entries(options.contentSecurityPolicy)
        .map(([key, value]) => {
          key = key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
          if (isTrue(value)) return key;
          if (isArr(value)) return `${key} ${value.join(' ')}`;
          return `${key} ${value}`;
        })
        .join('; ');
      res.setHeader('Content-Security-Policy', policy);
    }

    if (options.strictTransportSecurity) {
      const hsts = [`max-age=${options.strictTransportSecurity.maxAge}`];
      if (options.strictTransportSecurity.preload) hsts.push('preload');
      if (options.strictTransportSecurity.includeSubDomains) {
        hsts.push('includeSubDomains');
      }

      res.setHeader('Strict-Transport-Security', hsts.join('; '));
    }

    if (options.referrerPolicy) {
      res.setHeader('Referrer-Policy', options.referrerPolicy);
    }

    if (options.crossOriginResourcePolicy) {
      res.setHeader(
        'Cross-Origin-Resource-Policy',
        options.crossOriginResourcePolicy
      );
    }

    if (options.crossOriginOpenerPolicy) {
      res.setHeader(
        'Cross-Origin-Opener-Policy',
        options.crossOriginOpenerPolicy
      );
    }

    if (options.crossOriginEmbedderPolicy) {
      res.setHeader(
        'Cross-Origin-Embedder-Policy',
        options.crossOriginEmbedderPolicy
      );
    }

    if (options.originAgentCluster) {
      res.setHeader('Origin-Agent-Cluster', '?1');
    }

    if (options.xContentTypeOptions) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    if (options.xDnsPrefetchControl) {
      res.setHeader('X-DNS-Prefetch-Control', 'off');
    }

    if (options.xDownloadOptions) {
      res.setHeader('X-Download-Options', 'noopen');
    }

    if (options.xFrameOptions) {
      res.setHeader('X-Frame-Options', options.xFrameOptions);
    }

    if (options.xPermittedCrossDomainPolicies) {
      res.setHeader(
        'X-Permitted-Cross-Domain-Policies',
        options.xPermittedCrossDomainPolicies
      );
    }

    if (options.xssProtection) {
      res.setHeader('X-XSS-Protection', '0');
    }

    resolve();
  });
}
