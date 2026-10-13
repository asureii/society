/**
 * AUTHORED MANGA SCREENTONE / HALFTONE GENERATOR (src/scene/art/screentone.ts)
 *
 * Draws jittered ink halftone dot patterns on white paper inside a clipped polygon.
 */

import { THEME_COLORS } from '../../config/theme';
import {
  drawInkDot,
  type Canvas2DContext,
  type Point2D,
} from './inkBrush';
import type { PRNG } from './rng';

export interface ScreentoneOptions {
  spacing?: number;
  maxRadius?: number;
  angleRad?: number;
  color?: string;
  toneAt?: (u: number, v: number) => number;
}

export function drawScreentone(
  ctx: Canvas2DContext,
  polygon: Point2D[],
  rng: PRNG,
  options: ScreentoneOptions = {},
): void {
  if (polygon.length < 3) return;

  const {
    spacing = 10,
    maxRadius = 2.8,
    angleRad = Math.PI * 0.25,
    color = THEME_COLORS.ink,
    toneAt = () => 0.5,
  } = options;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const diag = Math.hypot(w, h) * 0.65;

  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i][0], polygon[i][1]);
  }
  ctx.closePath();
  ctx.clip();

  for (let gx = -diag; gx <= diag; gx += spacing) {
    for (let gy = -diag; gy <= diag; gy += spacing) {
      const px = cx + gx * cos - gy * sin + rng.range(-spacing * 0.14, spacing * 0.14);
      const py = cy + gx * sin + gy * cos + rng.range(-spacing * 0.14, spacing * 0.14);

      if (px < minX || px > maxX || py < minY || py > maxY) continue;

      const u = (px - minX) / w;
      const v = (py - minY) / h;
      const tone = Math.max(0, Math.min(1, toneAt(u, v)));
      if (tone < 0.08) continue;

      const r = maxRadius * Math.pow(tone, 0.75) * rng.range(0.85, 1.15);
      if (r >= 0.7) {
        drawInkDot(ctx, px, py, r, rng, color);
      }
    }
  }

  ctx.restore();
}
