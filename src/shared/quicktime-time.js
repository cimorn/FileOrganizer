const QUICKTIME_EPOCH_MS = Date.UTC(1904, 0, 1);
const UNIX_EPOCH_QUICKTIME_SECONDS = 2_082_844_800;

export function parseQuickTimeCreationTime(buffer) {
  if (!buffer || buffer.length < 16) {
    return null;
  }

  const mvhdIndex = findAscii(buffer, 'mvhd');
  if (mvhdIndex < 4 || mvhdIndex + 16 > buffer.length) {
    return null;
  }

  const version = buffer.readUInt8(mvhdIndex + 4);
  const seconds = version === 1
    ? readUInt64BEAsSafeNumber(buffer, mvhdIndex + 12)
    : buffer.readUInt32BE(mvhdIndex + 8);

  if (!Number.isFinite(seconds) || seconds <= UNIX_EPOCH_QUICKTIME_SECONDS) {
    return null;
  }

  return new Date(QUICKTIME_EPOCH_MS + seconds * 1000);
}

function findAscii(buffer, text) {
  const needle = Buffer.from(text, 'ascii');
  for (let index = 0; index <= buffer.length - needle.length; index += 1) {
    let matched = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (buffer[index + offset] !== needle[offset]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return index;
    }
  }
  return -1;
}

function readUInt64BEAsSafeNumber(buffer, offset) {
  if (offset + 8 > buffer.length) {
    return null;
  }
  const high = buffer.readUInt32BE(offset);
  const low = buffer.readUInt32BE(offset + 4);
  const value = high * 2 ** 32 + low;
  return Number.isSafeInteger(value) ? value : null;
}
