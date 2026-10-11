interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export function getSessionCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.timestamp > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function setSessionCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = {
      timestamp: Date.now(),
      data,
    };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore storage quota errors
  }
}
