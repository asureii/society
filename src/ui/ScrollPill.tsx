import React from 'react';
import { CHAPTERS, useAppStore } from '../store/useAppStore';

export const ScrollPill: React.FC = () => {
  const scrollProgress = useAppStore((s) => s.scrollProgress);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const pct = Math.round(scrollProgress * 100);

  return (
    <aside
      aria-label="Scroll Depth Progress"
      className="fixed right-3.5 md:right-6 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col items-center gap-2"
    >
      <span className="font-mono text-[10px] font-bold tracking-tighter bg-paper-pure border border-ink px-1 text-ink">
        {String(pct).padStart(2, '0')}%
      </span>

      {/* Slim vertical scroll-progress pill: black outline with red fill */}
      <div className="relative w-2.5 h-36 md:h-48 bg-paper-pure border-2 border-ink overflow-hidden">
        <div
          className="w-full bg-red transition-none origin-top"
          style={{ height: `${ Math.max(2, scrollProgress * 100) }%` }}
        />

        {/* Chapter tick marks */}
        {CHAPTERS.map((ch, idx) => {
          const topPct = (idx / CHAPTERS.length) * 100;
          return (
            <span
              key={ch.id}
              className={`absolute left-0 right-0 h-[1.5px] ${
                activeChapter === ch.id ? 'bg-ink' : 'bg-ink/30'
              }`}
              style={{ top: `${topPct}%` }}
            />
          );
        })}
      </div>

      <span
        className="font-mono text-[9px] tracking-widest text-ink uppercase bg-paper-pure px-0.5"
        style={{ writingMode: 'vertical-rl' }}
      >
        SYNC DEPTH
      </span>
    </aside>
  );
};
