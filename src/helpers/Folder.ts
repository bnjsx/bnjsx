import * as fs from 'fs/promises';
import { config } from '../config';
import { isInt, isNull, isObj, isStr } from '.';
import { resolve } from 'path';

/**
 * Configuration options for a Folder cache.
 */
export interface FolderOptions {
  /**
   * Time-to-clean (TTC) in seconds. Controls how often expired
   * items are checked and removed automatically.
   * Default: 60 seconds.
   */
  timeout?: number | boolean;

  /**
   * Percentage of cache files to trim when `size` is exceeded.
   * Should be between 1 and 100. Default: 10.
   */
  trim?: number;

  /**
   * Maximum number of files allowed in this folder.
   * Once exceeded, a trim is triggered.
   */
  size?: number;
}

/**
 * Metadata about a cached entry.
 */
interface Meta {
  key: string;
  path: string;
  used: number;
  addedAt: number;
  expiresAt: number | null;
}

/**
 * A file-based caching helper that stores values as individual JSON files
 * in a dedicated folder.
 */
export class Folder {
  /**
   * Internal map of all folder cache instances.
   * Ensures each folder is only instantiated once per key.
   */
  static folders = new Map<string, Folder>();

  /**
   * Absolute path to the directory on disk used for storing cache files.
   */
  public readonly path: string;

  /**
   * The folder name.
   */
  private name: string;

  /**
   * Time interval in milliseconds between periodic cleanup runs to remove expired cache files.
   */
  private timeout: number;

  /**
   * Percentage of files to clear when cleaning cache space (e.g., 10 means clear 10%).
   */
  private trim: number;

  /**
   * Maximum number of cache files allowed in the folder before triggering cleanup.
   */
  private size: number;

  /**
   * NodeJS timer handle for the periodic cleaning interval.
   * `null` if no cleaner is currently running.
   */
  private cleaner: NodeJS.Timeout | null = null;

  /**
   * In-memory metadata map tracking cache entries by key.
   * Stores metadata such as file path, usage count, timestamps, and expiration.
   */
  private meta = new Map<string, Meta>();

  /**
   * Internal constructor. Use `Folder.get()` instead.
   *
   * @param ops Optional configuration options.
   */
  constructor(name?: string, ops?: FolderOptions) {
    name = isStr(name) ? name : '__default__';

    if (Folder.folders.has(name)) return Folder.folders.get(name);

    if (!isObj(ops)) ops = {};

    const { size, trim, timeout } = ops;

    this.size = isInt(size) && size > 0 ? size : 500;
    this.trim = isInt(trim) && trim > 0 && trim <= 100 ? trim : 10;
    this.path = resolve(config().resolveSync(), 'cache', name);
    this.timeout = isInt(timeout) && timeout > 0 ? timeout * 1000 : 60 * 1000;

    if (timeout !== false) this.startCleaning();

    Folder.folders.set(name, this);
    this.name = name;
  }

  /**
   * Resolves a safe absolute path for the cached file corresponding to the given key.
   *
   * The key is sanitized by:
   * - Replacing unsafe characters with hyphens.
   * - Removing leading dots to prevent hidden or relative paths.
   * - Limiting the length to 100 characters for cross-platform safety.
   *
   * @param key - The cache key to convert into a safe filename.
   * @returns The absolute path to the JSON cache file.
   */
  public join(key: string): string {
    if (!isStr(key)) key = String(key);

    const safe = key
      .replace(/[^a-zA-Z0-9._-]/g, '-') // Replace unsafe characters
      .replace(/^\.+/, '') // Remove leading dots
      .slice(0, 100); // Limit length (safe on all OS)

    return resolve(this.path, safe + '.json');
  }

  /**
   * Retrieves cached data for the given key.
   *
   * @param key The cache file key.
   * @param fallback Value to return if cache is missing or expired.
   * @returns Cached data or fallback.
   */
  public async get(key: string, fallback: any = null): Promise<any> {
    if (!isStr(key)) return fallback;

    try {
      const now = Date.now();
      const path = this.join(key);
      const raw = await fs.readFile(path, 'utf8');
      const { data, addedAt, expiresAt } = JSON.parse(raw);

      let meta = this.meta.get(key);

      if (!meta) {
        if (!isInt(addedAt) || (!isInt(expiresAt) && !isNull(expiresAt))) {
          await fs.rm(path);
          return fallback;
        }

        if (expiresAt !== null && now > expiresAt) {
          await fs.rm(path);
          return fallback;
        }

        meta = { key, path, used: 0, addedAt, expiresAt };
        this.meta.set(key, meta);
      }

      if (meta.expiresAt === null || now < meta.expiresAt) {
        meta.used++;
        return data;
      }

      await fs.rm(path);
      this.meta.delete(key);
    } catch {}

    return fallback;
  }

  /**
   * Stores a value in the folder-based cache using the given key.
   *
   * @param key - Unique key to identify the cached entry.
   * @param data - Data to cache (must be JSON-serializable).
   * @param ttl - Optional time-to-live in seconds. If omitted, the data is cached forever.
   */
  public async set(key: string, data: any, ttl?: number): Promise<void>;

  /**
   * @internal
   * Internal overload used to retry once if the cache directory is missing.
   *
   * @param key - Cache key.
   * @param data - Data to store.
   * @param ttl - Time-to-live in seconds. Must be a positive integer.
   * @param retry - Whether to retry once if directory is missing.
   */
  public async set(
    key: string,
    data: any,
    ttl?: number,
    retry?: boolean
  ): Promise<void>;

  // Actual implementation
  public async set(
    key: string,
    data: any,
    ttl?: number,
    retry: boolean = true
  ): Promise<void> {
    if (!isInt(ttl)) ttl = null;
    const expiresAt = ttl !== null ? Date.now() + ttl * 1000 : ttl;

    try {
      const path = this.join(key);
      const addedAt = Date.now();

      if (this.meta.size >= this.size) return this.cleanSpace();

      const payload = {
        data,
        addedAt,
        expiresAt,
      };

      await fs.writeFile(path, JSON.stringify(payload));

      this.meta.set(key, {
        key,
        path,
        used: 0,
        addedAt,
        expiresAt,
      });
    } catch (err: any) {
      if (retry && err && err.code === 'ENOENT') {
        try {
          await fs.mkdir(this.path, { recursive: true });
          return this.set(key, data, ttl, false);
        } catch {}
      }
    }
  }

  /**
   * Deletes a cache file and its metadata by key.
   *
   * @param key Cache file key to delete.
   */
  public async delete(key: string): Promise<void> {
    if (!isStr(key)) return;

    try {
      this.meta.delete(key);
      await fs.rm(this.join(key));
    } catch {}
  }

  /**
   * Fully removes this Folder instance and its cache.
   *
   * Deletes the folder on disk, clears metadata and cleanup intervals,
   * and dereferences the singleton instance.
   *
   * @returns A promise that resolves when cleanup completes.
   */
  public async clear(): Promise<void> {
    try {
      await fs.rm(this.path, { recursive: true, force: true });
      Folder.folders.delete(this.name);
      this.stopCleaning();
      this.meta.clear();
    } catch {}
  }

  /**
   * Starts the background interval that periodically cleans expired cache files.
   * Does nothing if already running.
   */
  private startCleaning(): void {
    if (this.cleaner) return;
    this.cleaner = setInterval(() => this.cleanExpired(), this.timeout);
  }

  /**
   * Stops the background cleaner if it's currently running.
   */
  private stopCleaning(): void {
    if (!this.cleaner) return;
    clearInterval(this.cleaner);
    this.cleaner = null;
  }

  /**
   * Removes expired cache files from disk and memory.
   */
  private async cleanExpired(): Promise<void> {
    const now = Date.now();

    for (const [key, meta] of this.meta.entries()) {
      if (meta.expiresAt !== null && now > meta.expiresAt) {
        try {
          await fs.rm(meta.path);
          this.meta.delete(key);
        } catch {}
      }
    }
  }

  /**
   * Frees space by deleting least-used cached files based on cleanup percentage.
   */
  private async cleanSpace(): Promise<void> {
    const entries = Array.from(this.meta.entries());
    const size = Math.floor((this.meta.size * this.trim) / 100);

    entries.sort(([, a], [, b]) => a.used - b.used);

    let count = 0;

    for (const [key, meta] of entries) {
      try {
        if (count >= size) break;
        await fs.rm(meta.path);
        this.meta.delete(key);
        count++;
      } catch {}
    }
  }
}

/**
 * Retrieves the `__default__` folder instance using the provided options.
 *
 * @param ops Configuration options for the folder.
 * @returns A new `Store` instance.
 */
export function folder(ops?: FolderOptions): Folder;

/**
 * Retrieves or creates a folder instance with the given key.
 *
 * @param key Unique name for the folder instance.
 * @param ops Optional configuration options for the folder.
 * @returns The existing or newly created `Folder` instance.
 */
export function folder(key: string, ops?: FolderOptions): Folder;

/**
 * Retrieves a named `Folder` instance from the internal registry.
 * If it doesn't exist yet, a new instance is created using the provided options.
 */
export function folder(...args: any[]): Folder {
  const [_1, _2] = args;

  if (isObj(_1)) return new Folder(null, _1);
  return new Folder(_1, _2);
}
