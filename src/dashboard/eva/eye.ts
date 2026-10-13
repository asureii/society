import { THEME_COLORS } from '../../config/theme.ts';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  type Canvas2DContext,
  type Point2D,
} from '../../scene/art/inkBrush.ts';
import { createRng } from '../../scene/art/rng.ts';
import type { AnyCanvas } from './evaSurface.ts';

/**
 * Draws Eva-01 `eye` sclera plate (256x256 transparent canvas):
 * Horizontal glowing white visor slit matching the reference brow visor.
 */
export function drawEvaEyeLayer(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  seed = 733
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);
  const cx = W * 0.5;
  const cy = H * 0.5;
  const rx = W * 0.40;
  const ry = H * 0.10;
  const tilt = 0.28; // tilted down-forward along predatory brow ridge

  ctx.clearRect(0, 0, W, H);

  // Sleek visor slit polygon
  const poly: Point2D[] = [];
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    // Tapered sharp corners at ends
    const cornerBoost = Math.pow(Math.abs(Math.cos(a)), 0.70) * Math.sign(Math.cos(a));
    const lx = cornerBoost * rx;
    const ly = Math.sin(a) * ry * (1.0 - 0.25 * Math.abs(cornerBoost));
    const wx = cx + lx * Math.cos(tilt) - ly * Math.sin(tilt);
    const wy = cy + lx * Math.sin(tilt) + ly * Math.cos(tilt);
    poly.push([wx, wy]);
  }

  fillRoughenedPolygon(ctx, poly, rng, THEME_COLORS.paperPure, 1.2);
  for (let i = 0; i < poly.length; i++) {
    const p0 = poly[i];
    const p1 = poly[(i + 1) % poly.length];
    drawInkStroke(ctx, [p0, p1], rng, {
      baseWidth: 2.4,
      color: THEME_COLORS.ink,
      wobbleScale: 0.45,
    });
  }
}

/**
 * Draws Eva-01 `pupil` layer (256x256 transparent canvas):
 * Black ink disc that slides within the eye, with optional red glint.
 */
export function drawEvaPupilLayer(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  enableRedGlint = true,
  seed = 739
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);
  const cx = W * 0.5;
  const cy = H * 0.5;

  ctx.clearRect(0, 0, W, H);

  const pupilRadius = W * 0.11;
  drawInkDot(ctx, cx, cy, pupilRadius, rng, THEME_COLORS.ink);

  if (enableRedGlint) {
    drawInkDot(ctx, cx + pupilRadius * 0.35, cy - pupilRadius * 0.25, 4.2, rng, THEME_COLORS.red);
  }
}
