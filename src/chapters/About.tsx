import React, { useEffect, useRef } from 'react';
import { PROFILE } from '../config/profile';
import { ChapterCard } from '../ui/ChapterCard';
import { CaptionBox } from '../ui/CaptionBox';
import { gsap } from '../lib/gsap';
import { useAppStore } from '../store/useAppStore';

export const About: React.FC = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  useEffect(() => {
    if (!sectionRef.current || reducedMotion) return;
    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>('.about-manga-panel');
      panels.forEach((panel, i) => {
        gsap.fromTo(
          panel,
          {
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)',
            y: 28,
          },
          {
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            y: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: panel,
              start: 'top 86%',
              end: 'top 52%',
              scrub: 0.6,
            },
            delay: i * 0.05,
          },
        );
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section
      ref={sectionRef}
      id="chapter-about"
      aria-labelledby="heading-about"
      className="relative min-h-[120vh] w-full px-6 sm:px-12 md:px-20 py-28 pointer-events-none flex flex-col justify-center"
    >
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div className="pointer-events-auto">
          <ChapterCard
            number="02"
            title="PERSONNEL FILE"
            jpSubtitle="弐 // 機密人事記録"
            alertText="CLASSIFIED // NERV DOSSIER"
          />
        </div>

        {/* 4 Irregular Black-Bordered Manga Panels on White that reveal sequentially on scroll */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pointer-events-auto">
          {/* Panel 1: Primary Dossier Specifications (7 cols) */}
          <article className="about-manga-panel lg:col-span-7 bg-paper-pure border-3 border-ink p-6 shadow-[6px_6px_0px_var(--ink)] relative">
            <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-4">
              <span className="font-mono text-xs font-bold tracking-widest uppercase">
                PANEL 02.A // SUBJECT IDENTIFICATION
              </span>
              <span className="font-mono text-xs font-bold text-red">ID-01</span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-ink/15 pb-4 mb-4">
              <div>
                <dt className="font-mono text-[10px] tracking-widest uppercase opacity-75">
                  FULL DESIGNATION
                </dt>
                <dd id="heading-about" className="font-serif font-bold text-lg text-ink mt-0.5">
                  {PROFILE.fullName}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] tracking-widest uppercase opacity-75">
                  OPERATIONAL ROLE
                </dt>
                <dd className="font-mono text-xs font-bold text-ink mt-0.5">
                  {PROFILE.roleTagline}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-mono text-[10px] tracking-widest uppercase opacity-75">
                  BASE OF OPERATIONS
                </dt>
                <dd className="font-mono text-xs font-bold text-ink mt-0.5">
                  {PROFILE.location}
                </dd>
              </div>
            </dl>

            <div className="space-y-3 text-xs sm:text-sm leading-relaxed font-mono text-ink">
              {PROFILE.bio.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </article>

          {/* Panel 2: Diagonal / Irregular Manga Illustration Cut-in & Interests (5 cols) */}
          <article className="about-manga-panel lg:col-span-5 bg-paper-pure border-3 border-ink p-6 shadow-[6px_6px_0px_var(--ink)] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-4">
                <span className="font-mono text-xs font-bold tracking-widest uppercase">
                  PANEL 02.B // SPECIALIZATIONS
                </span>
                <span className="w-2.5 h-2.5 bg-ink inline-block" />
              </div>

              <ul className="space-y-2.5">
                {PROFILE.interests.map((interest, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 border border-ink p-2.5 bg-paper"
                  >
                    <span className="font-mono text-xs font-bold bg-ink text-paper-pure px-1.5 py-0.5">
                      0{idx + 1}
                    </span>
                    <span className="font-mono text-xs font-bold text-ink">{interest}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-3 border-t-2 border-ink flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest uppercase">
                CLEARANCE LEVEL
              </span>
              <span className="font-display text-sm tracking-widest text-red">
                PRIORITY // AAA
              </span>
            </div>
          </article>

          {/* Panel 3: Evangelion Homage Dossier Card (8 cols) */}
          <article className="about-manga-panel lg:col-span-8 bg-paper-pure border-3 border-ink p-6 shadow-[6px_6px_0px_var(--ink)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-red pb-2 mb-4">
              <span className="font-display text-sm tracking-[0.2em] uppercase text-ink">
                PANEL 02.C // NERV ARCHIVE : EVANGELION RECORD
              </span>
              <span className="bg-red text-paper-pure font-mono text-[10px] font-bold px-2 py-0.5">
                {PROFILE.evaFanDossier.syncNote}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="border-2 border-ink p-3 bg-paper">
                <div className="font-mono text-[10px] tracking-widest uppercase opacity-75">
                  FAVORITE EPISODE // 記録
                </div>
                <div className="font-serif font-bold text-sm sm:text-base text-ink mt-1">
                  {PROFILE.evaFanDossier.favoriteEpisode}
                </div>
              </div>

              <div className="border-2 border-ink p-3 bg-paper">
                <div className="font-mono text-[10px] tracking-widest uppercase opacity-75">
                  DESIGNATED CHARACTER // 人物
                </div>
                <div className="font-serif font-bold text-sm sm:text-base text-ink mt-1">
                  {PROFILE.evaFanDossier.favoriteCharacter}
                </div>
              </div>
            </div>

            <blockquote className="border-l-4 border-red pl-4 py-1 font-serif italic text-sm sm:text-base text-ink">
              {PROFILE.evaFanDossier.favoriteQuote}
            </blockquote>
          </article>

          {/* Panel 4: Narrative Manga Stamp & Caption (4 cols) */}
          <div className="about-manga-panel lg:col-span-4 flex flex-col justify-between gap-4">
            <div className="bg-ink text-paper-pure border-3 border-ink p-5 shadow-[6px_6px_0px_var(--ink)]">
              <div className="font-mono text-[10px] tracking-[0.25em] text-red font-bold uppercase mb-1">
                OBSERVATION LOG
              </div>
              <p className="font-serif text-base sm:text-lg font-bold leading-snug">
                “Every system interface is a narrative panel. Precision and atmosphere are inseparable.”
              </p>
            </div>

            <CaptionBox
              code="CAPTION // 02 : DOSSIER"
              text="DOSSIER UNSEALED. SUBJECT HARMONICS REMAIN WITHIN TOLERANCE."
              className="w-full max-w-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
