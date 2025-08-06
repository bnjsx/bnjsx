import { UpCommand } from '../../../src/cli/commands/UpCommand';
import { config } from '../../../src/config';
import { existsSync } from 'fs';
import { unlink } from 'fs/promises';

jest.mock('../../../src/config');
jest.mock('fs');
jest.mock('fs/promises');

describe('UpCommand', () => {
  const mockResolveSync = jest.fn();
  const mockInfo = jest
    .spyOn(UpCommand as any, 'info')
    .mockImplementation(() => {});
  const mockSuccess = jest
    .spyOn(UpCommand as any, 'success')
    .mockImplementation(() => {});
  const mockError = jest
    .spyOn(UpCommand as any, 'error')
    .mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    (config as jest.Mock).mockReturnValue({
      resolveSync: mockResolveSync,
    });
  });

  describe('exec', () => {
    it('should show info if maintenance file does not exist', async () => {
      mockResolveSync.mockReturnValue('/project');
      (existsSync as jest.Mock).mockReturnValue(false);

      await UpCommand.exec();

      expect(mockInfo).toHaveBeenCalledWith('Maintenance mode is already OFF.');
      expect(mockSuccess).not.toHaveBeenCalled();
      expect(mockError).not.toHaveBeenCalled();
    });

    it('should unlink file and show success if maintenance file exists', async () => {
      mockResolveSync.mockReturnValue('/project');
      (existsSync as jest.Mock).mockReturnValue(true);
      (unlink as jest.Mock).mockResolvedValue(undefined);

      await UpCommand.exec();

      expect(unlink).toHaveBeenCalledWith('C:\\project\\.maintenance');
      expect(mockSuccess).toHaveBeenCalledWith(
        'Maintenance mode deactivated. The site is back online.'
      );
      expect(mockInfo).not.toHaveBeenCalled();
      expect(mockError).not.toHaveBeenCalled();
    });

    it('should catch errors and show error message', async () => {
      mockResolveSync.mockReturnValue('/project');
      (existsSync as jest.Mock).mockReturnValue(true);
      (unlink as jest.Mock).mockRejectedValue(new Error('fail'));

      await UpCommand.exec();

      expect(mockError).toHaveBeenCalledWith(
        'Oops! Failed to deactivate maintenance mode.'
      );
      expect(mockInfo).not.toHaveBeenCalled();
      expect(mockSuccess).not.toHaveBeenCalled();
    });
  });
});
