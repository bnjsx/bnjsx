jest.mock('../../../src/config');
jest.mock('fs');

import * as fs from 'fs';
import { Vite, ViteError } from '../../../src/helpers/tools/Vite';
import { config } from '../../../src/config';
import { resolve } from 'path';

jest.spyOn(fs, 'existsSync');
jest.spyOn(fs, 'readFileSync');

describe('Vite Class', () => {
  let loader: any = config;

  beforeEach(() => {
    jest.clearAllMocks();
    Vite.cache = undefined;
  });

  describe('manifest()', () => {
    it('should load and cache the manifest.json file', () => {
      loader.mockReturnValue({
        resolveSync: () => '/project-root',
      });

      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({ 'assets/js/app.js': { file: 'assets/js/app.js' } })
      );

      expect(Vite.manifest()).toEqual({
        'assets/js/app.js': { file: 'assets/js/app.js' },
      });

      // Ensure caching works
      expect(Vite.cache).not.toBeUndefined();
      expect(Vite.manifest()).toBe(Vite.cache);
    });

    it('should throw ViteError if manifest.json is missing', () => {
      loader.mockReturnValue({
        resolveSync: () => '/project-root',
      });

      (fs.existsSync as any).mockReturnValue(false);

      const path = resolve(
        loader().resolveSync(),
        'public/.vite/manifest.json'
      );

      expect(() => Vite.manifest()).toThrow(
        new ViteError(`Missing manifest.json file. Expected at: ${path}`)
      );
    });

    it('should throw ViteError if manifest.json is invalid', () => {
      loader.mockReturnValue({
        resolveSync: () => '/project-root',
      });

      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue('INVALID JSON');

      expect(() => Vite.manifest()).toThrow(ViteError);
    });
  });

  describe('resource()', () => {
    it('should generate a script tag for JS files', () => {
      expect(Vite.resource(Vite.url, 'assets/js/app.js')).toBe(
        '<script type="module" src="http://localhost:5173/assets/js/app.js"></script>'
      );
    });

    it('should generate a link tag for CSS files', () => {
      expect(Vite.resource(Vite.url, 'assets/css/style.css')).toBe(
        '<link rel="stylesheet" href="http://localhost:5173/assets/css/style.css">'
      );
    });

    it('should throw ViteError for unsupported file types', () => {
      expect(() => Vite.resource(Vite.url, 'assets/image.png')).toThrow(
        new ViteError('Unsupported file format: .png.')
      );
    });

    it('should throw ViteError if path is invalid', () => {
      expect(() => Vite.resource(Vite.url, '')).toThrow(
        new ViteError('Invalid asset path. Expected a non-empty string.')
      );
    });

    it('should throw ViteError if base is invalid', () => {
      expect(() => Vite.resource(123 as any, 'assets/foo.bar')).toThrow(
        new ViteError('Invalid asset base. Expected a string.')
      );
    });
  });

  describe('Vite.assets()', () => {
    beforeEach(() => {
      loader.mockReturnValue({
        loadSync: () => ({ env: 'prod' }),
        resolveSync: () => '/project-root',
      });

      (fs.existsSync as any).mockReturnValue(true);
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({
          'assets/js/app.js': { file: 'assets/js/app.js' },
          'assets/css/style.css': { file: 'assets/css/style.css' },
        })
      );
    });

    it('should generate correct HTML for multiple assets in production', () => {
      expect(Vite.assets('assets/js/app.js', 'assets/css/style.css')).toBe(
        '<script type="module" src="/assets/js/app.js"></script>\n' +
          '<link rel="stylesheet" href="/assets/css/style.css">'
      );
    });

    it('should throw ViteError if an asset is missing from manifest', () => {
      expect(() => Vite.assets('assets/missing.js')).toThrow(
        new ViteError('Asset not found in manifest: assets/missing.js')
      );
    });

    it('should throw ViteError if no asset paths are provided', () => {
      expect(() => Vite.assets()).toThrow(
        new ViteError('No asset paths provided. Expected at least one asset.')
      );
    });

    it('should throw ViteError if any asset path is invalid', () => {
      expect(() => Vite.assets('', 'assets/js/app.js')).toThrow(
        new ViteError('All asset paths must be non-empty strings.')
      );
    });

    it('should throw ViteError if an asset path is just whitespace', () => {
      expect(() => Vite.assets('    ')).toThrow(
        new ViteError('All asset paths must be non-empty strings.')
      );
    });

    it('should correctly generate the resource in dev environment', () => {
      loader.mockReturnValue({
        loadSync: () => ({ env: 'dev' }),
        resolveSync: () => '/project-root',
      });

      expect(Vite.assets('assets/js/app.js', 'assets/css/style.css')).toBe(
        '<script type="module" src="http://localhost:5173/@vite/client"></script>\n' +
          '<script type="module" src="http://localhost:5173/assets/js/app.js"></script>\n' +
          '<link rel="stylesheet" href="http://localhost:5173/assets/css/style.css">'
      );
    });
  });

  describe('script()', () => {
    it('should return a valid script tag', () => {
      expect(Vite.script('http://example.com/script.js')).toBe(
        '<script type="module" src="http://example.com/script.js"></script>'
      );
    });

    it('should throw ViteError for invalid script URL', () => {
      expect(() => Vite.script(null as any)).toThrow(ViteError);
    });
  });

  describe('link()', () => {
    it('should return a valid link tag', () => {
      expect(Vite.link('http://example.com/style.css')).toBe(
        '<link rel="stylesheet" href="http://example.com/style.css">'
      );
    });

    it('should throw ViteError for invalid link URL', () => {
      expect(() => Vite.link(null as any)).toThrow(ViteError);
    });
  });
});
