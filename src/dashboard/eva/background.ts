/**
 * FALLEN CITY — CLEAN HAND-INKED RUINED CITY BACKGROUND (src/dashboard/eva/background.ts)
 *
 * Professional manga/architectural ink-on-paper ruined city:
 * - Stark white sky (#FAFAF8) with zero floating stray scratches, zero wire scribbles, zero smoke squiggles.
 * - Single dramatic black ink mass bleeding from the top-right corner with torn deckle edge and drips.
 * - Solid, authoritative ruined skyscrapers and split monolith towers with clean vertical hatching
 *   and window grids, grounded along the horizon (v = 0.53).
 * - Center sky corridor (u = 0.35..0.66) is completely open white paper behind the red orb and sight line.
 * - Clean one-point perspective avenue receding to vanishing point (0.51W, 0.53H) with clean curbs
 *   and perspective dashed lane markings — zero messy crossing wires or stray stick debris.
 */

import { THEME_COLORS } from '../../config/theme.ts';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Canvas2DContext,
  type Point2D,
} from '../../scene/art/inkBrush.ts';
import { createRng, type PRNG } from '../../scene/art/rng.ts';
import type { AnyCanvas, EvaDrawOrderRecorder } from './evaSurface.ts';

/**
 * Directional hatching for shadowed building faces.
 */
function hatchPolygonClipped(
  ctx: Canvas2DContext,
  poly: Point2D[],
  rng: PRNG,
  opts: {
    angleRad: number;
    spacing: number;
    baseWidth: number;
    crossHatch?: boolean;
  }
): void {
  if (poly.length < 3) return;
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
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const diag = Math.hypot(maxX - minX, maxY - minY);

  const inside = (px: number, py: number): boolean => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-6) + xi) {
        c = !c;
      }
    }
    return c;
  };

  const runPass = (angle: number, spacingMul: number) => {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const nx = -sinA;
    const ny = cosA;

    let d = -diag * 0.55;
    while (d <= diag * 0.55) {
      d += opts.spacing * spacingMul * rng.range(0.9, 1.15);
      const ox = cx + nx * d;
      const oy = cy + ny * d;

      const steps = 24;
      let seg: Point2D[] = [];
      for (let s = 0; s <= steps; s++) {
        const along = (s / steps - 0.5) * diag * 1.08;
        const px = ox + cosA * along;
        const py = oy + sinA * along;
        if (inside(px, py)) {
          seg.push([px, py]);
        } else {
          if (seg.length >= 2) {
            drawInkStroke(ctx, seg, rng, {
              baseWidth: opts.baseWidth,
              wobbleScale: 0.25,
              taperScale: 1.1,
              doubleChance: 0,
              imperfectJoin: false,
            });
          }
          seg = [];
        }
      }
      if (seg.length >= 2) {
        drawInkStroke(ctx, seg, rng, {
          baseWidth: opts.baseWidth,
          wobbleScale: 0.25,
          taperScale: 1.1,
          doubleChance: 0,
          imperfectJoin: false,
        });
      }
    }
  };

  runPass(opts.angleRad, 1.0);
  if (opts.crossHatch) {
    runPass(opts.angleRad + 1.15, 1.4);
  }
}

/**
 * Draws an authoritative ruined skyscraper with crisp, clean architectural geometry.
 */
function drawArchitecturalTower(
  ctx: Canvas2DContext,
  rng: PRNG,
  b: {
    x: number;
    botY: number;
    topY: number;
    litW: number;
    shadowW: number;
    shadowOnLeft?: boolean;
    leanPx?: number;
    isFar?: boolean;
    brokenSteps?: number;
  }
): void {
  const lean = b.leanPx ?? 0;
  const h = b.botY - b.topY;
  const shadowLeft = b.shadowOnLeft ?? false;
  const outlineW = b.isFar ? 1.6 : 2.2;

  const litX0 = shadowLeft ? b.x + b.shadowW : b.x;
  const litX1 = litX0 + b.litW;
  const shX0 = shadowLeft ? b.x : litX1;
  const shX1 = shadowLeft ? litX0 : litX1 + b.shadowW;

  // Angular stepped broken roof
  const steps = b.brokenSteps ?? 2;
  const litRoofPts: Point2D[] = [];
  for (let s = 0; s <= steps; s++) {
    const u = s / steps;
    const rx = litX0 + lean + u * b.litW;
    const stepDrop = s % 2 === 1 ? h * 0.05 : 0;
    litRoofPts.push([rx, b.topY + stepDrop]);
  }

  const litPoly: Point2D[] = [
    [litX0, b.botY],
    ...litRoofPts,
    [litX1, b.botY],
  ];

  const shadowRoofY = b.topY + h * 0.03;
  const shadowPoly: Point2D[] = shadowLeft
    ? [
        [shX0, b.botY],
        [shX0 + lean, shadowRoofY],
        [shX1 + lean, b.topY],
        [shX1, b.botY],
      ]
    : [
        [shX0, b.botY],
        [shX0 + lean, b.topY],
        [shX1 + lean, shadowRoofY],
        [shX1, b.botY],
      ];

  // Fill with pure white paper to block out background cleanly
  fillRoughenedPolygon(ctx, litPoly, rng, THEME_COLORS.paperPure, 0.6);
  fillRoughenedPolygon(ctx, shadowPoly, rng, THEME_COLORS.paperPure, 0.6);

  // Vertical hatching on the shadow face only
  hatchPolygonClipped(ctx, shadowPoly, rng, {
    angleRad: Math.PI * 0.5,
    spacing: b.isFar ? 7.0 : 5.2,
    baseWidth: b.isFar ? 1.15 : 1.45,
    crossHatch: !b.isFar,
  });

  // Outlines
  outlinePolygonWithInk(ctx, shadowPoly, rng, {
    baseWidth: outlineW,
    wobbleScale: 0.3,
    doubleChance: 0.15,
  });
  outlinePolygonWithInk(ctx, litPoly, rng, {
    baseWidth: outlineW,
    wobbleScale: 0.3,
    doubleChance: 0.18,
  });

  // Crisp rectangular windows on the lit face
  const cols = Math.max(2, Math.floor(b.litW / (b.isFar ? 10 : 13)));
  const rows = Math.max(3, Math.floor(h / (b.isFar ? 16 : 20)));
  const winW = b.isFar ? 3.0 : 4.0;
  const winH = b.isFar ? 4.8 : 6.2;

  for (let r = 1; r < rows; r++) {
    const wy = b.topY + (r / rows) * (h - 12) + 6;
    const rowLean = ((b.botY - wy) / h) * lean;
    for (let c = 0; c < cols; c++) {
      if (rng.chance(0.25)) continue;
      const wx = litX0 + 5 + (c / Math.max(1, cols - 1)) * (b.litW - 12) + rowLean;
      const winPoly: Point2D[] = [
        [wx, wy],
        [wx + winW, wy],
        [wx + winW, wy + winH],
        [wx, wy + winH],
      ];
      if (rng.chance(0.18)) {
        fillRoughenedPolygon(ctx, winPoly, rng, THEME_COLORS.ink, 0.3);
      } else {
        outlinePolygonWithInk(ctx, winPoly, rng, {
          baseWidth: 0.9,
          wobbleScale: 0.15,
          doubleChance: 0,
        });
      }
    }
  }
}

export function drawEvaStageBackground(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  recorder: EvaDrawOrderRecorder,
  seed = 701
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);
  const structuralRng = createRng(seed + 101);

  // 1. Pure clean paper base (#FAFAF8)
  ctx.fillStyle = THEME_COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.53;
  const vpX = W * 0.51;
  const vpY = horizonY;

  // ===========================================================================
  // STAGE 1 (0.25): TOP-RIGHT RAGGED BLACK INK MASS (CLEAN WHITE SKY EVERYWHERE ELSE)
  // ===========================================================================
  // Keep ink mass framed in the top-right corner; ZERO floating lines in the rest of the sky.
  const massStartX = W * 0.58;
  const massPoly: Point2D[] = [
    [massStartX, 0],
    [W, 0],
    [W, H * 0.20],
  ];
  const massSteps = 48;
  for (let i = massSteps; i >= 0; i--) {
    const u = i / massSteps;
    const x = massStartX + u * (W - massStartX);
    const env = Math.pow(u, 0.85);
    const baseY = H * (0.18 * env + Math.sin(u * Math.PI) * 0.02 * env);
    const warp = (structuralRng.fbm2D(u * 4.5, 1.8, 4) - 0.5) * Math.min(1, u * 3.0);
    const y = Math.max(0, baseY + warp * H * 0.05);
    massPoly.push([x, y]);
  }

  ctx.fillStyle = THEME_COLORS.ink;
  ctx.beginPath();
  ctx.moveTo(massPoly[0][0], massPoly[0][1]);
  for (let i = 1; i < massPoly.length; i++) {
    ctx.lineTo(massPoly[i][0], massPoly[i][1]);
  }
  ctx.closePath();
  ctx.fill();

  // Torn deckle boundary strokes & vertical ink drips
  for (let i = 3; i < massPoly.length - 1; i++) {
    const pt = massPoly[i];
    const nextPt = massPoly[i + 1];
    drawInkStroke(ctx, [pt, nextPt], rng, {
      baseWidth: rng.range(2.0, 4.0),
      color: THEME_COLORS.ink,
      dryBrush: true,
      doubleChance: 0.2,
    });

    if (structuralRng.chance(0.2)) {
      const dripLen = structuralRng.range(10, 32);
      drawInkStroke(
        ctx,
        [
          [pt[0], pt[1] - 2],
          [pt[0] + rng.range(-1, 1), pt[1] + dripLen],
        ],
        rng,
        { baseWidth: rng.range(1.1, 2.0), taperScale: 1.2, doubleChance: 0 }
      );
      if (rng.chance(0.55)) {
        drawInkDot(
          ctx,
          pt[0] + rng.range(-1, 1),
          pt[1] + dripLen + rng.range(3, 7),
          rng.range(1.0, 2.2),
          rng,
          THEME_COLORS.ink
        );
      }
    }
  }

  // White speckle holes inside the ink mass
  for (let h = 0; h < 55; h++) {
    const u = structuralRng.range(0.08, 0.98);
    const hx = massStartX + u * (W - massStartX);
    const maxY = H * (0.02 + 0.16 * u);
    const hy = structuralRng.range(4, Math.max(10, maxY));
    const hr = structuralRng.chance(0.18)
      ? structuralRng.range(2.8, 5.5)
      : structuralRng.range(0.9, 2.2);
    drawInkDot(ctx, hx, hy, hr, rng, THEME_COLORS.paperPure);
  }

  recorder.captureStage(canvas, 0.0, 0.25, 'top-down');

  // ===========================================================================
  // STAGE 2 (0.50): DISTANT CITY SKYLINE
  // ===========================================================================
  // Clean architectural skyscrapers along the horizon; center corridor (u = 0.38..0.66)
  // stays low (topY >= 0.47H) so the red orb and sight line float in pure white space.
  const farTowers = [
    { x: W * 0.16, botY: horizonY, topY: H * 0.33, litW: 24, shadowW: 11, leanPx: 3 },
    { x: W * 0.21, botY: horizonY, topY: H * 0.29, litW: 26, shadowW: 12, leanPx: -3 },
    { x: W * 0.26, botY: horizonY, topY: H * 0.35, litW: 22, shadowW: 10, leanPx: 2 },
    // Low center skyline below sight line & orb
    { x: W * 0.42, botY: horizonY, topY: H * 0.475, litW: 20, shadowW: 9 },
    { x: W * 0.46, botY: horizonY, topY: H * 0.48, litW: 22, shadowW: 9, leanPx: -2 },
    { x: W * 0.54, botY: horizonY, topY: H * 0.48, litW: 22, shadowW: 9, shadowOnLeft: true },
    { x: W * 0.58, botY: horizonY, topY: H * 0.475, litW: 20, shadowW: 9, shadowOnLeft: true },
    // Right distant skyline
    { x: W * 0.81, botY: horizonY, topY: H * 0.32, litW: 28, shadowW: 13, shadowOnLeft: true, leanPx: -4 },
    { x: W * 0.87, botY: horizonY, topY: H * 0.35, litW: 26, shadowW: 12, shadowOnLeft: true, leanPx: 3 },
  ];

  for (const t of farTowers) {
    drawArchitecturalTower(ctx, rng, { ...t, isFar: true });
  }

  recorder.captureStage(canvas, 0.25, 0.5, 'top-down');

  // ===========================================================================
  // STAGE 3 (0.75): MIDGROUND MONOLITH TOWERS & RUINED HIGHWAY OVERPASS
  // ===========================================================================
  // Solid ruined towers framing the avenue on left (u = 0.28) and right (u = 0.68..0.76)
  drawArchitecturalTower(ctx, rng, {
    x: W * 0.28,
    botY: horizonY + 4,
    topY: H * 0.24,
    litW: 46,
    shadowW: 20,
    leanPx: 5,
    brokenSteps: 3,
  });

  drawArchitecturalTower(ctx, rng, {
    x: W * 0.68,
    botY: horizonY + 4,
    topY: H * 0.25,
    litW: 48,
    shadowW: 21,
    shadowOnLeft: true,
    leanPx: -5,
    brokenSteps: 3,
  });

  drawArchitecturalTower(ctx, rng, {
    x: W * 0.76,
    botY: horizonY + 6,
    topY: H * 0.28,
    litW: 42,
    shadowW: 18,
    shadowOnLeft: true,
    leanPx: 4,
    brokenSteps: 2,
  });

  // Solid concrete highway overpass snapping off in mid-air on the left
  const overTop: Point2D[] = [
    [W * 0.22, H * 0.528],
    [W * 0.42, H * 0.495],
    [W * 0.426, H * 0.508],
    [W * 0.22, H * 0.545],
  ];
  const overBottom: Point2D[] = [
    [W * 0.22, H * 0.545],
    [W * 0.426, H * 0.508],
    [W * 0.42, H * 0.532],
    [W * 0.22, H * 0.572],
  ];
  const overPier: Point2D[] = [
    [W * 0.325, H * 0.53],
    [W * 0.345, H * 0.526],
    [W * 0.348, H * 0.62],
    [W * 0.322, H * 0.62],
  ];

  fillRoughenedPolygon(ctx, overPier, rng, THEME_COLORS.paperPure, 0.6);
  hatchPolygonClipped(ctx, overPier, rng, {
    angleRad: Math.PI * 0.5,
    spacing: 5.0,
    baseWidth: 1.35,
  });
  outlinePolygonWithInk(ctx, overPier, rng, { baseWidth: 1.8, wobbleScale: 0.3 });

  fillRoughenedPolygon(ctx, overTop, rng, THEME_COLORS.paperPure, 0.6);
  fillRoughenedPolygon(ctx, overBottom, rng, THEME_COLORS.paperPure, 0.6);
  hatchPolygonClipped(ctx, overBottom, rng, {
    angleRad: Math.PI * 0.5,
    spacing: 4.8,
    baseWidth: 1.4,
  });
  outlinePolygonWithInk(ctx, overTop, rng, { baseWidth: 1.9, wobbleScale: 0.3 });
  outlinePolygonWithInk(ctx, overBottom, rng, { baseWidth: 2.0, wobbleScale: 0.3 });

  recorder.captureStage(canvas, 0.5, 0.75, 'bottom-up');

  // ===========================================================================
  // STAGE 4 (1.00): CLEAN ONE-POINT PERSPECTIVE AVENUE
  // ===========================================================================
  // Clean warm paper ground plane below the horizon
  const groundPoly: Point2D[] = [
    [0, horizonY],
    [W, horizonY],
    [W, H],
    [0, H],
  ];
  fillRoughenedPolygon(ctx, groundPoly, rng, THEME_COLORS.paper, 0.8);

  // Clean horizontal horizon line
  drawInkStroke(
    ctx,
    [
      [0, horizonY],
      [W, horizonY],
    ],
    rng,
    { baseWidth: 1.8, wobbleScale: 0.25, breakChance: 0.05 }
  );

  // Authoritative one-point perspective avenue curb lines converging to (vpX, vpY)
  const curbRays: Array<{ end: Point2D; width: number }> = [
    { end: [W * 0.15, H], width: 2.2 }, // left outer sidewalk
    { end: [W * 0.25, H], width: 2.6 }, // left curb
    { end: [W * 0.81, H], width: 2.6 }, // right curb
    { end: [W * 0.93, H], width: 2.2 }, // right outer sidewalk
  ];

  for (const ray of curbRays) {
    const segs = 6;
    for (let i = 0; i < segs; i++) {
      const t0 = Math.pow(i / segs, 1.4);
      const t1 = Math.pow((i + 0.88) / segs, 1.4);
      const x0 = vpX + (ray.end[0] - vpX) * t0;
      const y0 = vpY + (ray.end[1] - vpY) * t0;
      const x1 = vpX + (ray.end[0] - vpX) * t1;
      const y1 = vpY + (ray.end[1] - vpY) * t1;
      drawInkStroke(ctx, [[x0, y0], [x1, y1]], rng, {
        baseWidth: Math.max(1.0, ray.width * (0.4 + 0.6 * t1)),
        wobbleScale: 0.25,
        taperScale: 1.1,
      });
    }
  }

  // Clean perspective dashed center lane markings
  const dashes = 8;
  for (let d = 1; d <= dashes; d++) {
    const t0 = Math.pow((d - 0.4) / dashes, 1.6);
    const t1 = Math.pow((d + 0.15) / dashes, 1.6);
    const y0 = vpY + (H - vpY) * t0;
    const y1 = vpY + (H - vpY) * t1;
    const cx0 = vpX + (W * 0.525 - vpX) * t0;
    const cx1 = vpX + (W * 0.525 - vpX) * t1;
    drawInkStroke(
      ctx,
      [
        [cx0, y0],
        [cx1, y1],
      ],
      rng,
      { baseWidth: Math.max(1.1, 2.6 * t1), wobbleScale: 0.2 }
    );
  }

  // Clean, subtle perspective transverse expansion cracks (horizontal hairline only, no spiky sticks!)
  for (const frac of [0.32, 0.58, 0.84]) {
    const y = vpY + (H - vpY) * frac;
    const lx = vpX + (W * 0.27 - vpX) * frac;
    const rx = vpX + (W * 0.79 - vpX) * frac;
    drawInkStroke(
      ctx,
      [
        [lx + (rx - lx) * 0.15, y],
        [lx + (rx - lx) * 0.85, y + rng.range(-1, 1)],
      ],
      rng,
      { baseWidth: Math.max(0.85, 1.25 * frac), wobbleScale: 0.35, breakChance: 0.2 }
    );
  }

  // Sparse red hazard diamond marker near right curb (#D4141C)
  const signPostBase: Point2D = [W * 0.785, H * 0.735];
  const signPostTop: Point2D = [W * 0.772, H * 0.69];
  drawInkStroke(ctx, [signPostBase, signPostTop], rng, {
    baseWidth: 1.4,
    wobbleScale: 0.2,
  });
  const signDiamond: Point2D[] = [
    [signPostTop[0], signPostTop[1] - 8],
    [signPostTop[0] + 6, signPostTop[1] - 1],
    [signPostTop[0], signPostTop[1] + 6],
    [signPostTop[0] - 6, signPostTop[1] - 1],
  ];
  fillRoughenedPolygon(ctx, signDiamond, rng, THEME_COLORS.red, 0.4);
  outlinePolygonWithInk(ctx, signDiamond, rng, {
    baseWidth: 1.1,
    wobbleScale: 0.15,
    doubleChance: 0,
  });

  recorder.captureStage(canvas, 0.75, 1.0, 'bottom-up');
}
