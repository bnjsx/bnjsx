import * as fs from 'fs/promises';
import * as path from 'path';

jest.useFakeTimers();
jest.spyOn(global, 'setInterval');

import { folder, Folder } from '../../src/helpers/Folder';
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
      const a = folder('abc');
      const b = folder('abc');
      expect(a).toBe(b);
    });

    test('creates default instance with "__default__" key', () => {
      const dir = folder();
      expect(dir).toBeInstanceOf(Folder);
      expect(dir['name']).toBe('__default__');
    });

    test('sets correct default values when options are missing', () => {
      const dir = folder('defaults', {});
      expect(dir['size']).toBe(500);
      expect(dir['trim']).toBe(10);
      expect(dir['timeout']).toBe(60_000);
    });

    test('handles null options', () => {
      const dir = folder('null-opts', null as any);
      expect(dir['size']).toBe(500);
      expect(dir['trim']).toBe(10);
      expect(dir['timeout']).toBe(60_000);
    });

    test('handles invalid types for each option', () => {
      const dir = folder('invalids', {
        size: 'large' as any,
        trim: {} as any,
        timeout: -5 as any,
      });

      expect(dir['size']).toBe(500); // default
      expect(dir['trim']).toBe(10); // default
      expect(dir['timeout']).toBe(60_000); // default
    });

    test('accepts valid custom values for all options', () => {
      const dir = folder('custom', {
        size: 500,
        trim: 50,
        timeout: 120,
      });

      expect(dir['size']).toBe(500);
      expect(dir['trim']).toBe(50);
      expect(dir['timeout']).toBe(120_000);
    });

    test('ignores trim > 100 or <= 0 and falls back to 10', () => {
      const over = folder('trim-high', { trim: 999 });
      expect(over['trim']).toBe(10);

      const zero = folder('trim-zero', { trim: 0 });
      expect(zero['trim']).toBe(10);

      const neg = folder('trim-neg', { trim: -20 });
      expect(neg['trim']).toBe(10);
    });

    test('ignores size <= 0 and falls back to 500', () => {
      const dir = folder('size-zero', { size: 0 });
      expect(dir['size']).toBe(500);
    });

    test('uses 60s as fallback timeout if invalid', () => {
      const dir = folder('bad-timeout', { timeout: NaN });
      expect(dir['timeout']).toBe(60_000);
    });

    test('uses 60s timeout when set to 0', () => {
      const dir = folder('zero-timeout', { timeout: 0 });
      expect(dir['timeout']).toBe(60_000);
    });

    test('defaults to "__default__" name if key is not string', () => {
      const dir = folder({} as any);
      expect(dir['name']).toBe('__default__');
    });

    test('does not start cleaner interval', () => {
      const spy = jest.spyOn(global, 'setInterval');
      const store = folder('no-cleaner', { timeout: false });
      expect(spy).not.toHaveBeenCalled();
      expect(store['cleaner']).toBeNull();
      spy.mockRestore();
    });
  });

  describe('join()', () => {
    test('sanitizes key and generates safe path', () => {
      const dir = folder('safe');
      const result = dir.join('../../..///weird$key');
      expect(result).toMatch(/weird-key\.json$/);
    });

    test('removes leading dots from key', () => {
      const dir = folder('safe');
      const result = dir.join('...hidden.file');
      expect(result).toMatch(/hidden\.file\.json$/);
    });

    test('limits key length to 100 characters', () => {
      const dir = folder('safe');
      const longKey = 'x'.repeat(200);
      const result = dir.join(longKey);
      const base = path.basename(result);
      expect(base.length).toBeLessThanOrEqual(105); // 100x + ".json"
      expect(base).toMatch(/^x{100}\.json$/);
    });

    test('replaces all unsafe characters with hyphens', () => {
      const dir = folder('safe');
      const result = dir.join('!@#$%^&*()=+[]{}<>/\\|;:\'",?');
      expect(path.basename(result)).toMatch(/^[a-zA-Z0-9._-]+\.json$/);
    });

    test('handles non-string key input (number)', () => {
      const dir = folder('safe');
      const result = dir.join(12345 as any);
      expect(result).toMatch(/12345\.json$/);
    });

    test('handles non-string key input (null)', () => {
      const dir = folder('safe');
      const result = dir.join(null as any);
      expect(result).toMatch(/null\.json$/);
    });

    test('handles non-string key input (object)', () => {
      const dir = folder('safe');
      const result = dir.join({ foo: 'bar' } as any);
      expect(path.basename(result)).toMatch(/^[a-zA-Z0-9._-]+\.json$/);
    });
  });

  describe('get()', () => {
    test('returns fallback on non-string key', async () => {
      const dir = folder('get');
      const value = await dir.get(123 as any, 'fallback');
      expect(value).toBe('fallback');
    });

    test('returns fallback if file does not exist', async () => {
      const dir = folder('get');
      const value = await dir.get('not-found', 'fallback');
      expect(value).toBe('fallback');
    });

    test('returns fallback if JSON is invalid or corrupted', async () => {
      const dir = folder('get');
      const file = dir.join('broken');
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, '{ not: json }');
      const val = await dir.get('broken', 'fallback');
      expect(val).toBe('fallback');
    });

    test('returns data if not expired', async () => {
      const dir = folder('get');
      await dir.set('key', { name: 'value' }, 60);
      const result = await dir.get('key', 'fallback');
      expect(result).toEqual({ name: 'value' });
    });

    test('returns fallback if expired', async () => {
      const dir = folder('get');

      await dir.set('key', 'expired', 60); // valid for 60s

      // simulate expiration by modifying meta
      const meta = dir['meta'].get('key') as any;
      meta.expiresAt = Date.now() - 1;

      // trigger cleanup
      jest.advanceTimersByTime(dir['timeout']);

      const result = await dir.get('key', 'fallback');
      expect(result).toBe('fallback');
    });

    test('returns fallback if addedAt or expiresAt are invalid (recovery fails)', async () => {
      const dir = folder('meta-recover-invalid');
      await fs.mkdir(dir.path, { recursive: true });

      const file = dir.join('bad-meta');
      const invalidMeta = {
        data: 'bad',
        addedAt: 'not-a-number',
        expiresAt: 'invalid',
      };
      await fs.writeFile(file, JSON.stringify(invalidMeta));

      // Metadata not preloaded — triggers recovery
      const result = await dir.get('bad-meta');
      const exists = await fs
        .access(file)
        .then(() => true)
        .catch(() => false);

      expect(result).toBe(null);
      expect(exists).toBe(false); // file should be deleted
    });

    test('recovers valid metadata and returns cached value', async () => {
      const dir = folder('meta-recover-valid');
      await fs.mkdir(dir.path, { recursive: true });

      const now = Date.now();
      const file = dir.join('recovered');
      const cache = {
        data: { name: 'restored' },
        addedAt: now - 1000,
        expiresAt: now + 60000,
      };
      await fs.writeFile(file, JSON.stringify(cache));

      // empty metadata map (recovery will run)
      dir['meta'].clear();

      const result = await dir.get('recovered', 'fallback');
      const meta = dir['meta'].get('recovered');

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
      const dir = folder('meta-recover-expired');
      await fs.mkdir(dir.path, { recursive: true });

      const file = dir.join('expired');
      const now = Date.now();
      const cache = {
        data: 'should-not-return',
        addedAt: now - 100000,
        expiresAt: now - 1000, // already expired
      };
      await fs.writeFile(file, JSON.stringify(cache));

      dir['meta'].clear(); // force recovery

      const result = await dir.get('expired', 'fallback');

      const exists = await fs
        .access(file)
        .then(() => true)
        .catch(() => false);

      expect(result).toBe('fallback');
      expect(dir['meta'].has('expired')).toBe(false);
      expect(exists).toBe(false); // file should be deleted
    });

    test('recovers multiple cache files and preserves only valid ones', async () => {
      const dir = folder('meta-recover-multi');
      const now = Date.now();

      await fs.mkdir(dir.path, { recursive: true });
      const validFile = dir.join('valid');
      const expiredFile = dir.join('expired');
      const invalidFile = dir.join('invalid');

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
      dir['meta'].clear();

      const valid = await dir.get('valid', 'fallback');
      const expired = await dir.get('expired', 'fallback');
      const invalid = await dir.get('invalid', 'fallback');

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

      expect(dir['meta'].has('valid')).toBe(true); // recovred
      expect(dir['meta'].has('expired')).toBe(false);
      expect(dir['meta'].has('invalid')).toBe(false);
    });

    test('recovers && returns cached value when expiresAt is null (forever cache)', async () => {
      const dir = folder('get-forever');
      await fs.mkdir(dir.path, { recursive: true });

      const file = dir.join('forever');
      const cache = {
        data: 'forever',
        addedAt: Date.now(),
        expiresAt: null, // forever cache
      };
      await fs.writeFile(file, JSON.stringify(cache));

      dir['meta'].clear(); // Force metadata recovery

      const result = await dir.get('forever', 'fallback');
      const meta = dir['meta'].get('forever');

      expect(result).toBe('forever');
      expect(meta).toBeDefined();
      expect(meta!.expiresAt).toBe(null);
    });

    test('deletes metadata entry if expired and already loaded in meta', async () => {
      const dir = folder('get-meta-delete');
      await dir.set('will-expire', 'bye', 1); // short-lived cache

      // Let it expire
      const meta = dir['meta'].get('will-expire')!;
      meta.expiresAt = Date.now() - 1000;

      // Call `get` — this triggers: return fallback + fs.rm + meta.delete
      const result = await dir.get('will-expire', 'fallback');

      expect(result).toBe('fallback');
      expect(dir['meta'].has('will-expire')).toBe(false);
    });
  });

  describe('set()', () => {
    test('creates cache file with correct structure and metadata', async () => {
      const dir = folder('set-basic');
      const key = 'user:data';
      const data = { id: 123, name: 'Alice' };

      await dir.set(key, data, 3600);

      const file = dir.join(key);
      const contents = await fs.readFile(file, 'utf-8');
      const parsed = JSON.parse(contents);
      const expiresAt = Date.now() + 3_600 * 1_000;
      const addedAt = Date.now();

      expect(parsed.data).toEqual(data);
      expect(parsed.addedAt).toBe(addedAt);
      expect(parsed.expiresAt).toBe(expiresAt);

      const meta = dir['meta'].get('user:data');
      expect(meta).toMatchObject({
        expiresAt,
        addedAt,
        key: 'user:data',
        path: file,
        used: 0,
      });
    });

    test('stores forever when no ttl is defined', async () => {
      const dir = folder('set-null-ttl');
      const key = 'forever';
      const data = { message: 'immortal' };

      await dir.set(key, data);

      const contents = await fs.readFile(dir.join(key), 'utf-8');
      const parsed = JSON.parse(contents);

      expect(parsed.expiresAt).toBe(null);
      const meta = dir['meta'].get('forever');
      expect(meta?.expiresAt).toBe(null);
    });

    test('automatically creates cache directory if missing', async () => {
      const dir = folder('set-mkdir');
      const key = 'auto-dir';
      const data = 'created';

      // Simulate missing directory
      await fs.rm(dir.path, { recursive: true, force: true });
      await dir.set(key, data, 60);

      const contents = await fs.readFile(dir.join(key), 'utf-8');
      const parsed = JSON.parse(contents);

      expect(parsed.data).toBe('created');
    });

    test('does not write if meta.size exceeds limit', async () => {
      const dir = folder('set-limit', { size: 1 }); // limit to 1 item
      const key1 = 'one';
      const key2 = 'two';

      await dir.set(key1, 1, 60);
      const cleanSpy = jest.spyOn(dir as any, 'cleanSpace');
      await dir.set(key2, 2, 60);

      expect(cleanSpy).toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    test('removes metadata and deletes the cache file', async () => {
      const dir = folder('delete-test');
      await dir.set('key', 'value');
      expect(dir['meta'].has('key')).toBe(true);

      await dir.delete('key');

      expect(dir['meta'].has('key')).toBe(false);

      // The file should be deleted
      await expect(fs.access(dir.join('key'))).rejects.toThrow();
    });

    test('does not throw if file does not exist', async () => {
      const dir = folder('delete-test');

      // Should not throw even if file is missing
      await expect(dir.delete('nonexistent')).resolves.toBeUndefined();
    });

    test('does not throw if key is invalid', async () => {
      const dir = folder('delete-test');

      // Should not throw even if file is missing
      await expect(dir.delete(null as any)).resolves.toBeUndefined();
    });
  });

  describe('clear()', () => {
    test('clears metadata and deletes all cached files for this dir', async () => {
      const dir = folder('clear-test');
      await dir.set('key1', 'value1');
      await dir.set('key2', 'value2');

      expect(dir['meta'].size).toBe(2);

      await dir.clear();

      // meta cleaned
      expect(dir['meta'].size).toBe(0);

      // dir removed
      await expect(fs.access(dir.path)).rejects.toThrow();

      // instance is dereferenced
      expect(Folder.folders.has('clear-test')).toBeFalsy();
    });

    test('deletes dir and stops cleaner', async () => {
      const dir = folder('to-delete');
      const stop = jest.spyOn(dir as any, 'stopCleaning');
      await dir.clear();
      expect(stop).toHaveBeenCalled();
      expect(Folder['folders'].has('to-delete')).toBe(false);
    });
  });

  describe('startCleaning()', () => {
    test('starts interval cleaner if not running', () => {
      const dir = folder('cleaning-test');
      dir['cleaner'] = null;
      dir['startCleaning']();
      expect(dir['cleaner']).not.toBeNull();
    });

    test('does nothing if cleaner is already running', () => {
      const dir = folder('cleaning-test');
      const oldCleaner = dir['cleaner'];
      dir['startCleaning']();
      expect(dir['cleaner']).toBe(oldCleaner);
    });
  });

  describe('stopCleaning()', () => {
    test('stops interval cleaner if running', () => {
      const dir = folder('cleaning-test');
      const clearSpy = jest.spyOn(global, 'clearInterval');
      const cleaner = dir['cleaner'];
      dir['stopCleaning']();
      expect(clearSpy).toHaveBeenCalledWith(cleaner);
      expect(dir['cleaner']).toBeNull();
    });

    test('does nothing if cleaner is not running', () => {
      const dir = folder('cleaning-test');
      dir['cleaner'] = null;
      const clearSpy = jest.spyOn(global, 'clearInterval');
      dir['stopCleaning']();
      expect(clearSpy).not.toHaveBeenCalled();
      expect(dir['cleaner']).toBeNull();
    });
  });

  describe('cleanSpace()', () => {
    test('deletes least-used entries based on trim percentage', async () => {
      const dir = folder('clean-space-test');
      dir['meta'].clear();

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
      await fs.mkdir(dir.path, { recursive: true });

      for (const entry of filesToCreate) {
        const filePath = dir.join(entry.key);

        await fs.writeFile(
          filePath,
          JSON.stringify({
            data: entry.key,
            addedAt: entry.addedAt,
            expiresAt: entry.addedAt + 100000,
          })
        );

        dir['meta'].set(entry.key, {
          key: entry.key,
          path: filePath,
          used: entry.used,
          addedAt: entry.addedAt,
          expiresAt: entry.addedAt + 100000,
        });
      }

      // Set trim to 40% => will delete 2 files (floor(5 * 40 / 100) = 2)
      dir['trim'] = 40;

      await dir['cleanSpace']();

      // Expect only 2 least-used entries deleted: 'd' (used=1), 'b' (used=2)
      expect(dir['meta'].has('d')).toBe(false);
      expect(dir['meta'].has('b')).toBe(false);

      // Others remain
      expect(dir['meta'].has('a')).toBe(true);
      expect(dir['meta'].has('c')).toBe(true);
      expect(dir['meta'].has('e')).toBe(true);

      // Files deleted on disk
      await expect(fs.access(dir.join('d'))).rejects.toThrow();
      await expect(fs.access(dir.join('b'))).rejects.toThrow();

      // Files remaining on disk
      await expect(fs.access(dir.join('a'))).resolves.toBeUndefined();
      await expect(fs.access(dir.join('c'))).resolves.toBeUndefined();
      await expect(fs.access(dir.join('e'))).resolves.toBeUndefined();
    });

    test('stops deleting after reaching target size', async () => {
      const dir = folder('clean-space-limit');
      dir['meta'].clear();

      // Setup 3 entries
      const now = Date.now();
      const filesToCreate = [
        { key: 'x', used: 1, addedAt: now - 1000 },
        { key: 'y', used: 2, addedAt: now - 2000 },
        { key: 'z', used: 3, addedAt: now - 3000 },
      ];

      await fs.mkdir(dir.path, { recursive: true });

      for (const entry of filesToCreate) {
        const filePath = dir.join(entry.key);
        await fs.writeFile(
          filePath,
          JSON.stringify({
            data: entry.key,
            addedAt: entry.addedAt,
            expiresAt: entry.addedAt + 100000,
          })
        );
        dir['meta'].set(entry.key, {
          key: entry.key,
          path: filePath,
          used: entry.used,
          addedAt: entry.addedAt,
          expiresAt: entry.addedAt + 100000,
        });
      }

      dir['trim'] = 33; // floor(3 * 33 / 100) = 0 (because floor(0.99) = 0)
      await dir['cleanSpace']();
      expect(dir['meta'].size).toBe(3); // no deletion because size = 0

      dir['trim'] = 34; // floor(3 * 34 / 100) = 1
      await dir['cleanSpace']();
      expect(dir['meta'].size).toBe(2);
      expect(dir['meta'].has('x')).toBe(false); // least used removed
    });
  });
});
