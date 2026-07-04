import { describe, expect, it } from 'vitest';
import { getDisplayDate, groupMediaByDay, sortMediaByTime } from '../src/shared/media-time.js';

describe('media timeline helpers', () => {
  it('uses embedded capture time before file modified time', () => {
    const item = {
      takenAtMs: Date.parse('2026-03-02T08:30:00+08:00'),
      modifiedAtMs: Date.parse('2026-03-04T10:00:00+08:00')
    };

    expect(getDisplayDate(item).toISOString()).toBe('2026-03-02T00:30:00.000Z');
  });

  it('falls back to file modified time when embedded time is missing', () => {
    const item = {
      takenAtMs: null,
      modifiedAtMs: Date.parse('2026-04-06T11:15:00+08:00')
    };

    expect(getDisplayDate(item).toISOString()).toBe('2026-04-06T03:15:00.000Z');
  });

  it('sorts newest media first while keeping stable file-name order for ties', () => {
    const media = [
      { name: 'B.jpg', takenAtMs: Date.parse('2026-01-01T08:00:00+08:00') },
      { name: 'C.jpg', takenAtMs: Date.parse('2026-01-02T08:00:00+08:00') },
      { name: 'A.jpg', takenAtMs: Date.parse('2026-01-01T08:00:00+08:00') }
    ];

    expect(sortMediaByTime(media).map((item) => item.name)).toEqual(['C.jpg', 'A.jpg', 'B.jpg']);
  });

  it('groups media by local calendar day in timeline order', () => {
    const media = [
      { name: 'night.mp4', takenAtMs: Date.parse('2026-05-03T21:00:00+08:00') },
      { name: 'morning.jpg', takenAtMs: Date.parse('2026-05-03T08:00:00+08:00') },
      { name: 'older.jpg', takenAtMs: Date.parse('2026-05-02T08:00:00+08:00') }
    ];

    expect(groupMediaByDay(media, 'zh-CN').map((group) => [group.key, group.items.length])).toEqual([
      ['2026-05-03', 2],
      ['2026-05-02', 1]
    ]);
  });
});
