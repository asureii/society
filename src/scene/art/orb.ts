/**
 * RED ORB LAYER GENERATOR & REUSABLE MOTIF (src/scene/art/orb.ts)
 *
 * Spec (B4.3 & Part E5):
 * - A red disc (--red) with a slightly non-circular organic silhouette.
 * - Deliberate spherical contour hatching on the lower-right crescent: curved latitude/longitude
 *   arcs following the 3D sphere's contour with varied spacing and line length (shorter near
 *   the terminator, tighter and longer toward the shadow rim).
 * - Reusable `drawHandInkedOrb` helper so all 7 scenes can render the recurring Red Orb motif
 *   at their respective anchor positions and scales.
 */

import { THEME_COLORS } from '../../config/theme';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  type Canvas2DContext,
  type Point2D,
} from './inkBrush';
import type { PRNG } from './rng';

export interface OrbDrawOptions {
  /** Whether to draw the outer broken halo arc and stipple sparks (default true) */
  halo?: boolean;
  /** Whether the lower half of the orb is submerged/clipped at cy + clipBottomOffset (used in S4) */
  submergedBelowY?: number;
  /** Custom shadow angle in radians (default: lower-right = Math.PI * 0.24) */
  shadowAngleRad?: number;
  /** Outline stroke base width multiplier (default 1.0) */
  strokeScale?: number;
}

export function drawHandInkedOrb(
  ctx: Canvas2DContext,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rng: PRNG,
  structuralRng: PRNG,
  options: OrbDrawOptions = {},
): void {
  const {
    halo = true,
    submergedBelowY,
    shadowAngleRad = Math.PI * 0.24,
    strokeScale = 1.0,
  } = options;

  const segments = 48;
  const orbPoly: Point2D[] = [];
  for (let i = 0; i < segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const wobbleR =
      1.0 +
      (structuralRng.noise1D(i * 0.45) - 0.5) * 0.045 +
      (rng.noise1D(i * 0.9) - 0.5) * 0.018;
    const px = cx + Math.cos(theta) * rx * wobbleR;
    let py = cy + Math.sin(theta) * ry * wobbleR;
    if (submergedBelowY !== undefined && py > submergedBelowY) {
      py = submergedBelowY + (rng.noise1D(i * 1.3) - 0.5) * 2.5;
    }
    orbPoly.push([px, py]);
  }

  // 1. Flat RED plate (--red)
  fillRoughenedPolygon(ctx, orbPoly, rng, THEME_COLORS.red, 1.3 * strokeScale);

  // 2. Deliberate spherical contour hatching (Part E5):
  // Instead of generic straight hatch lines, trace curved spherical rib arcs along the shadow crescent
  // with varied spacing (tighter near the shadow rim) and varied arc length (shorter near terminator).
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(orbPoly[0][0], orbPoly[0][1]);
  for (let i = 1; i < orbPoly.length; i++) {
    ctx.lineTo(orbPoly[i][0], orbPoly[i][1]);
  }
  ctx.closePath();
  ctx.clip();

  const cosS = Math.cos(shadowAngleRad);
  const sinS = Math.sin(shadowAngleRad);
  const ribCount = Math.max(8, Math.min(26, Math.round(rx * 0.16)));

  for (let r = 0; r < ribCount; r++) {
    // Non-linear u in [0, 1] so spacing tightens toward the outer shadow rim (u -> 1)
    const t = r / (ribCount - 1);
    const u = 0.08 + Math.pow(t, 0.78) * 0.88; // distance into shadow crescent

    // Arc span grows as we move deeper into the shadow crescent, with per-line jitter
    const maxAngleSpan = (0.35 + 0.58 * Math.sin(u * Math.PI * 0.85)) * Math.PI * 0.5;
    const startA = -maxAngleSpan * rng.range(0.75, 1.02);
    const endA = maxAngleSpan * rng.range(0.82, 1.05);

    // Optionally split some contour ribs into 2 staggered segments for hand-inked variation
    const splitRib = rng.chance(0.28) && maxAngleSpan > 0.45;
    const segmentsToDraw: Array<[number, number]> = splitRib
      ? [
          [startA, -0.06],
          [0.08, endA],
        ]
      : [[startA, endA]];

    for (const [a0, a1] of segmentsToDraw) {
      const pts: Point2D[] = [];
      const steps = 10;
      for (let s = 0; s <= steps; s++) {
        const frac = s / steps;
        const phi = a0 + (a1 - a0) * frac;
        // Spherical projection onto the disc rotated toward shadowAngleRad
        const radial = rx * (0.22 + 0.74 * u) * Math.cos(phi * 0.38);
        const lateral = ry * 0.88 * Math.sin(phi);
        const px = cx + cosS * radial - sinS * lateral;
        const py = cy + sinS * radial + cosS * lateral;
        if (submergedBelowY === undefined || py <= submergedBelowY) {
          pts.push([px, py]);
        }
      }
      if (pts.length >= 2) {
        drawInkStroke(ctx, pts, rng, {
          baseWidth: Math.max(1.1, (1.2 + u * 1.5) * strokeScale),
          color: THEME_COLORS.ink,
          taperScale: 1.25,
          wobbleScale: 0.55,
          doubleChance: u > 0.72 ? 0.22 : 0.05,
          breakChance: u < 0.35 ? 0.12 : 0.02,
        });
      }
    }
  }

  // Cross-contour rim shadow ticks right along the deepest lower-right edge
  const rimTickCount = Math.max(6, Math.min(18, Math.round(rx * 0.11)));
  for (let k = 0; k < rimTickCount; k++) {
    const ang =
      shadowAngleRad +
      ((k / (rimTickCount - 1)) - 0.5) * Math.PI * 0.68 +
      rng.range(-0.04, 0.04);
    const rOuter = rx * 0.97;
    const rInner = rx * rng.range(0.68, 0.84);
    const p0: Point2D = [cx + Math.cos(ang) * rInner, cy + Math.sin(ang) * (rInner * (ry / rx))];
    const p1: Point2D = [cx + Math.cos(ang) * rOuter, cy + Math.sin(ang) * (rOuter * (ry / rx))];
    if (submergedBelowY === undefined || (p0[1] <= submergedBelowY && p1[1] <= submergedBelowY)) {
      drawInkStroke(ctx, [p0, p1], rng, {
        baseWidth: Math.max(1.2, 2.1 * strokeScale),
        color: THEME_COLORS.ink,
        taperScale: 1.3,
        wobbleScale: 0.45,
        doubleChance: 0.1,
      });
    }
  }
  ctx.restore();

  // 3. Hand-inked variable-width outer ring (broken into 3 arcs for organic nib attack/release)
  const third = Math.floor(orbPoly.length / 3);
  const arcs: Point2D[][] = [
    orbPoly.slice(0, third + 2),
    orbPoly.slice(third, third * 2 + 2),
    [...orbPoly.slice(third * 2), orbPoly[0], orbPoly[1]],
  ];
  for (const arc of arcs) {
    drawInkStroke(ctx, arc, rng, {
      baseWidth: Math.max(2.0, 4.4 * strokeScale),
      color: THEME_COLORS.ink,
      doubleChance: 0.38,
      dryBrush: true,
    });
  }

  // 4. Optional outer broken halo arc & stipple sparks
  if (halo) {
    const haloPts: Point2D[] = [];
    for (let i = 10; i <= 30; i++) {
      const theta = (i / 32) * Math.PI * 2;
      const hx = cx + Math.cos(theta) * (rx * 1.14);
      const hy = cy + Math.sin(theta) * (ry * 1.14);
      if (submergedBelowY === undefined || hy <= submergedBelowY) {
        haloPts.push([hx, hy]);
      }
    }
    if (haloPts.length >= 2) {
      drawInkStroke(ctx, haloPts, rng, {
        baseWidth: Math.max(1.1, 1.8 * strokeScale),
        color: THEME_COLORS.ink,
        breakChance: 0.14,
        doubleChance: 0.25,
      });
    }

    for (let s = 0; s < 14; s++) {
      const ang = rng.range(0, Math.PI * 2);
      const dist = rx * rng.range(1.04, 1.22);
      const dx = cx + Math.cos(ang) * dist;
      const dy = cy + Math.sin(ang) * dist;
      if (submergedBelowY === undefined || dy <= submergedBelowY) {
        drawInkDot(
          ctx,
          dx,
          dy,
          rng.range(1.1, 2.6) * strokeScale,
          rng,
          THEME_COLORS.ink,
        );
      }
    }
  }
}

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
  const ry = rx * 0.96;

  drawHandInkedOrb(ctx, cx, cy, rx, ry, rng, structuralRng, {
    halo: true,
    strokeScale: 1.0,
  });
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
