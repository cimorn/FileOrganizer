import { describe, expect, it } from 'vitest';
import {
  EXCEL_RENAME_COLUMNS,
  buildExcelExportRows,
  buildSpreadsheetRenamePlan
} from '../src/shared/excel-rename.js';

const items = [
  {
    path: 'C:\\Photos\\IMG_0001.JPG',
    directory: 'C:\\Photos',
    name: 'IMG_0001.JPG',
    ext: '.jpg',
    size: 1234,
    type: 'image'
  },
  {
    path: 'C:\\Photos\\clip.MP4',
    directory: 'C:\\Photos',
    name: 'clip.MP4',
    ext: '.mp4',
    size: 987654,
    type: 'video'
  }
];

describe('excel rename helpers', () => {
  it('exports selected files with editable name and extension columns', () => {
    const rows = buildExcelExportRows(items);

    expect(Object.keys(rows[0])).toEqual(EXCEL_RENAME_COLUMNS);
    expect(rows[0]).toMatchObject({
      文件路径: 'C:\\Photos\\IMG_0001.JPG',
      文件名: 'IMG_0001',
      文件后缀: '.jpg',
      大小: 1234,
      新文件名: 'IMG_0001',
      新后缀: ''
    });
  });

  it('builds rename operations from imported spreadsheet names and extensions', () => {
    const rows = [
      {
        文件路径: 'C:\\Photos\\IMG_0001.JPG',
        新文件名: 'holiday-cover',
        新后缀: 'png'
      }
    ];

    expect(buildSpreadsheetRenamePlan(items, rows)).toEqual([
      {
        action: 'excel-rename',
        from: 'C:\\Photos\\IMG_0001.JPG',
        to: 'C:\\Photos\\holiday-cover.png',
        directory: 'C:\\Photos',
        targetDirectory: 'C:\\Photos',
        oldName: 'IMG_0001.JPG',
        newName: 'holiday-cover.png',
        changed: true
      }
    ]);
  });

  it('keeps the original extension when the imported extension cell is empty', () => {
    const rows = [
      {
        文件路径: 'C:\\Photos\\clip.MP4',
        新文件名: 'family-video',
        新后缀: ''
      }
    ];

    expect(buildSpreadsheetRenamePlan(items, rows)[0].newName).toBe('family-video.mp4');
  });

  it('uses a unique suffix when spreadsheet rows would create duplicate names', () => {
    const rows = [
      {
        文件路径: 'C:\\Photos\\IMG_0001.JPG',
        新文件名: 'same-name',
        新后缀: 'jpg'
      },
      {
        文件路径: 'C:\\Photos\\clip.MP4',
        新文件名: 'same-name',
        新后缀: 'jpg'
      }
    ];

    expect(buildSpreadsheetRenamePlan(items, rows).map((operation) => operation.newName)).toEqual([
      'same-name.jpg',
      'same-name-2.jpg'
    ]);
  });
});
