const config = {
  loadSync: jest.fn().mockReturnValue({
    cluster: {
      request: jest.fn(),
    },
    default: 'default',
  }),
};

jest.mock('../../../src/config', () => ({ config: () => config }));
jest.mock('../../../src/core/modules/Builder');

import { Controller, ControllerError } from '../../../src/core';
import { Builder } from '../../../src/core';

describe('Controller', () => {
  let controller: any = new Controller();

  describe('connection', () => {
    it('should throw an error if the callback is not a function', async () => {
      await expect(controller.connection(null as any)).rejects.toThrow(
        ControllerError
      );
    });

    it('should throw an error if the pool name is not a string', async () => {
      await expect(controller.connection(() => {}, 123 as any)).rejects.toThrow(
        ControllerError
      );
    });

    it('should resolve and release the connection', async () => {
      const connection = { release: jest.fn() };
      const cluster = config.loadSync().cluster;
      cluster.request.mockResolvedValue(connection);

      const result = await controller.connection((conn) => {
        expect(conn).toBe(connection);
        return 'success';
      });

      expect(result).toBe('success');
      expect(connection.release).toHaveBeenCalledTimes(1);
      expect(cluster.request).toHaveBeenCalledWith('default');
    });

    it('should handle async callback', async () => {
      const connection = { release: jest.fn() };
      const cluster = config.loadSync().cluster;
      cluster.request.mockResolvedValue(connection);

      const result = await controller.connection(async (conn) => {
        expect(conn).toBe(connection);
        return 'async success';
      });

      expect(result).toBe('async success');
      expect(connection.release).toHaveBeenCalledTimes(1);
      expect(cluster.request).toHaveBeenCalledWith('default');
    });

    it('should request from the specified pool', async () => {
      const connection = { release: jest.fn() };
      const cluster = config.loadSync().cluster;
      cluster.request.mockResolvedValue(connection);

      const result = await controller.connection((conn) => {
        expect(conn).toBe(connection);
        return 'success';
      }, 'asia');

      expect(result).toBe('success');
      expect(connection.release).toHaveBeenCalledTimes(1);
      expect(cluster.request).toHaveBeenCalledWith('asia');
    });

    it('should reject if callback throws', async () => {
      const connection = { release: jest.fn() };
      config.loadSync().cluster.request.mockResolvedValue(connection);

      await expect(
        controller.connection(() => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    it('should reject if callback rejects', async () => {
      const connection = { release: jest.fn() };
      config.loadSync().cluster.request.mockResolvedValue(connection);

      await expect(
        controller.connection(() => {
          return Promise.reject(new Error('Test error'));
        })
      ).rejects.toThrow('Test error');

      expect(connection.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('builder', () => {
    it('should throw an error if the callback is not a function', async () => {
      await expect(controller.builder(null as any)).rejects.toThrow(
        ControllerError
      );
    });

    it('should throw an error if the pool name is not a string', async () => {
      await expect(controller.builder(() => {}, 123 as any)).rejects.toThrow(
        ControllerError
      );
    });

    it('should resolve and release the connection', async () => {
      const connection = { release: jest.fn() };
      const cluster = config.loadSync().cluster;
      cluster.request.mockResolvedValue(connection);

      const result = await controller.builder((builder) => {
        expect(builder).toBeInstanceOf(Builder);
        return 'success';
      });

      expect(result).toBe('success');
      expect(connection.release).toHaveBeenCalledTimes(1);
      expect(cluster.request).toHaveBeenCalledWith('default');
    });

    it('should handle async callback', async () => {
      const connection = { release: jest.fn() };
      const cluster = config.loadSync().cluster;
      cluster.request.mockResolvedValue(connection);

      const result = await controller.builder(async (builder) => {
        expect(builder).toBeInstanceOf(Builder);
        return 'async success';
      });

      expect(result).toBe('async success');
      expect(connection.release).toHaveBeenCalledTimes(1);
      expect(cluster.request).toHaveBeenCalledWith('default');
    });

    it('should request from the specified pool', async () => {
      const connection = { release: jest.fn() };
      const cluster = config.loadSync().cluster;
      cluster.request.mockResolvedValue(connection);

      const result = await controller.builder((builder) => {
        expect(builder).toBeInstanceOf(Builder);
        return 'success';
      }, 'asia');

      expect(result).toBe('success');
      expect(connection.release).toHaveBeenCalledTimes(1);
      expect(cluster.request).toHaveBeenCalledWith('asia');
    });

    it('should reject if callback throws', async () => {
      const connection = { release: jest.fn() };
      config.loadSync().cluster.request.mockResolvedValue(connection);

      await expect(
        controller.builder(() => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');

      expect(connection.release).toHaveBeenCalledTimes(1);
    });

    it('should reject if callback rejects', async () => {
      const connection = { release: jest.fn() };
      config.loadSync().cluster.request.mockResolvedValue(connection);

      await expect(
        controller.builder(() => {
          return Promise.reject(new Error('Test error'));
        })
      ).rejects.toThrow('Test error');

      expect(connection.release).toHaveBeenCalledTimes(1);
    });
  });
});
