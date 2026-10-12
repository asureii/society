import React, { useEffect, useState } from 'react';
import { PROFILE } from '../config/profile';
import { formatElapsedDuration, clamp } from '../lib/math';
import { useAppStore, type DiscordStatusType } from '../store/useAppStore';
import { CaptionBox } from '../ui/CaptionBox';

function getStatusSpec(status: DiscordStatusType) {
  switch (status) {
    case 'online':
      return {
        code: 'SYNC ACTIVE',
        harmonics: 'NOMINAL // LOCKED',
        badge: (
          <span
            className="inline-block w-3.5 h-3.5 bg-red border-2 border-ink"
            style={{ borderRadius: '9999px' }}
          />
        ),
      };
    case 'idle':
      return {
        code: 'STANDBY',
        harmonics: 'LOW POWER // IDLE',
        badge: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" fill="var(--paper-pure)" stroke="var(--ink)" strokeWidth="2" />
            <path d="M8 1.5 A6.5 6.5 0 0 1 8 14.5 Z" fill="var(--ink)" />
          </svg>
        ),
      };
    case 'dnd':
      return {
        code: 'DO NOT DISTURB',
        harmonics: 'ISOLATED // FOCUS',
        badge: (
          <span className="inline-flex items-center justify-center w-3.5 h-3.5 bg-ink border border-ink">
            <span className="block w-2 h-0.5 bg-paper-pure" />
          </span>
        ),
      };
    case 'offline':
    default:
      return {
        code: 'SIGNAL LOST',
        harmonics: 'OFFLINE // STANDBY',
        badge: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6" fill="none" stroke="var(--ink)" strokeWidth="2.5" />
          </svg>
        ),
      };
  }
}

export const Status: React.FC = () => {
  const discord = useAppStore((s) => s.discord);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const spec = getStatusSpec(discord.status);
  const primaryActivity = discord.activities[0];

  let spotifyPct = 0;
  if (discord.listeningToSpotify && discord.spotify) {
    const { start, end } = discord.spotify.timestamps;
    const total = Math.max(1, end - start);
    spotifyPct = clamp(((nowMs - start) / total) * 100, 0, 100);
  }

  return (
    <section
      id="chapter-status"
      aria-labelledby="heading-status"
      style={{ paddingTop: 'calc(var(--hud-top, 64px) + 24px)' }}
      className="relative min-h-[95vh] w-full px-5 sm:px-10 md:px-12 pb-12 pointer-events-none flex flex-col justify-between"
    >
      {/* Single Left Side Panel (<= 36vw on desktop) positioned OUTSIDE the Stage Focal Rect (x: 42-88%) */}
      <div
        data-content-box="status-side-panel"
        aria-live="polite"
        className="pointer-events-auto w-full md:max-w-[35vw] bg-paper-pure border-3 border-ink p-5 shadow-[5px_5px_0px_var(--ink)] space-y-4"
      >
        <div className="flex items-center justify-between border-b-2 border-red pb-2">
          <div>
            <span className="font-display text-xs tracking-[0.18em] uppercase text-red block">
              CHAPTER 04 // TELEMETRY
            </span>
            <h2
              id="heading-status"
              className="font-serif font-bold text-2xl text-ink uppercase leading-none mt-0.5"
            >
              PILOT STATUS
            </h2>
          </div>
          <span
            className="font-serif text-xs tracking-widest border border-ink px-2 py-0.5"
            aria-hidden="true"
          >
            同調率
          </span>
        </div>

        {/* Identity + Shape Status */}
        <div className="flex items-center gap-3.5 border-2 border-ink p-3 bg-paper">
          <div className="relative w-14 h-14 border-2 border-ink bg-paper-pure overflow-hidden shrink-0 flex items-center justify-center">
            {discord.avatarUrl ? (
              <img
                src={discord.avatarUrl}
                alt={`${discord.displayName} avatar`}
                className={`w-full h-full object-cover manga-image-filter ${
                  PROFILE.allowColorHoverOnMedia ? 'hover:filter-none' : ''
                }`}
              />
            ) : (
              <svg className="w-8 h-8 text-ink" viewBox="0 0 24 24" fill="none">
                <polygon points="12,3 21,20 3,20" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="14" r="3" fill="var(--red)" />
              </svg>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="font-serif font-bold text-base text-ink truncate">
              {discord.displayName}
            </div>
            <div className="font-mono text-xs text-ink truncate">@{discord.username}</div>
            <div className="mt-1 inline-flex items-center gap-2 bg-paper-pure border border-ink px-2 py-0.5">
              {spec.badge}
              <span className="font-mono text-xs font-bold tracking-wider uppercase text-ink">
                {spec.code}
              </span>
            </div>
          </div>
        </div>

        {/* Active Operation */}
        <div className="border-2 border-ink p-3 bg-paper space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold uppercase text-ink">
              ACTIVE OPERATION
            </span>
            <span className="font-mono text-xs font-bold text-red">
              {discord.connected ? 'WSS LIVE' : 'STANDBY'}
            </span>
          </div>

          {primaryActivity ? (
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-serif font-bold text-base text-ink uppercase">
                  {primaryActivity.name}
                </h3>
                {primaryActivity.timestamps?.start && (
                  <span className="font-mono text-xs font-bold bg-ink text-paper-pure px-1.5 py-0.5">
                    {formatElapsedDuration(primaryActivity.timestamps.start, nowMs)}
                  </span>
                )}
              </div>
              {primaryActivity.details && (
                <p className="font-mono text-xs text-ink mt-1">{primaryActivity.details}</p>
              )}
              {primaryActivity.state && (
                <p className="font-mono text-xs text-ink">{primaryActivity.state}</p>
              )}
            </div>
          ) : (
            <p className="font-mono text-xs text-ink">
              {spec.harmonics} — AWAITING LANYARD STREAM
            </p>
          )}
        </div>

        {/* Spotify Relay */}
        <div className="border-2 border-ink p-3 bg-paper">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-mono text-xs font-bold uppercase text-ink">
              SPOTIFY RELAY
            </span>
            <span className="font-mono text-xs font-bold text-red uppercase">
              {discord.listeningToSpotify ? 'PLAYING' : 'IDLE'}
            </span>
          </div>

          {discord.listeningToSpotify && discord.spotify ? (
            <div className="space-y-1.5">
              <div className="font-serif font-bold text-sm text-ink truncate">
                {discord.spotify.song} — {discord.spotify.artist}
              </div>
              <div className="w-full h-2 bg-paper-pure border border-ink overflow-hidden">
                <div
                  className="h-full bg-red transition-all duration-300"
                  style={{ width: `${spotifyPct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="font-mono text-xs text-ink">NO ACTIVE AUDIO STREAM</div>
          )}
        </div>
      </div>

      {/* Bottom-right single scene caption */}
      <div className="pointer-events-auto self-end md:mr-10 mt-6">
        <CaptionBox
          code="CH.04 // TELEMETRY"
          text="REAL-TIME NEURAL LINK TELEMETRY VIA LANYARD SOCKET."
        />
      </div>
    </section>
  );
};
