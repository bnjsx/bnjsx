import { Mime } from '../../src/helpers/Mime';

describe('Mime', () => {
  describe('Static image MIME types', () => {
    test('JPG is image/jpeg', () => {
      expect(Mime.JPG).toBe('image/jpeg');
    });

    test('JPEG is image/jpeg', () => {
      expect(Mime.JPEG).toBe('image/jpeg');
    });

    test('PNG is image/png', () => {
      expect(Mime.PNG).toBe('image/png');
    });

    test('GIF is image/gif', () => {
      expect(Mime.GIF).toBe('image/gif');
    });

    test('WEBP is image/webp', () => {
      expect(Mime.WEBP).toBe('image/webp');
    });

    test('BMP is image/bmp', () => {
      expect(Mime.BMP).toBe('image/bmp');
    });

    test('TIFF is image/tiff', () => {
      expect(Mime.TIFF).toBe('image/tiff');
    });

    test('SVG is image/svg+xml', () => {
      expect(Mime.SVG).toBe('image/svg+xml');
    });
  });

  describe('Static video MIME types', () => {
    test('MP4 is video/mp4', () => {
      expect(Mime.MP4).toBe('video/mp4');
    });

    test('WEBM is video/webm', () => {
      expect(Mime.WEBM).toBe('video/webm');
    });

    test('AVI is video/x-msvideo', () => {
      expect(Mime.AVI).toBe('video/x-msvideo');
    });

    test('MOV is video/quicktime', () => {
      expect(Mime.MOV).toBe('video/quicktime');
    });

    test('MKV is video/x-matroska', () => {
      expect(Mime.MKV).toBe('video/x-matroska');
    });

    test('FLV is video/x-flv', () => {
      expect(Mime.FLV).toBe('video/x-flv');
    });

    test('WMV is video/x-ms-wmv', () => {
      expect(Mime.WMV).toBe('video/x-ms-wmv');
    });
  });

  describe('Static audio MIME types', () => {
    test('MP3 is audio/mpeg', () => {
      expect(Mime.MP3).toBe('audio/mpeg');
    });

    test('WAV is audio/x-wav', () => {
      expect(Mime.WAV).toBe('audio/x-wav');
    });

    test('M4A is audio/mp4', () => {
      expect(Mime.M4A).toBe('audio/mp4');
    });

    test('AAC is audio/aac', () => {
      expect(Mime.AAC).toBe('audio/aac');
    });

    test('FLAC is audio/flac', () => {
      expect(Mime.FLAC).toBe('audio/flac');
    });
  });

  describe('Mime.images()', () => {
    test('returns all image MIME types', () => {
      expect(Mime.images()).toEqual([
        Mime.JPG,
        Mime.PNG,
        Mime.GIF,
        Mime.WEBP,
        Mime.SVG,
        Mime.BMP,
        Mime.TIFF,
      ]);
    });
  });

  describe('Mime.videos()', () => {
    test('returns all video MIME types', () => {
      expect(Mime.videos()).toEqual([
        Mime.MP4,
        Mime.WEBM,
        Mime.AVI,
        Mime.MOV,
        Mime.MKV,
        Mime.FLV,
        Mime.WMV,
      ]);
    });
  });

  describe('Mime.audios()', () => {
    test('returns all audio MIME types', () => {
      expect(Mime.audios()).toEqual([
        Mime.MP3,
        Mime.WAV,
        Mime.M4A,
        Mime.AAC,
        Mime.FLAC,
      ]);
    });
  });
});
