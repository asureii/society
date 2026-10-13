/**
 * STEPPING-STONE PATH LAYER GENERATOR (src/scene/art/path.ts)
 *
 * Spec (B4.5, Part B1, & Part E5):
 * - Slabs in forced perspective receding toward the Twin Monolith (x ~ 0.56) from center-right.
 * - Keeps the left ~35% of the lower viewport open white/ground for the unboxed hero typography.
 * - Each slab is an irregular chipped quad with slight random rotation, a nearly white top,
 *   a densely vertical-hatched front face, and a cast shadow on the ground.
 * - Subtle cracked-ground fissures, horizontal ground hatching, and pebble stipple between stones.
 */

import { THEME_COLORS } from '../../config/theme';
import { hatchRegion } from './hatch';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Canvas2DContext,
  type Point2D,
} from './inkBrush';
import type { PRNG } from './rng';

export function renderPathVariant(
  ctx: Canvas2DContext,
  width: number,
  height: number,
  rng: PRNG,
  structuralRng: PRNG,
): void {
  ctx.clearRect(0, 0, width, height);

  const vanishX = width * 0.555;
  const vanishY = height * 0.615;
  const stoneCount = 8;

  // Draw from furthest stone to nearest stone so near stones overlap naturally
  for (let idx = stoneCount - 1; idx >= 0; idx--) {
    // Normalized depth parameter d: 0 = nearest bottom, 1 = furthest near monolith base
    const d = idx / (stoneCount - 1);
    const persp = Math.pow(1.0 - d * 0.78, 1.75);

    // S-curve winding across the ground plane from bottom-center-right (x=0.63) toward vanishX (x=0.555)
    // Never intrudes into x < 0.38 so lower-left stays clean for hero typography
    const centerX =
      vanishX +
      (width * 0.63 - vanishX) * persp +
      Math.sin(d * Math.PI * 1.85) * width * 0.055 * (0.25 + 0.75 * persp);
    const centerY = vanishY + (height * 0.94 - vanishY) * persp;

    const slabW = width * 0.195 * persp + 20;
    const topDepthH = height * 0.024 * persp + 3.5;
    const frontThicknessH = height * 0.016 * persp + 2.5;

    const tilt = structuralRng.range(-0.032, 0.032);
    const chipL = structuralRng.range(-7, 7) * persp;
    const chipR = structuralRng.range(-7, 7) * persp;

    // 1. Cracked-ground hatching & fissure lines in the gap between stones (Part B1)
    const groundGapPoly: Point2D[] = [
      [centerX - slabW * 0.68, centerY + frontThicknessH],
      [centerX + slabW * 0.68, centerY + frontThicknessH],
      [centerX + slabW * 0.62, centerY + frontThicknessH + 18 * persp + 3],
      [centerX - slabW * 0.62, centerY + frontThicknessH + 18 * persp + 3],
    ];
    hatchRegion(ctx, groundGapPoly, rng, {
      angleRad: 0.02,
      baseSpacing: Math.max(4.0, 8.2 * persp),
      baseWidth: Math.max(1.0, 1.8 * persp),
      curvature: 0.03,
      toneAt: (u, v) => (1.0 - v) * Math.sin(u * Math.PI) * 0.65,
    });

    // Branching ground crack between stepping stones
    if (idx > 0 && idx <= 6) {
      const gx = centerX + structuralRng.range(-slabW * 0.38, slabW * 0.38);
      const gy = centerY + frontThicknessH + 4 * persp;
      const crackPts: Point2D[] = [
        [gx, gy],
        [gx + 16 * persp, gy + 5 * persp],
        [gx + 34 * persp, gy + 2 * persp],
        [gx + 48 * persp, gy + 7 * persp],
      ];
      drawInkStroke(ctx, crackPts, rng, {
        baseWidth: Math.max(1.0, 1.7 * persp),
        taperScale: 1.3,
        wobbleScale: 0.65,
        doubleChance: 0.1,
      });
      // Forked sub-crack
      drawInkStroke(
        ctx,
        [
          crackPts[1],
          [crackPts[1][0] + 10 * persp, crackPts[1][1] + 7 * persp],
        ],
        rng,
        { baseWidth: Math.max(0.9, 1.2 * persp), taperScale: 1.35, doubleChance: 0 },
      );

      // Small gravel stipple dots around the crack
      for (let p = 0; p < 4; p++) {
        drawInkDot(
          ctx,
          gx + structuralRng.range(-12, 42) * persp,
          gy + structuralRng.range(-2, 11) * persp,
          Math.max(0.9, rng.range(1.1, 2.2) * persp),
          rng,
          THEME_COLORS.ink,
        );
      }
    }

    // 2. Cast shadow polygon under front-right of stone
    const shadowPoly: Point2D[] = [
      [centerX - slabW * 0.47, centerY + frontThicknessH - 1],
      [centerX + slabW * 0.53, centerY + frontThicknessH - 1],
      [centerX + slabW * 0.56 + 11 * persp, centerY + frontThicknessH + 8 * persp + 2],
      [centerX - slabW * 0.43 + 6 * persp, centerY + frontThicknessH + 7 * persp + 2],
    ];
    fillRoughenedPolygon(ctx, shadowPoly, rng, THEME_COLORS.ink, 1.2);

    // 3. Irregular chipped 6-point flagstone top face (nearly pure white)
    const topPoly: Point2D[] = [
      [centerX - slabW * 0.44 + chipL, centerY - topDepthH + tilt * slabW],
      [centerX, centerY - topDepthH * 1.08],
      [centerX + slabW * 0.44 + chipR, centerY - topDepthH - tilt * slabW],
      [centerX + slabW * 0.5, centerY - tilt * slabW * 0.8],
      [centerX + slabW * 0.12, centerY + 1.5 * persp],
      [centerX - slabW * 0.5, centerY + tilt * slabW * 0.8],
    ];

    // 4. Front vertical stone face quad (densely vertical-hatched per B4.5)
    const frontPoly: Point2D[] = [
      topPoly[5],
      topPoly[4],
      topPoly[3],
      [topPoly[3][0] - 2.5 * persp, topPoly[3][1] + frontThicknessH],
      [topPoly[4][0], topPoly[4][1] + frontThicknessH],
      [topPoly[5][0] + 2.5 * persp, topPoly[5][1] + frontThicknessH],
    ];

    fillRoughenedPolygon(ctx, topPoly, rng, THEME_COLORS.paperPure, 1.3);
    fillRoughenedPolygon(ctx, frontPoly, rng, THEME_COLORS.paperPure, 1.3);

    // Dense vertical hatching on the front stone face
    hatchRegion(ctx, frontPoly, rng, {
      angleRad: Math.PI * 0.5 + tilt,
      baseSpacing: Math.max(3.8, 5.8 * persp),
      baseWidth: Math.max(1.4, 2.3 * persp),
      curvature: 0.02,
      toneAt: (u, v) => 0.58 + u * 0.35 + v * 0.2,
    });

    // Very sparse edge weathering on the right 15% of the stone top face
    hatchRegion(ctx, topPoly, rng, {
      angleRad: tilt,
      baseSpacing: Math.max(5.5, 11.0 * persp),
      baseWidth: Math.max(1.1, 1.6 * persp),
      curvature: 0.02,
      toneAt: (u) => Math.max(0, (u - 0.78) * 1.9),
    });

    // Chipped surface crack on larger foreground slabs
    if (idx <= 4) {
      const cx0 = centerX + structuralRng.range(-slabW * 0.2, slabW * 0.2);
      const cy0 = centerY - topDepthH * 0.45;
      drawInkStroke(
        ctx,
        [
          [cx0, cy0],
          [cx0 + 14 * persp, cy0 + 4 * persp],
          [cx0 + 26 * persp, cy0 + 1 * persp],
        ],
        rng,
        {
          baseWidth: Math.max(1.2, 2.0 * persp),
          taperScale: 1.2,
          doubleChance: 0.15,
        },
      );
    }

    // Hand-inked variable-width outlines with corner overshoots
    const strokeW = Math.max(2.0, 4.2 * persp);
    outlinePolygonWithInk(ctx, topPoly, rng, {
      baseWidth: strokeW,
      doubleChance: 0.3,
      dryBrush: idx <= 2,
    });
    outlinePolygonWithInk(ctx, frontPoly, rng, {
      baseWidth: strokeW,
      doubleChance: 0.25,
      dryBrush: idx <= 2,
    });
  }
}

export function renderPathDepth(
  dctx: Canvas2DContext,
  width: number,
  height: number,
): void {
  const grad = dctx.createLinearGradient(0, height * 0.35, 0, height);
  grad.addColorStop(0, THEME_COLORS.ink);
  grad.addColorStop(1, THEME_COLORS.paperPure);
  dctx.fillStyle = grad;
  dctx.fillRect(0, 0, width, height);
}
