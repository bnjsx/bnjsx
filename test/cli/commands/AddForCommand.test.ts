import { AddGeneratorCommand } from '../../../src/cli/commands/AddGeneratorCommand';
import { AddSeederCommand } from '../../../src/cli/commands/AddSeederCommand';
import { AddModelCommand } from '../../../src/cli/commands/AddModelCommand';
import { AddForCommand } from '../../../src/cli/commands/AddForCommand';

describe('AddForCommand', () => {
  describe('exec', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve when all commands execute successfully', async () => {
      // Mock dependencies to resolve successfully
      jest.spyOn(AddGeneratorCommand, 'exec').mockResolvedValue(undefined);
      jest.spyOn(AddSeederCommand, 'exec').mockResolvedValue(undefined);
      jest.spyOn(AddModelCommand, 'exec').mockResolvedValue(undefined);

      // Execute the command
      const result = await AddForCommand.exec();

      // Assertions
      expect(AddGeneratorCommand.exec).toHaveBeenCalled();
      expect(AddSeederCommand.exec).toHaveBeenCalled();
      expect(AddModelCommand.exec).toHaveBeenCalled();
      expect(result).toBe(undefined); // Final resolved value
    });

    it('should reject if AddGeneratorCommand.exec fails', async () => {
      const error = new Error('Failed to add generator');
      jest.spyOn(AddGeneratorCommand, 'exec').mockRejectedValue(error);

      await expect(AddForCommand.exec()).rejects.toThrow(error);

      expect(AddGeneratorCommand.exec).toHaveBeenCalled();
      expect(AddSeederCommand.exec).not.toHaveBeenCalled();
      expect(AddModelCommand.exec).not.toHaveBeenCalled();
    });

    it('should reject if AddSeederCommand.exec fails', async () => {
      jest.spyOn(AddGeneratorCommand, 'exec').mockResolvedValue(undefined);

      const error = new Error('Failed to add seeder');
      jest.spyOn(AddSeederCommand, 'exec').mockRejectedValue(error);

      await expect(AddForCommand.exec()).rejects.toThrow(error);

      expect(AddGeneratorCommand.exec).toHaveBeenCalled();
      expect(AddSeederCommand.exec).toHaveBeenCalled();
      expect(AddModelCommand.exec).not.toHaveBeenCalled();
    });

    it('should reject if AddModelCommand.exec fails', async () => {
      jest.spyOn(AddGeneratorCommand, 'exec').mockResolvedValue(undefined);
      jest.spyOn(AddSeederCommand, 'exec').mockResolvedValue(undefined);

      const error = new Error('Failed to add model');
      jest.spyOn(AddModelCommand, 'exec').mockRejectedValue(error);

      await expect(AddForCommand.exec()).rejects.toThrow(error);

      expect(AddGeneratorCommand.exec).toHaveBeenCalled();
      expect(AddSeederCommand.exec).toHaveBeenCalled();
      expect(AddModelCommand.exec).toHaveBeenCalled();
    });
  });
});
