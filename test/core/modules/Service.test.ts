jest.mock('../../../src/core/modules/Form', () => ({
  Form: jest.fn(() => {
    return { parse: jest.fn(() => Promise.resolve()) };
  }),
}));

jest.mock('../../../src/core/template/Component', () => ({
  render: jest.fn().mockResolvedValue('<html>OK</html>'),
}));

const mock = {
  connection: () => {
    return {
      id: Symbol('PoolConnection'),
      driver: { id: Symbol('MySQL') },
      query: jest.fn(() => Promise.resolve()),
      release: jest.fn(() => Promise.resolve()),
      beginTransaction: jest.fn(() => Promise.resolve()),
      commit: jest.fn(() => Promise.resolve()),
      rollback: jest.fn(() => Promise.resolve()),
    } as any;
  },
};

jest.mock('../../../src/config', () => ({
  config: () => {
    return {
      loadSync: () => ({
        default: 'main',
        cluster: {
          request: jest.fn(() => Promise.resolve(mock.connection())),
          get: {
            pool: jest.fn(() => {
              return { driver: mock.connection().driver };
            }),
          },
        },
      }),
      resolveSync: () => __dirname,
    };
  },
}));

const Redirector = {
  to: jest.fn().mockReturnThis(),
  with: jest.fn().mockReturnThis(),
  send: jest.fn().mockResolvedValue(undefined),
};

const res = {
  redirect: jest.fn(() => Redirector),
  setHeader: jest.fn(),
  cookie: jest.fn(),
  render: jest.fn(),
  json: jest.fn(),
};

const req = {
  query: new Map([['page', '2']]),
};

import { FLASH_SET_KEY } from '../../../src/core/middlewares/flash';
import { Builder } from '../../../src/core/modules/Builder';
import { Fetcher } from '../../../src/core/modules/Fetcher';

import { Service } from '../../../src/core/modules/Service';
import { Table, TableFinder } from '../../../src/core/modules/Table';
import { Validator } from '../../../src/core/modules/Validator';
import { Folder, Store, UTC } from '../../../src/helpers';

describe('Service', () => {
  let service;

  beforeEach(() => {
    // @ts-ignore
    service = new Service(req, res);

    // ignore warn() logs
    console.log = jest.fn();
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('transaction()', () => {
    it('calls Table.transaction with handler and pool', async () => {
      const handler = jest.fn().mockResolvedValue('result');
      const pool = 'myPool';

      // Mock static method
      const transactionSpy = jest
        .spyOn(Table, 'transaction')
        .mockResolvedValue('result');

      const result = await service.transaction(handler, pool);

      expect(transactionSpy).toHaveBeenCalledWith(handler, pool);
      expect(result).toBe('result');

      transactionSpy.mockRestore();
    });

    it('calls Table.transaction with handler and no pool', async () => {
      const handler = jest.fn().mockResolvedValue('ok');

      const transactionSpy = jest
        .spyOn(Table, 'transaction')
        .mockResolvedValue('ok');

      const result = await service.transaction(handler);

      expect(transactionSpy).toHaveBeenCalledWith(handler, undefined);
      expect(result).toBe('ok');

      transactionSpy.mockRestore();
    });
  });

  describe('builder()', () => {
    it('calls Builder.require with callback and pool', async () => {
      const callback = jest.fn().mockResolvedValue(123);
      const pool = 'pool1';

      const requireSpy = jest.spyOn(Builder, 'require').mockResolvedValue(123);

      const result = await service.builder(callback, pool);

      expect(requireSpy).toHaveBeenCalledWith(callback, pool);
      expect(result).toBe(123);

      requireSpy.mockRestore();
    });

    it('calls Builder.require with callback and no pool', async () => {
      const callback = jest.fn().mockResolvedValue('done');

      const requireSpy = jest
        .spyOn(Builder, 'require')
        .mockResolvedValue('done');

      const result = await service.builder(callback);

      expect(requireSpy).toHaveBeenCalledWith(callback, undefined);
      expect(result).toBe('done');

      requireSpy.mockRestore();
    });
  });

  describe('fetch()', () => {
    it('calls Table.request and fetch returns Fetcher', () => {
      const table = 'users';
      const pool = 'mainPool';

      const fetchMock = jest.fn();
      const fetcherMock = {} as Fetcher;

      const findMock = jest.fn();

      const requestMock = {
        fetch: fetchMock.mockReturnValue(fetcherMock),
        find: findMock,
      };

      const tableRequestSpy = jest
        .spyOn(Table, 'request')
        .mockReturnValue(requestMock as any);

      const result = service.fetch(table, pool);

      expect(tableRequestSpy).toHaveBeenCalledWith(table, pool);
      expect(fetchMock).toHaveBeenCalled();
      expect(result).toBe(fetcherMock);

      tableRequestSpy.mockRestore();
    });

    it('calls Table.request with table and no pool', () => {
      const table = 'products';

      const fetchMock = jest.fn();
      const fetcherMock = {} as Fetcher;

      const requestMock = {
        fetch: fetchMock.mockReturnValue(fetcherMock),
      };

      const tableRequestSpy = jest
        .spyOn(Table, 'request')
        .mockReturnValue(requestMock as any);

      const result = service.fetch(table);

      expect(tableRequestSpy).toHaveBeenCalledWith(table, undefined);
      expect(fetchMock).toHaveBeenCalled();
      expect(result).toBe(fetcherMock);

      tableRequestSpy.mockRestore();
    });
  });

  describe('find()', () => {
    it('calls Table.request and find returns TableFinder', () => {
      const table = 'orders';
      const pool = 'poolX';

      const findMock = jest.fn();
      const finderMock = {} as TableFinder;

      const requestMock = {
        find: findMock.mockReturnValue(finderMock),
      };

      const tableRequestSpy = jest
        .spyOn(Table, 'request')
        .mockReturnValue(requestMock as any);

      const result = service.find(table, pool);

      expect(tableRequestSpy).toHaveBeenCalledWith(table, pool);
      expect(findMock).toHaveBeenCalled();
      expect(result).toBe(finderMock);

      tableRequestSpy.mockRestore();
    });

    it('calls Table.request with table and no pool', () => {
      const table = 'sessions';

      const findMock = jest.fn();
      const finderMock = {} as TableFinder;

      const requestMock = {
        find: findMock.mockReturnValue(finderMock),
      };

      const tableRequestSpy = jest
        .spyOn(Table, 'request')
        .mockReturnValue(requestMock as any);

      const result = service.find(table);

      expect(tableRequestSpy).toHaveBeenCalledWith(table, undefined);
      expect(findMock).toHaveBeenCalled();
      expect(result).toBe(finderMock);

      tableRequestSpy.mockRestore();
    });
  });

  describe('redirect()', () => {
    test('should returns a Redirector instance', () => {
      expect(service.redirect()).toBe(Redirector);
      expect(service.redirect('/path')).toBe(Redirector);
    });
  });

  describe('goto()', () => {
    test('should redirect to the specified path', () => {
      expect(service.goto('/path')).resolves.toBe(undefined);
    });

    test('should redirect with a message', () => {
      expect(service.goto('/path', 'message')).resolves.toBe(undefined);
    });
  });

  describe('table()', () => {
    test('should returns a Table instance', () => {
      const result = service.table('users', 'main');
      expect(result).toBeInstanceOf(Table);
    });
  });

  describe('parse()', () => {
    test('should parses the form body', async () => {
      expect(service.parse()).resolves.toBeUndefined();
    });
  });

  describe('folder()', () => {
    test('should return a Folder instance', async () => {
      const folder = service.folder('test-folder');
      expect(folder).toBeInstanceOf(Folder);
      expect(folder.name).toBe('test-folder');
      await folder.clear();
    });
  });

  describe('store()', () => {
    test('Should create and return a store', () => {
      const store = service.store('custom');
      expect(store).toBeInstanceOf(Store);
      expect(Store['stores'].has('custom')).toBeTruthy();
      expect(Store['stores'].get('custom')).toBe(store);
      expect(service.store('custom')).toBe(store);

      // store some values
      store.set('key_1', 'value_1');
      store.set('key_2', 'value_2');
      store.set('key_3', 'value_3');
    });

    test('Should reference the same store instance', () => {
      const store = service.store('custom');

      expect(store.get('key_1')).toBe('value_1');
      expect(store.get('key_2')).toBe('value_2');
      expect(store.get('key_3')).toBe('value_3');

      // done
      store.clear();
    });
  });

  describe('public()', () => {
    beforeEach(() => {
      service.root = '/project/root';
      service.config = { public: { root: 'public' } };
    });

    test('converts absolute file path inside public folder', () => {
      const result = service.public('/project/root/public/covers/img.jpg');
      expect(result).toBe('/covers/img.jpg');
    });

    test('converts relative file path inside public folder', () => {
      const result = service.public('public/covers/img.jpg');
      expect(result).toBe('/covers/img.jpg');
    });

    test('converts file path using dot segments', () => {
      const result = service.public('public/../public/images/test.png');
      expect(result).toBe('/images/test.png');
    });

    test('normalizes slashes and returns correct url path', () => {
      const result = service.public('public\\images\\pic.jpg'); // Windows-style path
      expect(result).toBe('/images/pic.jpg');
    });

    test('works with deeply nested file in public folder', () => {
      const result = service.public(
        '/project/root/public/assets/images/anime/cover.png'
      );
      expect(result).toBe('/assets/images/anime/cover.png');
    });

    test('returns url path even if file path is outside public folder', () => {
      expect(() =>
        service.public('/project/root/storage/uploads/file.png')
      ).toThrow();
    });

    test('converts relative path from outside public folder (still works)', () => {
      expect(() => service.public('storage/uploads/file.png')).toThrow();
    });
  });

  describe('validator()', () => {
    test('Returns a fresh Validator instance', () => {
      const instance = service.validator();
      expect(instance).toBeInstanceOf(Validator);
    });

    test('Registers rules via setup callback', () => {
      const setup = jest.fn();
      service.validator(setup);
      expect(setup).toHaveBeenCalled();
      expect(setup.mock.calls[0][0]).toBeInstanceOf(Validator);
    });

    test('Uses custom Validator set via setValidator()', () => {
      class CustomValidator extends Validator {}
      service.setValidator(CustomValidator);

      const instance = service.validator();
      expect(instance).toBeInstanceOf(CustomValidator);
    });

    test('Throws ValidatorError for invalid class in setValidator()', () => {
      class NotAValidator {}
      // @ts-ignore intentionally passing wrong class
      expect(() => service.setValidator(NotAValidator)).toThrow(
        'Invalid validator provided'
      );
    });

    test('setValidator() returns same service instance (chaining)', () => {
      class CustomValidator extends Validator {}
      const result = service.setValidator(CustomValidator);
      expect(result).toBe(service);
    });
  });

  describe('upload()', () => {
    // Mock Validate
    const MV = jest.fn();
    // Mock File

    const File = {
      required: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      size: jest.fn().mockReturnThis(),
      location: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
    };

    const MF = jest.fn(() => File);

    beforeEach(() => {
      jest.clearAllMocks();

      // Override the default Validator
      class FakeValidator extends Validator {
        file = MF as any;
        validate = MV;
      }

      service.setValidator(FakeValidator);
    });

    test('Returns a Validator instance after validation', async () => {
      const result = await service.upload('file');
      expect(result).toBeInstanceOf(Validator);
      expect(MF).toHaveBeenCalledWith('file');
      expect(MV).toHaveBeenCalled();
    });

    test('Applies all file rules correctly', async () => {
      const options = {
        required: true,
        count: 2,
        size: {},
        location: 'images/',
        type: ['png', 'jpeg'],
      };

      await service.upload('cover', options);
      expect(File.required).toHaveBeenCalled();
      expect(File.count).toHaveBeenCalledWith(2);
      expect(File.size).toHaveBeenCalledWith(undefined, undefined);
      expect(File.location).toHaveBeenCalledWith('images/');
      expect(File.type).toHaveBeenCalledWith(['png', 'jpeg']);
      expect(MV).toHaveBeenCalled();
    });

    test('Skips optional rules when not provided', async () => {
      await service.upload('avatar', { size: { min: 10, max: 5000 } });
      expect(File.required).not.toHaveBeenCalled();
      expect(File.count).not.toHaveBeenCalled();
      expect(File.size).toHaveBeenCalledWith(10, 5000);
      expect(File.location).not.toHaveBeenCalled();
      expect(File.type).not.toHaveBeenCalled();
      expect(MV).toHaveBeenCalled();
    });
  });

  describe('host()', () => {
    test('extracts domain from https URL with www', () => {
      expect(service.host('https://www.example.com')).toBe('example');
    });

    test('extracts domain from URL without protocol, with www', () => {
      expect(service.host('www.example.com')).toBe('example');
    });

    test('extracts domain from URL without protocol and without www', () => {
      expect(service.host('example.com')).toBe('example');
    });

    test('returns defaultName on empty string input', () => {
      expect(service.host('')).toBe('bnjsx');
    });

    test('returns defaultName on null input', () => {
      expect(service.host(null)).toBe('bnjsx');
    });

    test('returns defaultName on undefined input with custom default', () => {
      expect(service.host(undefined, 'default')).toBe('default');
    });

    test('returns defaultName on non-string input (number)', () => {
      expect(service.host(123 as any)).toBe('bnjsx');
    });

    test('returns defaultName if URL constructor throws (invalid URL)', () => {
      expect(service.host('http://')).toBe('bnjsx');
    });

    test('extracts domain with no dot in hostname', () => {
      expect(service.host('localhost')).toBe('localhost');
    });

    test('extracts domain from URL with multiple subdomains', () => {
      expect(service.host('https://app.mail.example.co.uk')).toBe('app');
    });

    test('host returns defaultName if domain is empty string', () => {
      expect(service.host('http://.')).toBe('bnjsx');
      expect(service.host('http://...')).toBe('bnjsx');
    });
  });

  describe('render()', () => {
    test('render should call res.render', async () => {
      await service.render('user.view');
      expect(res.render).toHaveBeenCalled();
    });
  });

  describe('json()', () => {
    test('json should call res.json', async () => {
      await service.json({});
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('flash()', () => {
    test('flash initializes and sets error message by default', () => {
      req[FLASH_SET_KEY] = [];

      service.flash('Something went wrong');

      expect(req[FLASH_SET_KEY]).toEqual([
        { type: 'error', message: 'Something went wrong' },
      ]);

      expect(res.cookie).toHaveBeenCalledWith(
        'flash',
        JSON.stringify([{ type: 'error', message: 'Something went wrong' }])
      );
    });

    test('flash sets custom type if provided', () => {
      req[FLASH_SET_KEY] = [];

      service.flash('User created', 'success');

      expect(req[FLASH_SET_KEY]).toEqual([
        { type: 'success', message: 'User created' },
      ]);

      expect(res.cookie).toHaveBeenCalledWith(
        'flash',
        JSON.stringify([{ type: 'success', message: 'User created' }])
      );
    });

    test('flash appends multiple messages with correct types', () => {
      req[FLASH_SET_KEY] = [];

      service.flash('First warning'); // default error
      service.flash('Now saved', 'success');
      service.flash('FYI', 'info');

      expect(req[FLASH_SET_KEY]).toEqual([
        { type: 'error', message: 'First warning' },
        { type: 'success', message: 'Now saved' },
        { type: 'info', message: 'FYI' },
      ]);

      expect(res.cookie).toHaveBeenLastCalledWith(
        'flash',
        JSON.stringify([
          { type: 'error', message: 'First warning' },
          { type: 'success', message: 'Now saved' },
          { type: 'info', message: 'FYI' },
        ])
      );
    });

    test('flash initializes flash array if not present', () => {
      delete req[FLASH_SET_KEY];

      service.flash('Init message');

      expect(req[FLASH_SET_KEY]).toEqual([
        { type: 'error', message: 'Init message' },
      ]);

      expect(res.cookie).toHaveBeenCalledWith(
        'flash',
        JSON.stringify([{ type: 'error', message: 'Init message' }])
      );
    });
  });

  describe('pages()', () => {
    beforeEach(() => {
      // mock current request.href and request.base for default URL building
      service.request = {
        href: '/default?page=2',
        base: 'http://localhost',
      };
    });

    test('Returns full Page object (explicit href, no query)', () => {
      const result = service.pages(
        {
          page: { next: 3, prev: 1, current: 2 },
          total: { pages: 5 },
        },
        '/users'
      );

      expect(result).toEqual({
        next: '/users?page=3',
        prev: '/users?page=1',
        current: 2,
        total: 5,
      });
    });

    test('Returns full Page object (explicit href with query)', () => {
      const result = service.pages(
        {
          page: { next: 4, prev: 2, current: 3 },
          total: { pages: 6 },
        },
        '/search?query=john'
      );

      expect(result).toEqual({
        next: '/search?query=john&page=4',
        prev: '/search?query=john&page=2',
        current: 3,
        total: 6,
      });
    });

    test('Returns null if only one page (href optional)', () => {
      const result = service.pages({
        page: { next: null, prev: null, current: 1 },
        total: { pages: 1 },
      });

      expect(result).toBeNull();
    });

    test('Handles missing next/prev gracefully (href optional)', () => {
      const result = service.pages({
        page: { next: null, prev: null, current: 1 },
        total: { pages: 3 },
      });

      expect(result).toEqual({
        next: false,
        prev: false,
        current: 1,
        total: 3,
      });
    });

    test('Uses current request.href if href is not provided', () => {
      const result = service.pages({
        page: { next: 3, prev: 1, current: 2 },
        total: { pages: 5 },
      });

      expect(result).toEqual({
        next: '/default?page=3',
        prev: '/default?page=1',
        current: 2,
        total: 5,
      });
    });

    test('Throws ServiceError on invalid href', () => {
      expect(() =>
        service.pages(
          {
            page: { next: 2, prev: null, current: 1 },
            total: { pages: 5 },
          },
          'http://[' // malformed URL
        )
      ).toThrow(/Invalid URL for pagination/);
    });

    test('Returns null if data is malformed', () => {
      expect(service.pages(null as any)).toBeNull();
      expect(service.pages({ page: null, total: null } as any)).toBeNull();
      expect(service.pages({ page: {}, total: {} })).toBeNull();
      expect(
        service.pages({ page: { current: '2' }, total: { pages: '5' } })
      ).toBeNull();
    });
  });
});
