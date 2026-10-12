import React, { useEffect, useState } from 'react';
import { PROFILE } from '../config/profile';
import { CHAPTERS, useAppStore } from '../store/useAppStore';

export const Frame: React.FC = () => {
  const hasScrolled = useAppStore((s) => s.hasScrolled);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const currentMeta = CHAPTERS.find((c) => c.id === activeChapter) ?? CHAPTERS[0];

  // Show Chapter Tab and Vertical Japanese Tablet only for ~1.5s as a chapter starts, then slide out of view (no opacity fade to grey)
  const [showChapterStamp, setShowChapterStamp] = useState(true);

  useEffect(() => {
    setShowChapterStamp(true);
    const timer = window.setTimeout(() => {
      setShowChapterStamp(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [activeChapter]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Outer rectangular manga viewport frame */}
      <div className="absolute inset-2 md:inset-3 border-2 border-ink" />

      {/* Thin vertical black rule on the left edge of the viewport */}
      <div className="hidden md:block absolute top-3 bottom-3 left-6 w-[1.5px] bg-ink" />

      {/* Thinner red corner crop-marks (<= 16px, at edges only per C4) */}
      <svg
        className="absolute top-2.5 left-2.5 md:top-3.5 md:left-3.5 w-3.5 h-3.5 text-red"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path d="M1 10V1H10" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      <svg
        className="absolute top-2.5 right-2.5 md:top-3.5 md:right-3.5 w-3.5 h-3.5 text-red"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path d="M15 10V1H6" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      <svg
        className="absolute bottom-2.5 left-2.5 md:bottom-3.5 md:left-3.5 w-3.5 h-3.5 text-red"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path d="M1 6V15H10" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      <svg
        className="absolute bottom-2.5 right-2.5 md:bottom-3.5 md:right-3.5 w-3.5 h-3.5 text-red"
        viewBox="0 0 16 16"
        fill="none"
      >
        <path d="M15 6V15H6" stroke="currentColor" strokeWidth="2.5" />
      </svg>

      {/* Sparse hazard-stripe edge motif (<= 16px wide, at extreme left edge only) */}
      <div className="hidden md:block absolute top-28 left-3 w-2 h-14 border border-ink pattern-hazard-red" />

      {/* Chapter Tab along the left edge: slides in for 1.5s when chapter changes, then slides out to the left */}
      <div
        className={`hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 flex-col items-center gap-2 bg-paper-pure border-2 border-ink px-1.5 py-2.5 transition-transform duration-300 ease-in-out ${
          showChapterStamp ? 'translate-x-0' : '-translate-x-[160%]'
        }`}
      >
        <span className="font-mono text-xs font-bold tracking-widest text-red">
          {currentMeta.number}
        </span>
        <span
          className="font-mono text-xs tracking-widest text-ink uppercase"
          style={{ writingMode: 'vertical-rl' }}
        >
          {currentMeta.title}
        </span>
      </div>

      {/* Vertical Japanese Tablet on the top-right below nav: shows for 1.5s on chapter start, then slides out to the right */}
      <div
        className={`hidden md:flex absolute right-4 top-24 flex-col items-center bg-paper-pure border-2 border-ink px-2 py-3 shadow-[3px_3px_0px_var(--ink)] transition-transform duration-300 ease-in-out ${
          showChapterStamp ? 'translate-x-0' : 'translate-x-[160%]'
        }`}
      >
        <span className="w-2 h-2 bg-red mb-2" />
        <span
          className="font-serif font-bold text-xs tracking-[0.25em] text-ink"
          style={{ writingMode: 'vertical-rl' }}
        >
          {currentMeta.jpSubtitle || PROFILE.jpDecorativeTitle}
        </span>
      </div>

      {/* Animated "SCROLL" cue that slides out after the first movement */}
      <div
        className={`hidden sm:block absolute bottom-5 left-1/2 -translate-x-1/2 transition-transform duration-300 ease-in-out ${
          hasScrolled ? 'translate-y-[200%]' : 'translate-y-0'
        }`}
      >
        <div className="flex items-center gap-2.5 bg-paper-pure border-2 border-ink px-3 py-1.5 shadow-[3px_3px_0px_var(--ink)]">
          <span className="inline-block w-2 h-2 bg-red animate-pulse" />
          <span className="font-display text-xs tracking-[0.18em] text-ink uppercase">
            SCROLL
          </span>
        </div>
      </div>
    </div>
  );
};

