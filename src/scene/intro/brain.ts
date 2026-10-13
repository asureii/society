/**
 * PROCEDURAL HAND-INKED ANATOMICAL BRAIN (src/scene/intro/brain.ts)
 *
 * Draws an anatomical brain from a three-quarter top angle in the left third of the frame,
 * hovering above a low architectural slab with a hatched cast shadow on the perspective grid.
 *
 * - Gyri & sulci generated procedurally via curl-noise flow-field streamlines,
 *   densely seeded and clipped to the two-hemisphere silhouette (`drawInkStroke`).
 * - Includes central longitudinal fissure, striated cerebellum, and brainstem stub.
 * - Form-following cross-contour hatching on the lower-right and stippling at the terminator.
 * - Pure black ink (#0A0A0A) on warm paper (#FAFAF8). Zero red on the brain.
 */

import { THEME_COLORS } from '../../config/theme';
import { hatchRegion } from '../art/hatch';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Point2D,
} from '../art/inkBrush';
import { createRng, type PRNG } from '../art/rng';
import type { DrawOrderRecorder } from './drawOrder';

export interface BrainDrawMetrics {
  /** Center of the brain in canvas pixel coordinates */
  centerPx: { x: number; y: number };
  /** Rightmost frontal-lobe emission point for the projection arc */
  projectionOriginPx: { x: number; y: number };
  /** Normalized UV coordinates of synapse stipple points that blink in the shader */
  synapseUvPoints: [number, number][];
}

function drawFilledOutlinedPoly(
  ctx: CanvasRenderingContext2D,
  poly: Point2D[],
  fillColor: string,
  strokeColor: string,
  baseWidth: number,
  rng: PRNG,
): void {
  fillRoughenedPolygon(ctx, poly, rng, fillColor);
  outlinePolygonWithInk(ctx, poly, rng, { baseWidth, color: strokeColor });
}

function smoothNoise2D(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  const hash = (ix: number, iy: number): number => {
    let n = (ix * 374761393 + iy * 668265263 + seed * 1442695041) | 0;
    n = ((n ^ (n >> 13)) * 1274126177) | 0;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  };

  const n00 = hash(xi, yi);
  const n10 = hash(xi + 1, yi);
  const n01 = hash(xi, yi + 1);
  const n11 = hash(xi + 1, yi + 1);

  const nx0 = n00 + u * (n10 - n00);
  const nx1 = n01 + u * (n11 - n01);
  return nx0 + v * (nx1 - nx0);
}

function fbmPotential(x: number, y: number, seed: number): number {
  let val = 0;
  let amp = 0.55;
  let freq = 1.0;
  for (let i = 0; i < 3; i++) {
    val += amp * smoothNoise2D(x * freq, y * freq, seed + i * 97);
    freq *= 2.05;
    amp *= 0.5;
  }
  const fold = Math.sin(x * 3.4 + Math.cos(y * 3.1) * 1.6) * 0.22;
  return val + fold;
}

function sampleCurlField(x: number, y: number, seed: number): Point2D {
  const eps = 0.04;
  const dPsiDy = (fbmPotential(x, y + eps, seed) - fbmPotential(x, y - eps, seed)) / (2 * eps);
  const dPsiDx = (fbmPotential(x + eps, y, seed) - fbmPotential(x - eps, y, seed)) / (2 * eps);
  const vx = dPsiDy;
  const vy = -dPsiDx;
  const len = Math.hypot(vx, vy) || 1;
  return [vx / len, vy / len];
}

function isPointInPolygon(pt: Point2D, poly: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect =
      yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi + 1e-7) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function buildBrainPolygons(cx: number, cy: number, rx: number, ry: number, rng: PRNG) {
  const farHemisphere: Point2D[] = [];
  const farSteps = 32;
  for (let i = 0; i <= farSteps; i++) {
    const t = i / farSteps;
    const angle = Math.PI * (1.08 - t * 1.12);
    const lobeMod = 1 + 0.04 * Math.sin(t * Math.PI * 5) + rng.range(-0.012, 0.012);
    const px = cx + Math.cos(angle) * rx * 0.96 * lobeMod - rx * 0.04;
    const py = cy - Math.sin(angle) * ry * 0.78 * lobeMod - ry * 0.18;
    farHemisphere.push([px, py]);
  }
  for (let i = 10; i >= 0; i--) {
    const t = i / 10;
    const fx = cx - rx * 0.88 + t * (rx * 1.78);
    const fy = cy - ry * 0.18 + Math.sin(t * Math.PI) * (-ry * 0.14) + (t - 0.5) * (ry * 0.16);
    farHemisphere.push([fx, fy]);
  }

  const nearHemisphere: Point2D[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const fx = cx - rx * 0.88 + t * (rx * 1.78);
    const fy = cy - ry * 0.16 + Math.sin(t * Math.PI) * (-ry * 0.14) + (t - 0.5) * (ry * 0.16);
    nearHemisphere.push([fx, fy]);
  }
  const lowerAngles = 36;
  for (let i = 0; i <= lowerAngles; i++) {
    const t = i / lowerAngles;
    const angle = -0.05 * Math.PI + t * 1.12 * Math.PI;
    const temporalBulge =
      t > 0.3 && t < 0.72 ? Math.sin(((t - 0.3) / 0.42) * Math.PI) * 0.16 : 0;
    const lobeRipple = 1 + temporalBulge + 0.025 * Math.sin(t * Math.PI * 6);
    const px = cx + Math.cos(angle) * rx * 0.98 * lobeRipple;
    const py = cy + Math.sin(angle) * ry * 0.78 * lobeRipple - ry * 0.04;
    nearHemisphere.push([px, py]);
  }

  const cerebellum: Point2D[] = [];
  const cbCx = cx - rx * 0.54;
  const cbCy = cy + ry * 0.54;
  const cbRx = rx * 0.36;
  const cbRy = ry * 0.26;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    cerebellum.push([
      cbCx + Math.cos(a) * cbRx * (1 + 0.04 * Math.sin(a * 4)),
      cbCy + Math.sin(a) * cbRy,
    ]);
  }

  const brainstem: Point2D[] = [
    [cx - rx * 0.24, cy + ry * 0.56],
    [cx + rx * 0.02, cy + ry * 0.62],
    [cx - rx * 0.05, cy + ry * 0.98],
    [cx - rx * 0.16, cy + ry * 1.00],
    [cx - rx * 0.30, cy + ry * 0.92],
  ];

  return { farHemisphere, nearHemisphere, cerebellum, brainstem, cbCx, cbCy, cbRx, cbRy };
}

export function drawAnatomicalBrain(
  ctx: CanvasRenderingContext2D,
  artCanvas: HTMLCanvasElement,
  recorder: DrawOrderRecorder,
  seed = 20261012,
  isMobile = false,
): BrainDrawMetrics {
  const W = artCanvas.width;
  const H = artCanvas.height;
  const rng = createRng(seed ^ 0x7b41);

  const cx = W * (isMobile ? 0.31 : 0.30);
  const cy = H * (isMobile ? 0.44 : 0.49);
  const rx = W * (isMobile ? 0.145 : 0.135);
  const ry = H * (isMobile ? 0.165 : 0.175);

  const centerUv: readonly [number, number] = [cx / W, 1 - cy / H];

  // ---------------------------------------------------------------------------
  // STAGE 1 (t in [0.52, 0.56]): Low Architectural Slab & Hatched Cast Shadow on Grid
  // ---------------------------------------------------------------------------
  const shadowY = cy + ry * 1.25;
  const shadowRx = rx * 1.08;
  const shadowRy = ry * 0.26;
  const shadowPoly: Point2D[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    shadowPoly.push([
      cx - rx * 0.04 + Math.cos(a) * shadowRx,
      shadowY + Math.sin(a) * shadowRy,
    ]);
  }

  hatchRegion(ctx, shadowPoly, rng, {
    angleRad: (22 * Math.PI) / 180,
    baseSpacing: 5.5,
    baseWidth: 1.5,
    toneAt: () => 0.76,
    color: THEME_COLORS.ink,
  });
  drawInkStroke(ctx, [...shadowPoly, shadowPoly[0]], rng, {
    baseWidth: 1.8,
    color: THEME_COLORS.ink,
  });

  const slabTopY = shadowY - ry * 0.06;
  const slabBotY = shadowY + ry * 0.12;
  const slabLeftX = cx - rx * 0.86;
  const slabMidX = cx + rx * 0.12;
  const slabRightX = cx + rx * 0.84;

  const slabFrontLeft: Point2D[] = [
    [slabLeftX, slabTopY],
    [slabMidX, slabTopY + ry * 0.08],
    [slabMidX, slabBotY + ry * 0.08],
    [slabLeftX, slabBotY],
  ];
  const slabFrontRight: Point2D[] = [
    [slabMidX, slabTopY + ry * 0.08],
    [slabRightX, slabTopY - ry * 0.03],
    [slabRightX, slabBotY - ry * 0.03],
    [slabMidX, slabBotY + ry * 0.08],
  ];
  const slabTopFace: Point2D[] = [
    [slabLeftX, slabTopY],
    [cx - rx * 0.12, slabTopY - ry * 0.12],
    [slabRightX, slabTopY - ry * 0.03],
    [slabMidX, slabTopY + ry * 0.08],
  ];

  drawFilledOutlinedPoly(ctx, slabTopFace, THEME_COLORS.paper, THEME_COLORS.ink, 2.2, rng);
  drawFilledOutlinedPoly(ctx, slabFrontLeft, THEME_COLORS.paper, THEME_COLORS.ink, 2.4, rng);
  drawFilledOutlinedPoly(ctx, slabFrontRight, THEME_COLORS.paper, THEME_COLORS.ink, 2.6, rng);
  hatchRegion(ctx, slabFrontRight, rng, {
    angleRad: (38 * Math.PI) / 180,
    baseSpacing: 4.8,
    baseWidth: 1.4,
    toneAt: () => 0.65,
  });

  recorder.captureStage(artCanvas, 0.52, 0.56, 'bottom-up', centerUv);

  // ---------------------------------------------------------------------------
  // STAGE 2 (t in [0.56, 0.61]): Brainstem, Cerebellum & Two-Hemisphere Silhouette
  // ---------------------------------------------------------------------------
  const { farHemisphere, nearHemisphere, cerebellum, brainstem, cbCx, cbCy, cbRx, cbRy } =
    buildBrainPolygons(cx, cy, rx, ry, rng);

  drawFilledOutlinedPoly(ctx, brainstem, THEME_COLORS.paper, THEME_COLORS.ink, 3.0, rng);
  hatchRegion(ctx, brainstem, rng, {
    angleRad: (76 * Math.PI) / 180,
    baseSpacing: 5.0,
    baseWidth: 1.4,
    toneAt: () => 0.62,
  });

  drawFilledOutlinedPoly(ctx, cerebellum, THEME_COLORS.paper, THEME_COLORS.ink, 3.2, rng);
  ctx.save();
  ctx.beginPath();
  cerebellum.forEach((p, i) => (i === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.closePath();
  ctx.clip();
  for (let row = -5; row <= 5; row++) {
    const yOff = (row / 5.5) * cbRy;
    const pts: Point2D[] = [];
    for (let s = 0; s <= 10; s++) {
      const u = s / 10;
      pts.push([cbCx - cbRx * 0.95 + u * cbRx * 1.9, cbCy + yOff + Math.sin(u * Math.PI) * 5.0]);
    }
    drawInkStroke(ctx, pts, rng, { baseWidth: 1.5, color: THEME_COLORS.ink, doubleChance: 0 });
  }
  ctx.restore();

  drawFilledOutlinedPoly(ctx, farHemisphere, THEME_COLORS.paper, THEME_COLORS.ink, 3.4, rng);
  drawFilledOutlinedPoly(ctx, nearHemisphere, THEME_COLORS.paper, THEME_COLORS.ink, 3.8, rng);

  const fissurePts: Point2D[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    fissurePts.push([
      cx - rx * 0.88 + t * (rx * 1.78),
      cy - ry * 0.17 + Math.sin(t * Math.PI) * (-ry * 0.14) + (t - 0.5) * (ry * 0.16),
    ]);
  }
  drawInkStroke(ctx, fissurePts, rng, { baseWidth: 4.6, color: THEME_COLORS.ink });

  const sylvianPts: Point2D[] = [
    [cx + rx * 0.36, cy + ry * 0.18],
    [cx + rx * 0.08, cy + ry * 0.06],
    [cx - rx * 0.22, cy - ry * 0.02],
    [cx - rx * 0.46, cy - ry * 0.08],
  ];
  drawInkStroke(ctx, sylvianPts, rng, { baseWidth: 3.6, color: THEME_COLORS.ink });

  recorder.captureStage(artCanvas, 0.56, 0.61, 'radial-out', centerUv);

  // ---------------------------------------------------------------------------
  // STAGE 3 (t in [0.61, 0.71]): Curl-Noise Flow-Field Gyri & Sulci Streamlines
  // ---------------------------------------------------------------------------
  const traceHemisphereGyri = (
    poly: Point2D[],
    seedCount: number,
    stepLen: number,
    maxSteps: number,
    fieldScale: number,
    fieldSeed: number,
  ) => {
    ctx.save();
    ctx.beginPath();
    poly.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
    ctx.closePath();
    ctx.clip();

    const placedPoints: Point2D[] = [];
    const minSpacing = Math.min(rx, ry) * 0.068;

    for (let s = 0; s < seedCount; s++) {
      const startPt: Point2D = [
        cx + rng.range(-rx * 0.92, rx * 0.92),
        cy + rng.range(-ry * 0.92, ry * 0.78),
      ];
      if (!isPointInPolygon(startPt, poly)) continue;

      let tooClose = false;
      for (let k = 0; k < placedPoints.length; k++) {
        if (Math.hypot(placedPoints[k][0] - startPt[0], placedPoints[k][1] - startPt[1]) < minSpacing) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      const streamline: Point2D[] = [startPt];
      let cur: Point2D = [startPt[0], startPt[1]];

      for (let step = 0; step < maxSteps; step++) {
        const nx = (cur[0] - (cx - rx)) / (rx * fieldScale);
        const ny = (cur[1] - (cy - ry)) / (ry * fieldScale);
        const dir = sampleCurlField(nx, ny, fieldSeed);

        const nextPt: Point2D = [cur[0] + dir[0] * stepLen, cur[1] + dir[1] * stepLen];
        if (!isPointInPolygon(nextPt, poly)) break;

        streamline.push(nextPt);
        placedPoints.push(nextPt);
        cur = nextPt;
      }

      if (streamline.length >= 4) {
        drawInkStroke(ctx, streamline, rng, {
          baseWidth: rng.range(1.6, 2.9),
          color: THEME_COLORS.ink,
          doubleChance: 0.1,
        });
      }
    }

    ctx.restore();
  };

  traceHemisphereGyri(farHemisphere, 95, 5.2, 13, 0.34, seed + 101);
  recorder.captureStage(artCanvas, 0.61, 0.65, 'left-right', centerUv);

  traceHemisphereGyri(nearHemisphere, 210, 5.4, 15, 0.32, seed + 202);
  recorder.captureStage(artCanvas, 0.65, 0.71, 'left-right', centerUv);

  // ---------------------------------------------------------------------------
  // STAGE 4 (t in [0.71, 0.76]): Form-Following Cross-Contour Hatching & Terminator Stippling
  // ---------------------------------------------------------------------------
  ctx.save();
  ctx.beginPath();
  nearHemisphere.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.closePath();
  ctx.clip();

  const lowerRightShadowPoly: Point2D[] = [
    [cx - rx * 0.65, cy + ry * 0.28],
    [cx + rx * 0.05, cy + ry * 0.14],
    [cx + rx * 0.55, cy - ry * 0.06],
    [cx + rx * 0.98, cy - ry * 0.18],
    [cx + rx * 1.05, cy + ry * 0.85],
    [cx - rx * 0.75, cy + ry * 0.85],
  ];

  hatchRegion(ctx, lowerRightShadowPoly, rng, {
    angleRad: (-28 * Math.PI) / 180,
    baseSpacing: 5.5,
    baseWidth: 1.4,
    curvature: 0.15,
    toneAt: (u, v) => 0.45 + 0.45 * Math.max(u * 0.5, v),
  });

  for (let c = 0; c < 18; c++) {
    const t = c / 17;
    const arcX = cx - rx * 0.35 + t * rx * 1.18;
    const arcY = cy + ry * 0.55 - t * ry * 0.32;
    drawInkStroke(
      ctx,
      [
        [arcX - 14, arcY - 12],
        [arcX + 2, arcY + 4],
        [arcX + 12, arcY + 22],
      ],
      rng,
      { baseWidth: 1.4, color: THEME_COLORS.ink, doubleChance: 0 },
    );
  }

  for (let d = 0; d < 240; d++) {
    const u = rng.next();
    const bandX = cx - rx * 0.62 + u * rx * 1.52 + rng.range(-18, 18);
    const bandY =
      cy +
      ry * 0.24 -
      u * ry * 0.32 +
      Math.sin(u * Math.PI * 3) * 10 +
      rng.range(-22, 24);
    drawInkDot(ctx, bandX, bandY, rng.range(0.9, 2.0), rng, THEME_COLORS.ink);
  }

  ctx.restore();

  drawInkStroke(ctx, nearHemisphere, rng, { baseWidth: 3.6, color: THEME_COLORS.ink });

  recorder.captureStage(artCanvas, 0.71, 0.76, 'top-down', centerUv);

  const synapseUvPoints: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rad = 0.28 + (i % 3) * 0.22;
    const sx = cx + Math.cos(a) * rx * rad;
    const sy = cy - ry * 0.06 + Math.sin(a) * ry * rad * 0.75;
    synapseUvPoints.push([sx / W, 1 - sy / H]);
  }

  return {
    centerPx: { x: cx, y: cy },
    projectionOriginPx: { x: cx + rx * 0.94, y: cy - ry * 0.06 },
    synapseUvPoints,
  };
}
