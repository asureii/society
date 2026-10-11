import React from 'react';
import { PROFILE } from '../config/profile';
import { CaptionBox } from '../ui/CaptionBox';
import { useAppStore } from '../store/useAppStore';

export const Cover: React.FC = () => {
  const scrollToTarget = useAppStore((s) => s.scrollToTarget);

  return (
    <section
      id="chapter-cover"
      aria-labelledby="heading-cover"
      className="relative min-h-[115vh] w-full flex flex-col justify-between px-6 sm:px-12 md:px-20 pt-24 pb-16 pointer-events-none"
    >
      {/* Top Row: Manga Cover Title Block & Vertical Japanese Subtitle */}
      <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="pointer-events-auto bg-paper-pure border-3 border-ink p-5 sm:p-7 shadow-[6px_6px_0px_var(--ink)] max-w-2xl">
          <div className="flex items-center justify-between gap-4 border-b-2 border-ink pb-2 mb-3">
            <span className="font-mono text-[11px] font-bold tracking-[0.22em] uppercase text-ink">
              CHAPTER 01 // THE ENTRY PLUG
            </span>
            <span className="bg-ink text-paper-pure font-mono text-[10px] font-bold px-2 py-0.5 tracking-widest">
              VOL. 01
            </span>
          </div>

          <h1
            id="heading-cover"
            className="font-serif font-bold text-3xl sm:text-5xl lg:text-6xl tracking-tight leading-[0.98] text-ink uppercase"
          >
            {PROFILE.fullName}
          </h1>

          {/* Single bold red slash / underline required by brief */}
          <div className="w-full h-2 bg-red my-3.5" aria-hidden="true" />

          <p className="font-display text-sm sm:text-base tracking-[0.16em] uppercase text-ink">
            {PROFILE.roleTagline}
          </p>

          <div className="mt-4 pt-3 border-t border-ink/15 flex flex-wrap items-center gap-3">
            <a
              href="#chapter-work"
              onClick={(e) => {
                e.preventDefault();
                scrollToTarget?.('#chapter-work');
              }}
              className="bg-ink text-paper-pure font-display text-xs tracking-[0.2em] uppercase px-4 py-2 border-2 border-ink hover:bg-red hover:border-red transition-colors"
            >
              INSPECT THE WORK // 参
            </a>
            <a
              href="#chapter-about"
              onClick={(e) => {
                e.preventDefault();
                scrollToTarget?.('#chapter-about');
              }}
              className="bg-paper-pure text-ink font-mono text-xs font-bold tracking-wider uppercase px-3.5 py-2 border-2 border-ink hover:bg-ink hover:text-paper-pure transition-colors"
            >
              PERSONNEL DOSSIER
            </a>
          </div>
        </div>

        {/* Vertical Japanese decorative stamp */}
        <div
          aria-hidden="true"
          className="hidden md:flex flex-col items-center bg-paper-pure border-2 border-ink px-3 py-4 shadow-[4px_4px_0px_var(--ink)] select-none"
        >
          <span className="w-2.5 h-2.5 bg-red mb-3" />
          <span
            className="font-serif font-bold text-lg tracking-[0.3em] text-ink"
            style={{ writingMode: 'vertical-rl' }}
          >
            {PROFILE.jpDecorativeTitle}
          </span>
        </div>
      </div>

      {/* Bottom Row: Center stays open so the 2.5D cloaked figure and red orb shine; bottom-right holds narrative caption */}
      <div className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mt-auto pt-32">
        <div className="pointer-events-auto bg-paper-pure border-2 border-ink px-3 py-2 shadow-[3px_3px_0px_var(--ink)]">
          <div className="font-mono text-[10px] tracking-widest uppercase text-ink">
            SCENE 01 // PERSPECTIVE LOCK
          </div>
          <div className="font-mono text-xs font-bold text-ink">
            TARGET: MONOLITH &amp; RED ORB [Z = -11.5m]
          </div>
        </div>

        <div className="pointer-events-auto self-end">
          <CaptionBox
            code="CAPTION // 01 : PILOTING"
            text={PROFILE.coverCaption}
          />
        </div>
      </div>
    </section>
  );
};
