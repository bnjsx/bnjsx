import { EventEmitter } from 'events';

jest.mock('../../../src/config', () => ({
  config: () => {
    const config = { env: 'dev' };

    return {
      loadSync: () => config,
      resolveSync: () => __dirname,
    };
  },
}));

jest.mock('busboy', () => {
  return jest.fn(() => {
    const bb: any = new EventEmitter();
    bb.pipe = jest.fn();
    return bb;
  });
});

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createWriteStream: jest.fn(() => new EventEmitter()),
  createReadStream: jest.fn(() => {
    const stream: any = new EventEmitter();
    stream.resume = jest.fn();
    stream.pipe = jest.fn(() => {
      stream.emit('data', Buffer.from('hello '));
      stream.emit('data', Buffer.from('world '));
      stream.emit('data', Buffer.from('from '));
      stream.emit('data', Buffer.from('bnjsx.'));
      stream.emit('end');
    });

    return stream;
  }),
}));

jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: () => '1234_1234_1234',
}));

import { BadRequestError } from '../../../src/errors';
import { Form, FormError } from '../../../src/core/modules/Form';
import { toSize } from '../../../src/helpers';
import { createReadStream } from 'fs';
import { resolve } from 'path';

describe('Form', () => {
  describe('constructor', () => {
    let form: any;

    beforeEach(() => {
      form = new Form();
      form.req = {};
      form.res = {};
    });

    test('should set default mode to "strong" if no mode is provided', () => {
      expect(form.mode).toBe('strong');
    });

    test('should set mode correctly when a valid mode is provided', () => {
      form = new Form('strict');
      expect(form.mode).toBe('strict');

      form = new Form('strong');
      expect(form.mode).toBe('strong');

      form = new Form('ignore');
      expect(form.mode).toBe('ignore');
    });

    test('should throw FormError when an invalid mode is provided', () => {
      const mode: any = 'invalid';
      expect(() => new Form(mode)).toThrow(FormError);
      expect(() => new Form(mode)).toThrow('Invalid form mode');
    });
  });

  describe('addError', () => {
    let form: any;

    beforeEach(() => {
      form = new Form();
      form.req = {};
      form.res = {};
    });

    test('should add an error message to req.errors', () => {
      form.addError('field1', 'Error 1');
      expect(form.req.errors.field1).toEqual(['Error 1']);
    });

    test('should append multiple error messages', () => {
      form.addError('field1', 'Error 1', 'Error 2');
      expect(form.req.errors.field1).toEqual(['Error 1', 'Error 2']);
    });

    test('should add errors to multiple fields', () => {
      form.addError('field1', 'Error 1');
      form.addError('field2', 'Error 2');
      expect(form.req.errors).toEqual({
        field1: ['Error 1'],
        field2: ['Error 2'],
      });
    });
  });

  describe('addFile', () => {
    let form: any;

    beforeEach(() => {
      form = new Form();
      form.req = {};
      form.res = {};
    });

    test('should add a single file to req.body', () => {
      const file = {};
      form.addFile('upload', file);
      expect(form.req.body.upload).toEqual(file);
    });

    test('should convert a single file entry into an array', () => {
      const file1 = {};
      const file2 = {};
      const file3 = {};

      form.addFile('upload', file1);
      form.addFile('upload', file2);
      form.addFile('upload', file3);

      expect(form.req.body.upload).toEqual([file1, file2, file3]);
    });
  });

  describe('addField', () => {
    let form: any;

    beforeEach(() => {
      form = new Form();
      form.req = {};
      form.res = {};
    });

    test('should add a field to req.body', () => {
      form.addField('username', 'john_doe');
      expect(form.req.body.username).toBe('john_doe');
    });

    test('should convert an empty string to undefined', () => {
      form.addField('username', '');
      expect(form.req.body.username).toBeUndefined();
    });

    test('should convert a single field entry into an array', () => {
      form.addField('tag', 'first');
      form.addField('tag', 'second');
      form.addField('tag', 'third');

      expect(form.req.body.tag).toEqual(['first', 'second', 'third']);
    });
  });

  describe('file', () => {
    let form: any;

    beforeEach(() => {
      form = new Form();
      form.req = {};
      form.res = {};
    });

    test('should throw FormError if file name is not a string', () => {
      expect(() => form.file(123)).toThrow(FormError);
      expect(() => form.file(123)).toThrow('Invalid file name');
    });

    test('should throw FormError if options is not an object', () => {
      expect(() => form.file('profile', null)).toThrow(FormError);
      expect(() => form.file('profile', null)).toThrow('Invalid file options');
    });

    test('should throw FormError if file type is not an array of strings', () => {
      expect(() => form.file('profile', { type: 'image/png' })).toThrow(
        FormError
      );
      expect(() => form.file('profile', { type: 'image/png' })).toThrow(
        'Invalid file type'
      );
    });

    test('should set empty array as default for file type', () => {
      form.file('profile');
      expect(form.files.profile.type).toEqual([]);
    });

    test('should throw FormError if file count is not a positive integer', () => {
      expect(() => form.file('profile', { count: -5 })).toThrow(FormError);
      expect(() => form.file('profile', { count: -5 })).toThrow(
        'Invalid file count'
      );
    });

    test('should set default count to Number.MAX_SAFE_INTEGER', () => {
      form.file('profile');
      expect(form.files.profile.count).toBe(Number.MAX_SAFE_INTEGER);
    });

    test('should throw FormError if file size is not an object', () => {
      expect(() => form.file('profile', { size: 500 })).toThrow(FormError);
      expect(() => form.file('profile', { size: 500 })).toThrow(
        'Invalid file size'
      );
    });

    test('should throw FormError if min size is not an integer', () => {
      expect(() => form.file('profile', { size: { min: '1MB' } })).toThrow(
        FormError
      );
      expect(() => form.file('profile', { size: { min: '1MB' } })).toThrow(
        'Invalid minimum file size'
      );
    });

    test('should throw FormError if max size is not an integer', () => {
      expect(() =>
        form.file('profile', { size: { min: 0, max: '5MB' } })
      ).toThrow(FormError);
      expect(() =>
        form.file('profile', { size: { min: 0, max: '5MB' } })
      ).toThrow('Invalid maximum file size');
    });

    test('should throw FormError if min size is greater than max size', () => {
      expect(() => form.file('profile', { size: { min: 10, max: 5 } })).toThrow(
        FormError
      );
      expect(() => form.file('profile', { size: { min: 10, max: 5 } })).toThrow(
        'File size min cannot be greater than max'
      );
    });

    test('should set default file size to min: 0 and max: Number.MAX_SAFE_INTEGER', () => {
      form.file('profile');
      expect(form.files.profile.size).toEqual({
        min: 0,
        max: Number.MAX_SAFE_INTEGER,
      });
    });

    test('should throw FormError if required is not a boolean', () => {
      expect(() => form.file('profile', { required: 'true' })).toThrow(
        FormError
      );
      expect(() => form.file('profile', { required: 'true' })).toThrow(
        'Invalid required flag'
      );
    });

    test('should set required default to false', () => {
      form.file('profile');
      expect(form.files.profile.required).toBe(false);
    });

    test('should throw FormError if location is not a string', () => {
      expect(() => form.file('profile', { location: 123 })).toThrow(FormError);
      expect(() => form.file('profile', { location: 123 })).toThrow(
        'Invalid file location'
      );
    });

    test('should throw FormError if location is not absolute', () => {
      expect(() => form.file('profile', { location: 'relative/path' })).toThrow(
        FormError
      );
      expect(() => form.file('profile', { location: 'relative/path' })).toThrow(
        'File location path must be absolute'
      );
    });

    test('should correctly resolve default location', () => {
      form.file('profile');
      expect(form.files.profile.location).toBe(resolve(__dirname, './uploads'));
    });

    test('should throw FormError if messages is not an object', () => {
      expect(() => form.file('profile', { messages: 'invalid' })).toThrow(
        FormError
      );
      expect(() => form.file('profile', { messages: 'invalid' })).toThrow(
        'Invalid messages object'
      );
    });

    test('should throw FormError if messages.count is not a string', () => {
      expect(() => form.file('profile', { messages: { count: 123 } })).toThrow(
        FormError
      );
      expect(() => form.file('profile', { messages: { count: 123 } })).toThrow(
        'Invalid count message'
      );
    });

    test('should throw FormError if messages.required is not a string', () => {
      expect(() =>
        form.file('profile', { messages: { required: 123 } })
      ).toThrow(FormError);
      expect(() =>
        form.file('profile', { messages: { required: 123 } })
      ).toThrow('Invalid required message');
    });

    test('should throw FormError if messages.type is not a string', () => {
      expect(() => form.file('profile', { messages: { type: 123 } })).toThrow(
        FormError
      );
      expect(() => form.file('profile', { messages: { type: 123 } })).toThrow(
        'Invalid type message'
      );
    });

    test('should throw FormError if messages.size is not an object', () => {
      expect(() =>
        form.file('profile', { messages: { size: 'invalid' } })
      ).toThrow(FormError);
      expect(() =>
        form.file('profile', { messages: { size: 'invalid' } })
      ).toThrow('Invalid size message object');
    });

    test('should throw FormError if messages.size.min is not a string', () => {
      expect(() =>
        form.file('profile', { messages: { size: { min: 123 } } })
      ).toThrow(FormError);
      expect(() =>
        form.file('profile', { messages: { size: { min: 123 } } })
      ).toThrow('Invalid min size message');
    });

    test('should throw FormError if messages.size.max is not a string', () => {
      expect(() =>
        form.file('profile', { messages: { size: { max: 123 } } })
      ).toThrow(FormError);
      expect(() =>
        form.file('profile', { messages: { size: { max: 123 } } })
      ).toThrow('Invalid max size message');
    });

    test('should set default messages correctly', () => {
      form.file('profile', {
        type: ['image/png', 'image/jpeg'],
        size: { min: 100, max: 5000 },
        count: 3,
      });

      expect(form.files.profile.messages).toEqual({
        count: 'Too many files. Maximum allowed is 3.',
        required: 'This field is required.',
        type: 'File must be image/png, image/jpeg.',
        size: {
          min: `File must be at least ${toSize(100)}.`,
          max: `File must not exceed ${toSize(5000)}.`,
        },
      });
    });

    test('should set default messages correctly again XD', () => {
      form.file('profile', {
        type: ['image/png', 'image/jpeg'],
        size: { min: 100, max: 5000 },
        count: 3,
        messages: {},
      });

      expect(form.files.profile.messages).toEqual({
        count: 'Too many files. Maximum allowed is 3.',
        required: 'This field is required.',
        type: 'File must be image/png, image/jpeg.',
        size: {
          min: `File must be at least ${toSize(100)}.`,
          max: `File must not exceed ${toSize(5000)}.`,
        },
      });
    });
  });

  describe('field', () => {
    let form: any;

    beforeEach(() => {
      form = new Form();
      form.req = {};
      form.res = {};
    });

    test('should throw FormError if field name is not a string', () => {
      expect(() => form.field(123 as any)).toThrow(FormError);
      expect(() => form.field(123 as any)).toThrow('Invalid field name');
    });

    test('should throw FormError if tester is not an object', () => {
      expect(() => form.field('username', null as any)).toThrow(FormError);
      expect(() => form.field('username', 123 as any)).toThrow(FormError);
      expect(() => form.field('username', 'invalid' as any)).toThrow(FormError);
      expect(() => form.field('username', null as any)).toThrow(
        'Invalid field tester'
      );
    });

    test('should throw FormError if tester.test is not a function', () => {
      expect(() =>
        form.field('username', {
          test: 'not a function',
          message: 'Invalid',
        } as any)
      ).toThrow(FormError);
      expect(() =>
        form.field('username', {
          test: 'not a function',
          message: 'Invalid',
        } as any)
      ).toThrow('Invalid field test');
    });

    test('should throw FormError if tester.message is not a string', () => {
      expect(() =>
        form.field('username', { test: () => true, message: 123 as any })
      ).toThrow(FormError);
      expect(() =>
        form.field('username', { test: () => true, message: 123 as any })
      ).toThrow('Invalid field message');
    });

    test('should allow multiple valid testers', () => {
      const testers = [
        {
          test: (val: any) => typeof val === 'string',
          message: 'Must be a string',
        },
        {
          test: (val: any) => val.length >= 3,
          message: 'Must be at least 3 characters long',
        },
      ];

      form.field('username', ...testers);
      expect(form.fields.username).toEqual(testers);
    });

    test('should allow an empty list of testers', () => {
      form.field('username');
      expect(form.fields.username).toEqual([]);
    });
  });

  describe('parse', () => {
    let form: any;
    let req: any;
    let res: any;

    beforeEach(() => {
      form = new Form();
      req = { getHeader: jest.fn() };
      res = {};
      form.encoded = jest.fn().mockResolvedValue(undefined);
      form.multipart = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(form, 'finalize');
    });

    test('should resolve without processing when content-type is not recognized', async () => {
      req.getHeader.mockReturnValue(null);
      await expect(form.parse(req, res)).resolves.toBeUndefined();
      expect(form.encoded).not.toHaveBeenCalled();
      expect(form.multipart).not.toHaveBeenCalled();
    });

    test('should call encoded() for application/x-www-form-urlencoded', async () => {
      req.getHeader.mockReturnValue('application/x-www-form-urlencoded');
      await expect(form.parse(req, res)).resolves.toBeUndefined();
      expect(form.encoded).toHaveBeenCalled();
      expect(form.multipart).not.toHaveBeenCalled();
    });

    test('should call multipart() for multipart/form-data', async () => {
      req.getHeader.mockReturnValue('multipart/form-data');
      await expect(form.parse(req, res)).resolves.toBeUndefined();
      expect(form.multipart).toHaveBeenCalled();
      expect(form.encoded).not.toHaveBeenCalled();
    });

    test('should call multipart() for multipart/form-data', async () => {
      req.getHeader.mockReturnValue('multipart/form-data');
      await expect(form.parse(req, res)).resolves.toBeUndefined();
      expect(form.multipart).toHaveBeenCalled();
      expect(form.encoded).not.toHaveBeenCalled();
    });

    test('should set req and res properties correctly', async () => {
      req.getHeader.mockReturnValue('');
      await form.parse(req, res);
      expect(form.req).toBe(req);
      expect(form.res).toBe(res);
    });

    test('should call finalize when body is already parsed to avoid double parsing', async () => {
      req.getHeader.mockReturnValue('application/json');
      req[Form.BODY_PARSED] = true; // simulate body already parsed

      await expect(form.parse(req, res)).resolves.toBeUndefined();
      expect(form.finalize).toHaveBeenCalled();
      expect(form.encoded).not.toHaveBeenCalled();
      expect(form.multipart).not.toHaveBeenCalled();
    });

    test('should parse JSON and call finalize', async () => {
      req.getHeader.mockReturnValue('application/json');
      req.on = jest.fn((event, callback) => {
        const data = JSON.stringify({ name: 'bnjsx' });
        if (event === 'data') callback(Buffer.from(data));
        if (event === 'end') callback();
      });

      await expect(form.parse(req, res)).resolves.toBeUndefined();
      expect(form.finalize).toHaveBeenCalled();
    });
  });

  describe('encoded', () => {
    let form;

    beforeEach(() => {
      form = new Form();
      form.req = {};
      form.mode = 'strict'; // Default mode
      form.fields = {
        name: [{ test: (v) => v === 'valid', message: 'Invalid name' }],
      };
    });

    it('should resolve successfully for valid input', async () => {
      form.req.on = jest.fn((event, callback) => {
        if (event === 'data') callback(Buffer.from('name=valid'));
        if (event === 'end') callback();
      });

      await expect(form.encoded()).resolves.toBeUndefined();
    });

    it('should reject on unexpected fields in strict mode', async () => {
      form.req.on = jest.fn((event, callback) => {
        if (event === 'data') callback(Buffer.from('unexpected=value'));
        if (event === 'end') callback();
      });

      await expect(form.encoded()).rejects.toThrow(BadRequestError);
    });

    it('should ignore unexpected fields in ignore mode', async () => {
      form.mode = 'ignore';

      form.req.on = jest.fn((event, callback) => {
        if (event === 'data') callback(Buffer.from('unexpected=value'));
        if (event === 'end') callback();
      });

      await expect(form.encoded()).resolves.toBeUndefined();
    });

    it('should reject when a validation test fails', async () => {
      form.req.on = jest.fn((event, callback) => {
        if (event === 'data') callback(Buffer.from('name=invalid'));
        if (event === 'end') callback();
      });

      await expect(form.encoded()).resolves.toBeUndefined();
      expect(form.req.errors).toHaveProperty('name'); // Ensures validation messages were added
    });

    it('should reject on parsing errors', async () => {
      form.req.on = jest.fn((event, callback) => {
        if (event === 'data') callback(Buffer.from('name=valid'));
        if (event === 'end') callback();
      });

      // Add a problematic test XD
      form.fields.name.push({
        test: jest.fn(() => {
          throw new Error('Ops');
        }),
      });

      await expect(form.encoded()).rejects.toThrow(new Error('Ops'));
    });
  });

  describe('multipart', () => {
    let form: any;

    beforeEach(() => {
      form = new Form();
      form.issue = false;
      form.req = { headers: {}, pipe: jest.fn() };
      form.res = new EventEmitter();
      form.fields = { name: [{ test: jest.fn(() => true) }] };
      form.files = {
        upload: {
          required: true,
          count: 1,
          size: { min: 10, max: 1000 },
          type: ['text/plain'],
          location: '/tmp',
          messages: {
            required: 'File is required',
            count: 'Too many files uploaded',
            type: 'Invalid file type',
            size: { min: 'File is too small', max: 'File is too large' },
          },
        },
      };
    });

    it('should resolve when a valid file and field are uploaded', async () => {
      const promise = form.multipart();
      const buffer = [
        Buffer.from('hello '),
        Buffer.from('world '),
        Buffer.from('from '),
        Buffer.from('bnjsx.'),
      ];

      // Handle field upload
      form.bb.emit('field', 'name', 'value');

      // Handle file upload
      form.bb.emit('file', 'upload', createReadStream('test.txt'), {
        mimeType: 'text/plain',
        filename: 'test.txt',
      });

      // close
      form.bb.emit('close');

      await expect(promise).resolves.toBeUndefined();

      expect(form.req.body.name).toBe('value');
      expect(form.req.body.upload).toEqual({
        name: 'test.txt',
        type: 'text/plain',
        size: Buffer.concat(buffer).length,
        path: resolve('/tmp', '1234_1234_1234.txt'),
      });
    });

    it('should reject with BadRequestError for unexpected field in strict mode', async () => {
      form.mode = 'strict';
      const promise = form.multipart();

      form.bb.emit('field', 'unexpectedField', 'value');

      await expect(promise).rejects.toThrow(BadRequestError);
    });

    it('should reject with BadRequestError for unexpected file in strict mode', async () => {
      form.mode = 'strict';
      const promise = form.multipart();

      form.bb.emit('file', 'unexpectedFile', createReadStream('test.txt'), {
        mimeType: 'text/plain',
        filename: 'test.txt',
      });

      await expect(promise).rejects.toThrow(BadRequestError);
    });

    it('should reject with BadRequestError for unexpected file in strong mode', async () => {
      form.mode = 'strong';
      const promise = form.multipart();

      form.bb.emit('file', 'unexpectedFile', createReadStream('test.txt'), {
        mimeType: 'text/plain',
        filename: 'test.txt',
      });

      await expect(promise).rejects.toThrow(BadRequestError);
    });

    it('should ignore unexpected field in ignore mode', async () => {
      form.mode = 'ignore';
      const promise = form.multipart();

      form.bb.emit('field', 'unexpectedField', 'value');
      form.bb.emit('close');

      await expect(promise).resolves.toBeUndefined(); // Should not reject
      expect(form.req.body).toEqual({}); // Should not be included
    });

    it('should ignore unexpected files in ignore mode', async () => {
      form.mode = 'ignore';
      const promise = form.multipart();

      form.bb.emit('file', 'unexpectedFile', createReadStream('test.txt'), {
        mimeType: 'text/plain',
        filename: 'test.txt',
      });

      form.bb.emit('close');

      await expect(promise).resolves.toBeUndefined(); // Should not reject
      expect(form.req.body).toEqual({}); // Should not be included
    });

    it('should add error for missing required file', async () => {
      const promise = form.multipart();

      form.bb.emit('file', 'upload', createReadStream('test.txt'), {
        mimeType: 'application/octet-stream',
        filename: undefined,
      });

      await expect(promise).resolves.toBeUndefined();
      expect(form.req.errors.upload).toContain('File is required');
    });

    it('should add error for invalid file count', async () => {
      const promise = form.multipart();

      form.bb.emit('file', 'upload', createReadStream('test1.txt'), {
        mimeType: 'text/plain',
        filename: 'test1.txt',
      });

      form.bb.emit('file', 'upload', createReadStream('test2.txt'), {
        mimeType: 'text/plain',
        filename: 'test2.txt',
      });

      await expect(promise).resolves.toBeUndefined();
      expect(form.req.errors.upload).toContain('Too many files uploaded');
    });

    it('should add error for invalid file type', async () => {
      const promise = form.multipart();

      form.bb.emit('file', 'upload', createReadStream('test.txt'), {
        mimeType: 'application/json', // Invalid type
        filename: 'test.txt',
      });

      await expect(promise).resolves.toBeUndefined();
      expect(form.req.errors.upload).toContain('Invalid file type');
    });

    it('should add error for file too large', async () => {
      // Set max size limit to 5 bytes
      form.files.upload.size.max = 5;
      const promise = form.multipart();

      form.bb.emit('file', 'upload', createReadStream('test.txt'), {
        mimeType: 'text/plain',
        filename: 'test.txt',
      });

      await expect(promise).resolves.toBeUndefined();
      expect(form.req.errors.upload).toContain('File is too large');
    });

    it('should add error for file too small', async () => {
      form.files.upload.size.min = 100; // Set min size limit to 100 bytes
      const promise = form.multipart();

      form.bb.emit('file', 'upload', createReadStream('test.txt'), {
        mimeType: 'text/plain',
        filename: 'test.txt',
      });

      await expect(promise).resolves.toBeUndefined();
      expect(form.req.errors.upload).toContain('File is too small');
    });

    it('should handle read stream error correctly', async () => {
      const promise = form.multipart();
      const readStream = createReadStream('test.txt');

      form.bb.emit('file', 'upload', readStream, {
        mimeType: 'text/plain',
        filename: 'test.txt',
      });

      readStream.emit('error', new Error('Stream error'));

      await expect(promise).rejects.toThrow('Stream error');

      // Other errors are ignored
      readStream.emit('error', new Error('Stream error'));
      readStream.emit('error', new Error('Stream error'));
      readStream.emit('error', new Error('Stream error'));
    });

    it('should handle write stream error correctly', async () => {
      const writeStream = new EventEmitter();

      jest
        .spyOn(require('fs'), 'createWriteStream')
        .mockImplementation(() => writeStream);

      const promise = form.multipart();

      // Simulate file upload
      form.bb.emit('file', 'upload', createReadStream('test.txt'), {
        mimeType: 'text/plain',
        filename: 'test.txt',
      });

      // Emit an error from the write stream
      writeStream.emit('error', new Error('WriteStream failed'));

      await expect(promise).rejects.toThrow('WriteStream failed');

      // Restore original implementation
      jest.restoreAllMocks();
    });

    it('should reject on Busboy error', async () => {
      const promise = form.multipart();

      form.bb.emit('error', new Error('Busboy error'));

      await expect(promise).rejects.toThrow('Busboy error');

      // Other errors are ignored
      form.bb.emit('error', new Error('Busboy error'));
      form.bb.emit('error', new Error('Busboy error'));
      form.bb.emit('error', new Error('Busboy error'));
    });

    it('should handle cleanup on finish event with issues', async () => {
      const promise = form.multipart();

      form.streams.push({
        destroy: jest.fn(),
        path: '/tmp/test.txt',
      });

      // Ensure promise rejects
      form.bb.emit('error', new Error('Busboy error'));
      form.res.emit('finish'); // Emit finish event

      await expect(promise).rejects.toThrow('Busboy error'); // Wait for promise resolution
      expect(form.streams[0].destroy).toHaveBeenCalled(); // Check if cleanup was triggered
    });

    it('should log sync errors during cleanup in development mode', async () => {
      jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log
      const promise = form.multipart();

      form.streams.push({
        destroy: jest.fn(() => {
          throw new Error('Sync destroy error');
        }),
        path: '/tmp/test.txt',
      });

      // Ensure promise rejects
      form.bb.emit('error', new Error('Busboy error'));
      form.res.emit('finish'); // Emit finish event

      await expect(promise).rejects.toThrow('Busboy error'); // Wait for promise resolution
      expect(console.log).toHaveBeenCalledWith(expect.any(Error)); // Ensure error is logged
    });

    it('should log async errors during cleanup in development mode', async () => {
      jest
        .spyOn(require('fs/promises'), 'unlink')
        .mockRejectedValue(new Error('Async unlink error')); // Mock unlink rejection

      jest.spyOn(console, 'log').mockImplementation(() => {}); // Mock console.log

      const promise = form.multipart();

      form.streams.push({
        destroy: jest.fn(),
        path: '/tmp/test.txt',
      });

      // Ensure promise rejects
      form.bb.emit('error', new Error('Busboy error'));
      form.res.emit('finish'); // Emit finish event

      await expect(promise).rejects.toThrow('Busboy error'); // Wait for promise resolution
      expect(console.log).toHaveBeenCalledWith(expect.any(Error)); // Ensure error is logged
    });

    it('should store validation errors when field validation fails', async () => {
      form.fields = {
        username: [
          {
            test: jest.fn(() => false), // Simulate validation failure
            message: 'Invalid username',
          },
          {
            test: jest.fn(() => false), // Simulate another validation failure
            message: 'Username must be at least 5 characters',
          },
        ],
      };

      const promise = form.multipart();

      // Emit a field with invalid value
      form.bb.emit('field', 'username', 'abc');
      form.bb.emit('close');

      await expect(promise).resolves.toBeUndefined();

      expect(form.req.errors.username).toEqual([
        'Invalid username',
        'Username must be at least 5 characters',
      ]);
    });

    it('should ignore other files when validation fail', async () => {
      form.multipart();
      const readStream = createReadStream('test.txt');

      // Issue
      form.bb.emit('file', 'upload', readStream, {
        mimeType: 'application/json', // Invalid type
        filename: 'test.txt',
      });

      // Not issue but ignored
      form.bb.emit('file', 'upload', readStream, {
        mimeType: 'text/plain', // valid type
        filename: 'test.txt',
      });

      expect(readStream.resume).toHaveBeenCalledTimes(2);

      // Not issue but ignored
      form.bb.emit('file', 'upload', readStream, {
        mimeType: 'text/plain', // valid type
        filename: 'test.txt',
      });

      expect(readStream.resume).toHaveBeenCalledTimes(3);
    });

    it('should ignore missing files if required is false', async () => {
      // We expect to recive a not required file
      form.file('notRequired', { required: false });

      form.multipart();

      // Not required file is missing
      form.bb.emit('file', 'notRequired', createReadStream('test.txt'), {
        mimeType: 'application/octet-stream',
        filename: undefined,
      });

      // In this case it's fine
      expect(form.req.body.notRequired).toBeUndefined();
    });
  });
});
