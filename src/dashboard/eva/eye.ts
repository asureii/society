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
 * - Large, angled oval white negative-space eye (`THEME_COLORS.paperPure`) with
 *   hand-inked ragged orbital socket outline and berserk iris striations.
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
  const rx = W * 0.36;
  const ry = H * 0.21;
  const tilt = -0.22; // ~ -12.6 deg forward slant

  ctx.clearRect(0, 0, W, H);

  const poly: Point2D[] = [];
  const steps = 28;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    // Slight sharp tear-duct & outer corner pinch
    const cornerBoost = Math.pow(Math.abs(Math.cos(a)), 0.78) * Math.sign(Math.cos(a));
    const lx = cornerBoost * rx;
    const ly = Math.sin(a) * ry;
    const wx = cx + lx * Math.cos(tilt) - ly * Math.sin(tilt);
    const wy = cy + lx * Math.sin(tilt) + ly * Math.cos(tilt);
    poly.push([wx, wy]);
  }

  // Outer black socket rim
  fillRoughenedPolygon(ctx, poly, rng, THEME_COLORS.paperPure, 2.2);
  for (let i = 0; i < poly.length; i++) {
    const p0 = poly[i];
    const p1 = poly[(i + 1) % poly.length];
    drawInkStroke(ctx, [p0, p1], rng, {
      baseWidth: 3.4,
      color: THEME_COLORS.ink,
      wobbleScale: 0.9,
      doubleChance: 0.25,
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

  // Outer iris ring + solid black predatory pupil disc
  const pupilRadius = W * 0.13;
  drawInkDot(ctx, cx, cy, pupilRadius, rng, THEME_COLORS.ink);

  // Subtle white inner ring cleft so the pupil reads sharply
  drawInkDot(ctx, cx - 2, cy - 1, 2.2, rng, THEME_COLORS.paperPure);

  // Optional tiny red glint (<= 6px on screen) reflecting the target orb
  if (enableRedGlint) {
    drawInkDot(ctx, cx + pupilRadius * 0.42, cy - pupilRadius * 0.32, 4.2, rng, THEME_COLORS.red);
  }
}
