/**
 * FAR SKY LAYER GENERATOR (src/scene/art/sky.ts)
 *
 * Spec (B4.1 & C2):
 * - Mostly pure white negative space (>= 80% white paper) so the left ~35% and lower viewport remain open.
 * - One dramatic black ink mass in the upper-right with a torn, ragged edge (domain-warped fbm threshold),
 *   white speckle holes of varied sizes, and splatter + vertical ink drips along the boundary.
 * - 4 thin, tapered, curved wind / atmospheric lines sweeping across the upper sky.
 */

import { THEME_COLORS } from '../../config/theme';
import {
  drawInkDot,
  drawInkStroke,
  type Canvas2DContext,
  type Point2D,
} from './inkBrush';
import type { PRNG } from './rng';

export function renderSkyVariant(
  ctx: Canvas2DContext,
  width: number,
  height: number,
  rng: PRNG,
  structuralRng: PRNG,
): void {
  // Base warm white paper
  ctx.fillStyle = THEME_COLORS.paper;
  ctx.fillRect(0, 0, width, height);

  // Build upper-right ragged black ink mass polygon using domain-warped fbm
  // Starts at x = 44% on the top edge (y = 0) and sweeps diagonally to y ~ 42% on the right edge
  const startX = width * 0.44;
  const poly: Point2D[] = [
    [startX, 0],
    [width, 0],
    [width, height * 0.44],
  ];

  const steps = 64;
  for (let i = steps; i >= 0; i--) {
    const u = i / steps;
    const x = startX + u * (width - startX);
    // Smoothly grows from y=0 at u=0 so there is never a vertical left cutoff
    const envelope = Math.pow(u, 0.85);
    const baseBoundaryY =
      height * (0.41 * envelope + Math.sin(u * Math.PI) * 0.06 * envelope);
    const warp = (structuralRng.fbm2D(u * 4.5, 1.8, 4) - 0.5) * Math.min(1, u * 3.0);
    const fineJagged = (rng.noise1D(u * 28.0) - 0.5) * height * 0.028 * Math.min(1, u * 4.0);
    const y = Math.max(0, baseBoundaryY + warp * height * 0.14 + fineJagged);
    poly.push([x, y]);
  }

  ctx.fillStyle = THEME_COLORS.ink;
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) {
    ctx.lineTo(poly[i][0], poly[i][1]);
  }
  ctx.closePath();
  ctx.fill();

  // Hand-inked ragged brush strokes, drips, and splatter along the torn boundary
  for (let i = 3; i < poly.length - 1; i++) {
    const pt = poly[i];
    const nextPt = poly[i + 1];
    drawInkStroke(ctx, [pt, nextPt], rng, {
      baseWidth: rng.range(3.5, 7.5),
      color: THEME_COLORS.ink,
      dryBrush: true,
      doubleChance: 0.35,
    });

    // Occasional vertical ink drips hanging from the ragged cloud edge
    if (structuralRng.chance(0.24)) {
      const dripLen = structuralRng.range(16, 62);
      drawInkStroke(
        ctx,
        [
          [pt[0], pt[1] - 4],
          [pt[0] + rng.range(-3, 3), pt[1] + dripLen],
        ],
        rng,
        {
          baseWidth: rng.range(1.8, 3.6),
          taperScale: 1.15,
          doubleChance: 0.1,
        },
      );
      if (rng.chance(0.65)) {
        drawInkDot(
          ctx,
          pt[0] + rng.range(-4, 4),
          pt[1] + dripLen + rng.range(4, 12),
          rng.range(1.6, 3.8),
          rng,
          THEME_COLORS.ink,
        );
      }
    }

    // Splatter cluster near the torn boundary
    for (let s = 0; s < 3; s++) {
      if (rng.chance(0.55)) {
        drawInkDot(
          ctx,
          pt[0] + rng.range(-26, 26),
          pt[1] + rng.range(-12, 34),
          rng.range(1.1, 4.2),
          rng,
          THEME_COLORS.ink,
        );
      }
    }
  }

  // White speckle holes of varied sizes inside the black ink mass
  for (let h = 0; h < 95; h++) {
    const u = structuralRng.range(0.08, 0.98);
    const hx = startX + u * (width - startX);
    const maxY = height * (0.05 + 0.38 * u);
    const hy = structuralRng.range(8, Math.max(18, maxY));
    const hr = structuralRng.chance(0.18)
      ? structuralRng.range(4.5, 11.0)
      : structuralRng.range(1.2, 3.8);
    drawInkDot(ctx, hx + rng.range(-1.5, 1.5), hy + rng.range(-1.5, 1.5), hr, rng, THEME_COLORS.paperPure);
  }

  // 4 thin, tapered, curved wind lines sweeping across the upper sky
  const windCount = 4;
  for (let w = 0; w < windCount; w++) {
    const startWX = width * (0.14 + w * 0.17);
    const startWY = height * (0.11 + (w % 2) * 0.09);
    const spanW = width * (0.22 + (w % 3) * 0.06);
    const curvePts: Point2D[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const wx = startWX + t * spanW;
      const wy = startWY - Math.sin(t * Math.PI) * 22 + t * 14;
      curvePts.push([wx, wy]);
    }
    drawInkStroke(ctx, curvePts, rng, {
      baseWidth: rng.range(1.4, 2.4),
      taperScale: 1.2,
      doubleChance: 0.2,
      breakChance: 0.06,
    });
  }
}

export function renderSkyDepth(
  dctx: Canvas2DContext,
  width: number,
  height: number,
): void {
  const grad = dctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, THEME_COLORS.ink);
  grad.addColorStop(1, THEME_COLORS.paperPure);
  dctx.fillStyle = grad;
  dctx.fillRect(0, 0, width, height);
}
