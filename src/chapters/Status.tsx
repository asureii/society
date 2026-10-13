import React, { useEffect, useState } from 'react';
import { PROFILE } from '../config/profile';
import { clamp, formatElapsedDuration } from '../lib/math';
import { useAppStore, type DiscordStatusType } from '../store/useAppStore';
import { MangaPinnedChapter } from '../ui/MangaPageLayout';

function getStatusSpec(status: DiscordStatusType) {
  switch (status) {
    case 'online':
      return {
        code: 'SYNC ACTIVE',
        harmonics: 'NOMINAL // LOCKED',
        badge: (
          <span
            className="inline-block w-3 h-3 bg-red border-2 border-ink"
            style={{ borderRadius: '9999px' }}
          />
        ),
      };
    case 'idle':
      return {
        code: 'STANDBY',
        harmonics: 'LOW POWER // IDLE',
        badge: (
          <svg className="w-3 h-3" viewBox="0 0 16 16" aria-hidden="true">
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
          <span className="inline-flex items-center justify-center w-3 h-3 bg-ink border border-ink">
            <span className="block w-1.5 h-0.5 bg-paper-pure" />
          </span>
        ),
      };
    case 'offline':
    default:
      return {
        code: 'SIGNAL LOST',
        harmonics: 'OFFLINE // STANDBY',
        badge: (
          <svg className="w-3 h-3" viewBox="0 0 16 16" aria-hidden="true">
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

  // Audio stream can come from official Spotify connection OR any "Listening to" activity (type: 2, e.g. Apple Music / YouTube Music / Rich Presence)
  const listeningActivity = discord.activities.find((a) => a.type === 2);
  const isAudioActive = (discord.listeningToSpotify && Boolean(discord.spotify)) || Boolean(listeningActivity);

  let audioTitle = '';
  let audioArtist = '';
  let audioPct: number | null = null;

  if (discord.listeningToSpotify && discord.spotify) {
    audioTitle = discord.spotify.song;
    audioArtist = discord.spotify.artist;
    const { start, end } = discord.spotify.timestamps;
    const total = Math.max(1, end - start);
    audioPct = clamp(((nowMs - start) / total) * 100, 0, 100);
  } else if (listeningActivity) {
    audioTitle = listeningActivity.details || listeningActivity.name;
    audioArtist = listeningActivity.state || '';
    if (listeningActivity.timestamps?.start && listeningActivity.timestamps?.end) {
      const { start, end } = listeningActivity.timestamps;
      const total = Math.max(1, end - start);
      audioPct = clamp(((nowMs - start) / total) * 100, 0, 100);
    }
  }

  // Primary activity for TELEMETRY (excluding music activity and custom status to avoid duplication)
  const primaryActivity = discord.activities.find((a) => a !== listeningActivity && a.type !== 4);

  return (
    <MangaPinnedChapter
      id="status"
      sceneId="s4-plug"
      chapterNumber="04"
      title="THE PLUG"
      jpSubtitle="肆 // 同調槽"
      classification="PILOT TELEMETRY"
      summary="CONCENTRIC RIPPLES PULSE AROUND THE SUBMERGED CORE VIA LANYARD TELEMETRY."
      alignment="right"
    >
      <div className="w-full flex-1 flex justify-end items-center pointer-events-none">
        {/* Compact Diagnostic Panel anchored right outside S4 focalRect */}
        <div
          data-content-box="status-diagnostic-panel"
          data-avoid-hud
          aria-live="polite"
          className="w-full sm:max-w-[320px] md:w-[24vw] md:min-w-[270px] md:max-w-[320px] bg-paper-pure border-3 border-ink p-3.5 sm:p-4 shadow-[5px_5px_0px_var(--ink)] space-y-2.5 pointer-events-auto"
        >
          <div className="flex items-center justify-between border-b-2 border-red pb-1.5">
            <div>
              <span className="font-display text-[10px] tracking-[0.18em] uppercase text-red block">
                CH.04 // THE PLUG
              </span>
              <h2
                id="heading-status"
                className="font-serif font-bold text-lg sm:text-xl text-ink uppercase leading-none mt-0.5"
              >
                PILOT STATUS
              </h2>
            </div>
            <span
              className="font-serif text-[10px] tracking-widest border border-ink px-1.5 py-0.5"
              aria-hidden="true"
            >
              同調槽
            </span>
          </div>

          {/* Identity + Shape Status */}
          <div className="flex items-center gap-2.5 border border-ink p-2 bg-paper">
            <div className="relative w-10 h-10 border border-ink bg-paper-pure overflow-hidden shrink-0 flex items-center justify-center">
              {discord.avatarUrl ? (
                <img
                  src={discord.avatarUrl}
                  alt={`${discord.displayName} avatar`}
                  className={`w-full h-full object-cover manga-image-filter ${
                    PROFILE.allowColorHoverOnMedia ? 'hover:filter-none' : ''
                  }`}
                />
              ) : (
                <svg className="w-6 h-6 text-ink" viewBox="0 0 24 24" fill="none">
                  <polygon points="12,3 21,20 3,20" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="14" r="3" fill="var(--red)" />
                </svg>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="font-serif font-bold text-xs sm:text-sm text-ink truncate">
                {discord.displayName}
              </div>
              {discord.customStatus && (
                <div className="font-mono text-[9px] text-ink/75 truncate" title={discord.customStatus}>
                  {discord.customStatus}
                </div>
              )}
              <div className="mt-0.5 inline-flex items-center gap-1.5 bg-paper-pure border border-ink px-1.5 py-0.5">
                {spec.badge}
                <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-ink">
                  {spec.code}
                </span>
              </div>
            </div>
          </div>

          {/* Active Operation */}
          <div className="border border-ink p-2 bg-paper space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase text-ink">
                TELEMETRY
              </span>
              <span className="font-mono text-[10px] font-bold text-red">
                {discord.connected ? 'WSS LIVE' : 'STANDBY'}
              </span>
            </div>

            {primaryActivity ? (
              <div>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif font-bold text-xs text-ink uppercase truncate">
                    {primaryActivity.name}
                  </h3>
                  {primaryActivity.timestamps?.start && (
                    <span className="font-mono text-[10px] font-bold bg-ink text-paper-pure px-1 py-0.2">
                      {formatElapsedDuration(primaryActivity.timestamps.start, nowMs)}
                    </span>
                  )}
                </div>
                {primaryActivity.details && (
                  <p className="font-mono text-[10px] text-ink truncate mt-0.5">
                    {primaryActivity.details}
                  </p>
                )}
              </div>
            ) : (
              <p className="font-mono text-[10px] text-ink">
                {spec.harmonics} — RIPPLE RINGS SYNCED
              </p>
            )}
          </div>

          {/* Audio Link (Spotify / Apple Music / RPC) */}
          <div className="border border-ink p-2 bg-paper">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] font-bold uppercase text-ink">
                AUDIO LINK
              </span>
              <span className="font-mono text-[10px] font-bold text-red uppercase">
                {isAudioActive ? 'PLAYING' : 'IDLE'}
              </span>
            </div>

            {isAudioActive ? (
              <div className="space-y-1">
                <div className="font-serif font-bold text-xs text-ink truncate">
                  {audioTitle} {audioArtist ? `— ${audioArtist}` : ''}
                </div>
                {audioPct !== null && (
                  <div className="w-full h-1.5 bg-paper-pure border border-ink overflow-hidden">
                    <div
                      className="h-full bg-red transition-all duration-300"
                      style={{ width: `${audioPct}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="font-mono text-[10px] text-ink">NO ACTIVE AUDIO STREAM</div>
            )}
          </div>
        </div>
      </div>
    </MangaPinnedChapter>
  );
};
