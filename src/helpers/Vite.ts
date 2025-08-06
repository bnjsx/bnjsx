import { config } from '../config';
import { existsSync, readFileSync } from 'fs';
import { resolve, extname } from 'path';

export type Manifest = {
  [key: string]: ManifestChunk;
};

export type ManifestChunk = {
  file: string;
  src?: string;
  isEntry?: boolean;
  imports?: string[];
  css?: string[];
  assets?: string[];
};

/**
 * Custom error class for Vite-related issues.
 */
export class ViteError extends Error {}

/**
 * Handles Vite asset injection for HTML templates.
 */
export class Vite {
  static cache?: Manifest;
  static url: string = 'http://localhost:5173';
  static css: RegExp = /\.(css|scss|sass|less|pcss)$/i;
  static js: RegExp = /\.(js|mjs|cjs|ts|mts|cts|jsx|tsx)$/i;

  /**
   * Loads and caches the Vite `manifest.json` file.
   * @returns The parsed manifest JSON.
   * @throws `ViteError` If the manifest file is not found or invalid.
   */
  static manifest(): Manifest {
    if (this.cache) return this.cache;

    const root = config().resolveSync();
    const manifestPath = resolve(root, 'public/.vite/manifest.json');

    if (!existsSync(manifestPath)) {
      throw new ViteError(
        `Missing manifest.json file. Expected at: ${manifestPath}`
      );
    }

    try {
      this.cache = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    } catch (error) {
      throw new ViteError(`Failed to parse manifest.json: ${error.message}`);
    }

    return this.cache;
  }

  /**
   * Generates the appropriate HTML tag for a given asset.
   * @param path - The asset path (relative to the project root).
   * @returns The HTML tag for the asset.
   * @throws `ViteError` If the file format is unsupported or path is invalid.
   */
  static resource(base: string, path: string): string {
    if (typeof base !== 'string') {
      throw new ViteError('Invalid asset base. Expected a string.');
    }

    if (typeof path !== 'string' || !path.trim()) {
      throw new ViteError('Invalid asset path. Expected a non-empty string.');
    }

    if (this.js.test(path)) return this.script(`${base}/${path}`);
    if (this.css.test(path)) return this.link(`${base}/${path}`);

    throw new ViteError(`Unsupported file format: ${extname(path)}.`);
  }

  /**
   * Generates HTML tags for multiple assets.
   * @param paths - The asset paths.
   * @returns The concatenated HTML tags.
   * @throws `ViteError` If any asset is missing in the manifest or invalid inputs.
   */
  static assets(...paths: Array<string>) {
    // Check for empty array
    if (!paths.length) {
      throw new ViteError(
        'No asset paths provided. Expected at least one asset.'
      );
    }

    // Check for invalid paths (non-string or empty)
    if (paths.some((path) => typeof path !== 'string' || !path.trim())) {
      throw new ViteError('All asset paths must be non-empty strings.');
    }

    // Clean paths (remove leading './' or '/')
    paths = paths.map((path) => path.replace(/^(\.?\/)+/, ''));

    // Development environment handling
    if (config().loadSync().env === 'dev') {
      const resources: Array<string> = [];

      // Add Vite client script for HMR
      resources.push(this.script(this.url.concat('/@vite/client')));

      return resources
        .concat(paths.map((path) => this.resource(this.url, path)))
        .join('\n');
    }

    // Production environment handling
    const manifest = this.manifest();

    return paths
      .map((path) => {
        // Check if asset exists in the manifest
        if (!manifest[path]) {
          throw new ViteError(`Asset not found in manifest: ${path}`);
        }

        // Return the correct HTML tag for each asset
        return this.resource('', manifest[path].file);
      })
      .join('\n');
  }

  /**
   * Generates a script tag for JavaScript or TypeScript files.
   * @param src - The script source URL.
   * @returns The script tag.
   * @throws `ViteError` If the source URL is invalid.
   */
  static script(src: string) {
    if (typeof src !== 'string') {
      throw new ViteError(
        `Invalid script URL: ${src}. Expected a valid HTTP(S) URL.`
      );
    }
    return `<script type="module" src="${src}"></script>`;
  }

  /**
   * Generates a link tag for stylesheets.
   * @param href - The stylesheet URL.
   * @returns The link tag.
   * @throws `ViteError` If the stylesheet URL is invalid.
   */
  static link(href: string) {
    if (typeof href !== 'string') {
      throw new ViteError(
        `Invalid stylesheet URL: ${href}. Expected a valid HTTP(S) URL.`
      );
    }
    return `<link rel="stylesheet" href="${href}">`;
  }
}

/**
 * Generates HTML tags for assets in development or production.
 *
 * @param paths - The paths of assets to be included.
 * @returns A string of HTML tags for the assets.
 * @throws `ViteError` if any asset path is invalid or not found in the manifest.
 */
export const vite: (...paths: string[]) => string = Vite.assets.bind(Vite);
