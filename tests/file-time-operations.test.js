import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyFileTimes } from '../electron/file-time.js';

let tempDirectory;

describe('file time operations', () => {
  afterEach(async () => {
    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true });
      tempDirectory = undefined;
    }
  });

  it('updates file modified times and records previous times', async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'album-file-time-'));
    const firstPath = path.join(tempDirectory, 'first.txt');
    const secondPath = path.join(tempDirectory, 'second.txt');
    await writeFile(firstPath, 'first');
    await writeFile(secondPath, 'second');

    const startMs = Date.UTC(2026, 5, 30, 8, 0, 0);
    const result = await applyFileTimes([
      { path: firstPath, newTimeMs: startMs },
      { path: secondPath, newTimeMs: startMs + 2000 }
    ]);

    const firstStat = await stat(firstPath);
    const secondStat = await stat(secondPath);

    expect(result.count).toBe(2);
    expect(result.results[0]).toMatchObject({
      path: firstPath,
      ok: true,
      newTimeMs: startMs
    });
    expect(result.results[0].previous.modifiedAtMs).toEqual(expect.any(Number));
    expect(Math.round(firstStat.mtimeMs / 1000)).toBe(Math.round(startMs / 1000));
    expect(Math.round(secondStat.mtimeMs / 1000)).toBe(Math.round((startMs + 2000) / 1000));
  });
});
