/**
 * FULL-BLEED "THE END?" FINALE OVERLAY (src/ui/EndScreen.tsx)
 *
 * Driven strictly by the single-clock `endP` scalar (`endP >= 0.92`):
 * - Inert, `aria-hidden="true"`, and `pointer-events: none` before `endP >= 0.92`.
 * - Provides `#end-screen-accent-anchor` directly above the title so `PostInk.tsx`
 *   aligns the migrating WebGL Red Orb accent disc to within < 0.5px (<= 2px invariant).
 * - Displays vertical Japanese label (`終劇`), large white Shippori Mincho heading (`THE END?`),
 *   subline (`>= 12px`), thin red rule, and boxed `REWIND TO START` button (`min-h-[44px]`).
 * - Announces arrival via `aria-live="polite"` and moves focus to the button when reached via keyboard.
 */

import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PROFILE } from '../config/profile';
import { prefetchDashboardRoute } from '../dashboard/prefetchDashboard';
import { clamp } from '../lib/math';
import { useAppStore } from '../store/useAppStore';

export const EndScreen: React.FC = () => {
  const activeRoute = useAppStore((s) => s.activeRoute);
  const endP = useAppStore((s) => s.endP);
  const isRewinding = useAppStore((s) => s.isRewinding);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const triggerRewind = useAppStore((s) => s.triggerRewind);
  const triggerReplayIntro = useAppStore((s) => s.triggerReplayIntro);
  const triggerRouteTransition = useAppStore((s) => s.triggerRouteTransition);
  const scrollToTarget = useAppStore((s) => s.scrollToTarget);
  const lastInputWasKeyboard = useAppStore((s) => s.lastInputWasKeyboard);

  const sectionRef = useRef<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const wasActiveRef = useRef<boolean>(false);

  const isVisible = activeRoute === '/' && endP >= 0.92 && !isRewinding;
  const textOpacity = isVisible
    ? reducedMotion
      ? 1
      : clamp((endP - 0.92) / 0.06, 0, 1)
    : 0;
  const textTranslateY = isVisible && !reducedMotion
    ? Math.round((1 - clamp((endP - 0.92) / 0.06, 0, 1)) * 8)
    : 0;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    el.inert = !isVisible;
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && !wasActiveRef.current) {
      wasActiveRef.current = true;
      if (lastInputWasKeyboard && buttonRef.current) {
        buttonRef.current.focus({ preventScroll: true });
      }
    } else if (!isVisible) {
      wasActiveRef.current = false;
    }
  }, [isVisible, lastInputWasKeyboard]);

  const handleRewindClick = () => {
    if (triggerRewind) {
      triggerRewind();
    } else if (scrollToTarget) {
      scrollToTarget(0);
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const handleReplayIntroClick = () => {
    if (triggerReplayIntro) {
      triggerReplayIntro();
    }
  };

  const handleDashboardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    if (triggerRouteTransition) {
      e.preventDefault();
      triggerRouteTransition('/dashboard', [0.5, 0.34]);
    }
  };

  return (
    <section
      ref={sectionRef}
      id="end-screen"
      data-end-screen
      data-end-visible={isVisible ? 'true' : 'false'}
      aria-label="Finale End Screen"
      aria-hidden={isVisible ? 'false' : 'true'}
      className={`fixed inset-0 z-20 flex flex-col items-center justify-center px-4 select-none ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Polite screen-reader live region announcing arrival at the end screen */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isVisible ? `${PROFILE.endCard.title} ${PROFILE.endCard.subline}` : ''}
      </div>

      <div
        className="flex flex-col items-center text-center max-w-2xl"
        style={{
          opacity: textOpacity,
          transform: `translate3d(0, ${textTranslateY}px, 0)`,
          visibility: isVisible ? 'visible' : 'hidden',
        }}
      >
        {/* Small vertical Japanese label above the accent & heading */}
        <span
          data-end-jp-label
          className="font-serif font-bold text-xs sm:text-sm tracking-[0.3em] text-paper-pure mb-3"
          style={{ writingMode: 'vertical-rl' }}
        >
          {PROFILE.endCard.jpLabel}
        </span>

        {/* Exact layout target anchor for the WebGL Red Orb accent disc (20x20px = 10px radius) */}
        <div
          id="end-screen-accent-anchor"
          data-end-accent-anchor
          className="w-5 h-5 mb-4 shrink-0 pointer-events-none"
          aria-hidden="true"
        />

        {/* Main centered Shippori Mincho heading in crisp white on full-bleed black */}
        <h2
          id="end-screen-title"
          className="font-serif font-bold text-4xl sm:text-6xl md:text-7xl tracking-[0.06em] text-paper-pure uppercase leading-none"
        >
          {PROFILE.endCard.title}
        </h2>

        {/* Subline (strictly >= 12px) */}
        <p className="mt-4 font-mono text-xs sm:text-sm tracking-[0.18em] text-paper-pure uppercase max-w-xl leading-relaxed">
          {PROFILE.endCard.subline} — {PROFILE.fullName}
        </p>

        {/* Thin signal-red rule beneath subline */}
        <div className="w-16 h-[2px] bg-red my-5" aria-hidden="true" />

        {/* Boxed REWIND TO START, REPLAY INTRO & DASHBOARD buttons (thumb-sized min-h-[44px]) */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            ref={buttonRef}
            id="end-screen-rewind-btn"
            type="button"
            tabIndex={isVisible ? 0 : -1}
            onClick={handleRewindClick}
            className="bg-ink text-paper-pure border-2 border-paper-pure hover:bg-red hover:border-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red font-display text-xs sm:text-sm tracking-[0.18em] uppercase px-6 py-2.5 min-h-[44px] transition-colors cursor-pointer"
          >
            {PROFILE.endCard.cta}
          </button>

          <button
            id="end-screen-replay-intro-btn"
            data-replay-intro
            type="button"
            tabIndex={isVisible ? 0 : -1}
            onClick={handleReplayIntroClick}
            className="bg-ink text-paper-pure border-2 border-paper-pure hover:bg-red hover:border-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red font-mono text-xs font-bold tracking-[0.18em] uppercase px-4 py-2.5 min-h-[44px] transition-colors cursor-pointer"
          >
            {PROFILE.endCard.replayCta}
          </button>

          <Link
            to="/dashboard"
            id="end-screen-dashboard-link"
            tabIndex={isVisible ? 0 : -1}
            onMouseEnter={() => void prefetchDashboardRoute()}
            onFocus={() => void prefetchDashboardRoute()}
            onClick={handleDashboardClick}
            className="bg-ink text-paper-pure border-2 border-paper-pure hover:bg-red hover:border-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red font-display text-xs sm:text-sm tracking-[0.18em] uppercase px-5 py-2.5 min-h-[44px] inline-flex items-center transition-colors"
          >
            DASHBOARD
          </Link>
        </div>
      </div>
    </section>
  );
};
