/**
 * TWIN MONOLITH LAYER GENERATOR (src/scene/art/monolith.ts)
 *
 * Spec (B4.2):
 * - Two tall stone slabs, slightly misaligned, with irregular chipped silhouettes,
 *   heavy vertical hatching, thin tapered cracks, a solid-black shadow face with
 *   a dry-brush fringe, and a lit face that is nearly white with sparse hatch.
 * - Outlines are wobbly and partly doubled.
 * - Drawn in front of the upper-right black ink mass & red orb so they pop.
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

interface SlabSpec {
  baseX: number;
  topY: number;
  botY: number;
  litWidth: number;
  shadowWidth: number;
  tiltPx: number;
}

function drawMonolithSlab(
  ctx: Canvas2DContext,
  slab: SlabSpec,
  rng: PRNG,
  structuralRng: PRNG,
): void {
  const { baseX, topY, botY, litWidth, shadowWidth, tiltPx } = slab;

  // Build chipped left lit face polygon
  const litPoly: Point2D[] = [
    [baseX + tiltPx, topY + 12],
    [baseX + litWidth * 0.45 + tiltPx, topY - 4],
    [baseX + litWidth + tiltPx, topY + 6],
    // Chipped central ridge descending
    [baseX + litWidth + tiltPx * 0.65 - 3, topY + (botY - topY) * 0.34],
    [baseX + litWidth + tiltPx * 0.35 + 4, topY + (botY - topY) * 0.68],
    [baseX + litWidth, botY],
    [baseX, botY],
    // Chipped left outer edge ascending
    [baseX + tiltPx * 0.3 - 5, topY + (botY - topY) * 0.72],
    [baseX + tiltPx * 0.6 + 4, topY + (botY - topY) * 0.48],
    [baseX + tiltPx * 0.8 - 4, topY + (botY - topY) * 0.22],
  ];

  // Build right shadow face polygon
  const shadowPoly: Point2D[] = [
    [baseX + litWidth + tiltPx, topY + 6],
    [baseX + litWidth + shadowWidth + tiltPx, topY + 22],
    [baseX + litWidth + shadowWidth + tiltPx * 0.5 + 4, topY + (botY - topY) * 0.52],
    [baseX + litWidth + shadowWidth, botY],
    [baseX + litWidth, botY],
    [baseX + litWidth + tiltPx * 0.35 + 4, topY + (botY - topY) * 0.68],
    [baseX + litWidth + tiltPx * 0.65 - 3, topY + (botY - topY) * 0.34],
  ];

  // 1. Fill lit face with pure white paper so it pops against the dark sky mass
  fillRoughenedPolygon(ctx, litPoly, rng, THEME_COLORS.paperPure, 1.5);

  // 2. Fill shadow face with pure white first, then apply solid-black deepest core + heavy vertical hatching
  fillRoughenedPolygon(ctx, shadowPoly, rng, THEME_COLORS.paperPure, 1.5);

  // Solid-black shadow core on the right half of the shadow face with a dry-brush fringe
  const solidCorePoly: Point2D[] = [
    [baseX + litWidth + shadowWidth * 0.35 + tiltPx, topY + 14],
    [baseX + litWidth + shadowWidth + tiltPx, topY + 22],
    [baseX + litWidth + shadowWidth, botY],
    [baseX + litWidth + shadowWidth * 0.28, botY],
  ];
  fillRoughenedPolygon(ctx, solidCorePoly, rng, THEME_COLORS.ink, 2.2);

  // Dry-brush vertical fringe strokes along the shadow core transition
  for (let i = 0; i < 18; i++) {
    const fy = topY + 20 + (i / 18) * (botY - topY - 35);
    const fx =
      baseX +
      litWidth +
      shadowWidth * 0.32 +
      tiltPx * (1 - i / 18) +
      structuralRng.range(-6, 6);
    drawInkStroke(
      ctx,
      [
        [fx, fy],
        [fx + rng.range(-2, 2), fy + rng.range(24, 58)],
      ],
      rng,
      {
        baseWidth: rng.range(3.2, 6.2),
        dryBrush: true,
        doubleChance: 0.2,
      },
    );
  }

  // 3. Heavy vertical grain hatching on the shadow face (B3 directional logic: vertical slab faces get near-vertical hatching)
  hatchRegion(ctx, shadowPoly, rng, {
    angleRad: Math.PI * 0.5 + 0.03,
    baseSpacing: 5.2,
    baseWidth: 2.3,
    curvature: 0.03,
    toneAt: (u, v) => {
      return Math.min(1, 0.48 + u * 0.55 + v * 0.18);
    },
  });

  // 4. Sparse vertical weathered grain hatching on the lit face (mostly bright white, hatched near top/base & ridge)
  hatchRegion(ctx, litPoly, rng, {
    angleRad: Math.PI * 0.5 - 0.02,
    baseSpacing: 9.5,
    baseWidth: 1.65,
    curvature: 0.02,
    toneAt: (u, v) => {
      const nearRidge = Math.max(0, (u - 0.62) * 1.4);
      const nearBase = Math.max(0, (v - 0.76) * 1.8);
      const nearTop = Math.max(0, (0.18 - v) * 1.5);
      return Math.min(0.62, nearRidge + nearBase + nearTop);
    },
  });

  // 5. Delicate branching hairline fractures & horizontal stone joints across the lit face
  const crackSeeds = [0.22, 0.48, 0.74];
  for (let c = 0; c < crackSeeds.length; c++) {
    const cy0 = topY + (botY - topY) * crackSeeds[c];
    const fromLeft = c % 2 === 0;
    const cx0 = fromLeft ? baseX + 2 : baseX + litWidth - 2;
    const dir = fromLeft ? 1 : -1;
    const mainPts: Point2D[] = [
      [cx0, cy0],
      [cx0 + dir * litWidth * 0.28, cy0 + 4],
      [cx0 + dir * litWidth * 0.52, cy0 + 2],
      [cx0 + dir * litWidth * 0.68, cy0 + 8],
    ];
    drawInkStroke(ctx, mainPts, rng, {
      baseWidth: rng.range(1.1, 1.8),
      taperScale: 1.35,
      doubleChance: 0.15,
      wobbleScale: 0.75,
    });
    // Tiny secondary fork off the main fissure
    drawInkStroke(
      ctx,
      [
        mainPts[1],
        [mainPts[1][0] + dir * litWidth * 0.18, mainPts[1][1] - 7],
      ],
      rng,
      {
        baseWidth: 1.0,
        taperScale: 1.4,
        doubleChance: 0,
      },
    );
  }

  // 6. Wobbly, partly doubled hand-inked outlines around both faces
  outlinePolygonWithInk(ctx, litPoly, rng, {
    baseWidth: 4.2,
    doubleChance: 0.38,
    dryBrush: true,
  });
  outlinePolygonWithInk(ctx, shadowPoly, rng, {
    baseWidth: 4.5,
    doubleChance: 0.32,
    dryBrush: true,
  });
}


export function renderMonolithVariant(
  ctx: Canvas2DContext,
  width: number,
  height: number,
  rng: PRNG,
  structuralRng: PRNG,
): void {
  ctx.clearRect(0, 0, width, height);

  // Left taller slab & right slightly shorter/tilted twin slab flanking the Red Orb at x ~ 0.58
  const leftSlab: SlabSpec = {
    baseX: width * 0.495,
    topY: height * 0.14,
    botY: height * 0.66,
    litWidth: width * 0.038,
    shadowWidth: width * 0.026,
    tiltPx: -8,
  };

  const rightSlab: SlabSpec = {
    baseX: width * 0.592,
    topY: height * 0.19,
    botY: height * 0.67,
    litWidth: width * 0.033,
    shadowWidth: width * 0.024,
    tiltPx: 11,
  };

  drawMonolithSlab(ctx, leftSlab, rng, structuralRng);
  drawMonolithSlab(ctx, rightSlab, rng, structuralRng);
}

export function renderMonolithDepth(
  dctx: Canvas2DContext,
  width: number,
  height: number,
): void {
  dctx.fillStyle = THEME_COLORS.ink;
  dctx.fillRect(0, 0, width, height);

  dctx.fillStyle = THEME_COLORS.paperPure;
  dctx.fillRect(width * 0.48, height * 0.13, width * 0.08, height * 0.55);
  dctx.fillRect(width * 0.58, height * 0.18, width * 0.075, height * 0.51);
}
