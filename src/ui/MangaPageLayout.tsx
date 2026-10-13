/**
 * SINGLE-CLOCK PINNED MANGA PANEL SYSTEM (src/ui/MangaPageLayout.tsx)
 *
 * Implements:
 * 1. Persistent Loaded Text State (Santioni Spirits style):
 *    - Once a chapter's text loads on screen, it stays 100% loaded (never clipped or
 *      partially hidden by scroll progress).
 *    - When entering a chapter's section of the site, the panel smoothly glides into place
 *      (`translate3d(0, 0, 0)`) on its own time-driven tween (not stuck mid-scroll), and
 *      when scrolling away it moves off-screen intact and returns intact when revisited.
 * 2. Strict Disjoint Handoff (Zero Double Exposure, Zero Ghosting):
 *    - At most ONE chapter panel is on screen at any time (`opacity: 1` always).
 *    - Outgoing panel moves off-screen over tau in [0, 0.45) and hides at tau >= 0.45.
 *    - Incoming panel arrives at tau >= 0.55 once its scene art is GPU-ready.
 * 3. S7 Finale Guarantee:
 *    - The Contact panel finishes exiting by `endP = 0.05`.
 *    - For `endP >= 0.05`, all panels are hidden (`display: none`), `inert`, and `aria-hidden="true"`.
 */

import React, { useEffect, useRef } from 'react';
import type { SceneId } from '../config/scenes.config';
import { gsap } from '../lib/gsap';
import { computeIntroFrameTelemetry } from '../lib/introTimeline';
import { clamp } from '../lib/math';
import { useAppStore, type ChapterId } from '../store/useAppStore';

export interface MangaPanelProps {
  children: React.ReactNode;
  className?: string;
  /** Slight tilt/skew in degrees (-2.5 to +2.5) for authentic hand-ruled manga layout */
  tiltDeg?: number;
  /** Bleeds this panel to the left or right outer margin of the page */
  bleedEdge?: 'left' | 'right' | 'none';
  /** Dark inverted header strip code */
  panelCode?: string;
  panelTitle?: string;
  redAccentCorner?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  style?: React.CSSProperties;
}

export const MangaPanel: React.FC<MangaPanelProps> = ({
  children,
  className = '',
  tiltDeg = 0,
  bleedEdge = 'none',
  panelCode,
  panelTitle,
  redAccentCorner = false,
  onMouseEnter,
  onMouseLeave,
  style,
}) => {
  const polyPoints =
    tiltDeg > 0
      ? '0.6,1.4 99.4,0.4 98.8,99.2 1.2,98.6'
      : tiltDeg < 0
        ? '1.2,0.5 98.8,1.5 99.4,98.5 0.6,99.4'
        : '0.8,0.8 99.2,0.8 99.2,99.2 0.8,99.2';

  const bleedClass =
    bleedEdge === 'left'
      ? '-ml-2 sm:-ml-4 pl-3 sm:pl-4'
      : bleedEdge === 'right'
        ? '-mr-2 sm:-mr-4 pr-3 sm:pr-4'
        : '';

  return (
    <div
      data-avoid-hud
      data-content-box={panelCode ?? 'manga-panel'}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        ...(tiltDeg !== 0 ? { transform: `rotate(${tiltDeg * 0.32}deg)` } : {}),
        ...style,
      }}
      className={`relative bg-paper-pure text-ink p-2.5 sm:p-3.5 flex flex-col justify-between transition-transform duration-200 pointer-events-auto ${bleedClass} ${className}`}
    >
      {/* Crisp hand-ruled SVG polygon border (no SVG filter for 60fps compositing) */}
      <svg
        className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon
          points={polyPoints}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="2.2"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points="0.2,14 0.8,0.6 18,0.3"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points="82,99.7 99.3,99.3 99.7,85"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {redAccentCorner && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-1 -right-1 w-2.5 h-2.5 bg-red border border-ink"
        />
      )}

      {(panelCode || panelTitle) && (
        <div className="flex items-center justify-between gap-2 border-b border-ink/20 pb-1 mb-1.5">
          {panelCode && (
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase px-1.5 py-0.5 bg-ink text-paper-pure">
              {panelCode}
            </span>
          )}
          {panelTitle && (
            <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-ink truncate">
              {panelTitle}
            </span>
          )}
        </div>
      )}

      <div className="relative z-10 flex-1 flex flex-col justify-between">{children}</div>
    </div>
  );
};

export interface MangaPinnedChapterProps {
  id: ChapterId;
  sceneId: SceneId;
  chapterNumber: string;
  title: string;
  jpSubtitle: string;
  classification: string;
  summary: string;
  alignment?: 'left' | 'right' | 'center' | 'full';
  children: React.ReactNode;
}

/**
 * Pinned manga chapter container driven by the single-clock `chapterState { from, to, tau }` and `endP`.
 * Text inside the chapter loads once and stays loaded; when returning to this section of the
 * website, the panel glides back into view with all text intact.
 */
export const MangaPinnedChapter: React.FC<MangaPinnedChapterProps> = ({
  id,
  sceneId,
  chapterNumber,
  title,
  jpSubtitle,
  classification,
  summary,
  alignment = 'full',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wasInZoneRef = useRef<boolean>(id === 'cover');
  const slideOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const FULL_CLIP = 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';

    const hideAndInert = () => {
      wasInZoneRef.current = false;
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
      if (el.style.display !== 'none') {
        el.style.display = 'none';
      }
      el.inert = true;
      el.setAttribute('aria-hidden', 'true');
      el.dataset.panelActive = 'false';
    };

    const showAndActivate = () => {
      if (el.style.display === 'none') {
        el.style.display = 'flex';
      }
      el.inert = false;
      el.setAttribute('aria-hidden', 'false');
      el.dataset.panelActive = 'true';
    };

    const updateChoreography = () => {
      const state = useAppStore.getState();
      const cs = state.chapterState;
      const tau = cs.tau;
      const endP = state.endP;

      // Cinematic Intro gate: keep all chapter panels hidden until the Portal iris reveals Cover
      const isScrubbingIntro =
        state.debugScrubber.enabled && state.debugScrubber.mode === 'intro';
      if (state.introState !== 'done' || isScrubbingIntro) {
        const introTel = computeIntroFrameTelemetry(
          state.introElapsedSec,
          state.isSkippingIntro,
          state.skipProgress,
          state.reducedMotion,
        );
        if (!introTel.coverPanelRevealed) {
          hideAndInert();
          return;
        }
      }

      // S7 Finale rule: Panels are hidden (not just transparent) and inert for endP >= 0.05
      if (endP >= 0.05) {
        hideAndInert();
        return;
      }

      // During seamless rewind while black cover is still closed, wait until rewindRevealP >= 0.32
      if (state.isRewinding && state.rewindRevealP < 0.32) {
        hideAndInert();
        return;
      }

      // Authoritative single-clock chapter identity:
      // `to` when tau >= 0.5, `from` otherwise.
      const authoritativeChapter = tau >= 0.5 ? cs.to : cs.from;
      const isSceneArtReady = state.sceneReadyMap[sceneId] || id === 'cover';

      // Hide panel if not the authoritative chapter or if its scene art isn't ready
      if (id !== authoritativeChapter || !isSceneArtReady) {
        hideAndInert();
        return;
      }

      // S7 Finale Early Exit: Contact panel finishes exiting by endP = 0.05
      if (id === 'contact' && endP > 0) {
        wasInZoneRef.current = false;
        if (tweenRef.current) {
          tweenRef.current.kill();
          tweenRef.current = null;
        }
        showAndActivate();
        el.style.opacity = '1';
        el.style.clipPath = FULL_CLIP;
        const exitP = clamp(endP / 0.05, 0, 1);
        const exitAccel = exitP * exitP;
        const ty = Math.round(exitAccel * 120);
        el.style.transform = `translate3d(0px, ${ty}px, 0)`;
        return;
      }

      // During transition (tau > 0):
      // - Outgoing panel (`from`, tau < 0.5) moves off screen intact over tau in [0, 0.48)
      // - Incoming panel (`to`, tau >= 0.5) enters at tau >= 0.52 and glides to (0, 0)
      if (tau > 0.0001) {
        if (tau < 0.5) {
          // Outgoing panel (`from`)
          wasInZoneRef.current = false;
          if (tweenRef.current) {
            tweenRef.current.kill();
            tweenRef.current = null;
          }

          if (tau >= 0.48) {
            hideAndInert();
            return;
          }

          showAndActivate();
          el.style.opacity = '1';
          el.style.clipPath = FULL_CLIP;

          const exitP = clamp(tau / 0.48, 0, 1);
          const exitAccel = exitP * exitP;
          let tx = 0;
          let ty = 0;
          if (alignment === 'left') {
            tx = Math.round(exitAccel * -140);
          } else if (alignment === 'right') {
            tx = Math.round(exitAccel * 140);
          } else {
            ty = Math.round(exitAccel * -110);
          }

          el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
          return;
        } else {
          // Incoming panel (`to`, tau >= 0.5)
          if (tau < 0.52) {
            hideAndInert();
            return;
          }

          showAndActivate();
          el.style.opacity = '1';
          el.style.clipPath = FULL_CLIP;

          if (state.debugScrubber.enabled || state.reducedMotion) {
            const enterP = clamp((tau - 0.52) / 0.38, 0, 1);
            const enterEase = state.reducedMotion ? 1 : 1 - Math.pow(1 - enterP, 2.2);
            const tx =
              alignment === 'left'
                ? Math.round((1 - enterEase) * -60)
                : alignment === 'right'
                  ? Math.round((1 - enterEase) * 60)
                  : 0;
            const ty =
              alignment === 'left' || alignment === 'right'
                ? 0
                : Math.round((1 - enterEase) * 44);
            el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
            wasInZoneRef.current = true;
            return;
          }

          if (!wasInZoneRef.current) {
            wasInZoneRef.current = true;
            slideOffsetRef.current.x =
              alignment === 'left' ? -56 : alignment === 'right' ? 56 : 0;
            slideOffsetRef.current.y =
              alignment === 'left' || alignment === 'right' ? 0 : 40;
            if (tweenRef.current) tweenRef.current.kill();
            tweenRef.current = gsap.to(slideOffsetRef.current, {
              x: 0,
              y: 0,
              duration: 0.42,
              ease: 'power3.out',
            });
          }

          const tx = Math.round(slideOffsetRef.current.x);
          const ty = Math.round(slideOffsetRef.current.y);
          el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
          return;
        }
      }

      // Stationary HOLD Phase (tau == 0, endP == 0):
      wasInZoneRef.current = true;
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
      slideOffsetRef.current.x = 0;
      slideOffsetRef.current.y = 0;

      showAndActivate();
      el.style.setProperty('--hold-p', '1');
      el.style.transform = 'translate3d(0, 0, 0)';
      el.style.clipPath = FULL_CLIP;
      el.style.opacity = '1';
    };

    gsap.ticker.add(updateChoreography);
    updateChoreography();

    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
      }
      gsap.ticker.remove(updateChoreography);
    };
  }, [alignment, id, sceneId]);

  const initiallyVisible =
    id === 'cover' && useAppStore.getState().introState === 'done';

  return (
    <div
      ref={containerRef}
      id={`chapter-${id}`}
      data-chapter-id={id}
      data-scene-id={sceneId}
      data-panel-active={initiallyVisible ? 'true' : 'false'}
      aria-hidden={initiallyVisible ? 'false' : 'true'}
      aria-label={`Chapter ${chapterNumber}: ${title}`}
      className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-start pt-[74px] sm:pt-[82px] pb-6 px-3 sm:px-8 md:px-12 overflow-hidden transition-none"
      style={{
        display: initiallyVisible ? 'flex' : 'none',
        opacity: 1,
        willChange: 'transform, clip-path',
      }}
    >
      {/* Pinned Manga Page Spread Container */}
      <div className="relative mx-auto w-full max-w-6xl flex-1 flex flex-col justify-start min-h-0 pointer-events-none">
        {/* Compact Manga Header Strip (except Cover which uses unboxed hero title) */}
        {id !== 'cover' && (
          <header
            data-avoid-hud
            data-content-box={`${id}-header`}
            className="bg-paper-pure border-2 border-ink px-2.5 py-1.5 sm:px-4 sm:py-2 mb-2 sm:mb-3 flex flex-wrap items-center justify-between gap-2 shadow-[3px_3px_0px_var(--ink)] shrink-0 pointer-events-auto"
          >
            <div className="flex items-center gap-2">
              <span className="bg-ink text-paper-pure font-mono text-[10px] font-bold px-1.5 py-0.5 tracking-widest uppercase">
                CH.{chapterNumber}
              </span>
              <h2 className="font-serif font-bold text-sm sm:text-lg md:text-xl tracking-tight uppercase text-ink leading-none">
                {title}
              </h2>
              <span className="hidden md:inline-block font-jp text-xs font-bold text-red tracking-widest">
                {jpSubtitle}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <p className="hidden lg:block font-sans text-xs text-ink max-w-md truncate">
                {summary}
              </p>
              <span className="border border-ink px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-red">
                {classification}
              </span>
            </div>
          </header>
        )}

        {/* Pinned Manga Panels Content */}
        <div className="w-full flex-1 flex flex-col justify-start min-h-0 pointer-events-none">
          {children}
        </div>
      </div>
    </div>
  );
};
