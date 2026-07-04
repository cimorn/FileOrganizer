import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { appendOperationHistory, readOperationHistory } from '../electron/operation-history.js';

let tempDirectory;

describe('operation history store', () => {
  afterEach(async () => {
    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true });
      tempDirectory = undefined;
    }
  });

  it('persists newest operation entries first with restore data', async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'album-history-'));
    const historyFile = path.join(tempDirectory, 'history.json');

    const first = await appendOperationHistory(historyFile, {
      type: 'operation',
      label: '应用改名',
      count: 1,
      results: [{ from: 'A.jpg', to: 'B.jpg', ok: true }]
    });
    const second = await appendOperationHistory(historyFile, {
      type: 'time',
      label: '一键改时间',
      count: 2,
      results: [{ path: 'B.jpg', ok: true, previous: { modifiedAtMs: 1 } }]
    });

    const history = await readOperationHistory(historyFile);

    expect(history.entries.map((entry) => entry.id)).toEqual([second.id, first.id]);
    expect(history.entries[0]).toMatchObject({
      type: 'time',
      label: '一键改时间',
      count: 2
    });
    expect(history.entries[1].results).toEqual([{ from: 'A.jpg', to: 'B.jpg', ok: true }]);
  });

  it('keeps only the configured number of recent entries', async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'album-history-'));
    const historyFile = path.join(tempDirectory, 'history.json');

    await appendOperationHistory(historyFile, { type: 'operation', label: 'first', count: 1 }, { limit: 2 });
    await appendOperationHistory(historyFile, { type: 'operation', label: 'second', count: 1 }, { limit: 2 });
    await appendOperationHistory(historyFile, { type: 'operation', label: 'third', count: 1 }, { limit: 2 });

    const history = await readOperationHistory(historyFile);

    expect(history.entries.map((entry) => entry.label)).toEqual(['third', 'second']);
  });
});
