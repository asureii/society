import React from 'react';
import { PROFILE } from '../config/profile';
import { clamp } from '../lib/math';
import { useAppStore } from '../store/useAppStore';
import { CaptionBox } from '../ui/CaptionBox';

export const Cover: React.FC = () => {
  const scrollProgress = useAppStore((s) => s.scrollProgress);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const scrollToTarget = useAppStore((s) => s.scrollToTarget);

  // Parallax the title faster than the scene so it slides cleanly out during the first ~15% of scroll (Part C2)
  const slideOutFactor = reducedMotion ? 0 : clamp(scrollProgress / 0.14, 0, 1.5);
  const translateY = -slideOutFactor * 420;
  const nameParts = PROFILE.fullName.split(' '); // ["JONATHAN", "ERICK", "CHRISTOVANDY"]

  return (
    <section
      id="chapter-cover"
      aria-labelledby="heading-cover"
      className="relative min-h-[118vh] w-full pointer-events-none"
    >
      {/* First 100vh viewport frame: places bottom-left hero block cleanly inside the initial 0% scroll view */}
      <div className="h-screen w-full flex flex-col justify-end px-5 sm:px-10 md:px-14 pb-10 md:pb-12">
        <div className="w-full flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div
            data-content-box="hero-title"
            style={{
              transform: `translate3d(0, ${translateY.toFixed(1)}px, 0)`,
            }}
            className={`w-full md:max-w-[27vw] max-h-[34vh] md:max-h-none flex flex-col items-start transition-none ${
              slideOutFactor >= 0.95 ? 'pointer-events-none invisible' : 'pointer-events-auto'
            }`}
          >
            {/* Large Mincho stacked over 3 lines with paper-colored stroke halo (NO filled box per C2) */}
            <h1
              id="heading-cover"
              className="paper-halo font-serif font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[0.96] text-ink uppercase flex flex-col"
            >
              <span>{nameParts[0] ?? 'JONATHAN'}</span>
              <span>{nameParts[1] ?? 'ERICK'}</span>
              <span>{nameParts.slice(2).join(' ') || 'CHRISTOVANDY'}</span>
            </h1>

            {/* Thin red rule */}
            <div className="w-28 sm:w-36 h-[3px] bg-red my-2.5" aria-hidden="true" />

            {/* Small-caps tagline */}
            <p className="paper-halo-sm font-display text-xs sm:text-sm tracking-[0.16em] uppercase text-ink leading-snug">
              {PROFILE.roleTagline}
            </p>

            {/* Two compact action buttons */}
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <a
                href="#chapter-work"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTarget?.('#chapter-work');
                }}
                className="bg-ink text-paper-pure font-display text-xs tracking-[0.16em] uppercase px-3.5 py-1.5 border-2 border-ink hover:bg-red hover:border-red transition-colors"
              >
                THE WORK
              </a>
              <a
                href="#chapter-about"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToTarget?.('#chapter-about');
                }}
                className="bg-paper-pure text-ink font-mono text-xs font-bold tracking-wider uppercase px-3 py-1.5 border-2 border-ink hover:bg-ink hover:text-paper-pure transition-colors"
              >
                DOSSIER
              </a>
            </div>
          </div>

          {/* Single scene-beat caption box on bottom-right (max 280px wide, auto-dismisses after 4s per C4) */}
          <div
            className={`pointer-events-auto self-end md:mr-10 ${
              slideOutFactor >= 0.95 ? 'invisible pointer-events-none' : ''
            }`}
          >
            <CaptionBox
              code="CH.01 // APPROACH"
              text={PROFILE.coverCaption}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

