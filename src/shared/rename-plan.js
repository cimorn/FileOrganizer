import { getDisplayDate, sortMediaByTime } from './media-time.js';

const WINDOWS_RESERVED_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;
const WINDOWS_RESERVED_PATH_CHARS = /[<>:"|?*\u0000-\u001F]/g;
const TRAILING_DOTS_OR_SPACES = /[. ]+$/g;

export function renderNameTemplate(template, media, index = 1) {
  const date = getDisplayDate(media) ?? new Date(0);
  const originalBase = stripExtension(media?.name ?? '');
  const replacements = getTemplateValues(date, media, index);
  replacements.name = originalBase;

  return sanitizeFilePart(replaceTemplateTokens(template, replacements)) || `media-${formatIndex(index)}`;
}

export function renderFolderTemplate(template, media, index = 1) {
  const date = getDisplayDate(media) ?? new Date(0);
  const originalBase = stripExtension(media?.name ?? '');
  const replacements = getTemplateValues(date, media, index);
  replacements.name = originalBase;

  return replaceTemplateTokens(template, replacements)
    .split(/[\\/]+/)
    .map((part) => sanitizePathPart(part))
    .filter(Boolean)
    .join('\\');
}

export function buildRenamePlan(items, template, locale = 'zh-CN') {
  const usedNamesByDirectory = new Map();

  return sortMediaByTime(items).map((media, itemIndex) => {
    const directory = media.directory || winDirname(media.path);
    const baseName = renderNameTemplate(template, media, itemIndex + 1, locale);
    const extension = normalizeExtension(media.ext || winExtname(media.name));
    const newName = makeUniqueName(directory, `${baseName}${extension}`, usedNamesByDirectory);
    const to = winJoin(directory, newName);

    return {
      action: 'rename',
      from: media.path,
      to,
      directory,
      targetDirectory: directory,
      oldName: media.name,
      newName,
      changed: normalizePath(media.path) !== normalizePath(to)
    };
  });
}

export function buildMovePlan(items, destinationDirectory, folderTemplate = '', locale = 'zh-CN') {
  const usedNamesByDirectory = new Map();

  return sortMediaByTime(items).map((media, itemIndex) => {
    const folderPart = folderTemplate ? renderFolderTemplate(folderTemplate, media, itemIndex + 1, locale) : '';
    const targetDirectory = folderPart
      ? winJoin(destinationDirectory, folderPart)
      : destinationDirectory;
    const newName = makeUniqueName(targetDirectory, media.name, usedNamesByDirectory);
    const to = winJoin(targetDirectory, newName);

    return {
      action: 'move',
      from: media.path,
      to,
      directory: media.directory || winDirname(media.path),
      targetDirectory,
      oldName: media.name,
      newName,
      changed: normalizePath(media.path) !== normalizePath(to)
    };
  });
}

export function mergeRenameAndMovePlans(renamePlan, destinationDirectory, folderTemplate = '', mediaByPath = new Map()) {
  const usedNamesByDirectory = new Map();

  return renamePlan.map((operation, operationIndex) => {
    const media = mediaByPath.get(operation.from) ?? operation;
    const folderPart = folderTemplate ? renderFolderTemplate(folderTemplate, media, operationIndex + 1) : '';
    const targetDirectory = folderPart
      ? winJoin(destinationDirectory, folderPart)
      : destinationDirectory;
    const newName = makeUniqueName(targetDirectory, operation.newName, usedNamesByDirectory);

    return {
      ...operation,
      action: 'rename-move',
      to: winJoin(targetDirectory, newName),
      targetDirectory,
      newName,
      changed: true
    };
  });
}

export function sanitizeFilePart(value) {
  return String(value)
    .replace(WINDOWS_RESERVED_CHARS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(TRAILING_DOTS_OR_SPACES, '');
}

export function sanitizePathPart(value) {
  return String(value)
    .replace(WINDOWS_RESERVED_PATH_CHARS, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(TRAILING_DOTS_OR_SPACES, '');
}

export function normalizeExtension(extension) {
  if (!extension) {
    return '';
  }
  return extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
}

function getTemplateValues(date, media, index) {
  return {
    yyyy: date.getFullYear(),
    yy: String(date.getFullYear()).slice(-2),
    MM: pad2(date.getMonth() + 1),
    M: date.getMonth() + 1,
    dd: pad2(date.getDate()),
    d: date.getDate(),
    HH: pad2(date.getHours()),
    H: date.getHours(),
    mm: pad2(date.getMinutes()),
    m: date.getMinutes(),
    ss: pad2(date.getSeconds()),
    s: date.getSeconds(),
    index: formatIndex(index),
    i: index,
    type: media?.type ?? 'media',
    ext: normalizeExtension(media?.ext ?? ''),
    source: media?.takenAtSource ?? 'file'
  };
}

function replaceTemplateTokens(template, replacements) {
  return String(template || '{yyyy}{MM}{dd}_{HH}{mm}{ss}_{index}').replace(/\{([a-zA-Z]+)\}/g, (match, token) => {
    if (Object.prototype.hasOwnProperty.call(replacements, token)) {
      return String(replacements[token]);
    }
    return match;
  });
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
  return fileName.slice(0, fileName.length - winExtname(fileName).length);
}

function normalizePath(value) {
  return String(value ?? '').replace(/\//g, '\\').toLowerCase();
}

function formatIndex(index) {
  return String(index).padStart(3, '0');
}

function pad2(value) {
  return String(value).padStart(2, '0');
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
