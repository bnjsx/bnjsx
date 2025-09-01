import { blue, green, isInt, isObj, isStr, orange, red, toSize } from '.';
import { MB } from '../core/modules/Form';

/**
 * Optional configuration settings for a Store instance.
 */
export interface StoreOptions {
  /** Maximum number of items allowed in the store. */
  size?: number;

  /** Maximum total memory space (in bytes) for all items. */
  space?: number;

  /** Interval (in seconds) at which expired items are cleaned up. */
  timeout?: number | boolean;

  /** Percentage of items to remove during cleanup. Default is 10%. */
  trim?: number;
}

/**
 * Internal structure representing a cached entry.
 */
type Entry = {
  /** The actual value being cached. */
  value: any;

  /** Approximate memory size in bytes. */
  space: number;

  /** How many times this entry has been accessed. */
  used: number;

  /** Timestamp (ms) when the entry expires, or null if it doesn't expire. */
  expiresAt: number | null;

  /** Timestamp (ms) when the entry was added. */
  addedAt: number;
};

/**
 * A lightweight in-memory key-value store with optional expiration and size limits.
 */
export class Store {
  /**
   * Internal registry of all Store instances (by key).
   * Used by the static `.get()` and `.delete()` methods to manage named instances.
   */
  private static stores = new Map<string, Store>();

  /**
   * The internal key-value store containing all cached entries.
   * Each value is an `Entry` object with metadata (space, used count, TTL, etc).
   */
  private store = new Map<string, Entry>();

  /**
   * Interval reference for the background cleaner that removes expired entries.
   * Null if cleaning is disabled/stopped.
   */
  private cleaner: NodeJS.Timeout | null = null;

  /**
   * Total estimated memory usage (in bytes) of all current entries.
   */
  private memory = 0;

  /** Maximum number of items allowed in the store. */
  private size: number;

  /** Maximum total memory space (in bytes) for all items. */
  private space: number;

  /** Interval (in seconds) at which expired items are cleaned up. */
  private timeout: number;

  /** Percentage of items to remove during cleanup. Default is 10%. */
  private trim: number;

  /** Store key */
  private key: string;

  /** Debug mode flag */
  private log: boolean;

  /**
   * Private constructor. Use `Store.get()` to create or retrieve a cache instance.
   *
   * @param ops - Optional configuration object.
   * Validates and defaults to sane values if omitted or invalid.
   */
  constructor(key?: string, ops?: StoreOptions) {
    key = isStr(key) ? key : '__default__';

    if (Store.stores.has(key)) return Store.stores.get(key);

    if (!isObj(ops)) ops = {};

    const { size, trim, timeout, space } = ops;
    this.size = isInt(size) && size > 0 ? size : 50_000;
    this.space = isInt(space) && space > 0 ? space : 10 * MB;
    this.timeout = isInt(timeout) && timeout > 0 ? timeout * 1000 : 60 * 1000;
    this.trim = isInt(trim) && trim > 0 && trim <= 100 ? ops.trim : 10;

    if (timeout !== false) this.startCleaning();

    Store.stores.set(key, this);
    this.key = key;
  }

  // ─── Instance API ───────────────────────────────────────────

  /**
   * Stores a value in the cache with an optional TTL.
   * If the store exceeds size or space limits, a cleanup is triggered first.
   *
   * @param key - The key to associate with the value.
   * @param value - The value to cache.
   * @param ttl - Time-to-live in seconds.
   */
  public set(key: string, value: any, ttl?: number): void {
    if (!isInt(ttl)) ttl = null;
    const expiresAt = ttl !== null ? Date.now() + ttl * 1000 : ttl;
    const space = this.estimateSpace(value);

    if (this.memory + space >= this.space) {
      return this.cleanSpace();
    }

    if (this.store.size >= this.size) {
      return this.cleanSpace();
    }

    const item = this.store.get(key);
    if (item) this.memory -= item.space;

    this.store.set(key, {
      value,
      space,
      used: 0,
      addedAt: Date.now(),
      expiresAt,
    });

    this.memory += space;

    if (this.log) this.debug();
  }

  /**
   * Retrieves a cached value by key. If the key doesn't exist or has expired,
   * the fallback value is returned instead.
   *
   * @template T
   * @param key The key to look up.
   * @param fallback The default value to return if not found.
   * @returns The cached value or the fallback.
   */
  public get<T = any>(key: string, fallback: T = null): T {
    const entry = this.store.get(key);
    if (!entry) return fallback;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.delete(key);
      return fallback;
    }

    entry.used++;

    if (this.log) this.debug();
    return entry.value;
  }

  /**
   * Removes an entry from the cache by key, and updates total space.
   *
   * @param key - The key to delete.
   */
  public delete(key: string): void {
    const entry = this.store.get(key);
    if (!entry) return;

    this.memory -= entry.space;
    this.store.delete(key);
  }

  /**
   * Clear and dereference your store.
   */
  public clear(): void {
    this.memory = 0;
    this.store.clear();
    this.stopCleaning();
    Store.stores.delete(this.key);
  }

  /**
   * Returns the total memory usage of the store in a human-readable format.
   * Example: `1.2 MB`, `850 KB`, `12 bytes`
   *
   * @returns The formatted memory usage.
   */
  public usage(): string {
    return toSize(this.memory);
  }

  /**
   * Returns the total memory usage of the store in raw bytes.
   *
   * @returns The memory usage in bytes.
   */
  public bytes(): number {
    return this.memory;
  }

  /**
   * Returns the total number of items in the store.
   *
   * @returns The number of items.
   */
  public length(): number {
    return this.store.size;
  }

  /**
   * Outputs a clean, debug summary of this store.
   */
  public debug(): void {
    this.log = true;
    const name = this.key;

    const keys = Array.from(this.store.keys());
    const usageStr = toSize(this.memory);
    const totalStr = toSize(this.space); // Example: "10 MB"
    const usagePct = ((this.memory / this.space) * 100).toFixed(2);
    const cleanerStr = this.cleaner
      ? `every ${this.timeout / 1000}s`
      : 'disabled';

    const stats = [
      [green('Name:'), red(name)],
      [green('Items:'), `${this.store.size} / ${this.size}`],
      [green('Memory:'), `${usageStr} / ${totalStr} (${usagePct}%)`],
      [green('Cleaner:'), cleanerStr],
      [green('Keys:'), keys.length > 0 ? `${keys.length} keys` : red('none')],
    ];

    console.log(blue(`\n╭─ Store Debug ────────────────────────────────`));
    for (const [label, value] of stats) {
      console.log(`│ ${label.padEnd(10)} ${value}`);
    }

    if (keys.length > 0) {
      console.log(blue(`├─ Key Metadata ───────────────────────────────`));
      for (const [key, entry] of this.store.entries()) {
        const size = toSize(entry.space);
        const used = `${entry.used} hit${entry.used === 1 ? '' : 's'}`;
        const ttl = entry.expiresAt
          ? new Date(entry.expiresAt).toLocaleString()
          : orange('∞');

        console.log(
          `│ ${red(key.padEnd(8))} size: ${size.padEnd(8)} used: ${used.padEnd(
            8
          )} expires: ${ttl}`
        );
      }
    }

    console.log(blue(`╰──────────────────────────────────────────────\n`));
  }

  /**
   * Estimates the size of a value in bytes by serializing it as JSON.
   *
   * @param value - The value to estimate space for.
   * @returns The estimated byte size of the value.
   */
  private estimateSpace(value: any): number {
    try {
      return Buffer.byteLength(JSON.stringify(value), 'utf8');
    } catch {
      return 0;
    }
  }

  /**
   * Starts the automatic cleanup process to periodically remove expired entries.
   */
  private startCleaning(): void {
    if (this.cleaner) return;
    this.cleaner = setInterval(() => this.cleanExpired(), this.timeout);
  }

  /**
   * Stops the periodic cleanup process if it's running.
   */
  private stopCleaning(): void {
    if (this.cleaner) clearInterval(this.cleaner);
    this.cleaner = null;
  }

  /**
   * Removes all expired entries from the store.
   * Called automatically at intervals defined by `ops.timeout`.
   */
  private cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.delete(key);
      }
    }
  }

  /**
   * Frees memory space by deleting the least used entries.
   * Deletes entries until `trim` percent of the total allowed space is cleared.
   */
  private cleanSpace(): void {
    const bytes = Math.floor((this.memory * this.trim) / 100);
    const entries = Array.from(this.store.entries());
    entries.sort(([, a], [, b]) => a.used - b.used || a.addedAt - b.addedAt);

    let freed = 0;

    while (this.store.size > 0 && freed < bytes) {
      const [key, entry] = entries.shift()!;
      this.delete(key);
      freed += entry.space;
    }
  }
}

/**
 * Retrieves a `__default__` store instance using the provided options.
 *
 * @param ops Configuration options for the store.
 * @returns A new `Store` instance.
 */
export function store(ops?: StoreOptions): Store;

/**
 * Retrieves or creates a store instance with the given key.
 *
 * @param key Unique name for the store instance.
 * @param ops Optional configuration options for the store.
 * @returns The existing or newly created `Store` instance.
 */
export function store(key: string, ops?: StoreOptions): Store;

/**
 * Retrieves a named `Store` instance from the internal registry.
 * If it doesn't exist yet, a new instance is created using the provided options.
 */
export function store(...args: any[]): Store {
  const [_1, _2] = args;

  if (isObj(_1)) return new Store(null, _1);
  return new Store(_1, _2);
}
