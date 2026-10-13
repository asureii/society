/**
 * PROCEDURAL HAND-INKED MECHANICAL BRAIN REFLECTION & SPRITES (src/scene/intro/machineBrain.ts)
 *
 * Inside the standing mirror glass, draws the mirrored mechanical counterpart of the brain:
 * - Same silhouette and lobe layout (mirrored), built from riveted plates, interlocking gears,
 *   a hydraulic piston bank where the brainstem was, routed conduits & circuit traces where
 *   the sulci were, vacuum-tube bulbs, dials, and bundled hanging cables (`cables.ts`).
 * - Central circular cutaway reveals the solid Signal Red (`#D4141C`) orb core with a single-ring ripple.
 * - Thin dotted arc of 9 black ink dashes bridges the brain to the mirror's machine core.
 * - Generates a companion `512x512` sprite sheet for the 3 continuously rotating gears and sliding piston.
 */

import { THEME_COLORS } from '../../config/theme';
import { drawCableBundle } from '../art/cables';
import { hatchRegion } from '../art/hatch';
import {
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Point2D,
} from '../art/inkBrush';
import { createRng, type PRNG } from '../art/rng';
import type { BrainDrawMetrics } from './brain';
import type { DrawOrderRecorder } from './drawOrder';
import type { MirrorDrawMetrics } from './mirror';

export interface GearPivotSpec {
  /** Normalized screen UV [x, y] of the gear pivot inside the mirror */
  uv: [number, number];
  /** Radius in normalized screen height units */
  radiusNormH: number;
  /** Angular velocity in rad/sec (positive = CCW, negative = CW) */
  angularSpeed: number;
  /** Sprite cell index (0, 1, or 2) in the 2x2 sprite sheet */
  cellIndex: 0 | 1 | 2;
}

export interface MachineBrainDrawMetrics {
  /** Exact normalized WebGL UV [x, y] of the red orb core */
  orbCoreUv: [number, number];
  /** Radius of the red orb core in normalized screen height units */
  orbRadiusNormH: number;
  /** 3 rotating gear sprite specs inside the mirror */
  gearPivots: [GearPivotSpec, GearPivotSpec, GearPivotSpec];
  /** Sliding piston sprite spec at the brainstem position */
  pistonSpec: {
    uv: [number, number];
    sizeNormH: [number, number];
  };
  /** Quadratic Bezier control points in normalized WebGL UV [P0, P1, P2] for the traveling red projection dot */
  projectionArcUv: [[number, number], [number, number], [number, number]];
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

function drawInkGear(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  hubR: number,
  teeth: number,
  rng: PRNG,
  strokeWeight = 2.4,
): void {
  const pts: Point2D[] = [];
  const totalSteps = teeth * 4;
  for (let i = 0; i < totalSteps; i++) {
    const a = (i / totalSteps) * Math.PI * 2;
    const phase = i % 4;
    const r = phase === 0 || phase === 1 ? outerR : innerR;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  drawFilledOutlinedPoly(ctx, pts, THEME_COLORS.paperPure, THEME_COLORS.ink, strokeWeight, rng);

  const rimR = innerR * 0.76;
  const rimPts: Point2D[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    rimPts.push([cx + Math.cos(a) * rimR, cy + Math.sin(a) * rimR]);
  }
  drawInkStroke(ctx, rimPts, rng, {
    baseWidth: strokeWeight * 0.85,
    color: THEME_COLORS.ink,
    doubleChance: 0,
  });

  for (let s = 0; s < 4; s++) {
    const sa = (s / 4) * Math.PI * 2 + 0.3;
    drawInkStroke(
      ctx,
      [
        [cx + Math.cos(sa) * hubR, cy + Math.sin(sa) * hubR],
        [cx + Math.cos(sa) * rimR, cy + Math.sin(sa) * rimR],
      ],
      rng,
      { baseWidth: strokeWeight * 0.9, color: THEME_COLORS.ink, doubleChance: 0 },
    );
  }

  const hubPts: Point2D[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    hubPts.push([cx + Math.cos(a) * hubR, cy + Math.sin(a) * hubR]);
  }
  drawFilledOutlinedPoly(ctx, hubPts, THEME_COLORS.ink, THEME_COLORS.ink, 1.8, rng);
  ctx.fillStyle = THEME_COLORS.paperPure;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(2, hubR * 0.38), 0, Math.PI * 2);
  ctx.fill();
}

export function generateMachineSpriteSheet(size = 512, seed = 20261012): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const rng = createRng(seed ^ 0x99e1);
  ctx.clearRect(0, 0, size, size);

  const half = size / 2;

  drawInkGear(ctx, half * 0.5, half * 0.5, half * 0.42, half * 0.34, half * 0.11, 16, rng, 3.0);
  drawInkGear(ctx, half * 1.5, half * 0.5, half * 0.38, half * 0.30, half * 0.10, 12, rng, 2.8);
  drawInkGear(ctx, half * 0.5, half * 1.5, half * 0.34, half * 0.26, half * 0.09, 10, rng, 2.6);

  const px = half * 1.5;
  const py = half * 1.5;
  const rodW = half * 0.14;
  const headW = half * 0.32;
  const headH = half * 0.22;

  const headPoly: Point2D[] = [
    [px - headW, py - headH * 1.1],
    [px + headW, py - headH * 1.1],
    [px + headW, py - headH * 0.1],
    [px - headW, py - headH * 0.1],
  ];
  const rodPoly: Point2D[] = [
    [px - rodW, py - headH * 0.1],
    [px + rodW, py - headH * 0.1],
    [px + rodW, py + headH * 1.35],
    [px - rodW, py + headH * 1.35],
  ];
  drawFilledOutlinedPoly(ctx, rodPoly, THEME_COLORS.paperPure, THEME_COLORS.ink, 2.8, rng);
  hatchRegion(ctx, rodPoly, rng, {
    angleRad: 0,
    baseSpacing: 6.0,
    baseWidth: 1.5,
    toneAt: () => 0.6,
  });
  drawFilledOutlinedPoly(ctx, headPoly, THEME_COLORS.paperPure, THEME_COLORS.ink, 3.2, rng);
  for (let g = 0; g < 3; g++) {
    const gy = py - headH * (0.9 - g * 0.28);
    drawInkStroke(
      ctx,
      [
        [px - headW + 4, gy],
        [px + headW - 4, gy],
      ],
      rng,
      { baseWidth: 2.2, color: THEME_COLORS.ink, doubleChance: 0 },
    );
  }

  return canvas;
}

export function drawMachineBrainAndProjection(
  ctx: CanvasRenderingContext2D,
  artCanvas: HTMLCanvasElement,
  recorder: DrawOrderRecorder,
  brainMetrics: BrainDrawMetrics,
  mirrorMetrics: MirrorDrawMetrics,
  seed = 20261012,
): MachineBrainDrawMetrics {
  const W = artCanvas.width;
  const H = artCanvas.height;
  const rng = createRng(seed ^ 0x62d9);

  const cx = mirrorMetrics.machineCorePx.x;
  const cy = mirrorMetrics.machineCorePx.y;
  const rx = mirrorMetrics.glassHalfSizePx.rx * 0.88;
  const ry = mirrorMetrics.glassHalfSizePx.ry * 0.62;
  const centerUv = mirrorMetrics.machineCoreUv;

  ctx.save();
  ctx.beginPath();
  mirrorMetrics.glassPoly.forEach((p, idx) =>
    idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1]),
  );
  ctx.closePath();
  ctx.clip();

  // ---------------------------------------------------------------------------
  // STAGE 1 (t in [0.76, 0.83]): Mirrored Mechanical Silhouette, Piston Bank & Riveted Plates
  // ---------------------------------------------------------------------------
  const pistonCx = cx + rx * 0.18;
  const pistonCy = cy + ry * 0.78;
  const pistonHousing: Point2D[] = [
    [cx + rx * 0.02, cy + ry * 0.48],
    [cx + rx * 0.34, cy + ry * 0.44],
    [cx + rx * 0.28, cy + ry * 1.06],
    [cx + rx * 0.06, cy + ry * 1.08],
  ];
  drawFilledOutlinedPoly(ctx, pistonHousing, THEME_COLORS.paper, THEME_COLORS.ink, 3.0, rng);
  hatchRegion(ctx, pistonHousing, rng, {
    angleRad: 0,
    baseSpacing: 5.5,
    baseWidth: 1.4,
    toneAt: () => 0.65,
  });

  const mechCbCx = cx + rx * 0.52;
  const mechCbCy = cy + ry * 0.50;
  const mechCbRx = rx * 0.36;
  const mechCbRy = ry * 0.26;
  const mechCbPoly: Point2D[] = [
    [mechCbCx - mechCbRx, mechCbCy - mechCbRy * 0.6],
    [mechCbCx + mechCbRx * 0.85, mechCbCy - mechCbRy],
    [mechCbCx + mechCbRx, mechCbCy],
    [mechCbCx + mechCbRx * 0.82, mechCbCy + mechCbRy],
    [mechCbCx - mechCbRx * 0.9, mechCbCy + mechCbRy * 0.85],
  ];
  drawFilledOutlinedPoly(ctx, mechCbPoly, THEME_COLORS.paper, THEME_COLORS.ink, 3.0, rng);
  hatchRegion(ctx, mechCbPoly, rng, {
    angleRad: (-32 * Math.PI) / 180,
    baseSpacing: 4.8,
    baseWidth: 1.3,
    toneAt: () => 0.68,
  });

  const tubeOffsets = [-0.52, -0.18, 0.18, 0.50];
  for (let t = 0; t < tubeOffsets.length; t++) {
    const tx = cx + tubeOffsets[t] * rx;
    const ty = cy - ry * (0.94 - Math.abs(tubeOffsets[t]) * 0.22);
    const tubeW = rx * 0.085;
    const tubeH = ry * 0.19;
    const tubePoly: Point2D[] = [
      [tx - tubeW, ty + tubeH * 0.5],
      [tx - tubeW * 0.85, ty - tubeH * 0.6],
      [tx, ty - tubeH],
      [tx + tubeW * 0.85, ty - tubeH * 0.6],
      [tx + tubeW, ty + tubeH * 0.5],
    ];
    drawFilledOutlinedPoly(ctx, tubePoly, THEME_COLORS.paperPure, THEME_COLORS.ink, 2.2, rng);
    drawInkStroke(
      ctx,
      [
        [tx, ty + tubeH * 0.4],
        [tx, ty - tubeH * 0.45],
      ],
      rng,
      { baseWidth: 1.6, color: THEME_COLORS.ink, doubleChance: 0 },
    );
  }

  const shellPoly: Point2D[] = [];
  const shellSteps = 28;
  for (let i = 0; i < shellSteps; i++) {
    const a = (i / shellSteps) * Math.PI * 2;
    const temporalBulge =
      a > 0.15 * Math.PI && a < 0.78 * Math.PI
        ? Math.sin(((a - 0.15 * Math.PI) / (0.63 * Math.PI)) * Math.PI) * 0.15
        : 0;
    const facet = 1 + temporalBulge;
    shellPoly.push([
      cx + Math.cos(a) * rx * 0.98 * facet,
      cy - ry * 0.05 + Math.sin(a) * ry * 0.84 * facet,
    ]);
  }
  drawFilledOutlinedPoly(ctx, shellPoly, THEME_COLORS.paper, THEME_COLORS.ink, 3.8, rng);

  const seamLines: Point2D[][] = [
    [
      [cx - rx * 0.90, cy - ry * 0.16],
      [cx - rx * 0.25, cy - ry * 0.32],
      [cx + rx * 0.35, cy - ry * 0.26],
      [cx + rx * 0.88, cy - ry * 0.12],
    ],
    [
      [cx - rx * 0.34, cy - ry * 0.82],
      [cx - rx * 0.22, cy - ry * 0.18],
      [cx - rx * 0.42, cy + ry * 0.56],
    ],
    [
      [cx + rx * 0.32, cy - ry * 0.78],
      [cx + rx * 0.24, cy - ry * 0.08],
      [cx + rx * 0.48, cy + ry * 0.52],
    ],
    [
      [cx - rx * 0.86, cy + ry * 0.14],
      [cx - rx * 0.24, cy + ry * 0.08],
      [cx + rx * 0.38, cy + ry * 0.18],
      [cx + rx * 0.86, cy + ry * 0.12],
    ],
  ];

  for (const seam of seamLines) {
    drawInkStroke(ctx, seam, rng, { baseWidth: 3.2, color: THEME_COLORS.ink, doubleChance: 0 });
    for (let i = 0; i < seam.length - 1; i++) {
      const p0 = seam[i];
      const p1 = seam[i + 1];
      for (let r = 1; r <= 3; r++) {
        const u = r / 4;
        const rxPt = p0[0] + (p1[0] - p0[0]) * u;
        const ryPt = p0[1] + (p1[1] - p0[1]) * u;
        ctx.fillStyle = THEME_COLORS.ink;
        ctx.beginPath();
        ctx.arc(rxPt + 5, ryPt - 5, 2.0, 0, Math.PI * 2);
        ctx.arc(rxPt - 5, ryPt + 5, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  recorder.captureStage(artCanvas, 0.76, 0.83, 'top-down', centerUv);

  // ---------------------------------------------------------------------------
  // STAGE 2 (t in [0.83, 0.90]): Routed Conduits, Circuit Traces, Gears & Dials
  // ---------------------------------------------------------------------------
  ctx.save();
  ctx.beginPath();
  shellPoly.forEach((p, idx) => (idx === 0 ? ctx.moveTo(p[0], p[1]) : ctx.lineTo(p[0], p[1])));
  ctx.closePath();
  ctx.clip();

  const traceCount = 46;
  for (let tr = 0; tr < traceCount; tr++) {
    const startX = cx + rng.range(-rx * 0.82, rx * 0.82);
    const startY = cy + rng.range(-ry * 0.72, ry * 0.65);
    const pts: Point2D[] = [[startX, startY]];
    let curX = startX;
    let curY = startY;
    const segs = rng.int(2, 4);
    for (let s = 0; s < segs; s++) {
      const dir = (tr + s) % 3;
      const len = rng.range(14, 34);
      if (dir === 0) {
        curX += (rng.chance(0.5) ? 1 : -1) * len;
      } else if (dir === 1) {
        curY += (rng.chance(0.5) ? 1 : -1) * len;
      } else {
        curX += (rng.chance(0.5) ? 1 : -1) * len * 0.7;
        curY += (rng.chance(0.5) ? 1 : -1) * len * 0.7;
      }
      pts.push([curX, curY]);
    }
    drawInkStroke(ctx, pts, rng, {
      baseWidth: rng.range(1.6, 2.5),
      color: THEME_COLORS.ink,
      doubleChance: 0,
    });
    const endPt = pts[pts.length - 1];
    ctx.fillStyle = THEME_COLORS.paperPure;
    ctx.strokeStyle = THEME_COLORS.ink;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(endPt[0], endPt[1], 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  const gear1Px = { x: cx - rx * 0.38, y: cy + ry * 0.22, r: rx * 0.22 };
  const gear2Px = { x: cx + rx * 0.36, y: cy + ry * 0.16, r: rx * 0.19 };
  const gear3Px = { x: cx + rx * 0.04, y: cy - ry * 0.42, r: rx * 0.17 };

  drawInkGear(ctx, gear1Px.x, gear1Px.y, gear1Px.r, gear1Px.r * 0.8, gear1Px.r * 0.26, 14, rng, 2.2);
  drawInkGear(ctx, gear2Px.x, gear2Px.y, gear2Px.r, gear2Px.r * 0.8, gear2Px.r * 0.26, 12, rng, 2.2);
  drawInkGear(ctx, gear3Px.x, gear3Px.y, gear3Px.r, gear3Px.r * 0.8, gear3Px.r * 0.26, 10, rng, 2.0);

  ctx.restore();

  recorder.captureStage(artCanvas, 0.83, 0.90, 'radial-out', centerUv);

  // ---------------------------------------------------------------------------
  // STAGE 3 (t in [0.90, 0.96]): Hanging Cables & Central Cutaway with Solid Red Orb Core
  // ---------------------------------------------------------------------------
  drawCableBundle(
    ctx,
    [cx - rx * 0.45, cy + ry * 0.56],
    [cx + rx * 0.45, cy + ry * 0.58],
    42,
    4,
    rng,
    rng,
    3.2,
  );

  const cutawayR = Math.min(rx, ry) * 0.38;
  const cutawayOuterPts: Point2D[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    cutawayOuterPts.push([
      cx + Math.cos(a) * (cutawayR * 1.22),
      cy + Math.sin(a) * (cutawayR * 1.22),
    ]);
  }
  drawFilledOutlinedPoly(ctx, cutawayOuterPts, THEME_COLORS.ink, THEME_COLORS.ink, 3.0, rng);

  const cutawayWellPts: Point2D[] = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    cutawayWellPts.push([
      cx + Math.cos(a) * (cutawayR * 0.96),
      cy + Math.sin(a) * (cutawayR * 0.96),
    ]);
  }
  drawFilledOutlinedPoly(ctx, cutawayWellPts, THEME_COLORS.paperPure, THEME_COLORS.ink, 2.4, rng);

  const rippleR = cutawayR * 0.78;
  const ripplePts: Point2D[] = [];
  for (let i = 0; i <= 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    ripplePts.push([cx + Math.cos(a) * rippleR, cy + Math.sin(a) * rippleR]);
  }
  drawInkStroke(ctx, ripplePts, rng, { baseWidth: 1.8, color: THEME_COLORS.red, doubleChance: 0 });

  const orbR = cutawayR * 0.54;
  ctx.fillStyle = THEME_COLORS.red;
  ctx.beginPath();
  ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
  ctx.fill();

  const orbRingPts: Point2D[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    orbRingPts.push([cx + Math.cos(a) * orbR, cy + Math.sin(a) * orbR]);
  }
  drawInkStroke(ctx, orbRingPts, rng, { baseWidth: 2.2, color: THEME_COLORS.ink, doubleChance: 0 });

  ctx.restore();

  recorder.captureStage(artCanvas, 0.90, 0.96, 'radial-in', centerUv);

  // ---------------------------------------------------------------------------
  // STAGE 4 (t in [0.96, 1.00]): Dotted Projection Arc from Brain to Machine Core
  // ---------------------------------------------------------------------------
  const p0 = brainMetrics.projectionOriginPx;
  const p2 = mirrorMetrics.machineCorePx;
  const p1 = {
    x: (p0.x + p2.x) * 0.5,
    y: Math.min(p0.y, p2.y) - H * 0.11,
  };

  const evalQuadBezier = (t: number): Point2D => {
    const mt = 1 - t;
    return [
      mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    ];
  };

  const dashCount = 9;
  for (let d = 0; d < dashCount; d++) {
    const tStart = 0.06 + (d / dashCount) * 0.82;
    const tEnd = tStart + 0.042;
    const d0 = evalQuadBezier(tStart);
    const d1 = evalQuadBezier((tStart + tEnd) * 0.5);
    const d2 = evalQuadBezier(tEnd);
    drawInkStroke(ctx, [d0, d1, d2], rng, {
      baseWidth: 2.4,
      color: THEME_COLORS.ink,
      doubleChance: 0,
    });
  }

  recorder.captureStage(artCanvas, 0.96, 1.0, 'left-right', centerUv);

  return {
    orbCoreUv: [cx / W, 1 - cy / H],
    orbRadiusNormH: orbR / H,
    gearPivots: [
      {
        uv: [gear1Px.x / W, 1 - gear1Px.y / H],
        radiusNormH: (gear1Px.r * 0.92) / H,
        angularSpeed: 0.75,
        cellIndex: 0,
      },
      {
        uv: [gear2Px.x / W, 1 - gear2Px.y / H],
        radiusNormH: (gear2Px.r * 0.92) / H,
        angularSpeed: -0.95,
        cellIndex: 1,
      },
      {
        uv: [gear3Px.x / W, 1 - gear3Px.y / H],
        radiusNormH: (gear3Px.r * 0.92) / H,
        angularSpeed: 1.15,
        cellIndex: 2,
      },
    ],
    pistonSpec: {
      uv: [pistonCx / W, 1 - pistonCy / H],
      sizeNormH: [(rx * 0.26) / H, (ry * 0.42) / H],
    },
    projectionArcUv: [
      [p0.x / W, 1 - p0.y / H],
      [p1.x / W, 1 - p1.y / H],
      [p2.x / W, 1 - p2.y / H],
    ],
  };
}
