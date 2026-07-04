const IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.tif',
  '.tiff',
  '.heic',
  '.heif',
  '.avif'
]);

const VIDEO_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.m4v',
  '.avi',
  '.mkv',
  '.webm',
  '.wmv',
  '.3gp',
  '.mts',
  '.m2ts'
]);

export function classifyMediaFile(filePath) {
  const ext = getExtension(filePath).toLowerCase();
  if (IMAGE_EXTENSIONS.has(ext)) {
    return { supported: true, previewable: true, type: 'image', ext };
  }
  if (VIDEO_EXTENSIONS.has(ext)) {
    return { supported: true, previewable: true, type: 'video', ext };
  }
  return { supported: false, previewable: false, type: 'other', ext };
}

export function classifyFile(filePath) {
  const media = classifyMediaFile(filePath);
  if (media.supported) {
    return media;
  }
  return {
    ...media,
    supported: true,
    type: 'file'
  };
}

export function isSupportedMedia(filePath) {
  return classifyMediaFile(filePath).supported;
}

export function getSupportedExtensions() {
  return {
    images: [...IMAGE_EXTENSIONS],
    videos: [...VIDEO_EXTENSIONS]
  };
}

function getExtension(filePath) {
  const normalized = String(filePath ?? '').replace(/\//g, '\\');
  const fileName = normalized.slice(normalized.lastIndexOf('\\') + 1);
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.slice(dotIndex) : '';
}
