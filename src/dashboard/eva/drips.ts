import { THEME_COLORS } from '../../config/theme';
import {
  drawInkDot,
  drawInkStroke,
  type Canvas2DContext,
} from '../../scene/art/inkBrush';
import { createRng } from '../../scene/art/rng';
import type { AnyCanvas } from './evaSurface';

/**
 * Draws the Eva-01 `drips` layer (512x512 transparent canvas):
 * - Slow looping vertical ink drips & beads aligned beneath the forward-swept horn (`x = 674`),
 *   upper fangs (`x = 576`), and hyper-extended lower jaw (`x = 696, 608, 532, 444`).
 */
export function drawEvaDripsLayer(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  seed = 743
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);
  const s = W / 1024;

  ctx.clearRect(0, 0, W, H);

  // Drip columns in 1024-normalized coordinates: [x, startY, endY, width]
  const columns: Array<[number, number, number, number]> = [
    // Horn underside vertical drip
    [674, 118, 254, 3.0],
    // Upper fangs mouth-cavity vertical strand
    [576, 358, 482, 3.2],
    // Extended lower mandible & chin spike long vertical drips
    [696, 624, 712, 3.0],
    [608, 558, 812, 3.8],
    [532, 526, 622, 2.8],
    [444, 528, 654, 3.0],
  ];

  for (const [dx, y0, y1, w] of columns) {
    const x = dx * s;
    const sy0 = y0 * s;
    const sy1 = y1 * s;
    const midY = (sy0 + sy1) * 0.5;

    drawInkStroke(
      ctx,
      [
        [x, sy0],
        [x + rng.range(-1, 1) * s, midY],
        [x + rng.range(-1, 1) * s, sy1],
      ],
      rng,
      {
        baseWidth: w * s * 1.25,
        color: THEME_COLORS.ink,
        wobbleScale: 0.45,
        taperScale: 1.35,
        breakChance: 0.14,
      }
    );

    drawInkDot(ctx, x, sy1 + 9 * s, w * s * 0.95, rng, THEME_COLORS.ink);
    drawInkDot(ctx, x, sy1 + 24 * s, w * s * 0.65, rng, THEME_COLORS.ink);
  }
}
