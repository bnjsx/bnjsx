import { Validator } from '../../../src/core';
import { File } from '../../../src/core/validation/File';
import { ValidatorError } from '../../../src/errors';

describe('File API', () => {
  let validator: Validator;

  beforeEach(() => {
    // @ts-ignore
    validator = new Validator({}, {});
  });

  describe('constructor()', () => {
    const messages: any = {};

    it('initializes with valid name and messages', () => {
      const file = new File('upload', messages);
      expect(file['state'].name).toBe('upload');
      expect(file['messages']).toBe(messages);
    });

    it('throws if name is not a string', () => {
      expect(() => new File(123 as any, messages)).toThrow(ValidatorError);
      expect(() => new File(123 as any, messages)).toThrow(
        'Invalid file name: 123'
      );
    });

    it('throws if messages is not an object', () => {
      expect(() => new File('upload', null as any)).toThrow(ValidatorError);
      expect(() => new File('upload', null as any)).toThrow(
        'Invalid messages: null'
      );
    });
  });

  describe('count()', () => {
    it('sets exact file count with default message', () => {
      const file = validator.file('resume').count(2);
      const options = file['state'].options;

      expect(options.count).toBe(2);
      expect(options.messages.count).toBe(
        'resume must have exactly 2 file(s).'
      );
    });

    it('sets exact file count with custom message', () => {
      const file = validator.file('resume').count(1, 'Upload only one!');
      const options = file['state'].options;

      expect(options.count).toBe(1);
      expect(options.messages.count).toBe('Upload only one!');
    });
  });

  describe('size()', () => {
    it('sets min/max with both values and default messages', () => {
      const file = validator.file('avatar').size(1000, 5000);
      const options = file['state'].options;

      expect(options.size.min).toBe(1000);
      expect(options.size.max).toBe(5000);
      expect(options.messages.size.min).toBe(
        'avatar file must be at least 1000 bytes.'
      );
      expect(options.messages.size.max).toBe(
        'avatar file must be at most 4.88 KB.'
      );
    });

    it('interprets size(x) as max with min = 0', () => {
      const file = validator.file('avatar').size(2048);
      const options = file['state'].options;

      expect(options.size.min).toBe(0);
      expect(options.size.max).toBe(2048);
    });

    it('sets size with only max provided', () => {
      const file = validator.file('avatar').size(undefined, 4096);
      const options = file['state'].options;

      expect(options.size.min).toBe(0);
      expect(options.size.max).toBe(4096);
    });

    it('sets custom messages for size', () => {
      const file = validator.file('avatar').size(1000, 5000, {
        min: 'Too small!',
        max: 'Too big!',
      });
      const options = file['state'].options;

      expect(options.messages.size.min).toBe('Too small!');
      expect(options.messages.size.max).toBe('Too big!');
    });

    it('defaults to [0, Number.MAX_SAFE_INTEGER] when no size limits are provided', () => {
      const file = validator.file('upload').size();
      const options = file['state'].options;

      expect(options.size.min).toBe(0);
      expect(options.size.max).toBe(Number.MAX_SAFE_INTEGER);
      expect(options.messages.size.min).toBe(
        'upload file must be at least 0 bytes.'
      );
      expect(options.messages.size.max).toBe(
        `upload file must be at most 8.00 PB.`
      ); // human-readable max
    });
  });

  describe('type()', () => {
    it('sets type with single string and default message', () => {
      const file = validator.file('photo').type('image/png');
      const options = file['state'].options;

      expect(options.type).toEqual(['image/png']);
      expect(options.messages.type).toBe('photo must be type(s): image/png.');
    });

    it('sets type with array and default message', () => {
      const file = validator.file('photo').type(['image/png', 'image/jpeg']);
      const options = file['state'].options;

      expect(options.type).toEqual(['image/png', 'image/jpeg']);
      expect(options.messages.type).toBe(
        'photo must be type(s): image/png, image/jpeg.'
      );
    });

    it('sets type with custom message', () => {
      const file = validator
        .file('photo')
        .type('image/gif', 'Only GIFs allowed!');
      const options = file['state'].options;

      expect(options.messages.type).toBe('Only GIFs allowed!');
    });
  });

  describe('required()', () => {
    it('marks field as required with default message', () => {
      const file = validator.file('cv').required();
      const options = file['state'].options;

      expect(options.required).toBe(true);
      expect(options.messages.required).toBe('cv is required.');
    });

    it('sets custom required message', () => {
      const file = validator.file('cv').required('Please upload your CV!');
      const options = file['state'].options;

      expect(options.messages.required).toBe('Please upload your CV!');
    });
  });

  describe('location()', () => {
    it('sets file location path', () => {
      const file = validator.file('doc').location('/tmp/uploads');
      const options = file['state'].options;

      expect(options.location).toBe('/tmp/uploads');
    });
  });
});
