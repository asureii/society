import { THEME_COLORS } from '../../config/theme';
import { drawInkStroke, type Canvas2DContext } from '../../scene/art/inkBrush';
import { createRng } from '../../scene/art/rng';
import {
  drawInkSpatterCluster,
  type AnyCanvas,
  type EvaDrawOrderRecorder,
} from './evaSurface';

/**
 * Draws the dashboard white paper stage background (1024x1024):
 * - Faint hand-inked radial speed lines around the outer perimeter (keeping a clean paper halo
 *   around Eva-01's roaring maw, horn drip, and vertical jaw drips).
 * - Sparse ink spatter behind the shoulder pylons and head.
 * - Corner registration crop marks and hazard-stripe edge ticks.
 * Draw-order range: `0.02 .. 0.14`
 */
export function drawEvaStageBackground(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  recorder: EvaDrawOrderRecorder,
  seed = 701
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);

  ctx.fillStyle = THEME_COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  // 1. Faint hand-inked radial speed lines around the outer stage halo
  const focusX = W * 0.25;
  const focusY = H * 0.44;
  const rayCount = 34;

  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + rng.range(-0.03, 0.03);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    // Keep the open mouth, jaw drips, orb sight line, and right widget rail clean
    if (cosA > 0.18 && sinA > -0.55 && sinA < 0.72) continue;

    const rInner = rng.range(W * 0.34, W * 0.44);
    const rOuter = rng.range(W * 0.52, W * 0.74);
    const x0 = focusX + cosA * rInner;
    const y0 = focusY + sinA * rInner;
    const x1 = focusX + cosA * rOuter;
    const y1 = focusY + sinA * rOuter;

    drawInkStroke(
      ctx,
      [
        [x0, y0],
        [(x0 + x1) * 0.5, (y0 + y1) * 0.5],
        [x1, y1],
      ],
      rng,
      {
        baseWidth: rng.range(1.0, 1.8),
        color: THEME_COLORS.ink,
        wobbleScale: 0.65,
        taperScale: 1.25,
        doubleChance: 0.04,
        breakChance: 0.16,
      }
    );
  }

  recorder.captureStage(canvas, 0.02, 0.09, 'radial-out', [0.25, 0.44]);

  // 2. Sparse ink spatter behind the shoulder pylon & head crest
  drawInkSpatterCluster(ctx, W * 0.14, H * 0.22, W * 0.09, 12, rng);
  drawInkSpatterCluster(ctx, W * 0.32, H * 0.16, W * 0.08, 10, rng);

  // 3. Corner crop marks & thin hazard-stripe edge ticks along top/bottom left margin
  const m = 28;
  const tickLen = 22;
  const corners: Array<[number, number, number, number]> = [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ];
  for (const [cx, cy, sx, sy] of corners) {
    drawInkStroke(
      ctx,
      [
        [cx, cy + sy * tickLen],
        [cx, cy],
        [cx + sx * tickLen, cy],
      ],
      rng,
      {
        baseWidth: 2.2,
        color: THEME_COLORS.ink,
        wobbleScale: 0.6,
        doubleChance: 0,
      }
    );
  }

  for (let i = 0; i < 8; i++) {
    const xBase = 56 + i * 26;
    drawInkStroke(
      ctx,
      [
        [xBase, 18],
        [xBase - 10, 30],
      ],
      rng,
      { baseWidth: 2.8, color: THEME_COLORS.ink, wobbleScale: 0.5, doubleChance: 0 }
    );
  }

  recorder.captureStage(canvas, 0.09, 0.14, 'top-down');
}
