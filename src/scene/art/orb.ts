/**
 * RED ORB LAYER GENERATOR (src/scene/art/orb.ts)
 *
 * Spec (B4.3):
 * - A red disc (--red) set near the Twin Monolith's base against the dark mass.
 * - Slightly non-circular organic silhouette.
 * - Black curved contour hatching on the lower-right following the sphere.
 * - Rendered so the red plate and black linework can be offset by 2–3px in the shader
 *   (`uRedOffset`) like vintage manga print misregistration.
 */

import { THEME_COLORS } from '../../config/theme';
import { hatchRegion } from './hatch';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  type Canvas2DContext,
  type Point2D,
} from './inkBrush';
import type { PRNG } from './rng';

export function renderOrbVariant(
  ctx: Canvas2DContext,
  width: number,
  height: number,
  rng: PRNG,
  structuralRng: PRNG,
): void {
  ctx.clearRect(0, 0, width, height);

  // Positioned at x = 45.5%, y = 37% so the sphere rises prominently beside/behind the left monolith slab
  const cx = width * 0.455;
  const cy = height * 0.37;
  const rx = width * 0.086;
  const ry = rx * 0.96; // Slightly non-circular

  const segments = 44;
  const orbPoly: Point2D[] = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const wobbleR =
      1.0 +
      (structuralRng.noise1D(i * 0.45) - 0.5) * 0.055 +
      (rng.noise1D(i * 0.9) - 0.5) * 0.02;
    const px = cx + Math.cos(theta) * rx * wobbleR;
    const py = cy + Math.sin(theta) * ry * wobbleR;
    orbPoly.push([px, py]);
  }

  // 1. Flat RED plate (--red)
  fillRoughenedPolygon(ctx, orbPoly, rng, THEME_COLORS.red, 1.4);

  // 2. Curved black contour hatching on the lower-right crescent following the sphere
  hatchRegion(ctx, orbPoly, rng, {
    angleRad: -Math.PI * 0.22,
    baseSpacing: 7.2,
    baseWidth: 2.5,
    curvature: 0.26,
    color: THEME_COLORS.ink,
    toneAt: (u, v) => {
      // Lower-right crescent gets dense spherical contour hatching
      const dx = u - 0.32;
      const dy = v - 0.30;
      const crescent = (dx * 0.95 + dy * 1.05) * 1.12;
      return Math.max(0, Math.min(1, crescent));
    },
    flowField: (u, v) => Math.sin(u * Math.PI) * 0.35 - Math.cos(v * Math.PI) * 0.25,
  });

  // 3. Hand-inked variable-width outer ring (broken into 3 arcs for organic nib attack/release)
  const third = Math.floor(orbPoly.length / 3);
  const arcs: Point2D[][] = [
    orbPoly.slice(0, third + 2),
    orbPoly.slice(third, third * 2 + 2),
    [...orbPoly.slice(third * 2), orbPoly[0], orbPoly[1]],
  ];
  for (const arc of arcs) {
    drawInkStroke(ctx, arc, rng, {
      baseWidth: 4.6,
      color: THEME_COLORS.ink,
      doubleChance: 0.4,
      dryBrush: true,
    });
  }

  // Outer broken halo arc & stipple sparks
  const haloPts: Point2D[] = [];
  for (let i = 10; i <= 30; i++) {
    const theta = (i / 32) * Math.PI * 2;
    haloPts.push([
      cx + Math.cos(theta) * (rx * 1.15),
      cy + Math.sin(theta) * (ry * 1.15),
    ]);
  }
  drawInkStroke(ctx, haloPts, rng, {
    baseWidth: 1.9,
    color: THEME_COLORS.ink,
    breakChance: 0.14,
    doubleChance: 0.25,
  });

  for (let s = 0; s < 18; s++) {
    const ang = rng.range(0, Math.PI * 2);
    const dist = rx * rng.range(1.04, 1.24);
    drawInkDot(
      ctx,
      cx + Math.cos(ang) * dist,
      cy + Math.sin(ang) * dist,
      rng.range(1.2, 3.0),
      rng,
      THEME_COLORS.ink,
    );
  }
}

export function renderOrbDepth(
  dctx: Canvas2DContext,
  width: number,
  height: number,
): void {
  dctx.fillStyle = THEME_COLORS.ink;
  dctx.fillRect(0, 0, width, height);

  const cx = width * 0.455;
  const cy = height * 0.37;
  const rx = width * 0.105;
  const grad = dctx.createRadialGradient(cx, cy, rx * 0.1, cx, cy, rx);
  grad.addColorStop(0, THEME_COLORS.paperPure);
  grad.addColorStop(1, THEME_COLORS.ink);
  dctx.fillStyle = grad;
  dctx.beginPath();
  dctx.arc(cx, cy, rx, 0, Math.PI * 2);
  dctx.fill();
}
