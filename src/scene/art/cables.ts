/**
 * DROOPING CATENARY CABLE GENERATOR (src/scene/art/cables.ts)
 */

import { THEME_COLORS } from '../../config/theme.ts';
import {
  drawInkDot,
  drawInkStroke,
  type Canvas2DContext,
  type Point2D,
} from './inkBrush.ts';
import type { PRNG } from './rng.ts';

export interface CatenaryCableOptions {
  start: Point2D;
  end: Point2D;
  sag: number;
  baseWidth: number;
  rng: PRNG;
  structuralRng: PRNG;
  color?: string;
  tieTicks?: boolean;
}

export function drawCatenaryCable(
  ctx: Canvas2DContext,
  opts: CatenaryCableOptions,
): void {
  const {
    start,
    end,
    sag,
    baseWidth,
    rng,
    structuralRng,
    color = THEME_COLORS.ink,
    tieTicks = true,
  } = opts;

  const steps = 20;
  const pts: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = start[0] + (end[0] - start[0]) * t;
    const linearY = start[1] + (end[1] - start[1]) * t;
    const sagOffset = 4 * t * (1 - t) * sag;
    const jitter = (structuralRng.noise1D(t * 6.0) - 0.5) * 4.5;
    pts.push([x, linearY + sagOffset + jitter]);
  }

  drawInkStroke(ctx, pts, rng, {
    baseWidth,
    color,
    doubleChance: 0.45,
    dryBrush: baseWidth > 3.2,
    wobbleScale: 0.9,
  });

  if (tieTicks) {
    const tickIndices = [4, 9, 14, 17];
    for (const idx of tickIndices) {
      if (idx >= pts.length || structuralRng.chance(0.3)) continue;
      const [px, py] = pts[idx];
      drawInkDot(ctx, px, py, baseWidth * 0.75, rng, color);
      drawInkStroke(
        ctx,
        [
          [px - 3, py - 5],
          [px + 3, py + 6],
        ],
        rng,
        { baseWidth: Math.max(1.0, baseWidth * 0.45), color, doubleChance: 0 },
      );
    }
  }
}

export function drawCableBundle(
  ctx: Canvas2DContext,
  start: Point2D,
  end: Point2D,
  baseSag: number,
  cableCount: number,
  rng: PRNG,
  structuralRng: PRNG,
  maxWeight = 3.8,
): void {
  for (let c = 0; c < cableCount; c++) {
    const frac = c / Math.max(1, cableCount - 1);
    const startPt: Point2D = [
      start[0] + structuralRng.range(-12, 12),
      start[1] + c * 9,
    ];
    const endPt: Point2D = [
      end[0] + structuralRng.range(-12, 12),
      end[1] + c * 11,
    ];
    const sag = baseSag * (0.78 + frac * 0.48) + structuralRng.range(-8, 12);
    const weight = maxWeight * (1.0 - frac * 0.48);

    drawCatenaryCable(ctx, {
      start: startPt,
      end: endPt,
      sag,
      baseWidth: Math.max(1.3, weight),
      rng,
      structuralRng,
      tieTicks: c === 0 || c === cableCount - 1,
    });
  }
}
