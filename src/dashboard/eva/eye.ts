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
 * Sharp, angular predatory visor slit slicing diagonally across beneath the armored brow plate.
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
  // Razor-sharp predatory angled visor slit
  // Slices diagonally down-forward: straight top edge under brow, needle corners
  const halfLen = W * 0.44;
  const halfH = H * 0.06; // sharp, narrow razor slit
  const tilt = 0.44; // ~25° diagonal slant down-forward

  // Local points along the needle visor polygon
  const localPts: Point2D[] = [
    // Outer upper corner (tucked under brow)
    [-halfLen * 0.95, -halfH * 0.6],
    // Mid top edge (straight line under brow overhang)
    [0, -halfH * 0.8],
    // Inner upper slope
    [halfLen * 0.70, -halfH * 0.6],
    // Needle sharp inner point
    [halfLen, 0],
    // Inner lower slope
    [halfLen * 0.70, halfH * 0.5],
    // Mid bottom edge
    [0, halfH * 0.8],
    // Outer lower corner
    [-halfLen * 0.85, halfH * 0.6],
    // Needle sharp outer point
    [-halfLen, 0],
  ];

  const poly: Point2D[] = localPts.map(([lx, ly]) => [
    cx + lx * Math.cos(tilt) - ly * Math.sin(tilt),
    cy + lx * Math.sin(tilt) + ly * Math.cos(tilt),
  ]);

  // Glowing pure paper-white sclera
  fillRoughenedPolygon(ctx, poly, rng, THEME_COLORS.paperPure, 0.3);

  // Sharp black razor perimeter edge
  for (let i = 0; i < poly.length; i++) {
    const p0 = poly[i];
    const p1 = poly[(i + 1) % poly.length];
    drawInkStroke(ctx, [p0, p1], rng, {
      baseWidth: 2.2,
      color: THEME_COLORS.ink,
      wobbleScale: 0.05,
      taperScale: 0.0,
      doubleChance: 0,
      breakChance: 0,
      imperfectJoin: false,
    });
  }
}

/**
 * Draws Eva-01 `pupil` layer (256x256 transparent canvas):
 * Sinister angled mechanical aperture slit that slides inside the razor visor.
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

  const pLen = W * 0.045;
  const pH = H * 0.065;
  const pTilt = 0.44;

  // Angled mechanical pupil aperture
  const pupilPoly: Point2D[] = [
    [-pLen, 0],
    [0, -pH],
    [pLen, 0],
    [0, pH],
  ].map(([lx, ly]) => [
    cx + lx * Math.cos(pTilt) - ly * Math.sin(pTilt),
    cy + lx * Math.sin(pTilt) + ly * Math.cos(pTilt),
  ]);
  fillRoughenedPolygon(ctx, pupilPoly, rng, THEME_COLORS.ink, 0.2);

  // Piercing glowing red core
  if (enableRedGlint) {
    drawInkDot(ctx, cx, cy, 4.5, rng, THEME_COLORS.red);
  }

  // Sharp white specular glint
  drawInkDot(ctx, cx - 2.5, cy - 2.0, 2.0, rng, THEME_COLORS.paperPure);
}
