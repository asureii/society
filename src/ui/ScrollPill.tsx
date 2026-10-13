import React, { useEffect, useRef } from 'react';
import { gsap } from '../lib/gsap';
import { computeIntroFrameTelemetry } from '../lib/introTimeline';
import { CHAPTERS, useAppStore } from '../store/useAppStore';

export const ScrollPill: React.FC = () => {
  const activeRoute = useAppStore((s) => s.activeRoute);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const onBlack = useAppStore((s) => s.onBlack);
  const introState = useAppStore((s) => s.introState);
  const introElapsedSec = useAppStore((s) => s.introElapsedSec);
  const isSkippingIntro = useAppStore((s) => s.isSkippingIntro);
  const skipProgress = useAppStore((s) => s.skipProgress);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const debugScrubber = useAppStore((s) => s.debugScrubber);
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);

  const isScrubbingIntro = debugScrubber.enabled && debugScrubber.mode === 'intro';
  const hudOpacity =
    activeRoute === '/dashboard'
      ? 0
      : introState === 'done' && !isScrubbingIntro
        ? 1
        : computeIntroFrameTelemetry(introElapsedSec, isSkippingIntro, skipProgress, reducedMotion)
            .hudOpacity;

  useEffect(() => {
    const updatePill = () => {
      const p = useAppStore.getState().scrollProgress;
      const pct = Math.round(p * 100);
      if (labelRef.current) {
        labelRef.current.textContent = `${String(pct).padStart(2, '0')}%`;
      }
      if (barRef.current) {
        barRef.current.style.height = `${Math.max(2, p * 100)}%`;
      }
    };

    gsap.ticker.add(updatePill);
    updatePill();
    return () => {
      gsap.ticker.remove(updatePill);
    };
  }, []);

  return (
    <aside
      data-hud
      data-hud-element="scroll-pill"
      data-on-black={onBlack ? 'true' : 'false'}
      style={{
        opacity: hudOpacity,
        visibility: hudOpacity <= 0.01 ? 'hidden' : 'visible',
      }}
      aria-label="Scroll Depth Progress"
      className="hidden md:flex fixed right-2.5 top-1/2 -translate-y-1/2 z-40 pointer-events-none flex-col items-center gap-1.5"
    >
      <span
        ref={labelRef}
        className={`font-mono text-[10px] font-bold tracking-tighter border px-1 transition-colors duration-200 ${
          onBlack
            ? 'bg-ink border-paper-pure text-paper-pure'
            : 'bg-paper-pure border-ink text-ink'
        }`}
      >
        00%
      </span>

      {/* Slim vertical scroll-progress pill: switches outline to white on black */}
      <div
        className={`relative w-2.5 h-32 md:h-36 border-2 overflow-hidden transition-colors duration-200 ${
          onBlack ? 'bg-ink border-paper-pure' : 'bg-paper-pure border-ink'
        }`}
      >
        <div
          ref={barRef}
          className="w-full bg-red transition-none origin-top"
          style={{ height: '2%' }}
        />

        {/* Chapter tick marks */}
        {CHAPTERS.map((ch, idx) => {
          const topPct = (idx / CHAPTERS.length) * 100;
          return (
            <span
              key={ch.id}
              className={`absolute left-0 right-0 h-[1.5px] ${
                onBlack
                  ? activeChapter === ch.id
                    ? 'bg-paper-pure'
                    : 'bg-paper-pure/40'
                  : activeChapter === ch.id
                    ? 'bg-ink'
                    : 'bg-ink/30'
              }`}
              style={{ top: `${topPct}%` }}
            />
          );
        })}
      </div>
    </aside>
  );
};
