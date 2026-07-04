import { describe, expect, it } from 'vitest';
import { buildMovePlan, buildRenamePlan, renderFolderTemplate, renderNameTemplate } from '../src/shared/rename-plan.js';

function localTimestamp(year, month, day, hour, minute, second) {
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

describe('rename planning', () => {
  it('renders custom name templates from media metadata', () => {
    const media = {
      name: 'IMG_0099.JPG',
      ext: '.JPG',
      type: 'image',
      takenAtMs: localTimestamp(2026, 2, 3, 4, 5, 6)
    };

    expect(renderNameTemplate('{yyyy}-{MM}-{dd}_{HH}{mm}{ss}_{type}_{index}', media, 7)).toBe(
      '2026-02-03_040506_image_007'
    );
  });

  it('renders the default short folder and file naming formats', () => {
    const media = {
      name: 'IMG_0099.JPG',
      ext: '.JPG',
      type: 'image',
      takenAtMs: localTimestamp(2026, 2, 3, 4, 5, 6)
    };

    expect(renderFolderTemplate('{yy}{MM}{dd}_{name}', media, 7)).toBe('260203_IMG_0099');
    expect(renderNameTemplate('{index}_{name}', media, 7)).toBe('007_IMG_0099');
  });

  it('builds collision-safe rename operations and preserves extensions', () => {
    const media = [
      {
        path: 'D:\\album\\IMG_1.jpg',
        directory: 'D:\\album',
        name: 'IMG_1.jpg',
        ext: '.jpg',
        type: 'image',
        takenAtMs: localTimestamp(2026, 1, 1, 10, 0, 0)
      },
      {
        path: 'D:\\album\\IMG_2.jpg',
        directory: 'D:\\album',
        name: 'IMG_2.jpg',
        ext: '.jpg',
        type: 'image',
        takenAtMs: localTimestamp(2026, 1, 1, 10, 0, 0)
      }
    ];

    const plan = buildRenamePlan(media, '{yyyy}{MM}{dd}_{HH}{mm}{ss}', 'zh-CN');

    expect(plan.map((operation) => operation.newName)).toEqual([
      '20260101_100000.jpg',
      '20260101_100000-2.jpg'
    ]);
    expect(plan.every((operation) => operation.action === 'rename')).toBe(true);
  });

  it('builds move operations into the selected destination folder', () => {
    const media = [
      {
        path: 'D:\\album\\a.jpg',
        directory: 'D:\\album',
        name: 'a.jpg',
        ext: '.jpg',
        type: 'image',
        takenAtMs: localTimestamp(2026, 1, 1, 10, 0, 0)
      }
    ];

    const plan = buildMovePlan(media, 'E:\\Sorted', '{yyyy}\\{MM}', 'zh-CN');

    expect(plan[0]).toMatchObject({
      action: 'move',
      from: 'D:\\album\\a.jpg',
      newName: 'a.jpg',
      targetDirectory: 'E:\\Sorted\\2026\\01'
    });
  });
});
