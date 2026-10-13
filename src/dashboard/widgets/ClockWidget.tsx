import React from 'react';
import { PROFILE } from '../../config/profile';
import { useSharedTicker } from './useSharedTicker';

export const ClockWidget: React.FC = () => {
  const now = useSharedTicker();
  const tz = PROFILE.timezone || 'UTC';

  let timeStr = '00:00:00';
  let dateStr = '1970-01-01';
  try {
    const dt = new Date(now);
    timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(dt);
    dateStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dt);
  } catch {
    const dt = new Date(now);
    timeStr = dt.toISOString().slice(11, 19);
    dateStr = dt.toISOString().slice(0, 10);
  }

  return (
    <div className="flex items-center justify-between gap-2 text-[var(--ink)]" data-testid="widget-clock">
      <div>
        <div className="font-display text-lg leading-none tracking-[0.08em]">{timeStr}</div>
        <div className="font-mono text-[8px] tracking-[0.14em] uppercase mt-1">
          {dateStr} // {tz}
        </div>
      </div>
      <span className="font-mono text-[8px] tracking-[0.14em] uppercase px-1.5 py-0.5 border border-[var(--ink)] bg-[var(--paper)]">
        LOCAL
      </span>
    </div>
  );
};
