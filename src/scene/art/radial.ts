/**
 * RADIAL & CONCENTRIC RING HELPERS (src/scene/art/radial.ts)
 *
 * Draws hand-inked concentric ripple rings, mechanical aperture crosshairs,
 * and broken halo arcs with organic wobble, nib taper, broken gaps, and doubled lines.
 */

import { THEME_COLORS } from '../../config/theme';
import {
  drawInkDot,
  drawInkStroke,
  type Canvas2DContext,
  type Point2D,
} from './inkBrush';
import type { PRNG } from './rng';

export interface ConcentricRingOptions {
  cx: number;
  cy: number;
  minRadius: number;
  maxRadius: number;
  ringCount: number;
  rng: PRNG;
  structuralRng: PRNG;
  aspectY?: number;
  baseWidth?: number;
  color?: string;
  breakChance?: number;
  doubleChance?: number;
  radialTicks?: boolean;
}

export function drawConcentricRings(
  ctx: Canvas2DContext,
  opts: ConcentricRingOptions,
): void {
  const {
    cx,
    cy,
    minRadius,
    maxRadius,
    ringCount,
    rng,
    structuralRng,
    aspectY = 1.0,
    baseWidth = 2.4,
    color = THEME_COLORS.ink,
    breakChance = 0.1,
    doubleChance = 0.28,
    radialTicks = true,
  } = opts;

  for (let rIdx = 0; rIdx < ringCount; rIdx++) {
    const t = ringCount <= 1 ? 0 : rIdx / (ringCount - 1);
    const rBase =
      minRadius +
      Math.pow(t, 1.12) * (maxRadius - minRadius) +
      (structuralRng.next() - 0.5) * ((maxRadius - minRadius) / Math.max(2, ringCount)) * 0.35;

    const rx = Math.max(8, rBase);
    const ry = rx * aspectY;

    const arcCount = 3 + (rIdx % 2);
    const totalSegs = 48;
    const segsPerArc = Math.floor(totalSegs / arcCount);

    for (let a = 0; a < arcCount; a++) {
      if (structuralRng.chance(0.14)) continue;

      const startSeg = a * segsPerArc;
      const endSeg = startSeg + segsPerArc - (structuralRng.chance(0.45) ? 2 : 0);
      const pts: Point2D[] = [];

      for (let i = startSeg; i <= endSeg; i++) {
        const theta = (i / totalSegs) * Math.PI * 2 + rIdx * 0.37;
        const wobble =
          1.0 +
          (structuralRng.noise1D(i * 0.38 + rIdx * 5.1) - 0.5) * 0.032 +
          (rng.noise1D(i * 0.85 + rIdx * 2.3) - 0.5) * 0.014;
        pts.push([
          cx + Math.cos(theta) * rx * wobble,
          cy + Math.sin(theta) * ry * wobble,
        ]);
      }

      const ringWeight = baseWidth * (1.18 - t * 0.38) * rng.range(0.85, 1.18);
      drawInkStroke(ctx, pts, rng, {
        baseWidth: Math.max(1.1, ringWeight),
        color,
        breakChance,
        doubleChance,
        dryBrush: rIdx % 3 === 0,
      });
    }

    if (radialTicks && rIdx % 2 === 0) {
      const tickCount = 8;
      for (let k = 0; k < tickCount; k++) {
        if (structuralRng.chance(0.35)) continue;
        const ang = (k / tickCount) * Math.PI * 2 + rIdx * 0.2;
        const tLen = rng.range(6, 15);
        const p0: Point2D = [
          cx + Math.cos(ang) * (rx - tLen * 0.5),
          cy + Math.sin(ang) * (ry - tLen * 0.5 * aspectY),
        ];
        const p1: Point2D = [
          cx + Math.cos(ang) * (rx + tLen * 0.5),
          cy + Math.sin(ang) * (ry + tLen * 0.5 * aspectY),
        ];
        drawInkStroke(ctx, [p0, p1], rng, {
          baseWidth: rng.range(1.1, 1.8),
          color,
          taperScale: 1.3,
          doubleChance: 0,
        });
      }
    }
  }

  for (let d = 0; d < 22; d++) {
    const ang = rng.range(0, Math.PI * 2);
    const dist = rng.range(minRadius * 0.95, maxRadius * 1.04);
    drawInkDot(
      ctx,
      cx + Math.cos(ang) * dist,
      cy + Math.sin(ang) * dist * aspectY,
      rng.range(1.0, 2.6),
      rng,
      color,
    );
  }
}

export function drawSubmergedOrbReflections(
  ctx: Canvas2DContext,
  cx: number,
  cy: number,
  radiusX: number,
  radiusY: number,
  rng: PRNG,
): void {
  const lineCount = 9;
  for (let i = 0; i < lineCount; i++) {
    const t = (i + 1) / lineCount;
    const y = cy + radiusY * (0.18 + t * 1.15);
    const halfSpan = radiusX * (1.05 - t * 0.58) * rng.range(0.82, 1.12);
    const sag = rng.range(4, 12) * (1 - t * 0.4);

    const pts: Point2D[] = [
      [cx - halfSpan, y],
      [cx, y + sag],
      [cx + halfSpan, y],
    ];
    drawInkStroke(ctx, pts, rng, {
      baseWidth: rng.range(1.4, 2.8) * (1.1 - t * 0.45),
      color: i < 2 ? THEME_COLORS.red : THEME_COLORS.ink,
      taperScale: 1.35,
      breakChance: 0.12,
      doubleChance: 0.2,
    });
  }
}
