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
 * Subtle peripheral ink drips located at bottom rear crop, keeping face and chin pristine.
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

  const { napeBot, collarCenter } = sk.joints;

  // Drips in H units placed at rear shoulder / bottom crop away from the face
  const columnsH: Array<[number, number, number, number]> = [
    // Rear shoulder bleed drip
    [napeBot[0] - 0.12, napeBot[1] + 0.18, napeBot[1] + 0.46, 2.2],
    // Collar underside drip
    [collarCenter[0] - 0.18, collarCenter[1] + 0.22, collarCenter[1] + 0.52, 2.0],
  ];

  for (const [xH, y0H, y1H, bw] of columnsH) {
    const p0 = hToPx([xH, y0H], W, sk);
    const pMid = hToPx([xH + rng.range(-0.003, 0.003), (y0H + y1H) * 0.5], W, sk);
    const p1 = hToPx([xH + rng.range(-0.003, 0.003), y1H], W, sk);

    drawInkStroke(ctx, [p0, pMid, p1], rng, {
      baseWidth: bw * s,
      color: THEME_COLORS.ink,
      wobbleScale: 0.25,
      taperScale: 1.25,
    });

    drawInkDot(ctx, p1[0], p1[1] + 5 * s, bw * s * 0.75, rng, THEME_COLORS.ink);
  }
}
