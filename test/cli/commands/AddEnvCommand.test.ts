import { AddEnvCommand } from '../../../src/cli/commands/AddEnvCommand';
import { config as loader } from '../../../src/config';
import { resolve } from 'path';
import { existsSync, writeFileSync } from 'fs';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

loader().resolveSync = jest.fn(() => '/root/project');

describe('AddEnvCommand', () => {
  let path = resolve('/root/project', '.env');
  let exists: any = existsSync;

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  it('should not create .env if it already exists', () => {
    exists.mockReturnValue(true);

    AddEnvCommand.exec();

    expect(exists).toHaveBeenCalledWith(path);
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it('should create .env with a random APP_KEY if it does not exist', () => {
    exists.mockReturnValue(false);

    AddEnvCommand.exec();

    expect(exists).toHaveBeenCalledWith(path);
    expect(writeFileSync).toHaveBeenCalledWith(
      path,
      expect.stringContaining('APP_KEY=')
    );
  });
});
