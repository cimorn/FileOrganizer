import { describe, expect, it } from 'vitest';
import { classifyMediaFile } from '../src/shared/media-types.js';
import { parseQuickTimeCreationTime } from '../src/shared/quicktime-time.js';

describe('media metadata helpers', () => {
  it('classifies supported image and video files by extension', () => {
    expect(classifyMediaFile('D:\\DCIM\\photo.JPG')).toMatchObject({
      supported: true,
      type: 'image',
      ext: '.jpg'
    });
    expect(classifyMediaFile('D:\\DCIM\\clip.MOV')).toMatchObject({
      supported: true,
      type: 'video',
      ext: '.mov'
    });
    expect(classifyMediaFile('D:\\DCIM\\note.txt')).toMatchObject({
      supported: false,
      type: 'other'
    });
  });

  it('reads version 0 QuickTime creation time from an mvhd box', () => {
    const quickTimeEpochSeconds = (Date.UTC(2026, 0, 1) - Date.UTC(1904, 0, 1)) / 1000;
    const buffer = Buffer.alloc(32);
    buffer.writeUInt32BE(32, 0);
    buffer.write('mvhd', 4, 'ascii');
    buffer.writeUInt8(0, 8);
    buffer.writeUIntBE(0, 9, 3);
    buffer.writeUInt32BE(quickTimeEpochSeconds, 12);

    expect(parseQuickTimeCreationTime(buffer)?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});
