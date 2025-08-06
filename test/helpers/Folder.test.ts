import * as fs from 'fs/promises';
import * as path from 'path';

jest.useFakeTimers();
jest.spyOn(global, 'setInterval');

import { Folder } from '../../src/helpers/Folder';
import { config } from '../../src/config';

const root = config().resolveSync();
const cacheFolder = path.resolve(root, 'cache');

describe('Folder', () => {
  afterEach(() => {
    Folder['folders'].clear(); // clean up resources...
    jest.clearAllMocks();
  });

  beforeAll(async () => {
    await fs.mkdir(cacheFolder);
  });

  afterAll(async () => {
    await fs.rm(cacheFolder, { recursive: true, force: true });
  });

  describe('.get()', () => {
    test('returns same instance for same key', () => {
      const a = Folder.get('abc');
      const b = Folder.get('abc');
      expect(a).toBe(b);
    });

    test('creates default instance with "__default__" key', () => {
      const folder = Folder.get();
      expect(folder).toBeInstanceOf(Folder);
      expect(folder['name']).toBe('__default__');
    });

    test('sets correct default values when options are missing', () => {
      const folder = Folder.get('defaults', {});
      expect(folder['size']).toBe(500);
      expect(folder['trim']).toBe(10);
      expect(folder['timeout']).toBe(60_000);
    });

    test('handles null options', () => {
      const folder = Folder.get('null-opts', null as any);
      expect(folder['size']).toBe(500);
      expect(folder['trim']).toBe(10);
      expect(folder['timeout']).toBe(60_000);
    });

    test('handles invalid types for each option', () => {
      const folder = Folder.get('invalids', {
        size: 'large' as any,
        trim: {} as any,
        timeout: -5 as any,
      });

      expect(folder['size']).toBe(500); // default
      expect(folder['trim']).toBe(10); // default
      expect(folder['timeout']).toBe(60_000); // default
    });

    test('accepts valid custom values for all options', () => {
      const folder = Folder.get('custom', {
        size: 500,
        trim: 50,
        timeout: 120,
      });

      expect(folder['size']).toBe(500);
      expect(folder['trim']).toBe(50);
      expect(folder['timeout']).toBe(120_000);
    });

    test('ignores trim > 100 or <= 0 and falls back to 10', () => {
      const over = Folder.get('trim-high', { trim: 999 });
      expect(over['trim']).toBe(10);

      const zero = Folder.get('trim-zero', { trim: 0 });
      expect(zero['trim']).toBe(10);

      const neg = Folder.get('trim-neg', { trim: -20 });
      expect(neg['trim']).toBe(10);
    });

    test('ignores size <= 0 and falls back to 500', () => {
      const folder = Folder.get('size-zero', { size: 0 });
      expect(folder['size']).toBe(500);
    });

    test('uses 60s as fallback timeout if invalid', () => {
      const folder = Folder.get('bad-timeout', { timeout: NaN });
      expect(folder['timeout']).toBe(60_000);
    });

    test('uses 60s timeout when set to 0', () => {
      const folder = Folder.get('zero-timeout', { timeout: 0 });
      expect(folder['timeout']).toBe(60_000);
    });

    test('defaults to "__default__" name if key is not string', () => {
      const folder = Folder.get({} as any);
      expect(folder['name']).toBe('__default__');
    });
  });

  describe('.delete()', () => {
    test('deletes folder and stops cleaner', async () => {
      const folder = Folder.get('to-delete');
      const stop = jest.spyOn(folder as any, 'stopCleaning');
      await Folder.delete('to-delete');
      expect(stop).toHaveBeenCalled();
      expect(Folder['folders'].has('to-delete')).toBe(false);
    });

    test('does nothing if key not found', async () => {
      await expect(Folder.delete('missing')).resolves.toBeUndefined();
    });
  });

  describe('join()', () => {
    test('sanitizes key and generates safe path', () => {
      const folder = Folder.get('safe');
      const result = folder.join('../../..///weird$key');
      expect(result).toMatch(/weird-key\.json$/);
    });

    test('removes leading dots from key', () => {
      const folder = Folder.get('safe');
      const result = folder.join('...hidden.file');
      expect(result).toMatch(/hidden\.file\.json$/);
    });

    test('limits key length to 100 characters', () => {
      const folder = Folder.get('safe');
      const longKey = 'x'.repeat(200);
      const result = folder.join(longKey);
      const base = path.basename(result);
      expect(base.length).toBeLessThanOrEqual(105); // 100x + ".json"
      expect(base).toMatch(/^x{100}\.json$/);
    });

    test('replaces all unsafe characters with hyphens', () => {
      const folder = Folder.get('safe');
      const result = folder.join('!@#$%^&*()=+[]{}<>/\\|;:\'",?');
      expect(path.basename(result)).toMatch(/^[a-zA-Z0-9._-]+\.json$/);
    });

    test('handles non-string key input (number)', () => {
      const folder = Folder.get('safe');
      const result = folder.join(12345 as any);
      expect(result).toMatch(/12345\.json$/);
    });

    test('handles non-string key input (null)', () => {
      const folder = Folder.get('safe');
      const result = folder.join(null as any);
      expect(result).toMatch(/null\.json$/);
    });

    test('handles non-string key input (object)', () => {
      const folder = Folder.get('safe');
      const result = folder.join({ foo: 'bar' } as any);
      expect(path.basename(result)).toMatch(/^[a-zA-Z0-9._-]+\.json$/);
    });
  });

  describe('get()', () => {
    test('returns fallback on non-string key', async () => {
      const folder = Folder.get('get');
      const value = await folder.get(123 as any, 'fallback');
      expect(value).toBe('fallback');
    });

    test('returns fallback if file does not exist', async () => {
      const folder = Folder.get('get');
      const value = await folder.get('not-found', 'fallback');
      expect(value).toBe('fallback');
    });

    test('returns fallback if JSON is invalid or corrupted', async () => {
      const folder = Folder.get('get');
      const file = folder.join('broken');
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, '{ not: json }');
      const val = await folder.get('broken', 'fallback');
      expect(val).toBe('fallback');
    });

    test('returns data if not expired', async () => {
      const folder = Folder.get('get');
      await folder.set('key', { name: 'value' }, 60);
      const result = await folder.get('key', 'fallback');
      expect(result).toEqual({ name: 'value' });
    });

    test('returns fallback if expired', async () => {
      const folder = Folder.get('get');

      await folder.set('key', 'expired', 60); // valid for 60s

      // simulate expiration by modifying meta
      const meta = folder['meta'].get('key') as any;
      meta.expiresAt = Date.now() - 1;

      // trigger cleanup
      jest.advanceTimersByTime(folder['timeout']);

      const result = await folder.get('key', 'fallback');
      expect(result).toBe('fallback');
    });

    test('returns fallback if addedAt or expiresAt are invalid (recovery fails)', async () => {
      const folder = Folder.get('meta-recover-invalid');
      await fs.mkdir(folder.path, { recursive: true });

      const file = folder.join('bad-meta');
      const invalidMeta = {
        data: 'bad',
        addedAt: 'not-a-number',
        expiresAt: 'invalid',
      };
      await fs.writeFile(file, JSON.stringify(invalidMeta));

      // Metadata not preloaded — triggers recovery
      const result = await folder.get('bad-meta');
      const exists = await fs
        .access(file)
        .then(() => true)
        .catch(() => false);

      expect(result).toBe(null);
      expect(exists).toBe(false); // file should be deleted
    });

    test('recovers valid metadata and returns cached value', async () => {
      const folder = Folder.get('meta-recover-valid');
      await fs.mkdir(folder.path, { recursive: true });

      const now = Date.now();
      const file = folder.join('recovered');
      const cache = {
        data: { name: 'restored' },
        addedAt: now - 1000,
        expiresAt: now + 60000,
      };
      await fs.writeFile(file, JSON.stringify(cache));

      // empty metadata map (recovery will run)
      folder['meta'].clear();

      const result = await folder.get('recovered', 'fallback');
      const meta = folder['meta'].get('recovered');

      expect(result).toEqual({ name: 'restored' });
      expect(meta).toMatchObject({
        key: 'recovered',
        path: file,
        used: 1,
        addedAt: cache.addedAt,
        expiresAt: cache.expiresAt,
      });
    });

    test('recovers metadata and deletes file if expired', async () => {
      const folder = Folder.get('meta-recover-expired');
      await fs.mkdir(folder.path, { recursive: true });

      const file = folder.join('expired');
      const now = Date.now();
      const cache = {
        data: 'should-not-return',
        addedAt: now - 100000,
        expiresAt: now - 1000, // already expired
      };
      await fs.writeFile(file, JSON.stringify(cache));

      folder['meta'].clear(); // force recovery

      const result = await folder.get('expired', 'fallback');

      const exists = await fs
        .access(file)
        .then(() => true)
        .catch(() => false);

      expect(result).toBe('fallback');
      expect(folder['meta'].has('expired')).toBe(false);
      expect(exists).toBe(false); // file should be deleted
    });

    test('recovers multiple cache files and preserves only valid ones', async () => {
      const folder = Folder.get('meta-recover-multi');
      const now = Date.now();

      await fs.mkdir(folder.path, { recursive: true });
      const validFile = folder.join('valid');
      const expiredFile = folder.join('expired');
      const invalidFile = folder.join('invalid');

      await fs.writeFile(
        validFile,
        JSON.stringify({ data: 1, addedAt: now, expiresAt: now + 60000 })
      );
      await fs.writeFile(
        expiredFile,
        JSON.stringify({ data: 2, addedAt: now, expiresAt: now - 1000 })
      );
      await fs.writeFile(
        invalidFile,
        JSON.stringify({ data: 3, addedAt: '??', expiresAt: '??' })
      );

      // clear meta
      folder['meta'].clear();

      const valid = await folder.get('valid', 'fallback');
      const expired = await folder.get('expired', 'fallback');
      const invalid = await folder.get('invalid', 'fallback');

      const [validExists, expiredExists, invalidExists] = await Promise.all([
        fs
          .access(validFile)
          .then(() => true)
          .catch(() => false),
        fs
          .access(expiredFile)
          .then(() => true)
          .catch(() => false),
        fs
          .access(invalidFile)
          .then(() => true)
          .catch(() => false),
      ]);

      expect(valid).toBe(1);
      expect(expired).toBe('fallback');
      expect(invalid).toBe('fallback');

      expect(validExists).toBe(true);
      expect(expiredExists).toBe(false); // removed
      expect(invalidExists).toBe(false); // removed

      expect(folder['meta'].has('valid')).toBe(true); // recovred
      expect(folder['meta'].has('expired')).toBe(false);
      expect(folder['meta'].has('invalid')).toBe(false);
    });

    test('recovers && returns cached value when expiresAt is null (forever cache)', async () => {
      const folder = Folder.get('get-forever');
      await fs.mkdir(folder.path, { recursive: true });

      const file = folder.join('forever');
      const cache = {
        data: 'forever',
        addedAt: Date.now(),
        expiresAt: null, // forever cache
      };
      await fs.writeFile(file, JSON.stringify(cache));

      folder['meta'].clear(); // Force metadata recovery

      const result = await folder.get('forever', 'fallback');
      const meta = folder['meta'].get('forever');

      expect(result).toBe('forever');
      expect(meta).toBeDefined();
      expect(meta!.expiresAt).toBe(null);
    });

    test('deletes metadata entry if expired and already loaded in meta', async () => {
      const folder = Folder.get('get-meta-delete');
      await folder.set('will-expire', 'bye', 1); // short-lived cache

      // Let it expire
      const meta = folder['meta'].get('will-expire')!;
      meta.expiresAt = Date.now() - 1000;

      // Call `get` — this triggers: return fallback + fs.rm + meta.delete
      const result = await folder.get('will-expire', 'fallback');

      expect(result).toBe('fallback');
      expect(folder['meta'].has('will-expire')).toBe(false);
    });
  });

  describe('set()', () => {
    test('creates cache file with correct structure and metadata', async () => {
      const folder = Folder.get('set-basic');
      const key = 'user:data';
      const data = { id: 123, name: 'Alice' };

      await folder.set(key, data, 3600);

      const file = folder.join(key);
      const contents = await fs.readFile(file, 'utf-8');
      const parsed = JSON.parse(contents);
      const expiresAt = Date.now() + 3_600 * 1_000;
      const addedAt = Date.now();

      expect(parsed.data).toEqual(data);
      expect(parsed.addedAt).toBe(addedAt);
      expect(parsed.expiresAt).toBe(expiresAt);

      const meta = folder['meta'].get('user:data');
      expect(meta).toMatchObject({
        expiresAt,
        addedAt,
        key: 'user:data',
        path: file,
        used: 0,
      });
    });

    test('stores forever when no ttl is defined', async () => {
      const folder = Folder.get('set-null-ttl');
      const key = 'forever';
      const data = { message: 'immortal' };

      await folder.set(key, data);

      const contents = await fs.readFile(folder.join(key), 'utf-8');
      const parsed = JSON.parse(contents);

      expect(parsed.expiresAt).toBe(null);
      const meta = folder['meta'].get('forever');
      expect(meta?.expiresAt).toBe(null);
    });

    test('automatically creates cache directory if missing', async () => {
      const folder = Folder.get('set-mkdir');
      const key = 'auto-dir';
      const data = 'created';

      // Simulate missing directory
      await fs.rm(folder.path, { recursive: true, force: true });
      await folder.set(key, data, 60);

      const contents = await fs.readFile(folder.join(key), 'utf-8');
      const parsed = JSON.parse(contents);

      expect(parsed.data).toBe('created');
    });

    test('does not write if meta.size exceeds limit', async () => {
      const folder = Folder.get('set-limit', { size: 1 }); // limit to 1 item
      const key1 = 'one';
      const key2 = 'two';

      await folder.set(key1, 1, 60);
      const cleanSpy = jest.spyOn(folder as any, 'cleanSpace');
      await folder.set(key2, 2, 60);

      expect(cleanSpy).toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    test('removes metadata and deletes the cache file', async () => {
      const folder = Folder.get('delete-test');
      await folder.set('key', 'value');
      expect(folder['meta'].has('key')).toBe(true);

      await folder.delete('key');

      expect(folder['meta'].has('key')).toBe(false);

      // The file should be deleted
      await expect(fs.access(folder.join('key'))).rejects.toThrow();
    });

    test('does not throw if file does not exist', async () => {
      const folder = Folder.get('delete-test');

      // Should not throw even if file is missing
      await expect(folder.delete('nonexistent')).resolves.toBeUndefined();
    });

    test('does not throw if key is invalid', async () => {
      const folder = Folder.get('delete-test');

      // Should not throw even if file is missing
      await expect(folder.delete(null as any)).resolves.toBeUndefined();
    });
  });

  describe('clear()', () => {
    test('clears metadata and deletes all cached files for this folder', async () => {
      const folder = Folder.get('clear-test');
      await folder.set('key1', 'value1');
      await folder.set('key2', 'value2');

      expect(folder['meta'].size).toBe(2);

      // Spy on Folder.delete static method
      const deleteSpy = jest.spyOn(Folder, 'delete');

      await folder.clear();

      expect(deleteSpy).toHaveBeenCalledWith(folder['name']);

      // meta cleaned
      expect(folder['meta'].size).toBe(0);

      // folder removed
      await expect(fs.access(folder.path)).rejects.toThrow();

      // instance is dereferenced
      expect(Folder.folders.has('clear-test')).toBeFalsy();
    });
  });

  describe('startCleaning()', () => {
    test('starts interval cleaner if not running', () => {
      const folder = Folder.get('cleaning-test');
      folder['cleaner'] = null;
      folder['startCleaning']();
      expect(folder['cleaner']).not.toBeNull();
    });

    test('does nothing if cleaner is already running', () => {
      const folder = Folder.get('cleaning-test');
      const oldCleaner = folder['cleaner'];
      folder['startCleaning']();
      expect(folder['cleaner']).toBe(oldCleaner);
    });
  });

  describe('stopCleaning()', () => {
    test('stops interval cleaner if running', () => {
      const folder = Folder.get('cleaning-test');
      const clearSpy = jest.spyOn(global, 'clearInterval');
      const cleaner = folder['cleaner'];
      folder['stopCleaning']();
      expect(clearSpy).toHaveBeenCalledWith(cleaner);
      expect(folder['cleaner']).toBeNull();
    });

    test('does nothing if cleaner is not running', () => {
      const folder = Folder.get('cleaning-test');
      folder['cleaner'] = null;
      const clearSpy = jest.spyOn(global, 'clearInterval');
      folder['stopCleaning']();
      expect(clearSpy).not.toHaveBeenCalled();
      expect(folder['cleaner']).toBeNull();
    });
  });

  describe('cleanSpace()', () => {
    test('deletes least-used entries based on trim percentage', async () => {
      const folder = Folder.get('clean-space-test');
      folder['meta'].clear();

      // Setup multiple entries with different usage counts and addedAt timestamps
      const now = Date.now();
      const filesToCreate = [
        { key: 'a', used: 5, addedAt: now - 5000 },
        { key: 'b', used: 2, addedAt: now - 3000 },
        { key: 'c', used: 7, addedAt: now - 2000 },
        { key: 'd', used: 1, addedAt: now - 1000 },
        { key: 'e', used: 3, addedAt: now - 4000 },
      ];

      // Create dummy files and meta entries
      await fs.mkdir(folder.path, { recursive: true });

      for (const entry of filesToCreate) {
        const filePath = folder.join(entry.key);

        await fs.writeFile(
          filePath,
          JSON.stringify({
            data: entry.key,
            addedAt: entry.addedAt,
            expiresAt: entry.addedAt + 100000,
          })
        );

        folder['meta'].set(entry.key, {
          key: entry.key,
          path: filePath,
          used: entry.used,
          addedAt: entry.addedAt,
          expiresAt: entry.addedAt + 100000,
        });
      }

      // Set trim to 40% => will delete 2 files (floor(5 * 40 / 100) = 2)
      folder['trim'] = 40;

      await folder['cleanSpace']();

      // Expect only 2 least-used entries deleted: 'd' (used=1), 'b' (used=2)
      expect(folder['meta'].has('d')).toBe(false);
      expect(folder['meta'].has('b')).toBe(false);

      // Others remain
      expect(folder['meta'].has('a')).toBe(true);
      expect(folder['meta'].has('c')).toBe(true);
      expect(folder['meta'].has('e')).toBe(true);

      // Files deleted on disk
      await expect(fs.access(folder.join('d'))).rejects.toThrow();
      await expect(fs.access(folder.join('b'))).rejects.toThrow();

      // Files remaining on disk
      await expect(fs.access(folder.join('a'))).resolves.toBeUndefined();
      await expect(fs.access(folder.join('c'))).resolves.toBeUndefined();
      await expect(fs.access(folder.join('e'))).resolves.toBeUndefined();
    });

    test('stops deleting after reaching target size', async () => {
      const folder = Folder.get('clean-space-limit');
      folder['meta'].clear();

      // Setup 3 entries
      const now = Date.now();
      const filesToCreate = [
        { key: 'x', used: 1, addedAt: now - 1000 },
        { key: 'y', used: 2, addedAt: now - 2000 },
        { key: 'z', used: 3, addedAt: now - 3000 },
      ];

      await fs.mkdir(folder.path, { recursive: true });

      for (const entry of filesToCreate) {
        const filePath = folder.join(entry.key);
        await fs.writeFile(
          filePath,
          JSON.stringify({
            data: entry.key,
            addedAt: entry.addedAt,
            expiresAt: entry.addedAt + 100000,
          })
        );
        folder['meta'].set(entry.key, {
          key: entry.key,
          path: filePath,
          used: entry.used,
          addedAt: entry.addedAt,
          expiresAt: entry.addedAt + 100000,
        });
      }

      folder['trim'] = 33; // floor(3 * 33 / 100) = 0 (because floor(0.99) = 0)
      await folder['cleanSpace']();
      expect(folder['meta'].size).toBe(3); // no deletion because size = 0

      folder['trim'] = 34; // floor(3 * 34 / 100) = 1
      await folder['cleanSpace']();
      expect(folder['meta'].size).toBe(2);
      expect(folder['meta'].has('x')).toBe(false); // least used removed
    });
  });
});
