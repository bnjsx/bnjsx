import { register, execute } from '../../src/cli';
import { Command, CommandError } from '../../src/cli/Command';

/**
 * A mock command class extending MegaCommand to use in tests.
 */
class MockCommand extends Command {
  static exec = jest.fn(() => Promise.resolve()) as any;
}

describe('register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a valid command', () => {
    expect(() => register('mock_command', MockCommand)).not.toThrow();
  });

  it('should throw an error if the command is not a subclass of MegaCommand', () => {
    class InvalidCommand {}

    expect(() => {
      register('invalid_command', InvalidCommand as any);
    }).toThrow(CommandError);

    expect(() => {
      register('invalid_command', InvalidCommand as any);
    }).toThrow(`Invalid command: ${String(InvalidCommand)}`);
  });

  it('should throw an error if the name is not a valid string', () => {
    expect(() => {
      register('', MockCommand);
    }).toThrow(CommandError);

    expect(() => {
      register('', MockCommand);
    }).toThrow('Invalid command name: ');
  });

  it('should throw an error if the name already exists', () => {
    expect(() => {
      register('mock_command', MockCommand);
    }).toThrow(CommandError);

    expect(() => {
      register('mock_command', MockCommand);
    }).toThrow('Deplicated command names: mock_command');
  });
});

describe('execute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute a registered command successfully', async () => {
    process.argv = ['node', 'script.js', 'mock_command'];

    await execute();

    expect(MockCommand.exec).toHaveBeenCalled();
  });

  it('should reject if the command name is undefined', async () => {
    process.argv = ['node', 'script.js'];

    await expect(execute()).rejects.toThrow(CommandError);
    await expect(execute()).rejects.toThrow('Undefined command name');
  });

  it('should reject if the command is unknown', async () => {
    process.argv = ['node', 'script.js', 'unknown_command'];

    await expect(execute()).rejects.toThrow(CommandError);
    await expect(execute()).rejects.toThrow('Unknown command: unknown_command');
  });

  it('should reject if command.exec throws', async () => {
    MockCommand.exec = jest.fn(() => {
      throw new Error('Non-promise execution failed');
    });

    process.argv = ['node', 'script.js', 'mock_command'];

    await expect(execute()).rejects.toThrow('Non-promise execution failed');

    expect(MockCommand.exec).toHaveBeenCalled();
  });

  it('should reject if command.exec rejectes', async () => {
    MockCommand.exec = jest.fn(() =>
      Promise.reject(new Error('Promise execution failed'))
    );

    process.argv = ['node', 'script.js', 'mock_command'];

    await expect(execute()).rejects.toThrow('Promise execution failed');

    expect(MockCommand.exec).toHaveBeenCalled();
  });

  it('should resolve with command.exec resolve value', async () => {
    MockCommand.exec = jest.fn(() => Promise.resolve('done'));

    process.argv = ['node', 'script.js', 'mock_command'];

    const result = await execute();

    expect(result).toBe('done');
    expect(MockCommand.exec).toHaveBeenCalled();
  });

  it('should resolve with command.exec return value', async () => {
    MockCommand.exec = jest.fn(() => 'done');

    process.argv = ['node', 'script.js', 'mock_command'];

    const result = await execute();

    expect(result).toBe('done');
    expect(MockCommand.exec).toHaveBeenCalled();
  });
});
