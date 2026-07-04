import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const defaultLimit = 60;

export async function readOperationHistory(historyFile) {
  try {
    const payload = JSON.parse(await readFile(historyFile, 'utf8'));
    return {
      entries: Array.isArray(payload.entries) ? payload.entries : []
    };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { entries: [] };
    }
    return { entries: [] };
  }
}

export async function appendOperationHistory(historyFile, entry, options = {}) {
  const limit = Math.max(1, Number(options.limit) || defaultLimit);
  const history = await readOperationHistory(historyFile);
  const createdAt = new Date().toISOString();
  const normalizedEntry = {
    id: randomUUID(),
    createdAt,
    type: entry.type || 'operation',
    label: entry.label || '文件操作',
    count: Number(entry.count) || 0,
    results: Array.isArray(entry.results) ? entry.results : [],
    metadata: entry.metadata ?? {}
  };

  const entries = [normalizedEntry, ...history.entries].slice(0, limit);
  await mkdir(path.dirname(historyFile), { recursive: true });
  await writeFile(historyFile, `${JSON.stringify({ entries }, null, 2)}\n`, 'utf8');
  return normalizedEntry;
}
