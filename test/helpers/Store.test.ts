import { toSize } from '../../src/helpers';
import { Store } from '../../src/helpers/Store';

jest.useFakeTimers();
jest.spyOn(global, 'setInterval');

describe('Store', () => {
  afterEach(() => {
    jest.clearAllMocks();
    Store['stores'].clear();
  });

  describe('Store.get()', () => {
    test('returns existing instance by key', () => {
      const a = Store.get('shared');
      const b = Store.get('shared');
      expect(a).toBe(b);
    });

    test('creates new instance with default key when key is not a string', () => {
      const store = Store.get({} as any);
      expect(store['key']).toBe('__default__');
    });

    test('defaults size if invalid', () => {
      const store = Store.get('bad-size', { size: -1 });
      expect(store['size']).toBe(50_000);
    });

    test('accepts valid size', () => {
      const store = Store.get('valid-size', { size: 100 });
      expect(store['size']).toBe(100);
    });

    test('defaults space if invalid', () => {
      const store = Store.get('bad-space', { space: -100 });
      expect(store['space']).toBe(10 * 1024 * 1024); // 10 MB
    });

    test('accepts valid space', () => {
      const store = Store.get('valid-space', { space: 12345 });
      expect(store['space']).toBe(12345);
    });

    test('defaults timeout if invalid', () => {
      const store = Store.get('bad-timeout', { timeout: 0 });
      expect(store['timeout']).toBe(60 * 1000);
    });

    test('accepts valid timeout', () => {
      const store = Store.get('valid-timeout', { timeout: 45 });
      expect(store['timeout']).toBe(45 * 1000);
    });

    test('defaults trim if invalid or out of range', () => {
      const store1 = Store.get('bad-trim-low', { trim: -10 });
      const store2 = Store.get('bad-trim-high', { trim: 150 });
      const store3 = Store.get('bad-trim-nonint', { trim: 'x' as any });
      expect(store1['trim']).toBe(10);
      expect(store2['trim']).toBe(10);
      expect(store3['trim']).toBe(10);
    });

    test('accepts valid trim between 1 and 100', () => {
      const store = Store.get('valid-trim', { trim: 30 });
      expect(store['trim']).toBe(30);
    });

    test('defaults everything if options is not an object', () => {
      const store = Store.get('not-obj', null as any);
      expect(store['size']).toBe(50_000);
      expect(store['space']).toBe(10 * 1024 * 1024);
      expect(store['timeout']).toBe(60 * 1000);
      expect(store['trim']).toBe(10);
    });

    test('starts cleaner on initialization', () => {
      const spy = jest.spyOn(global, 'setInterval');
      Store.get('clean-start');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('Store.delete()', () => {
    test('deletes named store and clears memory', () => {
      const store = Store.get('delete-me');
      const stop = jest.spyOn(store as any, 'stopCleaning');
      Store.delete('delete-me');
      expect(stop).toHaveBeenCalled();
      expect(Store['stores'].has('delete-me')).toBe(false);
    });

    test('does nothing if store not found', () => {
      expect(() => Store.delete('missing')).not.toThrow();
    });
  });

  describe('set()', () => {
    test('stores value and increments memory', () => {
      const store = Store.get('set');
      store.set('foo', { a: 1 });
      expect(store['store'].has('foo')).toBe(true);
      expect(store.length()).toBe(1);
    });

    test('stores forever if invalid TTL is provided', () => {
      const store = Store.get('default-ttl');
      store.set('a', 'value', 'invalid' as any);
      const entry = store['store'].get('a')!;
      expect(entry.expiresAt).toBe(null);
    });

    test('triggers cleanSpace when memory exceeds limit', () => {
      const store = Store.get('space-limited', { space: 1 });
      const cleanSpy = jest.spyOn(store as any, 'cleanSpace');
      store.set('x', { big: 'data' });
      expect(cleanSpy).toHaveBeenCalled();
    });

    test('triggers cleanSpace when size exceeds limit', () => {
      const store = Store.get('size-limited', { size: 1 });
      store.set('a', 1);
      const spy = jest.spyOn(store as any, 'cleanSpace');
      store.set('b', 2);
      expect(spy).toHaveBeenCalled();
    });

    test('update existing values by keys', () => {
      const store = Store.get('replace');
      store.set('x', { a: 1 });
      const firstMem = store['memory'];
      store.set('x', { a: 12345 });
      expect(store['memory']).not.toBe(firstMem);
    });
  });

  describe('get()', () => {
    test('returns stored value if not expired', () => {
      const store = Store.get('getter');
      store.set('key', 'value');
      expect(store.get('key')).toBe('value');
    });

    test('returns fallback if value is missing', () => {
      const store = Store.get('getter');
      expect(store.get('missing')).toBe(null);
    });

    test('returns fallback and deletes if expired', () => {
      const store = Store.get('expired');
      store.set('key', 'value', 1);
      const entry = store['store'].get('key')!;
      entry.expiresAt = Date.now() - 1000;
      const result = store.get('key', 'fallback');
      expect(result).toBe('fallback');
      expect(store['store'].has('key')).toBe(false);
    });
  });

  describe('delete()', () => {
    test('removes item and reduces memory', () => {
      const store = Store.get('deleter');
      store.set('x', { foo: 'bar' });
      const before = store['memory'];
      store.delete('x');
      expect(store['memory']).toBeLessThan(before);
      expect(store.get('x')).toBe(null);
    });

    test('does nothing if key not found', () => {
      const store = Store.get('safe-delete');
      expect(() => store.delete('nope')).not.toThrow();
    });
  });

  describe('clear()', () => {
    test('clears all keys and resets memory', () => {
      const store = Store.get('clearer');
      store.set('a', 1);
      store.set('b', 2);
      store.clear();
      expect(store.length()).toBe(0);
      expect(store['memory']).toBe(0);
    });
  });

  describe('usage()', () => {
    test('returns human-readable memory string', () => {
      const store = Store.get('usage');
      const data = { b: 'c' };
      const size = Buffer.byteLength(JSON.stringify(data));
      store.set('a', data);
      const usage = store.usage();
      expect(usage).toBe(toSize(size));
    });
  });

  describe('bytes()', () => {
    test('returns numeric memory usage', () => {
      const store = Store.get('bytes');
      const data = { b: 'c' };
      const size = Buffer.byteLength(JSON.stringify(data));
      store.set('a', data);
      expect(store.bytes()).toBe(size);
    });
  });

  describe('length()', () => {
    test('returns total number of items', () => {
      const store = Store.get('length');
      store.set('a', 1);
      store.set('b', 2);
      expect(store.length()).toBe(2);
    });
  });

  describe('Store.debug()', () => {
    let store: Store;
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      store = Store.get('debug-test');
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterAll(() => {
      store.clear();
      consoleSpy.mockRestore();
    });

    test('runs without error when store is empty', () => {
      expect(() => store.debug()).not.toThrow();
    });

    test('logs key metadata for one cached item with TTL', () => {
      store.set('user', { id: 1 }, 3600); // expires in 1 hour
      expect(() => store.debug()).not.toThrow();
    });

    test('logs key metadata for one cached item with no expiration (∞)', () => {
      store.set('session', 'forever'); // no expiration
      expect(() => store.debug()).not.toThrow();
    });

    test('handles multiple cached keys with different usage counts', () => {
      store.set('a', 'value1', 3600);
      store.set('b', 'value2', 3600);
      store.get('a'); // increment usage for 'a'
      store.get('a'); // increment usage for 'a'
      store.get('b'); // increment usage for 'b'

      expect(() => store.debug()).not.toThrow();
    });

    test('debug sets log flag to true', () => {
      expect(store['log']).toBeFalsy();
      store.debug();
      expect(store['log']).toBeTruthy();
    });

    test('debug shows cleaner as disabled when no interval', () => {
      // Stop cleaner manually
      store['stopCleaning']();
      expect(() => store.debug()).not.toThrow();
    });

    test('debug shows cleaner interval when running', () => {
      // Cleaner started by default in constructor
      expect(store['cleaner']).not.toBeNull();
      expect(() => store.debug()).not.toThrow();
    });

    test('.set() calls debug when logging enabled', () => {
      store.debug(); // enable debug
      const debugSpy = jest.spyOn(store, 'debug');
      store.set('key', 'val');
      expect(debugSpy).toHaveBeenCalled();
      debugSpy.mockRestore();
    });

    test('.get() calls debug when logging enabled', () => {
      store.debug(); // enable debug
      store.set('key', 'val');
      const debugSpy = jest.spyOn(store, 'debug');
      store.get('key');
      expect(debugSpy).toHaveBeenCalled();
      debugSpy.mockRestore();
    });
  });

  describe('cleanExpired()', () => {
    test('removes only expired items', () => {
      const store = Store.get('expired-clean');
      store.set('x', 1, 1);
      store.set('y', 2); // forever
      const metaX = store['store'].get('x')!;
      metaX.expiresAt = Date.now() - 1000;
      store['cleanExpired']();
      expect(store.get('x')).toBe(null);
      expect(store.get('y')).toBe(2);
    });
  });

  describe('cleanSpace()', () => {
    test('frees memory by deleting least-used entries', () => {
      const store = Store.get('cleaner', { trim: 100 });

      for (let i = 0; i < 10; i++) {
        store.set(`key_${i}`, { data: i });
      }

      const before = store.length();
      store['cleanSpace']();
      const after = store.length();
      expect(after).toBeLessThan(before);
      expect(before).toBe(10);
      expect(after).toBe(0);
    });
  });

  describe('estimateSpace()', () => {
    test('returns 0 on invalid value', () => {
      const store = Store.get('estimator');
      const result = (store as any).estimateSpace(() => {});
      expect(result).toBe(0);
    });

    test('returns byte length of JSON-encoded value', () => {
      const store = Store.get('estimator');
      const result = (store as any).estimateSpace({ a: 1 });
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('startCleaning()', () => {
    test('starts interval cleaner if not already running', () => {
      const store = Store.get('cleaner');
      (store as any).stopCleaning();
      store['startCleaning']();
      expect(setInterval).toHaveBeenCalled();
    });

    test('does nothing if cleaner already exists', () => {
      const store = Store.get('cleaner2');
      const spy = jest.spyOn(global, 'setInterval');
      store['startCleaning'](); // first call
      store['startCleaning'](); // second call
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopCleaning()', () => {
    test('clears interval cleaner if running', () => {
      const store = Store.get('stopper');
      const clearSpy = jest.spyOn(global, 'clearInterval');
      store['stopCleaning']();
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
      const store = Store.get('test-size', { size: 10, trim: 50 });

      for (let i = 0; i < 10; i++) {
        store.set('key' + i, i);
      }

      expect(store.length()).toBe(10);

      store.set('overflow', 'trigger-clean');

      // 50% is cleaned
      expect(store.length()).toBeLessThanOrEqual(5);
    });
  });

  describe('Space-based cleanup', () => {
    test('cleans enough entries to free configured space', () => {
      const store = Store.get('test-space', { space: 602, trim: 50 });

      const value = 'x'.repeat(98); // 100 bytes

      for (let i = 1; i <= 6; i++) {
        store.set('key' + i, value);
      }

      expect(store.bytes()).toBe(600);

      store.set('overflow', value); // trigger cleaning

      expect(store.bytes()).toBe(300); // 50% of 600 is 300
      expect(store.length()).toBe(3); // 3 items removed
    });
  });

  describe('Cleanup sorting behavior', () => {
    test('removes least used and oldest entries first during cleanSpace()', () => {
      const store = Store.get('cleanup-sort', { space: 1000, trim: 50 });

      // Add 4 entries with different used counts and addedAt times
      store.set('key1', 'a'.repeat(100));
      store.set('key2', 'b'.repeat(100));
      store.set('key3', 'c'.repeat(100));
      store.set('key4', 'd'.repeat(100));

      // Manually adjust usage counts and addedAt timestamps to control sorting
      const now = Date.now();
      const s = store['store'];

      // key1: used=5, addedAt = now - 4000
      s.get('key1')!.used = 5;
      s.get('key1')!.addedAt = now - 4000;

      // key2: used=3, addedAt = now - 3000
      s.get('key2')!.used = 3;
      s.get('key2')!.addedAt = now - 3000;

      // key3: used=3, addedAt = now - 5000 (older than key2)
      s.get('key3')!.used = 3;
      s.get('key3')!.addedAt = now - 5000;

      // key4: used=10, addedAt = now - 1000
      s.get('key4')!.used = 10;
      s.get('key4')!.addedAt = now - 1000;

      // Current memory usage should be 400 * ~100 bytes = ~400
      expect(store.length()).toBe(4);

      // Trigger cleanSpace() to free 50% of used memory
      store['cleanSpace']();

      // It should remove the least used and oldest first:
      // Sorted order for removal: key3 (used=3, oldest), key2 (used=3), key1 (used=5), key4 (used=10)
      // To free 50%, it will remove key3 and key2 (2 * 100 bytes = 200 bytes freed)
      // Remaining keys should be key1 and key4
      expect(store.length()).toBe(2);
      expect(store['store'].has('key3')).toBe(false);
      expect(store['store'].has('key2')).toBe(false);
      expect(store['store'].has('key1')).toBe(true);
      expect(store['store'].has('key4')).toBe(true);
    });
  });

  describe('Expiration and cleaner', () => {
    test('automatically removes expired entries when cleaner runs', () => {
      jest.useFakeTimers();

      const store = Store.get('test-expire', { timeout: 1 });

      store.set('temp', 'abc', 5); // 5 seconds

      const entry = store['store'].get('temp')!;
      entry.expiresAt = Date.now() - 1000; // simulate expiration

      jest.advanceTimersByTime(1000); // cleaner should run

      expect(store.get('temp')).toBe(null);
    });
  });

  describe('Combined usage and pressure test', () => {
    test('handles expiration, size and space limits together', () => {
      jest.useFakeTimers();
      const store = Store.get('full-test', {
        size: 4,
        space: 400,
        timeout: 2,
        trim: 50, // 50% of 4 = 2
      });

      for (let i = 1; i <= 4; i++) {
        store.set('u' + i, { id: i, name: 'User ' + i }, 5);
      }

      expect(store.length()).toBe(4);

      // Expire 2 entries
      store['store'].get('u1')!.expiresAt = Date.now() - 1000;
      store['store'].get('u2')!.expiresAt = Date.now() - 1000;

      // Trigger cleaner
      jest.advanceTimersByTime(2000);
      expect(store.length()).toBe(2); // 2 are expired

      // Fill more to exceed size again
      store.set('u5', 'extra');
      store.set('u6', 'extra');
      store.set('u7', 'overflow'); // trigger cleanup

      expect(store.length()).toBe(2); // 50% is cleaned up
    });
  });
});
