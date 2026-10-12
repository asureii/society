import React, { useEffect, useRef } from 'react';
import { PROFILE } from '../config/profile';
import { gsap } from '../lib/gsap';
import { useAppStore } from '../store/useAppStore';
import { ChapterCard } from '../ui/ChapterCard';
import { InkSpotIllustration } from '../ui/InkSpotIllustration';

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
          { y: 20 },
          {
            y: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: panel,
              start: 'top 90%',
              end: 'top 60%',
              scrub: 0.4,
            },
            delay: i * 0.04,
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
      className="relative min-h-screen w-full manga-page-wipe page-beat-safe pb-24 pointer-events-auto flex flex-col justify-center"
    >
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div
          data-content-box="about-header"
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
        >
          <ChapterCard
            number="02"
            title="PERSONNEL FILE"
            jpSubtitle="弐 // 人事記録"
            alertText="NERV DOSSIER"
          />
          <div className="flex items-center gap-3 border-2 border-ink bg-paper-pure p-2">
            <InkSpotIllustration motif="monolith-fragment" seed={202} className="w-24 h-14" />
            <span className="font-mono text-xs font-bold uppercase text-ink max-w-[160px]">
              DOSSIER UNSEALED. HARMONICS NOMINAL.
            </span>
          </div>
        </div>

        {/* 4 Irregular Black-Bordered Manga Panels on White */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Panel 1: Primary Dossier Specifications (7 cols) */}
          <article
            data-content-box="about-panel-a"
            className="about-manga-panel lg:col-span-7 bg-paper-pure border-3 border-ink p-6 shadow-[5px_5px_0px_var(--ink)]"
          >
            <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-4">
              <span className="font-mono text-xs font-bold tracking-widest uppercase">
                PANEL 02.A // IDENTIFICATION
              </span>
              <span className="font-mono text-xs font-bold text-red">ID-01</span>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-ink/15 pb-4 mb-4">
              <div>
                <dt className="font-mono text-xs tracking-wider uppercase text-ink">
                  DESIGNATION
                </dt>
                <dd id="heading-about" className="font-serif font-bold text-lg text-ink mt-0.5">
                  {PROFILE.fullName}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-xs tracking-wider uppercase text-ink">
                  OPERATIONAL ROLE
                </dt>
                <dd className="font-mono text-xs font-bold text-ink mt-0.5">
                  {PROFILE.roleTagline}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-mono text-xs tracking-wider uppercase text-ink">
                  LOCATION
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

          {/* Panel 2: Specializations (5 cols) */}
          <article
            data-content-box="about-panel-b"
            className="about-manga-panel lg:col-span-5 bg-paper-pure border-3 border-ink p-6 shadow-[5px_5px_0px_var(--ink)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-4">
                <span className="font-mono text-xs font-bold tracking-widest uppercase">
                  PANEL 02.B // FOCUS AREAS
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
              <span className="font-mono text-xs tracking-wider uppercase">
                CLEARANCE
              </span>
              <span className="font-display text-sm tracking-widest text-red">
                PRIORITY // AAA
              </span>
            </div>
          </article>

          {/* Panel 3: Evangelion Homage Dossier Card (8 cols) */}
          <article
            data-content-box="about-panel-c"
            className="about-manga-panel lg:col-span-8 bg-paper-pure border-3 border-ink p-6 shadow-[5px_5px_0px_var(--ink)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-red pb-2 mb-4">
              <span className="font-display text-sm tracking-[0.18em] uppercase text-ink">
                PANEL 02.C // EVANGELION RECORD
              </span>
              <span className="bg-red text-paper-pure font-mono text-xs font-bold px-2 py-0.5">
                {PROFILE.evaFanDossier.syncNote}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="border-2 border-ink p-3 bg-paper">
                <div className="font-mono text-xs tracking-wider uppercase text-ink">
                  FAVORITE EPISODE // 記録
                </div>
                <div className="font-serif font-bold text-sm sm:text-base text-ink mt-1">
                  {PROFILE.evaFanDossier.favoriteEpisode}
                </div>
              </div>

              <div className="border-2 border-ink p-3 bg-paper">
                <div className="font-mono text-xs tracking-wider uppercase text-ink">
                  FAVORITE CHARACTER // 人物
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

          {/* Panel 4: Hand-inked spot + Observation Log (4 cols) */}
          <div
            data-content-box="about-panel-d"
            className="about-manga-panel lg:col-span-4 flex flex-col justify-between gap-4 bg-paper-pure border-3 border-ink p-5 shadow-[5px_5px_0px_var(--ink)]"
          >
            <div>
              <div className="font-mono text-xs tracking-[0.18em] text-red font-bold uppercase mb-2">
                OBSERVATION LOG
              </div>
              <p className="font-serif text-base sm:text-lg font-bold leading-snug text-ink">
                “Every system interface is a narrative panel. Precision and atmosphere are inseparable.”
              </p>
            </div>
            <div className="border-t-2 border-ink pt-3 flex items-center justify-between">
              <InkSpotIllustration motif="stone-cairn" seed={209} className="w-28 h-16" />
              <span className="font-mono text-xs font-bold uppercase text-ink">
                CH.02 // END
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
