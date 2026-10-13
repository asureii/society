import { THEME_COLORS } from '../../config/theme.ts';
import {
  drawInkDot,
  drawInkStroke,
  type Canvas2DContext,
} from '../../scene/art/inkBrush.ts';
import { createRng } from '../../scene/art/rng.ts';
import type { AnyCanvas } from './evaSurface.ts';
import { EVA_SKELETON, hToPx } from './skeleton.ts';

/**
 * Draws Eva-01 `drips` layer (512x512 transparent canvas):
 * Vertical ink drips hanging from the sharp chin guard and mandible.
 */
export function drawEvaDripsLayer(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  seed = 743
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);
  const sk = EVA_SKELETON;
  const s = W / 1024;

  ctx.clearRect(0, 0, W, H);

  const { jawTip } = sk.joints;

  // Drips in H units: [xH, startYH, endYH, widthPx]
  const columnsH: Array<[number, number, number, number]> = [
    // Main long drip hanging from the chin tip
    [jawTip[0] - 0.04, jawTip[1] + 0.06, jawTip[1] + 0.52, 3.0],
    // Mid mandible drip
    [jawTip[0] - 0.22, jawTip[1] - 0.02, jawTip[1] + 0.32, 2.4],
    // Rear throat/jaw junction drip
    [jawTip[0] - 0.42, jawTip[1] - 0.14, jawTip[1] + 0.18, 2.0],
  ];

  for (const [xH, y0H, y1H, bw] of columnsH) {
    const p0 = hToPx([xH, y0H], W, sk);
    const pMid = hToPx([xH + rng.range(-0.004, 0.004), (y0H + y1H) * 0.5], W, sk);
    const p1 = hToPx([xH + rng.range(-0.004, 0.004), y1H], W, sk);

    drawInkStroke(ctx, [p0, pMid, p1], rng, {
      baseWidth: bw * s * 1.15,
      color: THEME_COLORS.ink,
      wobbleScale: 0.35,
      taperScale: 1.35,
      breakChance: 0.12,
    });

    drawInkDot(ctx, p1[0], p1[1] + 7 * s, bw * s * 0.85, rng, THEME_COLORS.ink);
    drawInkDot(ctx, p1[0], p1[1] + 20 * s, bw * s * 0.55, rng, THEME_COLORS.ink);
  }
}
