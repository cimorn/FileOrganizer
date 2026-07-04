export function getDisplayTimestamp(item) {
  const candidates = [item?.takenAtMs, item?.createdAtMs, item?.modifiedAtMs];
  const value = candidates.find((candidate) => Number.isFinite(candidate) && candidate > 0);
  return value ?? null;
}

export function getDisplayDate(item) {
  const timestamp = getDisplayTimestamp(item);
  return timestamp ? new Date(timestamp) : null;
}

export function sortMediaByTime(items) {
  return [...items].sort((a, b) => {
    const timeDifference = (getDisplayTimestamp(b) ?? 0) - (getDisplayTimestamp(a) ?? 0);
    if (timeDifference !== 0) {
      return timeDifference;
    }
    return String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  });
}

export function getLocalDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 'unknown';
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function groupMediaByDay(items, locale = getDefaultLocale()) {
  const groups = new Map();

  for (const item of sortMediaByTime(items)) {
    const date = getDisplayDate(item);
    const key = date ? getLocalDateKey(date) : 'unknown';
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: date ? formatDateLabel(date, locale) : '未知时间',
        items: []
      });
    }
    groups.get(key).items.push(item);
  }

  return [...groups.values()];
}

export function formatDateLabel(date, locale = 'zh-CN') {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  }).format(date);
}

export function formatTimeLabel(date, locale = 'zh-CN') {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '未知';
  }
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function getDefaultLocale() {
  return typeof navigator === 'undefined' ? 'zh-CN' : navigator.language;
}
