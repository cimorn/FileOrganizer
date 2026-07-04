import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findDuplicateFiles } from '../electron/duplicate-files.js';

let tempDirectory;

describe('duplicate file detection', () => {
  afterEach(async () => {
    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true });
      tempDirectory = undefined;
    }
  });

  it('groups files with identical content and reports wasted bytes', async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'album-duplicates-'));
    const first = path.join(tempDirectory, 'first.jpg');
    const second = path.join(tempDirectory, 'second.jpg');
    const different = path.join(tempDirectory, 'different.jpg');
    await writeFile(first, 'same photo bytes');
    await writeFile(second, 'same photo bytes');
    await writeFile(different, 'different photo bytes');

    const result = await findDuplicateFiles([
      { path: first, name: 'first.jpg', size: 16, type: 'image' },
      { path: second, name: 'second.jpg', size: 16, type: 'image' },
      { path: different, name: 'different.jpg', size: 21, type: 'image' }
    ]);

    expect(result.groupCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.duplicateBytes).toBe(16);
    expect(result.groups[0].items.map((item) => item.name)).toEqual(['first.jpg', 'second.jpg']);
    expect(result.groups[0].hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('ignores same-size files when their hashes differ', async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'album-duplicates-'));
    const first = path.join(tempDirectory, 'a.txt');
    const second = path.join(tempDirectory, 'b.txt');
    await writeFile(first, 'abcd');
    await writeFile(second, 'wxyz');

    const result = await findDuplicateFiles([
      { path: first, name: 'a.txt', size: 4, type: 'file' },
      { path: second, name: 'b.txt', size: 4, type: 'file' }
    ]);

    expect(result.groupCount).toBe(0);
    expect(result.groups).toEqual([]);
  });
});
