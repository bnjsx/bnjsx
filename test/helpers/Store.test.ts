import { toSize } from '../../src/helpers';
import { store, Store } from '../../src/helpers/Store';

jest.useFakeTimers();
jest.spyOn(global, 'setInterval');

describe('Store', () => {
  afterEach(() => {
    jest.clearAllMocks();
    Store['stores'].clear();
  });

  describe('store()', () => {
    test('returns existing instance by key', () => {
      const a = store('shared');
      const b = store('shared');
      expect(a).toBe(b);
    });

    test('creates new instance with default key when key is not a string', () => {
      const s = store({} as any);
      expect(s['key']).toBe('__default__');
    });

    test('defaults size if invalid', () => {
      const s = store('bad-size', { size: -1 });
      expect(s['size']).toBe(50_000);
    });

    test('accepts valid size', () => {
      const s = store('valid-size', { size: 100 });
      expect(s['size']).toBe(100);
    });

    test('defaults space if invalid', () => {
      const s = store('bad-space', { space: -100 });
      expect(s['space']).toBe(10 * 1024 * 1024); // 10 MB
    });

    test('accepts valid space', () => {
      const s = store('valid-space', { space: 12345 });
      expect(s['space']).toBe(12345);
    });

    test('defaults timeout if invalid', () => {
      const s = store('bad-timeout', { timeout: 0 });
      expect(s['timeout']).toBe(60 * 1000);
    });

    test('accepts valid timeout', () => {
      const s = store('valid-timeout', { timeout: 45 });
      expect(s['timeout']).toBe(45 * 1000);
    });

    test('defaults trim if invalid or out of range', () => {
      const s1 = store('bad-trim-low', { trim: -10 });
      const s2 = store('bad-trim-high', { trim: 150 });
      const s3 = store('bad-trim-nonint', { trim: 'x' as any });
      expect(s1['trim']).toBe(10);
      expect(s2['trim']).toBe(10);
      expect(s3['trim']).toBe(10);
    });

    test('accepts valid trim between 1 and 100', () => {
      const s = store('valid-trim', { trim: 30 });
      expect(s['trim']).toBe(30);
    });

    test('defaults everything if options is not an object', () => {
      const s = store('not-obj', null as any);
      expect(s['size']).toBe(50_000);
      expect(s['space']).toBe(10 * 1024 * 1024);
      expect(s['timeout']).toBe(60 * 1000);
      expect(s['trim']).toBe(10);
    });

    test('starts cleaner on initialization', () => {
      const spy = jest.spyOn(global, 'setInterval');
      store('clean-start');
      expect(spy).toHaveBeenCalled();
    });

    test('does not start cleaner interval', () => {
      const spy = jest.spyOn(global, 'setInterval');
      const s = store('no-cleaner', { timeout: false });
      expect(spy).not.toHaveBeenCalled();
      expect(s['cleaner']).toBeNull();
      spy.mockClear();
    });
  });

  describe('set()', () => {
    test('stores value and increments memory', () => {
      const s = store('set');
      s.set('foo', { a: 1 });
      expect(s['store'].has('foo')).toBe(true);
      expect(s.length()).toBe(1);
    });

    test('stores forever if invalid TTL is provided', () => {
      const s = store('default-ttl');
      s.set('a', 'value', 'invalid' as any);
      const entry = s['store'].get('a')!;
      expect(entry.expiresAt).toBe(null);
    });

    test('triggers cleanSpace when memory exceeds limit', () => {
      const s = store('space-limited', { space: 1 });
      const cleanSpy = jest.spyOn(s as any, 'cleanSpace');
      s.set('x', { big: 'data' });
      expect(cleanSpy).toHaveBeenCalled();
    });

    test('triggers cleanSpace when size exceeds limit', () => {
      const s = store('size-limited', { size: 1 });
      s.set('a', 1);
      const spy = jest.spyOn(s as any, 'cleanSpace');
      s.set('b', 2);
      expect(spy).toHaveBeenCalled();
    });

    test('update existing values by keys', () => {
      const s = store('replace');
      s.set('x', { a: 1 });
      const firstMem = s['memory'];
      s.set('x', { a: 12345 });
      expect(s['memory']).not.toBe(firstMem);
    });
  });

  describe('get()', () => {
    test('returns stored value if not expired', () => {
      const s = store('getter');
      s.set('key', 'value');
      expect(s.get('key')).toBe('value');
    });

    test('returns fallback if value is missing', () => {
      const s = store('getter');
      expect(s.get('missing')).toBe(null);
    });

    test('returns fallback and deletes if expired', () => {
      const s = store('expired');
      s.set('key', 'value', 1);
      const entry = s['store'].get('key')!;
      entry.expiresAt = Date.now() - 1000;
      const result = s.get('key', 'fallback');
      expect(result).toBe('fallback');
      expect(s['store'].has('key')).toBe(false);
    });
  });

  describe('delete()', () => {
    test('removes item and reduces memory', () => {
      const s = store('deleter');
      s.set('x', { foo: 'bar' });
      const before = s['memory'];
      s.delete('x');
      expect(s['memory']).toBeLessThan(before);
      expect(s.get('x')).toBe(null);
    });

    test('does nothing if key not found', () => {
      const s = store('safe-delete');
      expect(() => s.delete('nope')).not.toThrow();
    });
  });

  describe('clear()', () => {
    test('clears all keys and resets memory', () => {
      const s = store('clearer');
      s.set('a', 1);
      s.set('b', 2);
      s.clear();
      expect(s.length()).toBe(0);
      expect(s['memory']).toBe(0);
    });
  });

  describe('usage()', () => {
    test('returns human-readable memory string', () => {
      const s = store('usage');
      const data = { b: 'c' };
      const size = Buffer.byteLength(JSON.stringify(data));
      s.set('a', data);
      const usage = s.usage();
      expect(usage).toBe(toSize(size));
    });
  });

  describe('bytes()', () => {
    test('returns numeric memory usage', () => {
      const s = store('bytes');
      const data = { b: 'c' };
      const size = Buffer.byteLength(JSON.stringify(data));
      s.set('a', data);
      expect(s.bytes()).toBe(size);
    });
  });

  describe('length()', () => {
    test('returns total number of items', () => {
      const s = store('length');
      s.set('a', 1);
      s.set('b', 2);
      expect(s.length()).toBe(2);
    });
  });

  describe('Store.debug()', () => {
    let s: Store;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      s = store('debug-test');
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterAll(() => {
      s.clear();
      consoleSpy.mockRestore();
    });

    test('runs without error when store is empty', () => {
      expect(() => s.debug()).not.toThrow();
    });

    test('logs key metadata for one cached item with TTL', () => {
      s.set('user', { id: 1 }, 3600); // expires in 1 hour
      expect(() => s.debug()).not.toThrow();
    });

    test('logs key metadata for one cached item with no expiration (∞)', () => {
      s.set('session', 'forever'); // no expiration
      expect(() => s.debug()).not.toThrow();
    });

    test('handles multiple cached keys with different usage counts', () => {
      s.set('a', 'value1', 3600);
      s.set('b', 'value2', 3600);
      s.get('a'); // increment usage for 'a'
      s.get('a'); // increment usage for 'a'
      s.get('b'); // increment usage for 'b'

      expect(() => s.debug()).not.toThrow();
    });

    test('debug sets log flag to true', () => {
      expect(s['log']).toBeFalsy();
      s.debug();
      expect(s['log']).toBeTruthy();
    });

    test('debug shows cleaner as disabled when no interval', () => {
      // Stop cleaner manually
      s['stopCleaning']();
      expect(() => s.debug()).not.toThrow();
    });

    test('debug shows cleaner interval when running', () => {
      // Cleaner started by default in constructor
      expect(s['cleaner']).not.toBeNull();
      expect(() => s.debug()).not.toThrow();
    });

    test('.set() calls debug when logging enabled', () => {
      s.debug(); // enable debug
      const debugSpy = jest.spyOn(s, 'debug');
      s.set('key', 'val');
      expect(debugSpy).toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    test('.get() calls debug when logging enabled', () => {
      s.debug(); // enable debug
      s.set('key', 'val');
      const debugSpy = jest.spyOn(s, 'debug');
      s.get('key');
      expect(debugSpy).toHaveBeenCalled();
      debugSpy.mockRestore();
    });
  });

  describe('cleanExpired()', () => {
    test('removes only expired items', () => {
      const s = store('expired-clean');
      s.set('x', 1, 1);
      s.set('y', 2); // forever
      const metaX = s['store'].get('x')!;
      metaX.expiresAt = Date.now() - 1000;
      s['cleanExpired']();
      expect(s.get('x')).toBe(null);
      expect(s.get('y')).toBe(2);
    });
  });

  describe('cleanSpace()', () => {
    test('frees memory by deleting least-used entries', () => {
      const s = store('cleaner', { trim: 100 });

      for (let i = 0; i < 10; i++) {
        s.set(`key_${i}`, { data: i });
      }

      const before = s.length();
      s['cleanSpace']();
      const after = s.length();
      expect(after).toBeLessThan(before);
      expect(before).toBe(10);
      expect(after).toBe(0);
    });
  });

  describe('estimateSpace()', () => {
    test('returns 0 on invalid value', () => {
      const s = store('estimator');
      const result = (s as any).estimateSpace(() => {});
      expect(result).toBe(0);
    });

    test('returns byte length of JSON-encoded value', () => {
      const s = store('estimator');
      const result = (s as any).estimateSpace({ a: 1 });
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('startCleaning()', () => {
    test('starts interval cleaner if not already running', () => {
      const s = store('cleaner');
      (s as any).stopCleaning();
      s['startCleaning']();
      expect(setInterval).toHaveBeenCalled();
    });

    test('does nothing if cleaner already exists', () => {
      const s = store('cleaner2');
      const spy = jest.spyOn(global, 'setInterval');
      s['startCleaning'](); // first call
      s['startCleaning'](); // second call
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopCleaning()', () => {
    test('clears interval cleaner if running', () => {
      const s = store('stopper');
      const clearSpy = jest.spyOn(global, 'clearInterval');
      s['stopCleaning']();
      expect(clearSpy).toHaveBeenCalled();
    });
  });
});

describe('Store - Real World Usage', () => {
  afterEach(() => {
    Store['stores'].clear();
  });

  describe('Size-based cleanup', () => {
    test('cleans correct number of entries when size is exceeded', () => {
      const s = store('test-size', { size: 10, trim: 50 });

      for (let i = 0; i < 10; i++) {
        s.set('key' + i, i);
      }

      expect(s.length()).toBe(10);

      s.set('overflow', 'trigger-clean');

      // 50% is cleaned
      expect(s.length()).toBeLessThanOrEqual(5);
    });
  });

  describe('Space-based cleanup', () => {
    test('cleans enough entries to free configured space', () => {
      const s = store('test-space', { space: 602, trim: 50 });

      const value = 'x'.repeat(98); // 100 bytes

      for (let i = 1; i <= 6; i++) {
        s.set('key' + i, value);
      }

      expect(s.bytes()).toBe(600);

      s.set('overflow', value); // trigger cleaning

      expect(s.bytes()).toBe(300); // 50% of 600 is 300
      expect(s.length()).toBe(3); // 3 items removed
    });
  });

  describe('Cleanup sorting behavior', () => {
    test('removes least used and oldest entries first during cleanSpace()', () => {
      const s = store('cleanup-sort', { space: 1000, trim: 50 });

      // Add 4 entries with different used counts and addedAt times
      s.set('key1', 'a'.repeat(100));
      s.set('key2', 'b'.repeat(100));
      s.set('key3', 'c'.repeat(100));
      s.set('key4', 'd'.repeat(100));

      // Manually adjust usage counts and addedAt timestamps to control sorting
      const now = Date.now();
      const _s = s['store'];

      // key1: used=5, addedAt = now - 4000
      _s.get('key1')!.used = 5;
      _s.get('key1')!.addedAt = now - 4000;

      // key2: used=3, addedAt = now - 3000
      _s.get('key2')!.used = 3;
      _s.get('key2')!.addedAt = now - 3000;

      // key3: used=3, addedAt = now - 5000 (older than key2)
      _s.get('key3')!.used = 3;
      _s.get('key3')!.addedAt = now - 5000;

      // key4: used=10, addedAt = now - 1000
      _s.get('key4')!.used = 10;
      _s.get('key4')!.addedAt = now - 1000;

      // Current memory usage should be 400 * ~100 bytes = ~400
      expect(s.length()).toBe(4);

      // Trigger cleanSpace() to free 50% of used memory
      s['cleanSpace']();

      // It should remove the least used and oldest first:
      // Sorted order for removal: key3 (used=3, oldest), key2 (used=3), key1 (used=5), key4 (used=10)
      // To free 50%, it will remove key3 and key2 (2 * 100 bytes = 200 bytes freed)
      // Remaining keys should be key1 and key4
      expect(s.length()).toBe(2);
      expect(s['store'].has('key3')).toBe(false);
      expect(s['store'].has('key2')).toBe(false);
      expect(s['store'].has('key1')).toBe(true);
      expect(s['store'].has('key4')).toBe(true);
    });
  });

  describe('Expiration and cleaner', () => {
    test('automatically removes expired entries when cleaner runs', () => {
      jest.useFakeTimers();

      const s = store('test-expire', { timeout: 1 });

      s.set('temp', 'abc', 5); // 5 seconds

      const entry = s['store'].get('temp')!;
      entry.expiresAt = Date.now() - 1000; // simulate expiration

      jest.advanceTimersByTime(1000); // cleaner should run

      expect(s.get('temp')).toBe(null);
    });
  });

  describe('Combined usage and pressure test', () => {
    test('handles expiration, size and space limits together', () => {
      jest.useFakeTimers();
      const s = store('full-test', {
        size: 4,
        space: 400,
        timeout: 2,
        trim: 50, // 50% of 4 = 2
      });

      for (let i = 1; i <= 4; i++) {
        s.set('u' + i, { id: i, name: 'User ' + i }, 5);
      }

      expect(s.length()).toBe(4);

      // Expire 2 entries
      s['store'].get('u1')!.expiresAt = Date.now() - 1000;
      s['store'].get('u2')!.expiresAt = Date.now() - 1000;

      // Trigger cleaner
      jest.advanceTimersByTime(2000);
      expect(s.length()).toBe(2); // 2 are expired

      // Fill more to exceed size again
      s.set('u5', 'extra');
      s.set('u6', 'extra');
      s.set('u7', 'overflow'); // trigger cleanup

      expect(s.length()).toBe(2); // 50% is cleaned up
    });
  });
});
