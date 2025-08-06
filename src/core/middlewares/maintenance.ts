import { access } from 'fs/promises';
import { constants } from 'fs';
import { resolve } from 'path';
import { config } from '../../config';
import { Request } from '../modules/Request';
import { Response } from '../modules/Response';
import { isArrOfStr, isBool, isNum, isObj } from '../../helpers';
import { MaintenanceError } from '../../errors';

/**
 * Maintenance mode handler.
 *
 * Checks if the `.maintenance` file exists and conditionally blocks requests.
 * Supports caching with TTL, whitelisted IPs, and route exemptions.
 *
 * Usage:
 * - Place a `.maintenance` file in the app directory to enable maintenance mode.
 * - Use config.maintenance options to configure TTL, allowed IPs, and exempt routes.
 *
 * Available config options:
 * - `ttl` (seconds): Cache maintenance status for this duration.
 * - `ips` (string[]): Allowlisted client IPs.
 * - `routes` (string[]): Route prefixes to exempt from maintenance.
 */
export class Maintenance {
  private static instance: Maintenance;
  private path: string;
  private expiresAt: number;
  private maintenanceOn: boolean;
  private ttl: number | null;
  private ips: string[];
  private routes: string[];

  /**
   * Called automatically before the first request check.
   */
  constructor() {
    if (Maintenance.instance) return Maintenance.instance;

    const app = config().loadSync();

    if (!isObj(app.maintenance)) app.maintenance = {};

    const { ttl, ips, routes } = app.maintenance;

    this.ttl = isNum(ttl) && ttl > 0 ? ttl * 1000 : null;
    this.ips = isArrOfStr(ips) ? ips : [];
    this.routes = isArrOfStr(routes) ? routes : [];
    this.path = resolve(config().resolveSync(), '.maintenance');
    this.expiresAt = undefined;
    this.maintenanceOn = undefined;

    Maintenance.instance = this;
  }

  /**
   * Checks if the application is in maintenance mode.
   *
   * If `ttl` is set, result is cached for performance.
   * Otherwise, it checks the existence of the `.maintenance` file each time.
   *
   * @returns A boolean indicating whether maintenance mode is active.
   */
  private async isMaintenanceOn(): Promise<boolean> {
    // No cache
    if (this.ttl === null) {
      try {
        await access(this.path, constants.F_OK);
        return true;
      } catch {
        return false;
      }
    }

    // Use cache
    if (isBool(this.maintenanceOn)) {
      if (this.expiresAt > Date.now()) return this.maintenanceOn;
    }

    try {
      await access(this.path, constants.F_OK);
      this.expiresAt = Date.now() + this.ttl;
      this.maintenanceOn = true;
      return true;
    } catch {
      this.expiresAt = Date.now() + this.ttl;
      this.maintenanceOn = false;
      return false;
    }
  }

  /**
   * Checks if the given IP address is in the allowlist.
   *
   * @param ip - The client IP address.
   * @returns True if the IP is allowed during maintenance.
   */

  private ipAllowed(ip: string): boolean {
    return this.ips.includes(ip);
  }

  /**
   * Checks if the given route path is allowed.
   *
   * Matches based on route prefix.
   *
   * @param route - The request path.
   * @returns True if the route is allowed during maintenance.
   */
  private routeAllowed(route: string): boolean {
    return this.routes.some((prefix) => route.startsWith(prefix));
  }

  /**
   * Blocks requests when maintenance mode is active.
   *
   * If the `.maintenance` file exists and the request is not from an allowed IP or route,
   * it sets `Retry-After` and `Cache-Control` headers, then throws a `MaintenanceError`.
   *
   * @param req - The incoming request object.
   * @param res - The response object.
   * @throws MaintenanceError - If maintenance mode is active and the request is not allowed.
   */
  public middleware = async (req: Request, res: Response): Promise<void> => {
    const maintenanceOn = await this.isMaintenanceOn();
    if (!maintenanceOn) return;

    if (!this.ipAllowed(req.ip) && !this.routeAllowed(req.path)) {
      res.setHeader('Retry-After', 3600);
      res.setHeader('Cache-Control', 'no-store');
      throw new MaintenanceError();
    }
  };
}

/**
 * Maintenance mode middleware.
 *
 * This middleware checks for the presence of a `.maintenance` file to determine
 * if the application is in maintenance mode. When active, it blocks incoming requests
 * unless the request IP or path matches an allowed list.
 *
 * Allowed IPs and route prefixes can be configured in `bnjsx.config.js` under:
 *
 * ```js
 * maintenance: {
 *   ttl: 60,            // Cache duration in seconds (recommended: 20–60 for performance)
 *   ips: ['::1'],       // IP addresses allowed during maintenance
 *   routes: ['/admin']  // Route prefixes allowed during maintenance
 * }
 * ```
 *
 * To improve performance, the middleware caches the `.maintenance` file check using `ttl`.
 * While the cache is valid, it avoids accessing the file system.
 *
 * When blocking a request, it sets:
 * - `Retry-After: 3600`
 * - `Cache-Control: no-store`
 * and throws a `MaintenanceError`.
 *
 * @param req - The incoming request.
 * @param res - The response object.
 * @throws MaintenanceError - If maintenance mode is active and request is not allowed.
 */
export function maintenance(req: Request, res: Response): Promise<void> {
  return new Maintenance().middleware(req, res);
}
