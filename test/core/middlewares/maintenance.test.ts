const options: any = {
  maintenance: {
    ttl: 0, // disable caching
    ips: ['127.0.0.1'],
    routes: ['/allowed'],
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

jest.mock('fs/promises');

import fs from 'fs/promises';
import { Maintenance, maintenance } from '../../../src/core/middlewares';
import { MaintenanceError } from '../../../src/errors';

const access = fs.access as jest.Mock;

describe('Maintenancetenance with mocked access', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    Maintenance.instance = undefined;
  });

  it('allows request if maintenance is off', async () => {
    access.mockRejectedValueOnce(
      Object.assign(new Error(), { code: 'ENOENT' })
    );

    const req = { ip: '1.2.3.4', path: '/' } as any;
    const res = { setHeader: jest.fn().mockReturnThis() } as any;

    await expect(maintenance(req, res)).resolves.toBeUndefined();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('blocks request if maintenance is on', async () => {
    access.mockResolvedValueOnce(undefined); // file exists

    const req = { ip: '1.2.3.4', path: '/' } as any;
    const res = { setHeader: jest.fn().mockReturnThis() } as any;

    await expect(maintenance(req, res)).rejects.toThrow(MaintenanceError);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', 3600);
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('allows request if IP is whitelisted when maintenance is on', async () => {
    access.mockResolvedValueOnce(undefined);

    const req = { ip: '127.0.0.1', path: '/' } as any;
    const res = { setHeader: jest.fn().mockReturnThis() } as any;

    await expect(maintenance(req, res)).resolves.toBeUndefined();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('allows request if route is whitelisted when maintenance is on', async () => {
    access.mockResolvedValueOnce(undefined);

    const req = { ip: '9.9.9.9', path: '/allowed/route' } as any;
    const res = { setHeader: jest.fn().mockReturnThis() } as any;

    await expect(maintenance(req, res)).resolves.toBeUndefined();
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('uses default values when no maintenance config found', async () => {
    // config returns no maintenance key
    options.maintenance = null;

    const instance = new Maintenance() as any;

    expect(instance.ttl).toBe(null);
    expect(instance.ips).toEqual([]);
    expect(instance.routes).toEqual([]);
    expect(instance.path).toMatch(/\.maintenance$/);
  });

  describe('cache behavior', () => {
    it('does not cache when ttl=null; always calls access', async () => {
      access.mockRejectedValueOnce(
        Object.assign(new Error(), { code: 'ENOENT' })
      );

      options.maintenance = {
        ttl: null,
        ips: ['127.0.0.1'],
        routes: ['/allowed'],
      };

      const req = { ip: '1.2.3.4', path: '/' } as any;
      const res = { setHeader: jest.fn().mockReturnThis() } as any;

      // First call - no maintenance (ENOENT)
      await expect(maintenance(req, res)).resolves.toBeUndefined();

      expect(access).toHaveBeenCalledTimes(1);

      // Now simulate maintenance file exists
      access.mockResolvedValueOnce(undefined);

      // Second call - maintenance active
      await expect(maintenance(req, res)).rejects.toThrow(MaintenanceError);
      expect(access).toHaveBeenCalledTimes(2);
    });

    it('caches false when file does not exist and cache is enabled', async () => {
      access.mockRejectedValueOnce(
        Object.assign(new Error(), { code: 'ENOENT' })
      );

      options.maintenance = {
        ttl: 10,
        ips: [],
        routes: [],
      };

      const req = { ip: '1.2.3.4', path: '/' } as any;
      const res = { setHeader: jest.fn().mockReturnThis() } as any;

      // First call: file missing, should be cached as false
      await expect(maintenance(req, res)).resolves.toBeUndefined();
      expect(access).toHaveBeenCalledTimes(1);

      // Second call: should use cached `false`, not call access again
      await expect(maintenance(req, res)).resolves.toBeUndefined();
      expect(access).toHaveBeenCalledTimes(1);
    });

    it('caches true when file exists and cache is enabled', async () => {
      access.mockResolvedValueOnce(undefined); // Only once

      options.maintenance = {
        ttl: 10,
        ips: [],
        routes: [],
      };

      const req = { ip: '1.2.3.4', path: '/' } as any;
      const res = { setHeader: jest.fn().mockReturnThis() } as any;

      // First call: should detect maintenance mode
      await expect(maintenance(req, res)).rejects.toThrow(MaintenanceError);
      expect(access).toHaveBeenCalledTimes(1);

      // Second call: should use cache, not call access
      await expect(maintenance(req, res)).rejects.toThrow(MaintenanceError);
      expect(access).toHaveBeenCalledTimes(1); // Still 1
    });
  });
});
