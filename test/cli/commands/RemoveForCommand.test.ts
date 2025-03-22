import { RemoveGeneratorCommand } from '../../../src/cli/commands/RemoveGeneratorCommand';
import { RemoveSeederCommand } from '../../../src/cli/commands/RemoveSeederCommand';
import { RemoveModelCommand } from '../../../src/cli/commands/RemoveModelCommand';
import { RemoveForCommand } from '../../../src/cli/commands/RemoveForCommand';

describe('RemoveForCommand', () => {
  describe('exec', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve when all commands execute successfully', async () => {
      // Mock dependencies to resolve successfully
      jest.spyOn(RemoveGeneratorCommand, 'exec').mockResolvedValue();
      jest.spyOn(RemoveSeederCommand, 'exec').mockResolvedValue();
      jest.spyOn(RemoveModelCommand, 'exec').mockResolvedValue();

      // Execute the command
      const result = await RemoveForCommand.exec();

      // Assertions
      expect(RemoveGeneratorCommand.exec).toHaveBeenCalled();
      expect(RemoveSeederCommand.exec).toHaveBeenCalled();
      expect(RemoveModelCommand.exec).toHaveBeenCalled();
      expect(result).toBe(undefined); // Final resolved value
    });

    it('should reject if RemoveGeneratorCommand.exec fails', async () => {
      const error = new Error('Failed to remove generator');
      jest.spyOn(RemoveGeneratorCommand, 'exec').mockRejectedValue(error);

      await expect(RemoveForCommand.exec()).rejects.toThrow(error);

      expect(RemoveGeneratorCommand.exec).toHaveBeenCalled();
      expect(RemoveSeederCommand.exec).not.toHaveBeenCalled();
      expect(RemoveModelCommand.exec).not.toHaveBeenCalled();
    });

    it('should reject if RemoveSeederCommand.exec fails', async () => {
      jest.spyOn(RemoveGeneratorCommand, 'exec').mockResolvedValue();

      const error = new Error('Failed to remove seeder');
      jest.spyOn(RemoveSeederCommand, 'exec').mockRejectedValue(error);

      await expect(RemoveForCommand.exec()).rejects.toThrow(error);

      expect(RemoveGeneratorCommand.exec).toHaveBeenCalled();
      expect(RemoveSeederCommand.exec).toHaveBeenCalled();
      expect(RemoveModelCommand.exec).not.toHaveBeenCalled();
    });

    it('should reject if RemoveModelCommand.exec fails', async () => {
      jest.spyOn(RemoveGeneratorCommand, 'exec').mockResolvedValue();
      jest.spyOn(RemoveSeederCommand, 'exec').mockResolvedValue();

      const error = new Error('Failed to remove model');
      jest.spyOn(RemoveModelCommand, 'exec').mockRejectedValue(error);

      await expect(RemoveForCommand.exec()).rejects.toThrow(error);

      expect(RemoveGeneratorCommand.exec).toHaveBeenCalled();
      expect(RemoveSeederCommand.exec).toHaveBeenCalled();
      expect(RemoveModelCommand.exec).toHaveBeenCalled();
    });
  });
});
