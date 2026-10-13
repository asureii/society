/**
 * EVA-01 GAZE TRACKING, SPRING DYNAMICS & RIG CONFIGURATION
 * (src/dashboard/eva.config.ts)
 */

export interface SpringSpec {
  /** Spring stiffness (higher = snappier response) */
  stiffness: number;
  /** Spring damping (< critical damping gives slight predatory overshoot) */
  damping: number;
}

export interface EvaRigConfig {
  /** Spring parameters for pupil, head, and jaw */
  springs: {
    pupil: SpringSpec;
    head: SpringSpec;
    jaw: SpringSpec;
  };
  /** Pupil slide limit as a fraction of the eye radius (~35%) */
  pupilMaxSlideFraction: number;
  /** Eye world-space radius on the head plane */
  eyeWorldRadius: number;
  /** Head translation limit as a fraction of head width (~2.5%) */
  headMaxTranslateFraction: number;
  /** Head width in world units */
  headWorldWidth: number;
  /** Head rotation limit in degrees (±6°) */
  headMaxRotationDeg: number;
  /** Head scale modulation with orb proximity (±1.5%) */
  headMaxScaleDelta: number;
  /** Minimum jaw opening angle in degrees (~6°) */
  jawMinDeg: number;
  /** Maximum jaw opening angle in degrees (~25°) */
  jawMaxDeg: number;
  /** Normalized distance range [near, far] mapping orb proximity to jaw opening */
  jawProximityRange: [number, number];
  /** Predatory micro-twitch quantized rate (~12fps) */
  jitterFps: number;
  /** Predatory head micro-twitch amplitude in degrees (±0.4°) */
  headMicroTwitchDeg: number;
  /** Open-jaw tremor threshold (fraction of jawMax) and amplitude in pixels (1-2px at 12fps) */
  openJawShakeThreshold: number;
  openJawShakePx: number;
  /** Breathing sway amplitude (<= 1% scale sway) and frequency in rad/s */
  breathingScaleAmp: number;
  breathingFreqRad: number;
}

export const EVA_CONFIG: EvaRigConfig = {
  springs: {
    pupil: {
      stiffness: 210,
      damping: 17,
    },
    head: {
      stiffness: 115,
      damping: 12.5,
    },
    jaw: {
      stiffness: 135,
      damping: 13.5,
    },
  },
  pupilMaxSlideFraction: 0.35,
  eyeWorldRadius: 0.19,
  headMaxTranslateFraction: 0.025,
  headWorldWidth: 4.2,
  headMaxRotationDeg: 6.0,
  headMaxScaleDelta: 0.015,
  jawMinDeg: 6.0,
  jawMaxDeg: 25.0,
  jawProximityRange: [0.22, 0.56],
  jitterFps: 12,
  headMicroTwitchDeg: 0.4,
  openJawShakeThreshold: 0.58,
  openJawShakePx: 1.6,
  breathingScaleAmp: 0.008,
  breathingFreqRad: 1.45,
};
