import { sanitizeFilePart } from './rename-plan.js';

export const EXCEL_RENAME_COLUMNS = ['文件路径', '文件名', '文件后缀', '大小', '新文件名', '新后缀'];

export function buildExcelExportRows(items) {
  return normalizedArray(items).map((item) => {
    const extension = normalizeExtension(item.ext || winExtname(item.name));
    const baseName = stripExtension(item.name);
    return {
      文件路径: item.path,
      文件名: baseName,
      文件后缀: extension,
      大小: Number(item.size) || 0,
      新文件名: baseName,
      新后缀: ''
    };
  });
}

export function buildSpreadsheetRenamePlan(items, rows) {
  const itemsByPath = new Map(
    normalizedArray(items).map((item) => [normalizePath(item.path), item])
  );
  const usedNamesByDirectory = new Map();
  const operations = [];

  for (const row of normalizedArray(rows)) {
    const item = itemsByPath.get(normalizePath(row['文件路径']));
    if (!item) {
      continue;
    }

    const directory = item.directory || winDirname(item.path);
    const oldExtension = normalizeExtension(item.ext || winExtname(item.name));
    const oldBaseName = stripExtension(item.name);
    const importedName = readCell(row['新文件名']);
    const importedExtension = readCell(row['新后缀']);
    const nextBaseName = sanitizeFilePart(importedName || oldBaseName) || oldBaseName;
    const nextExtension = importedExtension
      ? normalizeSpreadsheetExtension(importedExtension)
      : oldExtension;
    const newName = makeUniqueName(directory, `${nextBaseName}${nextExtension}`, usedNamesByDirectory);
    const to = winJoin(directory, newName);

    if (normalizePath(item.path) === normalizePath(to)) {
      continue;
    }

    operations.push({
      action: 'excel-rename',
      from: item.path,
      to,
      directory,
      targetDirectory: directory,
      oldName: item.name,
      newName,
      changed: true
    });
  }

  return operations;
}

function normalizedArray(value) {
  return Array.isArray(value) ? value : [];
}

function readCell(value) {
  return String(value ?? '').trim();
}

function normalizeSpreadsheetExtension(value) {
  const cleaned = sanitizeFilePart(readCell(value)).replace(/^\.+/, '');
  return cleaned ? `.${cleaned.toLowerCase()}` : '';
}

function normalizeExtension(extension) {
  const value = readCell(extension);
  if (!value) {
    return '';
  }
  return value.startsWith('.') ? value.toLowerCase() : `.${value.toLowerCase()}`;
}

function makeUniqueName(directory, candidateName, usedNamesByDirectory) {
  const directoryKey = normalizePath(directory);
  const usedNames = usedNamesByDirectory.get(directoryKey) ?? new Set();
  usedNamesByDirectory.set(directoryKey, usedNames);

  const parsed = winParse(candidateName);
  let finalName = candidateName;
  let suffix = 2;
  while (usedNames.has(finalName.toLowerCase())) {
    finalName = `${parsed.name}-${suffix}${parsed.ext}`;
    suffix += 1;
  }

  usedNames.add(finalName.toLowerCase());
  return finalName;
}

function stripExtension(fileName) {
  const value = String(fileName ?? '');
  return value.slice(0, value.length - winExtname(value).length);
}

function normalizePath(filePath) {
  return String(filePath ?? '').replace(/\//g, '\\').toLowerCase();
}

function winJoin(...parts) {
  const filtered = parts.map((part) => String(part ?? '')).filter(Boolean);
  if (filtered.length === 0) {
    return '';
  }
  return filtered
    .join('\\')
    .replace(/[\\/]+/g, '\\')
    .replace(/^([A-Za-z]:)\\?/, '$1\\');
}

function winDirname(filePath) {
  const normalized = String(filePath ?? '').replace(/\//g, '\\');
  const index = normalized.lastIndexOf('\\');
  return index >= 0 ? normalized.slice(0, index) : '';
}

function winExtname(fileName) {
  const normalized = String(fileName ?? '').replace(/\//g, '\\');
  const baseName = normalized.slice(normalized.lastIndexOf('\\') + 1);
  const dotIndex = baseName.lastIndexOf('.');
  return dotIndex > 0 ? baseName.slice(dotIndex) : '';
}

function winParse(fileName) {
  const ext = winExtname(fileName);
  const value = String(fileName ?? '');
  return {
    name: value.slice(0, value.length - ext.length),
    ext
  };
}
