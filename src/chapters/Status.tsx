import React, { useEffect, useState } from 'react';
import { PROFILE } from '../config/profile';
import { formatElapsedDuration, clamp } from '../lib/math';
import { useAppStore, type DiscordStatusType } from '../store/useAppStore';
import { ChapterCard } from '../ui/ChapterCard';
import { CaptionBox } from '../ui/CaptionBox';

function getStatusSpec(status: DiscordStatusType) {
  switch (status) {
    case 'online':
      return {
        code: 'SYNC ACTIVE',
        syncRatio: '99.2%',
        harmonics: 'NOMINAL // LOCKED',
        badge: (
          <span
            className="inline-block w-4 h-4 bg-red border-2 border-ink"
            style={{ borderRadius: '9999px' }}
          />
        ),
      };
    case 'idle':
      return {
        code: 'STANDBY',
        syncRatio: '64.0%',
        harmonics: 'LOW POWER // IDLE',
        badge: (
          <svg className="w-4 h-4" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" fill="var(--paper-pure)" stroke="var(--ink)" strokeWidth="2" />
            <path d="M8 1.5 A6.5 6.5 0 0 1 8 14.5 Z" fill="var(--ink)" />
          </svg>
        ),
      };
    case 'dnd':
      return {
        code: 'DO NOT DISTURB',
        syncRatio: '100.0%',
        harmonics: 'ISOLATED // DEEP FOCUS',
        badge: (
          <span className="inline-flex items-center justify-center w-4 h-4 bg-ink border border-ink">
            <span className="block w-2.5 h-0.5 bg-paper-pure" />
          </span>
        ),
      };
    case 'offline':
    default:
      return {
        code: 'SIGNAL LOST',
        syncRatio: '00.0%',
        harmonics: 'OFFLINE // STANDBYPLUG',
        badge: (
          <svg className="w-4 h-4" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6" fill="none" stroke="var(--ink)" strokeWidth="2.5" />
          </svg>
        ),
      };
  }
}

export const Status: React.FC = () => {
  const discord = useAppStore((s) => s.discord);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Tick every 1s for live activity elapsed counter & Spotify progress bar
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
      className="relative min-h-[115vh] w-full px-6 sm:px-12 md:px-20 py-28 pointer-events-none flex flex-col justify-center"
    >
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pointer-events-auto">
          <div id="heading-status">
            <ChapterCard
              number="04"
              title="PILOT STATUS"
              jpSubtitle="肆 // 神経同調率"
              alertText="LANYARD TELEMETRY // ENTRY PLUG"
            />
          </div>
          <CaptionBox
            code="CAPTION // 04 : PRESENCE"
            text="REAL-TIME NEURAL LINK TELEMETRY VIA LANYARD SOCKET."
          />
        </div>

        {/* Main Entry-Plug Telemetry Readout Grid */}
        <div
          aria-live="polite"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 pointer-events-auto"
        >
          {/* Left Column: Pilot Identity & Sync Ratio Readout (5 cols) */}
          <div className="lg:col-span-5 bg-paper-pure border-3 border-ink p-6 shadow-[6px_6px_0px_var(--ink)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-4">
                <span className="font-mono text-xs font-bold tracking-widest uppercase">
                  PLUG UNIT // 01
                </span>
                <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 bg-ink text-paper-pure">
                  {discord.connected ? 'WSS LIVE' : discord.usingFallback ? 'SIMULATED' : 'REST POLL'}
                </span>
              </div>

              {/* Pilot Avatar (strictly filtered to grayscale+halftone unless hover toggle enabled) + Handle */}
              <div className="flex items-center gap-4 border-2 border-ink p-3 bg-paper mb-5">
                <div className="relative w-16 h-16 border-2 border-ink bg-paper-pure overflow-hidden shrink-0 flex items-center justify-center">
                  {discord.avatarUrl ? (
                    <img
                      src={discord.avatarUrl}
                      alt={`${discord.displayName} avatar`}
                      className={`w-full h-full object-cover manga-image-filter ${
                        PROFILE.allowColorHoverOnMedia ? 'hover:filter-none' : ''
                      }`}
                    />
                  ) : (
                    <svg className="w-10 h-10 text-ink" viewBox="0 0 24 24" fill="none">
                      <polygon points="12,3 21,20 3,20" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="14" r="3" fill="var(--red)" />
                    </svg>
                  )}
                  <div className="absolute inset-0 pattern-halftone opacity-25 pointer-events-none" />
                </div>

                <div className="min-w-0">
                  <div className="font-serif font-bold text-lg text-ink truncate">
                    {discord.displayName}
                  </div>
                  <div className="font-mono text-xs font-bold text-ink opacity-80 truncate">
                    @{discord.username}
                  </div>
                  {/* Shape + Fill Status Indicator (never green/yellow) */}
                  <div className="mt-1.5 inline-flex items-center gap-2 bg-paper-pure border border-ink px-2 py-0.5">
                    {spec.badge}
                    <span className="font-mono text-xs font-bold tracking-wider uppercase text-ink">
                      {spec.code}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Numerals Readout (Sync Ratio in Red) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-ink p-3 bg-paper">
                  <span className="font-mono text-[10px] tracking-widest uppercase block">
                    SYNC RATIO // 同調率
                  </span>
                  <span className="font-display text-3xl sm:text-4xl text-red leading-none mt-1 block">
                    {spec.syncRatio}
                  </span>
                </div>
                <div className="border-2 border-ink p-3 bg-paper flex flex-col justify-between">
                  <span className="font-mono text-[10px] tracking-widest uppercase block">
                    HARMONICS
                  </span>
                  <span className="font-mono text-xs font-bold text-ink uppercase">
                    {spec.harmonics}
                  </span>
                </div>
              </div>
            </div>

            {discord.customStatus && (
              <div className="mt-5 pt-3 border-t-2 border-ink">
                <span className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1">
                  PILOT BROADCAST MESSAGE:
                </span>
                <p className="font-mono text-xs font-bold text-ink bg-paper border border-ink p-2">
                  “{discord.customStatus}”
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Active Process / IDE / Game & Spotify Now Playing (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Current Activity Card */}
            <div className="bg-paper-pure border-3 border-ink p-6 shadow-[6px_6px_0px_var(--ink)] flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-4">
                <span className="font-mono text-xs font-bold tracking-widest uppercase">
                  ACTIVE OPERATION // TELEMETRY
                </span>
                <span className="font-mono text-xs font-bold text-red">PROCESS.01</span>
              </div>

              {primaryActivity ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-serif font-bold text-2xl text-ink uppercase">
                      {primaryActivity.name}
                    </h3>
                    {primaryActivity.timestamps?.start && (
                      <span className="font-mono text-xs font-bold bg-ink text-paper-pure px-2 py-0.5">
                        ELAPSED // {formatElapsedDuration(primaryActivity.timestamps.start, nowMs)}
                      </span>
                    )}
                  </div>

                  {primaryActivity.details && (
                    <p className="font-mono text-xs sm:text-sm font-bold text-ink border-l-3 border-red pl-3">
                      {primaryActivity.details}
                    </p>
                  )}
                  {primaryActivity.state && (
                    <p className="font-mono text-xs text-ink opacity-85">
                      STATE: {primaryActivity.state}
                    </p>
                  )}
                </div>
              ) : (
                <div className="border-2 border-ink p-4 bg-paper pattern-hatch">
                  <div className="bg-paper-pure border border-ink p-3 inline-block">
                    <p className="font-mono text-xs font-bold uppercase text-ink">
                      NO EXTERNAL APPLICATION TELEMETRY DETECTED // INTERNAL SYSTEMS NOMINAL
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-ink/15 flex items-center justify-between text-[10px] font-mono uppercase">
                <span>PROTOCOL: LANYARD OP-0/1/2/3</span>
                <span>AUTO-RECONNECT: ARMED</span>
              </div>
            </div>

            {/* Spotify Audio Feed Card */}
            <div className="bg-paper-pure border-3 border-ink p-6 shadow-[6px_6px_0px_var(--ink)]">
              <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-4">
                <span className="font-mono text-xs font-bold tracking-widest uppercase">
                  ACOUSTIC RELAY // SPOTIFY FEED
                </span>
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 uppercase ${
                    discord.listeningToSpotify
                      ? 'bg-red text-paper-pure'
                      : 'bg-ink text-paper-pure'
                  }`}
                >
                  {discord.listeningToSpotify ? 'STREAMING' : 'SILENT'}
                </span>
              </div>

              {discord.listeningToSpotify && discord.spotify ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative w-16 h-16 border-2 border-ink bg-paper shrink-0 overflow-hidden">
                    <img
                      src={discord.spotify.album_art_url}
                      alt={discord.spotify.album}
                      className={`w-full h-full object-cover manga-image-filter ${
                        PROFILE.allowColorHoverOnMedia ? 'hover:filter-none' : ''
                      }`}
                    />
                    <div className="absolute inset-0 pattern-halftone opacity-25 pointer-events-none" />
                  </div>

                  <div className="flex-1 w-full min-w-0">
                    <div className="font-serif font-bold text-lg text-ink truncate">
                      {discord.spotify.song}
                    </div>
                    <div className="font-mono text-xs text-ink truncate">
                      BY {discord.spotify.artist} — {discord.spotify.album}
                    </div>

                    {/* Black progress bar with red fill */}
                    <div className="mt-3 w-full h-2.5 bg-paper border-2 border-ink overflow-hidden">
                      <div
                        className="h-full bg-red transition-all duration-300"
                        style={{ width: `${spotifyPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between border-2 border-ink p-3 bg-paper">
                  <span className="font-mono text-xs font-bold text-ink uppercase">
                    NO ACTIVE SPOTIFY STREAM // ENTRY PLUG AUDIO IDLE
                  </span>
                  <span className="font-mono text-[10px] font-bold text-ink">00:00 / 00:00</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
