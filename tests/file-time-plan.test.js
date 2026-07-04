import { describe, expect, it } from 'vitest';
import { buildFileTimePlan } from '../src/shared/file-time-plan.js';

const items = [
  {
    path: 'C:\\Photos\\b.jpg',
    name: 'b.jpg',
    takenAtMs: Date.UTC(2026, 0, 2)
  },
  {
    path: 'C:\\Photos\\a.jpg',
    name: 'a.jpg',
    takenAtMs: Date.UTC(2026, 0, 1)
  },
  {
    path: 'C:\\Photos\\c.mp4',
    name: 'c.mp4',
    takenAtMs: Date.UTC(2026, 0, 3)
  }
];

describe('file time plan', () => {
  it('assigns increasing file times in timeline order', () => {
    const startMs = Date.UTC(2026, 5, 30, 8, 0, 0);
    const plan = buildFileTimePlan(items, {
      startMs,
      intervalSeconds: 5
    });

    expect(plan.map((operation) => operation.path)).toEqual([
      'C:\\Photos\\c.mp4',
      'C:\\Photos\\b.jpg',
      'C:\\Photos\\a.jpg'
    ]);
    expect(plan.map((operation) => operation.newTimeMs)).toEqual([
      startMs,
      startMs + 5000,
      startMs + 10000
    ]);
  });

  it('uses a one second interval when the requested interval is invalid', () => {
    const startMs = Date.UTC(2026, 5, 30, 8, 0, 0);
    const plan = buildFileTimePlan(items.slice(0, 2), {
      startMs,
      intervalSeconds: 0
    });

    expect(plan.map((operation) => operation.newTimeMs)).toEqual([
      startMs,
      startMs + 1000
    ]);
  });
});
