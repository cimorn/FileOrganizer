import { stat, utimes } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function applyFileTimes(operations, options = {}) {
  const actionable = Array.isArray(operations)
    ? operations.filter((operation) => operation?.path && Number.isFinite(operation.newTimeMs))
    : [];
  const results = [];

  for (const operation of actionable) {
    const before = await stat(operation.path);
    await setFileTime(operation.path, operation.newTimeMs);
    const result = {
      path: operation.path,
      name: operation.name,
      ok: true,
      newTimeMs: operation.newTimeMs,
      previous: {
        createdAtMs: before.birthtimeMs,
        accessedAtMs: before.atimeMs,
        modifiedAtMs: before.mtimeMs
      }
    };
    results.push(result);
    options.onProgress?.({
      phase: 'time',
      current: results.length,
      total: actionable.length,
      path: operation.path,
      newTimeMs: operation.newTimeMs
    });
  }

  return {
    ok: true,
    count: results.length,
    results
  };
}

async function setFileTime(filePath, timestampMs) {
  const date = new Date(timestampMs);
  await utimes(filePath, date, date);

  if (process.platform === 'win32') {
    await setWindowsFileTimes(filePath, timestampMs);
  }
}

async function setWindowsFileTimes(filePath, timestampMs) {
  const script = [
    '& {',
    'param($filePath, $timestampMs)',
    '$date = [DateTimeOffset]::FromUnixTimeMilliseconds([int64]$timestampMs).LocalDateTime',
    '$item = Get-Item -LiteralPath $filePath',
    '$item.CreationTime = $date',
    '$item.LastWriteTime = $date',
    '$item.LastAccessTime = $date',
    '}'
  ].join('; ');

  await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script, filePath, String(timestampMs)],
    { windowsHide: true }
  );
}
