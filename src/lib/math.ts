export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(start: number, end: number, amt: number): number {
  return (1 - amt) * start + amt * end;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate).getTime();
  if (Number.isNaN(date)) return 'UNKNOWN';
  const diffMs = Date.now() - date;
  const diffSec = Math.max(1, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 365) return `${Math.floor(diffDay / 365)}y ago`;
  if (diffDay > 30) return `${Math.floor(diffDay / 30)}mo ago`;
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'just now';
}

export function isWithinDays(isoDate: string, days: number): boolean {
  const date = new Date(isoDate).getTime();
  if (Number.isNaN(date)) return false;
  return Date.now() - date <= days * 86400 * 1000;
}

export function formatElapsedDuration(startTimestampMs: number, nowMs: number): string {
  const elapsedSec = Math.max(0, Math.floor((nowMs - startTimestampMs) / 1000));
  const hrs = Math.floor(elapsedSec / 3600);
  const mins = Math.floor((elapsedSec % 3600) / 60);
  const secs = elapsedSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}
