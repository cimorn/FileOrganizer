import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readRenameWorkbook, writeRenameWorkbook } from '../electron/excel-workbook.js';

const items = [
  {
    path: 'C:\\Photos\\IMG_0001.JPG',
    directory: 'C:\\Photos',
    name: 'IMG_0001.JPG',
    ext: '.jpg',
    size: 1234,
    type: 'image'
  }
];

let tempDirectory;

describe('excel workbook import and export', () => {
  afterEach(async () => {
    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true });
      tempDirectory = undefined;
    }
  });

  it('writes and reads rename workbook rows', async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'album-excel-'));
    const workbookPath = path.join(tempDirectory, 'rename.xlsx');

    await writeRenameWorkbook(workbookPath, items);
    const rows = await readRenameWorkbook(workbookPath);

    expect(rows).toEqual([
      {
        文件路径: 'C:\\Photos\\IMG_0001.JPG',
        文件名: 'IMG_0001',
        文件后缀: '.jpg',
        大小: 1234,
        新文件名: 'IMG_0001',
        新后缀: ''
      }
    ]);
  });
});
