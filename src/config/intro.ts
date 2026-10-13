/**
 * CINEMATIC INTRO SEQUENCE CONFIGURATION (src/config/intro.ts)
 *
 * Centralizes all tunable parameters for the ~9.2s opening sequence:
 * "MACHINERY IS A PROJECTION OF THE MIND"
 *
 * Single-clock phase timeline (total = 9.2s <= 10.0s):
 * - 0.0s .. 2.6s : 'loading' (2.6s, min 1.8s) — Black screen, emblem stroke-in, real preload progress bar
 * - 2.6s .. 5.0s : 'quote'   (2.4s)           — Two-line Shippori Mincho quote letter-by-letter ink wipe
 * - 5.0s .. 6.4s : 'reveal'  (1.4s)           — Quote lines part vertically; ink-edged paper band opens; uReveal 0->1
 * - 6.4s .. 7.8s : 'hold'    (1.4s)           — Full-bleed hand-inked brain + mirror + machine reflection + live motion
 * - 7.8s .. 9.2s : 'portal'  (1.4s)           — Camera pushes into mirror; machine red orb opens Orb Iris into Scene 1 Cover
 * - 9.2s         : 'done'                     — Scroll unlocked at 0, Cover active, intro textures disposed
 */

export type IntroPhase = 'loading' | 'quote' | 'reveal' | 'hold' | 'portal' | 'done';

export interface IntroConfig {
  /** Master toggle for the intro sequence */
  readonly enabled: boolean;
  /** Deterministic PRNG seed for all procedural intro ink art (grid, brain, mirror, machine) */
  readonly seed: number;
  /** Whether to record `sessionStorage.setItem('introSeen', '1')` and skip on repeat visits in the same tab session */
  readonly showOncePerSession: boolean;
  /** SessionStorage key used when `showOncePerSession` is true */
  readonly sessionStorageKey: string;
  /** Duration in seconds for the fast ink-wipe skip transition into Cover from any phase */
  readonly skipDurationSec: number;
  /** Phase durations in seconds (sum = 9.2s <= 10.0s) */
  readonly durations: {
    readonly loading: number;
    readonly minLoadingSec: number;
    readonly quote: number;
    readonly reveal: number;
    readonly hold: number;
    readonly portal: number;
  };
  /** Cumulative phase boundary timestamps in seconds */
  readonly boundaries: {
    readonly loadingEnd: number; // 2.6
    readonly quoteEnd: number;   // 5.0
    readonly revealEnd: number;  // 6.4
    readonly holdEnd: number;    // 7.8
    readonly portalEnd: number;  // 9.2 (total duration)
  };
  /** Total duration of the intro timeline in seconds (9.2s) */
  readonly totalDurationSec: number;
  /** Reduced-motion fallback durations in seconds */
  readonly reducedMotionDurations: {
    readonly quoteCardSec: number;
    readonly sceneHoldSec: number;
    readonly crossfadeSec: number;
  };
  /** Layout & composition anchors (normalized screen UV: x in [0,1] left-to-right, y in [0,1] bottom-to-top for WebGL) */
  readonly layout: {
    readonly mobileBreakpointPx: number;
    readonly desktop: {
      /** Horizon height as fraction from bottom of screen (~0.62 from bottom = ~38% from top) */
      readonly horizonUvY: number;
      /** Brain center in screen UV (left third) */
      readonly brainCenterUv: readonly [number, number];
      /** Mirror machine red orb core in screen UV (right third) — also serves as Portal iris center */
      readonly machineCoreUv: readonly [number, number];
    };
    readonly mobile: {
      /** Horizon height as fraction from bottom of screen (~0.55 from bottom = ~45% from top) */
      readonly horizonUvY: number;
      /** Brain center in screen UV (upper-left) */
      readonly brainCenterUv: readonly [number, number];
      /** Mirror machine red orb core in screen UV (lower-right) */
      readonly machineCoreUv: readonly [number, number];
    };
  };
  /** Performance & memory budgets */
  readonly budget: {
    /** Main art & draw-order canvas width (<= 2048px) */
    readonly artWidth: number;
    /** Main art & draw-order canvas height (<= 2048px) */
    readonly artHeight: number;
    /** Grid atlas texture size (8 variants tiled in 4x2 grid) */
    readonly gridAtlasWidth: number;
    readonly gridAtlasHeight: number;
    /** Maximum GPU texture memory budget in bytes (30 MB) */
    readonly maxGpuMemoryBytes: number;
  };
}

const LOADING_SEC = 2.6;
const QUOTE_SEC = 2.4;
const REVEAL_SEC = 1.4;
const HOLD_SEC = 1.4;
const PORTAL_SEC = 1.4;

const LOADING_END = LOADING_SEC; // 2.6
const QUOTE_END = LOADING_END + QUOTE_SEC; // 5.0
const REVEAL_END = QUOTE_END + REVEAL_SEC; // 6.4
const HOLD_END = REVEAL_END + HOLD_SEC; // 7.8
const PORTAL_END = HOLD_END + PORTAL_SEC; // 9.2

export const INTRO_CONFIG: IntroConfig = {
  enabled: true,
  seed: 20261012,
  showOncePerSession: false,
  sessionStorageKey: 'introSeen',
  skipDurationSec: 0.6,
  durations: {
    loading: LOADING_SEC,
    minLoadingSec: 1.8,
    quote: QUOTE_SEC,
    reveal: REVEAL_SEC,
    hold: HOLD_SEC,
    portal: PORTAL_SEC,
  },
  boundaries: {
    loadingEnd: LOADING_END,
    quoteEnd: QUOTE_END,
    revealEnd: REVEAL_END,
    holdEnd: HOLD_END,
    portalEnd: PORTAL_END,
  },
  totalDurationSec: PORTAL_END,
  reducedMotionDurations: {
    quoteCardSec: 2.5,
    sceneHoldSec: 2.0,
    crossfadeSec: 0.4,
  },
  layout: {
    mobileBreakpointPx: 768,
    desktop: {
      horizonUvY: 0.62, // 38% from top of screen
      brainCenterUv: [0.30, 0.50],
      machineCoreUv: [0.68, 0.52],
    },
    mobile: {
      horizonUvY: 0.55, // 45% from top of screen
      brainCenterUv: [0.31, 0.58],
      machineCoreUv: [0.69, 0.44],
    },
  },
  budget: {
    artWidth: 1600,
    artHeight: 1000,
    gridAtlasWidth: 1024,
    gridAtlasHeight: 512,
    maxGpuMemoryBytes: 30 * 1024 * 1024,
  },
};

/**
 * Pure helper mapping elapsed intro seconds `t` (in [0, 9.2]) to `IntroPhase`.
 */
export function computeIntroPhaseFromElapsed(elapsedSec: number): IntroPhase {
  const b = INTRO_CONFIG.boundaries;
  if (elapsedSec >= b.portalEnd - 1e-4) return 'done';
  if (elapsedSec >= b.holdEnd) return 'portal';
  if (elapsedSec >= b.revealEnd) return 'hold';
  if (elapsedSec >= b.quoteEnd) return 'reveal';
  if (elapsedSec >= b.loadingEnd) return 'quote';
  return 'loading';
}
