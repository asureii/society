import React, { useEffect, useRef } from 'react';
import { PROFILE } from '../config/profile';
import { gsap } from '../lib/gsap';
import { useAppStore } from '../store/useAppStore';
import { ChapterCard } from '../ui/ChapterCard';
import { CaptionBox } from '../ui/CaptionBox';

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
          end: () => `+=${Math.max(900, getScrollAmount())}`,
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
      className="relative min-h-screen w-full px-6 sm:px-12 md:px-20 py-24 pointer-events-none flex flex-col justify-center overflow-hidden"
    >
      <div className="w-full max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 pointer-events-auto">
        <div id="heading-timeline">
          <ChapterCard
            number="06"
            title="CHRONOLOGY"
            jpSubtitle="陸 // 航跡記録"
            alertText="OPERATIONAL TIMELINE"
          />
        </div>
        <CaptionBox
          code="CAPTION // 06 : TRAJECTORY"
          text="EACH MILESTONE ETCHED IN INK ALONG THE APPROACH VECTOR."
        />
      </div>

      {/* Horizontal-feeling panel sequence driven by vertical scroll on desktop, stacked cleanly on mobile */}
      <div className="w-full max-w-6xl mx-auto pointer-events-auto">
        <div
          ref={trackRef}
          className="flex flex-col md:flex-row items-stretch gap-6 md:w-max"
        >
          {PROFILE.timeline.map((entry, idx) => (
            <article
              key={entry.id}
              className="w-full md:w-[410px] shrink-0 bg-paper-pure border-3 border-ink p-6 shadow-[6px_6px_0px_var(--ink)] flex flex-col justify-between relative"
            >
              <div>
                {/* Top Header */}
                <div className="flex items-center justify-between border-b-2 border-ink pb-2 mb-4">
                  <span className="font-mono text-xs font-bold bg-ink text-paper-pure px-2 py-0.5">
                    {entry.code}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 uppercase border border-ink ${
                      idx === PROFILE.timeline.length - 1
                        ? 'bg-red text-paper-pure border-red'
                        : 'bg-paper text-ink'
                    }`}
                  >
                    {entry.classification}
                  </span>
                </div>

                {/* Period */}
                <div className="font-display text-sm tracking-[0.18em] text-red uppercase mb-1">
                  {entry.period}
                </div>

                {/* Title & Organization */}
                <h3 className="font-serif font-bold text-xl text-ink uppercase leading-snug">
                  {entry.title}
                </h3>
                <div className="font-mono text-xs font-bold text-ink opacity-80 mt-1 mb-4">
                  {entry.organization}
                </div>

                <p className="font-mono text-xs leading-relaxed text-ink border-t border-ink/15 pt-3">
                  {entry.summary}
                </p>
              </div>

              {/* Manga Panel Bottom Caption */}
              <div className="mt-6 pt-3 border-t-2 border-ink flex items-center justify-between">
                <span className="font-display text-xs tracking-[0.14em] uppercase text-ink">
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
