import React from 'react';

interface FavoriteTrack {
  id: string;
  index: string;
  title: string;
  artist: string;
  tag: string;
}

const FAVORITE_TRACKS: FavoriteTrack[] = [
  {
    id: 'track-01',
    index: '01',
    title: 'AOI KOI DAIDDAIIRO NO HI',
    artist: 'MASS OF THE FERMENTING DREGS',
    tag: 'J-ROCK // PRESET',
  },
  {
    id: 'track-02',
    index: '02',
    title: 'JOIN ME (RAZORBLADE REMIX)',
    artist: 'HIM',
    tag: 'GOTHIC // REMIX',
  },
];

export const FavoriteTracksWidget: React.FC = () => {
  return (
    <div
      data-testid="widget-favorite-tracks"
      className="flex flex-col gap-2 font-mono text-[var(--ink)]"
    >
      <div className="flex flex-col gap-1.5">
        {FAVORITE_TRACKS.map((track) => (
          <div
            key={track.id}
            data-testid={`fav-track-${track.index}`}
            className="group flex flex-col p-1.5 border border-[var(--ink)] bg-[var(--paper)] transition-colors hover:bg-[var(--paper-pure)]"
          >
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono text-[9px] font-bold px-1 py-0.2 bg-[var(--ink)] text-[var(--paper-pure)] shrink-0">
                  {track.index}
                </span>
                <span className="font-mono text-[10px] font-bold tracking-[0.06em] uppercase truncate text-[var(--ink)]">
                  {track.title}
                </span>
              </div>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--red)] shrink-0 animate-pulse" />
            </div>

            <div className="flex items-center justify-between mt-1 pt-1 border-t border-[var(--ink)]/30 text-[8px] tracking-[0.1em] text-[var(--ink)]/80">
              <span className="truncate">{track.artist}</span>
              <span className="shrink-0 text-[var(--ink)]/60">[{track.tag}]</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-1.5 py-0.5 border-t border-[var(--ink)] text-[8px] tracking-[0.14em] uppercase text-[var(--ink)]/70">
        <span>CURATED ARCHIVE</span>
        <span className="font-bold text-[var(--red)]">SYNC 100%</span>
      </div>
    </div>
  );
};

export default FavoriteTracksWidget;
