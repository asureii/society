/**
 * HORIZON & FAR DESERT LAYER GENERATOR (src/scene/art/horizon.ts)
 *
 * Spec (B4.4, C2, & Part E5):
 * - Broken horizontal horizon ridge line.
 * - 5 sparse dune contour lines with small directional hatch under the ridges.
 * - Ground marks in the open plain read as deliberate small stone texture clusters
 *   and stipple pebbles rather than stray floating line segments.
 * - One tiny shaky-lined distant tower on the far right horizon for scale.
 * - Keeps the lower-left ~35% spacious white ground for the unboxed hero Mincho typography.
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

export function renderHorizonVariant(
  ctx: Canvas2DContext,
  width: number,
  height: number,
  rng: PRNG,
  structuralRng: PRNG,
): void {
  ctx.clearRect(0, 0, width, height);

  const horizonY = height * 0.58;

  // Fill ground plane below the horizon with clean warm paper so far sky doesn't bleed below horizon
  const groundPoly: Point2D[] = [
    [0, horizonY + 12],
    [width * 0.25, horizonY + 4],
    [width * 0.55, horizonY - 8],
    [width * 0.82, horizonY - 18],
    [width, horizonY - 6],
    [width, height],
    [0, height],
  ];
  fillRoughenedPolygon(ctx, groundPoly, rng, THEME_COLORS.paper, 2.0);

  // Broken, dashed horizontal horizon strokes
  const horizonSegments = 7;
  for (let s = 0; s < horizonSegments; s++) {
    const x0 = (s / horizonSegments) * width;
    const x1 = ((s + 0.88) / horizonSegments) * width;
    const y0 = horizonY + Math.sin(s * 0.9) * 8;
    const y1 = horizonY + Math.sin((s + 1) * 0.9) * 8;
    drawInkStroke(
      ctx,
      [
        [x0, y0],
        [(x0 + x1) * 0.5, (y0 + y1) * 0.5 - 3],
        [x1, y1],
      ],
      rng,
      {
        baseWidth: rng.range(2.2, 3.6),
        breakChance: 0.14,
        doubleChance: 0.28,
      },
    );
  }

  // 5 sparse dune contour ridges with subtle shadow hatching tucked underneath
  const dunes = [
    { x0: width * 0.34, x1: width * 0.62, y: horizonY + 34, arch: -16 },
    { x0: width * 0.58, x1: width * 0.92, y: horizonY + 22, arch: -22 },
    { x0: width * 0.22, x1: width * 0.45, y: horizonY + 68, arch: -12 },
    { x0: width * 0.48, x1: width * 0.82, y: horizonY + 86, arch: -18 },
    { x0: width * 0.64, x1: width * 0.94, y: horizonY + 132, arch: -14 },
  ];

  for (const d of dunes) {
    const ridgePts: Point2D[] = [];
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = d.x0 + (d.x1 - d.x0) * t;
      const py =
        d.y +
        Math.sin(t * Math.PI) * d.arch +
        (structuralRng.noise1D(t * 4.0 + d.y) - 0.5) * 6;
      ridgePts.push([px, py]);
    }

    // Small hatched shadow pocket directly under the dune ridge
    const shadowBand: Point2D[] = [
      ...ridgePts,
      [d.x1, d.y + 16],
      [(d.x0 + d.x1) * 0.5, d.y + d.arch * 0.3 + 20],
      [d.x0, d.y + 12],
    ];
    hatchRegion(ctx, shadowBand, rng, {
      angleRad: 0.28,
      baseSpacing: 8.5,
      baseWidth: 1.5,
      curvature: 0.05,
      toneAt: (u, v) => {
        const edgeFade = Math.sin(u * Math.PI);
        return Math.max(0, (1.0 - v * 1.15) * edgeFade * 0.72);
      },
    });

    drawInkStroke(ctx, ridgePts, rng, {
      baseWidth: rng.range(1.8, 2.9),
      breakChance: 0.08,
      doubleChance: 0.22,
    });
  }

  // Deliberate small stone texture clusters and pebble stipples across the open ground (Part E5)
  // Avoids lower-left (x < 0.38, y > 0.64) so hero typography sits on clean paper
  const clusterCount = 22;
  for (let c = 0; c < clusterCount; c++) {
    const depthT = structuralRng.range(0.06, 0.92);
    const cy = horizonY + 20 + Math.pow(depthT, 1.5) * (height - horizonY - 40);
    const minX = cy > height * 0.64 ? width * 0.40 : width * 0.12;
    const cx = structuralRng.range(minX, width * 0.92);
    const scale = 0.45 + depthT * 0.85;

    // Small angular ground pebble / stone chip with cast shadow dot
    const rw = structuralRng.range(4.5, 11.0) * scale;
    const rh = rw * structuralRng.range(0.35, 0.55);
    const pebblePoly: Point2D[] = [
      [cx - rw, cy],
      [cx - rw * 0.3, cy - rh],
      [cx + rw * 0.8, cy - rh * 0.6],
      [cx + rw, cy + rh * 0.2],
      [cx, cy + rh * 0.5],
    ];
    outlinePolygonWithInk(ctx, pebblePoly, rng, {
      baseWidth: Math.max(1.0, 1.5 * scale),
      doubleChance: 0.1,
      wobbleScale: 0.55,
    });
    // Tiny shadow tick underneath the stone
    drawInkStroke(
      ctx,
      [
        [cx - rw * 0.6, cy + rh * 0.45],
        [cx + rw * 1.05, cy + rh * 0.45],
      ],
      rng,
      { baseWidth: Math.max(1.1, 1.8 * scale), taperScale: 1.2, wobbleScale: 0.4 },
    );

    // Companion stipple gravel dots around the stone cluster
    const dotCount = 3 + (c % 4);
    for (let d = 0; d < dotCount; d++) {
      const gx = cx + structuralRng.range(-26, 28) * scale;
      const gy = cy + structuralRng.range(-6, 9) * scale;
      drawInkDot(
        ctx,
        gx,
        gy,
        rng.range(0.9, 2.1) * Math.min(1.1, scale),
        rng,
        THEME_COLORS.ink,
      );
    }
  }

  // One tiny shaky-lined distant tower on the far right horizon for scale (x ~ 0.81)
  const tx = width * 0.81;
  const ty = horizonY - 16;
  const th = 58;
  drawInkStroke(
    ctx,
    [
      [tx - 9, ty],
      [tx - 2.5, ty - th],
    ],
    rng,
    { baseWidth: 1.7, wobbleScale: 1.35, doubleChance: 0.3 },
  );
  drawInkStroke(
    ctx,
    [
      [tx + 9, ty],
      [tx + 2.5, ty - th],
    ],
    rng,
    { baseWidth: 1.7, wobbleScale: 1.35, doubleChance: 0.3 },
  );
  for (let k = 1; k <= 4; k++) {
    const sy = ty - (th * k) / 4.5;
    const halfSpan = 8.5 * (1 - k / 5.5);
    drawInkStroke(
      ctx,
      [
        [tx - halfSpan, sy],
        [tx + halfSpan, sy - 4],
      ],
      rng,
      { baseWidth: 1.2, wobbleScale: 1.4, doubleChance: 0 },
    );
  }
  drawInkStroke(
    ctx,
    [
      [tx, ty - th],
      [tx, ty - th - 18],
    ],
    rng,
    { baseWidth: 1.1, taperScale: 1.3, doubleChance: 0 },
  );
}

export function renderHorizonDepth(
  dctx: Canvas2DContext,
  width: number,
  height: number,
): void {
  const grad = dctx.createLinearGradient(0, height * 0.5, 0, height);
  grad.addColorStop(0, THEME_COLORS.ink);
  grad.addColorStop(1, THEME_COLORS.paperPure);
  dctx.fillStyle = grad;
  dctx.fillRect(0, 0, width, height);
}
