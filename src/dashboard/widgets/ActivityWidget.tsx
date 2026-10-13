import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { HalftoneThumb } from './HalftoneThumb';
import { formatDurationClock, useSharedTicker } from './useSharedTicker';

const ElapsedBadge: React.FC<{ start?: number }> = ({ start }) => {
  const now = useSharedTicker();
  if (!start) return null;
  return (
    <span className="font-mono text-[8px] tracking-[0.12em] uppercase px-1.5 py-0.5 border border-[var(--ink)] bg-[var(--paper)] shrink-0">
      T+{formatDurationClock(now - start)}
    </span>
  );
};

export const ActivityWidget: React.FC = () => {
  const activities = useAppStore((s) => s.discord.activities);
  // Pick primary app/game activity (type 0/1/3/5, or fallback to any non-custom activity)
  const primary =
    activities.find((a) => a.type !== 4 && a.type !== 2) ||
    activities.find((a) => a.type !== 4) ||
    null;

  if (!primary) {
    return (
      <div
        data-testid="widget-activity-idle"
        className="flex items-center justify-between gap-2 py-1 text-[var(--ink)]"
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-mono text-[9px] tracking-[0.14em] uppercase font-bold">
            NO FOREGROUND PROCESS
          </span>
          <span className="font-mono text-[8px] tracking-[0.08em] uppercase">
            AWAITING WORKSTATION / GAME LOCK
          </span>
        </div>
        <span className="font-mono text-[8px] tracking-[0.14em] uppercase px-1.5 py-0.5 border border-[var(--ink)] bg-[var(--paper)]">
          IDLE
        </span>
      </div>
    );
  }

  const rawAsset = primary.assets?.large_image;
  const imgUrl =
    rawAsset && primary.application_id && !rawAsset.startsWith('mp:')
      ? `https://cdn.discordapp.com/app-assets/${primary.application_id}/${rawAsset}.png`
      : null;

  return (
    <div className="flex items-center gap-2.5 text-[var(--ink)]" data-testid="widget-activity-active">
      <HalftoneThumb
        src={imgUrl}
        alt={primary.name}
        size={36}
        fallbackLabel={primary.name.slice(0, 2)}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1.5">
          <span
            data-testid="activity-name"
            className="font-display text-xs tracking-[0.06em] uppercase truncate"
          >
            {primary.name}
          </span>
          <ElapsedBadge start={primary.timestamps?.start} />
        </div>
        {primary.details && (
          <div className="font-mono text-[9px] tracking-[0.04em] truncate mt-0.5">
            {primary.details}
          </div>
        )}
        {primary.state && (
          <div className="font-mono text-[8px] tracking-[0.04em] truncate opacity-80">
            {primary.state}
          </div>
        )}
      </div>
    </div>
  );
};
