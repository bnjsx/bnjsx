import { FetchCommand } from '../../../src/cli/commands/FetchCommand';
import { config as loader } from '../../../src/config';

const con = {
  id: Symbol('PoolConnection'),
  driver: { id: Symbol('MegaDriver') },
  query: jest.fn(() => Promise.resolve([{ id: 1, name: 'John Doe' }])),
} as any;

describe('FetchCommand', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exec', () => {
    const config = {
      cluster: { request: jest.fn(() => Promise.resolve(con)) },
      default: 'default',
    } as any;

    it('should fetch all rows from the specified table when no ID is provided', async () => {
      jest.spyOn(FetchCommand as any, 'argument').mockImplementation((arg) => {
        if (arg === 'table') return 'users';
        if (arg === 'id') return undefined;
      });

      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await FetchCommand.exec();

      expect(result).toBeUndefined();
      expect((FetchCommand as any).argument).toHaveBeenCalledWith('table');
      expect((FetchCommand as any).argument).toHaveBeenCalledWith('id');
      expect(loader().load).toHaveBeenCalled();
      expect(config.cluster.request).toHaveBeenCalledWith('default');
      expect(console.log).toHaveBeenCalledWith([{ id: 1, name: 'John Doe' }]);
      // Test query
      expect(con.query).toHaveBeenCalledWith('SELECT * FROM users;', []);
    });

    it('should fetch a specific row from the table when an ID is provided', async () => {
      jest.spyOn(FetchCommand as any, 'argument').mockImplementation((arg) => {
        if (arg === 'table') return 'users';
        if (arg === 'id') return 1;
      });

      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(console, 'log').mockImplementation(() => {});

      const result = await FetchCommand.exec();

      expect(result).toBeUndefined();
      expect((FetchCommand as any).argument).toHaveBeenCalledWith('table');
      expect((FetchCommand as any).argument).toHaveBeenCalledWith('id');
      expect(loader().load).toHaveBeenCalled();
      expect(config.cluster.request).toHaveBeenCalledWith('default');
      expect(console.log).toHaveBeenCalledWith([{ id: 1, name: 'John Doe' }]);
      // Test query
      expect(con.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = ?;',
        [1]
      );
    });

    it('should reject if no table name is provided', async () => {
      const error = new Error('Ops');
      jest.spyOn(FetchCommand as any, 'argument').mockImplementation(() => {
        throw error;
      });

      await expect(FetchCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if load fails', async () => {
      const error = new Error('Ops');
      jest.spyOn(FetchCommand as any, 'argument').mockImplementation((arg) => {
        if (arg === 'table') return 'user';
        return undefined;
      });

      jest.spyOn(loader(), 'load').mockRejectedValue(error);

      await expect(FetchCommand.exec()).rejects.toThrow(error);
    });

    it('should reject if query execution fails', async () => {
      const error = new Error('Ops');
      jest.spyOn(FetchCommand as any, 'argument').mockImplementation((arg) => {
        if (arg === 'table') return 'users';
        if (arg === 'id') return 1;
      });

      jest.spyOn(con, 'query').mockRejectedValue(error);
      jest.spyOn(loader(), 'load').mockResolvedValue(config);
      jest.spyOn(console, 'log').mockImplementation(() => {});

      await expect(FetchCommand.exec()).rejects.toThrow(error);
    });
  });
});
