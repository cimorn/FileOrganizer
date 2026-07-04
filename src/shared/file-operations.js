import { access, copyFile, mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';

export async function validateOperationConflicts(operations) {
  const actionable = getActionableOperations(operations);
  const sourcePaths = new Set(actionable.map((operation) => normalizePath(operation.from)));
  const conflicts = [];

  for (const operation of actionable) {
    const targetPath = normalizePath(operation.to);
    if (sourcePaths.has(targetPath)) {
      continue;
    }
    if (await pathExists(operation.to)) {
      conflicts.push({
        from: operation.from,
        to: operation.to,
        oldName: operation.oldName,
        newName: operation.newName
      });
    }
  }

  return {
    ok: conflicts.length === 0,
    conflictCount: conflicts.length,
    conflicts
  };
}

export async function executeOperations(operations, options = {}) {
  const actionable = getActionableOperations(operations);
  const validation = await validateOperationConflicts(actionable);
  if (!validation.ok) {
    throw new Error(`发现 ${validation.conflictCount} 个目标文件已存在，请先处理冲突`);
  }

  const timestamp = Date.now();
  const staged = [];

  try {
    for (let index = 0; index < actionable.length; index += 1) {
      const operation = actionable[index];
      const parsed = path.parse(operation.from);
      const temporaryPath = path.join(
        parsed.dir,
        `${parsed.name}.file-organizer-${timestamp}-${index}${parsed.ext}`
      );
      await rename(operation.from, temporaryPath);
      staged.push({ ...operation, temporaryPath });
    }

    const results = [];
    for (const operation of staged) {
      await mkdir(path.dirname(operation.to), { recursive: true });
      await moveFile(operation.temporaryPath, operation.to);
      const result = {
        from: operation.from,
        to: operation.to,
        ok: true
      };
      results.push(result);
      options.onProgress?.({
        phase: 'execute',
        current: results.length,
        total: staged.length,
        from: operation.from,
        to: operation.to
      });
    }

    return {
      ok: true,
      count: results.length,
      results
    };
  } catch (error) {
    await rollbackStagedFiles(staged);
    throw error;
  }
}

export async function undoOperations(results, options = {}) {
  const completed = Array.isArray(results)
    ? results.filter((operation) => operation?.ok && operation.from && operation.to)
    : [];
  const reversed = [...completed].reverse();
  const undoResults = [];

  for (const operation of reversed) {
    if (!(await pathExists(operation.to))) {
      throw new Error(`无法撤销，文件不存在：${operation.to}`);
    }
    if (await pathExists(operation.from)) {
      throw new Error(`无法撤销，原路径已有文件：${operation.from}`);
    }

    await mkdir(path.dirname(operation.from), { recursive: true });
    await moveFile(operation.to, operation.from);
    const result = {
      from: operation.to,
      to: operation.from,
      ok: true
    };
    undoResults.push(result);
    options.onProgress?.({
      phase: 'undo',
      current: undoResults.length,
      total: reversed.length,
      from: operation.to,
      to: operation.from
    });
  }

  return {
    ok: true,
    count: undoResults.length,
    results: undoResults
  };
}

async function moveFile(from, to) {
  try {
    await rename(from, to);
  } catch (error) {
    if (error?.code !== 'EXDEV') {
      throw error;
    }
    await copyFile(from, to);
    await rm(from, { force: true });
  }
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function rollbackStagedFiles(staged) {
  for (const operation of [...staged].reverse()) {
    if (await pathExists(operation.temporaryPath)) {
      try {
        await rename(operation.temporaryPath, operation.from);
      } catch {
        // Best effort rollback. The caller still receives the original error.
      }
    }
  }
}

function getActionableOperations(operations) {
  return Array.isArray(operations)
    ? operations.filter((operation) => operation?.changed && operation.from && operation.to)
    : [];
}

function normalizePath(filePath) {
  return path.resolve(String(filePath ?? '')).toLowerCase();
}
