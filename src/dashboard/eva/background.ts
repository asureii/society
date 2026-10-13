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
 * - Faint hand-inked radial speed lines radiating from behind the Eva-01 head (`(340, 420)`)
 * - Sparse ink spatter behind the head
 * - Corner registration crop marks and hazard-stripe edge ticks
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

  // Pure paper background
  ctx.fillStyle = THEME_COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  // 1. Faint hand-inked radial speed lines behind the head
  const focusX = W * 0.31;
  const focusY = H * 0.43;
  const rayCount = 42;

  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + rng.range(-0.04, 0.04);
    // Keep the right widget rail region cleaner so text is super legible
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    if (cosA > 0.45 && Math.abs(sinA) < 0.75 && i % 2 === 0) continue;

    const rInner = rng.range(W * 0.24, W * 0.36);
    const rOuter = rng.range(W * 0.48, W * 0.72);
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
        baseWidth: rng.range(1.1, 2.1),
        color: THEME_COLORS.ink,
        wobbleScale: 0.75,
        taperScale: 1.2,
        doubleChance: 0.05,
        breakChance: 0.12,
      }
    );
  }

  recorder.captureStage(canvas, 0.02, 0.09, 'radial-out', [0.31, 0.43]);

  // 2. Sparse ink spatter behind the head & horn
  drawInkSpatterCluster(ctx, W * 0.18, H * 0.22, W * 0.12, 18, rng);
  drawInkSpatterCluster(ctx, W * 0.44, H * 0.28, W * 0.1, 14, rng);
  drawInkSpatterCluster(ctx, W * 0.46, H * 0.68, W * 0.11, 15, rng);

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

  // Hazard stripe ticks along top-left and bottom-left stage frame
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
