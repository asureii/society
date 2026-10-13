import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { HalftoneThumb } from './HalftoneThumb';
import { formatDurationClock, useSharedTicker } from './useSharedTicker';

const SpotifyProgressBar: React.FC<{ start: number; end: number }> = ({ start, end }) => {
  const now = useSharedTicker();
  const total = Math.max(1000, end - start);
  const elapsed = Math.min(total, Math.max(0, now - start));
  const pct = Math.min(100, Math.max(0, (elapsed / total) * 100));

  return (
    <div className="flex flex-col gap-1 mt-1">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        className="w-full h-2 border border-[var(--ink)] bg-[var(--paper)] overflow-hidden relative"
      >
        <div
          data-testid="spotify-progress-fill"
          className="h-full bg-[var(--red)] transition-[width] duration-300"
          style={{ width: `${pct.toFixed(1)}%` }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-[8px] tracking-[0.12em]">
        <span data-testid="spotify-elapsed">{formatDurationClock(elapsed)}</span>
        <span data-testid="spotify-total">{formatDurationClock(total)}</span>
      </div>
    </div>
  );
};

export const SpotifyWidget: React.FC = () => {
  const spotify = useAppStore((s) => s.discord.spotify);

  if (!spotify) {
    return (
      <div
        data-testid="widget-spotify-idle"
        className="flex items-center justify-between gap-2 py-1 text-[var(--ink)]"
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-mono text-[9px] tracking-[0.14em] uppercase font-bold">
            NO ACTIVE STREAM
          </span>
          <span className="font-mono text-[8px] tracking-[0.08em] uppercase">
            AWAITING SPOTIFY TELEMETRY
          </span>
        </div>
        <span className="font-mono text-[8px] tracking-[0.14em] uppercase px-1.5 py-0.5 border border-[var(--ink)] bg-[var(--paper)]">
          STANDBY
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 text-[var(--ink)]" data-testid="widget-spotify-active">
      <div className="flex items-center gap-2.5">
        <HalftoneThumb
          src={spotify.album_art_url}
          alt={spotify.album || spotify.song}
          size={38}
          fallbackLabel="LP"
        />
        <div className="min-w-0 flex-1">
          <div
            data-testid="spotify-song"
            className="font-display text-xs tracking-[0.05em] uppercase truncate"
          >
            {spotify.song}
          </div>
          <div
            data-testid="spotify-artist"
            className="font-mono text-[9px] tracking-[0.06em] truncate"
          >
            {spotify.artist}
          </div>
          {spotify.album && (
            <div className="font-mono text-[8px] tracking-[0.04em] truncate opacity-75">
              {spotify.album}
            </div>
          )}
        </div>
      </div>
      <SpotifyProgressBar start={spotify.timestamps.start} end={spotify.timestamps.end} />
    </div>
  );
};
