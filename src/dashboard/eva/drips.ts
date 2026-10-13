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
 * - Slow looping vertical ink drips & beads aligned beneath the horn tip, upper teeth,
 *   and lower jaw chin spur.
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
    // Horn tip drip
    [276, 55, 220, 3.6],
    // Upper teeth / snout drips
    [612, 485, 620, 3.2],
    [715, 470, 595, 3.0],
    [775, 442, 585, 2.8],
    // Lower jaw & chin spur drips
    [682, 765, 965, 4.2],
    [720, 738, 920, 3.4],
    [595, 745, 910, 3.2],
    [535, 758, 935, 3.5],
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
        [x + rng.range(-2, 2) * s, midY],
        [x + rng.range(-2, 2) * s, sy1],
      ],
      rng,
      {
        baseWidth: w * s * 1.4,
        color: THEME_COLORS.ink,
        wobbleScale: 0.7,
        taperScale: 1.25,
        breakChance: 0.18,
      }
    );

    // Pooled terminal ink droplet bead
    drawInkDot(ctx, x, sy1 + 10 * s, w * s * 1.25, rng, THEME_COLORS.ink);
    drawInkDot(ctx, x + rng.range(-3, 3) * s, sy1 + 28 * s, w * s * 0.85, rng, THEME_COLORS.ink);
  }
}
