import React, { useEffect, useRef } from 'react';
import { PROFILE } from '../config/profile';
import { gsap } from '../lib/gsap';
import { useAppStore } from '../store/useAppStore';
import { MangaPanel, MangaPinnedChapter } from '../ui/MangaPageLayout';

export const About: React.FC = () => {
  const secRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasLoadedRef = useRef<boolean>(false);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  useEffect(() => {
    if (activeChapter !== 'about' || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const elements = secRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (elements.length === 0) return;

    if (reducedMotion) {
      elements.forEach((el) => {
        el.style.transform = 'translate3d(0, 0, 0)';
        el.style.clipPath = 'none';
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
        clearProps: 'clipPath',
      },
    );
  }, [activeChapter, reducedMotion]);

  return (
    <MangaPinnedChapter
      id="about"
      sceneId="s2-observation"
      chapterNumber="02"
      title="THE OBSERVATION ROOM"
      jpSubtitle="弐 // 観測室"
      classification="NERV DOSSIER"
      summary="PERSONNEL RECORD AND OPERATIONAL FOCUS AREAS CLASSIFIED UNDER MAGI SUPERVISION."
      alignment="full"
    >
      {/* 2-Wing Pinned Manga Spread keeping Center Viewport Open for S2 Focal Porthole & Orb */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 sm:gap-3 items-stretch">
        {/* Left Column (4 cols): Identification & Focus Areas */}
        <div className="lg:col-span-4 flex flex-col gap-1.5 sm:gap-3">
          <MangaPanel
            panelCode="02.A // ID"
            panelTitle={PROFILE.designationCode}
            tiltDeg={-1.4}
            bleedEdge="left"
            redAccentCorner
          >
            <div
              ref={(el) => {
                secRefs.current[0] = el;
              }}
            >
              <h3
                id="heading-about"
                className="font-serif font-bold text-xs sm:text-base text-ink uppercase"
              >
                {PROFILE.fullName}
              </h3>
              <p className="font-mono text-[9px] sm:text-[11px] font-bold text-red mt-0.5 line-clamp-1 sm:line-clamp-none">
                {PROFILE.roleTagline} • {PROFILE.location}
              </p>
              <p className="font-sans text-[11px] sm:text-xs text-ink leading-snug sm:leading-relaxed mt-1 sm:mt-1.5 line-clamp-2 sm:line-clamp-3 lg:line-clamp-none">
                {PROFILE.bio[0]}
              </p>
            </div>
          </MangaPanel>

          <MangaPanel
            panelCode="02.B // FOCUS"
            panelTitle="OPERATIONAL DOMAINS"
            tiltDeg={1.2}
          >
            <div
              ref={(el) => {
                secRefs.current[1] = el;
              }}
            >
              <ul className="grid grid-cols-2 lg:grid-cols-1 gap-1">
                {PROFILE.interests.map((interest, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-1.5 border border-ink px-1.5 sm:px-2 py-0.5 bg-paper text-[10px] sm:text-[11px] font-mono font-bold text-ink"
                  >
                    <span className="bg-ink text-paper-pure px-1 text-[9px] shrink-0">
                      0{idx + 1}
                    </span>
                    <span className="truncate">{interest}</span>
                  </li>
                ))}
              </ul>
            </div>
          </MangaPanel>
        </div>

        {/* Center Void (4 cols): OPEN to live 3D WebGL Observation Room porthole & Red Orb */}
        <div
          className="hidden lg:flex lg:col-span-4 pointer-events-none items-center justify-center"
          aria-hidden="true"
        />

        {/* Right Column (4 cols): Evangelion Record & Architectural Note */}
        <div className="lg:col-span-4 flex flex-col gap-1.5 sm:gap-3">
          <MangaPanel
            panelCode="02.C // RECORD"
            panelTitle={PROFILE.evaFanDossier.syncNote}
            tiltDeg={1.6}
            bleedEdge="right"
          >
            <div
              ref={(el) => {
                secRefs.current[2] = el;
              }}
              className="space-y-1 sm:space-y-1.5"
            >
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-1 sm:gap-1.5">
                <div className="border border-ink p-1 sm:p-1.5 bg-paper min-w-0">
                  <div className="font-mono text-[8px] sm:text-[10px] tracking-wider uppercase text-red font-bold truncate">
                    FAVORITE EPISODE // 記録
                  </div>
                  <div className="font-serif font-bold text-[11px] sm:text-xs text-ink truncate mt-0.5">
                    {PROFILE.evaFanDossier.favoriteEpisode}
                  </div>
                </div>
                <div className="border border-ink p-1 sm:p-1.5 bg-paper min-w-0">
                  <div className="font-mono text-[8px] sm:text-[10px] tracking-wider uppercase text-ink font-bold truncate">
                    FAVORITE CHARACTER // 人物
                  </div>
                  <div className="font-serif font-bold text-[11px] sm:text-xs text-ink truncate mt-0.5">
                    {PROFILE.evaFanDossier.favoriteCharacter}
                  </div>
                </div>
              </div>
              <blockquote className="border-l-2 border-red pl-2 py-0.5 font-serif italic text-[10px] sm:text-[11px] text-ink line-clamp-1 sm:line-clamp-2">
                {PROFILE.evaFanDossier.favoriteQuote}
              </blockquote>
            </div>
          </MangaPanel>

          <MangaPanel
            panelCode="02.D // LOG"
            panelTitle="ARCHITECTURAL NOTE"
            tiltDeg={-1.2}
          >
            <div
              ref={(el) => {
                secRefs.current[3] = el;
              }}
            >
              <p className="font-serif font-bold text-[11px] sm:text-xs text-ink leading-snug">
                “Every system interface is a narrative panel. Precision and atmosphere are inseparable.”
              </p>
              <div className="mt-1 sm:mt-1.5 pt-1 border-t border-ink/20 flex items-center justify-between font-mono text-[9px] sm:text-[10px] font-bold uppercase">
                <span>CLEARANCE: AAA</span>
                <span className="text-red">CONTINUOUS FLIGHT →</span>
              </div>
            </div>
          </MangaPanel>
        </div>
      </div>
    </MangaPinnedChapter>
  );
};
