/**
 * EVA-01 BUST ANATOMICAL PROPORTIONS IN HEAD UNITS (H)
 * (src/dashboard/eva/proportions.ts)
 *
 * Defines proportions for the Eva-01 Berserk bust (head, forward-up horn,
 * muscular neck with faceted throat plates, and upper chest/collar).
 * Matches official Eva-01 bust reference artwork.
 */

export interface EvaProportionsConfig {
  canvasSizePx: number;
  /** Number of head heights visible from helmet crown to bottom chest crop (~2.4H) */
  visibleHeads: number;
  /** Top margin for the horn tip */
  topMarginHeads: number;

  head: {
    heightH: number;
    widthH: number;
    eyeWidthH: number;
    eyeHeightH: number;
  };

  horn: {
    lengthH: number;
    /** Angle above horizontal in degrees (~56° forward-up to top-right) */
    angleAboveHorizontalDeg: number;
    baseWidthH: number;
  };

  neck: {
    lengthH: number;
    widthH: number;
    /** Forward lean of the neck from vertical (~26°) */
    leanDeg: number;
  };

  chest: {
    collarWidthH: number;
    heightH: number;
  };
}

export const EVA_PROPORTIONS: EvaProportionsConfig = {
  canvasSizePx: 1024,
  visibleHeads: 2.35,
  topMarginHeads: 0.70,

  head: {
    heightH: 1.0,
    widthH: 1.05, // streamlined aerodynamic crest hugging skull
    eyeWidthH: 0.28, // prominent predatory eye slit slicing across brow
    eyeHeightH: 0.08,
  },

  horn: {
    lengthH: 1.32,
    angleAboveHorizontalDeg: 56, // 56° forward and up matching reference
    baseWidthH: 0.20, // thick armored base where it meets brow plate
  },

  neck: {
    lengthH: 1.15, // elongated mechanical neck
    widthH: 0.52, // slender neck vs heavy saurian bulk
    leanDeg: 34, // forward-curving posture
  },

  chest: {
    collarWidthH: 1.25,
    heightH: 0.70,
  },
};

export function getHeadUnitPx(
  canvasSizePx = EVA_PROPORTIONS.canvasSizePx,
  proportions: EvaProportionsConfig = EVA_PROPORTIONS
): number {
  return canvasSizePx / (proportions.topMarginHeads + proportions.visibleHeads);
}

export function getStageHeadUnitPx(
  stageHeightPx: number,
  proportions: EvaProportionsConfig = EVA_PROPORTIONS
): number {
  return stageHeightPx / proportions.visibleHeads;
}
