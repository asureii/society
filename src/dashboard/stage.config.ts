/**
 * DASHBOARD STAGE GEOMETRY, SAFE RECTS & ORB CONSTRAINTS
 * (src/dashboard/stage.config.ts)
 *
 * Defines normalized [0..1] viewport regions (origin top-left: x right, y down)
 * guaranteeing that the right/bottom widget rails never overlap:
 * - `stageFocalRect` (Eva-01 close-up head, horn, jaw, shoulders)
 * - `eyeScreenPos` (Eva-01 brow eye anchor)
 * - `orbRegion` (Red dot travel & Lissajous drift bounds)
 * - The sight line connecting `eyeScreenPos` to any point in `orbRegion`
 */

export interface NormalizedRect {
  /** Normalized X range [min, max] in [0..1] viewport coordinates */
  x: [number, number];
  /** Normalized Y range [min, max] in [0..1] viewport coordinates */
  y: [number, number];
}

export interface DashboardStageConfig {
  /** Protected focal rectangle occupied by Eva-01 on the left ~50% of the stage */
  stageFocalRect: NormalizedRect;
  /** Mobile stage focal rectangle (top ~45vh, left half) */
  mobileStageFocalRect: NormalizedRect;
  /** Region where the red dot drifts on its idle Lissajous path */
  orbRegion: NormalizedRect;
  /** Mobile orb travel region (top ~45vh, right of Eva face) */
  mobileOrbRegion: NormalizedRect;
  /** Safe rectangles where docked UI widget panels are permitted on desktop */
  uiSafeRects: {
    rightRail: NormalizedRect;
    bottomDock: NormalizedRect;
  };
  /** Base screen-space anchor of Eva-01's visible brow eye (normalized [x, y]) */
  eyeScreenPos: [number, number];
  /** Mobile screen-space anchor of Eva-01's visible brow eye */
  mobileEyeScreenPos: [number, number];
  /** Center of Eva-01's face for min-distance orb repulsion */
  faceCenterPos: [number, number];
  mobileFaceCenterPos: [number, number];
  /** Red dot (orb) configuration and pointer physics */
  orb: {
    /** Default idle start position [x, y] inside orbRegion */
    defaultPos: [number, number];
    mobileDefaultPos: [number, number];
    /** Normalized radius relative to viewport width */
    radius: number;
    mobileRadius: number;
    /** Minimum normalized distance from faceCenterPos that the orb may approach */
    minFaceDistance: number;
    mobileMinFaceDistance: number;
    /** Pointer follow lag factor (0..1, higher = faster) */
    pointerFollowSmoothing: number;
    /** Pointer-down snap multiplier */
    pointerDownMultiplier: number;
    /** Arrow key nudge step in normalized viewport units */
    keyboardNudgeStep: number;
    /** Lissajous idle drift parameters */
    lissajous: {
      freqX: number;
      freqY: number;
      phaseDelta: number;
      ampX: number;
      ampY: number;
    };
  };
  /** Eva-01 silhouette options */
  eva: {
    /** Optional tiny red glint on the eye (<= 6px) that reflects the orb (default true) */
    eyeGlint: boolean;
  };
  /** Palette & ink budget thresholds enforced by automated verification */
  paletteBudget: {
    minWhiteShare: number;
    maxBlackShare: number;
    maxRedShare: number;
  };
}

export const STAGE_DASHBOARD_CONFIG: DashboardStageConfig = {
  stageFocalRect: {
    x: [0.02, 0.50],
    y: [0.10, 0.96],
  },
  mobileStageFocalRect: {
    x: [0.02, 0.56],
    y: [0.08, 0.44],
  },
  orbRegion: {
    x: [0.53, 0.67],
    y: [0.20, 0.58],
  },
  mobileOrbRegion: {
    x: [0.60, 0.88],
    y: [0.16, 0.38],
  },
  uiSafeRects: {
    rightRail: {
      x: [0.70, 0.97],
      y: [0.11, 0.95],
    },
    bottomDock: {
      x: [0.52, 0.69],
      y: [0.66, 0.95],
    },
  },
  eyeScreenPos: [0.33, 0.40],
  mobileEyeScreenPos: [0.32, 0.25],
  faceCenterPos: [0.27, 0.48],
  mobileFaceCenterPos: [0.27, 0.28],
  orb: {
    defaultPos: [0.60, 0.39],
    mobileDefaultPos: [0.74, 0.27],
    radius: 0.028,
    mobileRadius: 0.048,
    minFaceDistance: 0.24,
    mobileMinFaceDistance: 0.28,
    pointerFollowSmoothing: 0.09,
    pointerDownMultiplier: 3.2,
    keyboardNudgeStep: 0.025,
    lissajous: {
      freqX: 0.42,
      freqY: 0.63,
      phaseDelta: 1.570796,
      ampX: 0.055,
      ampY: 0.14,
    },
  },
  eva: {
    eyeGlint: true,
  },
  paletteBudget: {
    minWhiteShare: 0.55,
    maxBlackShare: 0.40,
    maxRedShare: 0.05,
  },
};

export const stageFocalRect = STAGE_DASHBOARD_CONFIG.stageFocalRect;
export const orbRegion = STAGE_DASHBOARD_CONFIG.orbRegion;
export const uiSafeRects = STAGE_DASHBOARD_CONFIG.uiSafeRects;
