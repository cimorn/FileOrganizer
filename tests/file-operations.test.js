import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { executeOperations, undoOperations, validateOperationConflicts } from '../src/shared/file-operations.js';

describe('file operation execution helpers', () => {
  it('reports target conflicts before applying operations', async () => {
    await withTempDir(async (dir) => {
      const from = join(dir, 'source.txt');
      const to = join(dir, 'target.txt');
      await writeFile(from, 'source');
      await writeFile(to, 'target');

      const result = await validateOperationConflicts([{ changed: true, from, to, oldName: 'source.txt', newName: 'target.txt' }]);

      expect(result).toMatchObject({
        ok: false,
        conflictCount: 1,
        conflicts: [{ from, to, oldName: 'source.txt', newName: 'target.txt' }]
      });
    });
  });

  it('emits progress while executing operations', async () => {
    await withTempDir(async (dir) => {
      const firstFrom = join(dir, 'a.txt');
      const secondFrom = join(dir, 'b.txt');
      const firstTo = join(dir, 'renamed-a.txt');
      const secondTo = join(dir, 'renamed-b.txt');
      await writeFile(firstFrom, 'a');
      await writeFile(secondFrom, 'b');
      const progress = [];

      const result = await executeOperations(
        [
          { changed: true, from: firstFrom, to: firstTo },
          { changed: true, from: secondFrom, to: secondTo }
        ],
        { onProgress: (event) => progress.push(event) }
      );

      expect(result.count).toBe(2);
      expect(progress.map((event) => [event.current, event.total, event.phase])).toEqual([
        [1, 2, 'execute'],
        [2, 2, 'execute']
      ]);
      expect(await readFile(firstTo, 'utf8')).toBe('a');
      expect(await readFile(secondTo, 'utf8')).toBe('b');
    });
  });

  it('undoes completed operations in reverse order', async () => {
    await withTempDir(async (dir) => {
      const original = join(dir, 'original.txt');
      const renamed = join(dir, 'renamed.txt');
      await writeFile(renamed, 'content');
      const progress = [];

      const result = await undoOperations(
        [{ from: original, to: renamed, ok: true }],
        { onProgress: (event) => progress.push(event) }
      );

      expect(result).toMatchObject({ ok: true, count: 1 });
      expect(progress).toEqual([{ phase: 'undo', current: 1, total: 1, from: renamed, to: original }]);
      expect(await readFile(original, 'utf8')).toBe('content');
    });
  });
});

async function withTempDir(callback) {
  const dir = await mkdtemp(join(tmpdir(), 'file-organizer-'));
  try {
    await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
