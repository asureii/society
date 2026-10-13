import { useEffect, useState } from 'react';

type Listener = (now: number) => void;
const listeners = new Set<Listener>();
let intervalId: number | null = null;

function ensureTicker() {
  if (intervalId !== null || typeof window === 'undefined') return;
  intervalId = window.setInterval(() => {
    const now = Date.now();
    listeners.forEach((fn) => fn(now));
  }, 1000);
}

function stopTickerIfIdle() {
  if (listeners.size === 0 && intervalId !== null) {
    window.clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Shared 1Hz time ticker hook so elapsed timers and sync readouts update
 * inside small leaf components without re-rendering the entire dashboard.
 */
export function useSharedTicker(): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const listener: Listener = (tickNow) => setNow(tickNow);
    listeners.add(listener);
    ensureTicker();
    return () => {
      listeners.delete(listener);
      stopTickerIfIdle();
    };
  }, []);

  return now;
}

export function formatDurationClock(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}
