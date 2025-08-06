/**
 * Common MIME types for file validation and content-type checking.
 * Use static properties like `Mime.JPG`, `Mime.PDF`, `Mime.MP4`, etc.
 */
export class Mime {
  // Images
  /** JPEG image MIME type */
  static JPG = 'image/jpeg';
  /** JPEG image MIME type (alias) */
  static JPEG = 'image/jpeg';
  /** PNG image MIME type */
  static PNG = 'image/png';
  /** GIF image MIME type */
  static GIF = 'image/gif';
  /** WEBP image MIME type */
  static WEBP = 'image/webp';
  /** BMP image MIME type */
  static BMP = 'image/bmp';
  /** TIFF image MIME type */
  static TIFF = 'image/tiff';
  /** SVG image MIME type */
  static SVG = 'image/svg+xml';

  // Videos
  /** MP4 video MIME type */
  static MP4 = 'video/mp4';
  /** WEBM video MIME type */
  static WEBM = 'video/webm';
  /** AVI video MIME type */
  static AVI = 'video/x-msvideo';
  /** MOV video MIME type */
  static MOV = 'video/quicktime';
  /** MKV video MIME type */
  static MKV = 'video/x-matroska';
  /** FLV video MIME type */
  static FLV = 'video/x-flv';
  /** WMV video MIME type */
  static WMV = 'video/x-ms-wmv';

  // Audio
  /** MP3 audio MIME type */
  static MP3 = 'audio/mpeg';
  /** WAV audio MIME type */
  static WAV = 'audio/x-wav';
  /** M4A audio MIME type */
  static M4A = 'audio/mp4';
  /** AAC audio MIME type */
  static AAC = 'audio/aac';
  /** FLAC audio MIME type */
  static FLAC = 'audio/flac';

  /**
   * Returns an array of common image MIME types.
   */
  static images(): string[] {
    return [
      Mime.JPG,
      Mime.PNG,
      Mime.GIF,
      Mime.WEBP,
      Mime.SVG,
      Mime.BMP,
      Mime.TIFF,
    ];
  }

  /**
   * Returns an array of common video MIME types.
   */
  static videos(): string[] {
    return [
      Mime.MP4,
      Mime.WEBM,
      Mime.AVI,
      Mime.MOV,
      Mime.MKV,
      Mime.FLV,
      Mime.WMV,
    ];
  }

  /**
   * Returns an array of common audio MIME types.
   */
  static audios(): string[] {
    return [Mime.MP3, Mime.WAV, Mime.M4A, Mime.AAC, Mime.FLAC];
  }
}
