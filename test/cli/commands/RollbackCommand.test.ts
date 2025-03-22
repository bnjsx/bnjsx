import { RollbackCommand } from '../../../src/cli/commands/RollbackCommand';
import { GeneratorHandler } from '../../../src/cli/handlers/GeneratorHandler';
import { config as loader } from '../../../src/config';
import { Cluster } from '../../../src/core';

const con = {
  id: Symbol('PoolConnection'),
} as any;

describe('RollbackCommand', () => {
  describe('exec', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve with a success message', async () => {
      const message = 'Command executed successfully';
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      // Mock dependencies
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(Cluster.prototype, 'request').mockResolvedValue(con);
      jest
        .spyOn(GeneratorHandler.prototype, 'rollback')
        .mockResolvedValue(message);
      jest.spyOn(RollbackCommand, 'success').mockReturnValue(undefined);

      // Execute the method
      const result = await RollbackCommand.exec();

      // Assertions
      expect(result).toBeUndefined();
      expect(loader().load).toHaveBeenCalledWith();
      expect(config.cluster.request).toHaveBeenCalledWith(undefined);
      expect(GeneratorHandler.prototype.rollback).toHaveBeenCalledWith();
      expect(RollbackCommand.success).toHaveBeenCalledWith(message);
    });

    it('should reject if request fails', async () => {
      const error = new Error('Ops');
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      // Mock dependencies
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(Cluster.prototype, 'request').mockRejectedValue(error);

      await expect(RollbackCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if rollback fails', async () => {
      const error = new Error('Ops');
      const config = {
        typescript: { enabled: true },
        cluster: new Cluster(),
      };

      // Mock dependencies
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(Cluster.prototype, 'request').mockResolvedValue(con);
      jest
        .spyOn(GeneratorHandler.prototype, 'rollback')
        .mockRejectedValue(error);

      await expect(RollbackCommand.exec()).rejects.toThrow(error);
    });
  });
});
