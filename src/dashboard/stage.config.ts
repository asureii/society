/**
 * DASHBOARD STAGE GEOMETRY, SAFE RECTS & ORB CONSTRAINTS
 * (src/dashboard/stage.config.ts)
 */

export interface NormalizedRect {
  x: [number, number];
  y: [number, number];
}

export interface DashboardStageConfig {
  stageFocalRect: NormalizedRect;
  mobileStageFocalRect: NormalizedRect;
  orbRegion: NormalizedRect;
  mobileOrbRegion: NormalizedRect;
  uiSafeRects: {
    rightRail: NormalizedRect;
    bottomDock: NormalizedRect;
  };
  eyeScreenPos: [number, number];
  mobileEyeScreenPos: [number, number];
  faceCenterPos: [number, number];
  mobileFaceCenterPos: [number, number];
  orb: {
    defaultPos: [number, number];
    mobileDefaultPos: [number, number];
    radius: number;
    mobileRadius: number;
    minFaceDistance: number;
    mobileMinFaceDistance: number;
    pointerFollowSmoothing: number;
    pointerDownMultiplier: number;
    keyboardNudgeStep: number;
    lissajous: {
      freqX: number;
      freqY: number;
      phaseDelta: number;
      ampX: number;
      ampY: number;
    };
  };
  eva: {
    eyeGlint: boolean;
  };
  paletteBudget: {
    minWhiteShare: number;
    maxBlackShare: number;
    maxRedShare: number;
  };
}

export const STAGE_DASHBOARD_CONFIG: DashboardStageConfig = {
  stageFocalRect: {
    x: [0.0, 0.48],
    y: [0.08, 1.0],
  },
  mobileStageFocalRect: {
    x: [0.0, 0.56],
    y: [0.14, 0.48],
  },
  orbRegion: {
    x: [0.53, 0.67],
    y: [0.20, 0.58],
  },
  mobileOrbRegion: {
    x: [0.64, 0.88],
    y: [0.18, 0.38],
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
  eyeScreenPos: [0.32, 0.42],
  mobileEyeScreenPos: [0.41, 0.28],
  faceCenterPos: [0.28, 0.46],
  mobileFaceCenterPos: [0.36, 0.31],
  orb: {
    defaultPos: [0.60, 0.39],
    mobileDefaultPos: [0.78, 0.28],
    radius: 0.028,
    mobileRadius: 0.044,
    minFaceDistance: 0.22,
    mobileMinFaceDistance: 0.24,
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
