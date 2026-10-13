/**
 * SCROLL, VIRTUAL PROGRESS CAP & TIMING CONFIGURATION (src/config/scroll.config.ts)
 *
 * Single source of truth for:
 * 1. Global scroll budget and chapter ranges across [0, 1]
 * 2. Per-chapter phase fractions: ENTER, HOLD, TRANSITION
 * 3. Virtual scroll velocity cap (`MAX_CHAPTERS_PER_SECOND`) guaranteeing every
 *    scene transition lasts >= 0.8s of real time even under rapid flick scrolling
 * 4. Chapter HOLD midpoints used by Nav scrollTo
 */

import type { ChapterId } from '../store/useAppStore';

export interface ChapterTimingConfig {
  /** Fraction of chapter span for ENTER settle phase */
  enter: number;
  /** Fraction of chapter span for HOLD phase (panel pinned, internal advances) */
  hold: number;
  /** Fraction of chapter span for TRANSITION phase (iris / panelSlice reveal) */
  transition: number;
}

export interface ChapterScrollDefinition {
  id: ChapterId;
  /** Relative span weight in global scroll timeline */
  weight: number;
  timing: ChapterTimingConfig;
}

/**
 * Maximum chapters per second that virtualProgress can traverse during free scrolling.
 * With transition share = 0.36 and MAX_CHAPTERS_PER_SECOND = 0.40:
 *   minTransitionSeconds = 0.36 / 0.40 = 0.90s >= 0.80s invariant.
 */
export const MAX_CHAPTERS_PER_SECOND = 0.40;

/** Minimum allowed real-time duration (in seconds) for any scene transition at max virtual speed */
export const MIN_TRANSITION_REALTIME_SECONDS = 0.80;

export const CHAPTER_SCROLL_SPECS: ChapterScrollDefinition[] = [
  {
    id: 'cover',
    weight: 1.0,
    timing: { enter: 0.14, hold: 0.50, transition: 0.36 },
  },
  {
    id: 'about',
    weight: 1.0,
    timing: { enter: 0.14, hold: 0.50, transition: 0.36 },
  },
  {
    id: 'work',
    weight: 1.15, // Slightly wider to explore 6 repository artifacts comfortably
    timing: { enter: 0.14, hold: 0.50, transition: 0.36 },
  },
  {
    id: 'status',
    weight: 1.0,
    timing: { enter: 0.14, hold: 0.50, transition: 0.36 },
  },
  {
    id: 'skills',
    weight: 1.0,
    timing: { enter: 0.14, hold: 0.50, transition: 0.36 },
  },
  {
    id: 'timeline',
    weight: 1.0,
    timing: { enter: 0.14, hold: 0.50, transition: 0.36 },
  },
  {
    id: 'contact',
    weight: 1.25, // Includes ENTER, HOLD (Contact panel), CLOSE (doorway ink finale), and final readHold
    timing: { enter: 0.14, hold: 0.51, transition: 0.0 },
  },
];

/** Total height of the scroll spacer element in viewport height units */
export const TOTAL_SCROLL_HEIGHT_VH = 1400;

/**
 * S7 Finale ("doorway closes into THE END?") scroll timeline configuration:
 * - `closeShare`: fraction (0.35) of S7's active range (before readHold) where `endP` progresses 0 -> 1
 * - `readHoldVh`: viewport height units (60vh) at the very end of the page where `endP = 1.0` holds steady
 */
export interface EndFinaleConfig {
  closeShare: number;
  readHoldVh: number;
}

export const end: EndFinaleConfig = {
  closeShare: 0.35,
  readHoldVh: 60,
};

export const END_FINALE_CONFIG: EndFinaleConfig = end;

export interface ComputedChapterScrollRange {
  id: ChapterId;
  index: number;
  scrollRange: [number, number];
  span: number;
  timing: ChapterTimingConfig;
  /** Global scroll progress where this chapter's outgoing transition begins (tau = 0) */
  transitionStartProgress: number;
  /** Global scroll progress at the exact midpoint of HOLD phase */
  holdMidpointProgress: number;
  /** Local start and end of HOLD phase within [0, 1] chapter span */
  localHoldStart: number;
  localHoldEnd: number;
  /** Minimum real-time duration (seconds) of this chapter's transition at MAX_CHAPTERS_PER_SECOND */
  minTransitionSeconds: number;
  /** For S7 (`contact`): global progress where the doorway ink closing begins (`endP = 0`) */
  closeStartProgress: number;
  /** For S7 (`contact`): global progress where the doorway ink closing completes (`endP = 1`) and `readHold` begins */
  readHoldStartProgress: number;
}

/**
 * Derives normalized [0, 1] scroll ranges, transition thresholds, HOLD midpoints, and S7 finale bounds.
 */
function computeChapterRanges(): ComputedChapterScrollRange[] {
  const totalWeight = CHAPTER_SCROLL_SPECS.reduce((sum, c) => sum + c.weight, 0);
  let currentStart = 0;

  return CHAPTER_SCROLL_SPECS.map((spec, index) => {
    const isFinalChapter = index === CHAPTER_SCROLL_SPECS.length - 1;
    const rawSpan = spec.weight / totalWeight;
    const rawEnd = isFinalChapter ? 1.0 : currentStart + rawSpan;
    const start = Number(currentStart.toFixed(5));
    const endProg = Number(rawEnd.toFixed(5));
    const span = Number((endProg - start).toFixed(5));
    currentStart = endProg;

    // For S7 (`contact`), reserve `readHoldVh / TOTAL_SCROLL_HEIGHT_VH` at the end of the page for reading THE END?
    const globalReadHoldSpan = isFinalChapter
      ? Math.min(span * 0.32, end.readHoldVh / TOTAL_SCROLL_HEIGHT_VH)
      : 0;
    const activeChapterSpan = Math.max(0.0001, span - globalReadHoldSpan);
    const activeFractionOfSpan = activeChapterSpan / Math.max(0.0001, span);

    const localHoldStart = spec.timing.enter * activeFractionOfSpan;
    const localHoldEnd = isFinalChapter
      ? (1 - end.closeShare) * activeFractionOfSpan
      : spec.timing.enter + spec.timing.hold;
    const localHoldMid = (localHoldStart + localHoldEnd) * 0.5;
    const holdMidpointProgress = Number((start + localHoldMid * span).toFixed(5));
    const transitionStartProgress = Number((start + localHoldEnd * span).toFixed(5));

    const closeStartProgress = isFinalChapter
      ? Number((start + (1 - end.closeShare) * activeChapterSpan).toFixed(5))
      : 1.0;
    const readHoldStartProgress = isFinalChapter
      ? Number((endProg - globalReadHoldSpan).toFixed(5))
      : 1.0;

    const minTransitionSeconds =
      spec.timing.transition > 0
        ? Number((spec.timing.transition / MAX_CHAPTERS_PER_SECOND).toFixed(4))
        : 0;

    return {
      id: spec.id,
      index,
      scrollRange: [start, endProg],
      span,
      timing: spec.timing,
      transitionStartProgress,
      holdMidpointProgress,
      localHoldStart: Number(localHoldStart.toFixed(5)),
      localHoldEnd: Number(localHoldEnd.toFixed(5)),
      minTransitionSeconds,
      closeStartProgress,
      readHoldStartProgress,
    };
  });
}

export const COMPUTED_SCROLL_RANGES: ComputedChapterScrollRange[] = computeChapterRanges();

/**
 * Maximum global virtualProgress delta per second, derived from the narrowest chapter span
 * and MAX_CHAPTERS_PER_SECOND so no chapter can be crossed faster than MAX_CHAPTERS_PER_SECOND.
 */
export const MAX_VIRTUAL_PROGRESS_PER_SECOND: number = Number(
  (
    Math.min(...COMPUTED_SCROLL_RANGES.map((r) => r.span)) * MAX_CHAPTERS_PER_SECOND
  ).toFixed(5),
);

export const CHAPTER_SCROLL_MAP: Record<ChapterId, ComputedChapterScrollRange> =
  Object.fromEntries(
    COMPUTED_SCROLL_RANGES.map((r) => [r.id, r]),
  ) as Record<ChapterId, ComputedChapterScrollRange>;
