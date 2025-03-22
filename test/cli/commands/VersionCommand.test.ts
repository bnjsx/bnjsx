import { VersionCommand } from '../../../src/cli/commands/VersionCommand';
import { CommandError } from '../../../src/cli/Command';
import * as fs from 'fs';

describe('VersionCommand', () => {
  it('should log the version from package.json on success', async () => {
    // mock Config.loadJSON to resolve with a fake version
    const mockVersion = '1.0.0';
    jest.spyOn(fs.promises, 'readFile').mockResolvedValueOnce(
      JSON.stringify({
        version: mockVersion,
      })
    );

    // Capture console output
    const consoleWarningSpy = jest
      .spyOn(VersionCommand, 'warning')
      .mockImplementation(() => {}); // do nothing

    // Act: execute the command
    await VersionCommand.exec();

    // Assert: verify the version was logged
    expect(consoleWarningSpy).toHaveBeenCalledWith(mockVersion);
  });

  it('should throw an error if loading package.json fails', async () => {
    // mock Config.loadJSON to reject with an error
    jest
      .spyOn(fs.promises, 'readFile')
      .mockRejectedValueOnce(new Error('File not found'));

    // Act & Assert: expect the error to be thrown
    await expect(VersionCommand.exec()).rejects.toThrow(
      new CommandError('Falied to load package.json')
    );
  });
});
