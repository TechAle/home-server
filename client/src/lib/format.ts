/** Server values that mean "not available" on this platform. */
const UNAVAILABLE = [-591, -590];

export function isUnavailable(value: number | null | undefined): boolean {
  return (
    value == null || !Number.isFinite(value) || UNAVAILABLE.includes(value)
  );
}

export function formatPercent(value: number | null | undefined): string {
  if (isUnavailable(value)) {
    return '—';
  }
  const rounded = Math.round((value as number) * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

export function formatTemperature(value: number | null | undefined): string {
  return isUnavailable(value) ? '—' : `${(value as number).toFixed(1)}°C`;
}

export function formatGib(value: number | null | undefined): string {
  return isUnavailable(value) ? '—' : `${(value as number).toFixed(1)} GB`;
}

export function formatCount(value: number): string {
  return String(value);
}

/** "adesso", "12s fa", "5 min fa", "2 h fa". */
export function formatAgo(
  timestamp: number | null | undefined,
  now: number = Date.now(),
): string {
  if (!timestamp) {
    return '—';
  }
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 15) {
    return 'adesso';
  }
  if (seconds < 60) {
    return `${seconds}s fa`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min fa`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours} h fa`;
}

const MONTHS = [
  'gen',
  'feb',
  'mar',
  'apr',
  'mag',
  'giu',
  'lug',
  'ago',
  'set',
  'ott',
  'nov',
  'dic',
];

/** "18 nov · 13:26" from the ISO date AniList returns. */
export function formatAiring(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${date.getDate()} ${MONTHS[date.getMonth()]} · ${hours}:${minutes}`;
}
