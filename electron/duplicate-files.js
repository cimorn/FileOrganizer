import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export async function findDuplicateFiles(items, options = {}) {
  const candidates = Array.isArray(items) ? items.filter((item) => item?.path && Number.isFinite(item.size)) : [];
  const bySize = new Map();

  for (const item of candidates) {
    const key = String(item.size);
    if (!bySize.has(key)) {
      bySize.set(key, []);
    }
    bySize.get(key).push(item);
  }

  const possibleDuplicates = [...bySize.values()].filter((group) => group.length > 1);
  const groups = [];
  let hashedCount = 0;
  const totalToHash = possibleDuplicates.reduce((sum, group) => sum + group.length, 0);

  for (const sameSizeItems of possibleDuplicates) {
    const byHash = new Map();
    for (const item of sameSizeItems) {
      const hash = await hashFile(item.path);
      hashedCount += 1;
      options.onProgress?.({
        phase: 'duplicates',
        current: hashedCount,
        total: totalToHash,
        path: item.path
      });

      if (!byHash.has(hash)) {
        byHash.set(hash, []);
      }
      byHash.get(hash).push(item);
    }

    for (const [hash, duplicateItems] of byHash.entries()) {
      if (duplicateItems.length < 2) {
        continue;
      }
      const size = duplicateItems[0].size;
      groups.push({
        id: `${hash}-${size}`,
        hash,
        size,
        count: duplicateItems.length,
        duplicateBytes: size * (duplicateItems.length - 1),
        items: duplicateItems.map((item) => ({
          path: item.path,
          name: item.name,
          size: item.size,
          type: item.type,
          directory: item.directory
        }))
      });
    }
  }

  const duplicateBytes = groups.reduce((sum, group) => sum + group.duplicateBytes, 0);
  const duplicateCount = groups.reduce((sum, group) => sum + group.items.length - 1, 0);

  return {
    ok: true,
    groupCount: groups.length,
    duplicateCount,
    duplicateBytes,
    groups
  };
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
