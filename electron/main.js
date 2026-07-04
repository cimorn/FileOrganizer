import { app, BrowserWindow, Menu, dialog, ipcMain, shell } from 'electron';
import { open, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import exifr from 'exifr';
import { readRenameWorkbook, writeRenameWorkbook } from './excel-workbook.js';
import { applyFileTimes } from './file-time.js';
import { findDuplicateFiles } from './duplicate-files.js';
import { appendOperationHistory, readOperationHistory } from './operation-history.js';
import { executeOperations, undoOperations, validateOperationConflicts } from '../src/shared/file-operations.js';
import { classifyFile } from '../src/shared/media-types.js';
import { parseQuickTimeCreationTime } from '../src/shared/quicktime-time.js';

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const quickTimeReadLimit = 8 * 1024 * 1024;

let mainWindow;

app.setAppUserModelId('local.file-organizer');

const gotSingleInstanceLock = app.requestSingleInstanceLock();

function createWindow() {
  const window = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: '文件整理',
    autoHideMenuBar: true,
    icon: path.join(app.getAppPath(), 'assets', 'app-icon.png'),
    backgroundColor: '#f7f8f6',
    webPreferences: {
      preload: path.join(app.getAppPath(), 'electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  mainWindow = window;
  mainWindow.on('closed', () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'));
  }
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    focusMainWindow();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        focusMainWindow();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('album:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择文件夹',
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('album:select-destination', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择目标文件夹',
    properties: ['openDirectory', 'createDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('album:scan-directory', async (_event, options) => {
  const directory = options?.directory;
  if (!directory) {
    throw new Error('请选择文件夹');
  }
  return scanDirectory(directory, Boolean(options?.recursive));
});

ipcMain.handle('album:find-duplicates', async (_event, items) => {
  if (!Array.isArray(items)) {
    throw new Error('查重列表无效');
  }
  return findDuplicateFiles(items, {
    onProgress: (progress) => _event.sender.send('album:operation-progress', progress)
  });
});

ipcMain.handle('album:get-history', async () => readOperationHistory(getHistoryFilePath()));

ipcMain.handle('album:execute-operations', async (_event, operations, metadata = {}) => {
  if (!Array.isArray(operations)) {
    throw new Error('操作列表无效');
  }
  const result = await executeOperations(operations, {
    onProgress: (progress) => _event.sender.send('album:operation-progress', progress)
  });
  await recordHistory({
    type: 'operation',
    label: metadata?.label || '文件操作',
    count: result.count,
    results: result.results,
    metadata: {
      mode: metadata?.mode || 'operation'
    }
  });
  return result;
});

ipcMain.handle('album:validate-operations', async (_event, operations) => {
  if (!Array.isArray(operations)) {
    throw new Error('操作列表无效');
  }
  return validateOperationConflicts(operations);
});

ipcMain.handle('album:undo-operations', async (_event, results, metadata = {}) => {
  if (!Array.isArray(results)) {
    throw new Error('撤销列表无效');
  }
  const result = await undoOperations(results, {
    onProgress: (progress) => _event.sender.send('album:operation-progress', progress)
  });
  await recordHistory({
    type: 'undo',
    label: '撤销操作',
    count: result.count,
    results: result.results,
    metadata: {
      sourceHistoryId: metadata?.historyId
    }
  });
  return result;
});

ipcMain.handle('album:export-excel', async (_event, items) => {
  if (!Array.isArray(items)) {
    throw new Error('导出列表无效');
  }
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '导出表格',
    defaultPath: path.join(app.getPath('desktop'), '文件改名清单.xlsx'),
    filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
  });
  if (result.canceled || !result.filePath) {
    return null;
  }
  return writeRenameWorkbook(result.filePath, items);
});

ipcMain.handle('album:import-excel', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '导入表格',
    properties: ['openFile'],
    filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
  });
  if (result.canceled || !result.filePaths[0]) {
    return null;
  }
  const filePath = result.filePaths[0];
  const rows = await readRenameWorkbook(filePath);
  return {
    ok: true,
    filePath,
    rows,
    count: rows.length
  };
});

ipcMain.handle('album:set-file-times', async (_event, operations) => {
  if (!Array.isArray(operations)) {
    throw new Error('时间修改列表无效');
  }
  const result = await applyFileTimes(operations, {
    onProgress: (progress) => _event.sender.send('album:operation-progress', progress)
  });
  await recordHistory({
    type: 'time',
    label: '一键改时间',
    count: result.count,
    results: result.results
  });
  return result;
});

ipcMain.handle('album:open-path', async (_event, filePath) => {
  if (!filePath) {
    return { ok: false, error: '文件路径为空' };
  }
  const error = await shell.openPath(filePath);
  return error ? { ok: false, error } : { ok: true };
});

ipcMain.handle('album:show-in-folder', async (_event, filePath) => {
  if (filePath) {
    shell.showItemInFolder(filePath);
  }
  return { ok: true };
});

async function scanDirectory(rootDirectory, recursive) {
  const files = [];
  await collectFiles(rootDirectory, recursive, files);

  const items = [];
  for (const filePath of files) {
    const item = await readFileItem(filePath);
    if (item) {
      items.push(item);
    }
  }

  return {
    directory: rootDirectory,
    scannedAtMs: Date.now(),
    items
  };
}

async function collectFiles(directory, recursive, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (recursive) {
        await collectFiles(entryPath, recursive, files);
      }
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    files.push(entryPath);
  }
}

async function readFileItem(filePath) {
  const classification = classifyFile(filePath);
  if (!classification.supported) {
    return null;
  }

  const fileStat = await stat(filePath);
  const embeddedDate = await readEmbeddedDate(filePath, fileStat.size, classification.type);

  const takenAtMs = embeddedDate?.date?.getTime() ?? fileStat.mtimeMs;
  const takenAtSource = embeddedDate?.source ?? '文件修改时间';

  return {
    id: filePath,
    path: filePath,
    url: pathToFileURL(filePath).href,
    directory: path.dirname(filePath),
    name: path.basename(filePath),
    ext: classification.ext,
    type: classification.type,
    previewable: classification.previewable,
    size: fileStat.size,
    createdAtMs: fileStat.birthtimeMs,
    modifiedAtMs: fileStat.mtimeMs,
    takenAtMs,
    takenAtSource
  };
}

async function readEmbeddedDate(filePath, fileSize, type) {
  if (type === 'image') {
    return readImageDate(filePath);
  }
  if (type === 'video') {
    return readVideoDate(filePath, fileSize);
  }
  return null;
}

async function readImageDate(filePath) {
  try {
    const metadata = await exifr.parse(filePath, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'DateCreated', 'MediaCreateDate']
    });
    const date = firstValidDate([
      metadata?.DateTimeOriginal,
      metadata?.CreateDate,
      metadata?.DateCreated,
      metadata?.MediaCreateDate,
      metadata?.ModifyDate
    ]);
    return date ? { date, source: '照片拍摄时间' } : null;
  } catch {
    return null;
  }
}

async function readVideoDate(filePath, fileSize) {
  try {
    const fileHandle = await open(filePath, 'r');
    try {
      const length = Math.min(fileSize, quickTimeReadLimit);
      const buffer = Buffer.alloc(length);
      await fileHandle.read(buffer, 0, length, 0);
      const date = parseQuickTimeCreationTime(buffer);
      return date ? { date, source: '视频创建时间' } : null;
    } finally {
      await fileHandle.close();
    }
  } catch {
    return null;
  }
}

function firstValidDate(values) {
  return values.find((value) => value instanceof Date && !Number.isNaN(value.getTime())) ?? null;
}

function getHistoryFilePath() {
  return path.join(app.getPath('userData'), 'operation-history.json');
}

async function recordHistory(entry) {
  try {
    await appendOperationHistory(getHistoryFilePath(), entry);
  } catch (error) {
    console.warn('Failed to write operation history', error);
  }
}
