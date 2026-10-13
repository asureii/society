/**
 * MANGA SPEEDLINES & KINETIC FOCUS RAYS (src/scene/art/speedlines.ts)
 */

import { THEME_COLORS } from '../../config/theme';
import {
  drawInkStroke,
  type Canvas2DContext,
  type Point2D,
} from './inkBrush';
import type { PRNG } from './rng';

export interface RadialSpeedlineOptions {
  focus: Point2D;
  innerRadius: number;
  outerRadius: number;
  lineCount: number;
  rng: PRNG;
  angleStartRad?: number;
  angleEndRad?: number;
  baseWidth?: number;
  color?: string;
}

export function drawRadialSpeedlines(
  ctx: Canvas2DContext,
  opts: RadialSpeedlineOptions,
): void {
  const {
    focus,
    innerRadius,
    outerRadius,
    lineCount,
    rng,
    angleStartRad = 0,
    angleEndRad = Math.PI * 2,
    baseWidth = 2.2,
    color = THEME_COLORS.ink,
  } = opts;

  for (let i = 0; i < lineCount; i++) {
    const u = (i + rng.range(-0.35, 0.35)) / Math.max(1, lineCount);
    const theta = angleStartRad + u * (angleEndRad - angleStartRad);
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const rStart = innerRadius * rng.range(0.82, 1.32);
    const rEnd = outerRadius * rng.range(0.92, 1.08);
    if (rEnd <= rStart) continue;

    const p0: Point2D = [focus[0] + cos * rStart, focus[1] + sin * rStart];
    const p1: Point2D = [focus[0] + cos * rEnd, focus[1] + sin * rEnd];

    drawInkStroke(ctx, [p0, p1], rng, {
      baseWidth: baseWidth * rng.range(0.65, 1.45),
      color,
      taperScale: 1.4,
      wobbleScale: 0.45,
      doubleChance: 0.12,
      breakChance: 0.04,
    });
  }
}
