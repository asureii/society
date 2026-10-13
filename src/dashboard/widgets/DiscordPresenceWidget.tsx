import React from 'react';
import { useAppStore, type DiscordActivity, type DiscordStatusType } from '../../store/useAppStore';
import { PROFILE } from '../../config/profile';
import { HalftoneThumb } from './HalftoneThumb';
import { formatDurationClock, useSharedTicker } from './useSharedTicker';

function getActivityTypeLabel(type: number): string {
  switch (type) {
    case 0:
      return 'PLAYING';
    case 1:
      return 'STREAMING';
    case 2:
      return 'LISTENING';
    case 3:
      return 'WATCHING';
    case 5:
      return 'COMPETING';
    default:
      return 'ACTIVE';
  }
}

function resolveActivityImageUrl(activity: DiscordActivity): string | null {
  const raw = activity.assets?.large_image;
  if (!raw) return null;
  if (raw.startsWith('mp:external/')) {
    return `https://media.discordapp.net/${raw.replace(/^mp:/, '')}`;
  }
  if (raw.startsWith('spotify:')) {
    return `https://i.scdn.co/image/${raw.slice('spotify:'.length)}`;
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (activity.application_id) {
    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${raw}.png`;
  }
  return null;
}

/**
 * Strict 3-color status shape (never green, yellow, or purple):
 * - online: red dot
 * - idle: half-filled dot
 * - dnd: dot with horizontal bar
 * - offline: hollow ring
 */
export const StatusShapeIcon: React.FC<{ status: DiscordStatusType }> = ({ status }) => {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-label={`Status: ${status}`}
      data-status-shape={status}
      className="shrink-0"
    >
      {status === 'online' && (
        <circle
          cx="6"
          cy="6"
          r="4.5"
          fill="var(--red)"
          stroke="var(--ink)"
          strokeWidth="1.25"
        />
      )}
      {status === 'idle' && (
        <>
          <circle
            cx="6"
            cy="6"
            r="4.5"
            fill="var(--paper-pure)"
            stroke="var(--ink)"
            strokeWidth="1.25"
          />
          <path d="M 6 1.5 A 4.5 4.5 0 0 0 6 10.5 Z" fill="var(--ink)" />
        </>
      )}
      {status === 'dnd' && (
        <>
          <circle
            cx="6"
            cy="6"
            r="4.5"
            fill="var(--red)"
            stroke="var(--ink)"
            strokeWidth="1.25"
          />
          <rect x="2.8" y="5.1" width="6.4" height="1.8" fill="var(--paper-pure)" />
        </>
      )}
      {status === 'offline' && (
        <circle
          cx="6"
          cy="6"
          r="4.2"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.5"
        />
      )}
    </svg>
  );
};

const SyncAndTimersBar: React.FC<{
  lastSyncAt: number | null;
  unreachable: boolean;
}> = ({ lastSyncAt, unreachable }) => {
  const now = useSharedTicker();
  if (unreachable) {
    return (
      <span
        data-testid="discord-sync-readout"
        className="font-mono text-[8px] tracking-[0.14em] uppercase font-bold text-[var(--red)]"
      >
        SIGNAL LOST: RETRYING
      </span>
    );
  }

  const elapsedMs = lastSyncAt ? Math.max(0, now - lastSyncAt) : 0;
  return (
    <span
      data-testid="discord-sync-readout"
      className="font-mono text-[8px] tracking-[0.14em] uppercase text-[var(--ink)]"
    >
      SYNC {formatDurationClock(elapsedMs)} AGO
    </span>
  );
};

const ActivityElapsedChip: React.FC<{ startMs?: number }> = ({ startMs }) => {
  const now = useSharedTicker();
  if (!startMs) return null;
  return (
    <span className="font-mono text-[8px] tracking-[0.12em] uppercase px-1 border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] shrink-0">
      {formatDurationClock(now - startMs)}
    </span>
  );
};

export const DiscordPresenceWidget: React.FC = () => {
  const discord = useAppStore((s) => s.discord);
  const displayName = discord.displayName || PROFILE.shortName;
  const username = discord.username || PROFILE.githubUsername;
  const nonCustomActivities = discord.activities
    .filter((act) => act.type !== 4)
    .slice(0, 3);

  const activePlatforms: Array<{ key: 'desktop' | 'mobile' | 'web'; label: string }> = [
    { key: 'desktop', label: 'DESKTOP' },
    { key: 'mobile', label: 'MOBILE' },
    { key: 'web', label: 'WEB' },
  ];

  return (
    <div className="flex flex-col gap-2 text-[var(--ink)]" data-testid="widget-discord-presence">
      {/* Top identity row */}
      <div className="flex items-center gap-2.5">
        <HalftoneThumb
          src={discord.avatarUrl}
          alt={`${displayName} avatar`}
          size={40}
          fallbackLabel={displayName.slice(0, 2)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <StatusShapeIcon status={discord.status} />
            <span
              data-testid="discord-display-name"
              className="font-display text-xs tracking-[0.06em] uppercase truncate"
            >
              {displayName}
            </span>
            <span
              data-testid="discord-status-label"
              className="ml-auto font-mono text-[8px] tracking-[0.16em] uppercase px-1 py-0.5 border border-[var(--ink)] bg-[var(--paper)] font-bold"
            >
              {discord.status.toUpperCase()}
            </span>
          </div>
          <div className="font-mono text-[9px] tracking-[0.08em] truncate mt-0.5">
            @{username}
          </div>
          {discord.customStatus && (
            <div
              data-testid="discord-custom-status"
              className="font-mono text-[9px] tracking-[0.04em] truncate mt-0.5 border-l-2 border-[var(--ink)] pl-1.5"
            >
              {discord.customStatusEmoji?.name && (
                <span className="manga-image-filter mr-1" aria-hidden="true">
                  {discord.customStatusEmoji.name}
                </span>
              )}
              <span>“{discord.customStatus}”</span>
            </div>
          )}
        </div>
      </div>

      {/* Activities list (up to 3) */}
      {nonCustomActivities.length > 0 ? (
        <div className="flex flex-col gap-1.5 border-t border-[var(--ink)] pt-1.5">
          {nonCustomActivities.map((act, idx) => {
            const imgUrl = resolveActivityImageUrl(act);
            return (
              <div
                key={`${act.name}-${idx}`}
                data-testid={`discord-activity-${idx}`}
                className="flex items-start gap-2 p-1.5 border border-[var(--ink)] bg-[var(--paper)]"
              >
                {imgUrl && (
                  <HalftoneThumb
                    src={imgUrl}
                    alt={act.name}
                    size={28}
                    fallbackLabel={act.name.slice(0, 2)}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[8px] tracking-[0.14em] uppercase font-bold px-1 bg-[var(--ink)] text-[var(--paper-pure)]">
                      {getActivityTypeLabel(act.type)}
                    </span>
                    <ActivityElapsedChip startMs={act.timestamps?.start} />
                  </div>
                  <div className="font-mono text-[9px] font-bold tracking-[0.04em] truncate mt-0.5">
                    {act.name}
                  </div>
                  {(act.details || act.state) && (
                    <div className="font-mono text-[8px] tracking-[0.02em] truncate">
                      {[act.details, act.state].filter(Boolean).join(' // ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border-t border-[var(--ink)] pt-1.5 font-mono text-[8px] tracking-[0.14em] uppercase">
          {discord.unreachable
            ? 'LANYARD TELEMETRY OFFLINE // DORMANT PROTOCOL'
            : 'NO ACTIVE SUB-PROCESSES // STANDBY'}
        </div>
      )}

      {/* Platform tags & sync footer */}
      <div className="flex items-center justify-between gap-1.5 border-t border-[var(--ink)] pt-1.5">
        <div className="flex items-center gap-1" aria-label="Active Discord platforms">
          {activePlatforms.map((plat) => {
            const isActive = discord.platforms[plat.key];
            return (
              <span
                key={plat.key}
                data-platform={plat.key}
                data-active={isActive ? 'true' : 'false'}
                className={`font-mono text-[7px] tracking-[0.14em] uppercase px-1 py-0.2 border border-[var(--ink)] ${
                  isActive
                    ? 'bg-[var(--ink)] text-[var(--paper-pure)] font-bold'
                    : 'bg-[var(--paper)] text-[var(--ink)] opacity-60'
                }`}
              >
                {plat.label}
              </span>
            );
          })}
        </div>
        <SyncAndTimersBar
          lastSyncAt={discord.lastUpdated}
          unreachable={discord.unreachable}
        />
      </div>
    </div>
  );
};
