/**
 * EVA-01 BUST 2D ANATOMICAL SKELETON
 * (src/dashboard/eva/skeleton.ts)
 *
 * Re-authored to match official Eva-01 bust reference artwork:
 * - Forward-up 50° straight horn to top-right
 * - Sleek predatory helmet crown with multi-tiered swept-back rear occipital cowl fins
 * - Horizontal eye slit visor, cylindrical cheek intake pod, hexagonal cheek plates
 * - Dropping jagged mandible with sharp angled chin guard and vertical ink drips
 * - Thick forward-leaning muscular neck with segmented faceted throat armor
 * - Upper chest / collar rim bleeding off bottom and left edges
 */

import type { Point2D } from '../../scene/art/inkBrush.ts';
import {
  EVA_PROPORTIONS,
  getHeadUnitPx,
  type EvaProportionsConfig,
} from './proportions.ts';

export type PointH = [number, number];

export interface EvaSkeletonH {
  headUnitPx: number;
  canvasSizeH: number;
  visibleFigureHeightH: number;

  headBoxH: {
    xMinH: number;
    xMaxH: number;
    yMinH: number;
    yMaxH: number;
    widthH: number;
    heightH: number;
  };

  joints: {
    headTop: PointH;
    headCenter: PointH;
    browRidge: PointH;
    snoutTip: PointH;
    chinTip: PointH;
    eyeCenter: PointH;
    cheekPod: PointH;
    sideVent: PointH;
    crestTopTip: PointH;
    crestMidTip: PointH;
    crestBotTip: PointH;
    crestNotch1: PointH;
    crestNotch2: PointH;
    jawHinge: PointH;
    jawTip: PointH;
    jawThroatJunction: PointH;
    hornBase: PointH;
    hornTip: PointH;
    neckTop: PointH;
    neckBase: PointH;
    throatTop: PointH;
    throatBot: PointH;
    napeTop: PointH;
    napeBot: PointH;
    collarCenter: PointH;
    chestCropCenter: PointH;
  };

  metrics: {
    headToVisibleHeightRatio: number;
    hornLengthH: number;
    hornAngleAboveHorizontalDeg: number;
    neckLeanDeg: number;
    neckWidthH: number;
    collarWidthH: number;
  };
}

export function buildEvaSkeleton(
  p: EvaProportionsConfig = EVA_PROPORTIONS
): EvaSkeletonH {
  const headUnitPx = getHeadUnitPx(p.canvasSizePx, p);
  const canvasSizeH = p.canvasSizePx / headUnitPx;
  const visibleFigureHeightH = p.visibleHeads;

  // Head center and key landmarks in H units (H = 336px on 1024 canvas)
  const headTopY = p.topMarginHeads + 0.30;
  const headCenterX = 1.35;
  const headCenterY = headTopY + 0.44;

  const headBoxH = {
    xMinH: headCenterX - 0.86, // rear crest tips
    xMaxH: headCenterX + 0.66, // chin tip
    yMinH: headTopY,
    yMaxH: headTopY + p.head.heightH,
    widthH: p.head.widthH,
    heightH: p.head.heightH,
  };

  const headTop: PointH = [headCenterX - 0.10, headTopY - 0.02];
  const headCenter: PointH = [headCenterX, headCenterY];

  // Horn: thick armored base directly above the eye, sweeping up-forward at 56°
  const hornBase: PointH = [headCenterX + 0.20, headTopY + 0.18];
  const hornRad = (p.horn.angleAboveHorizontalDeg * Math.PI) / 180;
  const hornTip: PointH = [
    hornBase[0] + Math.cos(hornRad) * p.horn.lengthH,
    hornBase[1] - Math.sin(hornRad) * p.horn.lengthH,
  ];

  // Brow overhang and slanted visor slit eye
  const browRidge: PointH = [headCenterX + 0.26, headTopY + 0.26];
  const eyeCenter: PointH = [headCenterX + 0.15, headTopY + 0.31];

  // Long continuous sloped face from brow to blunt beak-like chin tip
  const snoutTip: PointH = [headCenterX + 0.44, headTopY + 0.44];
  const chinTip: PointH = [headCenterX + 0.64, headTopY + 0.66];

  // Stack of 3 swept-back diagonal helmet crest plates
  const crestTopTip: PointH = [headCenterX - 0.76, headTopY + 0.06];
  const crestNotch1: PointH = [headCenterX - 0.46, headTopY + 0.16];
  const crestMidTip: PointH = [headCenterX - 0.84, headTopY + 0.24];
  const crestNotch2: PointH = [headCenterX - 0.52, headTopY + 0.33];
  const crestBotTip: PointH = [headCenterX - 0.78, headTopY + 0.42];

  // Side vent and cheek landmarks
  const sideVent: PointH = [headCenterX - 0.02, headTopY + 0.40];
  const cheekPod: PointH = [headCenterX - 0.02, headTopY + 0.40];
  const jawHinge: PointH = [headCenterX - 0.05, headTopY + 0.46];

  // Closed jaw: lower mandible meets upper snout, underside curves in smooth concave sweep
  const jawTip: PointH = [chinTip[0], chinTip[1]];
  const jawThroatJunction: PointH = [headCenterX + 0.08, headTopY + 0.60];

  // Muscular neck leaning forward (~26° from vertical)
  const neckTop: PointH = [headCenterX - 0.08, headTopY + 0.52];
  const neckRad = (p.neck.leanDeg * Math.PI) / 180;
  const sinNeck = Math.sin(neckRad);
  const cosNeck = Math.cos(neckRad);

  const neckBase: PointH = [
    neckTop[0] - sinNeck * p.neck.lengthH,
    neckTop[1] + cosNeck * p.neck.lengthH,
  ];

  // Bright curved chest plate & dark neck mesh
  const throatTop: PointH = [headCenterX + 0.14, headTopY + 0.64];
  const throatBot: PointH = [neckBase[0] + 0.44, neckBase[1] + 0.06];

  const napeTop: PointH = [headCenterX - 0.36, headTopY + 0.46];
  const napeBot: PointH = [neckBase[0] - 0.20, neckBase[1] - 0.02];

  // Upper chest / collar
  const collarCenter: PointH = [neckBase[0] + 0.08, neckBase[1] + 0.10];
  const chestCropCenter: PointH = [collarCenter[0] - 0.22, headTopY + visibleFigureHeightH];

  return {
    headUnitPx,
    canvasSizeH,
    visibleFigureHeightH,
    headBoxH,
    joints: {
      headTop,
      headCenter,
      browRidge,
      snoutTip,
      chinTip,
      eyeCenter,
      cheekPod,
      sideVent,
      crestTopTip,
      crestMidTip,
      crestBotTip,
      crestNotch1,
      crestNotch2,
      jawHinge,
      jawTip,
      jawThroatJunction,
      hornBase,
      hornTip,
      neckTop,
      neckBase,
      throatTop,
      throatBot,
      napeTop,
      napeBot,
      collarCenter,
      chestCropCenter,
    },
    metrics: {
      headToVisibleHeightRatio: p.head.heightH / visibleFigureHeightH,
      hornLengthH: p.horn.lengthH,
      hornAngleAboveHorizontalDeg: p.horn.angleAboveHorizontalDeg,
      neckLeanDeg: p.neck.leanDeg,
      neckWidthH: p.neck.widthH,
      collarWidthH: p.chest.collarWidthH,
    },
  };
}

export function hToPx(
  ptH: PointH,
  canvasWidthPx: number,
  skeleton: EvaSkeletonH = EVA_SKELETON
): Point2D {
  const scale = canvasWidthPx / skeleton.canvasSizeH;
  return [ptH[0] * scale, ptH[1] * scale];
}

export function polyHToPx(
  ptsH: PointH[],
  canvasWidthPx: number,
  skeleton: EvaSkeletonH = EVA_SKELETON
): Point2D[] {
  return ptsH.map((pt) => hToPx(pt, canvasWidthPx, skeleton));
}

export function hToPlaneWorld(
  ptH: PointH,
  planeWorldSize = 5.0,
  skeleton: EvaSkeletonH = EVA_SKELETON
): [number, number] {
  const u = ptH[0] / skeleton.canvasSizeH;
  const v = ptH[1] / skeleton.canvasSizeH;
  return [(u - 0.5) * planeWorldSize, (0.5 - v) * planeWorldSize];
}

export const EVA_SKELETON: EvaSkeletonH = buildEvaSkeleton(EVA_PROPORTIONS);
