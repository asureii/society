/**
 * HAND-DRAWN HATCHING, CROSS-HATCHING & STIPPLE ENGINE (src/scene/art/hatch.ts)
 *
 * Implements `hatchRegion(ctx, polygon, rng, options)` so shaded regions look drawn
 * by a human manga artist rather than stamped with a uniform pattern:
 * - Spacing jitter ±35% (`INK_CONFIG.hatchSpacingJitter`)
 * - Per-line angle jitter ±4° (`INK_CONFIG.hatchAngleJitterDeg`) + slow angle drift across region
 * - Variable line length with tapered starts/ends and random early stops
 * - Slight curvature following the form (`curvature` or `flowField`)
 * - Tone-driven density: dense hatching on shadow side -> sparse dashes -> stipple dots toward light boundary
 * - Cross-hatching at +55..80° in darkest zones (`tone > 0.68`)
 * - Spatter & stipple ink dots + flick marks clustered near shadow edges
 */

import { INK_CONFIG } from '../../config/ink';
import { THEME_COLORS } from '../../config/theme';
import {
  drawInkDot,
  drawInkStroke,
  type Canvas2DContext,
  type Point2D,
} from './inkBrush';
import type { PRNG } from './rng';

export interface HatchRegionOptions {
  /** Base hatch angle in radians (e.g., Math.PI / 2 for vertical slab grain, 0 for horizontal ground) */
  angleRad: number;
  /** Base spacing in pixels between hatch lines at full tone */
  baseSpacing: number;
  /** Base stroke width in pixels */
  baseWidth?: number;
  /**
   * Tone evaluation function at normalized region coordinates (u, v) in [0, 1]:
   * Returns a shadow tone in [0, 1] where:
   * - 0.00..0.12 = open white lit paper
   * - 0.12..0.32 = stipple dots & tiny flick marks near light boundary
   * - 0.32..0.68 = primary tapered hatching (broken dashes -> dense strokes)
   * - 0.68..1.00 = cross-hatching (+55..80°) & heavy shadow ink
   */
  toneAt: (u: number, v: number) => number;
  /** Optional slight curvature (in radians of bend across a stroke) */
  curvature?: number;
  /** Optional custom flow angle offset function (u, v) => radians */
  flowField?: (u: number, v: number) => number;
  /** Color token (defaults to THEME_COLORS.ink) */
  color?: string;
}

function getBoundingBox(poly: Point2D[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function hatchRegion(
  ctx: Canvas2DContext,
  polygon: Point2D[],
  rng: PRNG,
  options: HatchRegionOptions,
): void {
  if (polygon.length < 3) return;

  const bbox = getBoundingBox(polygon);
  const diag = Math.hypot(bbox.width, bbox.height);
  const cx = (bbox.minX + bbox.maxX) * 0.5;
  const cy = (bbox.minY + bbox.maxY) * 0.5;

  const baseSpacing = Math.max(3.5, options.baseSpacing);
  const baseWidth = options.baseWidth ?? 2.2;
  const curvature = options.curvature ?? 0.08;
  const color = options.color ?? THEME_COLORS.ink;

  ctx.save();
  // Clip to polygon so hatch strokes stay inside the form while still having tapered starts/stops
  ctx.beginPath();
  ctx.moveTo(polygon[0][0], polygon[0][1]);
  for (let i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i][0], polygon[i][1]);
  }
  ctx.closePath();
  ctx.clip();

  const runHatchPass = (passAngleRad: number, isCrossPass: boolean) => {
    const jitterDegRad = (INK_CONFIG.hatchAngleJitterDeg * Math.PI) / 180;
    let cursor = -diag * 0.55;
    let lineIndex = 0;

    while (cursor < diag * 0.55) {
      const progressAcross = (cursor + diag * 0.55) / (diag * 1.1);
      // Spacing jitter ±35%
      const spacingJitter = 1.0 + rng.range(-INK_CONFIG.hatchSpacingJitter, INK_CONFIG.hatchSpacingJitter);
      cursor += baseSpacing * (isCrossPass ? 1.35 : 1.0) * Math.max(0.45, spacingJitter);
      lineIndex++;

      // Slow angle drift across region + per-line ±4° jitter
      const driftRad = (rng.noise1D(progressAcross * 3.0) - 0.5) * 0.11;
      const lineAngle = passAngleRad + driftRad + rng.range(-jitterDegRad, jitterDegRad);

      const dirX = Math.cos(lineAngle);
      const dirY = Math.sin(lineAngle);
      const perpX = -dirY;
      const perpY = dirX;

      const originX = cx + perpX * cursor;
      const originY = cy + perpY * cursor;

      // March along the candidate line and build variable-length strokes governed by local tone
      const sampleSteps = 18;
      let activePts: Point2D[] = [];

      for (let s = 0; s <= sampleSteps; s++) {
        const along = ((s / sampleSteps) - 0.5) * diag * 1.05;
        // Slight form-following curvature perpendicular to stroke
        const bend = Math.sin((s / sampleSteps) * Math.PI) * curvature * diag * 0.08;
        const px = originX + dirX * along + perpX * bend;
        const py = originY + dirY * along + perpY * bend;

        const u = Math.max(0, Math.min(1, (px - bbox.minX) / bbox.width));
        const v = Math.max(0, Math.min(1, (py - bbox.minY) / bbox.height));
        const flowOff = options.flowField ? options.flowField(u, v) : 0;

        const finalX = px + perpX * flowOff * 8.0;
        const finalY = py + dirY * flowOff * 8.0;

        const localTone = options.toneAt(u, v);

        if (isCrossPass) {
          // Cross-hatching only in the darkest shadow zones (tone > 0.68) with shorter strokes
          if (localTone > 0.68 && !rng.chance(0.18)) {
            activePts.push([finalX, finalY]);
          } else if (activePts.length >= 2) {
            drawInkStroke(ctx, activePts, rng, {
              baseWidth: baseWidth * rng.range(0.75, 1.15),
              color,
              doubleChance: 0,
              breakChance: 0.05,
              imperfectJoin: false,
            });
            activePts = [];
          } else {
            activePts = [];
          }
        } else {
          // Primary hatch pass:
          // tone >= 0.52 -> continuous tapered strokes with occasional random early stops
          // 0.30 <= tone < 0.52 -> sparse broken dashes
          // 0.14 <= tone < 0.30 -> stipple dots & flick marks near light boundary
          if (localTone >= 0.52) {
            if (rng.chance(0.06)) {
              if (activePts.length >= 2) {
                drawInkStroke(ctx, activePts, rng, {
                  baseWidth: baseWidth * rng.range(0.8, 1.3),
                  color,
                  doubleChance: 0.05,
                  breakChance: 0.02,
                  imperfectJoin: false,
                });
              }
              activePts = [];
            } else {
              activePts.push([finalX, finalY]);
            }
          } else if (localTone >= 0.3) {
            // Sparse dashes on mid-light transition
            if ((lineIndex + s) % 2 === 0 && !rng.chance(0.35)) {
              activePts.push([finalX, finalY]);
            } else if (activePts.length >= 2) {
              drawInkStroke(ctx, activePts, rng, {
                baseWidth: baseWidth * rng.range(0.65, 0.95),
                color,
                doubleChance: 0,
                breakChance: 0,
                imperfectJoin: false,
              });
              activePts = [];
            } else {
              activePts = [];
            }
          } else {
            if (activePts.length >= 2) {
              drawInkStroke(ctx, activePts, rng, {
                baseWidth: baseWidth * rng.range(0.7, 1.05),
                color,
                doubleChance: 0,
                breakChance: 0,
                imperfectJoin: false,
              });
            }
            activePts = [];

            // Stipple dots near shadow-to-light boundary (0.14 <= localTone < 0.30)
            if (localTone >= 0.14 && rng.chance(INK_CONFIG.stippleDensity * 0.42)) {
              drawInkDot(
                ctx,
                finalX + rng.range(-3, 3),
                finalY + rng.range(-3, 3),
                baseWidth * rng.range(0.45, 0.95),
                rng,
                color,
              );
            }
          }
        }
      }

      if (activePts.length >= 2) {
        drawInkStroke(ctx, activePts, rng, {
          baseWidth: baseWidth * rng.range(0.78, 1.25),
          color,
          doubleChance: 0.04,
          breakChance: 0.02,
          imperfectJoin: false,
        });
      }
    }
  };

  // Primary directional hatch pass
  runHatchPass(options.angleRad, false);

  // Secondary cross-hatch pass at +65 deg in darkest zones
  runHatchPass(options.angleRad + (65 * Math.PI) / 180, true);

  // Clustered spatter & stipple ink dots near shadow transitions
  const stippleCount = Math.floor(
    ((bbox.width * bbox.height) / 2800) * INK_CONFIG.stippleDensity,
  );
  for (let i = 0; i < stippleCount; i++) {
    const u = rng.next();
    const v = rng.next();
    const tone = options.toneAt(u, v);
    if (tone > 0.18 && tone < 0.62) {
      const sx = bbox.minX + u * bbox.width;
      const sy = bbox.minY + v * bbox.height;
      drawInkDot(ctx, sx, sy, baseWidth * rng.range(0.4, 1.15), rng, color);
    }
  }

  ctx.restore();
}
