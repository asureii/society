/**
 * EVA-01 GAZE TRACKING, SPRING DYNAMICS & BUST RIG CONFIGURATION
 * (src/dashboard/eva.config.ts)
 */

import { EVA_PROPORTIONS } from './eva/proportions.ts';
import { EVA_SKELETON } from './eva/skeleton.ts';

export interface SpringSpec {
  stiffness: number;
  damping: number;
}

export interface EvaRigConfig {
  planeWorldSize: number;
  headUnitWorld: number;
  springs: {
    pupil: SpringSpec;
    head: SpringSpec;
    jaw: SpringSpec;
    neck: SpringSpec;
    torso: SpringSpec;
  };
  pupilMaxSlideFraction: number;
  eyeWorldRadius: number;
  eyePlaneWorldSize: number;
  pupilPlaneWorldSize: number;
  headMaxTranslateFraction: number;
  headWorldWidth: number;
  headMaxRotationDeg: number;
  headMaxScaleDelta: number;
  jawMinDeg: number;
  jawMaxDeg: number;
  jawProximityRange: [number, number];
  jitterFps: number;
  headMicroTwitchDeg: number;
  openJawShakeThreshold: number;
  openJawShakePx: number;
  breathingScaleAmp: number;
  breathingFreqRad: number;
}

const PLANE_WORLD_SIZE = 5.0;
const HEAD_UNIT_WORLD = PLANE_WORLD_SIZE / EVA_SKELETON.canvasSizeH;

export const EVA_CONFIG: EvaRigConfig = {
  planeWorldSize: PLANE_WORLD_SIZE,
  headUnitWorld: HEAD_UNIT_WORLD,
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
    neck: {
      stiffness: 90,
      damping: 12.0,
    },
    torso: {
      stiffness: 70,
      damping: 11.0,
    },
  },
  pupilMaxSlideFraction: 0.35,
  eyeWorldRadius: EVA_PROPORTIONS.head.eyeWidthH * HEAD_UNIT_WORLD * 0.70,
  eyePlaneWorldSize: EVA_PROPORTIONS.head.eyeWidthH * HEAD_UNIT_WORLD * 2.10,
  pupilPlaneWorldSize: EVA_PROPORTIONS.head.eyeWidthH * HEAD_UNIT_WORLD * 1.85,
  headMaxTranslateFraction: 0.025,
  headWorldWidth: EVA_PROPORTIONS.head.widthH * HEAD_UNIT_WORLD,
  headMaxRotationDeg: 6.0,
  headMaxScaleDelta: 0.015,
  jawMinDeg: 0.0,
  jawMaxDeg: 3.5,
  jawProximityRange: [0.22, 0.56],
  jitterFps: 12,
  headMicroTwitchDeg: 0.4,
  openJawShakeThreshold: 0.58,
  openJawShakePx: 1.6,
  breathingScaleAmp: 0.008,
  breathingFreqRad: 1.45,
};
