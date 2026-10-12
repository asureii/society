/**
 * HAND-INKED VARIABLE-WIDTH BRUSH PRIMITIVES (src/scene/art/inkBrush.ts)
 *
 * NEVER uses canvas `ctx.stroke()` or fixed `lineWidth`.
 * Every ink stroke is constructed as a filled variable-width polygon ribbon along a path:
 * 1. Pressure curve: thin attack -> heavier sustain -> tapered release with per-stroke randomized proportions.
 * 2. Perpendicular wobble: low-frequency value noise displaces spine points so no line is ruler-straight.
 * 3. Start blobs & end flicks: pooled ink bead at stroke attack and rapid flicked tail on release.
 * 4. Imperfect joins: endpoints overshoot or miss corners by 1–4px.
 * 5. Doubled lines: ~25% of outlines receive a second, thinner, shorter offset sketch stroke.
 * 6. Broken lines: ~3% chance per segment of a brief pen lift / paper gap on long strokes.
 * 7. Dry-brush streaks: thick strokes carve thin lengthwise paper slivers near edges.
 * 8. Edge roughening: polygon contour vertices are displaced before fill so no edge is vector-clean.
 */

import { INK_CONFIG } from '../../config/ink';
import { THEME_COLORS } from '../../config/theme';
import type { PRNG } from './rng';

export type Point2D = [number, number];

export type Canvas2DContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export interface InkStrokeOptions {
  /** Base nib width in pixels */
  baseWidth?: number;
  /** Override color token (strictly THEME_COLORS.ink, THEME_COLORS.paper, THEME_COLORS.paperPure, or THEME_COLORS.red) */
  color?: string;
  /** Multiplier on INK_CONFIG.wobbleAmplitude */
  wobbleScale?: number;
  /** Multiplier on INK_CONFIG.taperStrength */
  taperScale?: number;
  /** Override doubled-line probability */
  doubleChance?: number;
  /** Override broken-line probability */
  breakChance?: number;
  /** Enable dry-brush white paper slivers along thick strokes */
  dryBrush?: boolean;
  /** Apply endpoint miss / corner overshoot */
  imperfectJoin?: boolean;
}

/**
 * Evaluates nib pressure along normalized arc parameter t in [0, 1].
 * Attack (0 -> attackEnd) ramps up from thin nib touch;
 * Sustain (attackEnd -> releaseStart) holds full pressure with gentle hand modulation;
 * Release (releaseStart -> 1) tapers down to a fine point.
 */
function evaluatePressure(
  t: number,
  attackEnd: number,
  releaseStart: number,
  taperStrength: number,
  noiseVal: number,
): number {
  const minTip = Math.max(0.08, 1.0 - taperStrength * 0.9);
  let env = 1.0;
  if (t < attackEnd) {
    const u = t / Math.max(0.02, attackEnd);
    env = minTip + (1.0 - minTip) * (u * u * (3.0 - 2.0 * u));
  } else if (t > releaseStart) {
    const u = (1.0 - t) / Math.max(0.02, 1.0 - releaseStart);
    env = minTip + (1.0 - minTip) * Math.pow(Math.max(0, u), 1.35);
  }
  const modulation = 0.85 + 0.3 * noiseVal;
  return Math.max(0.06, env * modulation);
}

/**
 * Renders a single continuous segment of points as a filled variable-width polygon.
 */
function fillVariableWidthSubpath(
  ctx: Canvas2DContext,
  pts: Point2D[],
  rng: PRNG,
  baseWidth: number,
  color: string,
  wobbleAmp: number,
  taperStrength: number,
): void {
  if (pts.length < 2) return;

  const attackEnd = rng.range(0.08, 0.22);
  const releaseStart = rng.range(0.68, 0.88);
  const phase = rng.range(0, 100);

  const leftEdge: Point2D[] = [];
  const rightEdge: Point2D[] = [];

  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    const pCurr = pts[i];
    const pPrev = pts[Math.max(0, i - 1)];
    const pNext = pts[Math.min(pts.length - 1, i + 1)];

    let dx = pNext[0] - pPrev[0];
    let dy = pNext[1] - pPrev[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    // Perpendicular normal
    const nx = -dy;
    const ny = dx;

    // Low-frequency perpendicular hand wobble + subtle edge roughening
    const nWobble =
      (rng.noise1D(phase + i * INK_CONFIG.wobbleFrequency * 4.0) - 0.5) * 2.0 * wobbleAmp;
    const cx = pCurr[0] + nx * nWobble;
    const cy = pCurr[1] + ny * nWobble;

    const pNoise = rng.noise1D(phase * 1.7 + t * 5.0);
    const halfW =
      0.5 *
      baseWidth *
      evaluatePressure(t, attackEnd, releaseStart, taperStrength, pNoise);

    // Independent micro-roughening on left and right nib edges so no edge is vector-clean
    const roughL = (rng.next() - 0.5) * INK_CONFIG.edgeRougheningPx;
    const roughR = (rng.next() - 0.5) * INK_CONFIG.edgeRougheningPx;

    leftEdge.push([cx + nx * Math.max(0.25, halfW + roughL), cy + ny * Math.max(0.25, halfW + roughL)]);
    rightEdge.push([cx - nx * Math.max(0.25, halfW + roughR), cy - ny * Math.max(0.25, halfW + roughR)]);
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(leftEdge[0][0], leftEdge[0][1]);
  for (let i = 1; i < leftEdge.length; i++) {
    ctx.lineTo(leftEdge[i][0], leftEdge[i][1]);
  }
  for (let i = rightEdge.length - 1; i >= 0; i--) {
    ctx.lineTo(rightEdge[i][0], rightEdge[i][1]);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Subdivides a control polyline into dense sample points and draws a hand-inked
 * variable-width brush stroke with optional start blobs, end flicks, broken-line gaps,
 * doubled sketch strokes, and dry-brush streaks.
 */
export function drawInkStroke(
  ctx: Canvas2DContext,
  controlPoints: Point2D[],
  rng: PRNG,
  options: InkStrokeOptions = {},
): void {
  if (controlPoints.length < 2) return;

  const baseWidth = options.baseWidth ?? 3.2;
  const color = options.color ?? THEME_COLORS.ink;
  const wobbleAmp = INK_CONFIG.wobbleAmplitude * (options.wobbleScale ?? 1.0);
  const taperStrength = Math.min(1, INK_CONFIG.taperStrength * (options.taperScale ?? 1.0));
  const doubleChance = options.doubleChance ?? INK_CONFIG.doubledLineProbability;
  const breakChance = options.breakChance ?? INK_CONFIG.lineBreakProbability;
  const imperfectJoin = options.imperfectJoin ?? true;

  // Clone endpoints and apply imperfect corner overshoot / miss (1–4px)
  const pts: Point2D[] = controlPoints.map((p) => [p[0], p[1]]);
  if (imperfectJoin && pts.length >= 2) {
    const first = pts[0];
    const second = pts[1];
    const last = pts[pts.length - 1];
    const prev = pts[pts.length - 2];

    const d0x = first[0] - second[0];
    const d0y = first[1] - second[1];
    const l0 = Math.hypot(d0x, d0y) || 1;
    const miss0 = rng.range(INK_CONFIG.endpointMissPx[0], INK_CONFIG.endpointMissPx[1]);
    pts[0] = [
      first[0] + (d0x / l0) * miss0 * (rng.chance(0.65) ? 1 : -0.6),
      first[1] + (d0y / l0) * miss0 * (rng.chance(0.65) ? 1 : -0.6),
    ];

    const d1x = last[0] - prev[0];
    const d1y = last[1] - prev[1];
    const l1 = Math.hypot(d1x, d1y) || 1;
    const miss1 = rng.range(INK_CONFIG.endpointMissPx[0], INK_CONFIG.endpointMissPx[1]);
    pts[pts.length - 1] = [
      last[0] + (d1x / l1) * miss1 * (rng.chance(0.7) ? 1 : -0.5),
      last[1] + (d1y / l1) * miss1 * (rng.chance(0.7) ? 1 : -0.5),
    ];
  }

  // Resample polyline to ~6px steps so wobble and pressure curves have organic resolution
  const dense: Point2D[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(2, Math.ceil(dist / 6.0));
    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      dense.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
    }
  }
  dense.push(pts[pts.length - 1]);

  // Append quick flicked tail at stroke release if triggered
  if (rng.chance(INK_CONFIG.endFlickProbability) && dense.length >= 3) {
    const pLast = dense[dense.length - 1];
    const pPrev = dense[dense.length - 2];
    const vx = pLast[0] - pPrev[0];
    const vy = pLast[1] - pPrev[1];
    const vLen = Math.hypot(vx, vy) || 1;
    const flickLen = rng.range(4.0, 11.0);
    const flickAngle = rng.range(-0.28, 0.28);
    const cosA = Math.cos(flickAngle);
    const sinA = Math.sin(flickAngle);
    const fx = (vx / vLen) * cosA - (vy / vLen) * sinA;
    const fy = (vx / vLen) * sinA + (vy / vLen) * cosA;
    dense.push([pLast[0] + fx * flickLen * 0.5, pLast[1] + fy * flickLen * 0.5]);
    dense.push([pLast[0] + fx * flickLen, pLast[1] + fy * flickLen]);
  }

  // Partition into subpaths if broken-line pen lift triggers (mostly on longer lines)
  let currentSubpath: Point2D[] = [];
  const allowBreaks = dense.length > 10 && breakChance > 0;
  for (let i = 0; i < dense.length; i++) {
    if (allowBreaks && i > 3 && i < dense.length - 4 && rng.chance(breakChance)) {
      if (currentSubpath.length >= 2) {
        fillVariableWidthSubpath(
          ctx,
          currentSubpath,
          rng,
          baseWidth,
          color,
          wobbleAmp,
          taperStrength,
        );
      }
      currentSubpath = [];
      // Skip 1–2 samples for a tiny hand-lifted gap
      i += rng.int(1, 2);
      continue;
    }
    currentSubpath.push(dense[i]);
  }
  if (currentSubpath.length >= 2) {
    fillVariableWidthSubpath(
      ctx,
      currentSubpath,
      rng,
      baseWidth,
      color,
      wobbleAmp,
      taperStrength,
    );
  }

  // Optional start ink pooling blob
  if (rng.chance(INK_CONFIG.startBlobProbability)) {
    const startPt = dense[0];
    drawInkDot(ctx, startPt[0], startPt[1], baseWidth * rng.range(0.58, 0.92), rng, color);
  }

  // ~25% of outlines get a second, thinner, shorter, slightly offset sketch stroke
  if (doubleChance > 0 && rng.chance(doubleChance) && dense.length >= 5) {
    const subStart = rng.int(0, Math.floor(dense.length * 0.35));
    const subEnd = rng.int(Math.ceil(dense.length * 0.65), dense.length - 1);
    const offX = rng.range(-3.2, 3.2);
    const offY = rng.range(-3.2, 3.2);
    const doubledPts: Point2D[] = [];
    for (let i = subStart; i <= subEnd; i++) {
      doubledPts.push([dense[i][0] + offX, dense[i][1] + offY]);
    }
    fillVariableWidthSubpath(
      ctx,
      doubledPts,
      rng,
      baseWidth * rng.range(0.42, 0.65),
      color,
      wobbleAmp * 1.25,
      Math.min(1, taperStrength * 1.15),
    );
  }

  // Dry-brush scratchy lengthwise paper slivers on thick strokes
  if ((options.dryBrush || baseWidth >= 5.5) && color === THEME_COLORS.ink) {
    const streakCount = Math.max(1, Math.floor((baseWidth / 3.0) * INK_CONFIG.dryBrushStrength));
    for (let s = 0; s < streakCount; s++) {
      if (dense.length < 6) break;
      const i0 = rng.int(1, Math.floor(dense.length * 0.5));
      const i1 = Math.min(dense.length - 1, i0 + rng.int(3, Math.floor(dense.length * 0.45)));
      const edgeOffset = (rng.chance(0.5) ? 1 : -1) * baseWidth * rng.range(0.12, 0.34);
      const sliverPts: Point2D[] = [];
      for (let i = i0; i <= i1; i++) {
        sliverPts.push([dense[i][0] + edgeOffset, dense[i][1] + edgeOffset * 0.6]);
      }
      fillVariableWidthSubpath(
        ctx,
        sliverPts,
        rng,
        rng.range(0.7, 1.35),
        THEME_COLORS.paperPure,
        wobbleAmp * 0.6,
        0.95,
      );
    }
  }
}

/**
 * Draws an organic irregular ink dot / spatter droplet (never a perfect circle).
 */
export function drawInkDot(
  ctx: Canvas2DContext,
  cx: number,
  cy: number,
  radius: number,
  rng: PRNG,
  color: string = THEME_COLORS.ink,
): void {
  const vertices = 7;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < vertices; i++) {
    const angle = (i / vertices) * Math.PI * 2;
    const r = radius * rng.range(0.68, 1.28);
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Fills a polygon with edge-roughened vertices so no silhouette is vector-clean.
 */
export function fillRoughenedPolygon(
  ctx: Canvas2DContext,
  polygon: Point2D[],
  rng: PRNG,
  fillColor: string,
  roughnessPx: number = INK_CONFIG.edgeRougheningPx * 1.8,
): Point2D[] {
  if (polygon.length < 3) return polygon;

  const roughened: Point2D[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(2, Math.ceil(dist / 14.0));
    const nx = -(b[1] - a[1]) / (dist || 1);
    const ny = (b[0] - a[0]) / (dist || 1);

    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      const disp = (rng.noise1D(i * 13.7 + u * 4.2) - 0.5) * 2.0 * roughnessPx;
      roughened.push([
        a[0] + (b[0] - a[0]) * u + nx * disp,
        a[1] + (b[1] - a[1]) * u + ny * disp,
      ]);
    }
  }

  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(roughened[0][0], roughened[0][1]);
  for (let i = 1; i < roughened.length; i++) {
    ctx.lineTo(roughened[i][0], roughened[i][1]);
  }
  ctx.closePath();
  ctx.fill();

  return roughened;
}

/**
 * Outlines a polygon using individual hand-inked brush strokes per edge so corners
 * naturally overshoot and ~25% of edges get doubled sketch lines.
 */
export function outlinePolygonWithInk(
  ctx: Canvas2DContext,
  polygon: Point2D[],
  rng: PRNG,
  options: InkStrokeOptions = {},
): void {
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    drawInkStroke(ctx, [a, b], rng, options);
  }
}
