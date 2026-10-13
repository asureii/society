import React from 'react';
import { PROFILE } from '../config/profile';
import { useAppStore } from '../store/useAppStore';
import { CaptionBox } from '../ui/CaptionBox';
import { MangaPinnedChapter } from '../ui/MangaPageLayout';

export const Cover: React.FC = () => {
  const scrollToTarget = useAppStore((s) => s.scrollToTarget);
  const nameParts = PROFILE.fullName.split(' '); // ["JONATHAN", "ERICK", "CHRISTOVANDY"]

  return (
    <MangaPinnedChapter
      id="cover"
      sceneId="s1-causeway"
      chapterNumber="01"
      title="THE CAUSEWAY"
      jpSubtitle="壱 // 参道"
      classification="NERV ARCHIVE"
      summary="THE STEPPING STONES CROSS EMPTY GROUND. AHEAD, THE TWIN MONOLITH AWAITS."
      alignment="left"
    >
      <div className="w-full flex-1 flex flex-col md:flex-row items-start md:items-end justify-between gap-4 pb-6 pointer-events-none">
        {/* Bottom-left unboxed hero block */}
        <div
          data-content-box="hero-title"
          data-avoid-hud
          className="w-full md:max-w-[34vw] flex flex-col items-start bg-paper-pure/90 backdrop-blur-[2px] p-4 sm:p-5 border-2 border-ink shadow-[4px_4px_0px_var(--ink)] pointer-events-auto"
        >
          <h1
            id="heading-cover"
            className="paper-halo font-serif font-bold text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[0.95] text-ink uppercase flex flex-col"
          >
            <span>{nameParts[0] ?? 'JONATHAN'}</span>
            <span>{nameParts[1] ?? 'ERICK'}</span>
            <span>{nameParts.slice(2).join(' ') || 'CHRISTOVANDY'}</span>
          </h1>

          <div className="w-28 sm:w-36 h-[3px] bg-red my-2" aria-hidden="true" />

          <p className="paper-halo-sm font-display text-xs sm:text-sm tracking-[0.16em] uppercase text-ink leading-snug">
            {PROFILE.roleTagline}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <a
              href="#chapter-work"
              onClick={(e) => {
                e.preventDefault();
                scrollToTarget?.('work');
              }}
              className="bg-ink text-paper-pure font-display text-xs tracking-[0.16em] uppercase px-3.5 py-1.5 border-2 border-ink hover:bg-red hover:border-red transition-colors cursor-pointer"
            >
              THE WORK
            </a>
            <a
              href="#chapter-about"
              onClick={(e) => {
                e.preventDefault();
                scrollToTarget?.('about');
              }}
              className="bg-paper-pure text-ink font-mono text-xs font-bold tracking-wider uppercase px-3 py-1.5 border-2 border-ink hover:bg-ink hover:text-paper-pure transition-colors cursor-pointer"
            >
              DOSSIER
            </a>
          </div>
        </div>

        {/* Bottom-right single scene-beat caption box */}
        <div className="self-end md:mr-4 pointer-events-auto">
          <CaptionBox
            code="S1 // THE CAUSEWAY"
            text={PROFILE.coverCaption}
          />
        </div>
      </div>
    </MangaPinnedChapter>
  );
};
