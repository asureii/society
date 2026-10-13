/**
 * SINGLE-CLOCK MASTER INTRO TIMELINE MATH (src/lib/introTimeline.ts)
 *
 * Pure, deterministic functions mapping `introElapsedSec` (`0.0 .. 9.2s`) or
 * `introP` (`0.0 .. 1.0`) to every phase and visual scalar used by:
 * - `src/chapters/Intro/Intro.tsx` (DOM emblem, progress bar, parting quote lines, attribution, SKIP button)
 * - `src/scene/intro/introScene.tsx` (WebGL infinite grid, draw-order reveal, gear/piston/orb animation, Portal iris)
 * - `src/ui/MangaPageLayout.tsx` & HUD components (Cover panel reveal & HUD fade-in during last 25% of Portal iris)
 */

import {
  INTRO_CONFIG,
  computeIntroPhaseFromElapsed,
  type IntroPhase,
} from '../config/intro.ts';
import { clamp } from './math.ts';

export interface IntroFrameTelemetry {
  elapsedSec: number;
  introP: number;
  phase: IntroPhase;
  /** 0..1 progress within the loading phase (0.0 .. 2.6s) */
  loadingP: number;
  /** 0..1 stroke-dashoffset progress for the geometric emblem (0.15 .. 2.05s) */
  emblemDrawP: number;
  /** Opacity of the loading emblem & progress bar (fades out 2.25 .. 2.60s) */
  loaderGroupOpacity: number;
  /** Whether the loading group should be rendered */
  loaderGroupVisible: boolean;
  /** 0..1 letter-by-letter ink-wipe progress for the quote (2.6 .. 4.65s) */
  quoteRevealP: number;
  /** Vertical parting offset in vh for the top and bottom quote lines during reveal/hold */
  quotePartVh: number;
  /** 0..1 ink-out clip progress as quote lines exit the screen at the start of hold (6.4 .. 6.76s) */
  quoteExitClipP: number;
  /** Whether the quote container is visible (2.6 .. 6.76s) */
  quoteGroupVisible: boolean;
  /** 0..1 width progress of the thin red underline beneath "PROJECTION" */
  projectionUnderlineP: number;
  /** Whether the bottom-left attribution is visible (hold phase: 6.45 .. 7.95s) */
  attributionVisible: boolean;
  /** 0..1 progress of the portal iris (7.8 .. 9.2s) */
  portalP: number;
  /** 0..1 opacity of the main site HUD (0 during phases 0..4, fades in over last 25% of portal iris) */
  hudOpacity: number;
  /** Whether Scene 1 Cover DOM panel should be visible */
  coverPanelRevealed: boolean;
}

export function computeIntroFrameTelemetry(
  elapsedSec: number,
  isSkipping = false,
  skipProgress = 0,
  reducedMotion = false,
): IntroFrameTelemetry {
  const b = INTRO_CONFIG.boundaries;
  const d = INTRO_CONFIG.durations;
  const total = INTRO_CONFIG.totalDurationSec;

  const t = clamp(elapsedSec, 0, total);
  const introP = clamp(t / total, 0, 1);
  const phase = computeIntroPhaseFromElapsed(t);

  if (phase === 'done') {
    return {
      elapsedSec: total,
      introP: 1,
      phase: 'done',
      loadingP: 1,
      emblemDrawP: 1,
      loaderGroupOpacity: 0,
      loaderGroupVisible: false,
      quoteRevealP: 1,
      quotePartVh: 55,
      quoteExitClipP: 1,
      quoteGroupVisible: false,
      projectionUnderlineP: 1,
      attributionVisible: false,
      portalP: 1,
      hudOpacity: 1,
      coverPanelRevealed: true,
    };
  }

  // Fast skip (~0.6s ink-wipe into Cover iris from any phase)
  if (isSkipping) {
    const sp = clamp(skipProgress, 0, 1);
    return {
      elapsedSec: t,
      introP,
      phase: 'portal',
      loadingP: 1,
      emblemDrawP: 1,
      loaderGroupOpacity: 0,
      loaderGroupVisible: false,
      quoteRevealP: 1,
      quotePartVh: 55,
      quoteExitClipP: 1,
      quoteGroupVisible: false,
      projectionUnderlineP: 1,
      attributionVisible: false,
      portalP: sp,
      hudOpacity: clamp((sp - 0.7) / 0.3, 0, 1),
      coverPanelRevealed: sp >= 0.45,
    };
  }

  // Loading phase metrics (0.0 .. 2.6s)
  const loadingP = clamp(t / d.loading, 0, 1);
  const emblemDrawP = reducedMotion ? 1 : clamp((t - 0.12) / 1.9, 0, 1);
  const loaderFadeOut = clamp((t - (b.loadingEnd - 0.36)) / 0.34, 0, 1);
  const loaderGroupOpacity = t < b.loadingEnd ? 1 - loaderFadeOut : 0;
  const loaderGroupVisible = t < b.loadingEnd - 0.01;

  // Quote phase metrics (2.6 .. 5.0s) & Reveal parting (5.0 .. 6.76s)
  const quoteRevealP = reducedMotion
    ? t >= b.loadingEnd
      ? 1
      : 0
    : clamp((t - b.loadingEnd) / (d.quote * 0.84), 0, 1);

  let quotePartVh = 0;
  let quoteExitClipP = 0;
  if (t > b.quoteEnd) {
    if (t <= b.revealEnd) {
      const revP = clamp((t - b.quoteEnd) / d.reveal, 0, 1);
      if (revP <= 0.75) {
        const partEase = 1 - Math.pow(1 - revP / 0.75, 2.2);
        // Lines part vertically to frame the ~68% height paper band (at t=5.5s, revP=0.357 -> ~26vh each = 52vh gap)
        quotePartVh = partEase * 31;
      } else {
        const exitP = clamp((revP - 0.75) / 0.25, 0, 1);
        quotePartVh = 31 + exitP * 25;
        quoteExitClipP = exitP;
      }
    } else {
      quotePartVh = 56;
      quoteExitClipP = 1;
    }
  }

  const quoteGroupVisible =
    t >= b.loadingEnd - 0.02 &&
    (reducedMotion ? t < b.quoteEnd : t < b.revealEnd + 0.02);

  const projectionUnderlineP =
    t < b.quoteEnd ? 0 : clamp((t - (b.quoteEnd + 0.18)) / 0.65, 0, 1);

  const attributionVisible = t >= b.revealEnd + 0.08 && t <= b.holdEnd + 0.15;

  const portalP = t <= b.holdEnd ? 0 : clamp((t - b.holdEnd) / d.portal, 0, 1);
  const hudOpacity = portalP < 0.75 ? 0 : clamp((portalP - 0.75) / 0.25, 0, 1);
  const coverPanelRevealed = portalP >= 0.46;

  return {
    elapsedSec: t,
    introP,
    phase,
    loadingP,
    emblemDrawP,
    loaderGroupOpacity,
    loaderGroupVisible,
    quoteRevealP,
    quotePartVh,
    quoteExitClipP,
    quoteGroupVisible,
    projectionUnderlineP,
    attributionVisible,
    portalP,
    hudOpacity,
    coverPanelRevealed,
  };
}
