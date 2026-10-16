import React, { useEffect, useRef } from 'react';
import { PROFILE } from '../config/profile';
import { gsap } from '../lib/gsap';
import { useAppStore } from '../store/useAppStore';
import {
  MangaPanel,
  MangaPinnedChapter,
} from '../ui/MangaPageLayout';

export const Timeline: React.FC = () => {
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const hasLoadedRef = useRef<boolean>(false);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  useEffect(() => {
    if (activeChapter !== 'timeline' || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const elements = cardRefs.current.filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    if (reducedMotion) {
      elements.forEach((el) => {
        el.style.transform = 'translate3d(0, 0, 0)';
      });
      return;
    }

    gsap.fromTo(
      elements,
      { y: 14 },
      {
        y: 0,
        duration: 0.42,
        stagger: 0.06,
        ease: 'power3.out',
      },
    );
  }, [activeChapter, reducedMotion]);

  return (
    <MangaPinnedChapter
      id="timeline"
      sceneId="s6-long-scroll"
      chapterNumber="06"
      title="THE LONG SCROLL"
      jpSubtitle="陸 // 絵巻"
      classification="EMAKI CHRONOLOGY"
      summary="FOUR PARALLAX PLANES TRACK LATERALLY ACROSS RUINED ARCHES, ELEVATED RAILS, AND MILESTONE BEACONS."
      alignment="full"
    >
      {/* Top half stays open for S6 Emaki Handscroll arches and sunset orb; stationary panel below */}
      <div className="w-full flex-1 flex flex-col justify-end pb-1 sm:pb-2 pointer-events-none">
        <MangaPanel
          panelCode="06 // EMAKI CHRONOLOGY"
          panelTitle="HORIZONTAL MILESTONE TRACK // 01–04"
          redAccentCorner
        >
          {/* Four Milestone Cards loaded once and kept permanently readable */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-3">
            {PROFILE.timeline.map((entry, idx) => (
              <article
                key={entry.id}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                className="border-2 border-ink bg-paper p-2 sm:p-2.5 flex flex-col justify-between min-w-0"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 border-b border-ink/20 pb-0.5 sm:pb-1 mb-1">
                    <span className="bg-ink text-paper-pure font-mono text-[8px] sm:text-[9px] font-bold px-1 py-0.2 uppercase truncate">
                      {entry.code} // 0{idx + 1}
                    </span>
                    <span className="font-mono text-[8px] sm:text-[9px] font-bold text-ink shrink-0">
                      {entry.period}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-[11px] sm:text-sm text-ink uppercase leading-snug truncate">
                    {entry.title}
                  </h3>
                  <div className="font-mono text-[8px] sm:text-[10px] font-bold text-red mt-0.5 mb-0.5 sm:mb-1 truncate">
                    {entry.organization} • {entry.classification}
                  </div>
                  <p className="font-sans text-[10px] sm:text-xs text-ink leading-snug line-clamp-2 sm:line-clamp-3">
                    {entry.summary}
                  </p>
                </div>

                <div className="hidden sm:flex mt-1.5 pt-1 border-t border-ink/20 items-center justify-between font-mono text-[9px] sm:text-[10px] font-bold uppercase">
                  <span className="truncate max-w-[130px]">{entry.caption}</span>
                  <span className="text-red shrink-0">
                    0{idx + 1}/0{PROFILE.timeline.length}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </MangaPanel>
      </div>
    </MangaPinnedChapter>
  );
};
