import React, { useEffect, useRef } from 'react';
import { PROFILE } from '../config/profile';
import { gsap } from '../lib/gsap';
import { useAppStore } from '../store/useAppStore';
import { ChapterCard } from '../ui/ChapterCard';
import { InkSpotIllustration } from '../ui/InkSpotIllustration';

export const Timeline: React.FC = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const isMobile = useAppStore((s) => s.isMobile);

  useEffect(() => {
    if (!sectionRef.current || !trackRef.current || reducedMotion || isMobile) return;

    const ctx = gsap.context(() => {
      const track = trackRef.current!;
      const getScrollAmount = () => {
        return Math.max(0, track.scrollWidth - window.innerWidth + 160);
      };

      gsap.to(track, {
        x: () => -getScrollAmount(),
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: () => `+=${Math.max(850, getScrollAmount())}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reducedMotion, isMobile]);

  return (
    <section
      ref={sectionRef}
      id="chapter-timeline"
      aria-labelledby="heading-timeline"
      className="relative min-h-screen w-full manga-page-wipe page-beat-safe pb-20 pointer-events-auto flex flex-col justify-center overflow-hidden"
    >
      <div
        data-content-box="timeline-header"
        className="w-full max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div id="heading-timeline">
          <ChapterCard
            number="06"
            title="CHRONOLOGY"
            jpSubtitle="陸 // 航跡"
            alertText="OPERATIONAL TIMELINE"
          />
        </div>
        <div className="flex items-center gap-3 border-2 border-ink bg-paper-pure p-2">
          <InkSpotIllustration motif="stone-cairn" seed={606} className="w-24 h-14" />
          <span className="font-mono text-xs font-bold uppercase text-ink max-w-[180px]">
            MILESTONES ETCHED ALONG THE APPROACH.
          </span>
        </div>
      </div>

      {/* Horizontal-feeling panel sequence driven by vertical scroll on desktop, stacked cleanly on mobile */}
      <div className="w-full max-w-6xl mx-auto">
        <div
          ref={trackRef}
          className="flex flex-col md:flex-row items-stretch gap-6 md:w-max"
        >
          {PROFILE.timeline.map((entry, idx) => (
            <article
              key={entry.id}
              data-content-box={`timeline-card-${idx}`}
              className="w-full md:w-[400px] shrink-0 bg-paper-pure border-3 border-ink p-6 shadow-[5px_5px_0px_var(--ink)] flex flex-col justify-between relative"
            >
              <div>
                <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-4">
                  <span className="font-mono text-xs font-bold bg-ink text-paper-pure px-2 py-0.5">
                    {entry.code}
                  </span>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 uppercase border border-ink ${
                      idx === PROFILE.timeline.length - 1
                        ? 'bg-red text-paper-pure border-red'
                        : 'bg-paper text-ink'
                    }`}
                  >
                    {entry.classification}
                  </span>
                </div>

                <div className="font-display text-sm tracking-[0.16em] text-red uppercase mb-1">
                  {entry.period}
                </div>

                <h3 className="font-serif font-bold text-xl text-ink uppercase leading-snug">
                  {entry.title}
                </h3>
                <div className="font-mono text-xs font-bold text-ink mt-1 mb-4">
                  {entry.organization}
                </div>

                <p className="font-mono text-xs leading-relaxed text-ink border-t border-ink/15 pt-3">
                  {entry.summary}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t-2 border-ink flex items-center justify-between">
                <span className="font-display text-xs tracking-[0.12em] uppercase text-ink">
                  {entry.caption}
                </span>
                <span className="font-mono text-xs font-bold text-ink">
                  0{idx + 1} / 0{PROFILE.timeline.length}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
