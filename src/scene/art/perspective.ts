/**
 * PERSPECTIVE GRID & FORESHORTENING HELPERS (src/scene/art/perspective.ts)
 *
 * Implements 1-point, 2-point, top-down/isometric, and extreme worm's-eye grid &
 * vanishing-point hatching helpers using the hand-inked brush primitives.
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

export function projectTowardVanishingPoint(
  pt: Point2D,
  vp: Point2D,
  depthT: number,
): Point2D {
  return [
    pt[0] + (vp[0] - pt[0]) * depthT,
    pt[1] + (vp[1] - pt[1]) * depthT,
  ];
}

export function drawPerspectiveRays(
  ctx: Canvas2DContext,
  vp: Point2D,
  rayCount: number,
  innerRadius: number,
  outerRadius: number,
  rng: PRNG,
  options: {
    angleStartRad?: number;
    angleEndRad?: number;
    baseWidth?: number;
    color?: string;
    breakChance?: number;
  } = {},
): void {
  const {
    angleStartRad = 0,
    angleEndRad = Math.PI * 2,
    baseWidth = 1.6,
    color = THEME_COLORS.ink,
    breakChance = 0.14,
  } = options;

  for (let i = 0; i < rayCount; i++) {
    const u = (i + rng.range(-0.25, 0.25)) / Math.max(1, rayCount);
    const theta = angleStartRad + u * (angleEndRad - angleStartRad);
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const r0 = innerRadius * rng.range(0.88, 1.18);
    const r1 = outerRadius * rng.range(0.85, 1.05);
    const midR = (r0 + r1) * 0.5;

    const pts: Point2D[] = [
      [vp[0] + cos * r0, vp[1] + sin * r0],
      [vp[0] + cos * midR + rng.range(-3, 3), vp[1] + sin * midR + rng.range(-3, 3)],
      [vp[0] + cos * r1, vp[1] + sin * r1],
    ];

    drawInkStroke(ctx, pts, rng, {
      baseWidth: baseWidth * rng.range(0.8, 1.25),
      color,
      taperScale: 1.25,
      breakChance,
      doubleChance: 0.15,
    });
  }
}

export function drawIsometricGrid(
  ctx: Canvas2DContext,
  bounds: Point2D[],
  stepPx: number,
  rng: PRNG,
  options: {
    angleA?: number;
    angleB?: number;
    baseWidth?: number;
    color?: string;
    breakChance?: number;
  } = {},
): void {
  const {
    angleA = 0.28,
    angleB = Math.PI * 0.5 + 0.16,
    baseWidth = 1.4,
    color = THEME_COLORS.ink,
    breakChance = 0.2,
  } = options;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of bounds) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const diag = Math.hypot(maxX - minX, maxY - minY) * 0.65;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(bounds[0][0], bounds[0][1]);
  for (let i = 1; i < bounds.length; i++) {
    ctx.lineTo(bounds[i][0], bounds[i][1]);
  }
  ctx.closePath();
  ctx.clip();

  for (const angle of [angleA, angleB]) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const normX = -dirY;
    const normY = dirX;

    for (let offset = -diag; offset <= diag; offset += stepPx) {
      const jitterOff = offset + rng.range(-stepPx * 0.12, stepPx * 0.12);
      const ox = cx + normX * jitterOff;
      const oy = cy + normY * jitterOff;

      drawInkStroke(
        ctx,
        [
          [ox - dirX * diag, oy - dirY * diag],
          [ox, oy],
          [ox + dirX * diag, oy + dirY * diag],
        ],
        rng,
        {
          baseWidth: baseWidth * rng.range(0.75, 1.2),
          color,
          breakChance,
          doubleChance: 0.12,
        },
      );
    }
  }

  ctx.restore();
}

export function drawWormsEyePillar(
  ctx: Canvas2DContext,
  baseLeft: Point2D,
  baseCenter: Point2D,
  baseRight: Point2D,
  vp: Point2D,
  heightFraction: number,
  rng: PRNG,
): void {
  const topLeft = projectTowardVanishingPoint(baseLeft, vp, heightFraction);
  const topCenter = projectTowardVanishingPoint(baseCenter, vp, heightFraction * 1.03);
  const topRight = projectTowardVanishingPoint(baseRight, vp, heightFraction);

  const litFace: Point2D[] = [
    baseLeft,
    [
      (baseLeft[0] + topLeft[0]) * 0.5 + rng.range(-5, 5),
      (baseLeft[1] + topLeft[1]) * 0.5,
    ],
    topLeft,
    topCenter,
    [
      (baseCenter[0] + topCenter[0]) * 0.5 + rng.range(-4, 4),
      (baseCenter[1] + topCenter[1]) * 0.5,
    ],
    baseCenter,
  ];

  const shadowFace: Point2D[] = [
    baseCenter,
    [
      (baseCenter[0] + topCenter[0]) * 0.5 + rng.range(-4, 4),
      (baseCenter[1] + topCenter[1]) * 0.5,
    ],
    topCenter,
    topRight,
    [
      (baseRight[0] + topRight[0]) * 0.5 + rng.range(-5, 5),
      (baseRight[1] + topRight[1]) * 0.5,
    ],
    baseRight,
  ];

  fillRoughenedPolygon(ctx, litFace, rng, THEME_COLORS.paperPure, 1.8);
  fillRoughenedPolygon(ctx, shadowFace, rng, THEME_COLORS.paperPure, 1.8);

  const coreLeftBase: Point2D = [
    baseCenter[0] + (baseRight[0] - baseCenter[0]) * 0.42,
    baseCenter[1] + (baseRight[1] - baseCenter[1]) * 0.42,
  ];
  const coreLeftTop = projectTowardVanishingPoint(coreLeftBase, vp, heightFraction);
  const solidCore: Point2D[] = [coreLeftBase, coreLeftTop, topRight, baseRight];
  fillRoughenedPolygon(ctx, solidCore, rng, THEME_COLORS.ink, 2.2);

  const ridgeAngle = Math.atan2(
    topCenter[1] - baseCenter[1],
    topCenter[0] - baseCenter[0],
  );

  hatchRegion(ctx, shadowFace, rng, {
    angleRad: ridgeAngle,
    baseSpacing: 5.2,
    baseWidth: 2.3,
    curvature: 0.02,
    toneAt: (u, v) => Math.min(1, 0.52 + u * 0.45 + (1 - v) * 0.22),
  });

  hatchRegion(ctx, litFace, rng, {
    angleRad: ridgeAngle + Math.PI * 0.5,
    baseSpacing: 9.2,
    baseWidth: 1.5,
    curvature: 0.02,
    toneAt: (u, v) => {
      const topDensity = Math.max(0, (0.35 - v) * 1.6);
      const ridgeDensity = Math.max(0, (u - 0.65) * 1.4);
      return Math.min(0.68, topDensity + ridgeDensity);
    },
  });

  outlinePolygonWithInk(ctx, litFace, rng, {
    baseWidth: 4.4,
    doubleChance: 0.36,
    dryBrush: true,
  });
  outlinePolygonWithInk(ctx, shadowFace, rng, {
    baseWidth: 4.6,
    doubleChance: 0.32,
    dryBrush: true,
  });
}

export function drawHexLattice(
  ctx: Canvas2DContext,
  polygon: Point2D[],
  radius: number,
  rng: PRNG,
  options: {
    color?: string;
    baseWidth?: number;
    skipChance?: number;
  } = {},
): void {
  const {
    color = THEME_COLORS.paperPure,
    baseWidth = 1.4,
    skipChance = 0.22,
  } = options;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i][0], polygon[i][1]);
  }
  ctx.closePath();
  ctx.clip();

  const colStep = radius * 1.732;
  const rowStep = radius * 1.5;

  let row = 0;
  for (let cy = minY - radius; cy <= maxY + radius; cy += rowStep) {
    const xOffset = (row % 2) * (colStep * 0.5);
    for (let cx = minX - radius + xOffset; cx <= maxX + radius; cx += colStep) {
      if (rng.chance(skipChance)) continue;
      const hexPts: Point2D[] = [];
      for (let k = 0; k <= 6; k++) {
        const ang = (Math.PI / 3) * (k % 6) - Math.PI / 6;
        hexPts.push([
          cx + Math.cos(ang) * radius * 0.92,
          cy + Math.sin(ang) * radius * 0.92,
        ]);
      }
      drawInkStroke(ctx, hexPts, rng, {
        baseWidth,
        color,
        wobbleScale: 0.65,
        breakChance: 0.14,
        doubleChance: 0.1,
      });
    }
    row++;
  }

  ctx.restore();
}

export function drawSingleHexCell(
  ctx: Canvas2DContext,
  cx: number,
  cy: number,
  radius: number,
  rng: PRNG,
  options: {
    fillColor?: string;
    strokeColor?: string;
    baseWidth?: number;
  } = {},
): Point2D[] {
  const hexPts: Point2D[] = [];
  for (let k = 0; k < 6; k++) {
    const ang = (Math.PI / 3) * k - Math.PI / 6;
    hexPts.push([cx + Math.cos(ang) * radius, cy + Math.sin(ang) * radius]);
  }

  if (options.fillColor) {
    fillRoughenedPolygon(ctx, hexPts, rng, options.fillColor, 1.5);
  }
  if (options.strokeColor) {
    outlinePolygonWithInk(ctx, hexPts, rng, {
      baseWidth: options.baseWidth ?? 3.2,
      color: options.strokeColor,
      doubleChance: 0.4,
      dryBrush: true,
    });
  }
  return hexPts;
}
