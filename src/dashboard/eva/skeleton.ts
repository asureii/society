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
    eyeCenter: PointH;
    cheekPod: PointH;
    occipitalFinTop: PointH;
    occipitalFinMid: PointH;
    occipitalFinBot: PointH;
    jawHinge: PointH;
    jawTip: PointH;
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

  // Head center and key landmarks in H units (H = 341px on 1024 canvas)
  const headTopY = p.topMarginHeads + 0.32; // crown top
  const headCenterX = 1.35;
  const headCenterY = headTopY + 0.46;

  const headBoxH = {
    xMinH: headCenterX - 0.75, // rear fin tips
    xMaxH: headCenterX + 0.55, // snout tip
    yMinH: headTopY,
    yMaxH: headTopY + p.head.heightH,
    widthH: p.head.widthH,
    heightH: p.head.heightH,
  };

  const headTop: PointH = [headCenterX - 0.05, headTopY];
  const headCenter: PointH = [headCenterX, headCenterY];

  // Horn: rooted at front forehead/brow, points FORWARD-UP at 55° to top-right
  const hornBase: PointH = [headCenterX + 0.24, headTopY + 0.14];
  const hornRad = (p.horn.angleAboveHorizontalDeg * Math.PI) / 180;
  const hornTip: PointH = [
    hornBase[0] + Math.cos(hornRad) * p.horn.lengthH,
    hornBase[1] - Math.sin(hornRad) * p.horn.lengthH,
  ];

  // Brow visor ridge and snout tip
  const browRidge: PointH = [headCenterX + 0.30, headTopY + 0.26];
  const eyeCenter: PointH = [headCenterX + 0.18, headTopY + 0.32];
  const snoutTip: PointH = [headCenterX + 0.48, headTopY + 0.46];

  // Cylindrical cheek intake pod & swept-back rear occipital cowl fins
  const cheekPod: PointH = [headCenterX - 0.08, headTopY + 0.46];
  const occipitalFinTop: PointH = [headCenterX - 0.65, headTopY + 0.14];
  const occipitalFinMid: PointH = [headCenterX - 0.72, headTopY + 0.28];
  const occipitalFinBot: PointH = [headCenterX - 0.68, headTopY + 0.42];

  // Jaw hinge and angled chin guard matching reference
  const jawHinge: PointH = [headCenterX - 0.06, headTopY + 0.50];
  const jawTip: PointH = [headCenterX + 0.46, headTopY + 0.74];

  // Muscular forward-leaning neck (~28° from vertical)
  const neckTop: PointH = [headCenterX - 0.08, headTopY + 0.52];
  const neckRad = (p.neck.leanDeg * Math.PI) / 180;
  const sinNeck = Math.sin(neckRad);
  const cosNeck = Math.cos(neckRad);

  const neckBase: PointH = [
    neckTop[0] - sinNeck * p.neck.lengthH,
    neckTop[1] + cosNeck * p.neck.lengthH,
  ];

  // Faceted throat armor in front vs muscular nape at back
  const throatTop: PointH = [headCenterX + 0.18, headTopY + 0.60];
  const throatBot: PointH = [neckBase[0] + 0.36, neckBase[1] + 0.02];

  const napeTop: PointH = [headCenterX - 0.36, headTopY + 0.44];
  const napeBot: PointH = [neckBase[0] - 0.22, neckBase[1] - 0.04];

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
      eyeCenter,
      cheekPod,
      occipitalFinTop,
      occipitalFinMid,
      occipitalFinBot,
      jawHinge,
      jawTip,
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
