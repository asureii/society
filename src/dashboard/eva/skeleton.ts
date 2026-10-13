/**
 * EVA-01 BUST 2D ANATOMICAL SKELETON
 * (src/dashboard/eva/skeleton.ts)
 *
 * Exact 1-to-1 landmark coordinates matching the official Evangelion Unit-01
 * bust reference poster:
 * - Neck is wide and positioned at the BACK of the head (u = 0.00..0.55)
 * - Snout and jaw project forward-downward to the right (u = 0.42..0.775, v = 0.47..0.73)
 * - Long straight tapered horn with beveled tip rooted on the forehead above the eye
 * - Stack of 3 swept-back helmet crest plates + twin circular mechanical ports
 */

import type { Point2D } from '../../scene/art/inkBrush.ts';
import {
  EVA_PROPORTIONS,
  getHeadUnitPx,
  type EvaProportionsConfig,
} from './proportions.ts';

export type PointH = [number, number];
export type PointUV = [number, number];

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

export function uvToH(uv: PointUV, canvasSizeH: number): PointH {
  return [uv[0] * canvasSizeH, uv[1] * canvasSizeH];
}

export function uvToPx(uv: PointUV, canvasWidthPx: number): Point2D {
  return [uv[0] * canvasWidthPx, uv[1] * canvasWidthPx];
}

export function polyUvToPx(ptsUv: PointUV[], canvasWidthPx: number): Point2D[] {
  return ptsUv.map(([u, v]) => [u * canvasWidthPx, v * canvasWidthPx]);
}

export function buildEvaSkeleton(
  p: EvaProportionsConfig = EVA_PROPORTIONS
): EvaSkeletonH {
  const headUnitPx = getHeadUnitPx(p.canvasSizePx, p);
  const canvasSizeH = p.canvasSizePx / headUnitPx;
  const visibleFigureHeightH = p.visibleHeads;

  const H = (u: number, v: number): PointH => [u * canvasSizeH, v * canvasSizeH];

  // Exact 1-to-1 reference landmarks in normalized (u, v) mapped to H-units
  const headTop = H(0.35, 0.285);
  const headCenter = H(0.48, 0.44);

  // Horn rooted on forehead directly above eye, sweeping up-right to beveled tip
  const hornBase = H(0.655, 0.382);
  const hornTip = H(0.892, 0.062);

  // Overhanging brow visor and slanted eye slit
  const browRidge = H(0.712, 0.468);
  const eyeCenter = H(0.556, 0.398);

  // Steep downward-sloping snout and angular chin wedge
  const snoutTip = H(0.696, 0.562);
  const chinTip = H(0.775, 0.718);

  // 3 swept-back helmet crest plates
  const crestTopTip = H(0.095, 0.338);
  const crestNotch1 = H(0.258, 0.345);
  const crestMidTip = H(0.006, 0.375);
  const crestNotch2 = H(0.175, 0.408);
  const crestBotTip = H(0.005, 0.442);

  // Side capsule vent and cheek
  const sideVent = H(0.445, 0.446);
  const cheekPod = H(0.545, 0.485);

  // Actual jaw: drops steeply from behind cheek down to gonial corner and chin tip
  const jawHinge = H(0.425, 0.472);
  const jawTip = H(0.742, 0.730);
  const jawThroatJunction = H(0.552, 0.618);

  // Wide neck at the BACK of the head (u = 0.00..0.552)
  const neckTop = H(0.28, 0.48);
  const neckBase = H(0.22, 0.78);
  const throatTop = H(0.455, 0.524);
  const throatBot = H(0.512, 0.628);
  const napeTop = H(0.02, 0.445);
  const napeBot = H(0.02, 0.690);

  const collarCenter = H(0.26, 0.86);
  const chestCropCenter = H(0.28, 0.96);

  const headBoxH = {
    xMinH: crestMidTip[0],
    xMaxH: chinTip[0],
    yMinH: headTop[1],
    yMaxH: jawTip[1],
    widthH: chinTip[0] - crestMidTip[0],
    heightH: jawTip[1] - headTop[1],
  };

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
      headToVisibleHeightRatio: 0.46,
      hornLengthH: 1.32,
      hornAngleAboveHorizontalDeg: 55,
      neckLeanDeg: 28,
      neckWidthH: 0.78,
      collarWidthH: 1.42,
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
