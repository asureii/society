import React from 'react';
import { CHAPTERS, useAppStore } from '../store/useAppStore';

export const Frame: React.FC = () => {
  const hasScrolled = useAppStore((s) => s.hasScrolled);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const currentMeta = CHAPTERS.find((c) => c.id === activeChapter) ?? CHAPTERS[0];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Outer thick rectangular manga viewport frame */}
      <div className="absolute inset-2 md:inset-4 border-2 border-ink" />

      {/* Thin vertical black rule on the left edge of the viewport */}
      <div className="hidden md:block absolute top-4 bottom-4 left-10 w-[1.5px] bg-ink" />

      {/* Red corner crop-marks */}
      <svg
        className="absolute top-3 left-3 md:top-5 md:left-5 w-5 h-5 text-red"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d="M2 14V2H14" stroke="currentColor" strokeWidth="3" />
      </svg>
      <svg
        className="absolute top-3 right-3 md:top-5 md:right-5 w-5 h-5 text-red"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d="M22 14V2H10" stroke="currentColor" strokeWidth="3" />
      </svg>
      <svg
        className="absolute bottom-3 left-3 md:bottom-5 md:left-5 w-5 h-5 text-red"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d="M2 10V22H14" stroke="currentColor" strokeWidth="3" />
      </svg>
      <svg
        className="absolute bottom-3 right-3 md:bottom-5 md:right-5 w-5 h-5 text-red"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path d="M22 10V22H10" stroke="currentColor" strokeWidth="3" />
      </svg>

      {/* Sparse hazard-stripe edge motif on top-left and bottom-left margin */}
      <div className="hidden md:block absolute top-24 left-4 w-3 h-20 border border-ink pattern-hazard-red" />
      <div className="hidden md:block absolute bottom-24 left-4 w-3 h-16 border border-ink pattern-hazard-ink" />

      {/* Vertical chapter index stamp along the left rule */}
      <div className="hidden md:flex absolute left-5 top-1/2 -translate-y-1/2 flex-col items-center gap-2 bg-paper-pure border border-ink px-1 py-2">
        <span className="font-mono text-[10px] font-bold tracking-widest text-red">
          CH.{currentMeta.number}
        </span>
        <span
          className="font-mono text-[10px] tracking-widest text-ink uppercase"
          style={{ writingMode: 'vertical-rl' }}
        >
          {currentMeta.title}
        </span>
      </div>

      {/* Animated "SCROLL" cue that disappears after the first movement */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${
          hasScrolled ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-3 bg-paper-pure border-2 border-ink px-3 py-1.5 shadow-[3px_3px_0px_var(--ink)]">
          <span className="inline-block w-2 h-2 bg-red animate-pulse" />
          <span className="font-display text-xs tracking-[0.2em] text-ink uppercase">
            SCROLL TO ADVANCE // 下へスクロール
          </span>
        </div>
      </div>
    </div>
  );
};
