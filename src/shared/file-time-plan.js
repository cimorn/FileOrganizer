import { sortMediaByTime } from './media-time.js';

export function buildFileTimePlan(items, options = {}) {
  const startMs = Number.isFinite(options.startMs) ? options.startMs : Date.now();
  const intervalSeconds = Math.max(1, Number(options.intervalSeconds) || 1);
  const intervalMs = intervalSeconds * 1000;

  return sortMediaByTime(Array.isArray(items) ? items : []).map((item, index) => ({
    path: item.path,
    name: item.name,
    oldTimeMs: item.takenAtMs ?? item.modifiedAtMs ?? item.createdAtMs,
    newTimeMs: startMs + index * intervalMs
  }));
}
