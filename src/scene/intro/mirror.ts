/**
 * PROCEDURAL HAND-INKED STANDING MIRROR (src/scene/intro/mirror.ts)
 *
 * Draws a tall rectangular standing mirror in the right third of the frame,
 * angled ~25 degrees toward the brain in 3/4 view:
 * - Thick, chipped black ink frame (`#0A0A0A`) with dry-brush edges and nicks.
 * - Architectural base/pedestal resting on the perspective grid with hatched shadow.
 * - Paper-white glass interior with faint reflected perspective grid rulings
 *   and diagonal glare bands (sparse hatching with thin white slivers).
 */

import { THEME_COLORS } from '../../config/theme';
import { hatchRegion } from '../art/hatch';
import {
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Point2D,
} from '../art/inkBrush';
import { createRng, type PRNG } from '../art/rng';
import type { DrawOrderRecorder } from './drawOrder';

export interface MirrorDrawMetrics {
  /** Four corners [TL, TR, BR, BL] of the inner mirror glass in canvas pixel coordinates */
  glassPoly: [Point2D, Point2D, Point2D, Point2D];
  /** Center of the mirror glass in canvas pixel coordinates */
  glassCenterPx: { x: number; y: number };
  /** Exact pixel coordinate of the machine's central red orb core inside the mirror */
  machineCorePx: { x: number; y: number };
  /** Normalized WebGL UV coordinate [x, y] of the machine's red orb core */
  machineCoreUv: [number, number];
  /** Horizontal & vertical half-extents of the mirror glass interior */
  glassHalfSizePx: { rx: number; ry: number };
}

function drawFilledOutlinedPoly(
  ctx: CanvasRenderingContext2D,
  poly: Point2D[],
  fillColor: string,
  strokeColor: string,
  baseWidth: number,
  rng: PRNG,
  dryBrush = false,
): void {
  fillRoughenedPolygon(ctx, poly, rng, fillColor);
  outlinePolygonWithInk(ctx, poly, rng, { baseWidth, color: strokeColor, dryBrush });
}

export function drawStandingMirror(
  ctx: CanvasRenderingContext2D,
  artCanvas: HTMLCanvasElement,
  recorder: DrawOrderRecorder,
  seed = 20261012,
  isMobile = false,
): MirrorDrawMetrics {
  const W = artCanvas.width;
  const H = artCanvas.height;
  const rng = createRng(seed ^ 0x39c4);

  const cx = W * (isMobile ? 0.69 : 0.68);
  const cy = H * (isMobile ? 0.54 : 0.48);
  const halfW = W * (isMobile ? 0.165 : 0.155);
  const halfH = H * (isMobile ? 0.255 : 0.275);

  const centerUv: readonly [number, number] = [cx / W, 1 - cy / H];

  const tiltTopLeftY = cy - halfH * 0.90;
  const tiltTopRightY = cy - halfH * 1.03;
  const tiltBotRightY = cy + halfH * 1.04;
  const tiltBotLeftY = cy + halfH * 0.91;

  const leftX = cx - halfW * 0.95;
  const rightX = cx + halfW * 0.95;

  const frameOuter: [Point2D, Point2D, Point2D, Point2D] = [
    [leftX, tiltTopLeftY],
    [rightX, tiltTopRightY],
    [rightX, tiltBotRightY],
    [leftX, tiltBotLeftY],
  ];

  const frameThicknessX = W * 0.019;
  const frameThicknessY = H * 0.028;
  const glassPoly: [Point2D, Point2D, Point2D, Point2D] = [
    [leftX + frameThicknessX * 0.92, tiltTopLeftY + frameThicknessY * 0.95],
    [rightX - frameThicknessX * 1.05, tiltTopRightY + frameThicknessY * 1.02],
    [rightX - frameThicknessX * 1.05, tiltBotRightY - frameThicknessY * 1.02],
    [leftX + frameThicknessX * 0.92, tiltBotLeftY - frameThicknessY * 0.95],
  ];

  // ---------------------------------------------------------------------------
  // STAGE 1 (t in [0.28, 0.36]): Mirror Pedestal Base & Cast Shadow on Grid
  // ---------------------------------------------------------------------------
  const baseTopLeftY = tiltBotLeftY - 4;
  const baseTopRightY = tiltBotRightY - 4;
  const baseDepth = H * 0.048;

  const shadowPoly: Point2D[] = [
    [leftX - W * 0.055, baseTopLeftY + baseDepth * 0.85],
    [rightX + W * 0.025, baseTopRightY + baseDepth * 0.95],
    [rightX - W * 0.015, baseTopRightY + baseDepth * 1.55],
    [leftX - W * 0.085, baseTopLeftY + baseDepth * 1.30],
  ];
  hatchRegion(ctx, shadowPoly, rng, {
    angleRad: (18 * Math.PI) / 180,
    baseSpacing: 5.0,
    baseWidth: 1.5,
    toneAt: () => 0.74,
  });

  const pedestalFront: Point2D[] = [
    [leftX - W * 0.022, baseTopLeftY],
    [rightX + W * 0.026, baseTopRightY],
    [rightX + W * 0.034, baseTopRightY + baseDepth],
    [leftX - W * 0.032, baseTopLeftY + baseDepth * 0.92],
  ];
  drawFilledOutlinedPoly(ctx, pedestalFront, THEME_COLORS.ink, THEME_COLORS.ink, 2.8, rng, true);

  drawInkStroke(
    ctx,
    [
      [leftX - W * 0.018, baseTopLeftY + 5],
      [rightX + W * 0.020, baseTopRightY + 5],
    ],
    rng,
    { baseWidth: 2.2, color: THEME_COLORS.paper, doubleChance: 0 },
  );

  const leftBracket: Point2D[] = [
    [leftX - W * 0.014, baseTopLeftY],
    [leftX + 4, baseTopLeftY - H * 0.045],
    [leftX + 4, baseTopLeftY + 4],
  ];
  const rightBracket: Point2D[] = [
    [rightX, baseTopRightY - H * 0.055],
    [rightX + W * 0.022, baseTopRightY + 4],
    [rightX, baseTopRightY + 6],
  ];
  drawFilledOutlinedPoly(ctx, leftBracket, THEME_COLORS.ink, THEME_COLORS.ink, 2.2, rng);
  drawFilledOutlinedPoly(ctx, rightBracket, THEME_COLORS.ink, THEME_COLORS.ink, 2.2, rng);

  recorder.captureStage(artCanvas, 0.28, 0.36, 'bottom-up', centerUv);

  // ---------------------------------------------------------------------------
  // STAGE 2 (t in [0.36, 0.45]): Thick Chipped Black Ink Frame & 3D Side Cheek
  // ---------------------------------------------------------------------------
  const sideDepthX = W * 0.016;
  const rightCheekPoly: Point2D[] = [
    frameOuter[1],
    [frameOuter[1][0] + sideDepthX, frameOuter[1][1] + H * 0.012],
    [frameOuter[2][0] + sideDepthX, frameOuter[2][1] - H * 0.008],
    frameOuter[2],
  ];
  drawFilledOutlinedPoly(ctx, rightCheekPoly, THEME_COLORS.paper, THEME_COLORS.ink, 2.6, rng);
  hatchRegion(ctx, rightCheekPoly, rng, {
    angleRad: (35 * Math.PI) / 180,
    baseSpacing: 4.5,
    baseWidth: 1.5,
    toneAt: () => 0.72,
  });

  drawFilledOutlinedPoly(ctx, frameOuter, THEME_COLORS.ink, THEME_COLORS.ink, 6.5, rng, true);

  // Carve chipped nicks (sharp paper-white notches) into the outer black frame edges
  const nickCount = 9;
  for (let n = 0; n < nickCount; n++) {
    const edgeIdx = n % 4;
    const pA = frameOuter[edgeIdx];
    const pB = frameOuter[(edgeIdx + 1) % 4];
    const u = rng.range(0.16, 0.84);
    const nx = pA[0] + (pB[0] - pA[0]) * u;
    const ny = pA[1] + (pB[1] - pA[1]) * u;
    const dx = pB[0] - pA[0];
    const dy = pB[1] - pA[1];
    const len = Math.hypot(dx, dy) || 1;
    const inX = -dy / len;
    const inY = dx / len;
    const tx = dx / len;
    const ty = dy / len;

    const nickW = rng.range(4, 9);
    const nickD = rng.range(4.5, 9.5);
    ctx.fillStyle = THEME_COLORS.paper;
    ctx.beginPath();
    ctx.moveTo(nx - tx * nickW, ny - ty * nickW);
    ctx.lineTo(nx + inX * nickD, ny + inY * nickD);
    ctx.lineTo(nx + tx * nickW, ny + ty * nickW);
    ctx.closePath();
    ctx.fill();
  }

  const bevelInset = 4.5;
  const bevelPoly: Point2D[] = [
    [glassPoly[0][0] - bevelInset, glassPoly[0][1] - bevelInset],
    [glassPoly[1][0] + bevelInset, glassPoly[1][1] - bevelInset],
    [glassPoly[2][0] + bevelInset, glassPoly[2][1] + bevelInset],
    [glassPoly[3][0] - bevelInset, glassPoly[3][1] + bevelInset],
  ];
  drawInkStroke(ctx, [...bevelPoly, bevelPoly[0]], rng, {
    baseWidth: 1.4,
    color: THEME_COLORS.paperPure,
    doubleChance: 0,
  });

  recorder.captureStage(artCanvas, 0.36, 0.45, 'top-down', centerUv);

  // ---------------------------------------------------------------------------
  // STAGE 3 (t in [0.45, 0.52]): Mirror Glass Interior, Reflected Grid & Glare Bands
  // ---------------------------------------------------------------------------
  drawFilledOutlinedPoly(ctx, glassPoly, THEME_COLORS.paperPure, THEME_COLORS.ink, 2.8, rng);

  ctx.save();
  ctx.beginPath();
  glassPoly.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.closePath();
  ctx.clip();

  const reflHorizonY = cy + halfH * 0.06;
  const reflVpX = cx - halfW * 0.55;
  for (let r = 1; r <= 7; r++) {
    const t = Math.pow(r / 7, 1.45);
    const ryLine = reflHorizonY + t * (halfH * 0.92);
    drawInkStroke(
      ctx,
      [
        [leftX, ryLine - 8],
        [rightX, ryLine + 10],
      ],
      rng,
      { baseWidth: 1.1 + t * 0.7, color: THEME_COLORS.ink, doubleChance: 0 },
    );
  }
  for (let ray = -3; ray <= 5; ray++) {
    const targetX = cx + ray * (halfW * 0.32);
    const targetY = tiltBotRightY;
    const startT = 0.22;
    const sx = reflVpX + (targetX - reflVpX) * startT;
    const sy = reflHorizonY + (targetY - reflHorizonY) * startT;
    drawInkStroke(
      ctx,
      [
        [sx, sy],
        [targetX, targetY],
      ],
      rng,
      { baseWidth: 1.15, color: THEME_COLORS.ink, doubleChance: 0 },
    );
  }

  const glareBand1: Point2D[] = [
    [leftX, tiltTopLeftY + halfH * 0.28],
    [leftX + halfW * 0.95, tiltTopRightY],
    [leftX + halfW * 1.28, tiltTopRightY],
    [leftX, tiltTopLeftY + halfH * 0.62],
  ];
  const glareBand2: Point2D[] = [
    [leftX + halfW * 0.45, tiltBotLeftY],
    [rightX, tiltTopRightY + halfH * 0.85],
    [rightX, tiltTopRightY + halfH * 1.15],
    [leftX + halfW * 0.78, tiltBotLeftY],
  ];

  hatchRegion(ctx, glareBand1, rng, {
    angleRad: (-48 * Math.PI) / 180,
    baseSpacing: 9.5,
    baseWidth: 1.1,
    toneAt: () => 0.42,
  });
  hatchRegion(ctx, glareBand2, rng, {
    angleRad: (-48 * Math.PI) / 180,
    baseSpacing: 11.0,
    baseWidth: 1.0,
    toneAt: () => 0.42,
  });

  drawInkStroke(
    ctx,
    [
      [leftX + 8, tiltTopLeftY + halfH * 0.44],
      [leftX + halfW * 1.12, tiltTopRightY + 8],
    ],
    rng,
    { baseWidth: 1.5, color: THEME_COLORS.ink, doubleChance: 0 },
  );
  drawInkStroke(
    ctx,
    [
      [leftX + halfW * 0.58, tiltBotLeftY - 10],
      [rightX - 10, tiltTopRightY + halfH * 0.98],
    ],
    rng,
    { baseWidth: 1.4, color: THEME_COLORS.ink, doubleChance: 0 },
  );

  ctx.restore();

  recorder.captureStage(artCanvas, 0.45, 0.52, 'top-down', centerUv);

  const glassCenterPx = {
    x: cx - frameThicknessX * 0.08,
    y: cy,
  };
  const machineCorePx = {
    x: glassCenterPx.x - halfW * 0.04,
    y: glassCenterPx.y - halfH * 0.03,
  };

  return {
    glassPoly,
    glassCenterPx,
    machineCorePx,
    machineCoreUv: [machineCorePx.x / W, 1 - machineCorePx.y / H],
    glassHalfSizePx: {
      rx: halfW * 0.72,
      ry: halfH * 0.62,
    },
  };
}
