import { DownCommand } from '../../../src/cli/commands/DownCommand';
import { config } from '../../../src/config';
import { existsSync } from 'fs';
import { writeFile } from 'fs/promises';

jest.mock('../../../src/config');
jest.mock('fs');
jest.mock('fs/promises');

describe('DownCommand', () => {
  const mockResolveSync = jest.fn();
  const mockInfo = jest
    .spyOn(DownCommand as any, 'info')
    .mockImplementation(() => {});
  const mockSuccess = jest
    .spyOn(DownCommand as any, 'success')
    .mockImplementation(() => {});
  const mockError = jest
    .spyOn(DownCommand as any, 'error')
    .mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    (config as jest.Mock).mockReturnValue({
      resolveSync: mockResolveSync,
    });
  });

  describe('exec', () => {
    it('should show info if maintenance file exists', async () => {
      mockResolveSync.mockReturnValue('/project');
      (existsSync as jest.Mock).mockReturnValue(true);

      await DownCommand.exec();

      expect(mockInfo).toHaveBeenCalledWith('Maintenance mode is already ON.');
      expect(mockSuccess).not.toHaveBeenCalled();
      expect(mockError).not.toHaveBeenCalled();
    });

    it('should write file and show success if maintenance file does not exist', async () => {
      mockResolveSync.mockReturnValue('/project');
      (existsSync as jest.Mock).mockReturnValue(false);
      (writeFile as jest.Mock).mockResolvedValue(undefined);

      await DownCommand.exec();

      expect(writeFile).toHaveBeenCalledWith('C:\\project\\.maintenance', '');
      expect(mockSuccess).toHaveBeenCalledWith(
        'Maintenance mode activated. The site is now offline.'
      );
      expect(mockInfo).not.toHaveBeenCalled();
      expect(mockError).not.toHaveBeenCalled();
    });

    it('should catch errors and show error message', async () => {
      mockResolveSync.mockReturnValue('/project');
      (existsSync as jest.Mock).mockReturnValue(false);
      (writeFile as jest.Mock).mockRejectedValue(new Error('fail'));

      await DownCommand.exec();

      expect(mockError).toHaveBeenCalledWith(
        'Oops! Failed to activate maintenance mode.'
      );
      expect(mockInfo).not.toHaveBeenCalled();
      expect(mockSuccess).not.toHaveBeenCalled();
    });
  });
});
