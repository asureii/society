import { THEME_COLORS } from '../../config/theme';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  type Canvas2DContext,
  type Point2D,
} from '../../scene/art/inkBrush';
import { createRng } from '../../scene/art/rng';
import type { AnyCanvas } from './evaSurface';

/**
 * Draws the Eva-01 `eye` sclera plate (256x256 transparent canvas):
 * -Stark, luminous white Berserk eye (`THEME_COLORS.paperPure`) matching the reference shadow
 *  silhouette's iconic glowing circular-almond eye, with a hand-inked ragged socket rim.
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
  const rx = W * 0.31;
  const ry = H * 0.26;
  const tilt = -0.14;

  ctx.clearRect(0, 0, W, H);

  const poly: Point2D[] = [];
  const steps = 28;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const cornerBoost = Math.pow(Math.abs(Math.cos(a)), 0.88) * Math.sign(Math.cos(a));
    const lx = cornerBoost * rx;
    const ly = Math.sin(a) * ry;
    const wx = cx + lx * Math.cos(tilt) - ly * Math.sin(tilt);
    const wy = cy + lx * Math.sin(tilt) + ly * Math.cos(tilt);
    poly.push([wx, wy]);
  }

  fillRoughenedPolygon(ctx, poly, rng, THEME_COLORS.paperPure, 1.8);
  for (let i = 0; i < poly.length; i++) {
    const p0 = poly[i];
    const p1 = poly[(i + 1) % poly.length];
    drawInkStroke(ctx, [p0, p1], rng, {
      baseWidth: 3.2,
      color: THEME_COLORS.ink,
      wobbleScale: 0.75,
      doubleChance: 0.2,
    });
  }
}

/**
 * Draws the Eva-01 `pupil` layer (256x256 transparent canvas):
 * - Predatory black ink disc (`THEME_COLORS.ink`) that slides within the eye
 * - Optional tiny `<= 6px` red glint (`THEME_COLORS.red`) reflecting the red orb (`eva.eyeGlint`)
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

  const pupilRadius = W * 0.115;
  drawInkDot(ctx, cx, cy, pupilRadius, rng, THEME_COLORS.ink);

  if (enableRedGlint) {
    drawInkDot(ctx, cx + pupilRadius * 0.38, cy - pupilRadius * 0.28, 4.4, rng, THEME_COLORS.red);
  }
}
