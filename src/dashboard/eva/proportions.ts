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
    widthH: 1.25, // includes swept rear occipital fins
    eyeWidthH: 0.22, // sleek angled visor slit matching reference
    eyeHeightH: 0.06,
  },

  horn: {
    lengthH: 1.32,
    angleAboveHorizontalDeg: 56, // 56° forward and up matching reference
    baseWidthH: 0.20, // thick armored base where it meets brow plate
  },

  neck: {
    lengthH: 1.06,
    widthH: 0.72,
    leanDeg: 26, // ~26° forward lean matching reference bust posture
  },

  chest: {
    collarWidthH: 1.35,
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
