/**
 * FALLEN CITY — HAND-INKED RUINED CITY BACKGROUND (src/dashboard/eva/background.ts)
 *
 * A hand-inked ruined city drawn in the same architectural ink-on-paper style as the main site:
 * - Strict 3-color palette: warm paper (#FAFAF8), pure white (#FFFFFF), black ink (#0A0A0A),
 *   and very sparse red (#D4141C). Zero grey fills; shading comes strictly from hatching & stipple.
 * - Low-angle one-point perspective looking down a collapsed avenue toward vanishing point
 *   VP = (0.51W, 0.53H), directly behind the Eva-01 silhouette's shoulders and head.
 * - Composition leaves a clean white sky corridor around the red orb (u ~ 0.60, v ~ 0.39) and
 *   the sight line (u = 0.34..0.60, v ~ 0.42..0.48) so the background never clutters the foreground.
 * - Aspect-compensated geometry (designed for 16:10 / 16:9 widescreen projection from 1024x1024 UV).
 */

import { THEME_COLORS } from '../../config/theme.ts';
import { drawCatenaryCable } from '../../scene/art/cables.ts';
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
 * Software-clipping directional hatch helper so polygon hatching works identically
 * in browser Canvas2D/OffscreenCanvas and headless Node SoftwareCanvas2D.
 */
function hatchPolygonClipped(
  ctx: Canvas2DContext,
  poly: Point2D[],
  rng: PRNG,
  opts: {
    angleRad: number;
    spacing: number;
    baseWidth: number;
    toneAt: (u: number, v: number) => number;
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
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const diag = Math.hypot(w, h);

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

  const runPass = (angle: number, spacingMul: number, minTone: number) => {
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const nx = -sinA;
    const ny = cosA;

    let d = -diag * 0.55;
    while (d <= diag * 0.55) {
      d += opts.spacing * spacingMul * rng.range(0.82, 1.22);
      const ox = cx + nx * d;
      const oy = cy + ny * d;

      const steps = 22;
      let seg: Point2D[] = [];
      for (let s = 0; s <= steps; s++) {
        const along = (s / steps - 0.5) * diag * 1.08;
        const px = ox + cosA * along;
        const py = oy + sinA * along;
        if (inside(px, py)) {
          const u = (px - minX) / w;
          const v = (py - minY) / h;
          const tone = opts.toneAt(u, v);
          if (tone >= minTone) {
            seg.push([px, py]);
          } else {
            if (seg.length >= 2) {
              drawInkStroke(ctx, seg, rng, {
                baseWidth: opts.baseWidth * rng.range(0.85, 1.1),
                wobbleScale: 0.35,
                taperScale: 1.15,
                doubleChance: 0,
                imperfectJoin: false,
              });
            }
            seg = [];
            if (tone > 0.16 && rng.chance(0.18)) {
              drawInkDot(ctx, px, py, opts.baseWidth * 0.55, rng, THEME_COLORS.ink);
            }
          }
        } else {
          if (seg.length >= 2) {
            drawInkStroke(ctx, seg, rng, {
              baseWidth: opts.baseWidth * rng.range(0.85, 1.1),
              wobbleScale: 0.35,
              taperScale: 1.15,
              doubleChance: 0,
              imperfectJoin: false,
            });
          }
          seg = [];
        }
      }
      if (seg.length >= 2) {
        drawInkStroke(ctx, seg, rng, {
          baseWidth: opts.baseWidth * rng.range(0.85, 1.1),
          wobbleScale: 0.35,
          taperScale: 1.15,
          doubleChance: 0,
          imperfectJoin: false,
        });
      }
    }
  };

  runPass(opts.angleRad, 1.0, 0.32);
  if (opts.crossHatch) {
    runPass(opts.angleRad + 1.1, 1.5, 0.72);
  }
}

/**
 * Draws a 3D ruined tower with a clean white lit front face (broken top + tiny windows)
 * and a vertically hatched shadowed side face so buildings read as crisp manga architecture
 * with plenty of white paper negative space.
 */
function drawRuinedBuilding3D(
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
    splitGapW?: number;
    splitDepthFrac?: number;
    peelingFloors?: boolean;
    isFar?: boolean;
  }
): void {
  const lean = b.leanPx ?? 0;
  const h = b.botY - b.topY;
  const shadowLeft = b.shadowOnLeft ?? false;
  const outlineW = b.isFar ? 1.5 : 2.3;

  const litX0 = shadowLeft ? b.x + b.shadowW : b.x;
  const litX1 = litX0 + b.litW;
  const shX0 = shadowLeft ? b.x : litX1;
  const shX1 = shadowLeft ? litX0 : litX1 + b.shadowW;

  // Jagged snapped roof profile on lit face
  const roofNotchY = b.topY + h * rng.range(0.03, 0.08);
  const litPoly: Point2D[] = [
    [litX0, b.botY],
    [litX0 + lean, b.topY + h * 0.04],
    [litX0 + b.litW * 0.36 + lean, b.topY],
    [litX0 + b.litW * 0.64 + lean, roofNotchY],
    [litX1 + lean, b.topY + h * 0.02],
    [litX1, b.botY],
  ];

  const shadowPoly: Point2D[] = shadowLeft
    ? [
        [shX0, b.botY],
        [shX0 + lean, b.topY + h * 0.09],
        [shX1 + lean, b.topY + h * 0.04],
        [shX1, b.botY],
      ]
    : [
        [shX0, b.botY],
        [shX0 + lean, b.topY + h * 0.02],
        [shX1 + lean, b.topY + h * 0.08],
        [shX1, b.botY],
      ];

  // Fill both faces with clean white paper first to occlude anything behind
  fillRoughenedPolygon(ctx, litPoly, rng, THEME_COLORS.paperPure, 1.0);
  fillRoughenedPolygon(ctx, shadowPoly, rng, THEME_COLORS.paperPure, 1.0);

  // Vertical hatching ONLY on the shadowed side face (plus very sparse weathering at base of lit face)
  hatchPolygonClipped(ctx, shadowPoly, rng, {
    angleRad: Math.PI * 0.5 + (lean / Math.max(60, h)) * 0.6,
    spacing: b.isFar ? 7.5 : 5.5,
    baseWidth: b.isFar ? 1.15 : 1.55,
    toneAt: (u, v) => (b.isFar ? 0.48 : 0.62 + u * 0.25 + v * 0.15),
    crossHatch: !b.isFar,
  });

  if (!b.isFar) {
    hatchPolygonClipped(ctx, litPoly, rng, {
      angleRad: Math.PI * 0.5,
      spacing: 11.5,
      baseWidth: 1.15,
      toneAt: (u, v) => Math.max(0, (v - 0.78) * 1.6 + (u > 0.82 ? 0.35 : 0)),
    });
  }

  // Optional vertical split down the middle of midground towers with exposed rib girders
  if (b.splitGapW && b.splitDepthFrac) {
    const splitBottomY = b.topY + h * b.splitDepthFrac;
    const midX = (litX0 + litX1) * 0.5;
    const halfGap = b.splitGapW * 0.5;
    const chasmPoly: Point2D[] = [
      [midX - halfGap + lean, b.topY - 4],
      [midX + halfGap + lean, b.topY - 4],
      [midX + halfGap * 0.35 + lean * 0.4, splitBottomY],
      [midX - halfGap * 0.35 + lean * 0.4, splitBottomY],
    ];
    fillRoughenedPolygon(ctx, chasmPoly, rng, THEME_COLORS.paper, 0.8);
    drawInkStroke(
      ctx,
      [
        [midX - halfGap + lean, b.topY + 2],
        [midX - halfGap * 0.55 + lean * 0.6, (b.topY + splitBottomY) * 0.5],
        [midX - halfGap * 0.25 + lean * 0.4, splitBottomY],
      ],
      rng,
      { baseWidth: outlineW, wobbleScale: 0.65 }
    );
    drawInkStroke(
      ctx,
      [
        [midX + halfGap + lean, b.topY + 4],
        [midX + halfGap * 0.55 + lean * 0.6, (b.topY + splitBottomY) * 0.5],
        [midX + halfGap * 0.25 + lean * 0.4, splitBottomY],
      ],
      rng,
      { baseWidth: outlineW, wobbleScale: 0.65 }
    );

    // Rib-like exposed horizontal girders sticking into the split chasm
    const ribCount = 5;
    for (let r = 0; r < ribCount; r++) {
      const ry = b.topY + 12 + (r / ribCount) * (splitBottomY - b.topY - 18);
      const tShift = ((b.botY - ry) / h) * lean;
      const side = r % 2 === 0 ? -1 : 1;
      const rx0 = midX + side * halfGap * 0.75 + tShift;
      const rx1 = rx0 - side * (b.splitGapW * rng.range(0.55, 0.88));
      drawInkStroke(
        ctx,
        [
          [rx0, ry],
          [rx1, ry + rng.range(-2, 3)],
        ],
        rng,
        { baseWidth: 1.35, taperScale: 1.2, wobbleScale: 0.35 }
      );
    }
  }

  // Peeling floor slabs & protruding rib girders on outer broken edge
  if (b.peelingFloors) {
    for (let p = 0; p < 3; p++) {
      const py = b.topY + h * (0.14 + p * 0.16);
      const tShift = ((b.botY - py) / h) * lean;
      const edgeX = (shadowLeft ? shX0 : shX1) + tShift;
      const dir = shadowLeft ? -1 : 1;
      const span = rng.range(12, 22);
      const drop = rng.range(6, 13);
      drawInkStroke(
        ctx,
        [
          [edgeX - dir * 3, py],
          [edgeX + dir * span * 0.55, py + drop * 0.4],
          [edgeX + dir * span, py + drop],
        ],
        rng,
        { baseWidth: 1.6, taperScale: 1.2, wobbleScale: 0.45 }
      );
    }
  }

  // Crisp outlines
  outlinePolygonWithInk(ctx, shadowPoly, rng, {
    baseWidth: outlineW,
    doubleChance: b.isFar ? 0.12 : 0.22,
    breakChance: b.isFar ? 0.16 : 0.06,
    wobbleScale: 0.45,
  });
  outlinePolygonWithInk(ctx, litPoly, rng, {
    baseWidth: outlineW,
    doubleChance: b.isFar ? 0.15 : 0.25,
    breakChance: b.isFar ? 0.16 : 0.06,
    wobbleScale: 0.45,
    dryBrush: !b.isFar,
  });

  // Roof antenna / snapped spire rebar
  for (let a = 0; a < 2; a++) {
    const ax = litX0 + b.litW * (0.28 + a * 0.42) + lean;
    const ay = b.topY + 3;
    const ah = rng.range(8, 18);
    drawInkStroke(
      ctx,
      [
        [ax, ay],
        [ax + rng.range(-3, 4), ay - ah],
      ],
      rng,
      { baseWidth: 1.15, taperScale: 1.3, wobbleScale: 0.4 }
    );
  }

  // Tiny rectangular windows on the lit face (aspect-compensated so they look square/vertical on 16:9)
  const cols = Math.max(2, Math.floor(b.litW / (b.isFar ? 11 : 14)));
  const rows = Math.max(3, Math.floor(h / (b.isFar ? 18 : 22)));
  const winW = b.isFar ? 3.2 : 4.2;
  const winH = b.isFar ? 5.2 : 6.8;

  for (let r = 1; r < rows; r++) {
    const wy = b.topY + (r / rows) * (h - 14) + 6;
    const rowLean = ((b.botY - wy) / h) * lean;
    for (let c = 0; c < cols; c++) {
      if (rng.chance(0.28)) continue;
      const wx = litX0 + 6 + (c / Math.max(1, cols - 1)) * (b.litW - 14) + rowLean;
      // Skip if inside split chasm
      if (
        b.splitGapW &&
        b.splitDepthFrac &&
        wy < b.topY + h * b.splitDepthFrac &&
        Math.abs(wx - ((litX0 + litX1) * 0.5 + rowLean)) < b.splitGapW * 0.65
      ) {
        continue;
      }
      const winPoly: Point2D[] = [
        [wx, wy],
        [wx + winW, wy],
        [wx + winW, wy + winH],
        [wx, wy + winH],
      ];
      if (rng.chance(0.18)) {
        fillRoughenedPolygon(ctx, winPoly, rng, THEME_COLORS.ink, 0.35);
      } else {
        outlinePolygonWithInk(ctx, winPoly, rng, {
          baseWidth: 0.95,
          doubleChance: 0,
          wobbleScale: 0.25,
          imperfectJoin: false,
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

  // 1. Base warm white paper (#FAFAF8)
  ctx.fillStyle = THEME_COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.53;
  const vpX = W * 0.51;
  const vpY = horizonY;

  // ===========================================================================
  // STAGE 1 (0.25): SKY — TOP-RIGHT RAGGED BLACK INK MASS, WIND LINES & SMOKE
  // ===========================================================================
  // Keep top-right ink mass compact (y <= 0.20H) so it frames the upper sky
  // without colliding with the right-rail HUD cards or the red orb.
  const massStartX = W * 0.56;
  const massPoly: Point2D[] = [
    [massStartX, 0],
    [W, 0],
    [W, H * 0.21],
  ];
  const massSteps = 52;
  for (let i = massSteps; i >= 0; i--) {
    const u = i / massSteps;
    const x = massStartX + u * (W - massStartX);
    const env = Math.pow(u, 0.85);
    const baseY = H * (0.19 * env + Math.sin(u * Math.PI) * 0.03 * env);
    const warp = (structuralRng.fbm2D(u * 4.5, 1.8, 4) - 0.5) * Math.min(1, u * 3.0);
    const fine = (rng.noise1D(u * 26.0) - 0.5) * H * 0.016 * Math.min(1, u * 4.0);
    const y = Math.max(0, baseY + warp * H * 0.06 + fine);
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

  // Ragged boundary brush strokes & vertical ink drips
  for (let i = 3; i < massPoly.length - 1; i++) {
    const pt = massPoly[i];
    const nextPt = massPoly[i + 1];
    drawInkStroke(ctx, [pt, nextPt], rng, {
      baseWidth: rng.range(2.2, 4.4),
      color: THEME_COLORS.ink,
      dryBrush: true,
      doubleChance: 0.25,
    });

    if (structuralRng.chance(0.22)) {
      const dripLen = structuralRng.range(12, 38);
      drawInkStroke(
        ctx,
        [
          [pt[0], pt[1] - 2],
          [pt[0] + rng.range(-1.5, 1.5), pt[1] + dripLen],
        ],
        rng,
        { baseWidth: rng.range(1.2, 2.2), taperScale: 1.2, doubleChance: 0 }
      );
      if (rng.chance(0.6)) {
        drawInkDot(
          ctx,
          pt[0] + rng.range(-2, 2),
          pt[1] + dripLen + rng.range(3, 8),
          rng.range(1.1, 2.4),
          rng,
          THEME_COLORS.ink
        );
      }
    }
  }

  // White speckle holes inside the top-right black ink mass (aspect-compensated)
  for (let h = 0; h < 68; h++) {
    const u = structuralRng.range(0.08, 0.98);
    const hx = massStartX + u * (W - massStartX);
    const maxY = H * (0.02 + 0.17 * u);
    const hy = structuralRng.range(5, Math.max(12, maxY));
    const hr = structuralRng.chance(0.18)
      ? structuralRng.range(3.0, 6.5)
      : structuralRng.range(1.0, 2.6);
    drawInkDot(ctx, hx, hy, hr, rng, THEME_COLORS.paperPure);
  }

  // 4 thin, curved wind lines across the upper blank white sky
  const windLines: Array<[Point2D, Point2D, Point2D]> = [
    [
      [W * 0.14, H * 0.12],
      [W * 0.27, H * 0.095],
      [W * 0.41, H * 0.115],
    ],
    [
      [W * 0.24, H * 0.19],
      [W * 0.38, H * 0.165],
      [W * 0.51, H * 0.185],
    ],
    [
      [W * 0.36, H * 0.26],
      [W * 0.47, H * 0.24],
      [W * 0.58, H * 0.26],
    ],
    [
      [W * 0.18, H * 0.29],
      [W * 0.28, H * 0.27],
      [W * 0.36, H * 0.285],
    ],
  ];
  for (const wl of windLines) {
    drawInkStroke(ctx, wl, rng, {
      baseWidth: rng.range(1.0, 1.5),
      taperScale: 1.35,
      wobbleScale: 0.4,
      breakChance: 0.08,
      doubleChance: 0.15,
    });
  }

  // 3 slow plumes of ink smoke rising from behind the skyline (delicate contour wisps + stipple)
  const smokeAnchors: Array<{ x: number; baseY: number; topY: number; driftX: number }> = [
    { x: W * 0.27, baseY: horizonY - H * 0.14, topY: H * 0.13, driftX: -18 },
    { x: W * 0.52, baseY: horizonY - H * 0.06, topY: H * 0.28, driftX: 14 },
    { x: W * 0.75, baseY: horizonY - H * 0.16, topY: H * 0.22, driftX: -18 },
  ];
  for (const sm of smokeAnchors) {
    for (let strand = 0; strand < 2; strand++) {
      const pts: Point2D[] = [];
      const steps = 10;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const spread = (strand - 0.5) * (5 + t * 11);
        const sx =
          sm.x +
          spread +
          Math.sin(t * Math.PI * 1.4 + strand) * 5 +
          t * sm.driftX;
        const sy = sm.baseY - t * (sm.baseY - sm.topY);
        pts.push([sx, sy]);
      }
      drawInkStroke(ctx, pts, rng, {
        baseWidth: rng.range(0.9, 1.25),
        taperScale: 1.4,
        wobbleScale: 0.55,
        breakChance: 0.25,
        doubleChance: 0.1,
      });
    }
    for (let d = 0; d < 10; d++) {
      const t = rng.next();
      const sx = sm.x + t * sm.driftX + rng.range(-10, 10);
      const sy = sm.baseY - t * (sm.baseY - sm.topY) + rng.range(-5, 5);
      drawInkDot(ctx, sx, sy, rng.range(0.7, 1.3), rng, THEME_COLORS.ink);
    }
  }

  recorder.captureStage(canvas, 0.0, 0.25, 'top-down');

  // ===========================================================================
  // STAGE 2 (0.50): FAR SKYLINE — SNAPPED TOWERS & TOPPLED BRIDGE SKYSCRAPER
  // ===========================================================================
  // Keep center-corridor buildings low (topY >= 0.465H) so the red orb (v ~ 0.39)
  // and sight line (v ~ 0.42) sit in open white sky above the distant skyline!
  const farSkyline = [
    { x: W * 0.18, botY: horizonY, topY: H * 0.33, litW: 26, shadowW: 12, leanPx: 5 },
    { x: W * 0.23, botY: horizonY, topY: H * 0.30, litW: 28, shadowW: 13, leanPx: -4 },
    // Center avenue gap (kept low below sight line & orb)
    { x: W * 0.40, botY: horizonY, topY: H * 0.465, litW: 20, shadowW: 9, leanPx: 3 },
    { x: W * 0.445, botY: horizonY, topY: H * 0.472, litW: 22, shadowW: 9, leanPx: -3 },
    { x: W * 0.545, botY: horizonY, topY: H * 0.468, litW: 22, shadowW: 10, leanPx: -4, shadowOnLeft: true },
    { x: W * 0.60, botY: horizonY, topY: H * 0.465, litW: 22, shadowW: 10, leanPx: 4, shadowOnLeft: true },
    // Right-side distant towers
    { x: W * 0.81, botY: horizonY, topY: H * 0.32, litW: 30, shadowW: 14, leanPx: -6, shadowOnLeft: true },
    { x: W * 0.875, botY: horizonY, topY: H * 0.35, litW: 28, shadowW: 13, leanPx: 5, shadowOnLeft: true },
  ];

  for (const fb of farSkyline) {
    drawRuinedBuilding3D(ctx, rng, { ...fb, isFar: true });
  }

  // One distant skyscraper toppled diagonally across its neighbor like a bridge (at u = 0.45..0.55, y = 0.47..0.50H)
  const bridgePoly: Point2D[] = [
    [W * 0.45, H * 0.482],
    [W * 0.55, H * 0.462],
    [W * 0.554, H * 0.482],
    [W * 0.454, H * 0.502],
  ];
  fillRoughenedPolygon(ctx, bridgePoly, rng, THEME_COLORS.paperPure, 0.8);
  hatchPolygonClipped(ctx, bridgePoly, rng, {
    angleRad: Math.PI * 0.5,
    spacing: 7.5,
    baseWidth: 1.1,
    toneAt: (_u, v) => (v > 0.55 ? 0.55 : 0.0),
  });
  outlinePolygonWithInk(ctx, bridgePoly, rng, {
    baseWidth: 1.5,
    doubleChance: 0.15,
    breakChance: 0.12,
    wobbleScale: 0.4,
  });

  recorder.captureStage(canvas, 0.25, 0.5, 'top-down');

  // ===========================================================================
  // STAGE 3 (0.75): MIDGROUND SPLIT TOWERS, SNAPPED OVERPASS & LEANING CRANE
  // ===========================================================================
  // 3 enormous split towers framing the left and right sides of the collapsed avenue,
  // leaving the center sky corridor (u = 0.36..0.67) wide open for the red orb & sight line.
  drawRuinedBuilding3D(ctx, rng, {
    x: W * 0.285,
    botY: horizonY + 6,
    topY: H * 0.25,
    litW: 46,
    shadowW: 20,
    leanPx: 6,
    splitGapW: 10,
    splitDepthFrac: 0.54,
    peelingFloors: true,
  });

  drawRuinedBuilding3D(ctx, rng, {
    x: W * 0.675,
    botY: horizonY + 6,
    topY: H * 0.26,
    litW: 50,
    shadowW: 22,
    shadowOnLeft: true,
    leanPx: -6,
    splitGapW: 10,
    splitDepthFrac: 0.58,
    peelingFloors: true,
  });

  drawRuinedBuilding3D(ctx, rng, {
    x: W * 0.755,
    botY: horizonY + 8,
    topY: H * 0.28,
    litW: 44,
    shadowW: 19,
    shadowOnLeft: true,
    leanPx: 5,
    splitGapW: 9,
    splitDepthFrac: 0.48,
    peelingFloors: true,
  });

  // Bent construction crane rising from the right-center tower and leaning high OVER the orb
  const mastBaseX = W * 0.715;
  const mastBaseY = horizonY - H * 0.21;
  const mastTopX = W * 0.692;
  const mastTopY = H * 0.165;

  drawInkStroke(
    ctx,
    [
      [mastBaseX - 5, mastBaseY],
      [mastTopX - 3, mastTopY],
    ],
    rng,
    { baseWidth: 1.7, wobbleScale: 0.4 }
  );
  drawInkStroke(
    ctx,
    [
      [mastBaseX + 5, mastBaseY],
      [mastTopX + 3, mastTopY],
    ],
    rng,
    { baseWidth: 1.7, wobbleScale: 0.4 }
  );
  for (let i = 0; i < 8; i++) {
    const t0 = i / 8;
    const t1 = (i + 1) / 8;
    const x0 = mastBaseX + (mastTopX - mastBaseX) * t0 + (i % 2 === 0 ? -4 : 4);
    const y0 = mastBaseY + (mastTopY - mastBaseY) * t0;
    const x1 = mastBaseX + (mastTopX - mastBaseX) * t1 + (i % 2 === 0 ? 4 : -4);
    const y1 = mastBaseY + (mastTopY - mastBaseY) * t1;
    drawInkStroke(ctx, [[x0, y0], [x1, y1]], rng, { baseWidth: 1.1, wobbleScale: 0.3 });
  }

  // Bent crane jib boom kinked downward at the midpoint, staying clear of Eva's horn tip (u ~ 0.46)
  const jibKneeX = W * 0.595;
  const jibKneeY = H * 0.155;
  const jibTipX = W * 0.525;
  const jibTipY = H * 0.215;
  const jibCounterX = W * 0.748;
  const jibCounterY = H * 0.175;

  drawInkStroke(
    ctx,
    [
      [jibCounterX, jibCounterY],
      [mastTopX, mastTopY],
      [jibKneeX, jibKneeY],
      [jibTipX, jibTipY],
    ],
    rng,
    { baseWidth: 1.8, wobbleScale: 0.45, doubleChance: 0.2 }
  );
  drawInkStroke(
    ctx,
    [
      [jibCounterX, jibCounterY + 6],
      [mastTopX, mastTopY + 7],
      [jibKneeX, jibKneeY + 6],
      [jibTipX, jibTipY + 4],
    ],
    rng,
    { baseWidth: 1.2, wobbleScale: 0.4 }
  );
  // Dangling snapped crane cable from jib tip
  drawInkStroke(
    ctx,
    [
      [jibTipX + 2, jibTipY + 4],
      [jibTipX + 1, jibTipY + 36],
    ],
    rng,
    { baseWidth: 1.1, taperScale: 1.2, wobbleScale: 0.35 }
  );
  // Sparse red aircraft warning beacon dot on the crane peak (#D4141C)
  drawInkDot(ctx, mastTopX, mastTopY - 4, 3.2, rng, THEME_COLORS.red);

  // Highway overpass snapping off in mid-air from the left side over the street (below sight line)
  const overDeckTop: Point2D[] = [
    [W * 0.22, H * 0.525],
    [W * 0.435, H * 0.492],
    [W * 0.442, H * 0.506],
    [W * 0.22, H * 0.544],
  ];
  const overDeckUnderside: Point2D[] = [
    [W * 0.22, H * 0.544],
    [W * 0.442, H * 0.506],
    [W * 0.434, H * 0.532],
    [W * 0.22, H * 0.574],
  ];
  // Concrete support pier under the overpass
  const pierPoly: Point2D[] = [
    [W * 0.335, H * 0.525],
    [W * 0.358, H * 0.521],
    [W * 0.362, H * 0.625],
    [W * 0.332, H * 0.625],
  ];
  fillRoughenedPolygon(ctx, pierPoly, rng, THEME_COLORS.paperPure, 0.8);
  hatchPolygonClipped(ctx, pierPoly, rng, {
    angleRad: Math.PI * 0.5,
    spacing: 5.0,
    baseWidth: 1.4,
    toneAt: (u) => 0.45 + u * 0.4,
  });
  outlinePolygonWithInk(ctx, pierPoly, rng, { baseWidth: 1.9, wobbleScale: 0.4 });

  fillRoughenedPolygon(ctx, overDeckTop, rng, THEME_COLORS.paperPure, 0.9);
  fillRoughenedPolygon(ctx, overDeckUnderside, rng, THEME_COLORS.paperPure, 0.9);
  hatchPolygonClipped(ctx, overDeckUnderside, rng, {
    angleRad: Math.PI * 0.5,
    spacing: 4.8,
    baseWidth: 1.5,
    toneAt: () => 0.72,
  });
  outlinePolygonWithInk(ctx, overDeckTop, rng, { baseWidth: 2.0, wobbleScale: 0.45 });
  outlinePolygonWithInk(ctx, overDeckUnderside, rng, { baseWidth: 2.1, wobbleScale: 0.45 });

  // Broken rebar & concrete chunks hanging from the snapped overpass edge
  for (let r = 0; r < 5; r++) {
    const rx = W * 0.438 + rng.range(-3, 5);
    const ry = H * 0.502 + r * 5.5;
    drawInkStroke(
      ctx,
      [
        [rx, ry],
        [rx + rng.range(10, 20), ry + rng.range(8, 18)],
      ],
      rng,
      { baseWidth: 1.2, taperScale: 1.3, wobbleScale: 0.45 }
    );
  }

  recorder.captureStage(canvas, 0.5, 0.75, 'bottom-up');

  // ===========================================================================
  // STAGE 4 (1.00): ONE-POINT PERSPECTIVE STREET, DASHED LANES, POLES & CABLES
  // ===========================================================================
  // Clean warm paper ground plane below horizon
  const groundPoly: Point2D[] = [
    [0, horizonY],
    [W, horizonY],
    [W, H],
    [0, H],
  ];
  fillRoughenedPolygon(ctx, groundPoly, rng, THEME_COLORS.paper, 1.0);

  // Broken horizontal horizon ridge line
  for (let s = 0; s < 6; s++) {
    const x0 = (s / 6) * W;
    const x1 = ((s + 0.85) / 6) * W;
    drawInkStroke(
      ctx,
      [
        [x0, horizonY + rng.range(-2, 2)],
        [x1, horizonY + rng.range(-2, 2)],
      ],
      rng,
      { baseWidth: 1.6, breakChance: 0.18, wobbleScale: 0.4 }
    );
  }

  // One-point perspective avenue curb & sidewalk lines radiating from (vpX, vpY)
  const streetRays: Array<{ end: Point2D; width: number }> = [
    { end: [W * 0.14, H], width: 2.2 }, // left outer sidewalk edge
    { end: [W * 0.24, H], width: 2.6 }, // left curb
    { end: [W * 0.255, H], width: 1.4 }, // left curb lip
    { end: [W * 0.82, H], width: 2.6 }, // right curb
    { end: [W * 0.835, H], width: 1.4 }, // right curb lip
    { end: [W * 0.95, H], width: 2.0 }, // right outer sidewalk edge
  ];

  for (const ray of streetRays) {
    const segs = 7;
    for (let i = 0; i < segs; i++) {
      const t0 = Math.pow(i / segs, 1.45);
      const t1 = Math.pow((i + 0.86) / segs, 1.45);
      const x0 = vpX + (ray.end[0] - vpX) * t0;
      const y0 = vpY + (ray.end[1] - vpY) * t0;
      const x1 = vpX + (ray.end[0] - vpX) * t1;
      const y1 = vpY + (ray.end[1] - vpY) * t1;
      drawInkStroke(
        ctx,
        [
          [x0, y0],
          [(x0 + x1) * 0.5 + rng.range(-2, 2) * t1, (y0 + y1) * 0.5],
          [x1, y1],
        ],
        rng,
        {
          baseWidth: Math.max(0.95, ray.width * (0.35 + 0.65 * t1)),
          taperScale: 1.2,
          wobbleScale: 0.4,
          breakChance: 0.12,
        }
      );
    }
  }

  // Foreshortened perspective dashed lane markings (center double-dash + left/right lane dashes)
  const totalDashes = 9;
  for (let d = 1; d <= totalDashes; d++) {
    const t0 = Math.pow((d - 0.35) / totalDashes, 1.65);
    const t1 = Math.pow((d + 0.18) / totalDashes, 1.65);
    const y0 = vpY + (H - vpY) * t0;
    const y1 = vpY + (H - vpY) * t1;
    const buckleX = (rng.noise1D(d * 3.7) - 0.5) * 8 * t1;

    // Center double-dashed line receding toward (vpX, vpY)
    const cx0 = vpX + (W * 0.525 - vpX) * t0 + buckleX;
    const cx1 = vpX + (W * 0.525 - vpX) * t1 + buckleX;
    const sep = 1.2 + 4.5 * t1;
    const lw = Math.max(1.0, 2.4 * t1);

    for (const side of [-1, 1]) {
      drawInkStroke(
        ctx,
        [
          [cx0 + side * sep * 0.85, y0],
          [cx1 + side * sep, y1],
        ],
        rng,
        { baseWidth: lw, taperScale: 1.1, wobbleScale: 0.3 }
      );
    }

    // Secondary lane dashes on left and right lanes
    if (d % 2 === 1) {
      for (const laneEndX of [W * 0.38, W * 0.67]) {
        const lx0 = vpX + (laneEndX - vpX) * t0 + buckleX * 0.6;
        const lx1 = vpX + (laneEndX - vpX) * t1 + buckleX * 0.6;
        drawInkStroke(
          ctx,
          [
            [lx0, y0],
            [lx1, y1],
          ],
          rng,
          { baseWidth: Math.max(0.95, 2.0 * t1), taperScale: 1.15, wobbleScale: 0.3 }
        );
      }
    }
  }

  // Subtle perspective asphalt fissures & small rubble clusters (no spiky ticks!)
  const fissureDepths = [0.18, 0.34, 0.54, 0.76, 0.92];
  for (let f = 0; f < fissureDepths.length; f++) {
    const persp = fissureDepths[f];
    const baseY = vpY + (H - vpY) * persp;
    const leftCurbX = vpX + (W * 0.25 - vpX) * persp;
    const rightCurbX = vpX + (W * 0.81 - vpX) * persp;
    const spanX = rightCurbX - leftCurbX;

    const startX = leftCurbX + spanX * rng.range(0.08, 0.28);
    const endX = leftCurbX + spanX * rng.range(0.58, 0.88);
    const steps = 6;
    const crackPts: Point2D[] = [];
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      const px = startX + (endX - startX) * u;
      const py = baseY + Math.sin(u * Math.PI * 2.0 + f) * (4.5 * persp) + rng.range(-2, 2) * persp;
      crackPts.push([px, py]);
    }
    drawInkStroke(ctx, crackPts, rng, {
      baseWidth: Math.max(0.95, 1.65 * persp),
      taperScale: 1.35,
      wobbleScale: 0.45,
      breakChance: 0.15,
    });

    // Forked hairline sub-crack
    const midPt = crackPts[Math.floor(steps * 0.5)];
    drawInkStroke(
      ctx,
      [
        midPt,
        [midPt[0] + 18 * persp, midPt[1] + 7 * persp],
        [midPt[0] + 34 * persp, midPt[1] + 4 * persp],
      ],
      rng,
      { baseWidth: Math.max(0.85, 1.15 * persp), taperScale: 1.4, wobbleScale: 0.4 }
    );

    // Small angular rubble stone & gravel stipple near the fissure
    for (let r = 0; r < 2; r++) {
      const rx = leftCurbX + spanX * rng.range(0.15, 0.85);
      const ry = baseY + rng.range(-8, 12) * persp;
      const rw = (3.5 + rng.range(0, 4.5)) * persp;
      const rh = rw * 0.55;
      const stonePoly: Point2D[] = [
        [rx - rw, ry],
        [rx - rw * 0.2, ry - rh],
        [rx + rw * 0.8, ry - rh * 0.5],
        [rx + rw, ry + rh * 0.2],
        [rx, ry + rh * 0.4],
      ];
      fillRoughenedPolygon(ctx, stonePoly, rng, THEME_COLORS.paperPure, 0.4);
      outlinePolygonWithInk(ctx, stonePoly, rng, {
        baseWidth: Math.max(0.9, 1.3 * persp),
        wobbleScale: 0.35,
        doubleChance: 0,
      });
      for (let d = 0; d < 3; d++) {
        drawInkDot(
          ctx,
          rx + rng.range(-12, 14) * persp,
          ry + rng.range(-3, 5) * persp,
          Math.max(0.75, 1.3 * persp),
          rng,
          THEME_COLORS.ink
        );
      }
    }
  }

  // Standing leaning utility poles receding along the avenue + sagging catenary power lines
  const poles: Array<{ base: Point2D; top: Point2D; armW: number; width: number }> = [
    // Near-left leaning pole (just right of Eva's lower jaw)
    {
      base: [W * 0.365, H * 0.675],
      top: [W * 0.392, H * 0.435],
      armW: 22,
      width: 2.3,
    },
    // Mid-left pole
    {
      base: [W * 0.435, H * 0.585],
      top: [W * 0.448, H * 0.465],
      armW: 14,
      width: 1.5,
    },
    // Near-right leaning pole
    {
      base: [W * 0.815, H * 0.775],
      top: [W * 0.775, H * 0.425],
      armW: 26,
      width: 2.5,
    },
    // Mid-right pole
    {
      base: [W * 0.642, H * 0.605],
      top: [W * 0.628, H * 0.455],
      armW: 15,
      width: 1.6,
    },
  ];

  for (const p of poles) {
    drawInkStroke(ctx, [p.base, p.top], rng, {
      baseWidth: p.width,
      wobbleScale: 0.4,
      doubleChance: 0.15,
    });
    const armY = p.top[1] + (p.base[1] - p.top[1]) * 0.1;
    drawInkStroke(
      ctx,
      [
        [p.top[0] - p.armW * 0.5, armY - 2],
        [p.top[0] + p.armW * 0.5, armY + 3],
      ],
      rng,
      { baseWidth: Math.max(1.1, p.width * 0.7), wobbleScale: 0.35 }
    );
  }

  // Fallen utility pole lying diagonally across the lower-left/mid street
  const fallenPoleStart: Point2D = [W * 0.35, H * 0.74];
  const fallenPoleEnd: Point2D = [W * 0.485, H * 0.785];
  drawInkStroke(
    ctx,
    [
      fallenPoleStart,
      [(fallenPoleStart[0] + fallenPoleEnd[0]) * 0.5, (fallenPoleStart[1] + fallenPoleEnd[1]) * 0.5 - 2],
      fallenPoleEnd,
    ],
    rng,
    { baseWidth: 2.2, wobbleScale: 0.4, doubleChance: 0.15 }
  );
  // Broken crossarm on the fallen pole
  drawInkStroke(
    ctx,
    [
      [fallenPoleEnd[0] - 4, fallenPoleEnd[1] - 9],
      [fallenPoleEnd[0] + 6, fallenPoleEnd[1] + 8],
    ],
    rng,
    { baseWidth: 1.5, wobbleScale: 0.35 }
  );

  // Sagging catenary power lines along the curbs and crossing the far avenue
  const powerCables = [
    { start: poles[0].top, end: poles[1].top, sag: 16, thickness: 1.15 },
    { start: poles[2].top, end: poles[3].top, sag: 18, thickness: 1.15 },
    { start: poles[1].top, end: poles[3].top, sag: 22, thickness: 1.05 },
    { start: poles[0].top, end: fallenPoleEnd, sag: 18, thickness: 1.1 },
  ];
  for (const c of powerCables) {
    drawCatenaryCable(ctx, {
      start: c.start,
      end: c.end,
      sag: c.sag,
      baseWidth: c.thickness,
      rng,
      structuralRng,
      tieTicks: false,
    });
  }

  // Sparse red accent #2: small tilted roadside hazard diamond sign near right curb
  const signPostBase: Point2D = [W * 0.785, H * 0.735];
  const signPostTop: Point2D = [W * 0.772, H * 0.688];
  drawInkStroke(ctx, [signPostBase, signPostTop], rng, {
    baseWidth: 1.5,
    wobbleScale: 0.35,
  });
  const signDiamond: Point2D[] = [
    [signPostTop[0], signPostTop[1] - 8],
    [signPostTop[0] + 6, signPostTop[1] - 1],
    [signPostTop[0], signPostTop[1] + 6],
    [signPostTop[0] - 6, signPostTop[1] - 1],
  ];
  fillRoughenedPolygon(ctx, signDiamond, rng, THEME_COLORS.red, 0.4);
  outlinePolygonWithInk(ctx, signDiamond, rng, {
    baseWidth: 1.2,
    wobbleScale: 0.25,
    doubleChance: 0,
  });

  recorder.captureStage(canvas, 0.75, 1.0, 'bottom-up');
}
