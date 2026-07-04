import { describe, expect, it } from 'vitest';
import { classifyFile, classifyMediaFile } from '../src/shared/media-types.js';

describe('file type classification', () => {
  it('keeps image and video files as previewable media', () => {
    expect(classifyFile('D:\\files\\photo.JPG')).toMatchObject({
      supported: true,
      previewable: true,
      type: 'image',
      ext: '.jpg'
    });
    expect(classifyFile('D:\\files\\clip.mov')).toMatchObject({
      supported: true,
      previewable: true,
      type: 'video',
      ext: '.mov'
    });
  });

  it('supports ordinary files while keeping them out of thumbnail preview mode', () => {
    expect(classifyFile('D:\\files\\report.pdf')).toMatchObject({
      supported: true,
      previewable: false,
      type: 'file',
      ext: '.pdf'
    });
  });

  it('preserves the old media-only classifier for thumbnail decisions', () => {
    expect(classifyMediaFile('D:\\files\\report.pdf')).toMatchObject({
      supported: false,
      type: 'other',
      ext: '.pdf'
    });
  });
});
