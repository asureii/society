/**
 * ARCHITECTURAL PRIMITIVES HELPER (src/scene/art/architecture.ts)
 *
 * Provides reusable hand-inked architectural elements:
 * - Chipped stone slabs & monolith blocks (`drawChippedSlab`)
 * - Bird's-eye rooftop blocks with hard black cast-shadow wedges (`drawRooftopBlock`)
 * - Broken stone arches & viaducts (`drawBrokenArch`)
 * - Monumental stone threshold doorframes (`drawThresholdDoorframe`)
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

export interface ChippedSlabOptions {
  x: number;
  topY: number;
  botY: number;
  litWidth: number;
  shadowWidth: number;
  tiltPx?: number;
  hatchAngleRad?: number;
}

export function drawChippedSlab(
  ctx: Canvas2DContext,
  slab: ChippedSlabOptions,
  rng: PRNG,
  structuralRng: PRNG,
): void {
  const {
    x,
    topY,
    botY,
    litWidth,
    shadowWidth,
    tiltPx = 0,
    hatchAngleRad = Math.PI * 0.5,
  } = slab;

  const h = botY - topY;
  const litPoly: Point2D[] = [
    [x + tiltPx, topY + 8],
    [x + litWidth * 0.48 + tiltPx, topY - 3],
    [x + litWidth + tiltPx, topY + 5],
    [x + litWidth + tiltPx * 0.65 - 2, topY + h * 0.35],
    [x + litWidth + tiltPx * 0.3 + 3, topY + h * 0.68],
    [x + litWidth, botY],
    [x, botY],
    [x + tiltPx * 0.3 - 4, topY + h * 0.72],
    [x + tiltPx * 0.65 + 3, topY + h * 0.42],
  ];

  const shadowPoly: Point2D[] = [
    [x + litWidth + tiltPx, topY + 5],
    [x + litWidth + shadowWidth + tiltPx, topY + 18],
    [x + litWidth + shadowWidth + tiltPx * 0.5 + 3, topY + h * 0.52],
    [x + litWidth + shadowWidth, botY],
    [x + litWidth, botY],
    [x + litWidth + tiltPx * 0.3 + 3, topY + h * 0.68],
    [x + litWidth + tiltPx * 0.65 - 2, topY + h * 0.35],
  ];

  fillRoughenedPolygon(ctx, litPoly, rng, THEME_COLORS.paperPure, 1.4);
  fillRoughenedPolygon(ctx, shadowPoly, rng, THEME_COLORS.paperPure, 1.4);

  const solidCore: Point2D[] = [
    [x + litWidth + shadowWidth * 0.38 + tiltPx, topY + 12],
    [x + litWidth + shadowWidth + tiltPx, topY + 18],
    [x + litWidth + shadowWidth, botY],
    [x + litWidth + shadowWidth * 0.3, botY],
  ];
  fillRoughenedPolygon(ctx, solidCore, rng, THEME_COLORS.ink, 2.0);

  hatchRegion(ctx, shadowPoly, rng, {
    angleRad: hatchAngleRad + 0.03,
    baseSpacing: 5.2,
    baseWidth: 2.2,
    curvature: 0.02,
    toneAt: (u, v) => Math.min(1, 0.48 + u * 0.5 + v * 0.18),
  });

  hatchRegion(ctx, litPoly, rng, {
    angleRad: hatchAngleRad - 0.02,
    baseSpacing: 9.5,
    baseWidth: 1.5,
    curvature: 0.02,
    toneAt: (u, v) => {
      const nearRidge = Math.max(0, (u - 0.65) * 1.3);
      const nearBase = Math.max(0, (v - 0.78) * 1.6);
      return Math.min(0.55, nearRidge + nearBase);
    },
  });

  const crackY = topY + h * structuralRng.range(0.28, 0.68);
  drawInkStroke(
    ctx,
    [
      [x + 2, crackY],
      [x + litWidth * 0.45, crackY + 5],
      [x + litWidth * 0.75, crackY + 1],
    ],
    rng,
    { baseWidth: 1.3, taperScale: 1.3, doubleChance: 0.15 },
  );

  outlinePolygonWithInk(ctx, litPoly, rng, {
    baseWidth: 3.8,
    doubleChance: 0.35,
    dryBrush: true,
  });
  outlinePolygonWithInk(ctx, shadowPoly, rng, {
    baseWidth: 4.0,
    doubleChance: 0.3,
    dryBrush: true,
  });
}

export interface RooftopBlockOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  extrudeX: number;
  extrudeY: number;
  stepped?: boolean;
  highlightRed?: boolean;
}

export function drawRooftopBlock(
  ctx: Canvas2DContext,
  block: RooftopBlockOptions,
  rng: PRNG,
  structuralRng: PRNG,
): void {
  const { x, y, w, h, extrudeX, extrudeY, stepped = false, highlightRed = false } = block;

  const topPoly: Point2D[] = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];

  const rightFace: Point2D[] = [
    [x + w, y],
    [x + w + extrudeX, y + extrudeY],
    [x + w + extrudeX, y + h + extrudeY],
    [x + w, y + h],
  ];

  const bottomFace: Point2D[] = [
    [x, y + h],
    [x + w, y + h],
    [x + w + extrudeX, y + h + extrudeY],
    [x + extrudeX, y + h + extrudeY],
  ];

  const shadowWedge: Point2D[] = [
    [x + w + extrudeX, y + extrudeY],
    [x + w + extrudeX * 1.75, y + extrudeY * 1.55],
    [x + w + extrudeX * 1.75, y + h + extrudeY * 1.55],
    [x + extrudeX * 1.4, y + h + extrudeY * 1.55],
    [x + extrudeX, y + h + extrudeY],
    [x + w + extrudeX, y + h + extrudeY],
  ];
  fillRoughenedPolygon(ctx, shadowWedge, rng, THEME_COLORS.ink, 1.6);

  fillRoughenedPolygon(ctx, rightFace, rng, THEME_COLORS.paperPure, 1.2);
  fillRoughenedPolygon(ctx, bottomFace, rng, THEME_COLORS.paperPure, 1.2);

  hatchRegion(ctx, rightFace, rng, {
    angleRad: Math.PI * 0.5,
    baseSpacing: 4.8,
    baseWidth: 2.0,
    toneAt: (u, v) => 0.62 + u * 0.3 + v * 0.15,
  });

  hatchRegion(ctx, bottomFace, rng, {
    angleRad: 0.25,
    baseSpacing: 5.5,
    baseWidth: 1.8,
    toneAt: (u, v) => 0.45 + v * 0.4 + u * 0.15,
  });

  fillRoughenedPolygon(ctx, topPoly, rng, THEME_COLORS.paperPure, 1.3);

  hatchRegion(ctx, topPoly, rng, {
    angleRad: -Math.PI * 0.25,
    baseSpacing: 9.0,
    baseWidth: 1.3,
    toneAt: (u, v) => Math.max(0, (u - 0.72) * 1.4 + (v - 0.72) * 1.2),
  });

  const strokeColor = highlightRed ? THEME_COLORS.red : THEME_COLORS.ink;
  outlinePolygonWithInk(ctx, rightFace, rng, {
    baseWidth: 2.8,
    color: THEME_COLORS.ink,
    doubleChance: 0.25,
  });
  outlinePolygonWithInk(ctx, bottomFace, rng, {
    baseWidth: 2.8,
    color: THEME_COLORS.ink,
    doubleChance: 0.25,
  });
  outlinePolygonWithInk(ctx, topPoly, rng, {
    baseWidth: highlightRed ? 4.2 : 3.2,
    color: strokeColor,
    doubleChance: 0.35,
    dryBrush: true,
  });

  if (stepped && w > 36 && h > 36) {
    const padX = w * structuralRng.range(0.2, 0.28);
    const padY = h * structuralRng.range(0.2, 0.28);
    const innerTop: Point2D[] = [
      [x + padX, y + padY],
      [x + w - padX, y + padY],
      [x + w - padX, y + h - padY],
      [x + padX, y + h - padY],
    ];
    fillRoughenedPolygon(ctx, innerTop, rng, THEME_COLORS.paperPure, 1.0);
    outlinePolygonWithInk(ctx, innerTop, rng, {
      baseWidth: 2.2,
      color: strokeColor,
      doubleChance: 0.2,
    });
  }
}

export function drawBrokenArch(
  ctx: Canvas2DContext,
  x: number,
  y: number,
  archW: number,
  archH: number,
  pierW: number,
  rng: PRNG,
  structuralRng: PRNG,
): void {
  const botY = y + archH;

  drawChippedSlab(
    ctx,
    {
      x,
      topY: y + 8,
      botY,
      litWidth: pierW * 0.62,
      shadowWidth: pierW * 0.38,
      tiltPx: 2,
    },
    rng,
    structuralRng,
  );

  drawChippedSlab(
    ctx,
    {
      x: x + archW - pierW,
      topY: y + 4,
      botY,
      litWidth: pierW * 0.62,
      shadowWidth: pierW * 0.38,
      tiltPx: -2,
    },
    rng,
    structuralRng,
  );

  const spanPoly: Point2D[] = [
    [x, y],
    [x + archW * 0.44, y - 4],
    [x + archW * 0.48, y + pierW * 0.85],
    [x + archW * 0.22, y + pierW * 0.9],
    [x, y + pierW * 1.2],
  ];
  fillRoughenedPolygon(ctx, spanPoly, rng, THEME_COLORS.paperPure, 1.3);
  hatchRegion(ctx, spanPoly, rng, {
    angleRad: 0.1,
    baseSpacing: 5.5,
    baseWidth: 1.7,
    toneAt: (_u, v) => 0.35 + v * 0.55,
  });
  outlinePolygonWithInk(ctx, spanPoly, rng, {
    baseWidth: 3.4,
    doubleChance: 0.3,
    dryBrush: true,
  });

  const rightStub: Point2D[] = [
    [x + archW * 0.64, y + 2],
    [x + archW, y],
    [x + archW, y + pierW * 1.15],
    [x + archW * 0.68, y + pierW * 0.82],
  ];
  fillRoughenedPolygon(ctx, rightStub, rng, THEME_COLORS.paperPure, 1.3);
  hatchRegion(ctx, rightStub, rng, {
    angleRad: 0.1,
    baseSpacing: 5.2,
    baseWidth: 1.8,
    toneAt: (_u, v) => 0.45 + v * 0.5,
  });
  outlinePolygonWithInk(ctx, rightStub, rng, {
    baseWidth: 3.4,
    doubleChance: 0.3,
    dryBrush: true,
  });
}

export function drawThresholdDoorframe(
  ctx: Canvas2DContext,
  width: number,
  height: number,
  openingRect: { x: number; y: number; w: number; h: number },
  rng: PRNG,
  structuralRng: PRNG,
): void {
  const { x, y, w, h } = openingRect;
  const jambThick = width * 0.11;
  const lintelThick = height * 0.12;

  const leftJamb: Point2D[] = [
    [x - jambThick, y - lintelThick * 0.3],
    [x, y],
    [x + 4, y + h * 0.35],
    [x - 3, y + h * 0.68],
    [x, y + h],
    [x - jambThick - 12, y + h],
    [x - jambThick - 6, y + h * 0.45],
  ];

  const rightJamb: Point2D[] = [
    [x + w, y],
    [x + w + jambThick, y - lintelThick * 0.3],
    [x + w + jambThick + 6, y + h * 0.45],
    [x + w + jambThick + 12, y + h],
    [x + w, y + h],
    [x + w + 3, y + h * 0.68],
    [x + w - 4, y + h * 0.35],
  ];

  const topLintel: Point2D[] = [
    [x - jambThick * 1.25, y - lintelThick],
    [x + w + jambThick * 1.25, y - lintelThick],
    [x + w + jambThick * 1.1, y],
    [x + w * 0.55, y + 4],
    [x + w * 0.45, y - 3],
    [x - jambThick * 1.1, y],
  ];

  for (const poly of [leftJamb, rightJamb, topLintel]) {
    fillRoughenedPolygon(ctx, poly, rng, THEME_COLORS.ink, 2.6);
    outlinePolygonWithInk(ctx, poly, rng, {
      baseWidth: 5.2,
      color: THEME_COLORS.ink,
      dryBrush: true,
      doubleChance: 0.42,
    });
  }

  const bevelW = 24;
  const leftBevel: Point2D[] = [
    [x, y],
    [x + bevelW, y + bevelW * 0.6],
    [x + bevelW, y + h - bevelW * 0.3],
    [x, y + h],
  ];
  const rightBevel: Point2D[] = [
    [x + w - bevelW, y + bevelW * 0.6],
    [x + w, y],
    [x + w, y + h],
    [x + w - bevelW, y + h - bevelW * 0.3],
  ];

  for (const bPoly of [leftBevel, rightBevel]) {
    fillRoughenedPolygon(ctx, bPoly, rng, THEME_COLORS.paperPure, 1.2);
    hatchRegion(ctx, bPoly, rng, {
      angleRad: Math.PI * 0.25,
      baseSpacing: 4.8,
      baseWidth: 2.0,
      toneAt: (_u, v) => 0.45 + v * 0.35,
    });
    outlinePolygonWithInk(ctx, bPoly, rng, {
      baseWidth: 3.4,
      doubleChance: 0.3,
      dryBrush: true,
    });
  }

  for (let s = 0; s < 42; s++) {
    const onLeft = structuralRng.chance(0.5);
    const sx = onLeft
      ? structuralRng.range(x - jambThick * 0.85, x - 6)
      : structuralRng.range(x + w + 6, x + w + jambThick * 0.85);
    const sy = structuralRng.range(y - lintelThick * 0.8, y + h * 0.92);
    drawInkDot(
      ctx,
      sx,
      sy,
      structuralRng.range(1.2, 4.2),
      rng,
      THEME_COLORS.paperPure,
    );
  }
}
