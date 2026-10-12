/**
 * FOREGROUND ROCKS & DRIFTING DEBRIS GENERATOR (src/scene/art/foreground.ts)
 *
 * Spec (B4.6 & C2):
 * - Large cropped rocks in the bottom-right corner and far-left/right upper edges
 *   with heavy ink, dry-brush texture, and hatching, plus a few tiny drifting debris fragments.
 * - Leaves bottom-left (x < 0.38, y > 0.45) completely open for the unboxed hero typography
 *   and center (x: 0.28..0.78, y: 0.12..0.78) completely open for the Stage Focal Rect.
 */

import { THEME_COLORS } from '../../config/theme';
import { hatchRegion } from './hatch';
import {
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Canvas2DContext,
  type Point2D,
} from './inkBrush';
import type { PRNG } from './rng';

export function renderForegroundVariant(
  ctx: Canvas2DContext,
  width: number,
  height: number,
  rng: PRNG,
  structuralRng: PRNG,
): void {
  ctx.clearRect(0, 0, width, height);

  // 1. Large cropped jagged rock mass in the bottom-right corner (x: 0.80..1.0, y: 0.72..1.0)
  const rightCornerRock: Point2D[] = [
    [width * 0.81, height],
    [width * 0.84, height * 0.82],
    [width * 0.91, height * 0.74],
    [width * 0.96, height * 0.76],
    [width, height * 0.68],
    [width, height],
  ];

  fillRoughenedPolygon(ctx, rightCornerRock, rng, THEME_COLORS.paperPure, 2.2);

  // Solid ink core in the deepest lower-right corner
  const rightSolidCore: Point2D[] = [
    [width * 0.89, height],
    [width * 0.93, height * 0.82],
    [width, height * 0.76],
    [width, height],
  ];
  fillRoughenedPolygon(ctx, rightSolidCore, rng, THEME_COLORS.ink, 2.5);

  hatchRegion(ctx, rightCornerRock, rng, {
    angleRad: -Math.PI * 0.32,
    baseSpacing: 5.5,
    baseWidth: 2.8,
    curvature: 0.06,
    toneAt: (u, v) => 0.45 + u * 0.45 + v * 0.25,
  });

  outlinePolygonWithInk(ctx, rightCornerRock, rng, {
    baseWidth: 5.8,
    dryBrush: true,
    doubleChance: 0.4,
  });

  // 2. Small cropped rock outcropping at the very bottom-left corner toe (x: 0..0.11, y: 0.90..1.0)
  // Kept below y=0.90 so it frames the corner without touching the bottom-left hero title block
  const leftToeRock: Point2D[] = [
    [0, height * 0.9],
    [width * 0.05, height * 0.91],
    [width * 0.095, height * 0.96],
    [width * 0.11, height],
    [0, height],
  ];
  fillRoughenedPolygon(ctx, leftToeRock, rng, THEME_COLORS.ink, 2.0);
  outlinePolygonWithInk(ctx, leftToeRock, rng, {
    baseWidth: 5.0,
    dryBrush: true,
    doubleChance: 0.3,
  });

  // 3. A few tiny drifting angular stone debris fragments near the outer margins
  const debrisSpecs = [
    { cx: width * 0.86, cy: height * 0.56, r: 14 },
    { cx: width * 0.91, cy: height * 0.46, r: 10 },
    { cx: width * 0.83, cy: height * 0.64, r: 8 },
    { cx: width * 0.14, cy: height * 0.24, r: 11 },
    { cx: width * 0.18, cy: height * 0.19, r: 7 },
  ];

  for (const d of debrisSpecs) {
    const pts: Point2D[] = [
      [d.cx - d.r, d.cy],
      [d.cx - d.r * 0.3, d.cy - d.r * 0.8],
      [d.cx + d.r * 0.9, d.cy - d.r * 0.4],
      [d.cx + d.r * 0.7, d.cy + d.r * 0.7],
      [d.cx - d.r * 0.4, d.cy + d.r * 0.6],
    ];
    fillRoughenedPolygon(ctx, pts, rng, THEME_COLORS.paperPure, 1.2);
    hatchRegion(ctx, pts, rng, {
      angleRad: Math.PI * 0.4,
      baseSpacing: 4.5,
      baseWidth: 1.8,
      toneAt: (u) => 0.35 + u * 0.6,
    });
    outlinePolygonWithInk(ctx, pts, rng, {
      baseWidth: 3.2,
      doubleChance: 0.25,
      dryBrush: true,
    });

    // Motion trail tick beneath drifting fragment
    const trailLen = structuralRng.range(14, 28);
    drawInkStroke(
      ctx,
      [
        [d.cx, d.cy + d.r],
        [d.cx - 4, d.cy + d.r + trailLen],
      ],
      rng,
      { baseWidth: 1.4, taperScale: 1.2, breakChance: 0.15 },
    );
  }
}

export function renderForegroundDepth(
  dctx: Canvas2DContext,
  width: number,
  height: number,
): void {
  dctx.fillStyle = THEME_COLORS.ink;
  dctx.fillRect(0, 0, width, height);
  dctx.fillStyle = THEME_COLORS.paperPure;
  dctx.fillRect(width * 0.8, height * 0.68, width * 0.2, height * 0.32);
}
