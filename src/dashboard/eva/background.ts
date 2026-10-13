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
import {
  drawInkSpatterCluster,
  type AnyCanvas,
  type EvaDrawOrderRecorder,
} from './evaSurface.ts';

/**
 * Clips a line segment (p0 -> p1) against a convex/simple polygon and draws
 * variable-width hand-inked hatch strokes for every interior segment.
 * Works identically in browser Canvas2D, OffscreenCanvas, and Node SoftwareCanvas2D
 * without relying on `ctx.clip()`.
 */
function pointInPolygon(x: number, y: number, poly: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function hatchPolygonVerticalOrAngled(
  ctx: Canvas2DContext,
  poly: Point2D[],
  rng: PRNG,
  opts: {
    angleRad: number;
    spacing: number;
    baseWidth: number;
    breakChance?: number;
    doubleChance?: number;
    stippleChance?: number;
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
  const cosA = Math.cos(opts.angleRad);
  const sinA = Math.sin(opts.angleRad);
  const perpX = -sinA;
  const perpY = cosA;

  let cursor = -diag * 0.55;
  while (cursor <= diag * 0.55) {
    cursor += opts.spacing * rng.range(0.72, 1.28);
    const ox = cx + perpX * cursor;
    const oy = cy + perpY * cursor;

    const steps = 16;
    let run: Point2D[] = [];
    for (let s = 0; s <= steps; s++) {
      const along = (s / steps - 0.5) * diag * 1.1;
      const px = ox + cosA * along;
      const py = oy + sinA * along;
      if (pointInPolygon(px, py, poly)) {
        if (opts.breakChance && rng.chance(opts.breakChance)) {
          if (run.length >= 2) {
            drawInkStroke(ctx, run, rng, {
              baseWidth: opts.baseWidth * rng.range(0.8, 1.2),
              color: THEME_COLORS.ink,
              wobbleScale: 0.55,
              taperScale: 1.1,
              doubleChance: opts.doubleChance ?? 0,
              breakChance: 0,
            });
          }
          run = [];
        } else {
          run.push([px, py]);
        }
      } else {
        if (run.length >= 2) {
          drawInkStroke(ctx, run, rng, {
            baseWidth: opts.baseWidth * rng.range(0.8, 1.2),
            color: THEME_COLORS.ink,
            wobbleScale: 0.55,
            taperScale: 1.1,
            doubleChance: opts.doubleChance ?? 0,
            breakChance: 0,
          });
        } else if (run.length === 1 && opts.stippleChance && rng.chance(opts.stippleChance)) {
          drawInkDot(ctx, run[0][0], run[0][1], opts.baseWidth * 0.65, rng, THEME_COLORS.ink);
        }
        run = [];
      }
    }
    if (run.length >= 2) {
      drawInkStroke(ctx, run, rng, {
        baseWidth: opts.baseWidth * rng.range(0.8, 1.2),
        color: THEME_COLORS.ink,
        wobbleScale: 0.55,
        taperScale: 1.1,
        doubleChance: opts.doubleChance ?? 0,
        breakChance: 0,
      });
    }
  }
}

/**
 * Draws the "Fallen City" dashboard background scene (1024x1024):
 * - Low-angle view looking down a collapsed one-point perspective avenue.
 * - Horizon sits about halfway up the screen (y = 0.52H), directly behind Eva-01's shoulders and head.
 * - Sky: almost entirely blank white paper, with a single ragged black ink mass bleeding in from
 *   the top-right corner (torn edges, white speckle holes, vertical ink drips), thin curved wind
 *   lines across the empty sky, and 3 slow plumes of ink smoke rising from behind the skyline.
 * - Far distance: jagged row of snapped skyscrapers drawn in thin broken lines with sparse vertical
 *   hatching and no solid black, standing at different heights/angles, one toppled across its
 *   neighbor like a bridge, with tiny empty rectangular windows and a few blacked out.
 * - Closer in: 3 enormous split towers with peeling floors, rib-like exposed girders, heavier
 *   vertical hatching on shadowed faces, a snapped mid-air highway overpass hanging over the
 *   street, and a bent construction crane leaning across the scene.
 * - Street: runs toward the horizon in one-point perspective with cracked asphalt, broken dashed
 *   lane markings, sagging catenary power lines, standing poles, and a fallen pole across the road.
 */
export function drawEvaStageBackground(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  recorder: EvaDrawOrderRecorder,
  seed = 701
): void {
  const W = canvas.width;
  const H = canvas.height;
  const s = W / 1024;
  const rng = createRng(seed);
  const structuralRng = createRng(seed + 103);

  // Base white paper
  ctx.fillStyle = THEME_COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.52;
  const vpX = W * 0.56;
  const vpY = horizonY;

  // ===========================================================================
  // 1. SKY: TOP-RIGHT RAGGED BLACK INK MASS, SPECKLE HOLES, DRIPS, WIND & SMOKE
  // ===========================================================================
  // Single ragged black ink mass bleeding in from top-right corner (x = 0.62W..W, y = 0..0.28H)
  const massStartX = W * 0.62;
  const massEndY = H * 0.28;
  const skyMassPoly: Point2D[] = [
    [massStartX, 0],
    [W, 0],
    [W, massEndY],
  ];
  const massSteps = 48;
  for (let i = massSteps; i >= 0; i--) {
    const u = i / massSteps;
    const x = massStartX + u * (W - massStartX);
    const env = Math.pow(u, 0.85);
    const baseY = massEndY * env + Math.sin(u * Math.PI) * H * 0.035 * env;
    const warp = (structuralRng.fbm2D(u * 5.0, 2.1, 4) - 0.5) * H * 0.085 * Math.min(1, u * 2.8);
    const jag = (rng.noise1D(u * 26.0) - 0.5) * H * 0.022 * Math.min(1, u * 3.5);
    skyMassPoly.push([x, Math.max(0, baseY + warp + jag)]);
  }
  fillRoughenedPolygon(ctx, skyMassPoly, rng, THEME_COLORS.ink, 2.2 * s);

  // Torn dry-brush boundary strokes, spatter & vertical ink drips from the top-right mass
  for (let i = 3; i < skyMassPoly.length - 1; i++) {
    const pt = skyMassPoly[i];
    const nextPt = skyMassPoly[i + 1];
    drawInkStroke(ctx, [pt, nextPt], rng, {
      baseWidth: rng.range(3.0, 6.2) * s,
      color: THEME_COLORS.ink,
      dryBrush: true,
      doubleChance: 0.35,
    });

    if (structuralRng.chance(0.26)) {
      const dripLen = structuralRng.range(18, 68) * s;
      drawInkStroke(
        ctx,
        [
          [pt[0], pt[1] - 3 * s],
          [pt[0] + rng.range(-2.5, 2.5) * s, pt[1] + dripLen],
        ],
        rng,
        {
          baseWidth: rng.range(1.4, 2.8) * s,
          color: THEME_COLORS.ink,
          taperScale: 1.2,
          doubleChance: 0.08,
        }
      );
      if (rng.chance(0.7)) {
        drawInkDot(
          ctx,
          pt[0] + rng.range(-3, 3) * s,
          pt[1] + dripLen + rng.range(4, 11) * s,
          rng.range(1.4, 3.2) * s,
          rng,
          THEME_COLORS.ink
        );
      }
    }
  }

  // White speckle holes inside the top-right ink mass
  for (let h = 0; h < 68; h++) {
    const u = structuralRng.range(0.1, 0.98);
    const hx = massStartX + u * (W - massStartX);
    const maxY = massEndY * u * 0.92;
    const hy = structuralRng.range(5 * s, Math.max(14 * s, maxY));
    const hr =
      (structuralRng.chance(0.2) ? structuralRng.range(3.8, 8.5) : structuralRng.range(1.1, 3.2)) *
      s;
    drawInkDot(ctx, hx, hy, hr, rng, THEME_COLORS.paper);
  }

  // Thin curved wind lines sweeping across the empty white sky
  const windLines: Array<[number, number, number, number]> = [
    [0.18, 0.11, 0.42, 0.09],
    [0.28, 0.17, 0.56, 0.15],
    [0.44, 0.22, 0.68, 0.20],
    [0.14, 0.25, 0.35, 0.23],
  ];
  for (const [u0, v0, u1, v1] of windLines) {
    const pts: Point2D[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const wx = W * (u0 + (u1 - u0) * t);
      const wy = H * (v0 + (v1 - v0) * t) - Math.sin(t * Math.PI) * 16 * s;
      pts.push([wx, wy]);
    }
    drawInkStroke(ctx, pts, rng, {
      baseWidth: rng.range(1.1, 1.8) * s,
      color: THEME_COLORS.ink,
      taperScale: 1.25,
      doubleChance: 0.15,
      breakChance: 0.08,
    });
  }

  // 3 slow plumes of ink smoke rising from behind the distant skyline
  const smokePlumes = [
    { baseX: W * 0.38, baseY: horizonY - 28 * s, topX: W * 0.33, topY: H * 0.14, spread: 26 * s },
    { baseX: W * 0.53, baseY: horizonY - 22 * s, topX: W * 0.49, topY: H * 0.16, spread: 22 * s },
    { baseX: W * 0.74, baseY: horizonY - 34 * s, topX: W * 0.78, topY: H * 0.18, spread: 28 * s },
  ];
  for (const plume of smokePlumes) {
    for (let strand = -2; strand <= 2; strand++) {
      const sPts: Point2D[] = [];
      const steps = 14;
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const widen = Math.pow(t, 0.75) * plume.spread;
        const sway = Math.sin(t * Math.PI * 2.2 + strand * 0.8) * (8 + t * 14) * s;
        const px =
          plume.baseX + (plume.topX - plume.baseX) * t + sway + strand * 0.38 * widen;
        const py = plume.baseY + (plume.topY - plume.baseY) * t;
        sPts.push([px, py]);

        // Ascending smoke stipple & ash flecks
        if (rng.chance(0.42)) {
          drawInkDot(
            ctx,
            px + rng.range(-widen * 0.6, widen * 0.6),
            py + rng.range(-8 * s, 8 * s),
            rng.range(0.8, 1.8) * s,
            rng,
            THEME_COLORS.ink
          );
        }
      }
      drawInkStroke(ctx, sPts, rng, {
        baseWidth: rng.range(0.9, 1.5) * s,
        color: THEME_COLORS.ink,
        wobbleScale: 0.9,
        taperScale: 1.3,
        breakChance: 0.22,
        doubleChance: 0.12,
      });
    }
  }

  recorder.captureStage(canvas, 0.02, 0.05, 'top-down');

  // ===========================================================================
  // 2. FAR DISTANCE: JAGGED ROW OF SNAPPED SKYSCRAPERS + TOPPLED BRIDGE TOWER
  // Thin broken lines, sparse vertical hatching, no solid black, tiny windows
  // ===========================================================================
  interface FarTowerSpec {
    x: number;
    w: number;
    h: number;
    leanDeg: number;
    roofLeftDrop: number;
    roofRightDrop: number;
  }

  const farTowers: FarTowerSpec[] = [
    { x: 0.16 * W, w: 0.042 * W, h: 0.11 * H, leanDeg: 2.5, roofLeftDrop: 8 * s, roofRightDrop: 18 * s },
    { x: 0.21 * W, w: 0.048 * W, h: 0.15 * H, leanDeg: -3.2, roofLeftDrop: 22 * s, roofRightDrop: 6 * s },
    { x: 0.34 * W, w: 0.044 * W, h: 0.16 * H, leanDeg: 1.8, roofLeftDrop: 14 * s, roofRightDrop: 24 * s },
    { x: 0.39 * W, w: 0.052 * W, h: 0.21 * H, leanDeg: -2.0, roofLeftDrop: 6 * s, roofRightDrop: 28 * s },
    // Tower that snaps and topples across its right neighbor like a bridge:
    { x: 0.455 * W, w: 0.044 * W, h: 0.18 * H, leanDeg: 6.5, roofLeftDrop: 10 * s, roofRightDrop: 20 * s },
    // Neighboring tower receiving the toppled bridge section:
    { x: 0.535 * W, w: 0.050 * W, h: 0.19 * H, leanDeg: -1.5, roofLeftDrop: 18 * s, roofRightDrop: 8 * s },
    { x: 0.592 * W, w: 0.040 * W, h: 0.13 * H, leanDeg: 4.2, roofLeftDrop: 12 * s, roofRightDrop: 4 * s },
    { x: 0.735 * W, w: 0.048 * W, h: 0.17 * H, leanDeg: -3.8, roofLeftDrop: 20 * s, roofRightDrop: 10 * s },
    { x: 0.790 * W, w: 0.042 * W, h: 0.12 * H, leanDeg: 2.0, roofLeftDrop: 6 * s, roofRightDrop: 16 * s },
    { x: 0.935 * W, w: 0.046 * W, h: 0.14 * H, leanDeg: -4.5, roofLeftDrop: 15 * s, roofRightDrop: 5 * s },
  ];

  const drawFarSnappedTower = (t: FarTowerSpec) => {
    const leanShift = Math.tan((t.leanDeg * Math.PI) / 180) * t.h;
    const bl: Point2D = [t.x, horizonY];
    const br: Point2D = [t.x + t.w, horizonY];
    const tl: Point2D = [t.x + leanShift, horizonY - t.h + t.roofLeftDrop];
    const tm1: Point2D = [
      t.x + t.w * 0.38 + leanShift,
      horizonY - t.h - 4 * s,
    ];
    const tm2: Point2D = [
      t.x + t.w * 0.68 + leanShift,
      horizonY - t.h + 9 * s,
    ];
    const tr: Point2D = [t.x + t.w + leanShift, horizonY - t.h + t.roofRightDrop];

    const poly: Point2D[] = [bl, tl, tm1, tm2, tr, br];
    fillRoughenedPolygon(ctx, poly, rng, THEME_COLORS.paper, 1.2 * s);

    // Sparse vertical hatching on the right-hand shadow half (no solid black)
    const shadowPoly: Point2D[] = [
      [(bl[0] + br[0]) * 0.52, horizonY],
      [tm2[0], tm2[1]],
      tr,
      br,
    ];
    hatchPolygonVerticalOrAngled(ctx, shadowPoly, rng, {
      angleRad: Math.PI * 0.5,
      spacing: 8.5 * s,
      baseWidth: 1.05 * s,
      breakChance: 0.25,
      stippleChance: 0.35,
    });

    // Thin, broken outline strokes
    for (let i = 0; i < poly.length; i++) {
      drawInkStroke(ctx, [poly[i], poly[(i + 1) % poly.length]], rng, {
        baseWidth: 1.35 * s,
        color: THEME_COLORS.ink,
        wobbleScale: 0.7,
        breakChance: 0.18,
        doubleChance: 0.2,
      });
    }

    // Protruding rebar needles at snapped roof
    for (let r = 0; r < 3; r++) {
      const rx = tl[0] + (tr[0] - tl[0]) * (0.2 + r * 0.3);
      const ry = tl[1] + (tr[1] - tl[1]) * (0.2 + r * 0.3);
      drawInkStroke(
        ctx,
        [
          [rx, ry],
          [rx + rng.range(-3, 3) * s, ry - rng.range(7, 16) * s],
        ],
        rng,
        { baseWidth: 0.95 * s, color: THEME_COLORS.ink, doubleChance: 0 }
      );
    }

    // Tiny empty rectangular windows, with a few blacked out
    const cols = 3;
    const rows = Math.max(3, Math.floor(t.h / (18 * s)));
    for (let r = 1; r < rows; r++) {
      const vf = r / (rows + 0.5);
      const rowY = horizonY - t.h * (1 - vf * 0.82);
      const rowShift = leanShift * (1 - vf * 0.82);
      for (let c = 0; c < cols; c++) {
        if (rng.chance(0.22)) continue;
        const wx = t.x + rowShift + (c + 0.6) * (t.w / (cols + 0.8));
        const wy = rowY;
        const ww = 4.2 * s;
        const wh = 6.2 * s;
        const wPoly: Point2D[] = [
          [wx, wy],
          [wx + ww, wy],
          [wx + ww, wy + wh],
          [wx, wy + wh],
        ];
        if (rng.chance(0.18)) {
          // A few windows are blacked out
          fillRoughenedPolygon(ctx, wPoly, rng, THEME_COLORS.ink, 0.4 * s);
        } else {
          outlinePolygonWithInk(ctx, wPoly, rng, {
            baseWidth: 0.85 * s,
            color: THEME_COLORS.ink,
            wobbleScale: 0.35,
            doubleChance: 0,
          });
        }
      }
    }
  };

  for (const ft of farTowers) {
    drawFarSnappedTower(ft);
  }

  // Toppled upper skyscraper section fallen diagonally across its neighbor like a bridge
  const bridgePoly: Point2D[] = [
    [0.468 * W, horizonY - 0.145 * H],
    [0.572 * W, horizonY - 0.182 * H],
    [0.584 * W, horizonY - 0.148 * H],
    [0.476 * W, horizonY - 0.112 * H],
  ];
  fillRoughenedPolygon(ctx, bridgePoly, rng, THEME_COLORS.paper, 1.0 * s);
  hatchPolygonVerticalOrAngled(ctx, bridgePoly, rng, {
    angleRad: Math.PI * 0.5,
    spacing: 7.5 * s,
    baseWidth: 1.1 * s,
    breakChance: 0.2,
  });
  outlinePolygonWithInk(ctx, bridgePoly, rng, {
    baseWidth: 1.45 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.65,
    doubleChance: 0.25,
    breakChance: 0.12,
  });
  // Tiny tilted windows on the toppled bridge tower
  for (let k = 0; k < 5; k++) {
    const u = (k + 0.8) / 6.2;
    const bx = bridgePoly[0][0] + (bridgePoly[1][0] - bridgePoly[0][0]) * u;
    const by = bridgePoly[0][1] + (bridgePoly[1][1] - bridgePoly[0][1]) * u + 6 * s;
    const bwPoly: Point2D[] = [
      [bx, by],
      [bx + 6 * s, by - 2 * s],
      [bx + 7 * s, by + 3 * s],
      [bx + 1 * s, by + 5 * s],
    ];
    if (k === 2) {
      fillRoughenedPolygon(ctx, bwPoly, rng, THEME_COLORS.ink, 0.3 * s);
    } else {
      outlinePolygonWithInk(ctx, bwPoly, rng, {
        baseWidth: 0.85 * s,
        color: THEME_COLORS.ink,
        doubleChance: 0,
      });
    }
  }

  recorder.captureStage(canvas, 0.05, 0.08, 'left-right');

  // ===========================================================================
  // 3. CLOSER IN: 3 ENORMOUS SPLIT TOWERS WITH PEELING FLOORS & GIRDER RIBS,
  //    BENT CONSTRUCTION CRANE, AND SNAPPED MID-AIR HIGHWAY OVERPASS
  // ===========================================================================
  const drawSplitMegatower = (
    baseX: number,
    baseY: number,
    width: number,
    height: number,
    leanLeftDeg: number,
    leanRightDeg: number
  ) => {
    const splitW = width * 0.14;
    const halfW = (width - splitW) * 0.5;
    const shiftL = Math.tan((leanLeftDeg * Math.PI) / 180) * height;
    const shiftR = Math.tan((leanRightDeg * Math.PI) / 180) * height;

    // Left split half
    const leftHalf: Point2D[] = [
      [baseX, baseY],
      [baseX + shiftL, baseY - height + 18 * s],
      [baseX + halfW * 0.55 + shiftL, baseY - height - 6 * s],
      [baseX + halfW + shiftL, baseY - height + 12 * s],
      [baseX + halfW + splitW * 0.25, baseY - height * 0.38],
      [baseX + halfW, baseY],
    ];
    // Right split half (shadowed face)
    const rightHalf: Point2D[] = [
      [baseX + halfW + splitW * 0.4, baseY],
      [baseX + halfW + splitW * 0.65, baseY - height * 0.42],
      [baseX + halfW + splitW + shiftR, baseY - height + 24 * s],
      [baseX + width - halfW * 0.35 + shiftR, baseY - height + 4 * s],
      [baseX + width + shiftR, baseY - height + 28 * s],
      [baseX + width, baseY],
    ];

    fillRoughenedPolygon(ctx, leftHalf, rng, THEME_COLORS.paper, 1.6 * s);
    fillRoughenedPolygon(ctx, rightHalf, rng, THEME_COLORS.paper, 1.6 * s);

    // Heavier vertical hatching on the shadowed faces
    hatchPolygonVerticalOrAngled(ctx, rightHalf, rng, {
      angleRad: Math.PI * 0.5,
      spacing: 4.8 * s,
      baseWidth: 1.75 * s,
      breakChance: 0.1,
      doubleChance: 0.18,
    });
    // Lighter vertical hatching along the inner split edge of the left half
    const leftInnerShadow: Point2D[] = [
      [baseX + halfW * 0.55, baseY],
      [baseX + halfW * 0.62 + shiftL, baseY - height + 10 * s],
      leftHalf[3],
      leftHalf[4],
      leftHalf[5],
    ];
    hatchPolygonVerticalOrAngled(ctx, leftInnerShadow, rng, {
      angleRad: Math.PI * 0.5,
      spacing: 6.8 * s,
      baseWidth: 1.35 * s,
      breakChance: 0.18,
    });

    // Chipped, uneven outlines on both halves
    outlinePolygonWithInk(ctx, leftHalf, rng, {
      baseWidth: 2.3 * s,
      color: THEME_COLORS.ink,
      wobbleScale: 0.95,
      doubleChance: 0.4,
      dryBrush: true,
    });
    outlinePolygonWithInk(ctx, rightHalf, rng, {
      baseWidth: 2.4 * s,
      color: THEME_COLORS.ink,
      wobbleScale: 0.95,
      doubleChance: 0.4,
      dryBrush: true,
    });

    // Peeling floor slabs & exposed girders sticking out like ribs down the split chasm
    const ribFloors = 9;
    for (let f = 1; f <= ribFloors; f++) {
      const vf = f / (ribFloors + 0.6);
      const fy = baseY - height * (1 - vf * 0.88);
      const lx = baseX + halfW + shiftL * (1 - vf);
      const rx = baseX + halfW + splitW + shiftR * (1 - vf);

      // Peeling floor slab curling downward into the split gap
      const peelDrop = (4 + (f % 3) * 5) * s;
      drawInkStroke(
        ctx,
        [
          [lx - halfW * 0.65, fy],
          [lx, fy + 2 * s],
          [lx + splitW * 0.55, fy + peelDrop],
        ],
        rng,
        { baseWidth: 1.9 * s, color: THEME_COLORS.ink, wobbleScale: 0.7, doubleChance: 0.25 }
      );

      // Exposed I-beam girder ribs sticking out from both sides of the split
      drawInkStroke(
        ctx,
        [
          [rx + halfW * 0.5, fy + 3 * s],
          [rx, fy + 3 * s],
          [rx - splitW * 0.62, fy + 3 * s + (f % 2 === 0 ? -4 : 5) * s],
        ],
        rng,
        { baseWidth: 1.7 * s, color: THEME_COLORS.ink, wobbleScale: 0.5, doubleChance: 0.15 }
      );

      // Outer wall rib girders sticking out into open air
      if (f % 2 === 1) {
        const outLeftX = baseX + shiftL * (1 - vf);
        drawInkStroke(
          ctx,
          [
            [outLeftX + 6 * s, fy],
            [outLeftX - rng.range(10, 20) * s, fy + rng.range(-3, 5) * s],
          ],
          rng,
          { baseWidth: 1.5 * s, color: THEME_COLORS.ink, doubleChance: 0 }
        );
        const outRightX = baseX + width + shiftR * (1 - vf);
        drawInkStroke(
          ctx,
          [
            [outRightX - 6 * s, fy],
            [outRightX + rng.range(10, 22) * s, fy + rng.range(-3, 6) * s],
          ],
          rng,
          { baseWidth: 1.6 * s, color: THEME_COLORS.ink, doubleChance: 0 }
        );
      }
    }

    // Window bays on the lit left half
    const winRows = 8;
    for (let r = 1; r <= winRows; r++) {
      const vf = r / (winRows + 1);
      const wy = baseY - height * (1 - vf * 0.85);
      const wxBase = baseX + shiftL * (1 - vf) + 7 * s;
      for (let c = 0; c < 2; c++) {
        const wx = wxBase + c * 11 * s;
        const wPoly: Point2D[] = [
          [wx, wy],
          [wx + 6 * s, wy],
          [wx + 6 * s, wy + 9 * s],
          [wx, wy + 9 * s],
        ];
        if ((r + c) % 5 === 0) {
          fillRoughenedPolygon(ctx, wPoly, rng, THEME_COLORS.ink, 0.4 * s);
        } else {
          outlinePolygonWithInk(ctx, wPoly, rng, {
            baseWidth: 1.0 * s,
            color: THEME_COLORS.ink,
            doubleChance: 0,
          });
        }
      }
    }
  };

  // Midground Split Tower 1 (Left-center behind Eva's shoulder/head)
  drawSplitMegatower(0.24 * W, horizonY + 18 * s, 0.105 * W, 0.34 * H, -3.5, 1.5);
  // Midground Split Tower 2 (Right-center flanking the avenue)
  drawSplitMegatower(0.625 * W, horizonY + 24 * s, 0.118 * W, 0.37 * H, -4.2, 2.2);
  // Midground Split Tower 3 (Far-right foreground flank)
  drawSplitMegatower(0.815 * W, horizonY + 48 * s, 0.132 * W, 0.36 * H, -2.0, 3.8);

  // Bent construction crane leaning across the scene from behind Split Tower 2
  const craneBaseX = 0.695 * W;
  const craneBaseY = horizonY - 0.18 * H;
  const craneBuckleX = 0.675 * W;
  const craneBuckleY = 0.165 * H;
  const craneTipX = 0.415 * W;
  const craneTipY = 0.225 * H;
  const craneCounterX = 0.755 * W;
  const craneCounterY = 0.148 * H;

  // Vertical crane mast (below buckle)
  const mastW = 11 * s;
  drawInkStroke(
    ctx,
    [
      [craneBaseX - mastW * 0.5, craneBaseY],
      [craneBuckleX - mastW * 0.4, craneBuckleY],
    ],
    rng,
    { baseWidth: 1.9 * s, color: THEME_COLORS.ink, doubleChance: 0.25 }
  );
  drawInkStroke(
    ctx,
    [
      [craneBaseX + mastW * 0.5, craneBaseY],
      [craneBuckleX + mastW * 0.4, craneBuckleY],
    ],
    rng,
    { baseWidth: 1.9 * s, color: THEME_COLORS.ink, doubleChance: 0.25 }
  );
  // Mast X-bracing
  const mastSegs = 8;
  for (let m = 0; m < mastSegs; m++) {
    const t0 = m / mastSegs;
    const t1 = (m + 1) / mastSegs;
    const x0 = craneBaseX + (craneBuckleX - craneBaseX) * t0;
    const y0 = craneBaseY + (craneBuckleY - craneBaseY) * t0;
    const x1 = craneBaseX + (craneBuckleX - craneBaseX) * t1;
    const y1 = craneBaseY + (craneBuckleY - craneBaseY) * t1;
    drawInkStroke(
      ctx,
      [
        [x0 - mastW * 0.45, y0],
        [x1 + mastW * 0.45, y1],
      ],
      rng,
      { baseWidth: 1.1 * s, color: THEME_COLORS.ink, doubleChance: 0 }
    );
    drawInkStroke(
      ctx,
      [
        [x0 + mastW * 0.45, y0],
        [x1 - mastW * 0.45, y1],
      ],
      rng,
      { baseWidth: 1.1 * s, color: THEME_COLORS.ink, doubleChance: 0 }
    );
  }

  // Bent jib boom leaning diagonally left across the sky
  const jibSegs = 12;
  for (let j = 0; j < jibSegs; j++) {
    const t0 = j / jibSegs;
    const t1 = (j + 1) / jibSegs;
    // Slight downward kink mid-boom
    const kink0 = Math.sin(t0 * Math.PI) * 12 * s;
    const kink1 = Math.sin(t1 * Math.PI) * 12 * s;
    const x0 = craneBuckleX + (craneTipX - craneBuckleX) * t0;
    const y0 = craneBuckleY + (craneTipY - craneBuckleY) * t0 + kink0;
    const x1 = craneBuckleX + (craneTipX - craneBuckleX) * t1;
    const y1 = craneBuckleY + (craneTipY - craneBuckleY) * t1 + kink1;
    const h0 = (1 - t0 * 0.55) * 11 * s;
    const h1 = (1 - t1 * 0.55) * 11 * s;

    drawInkStroke(ctx, [[x0, y0], [x1, y1]], rng, {
      baseWidth: 1.8 * s,
      color: THEME_COLORS.ink,
      doubleChance: 0.2,
    });
    drawInkStroke(ctx, [[x0, y0 - h0], [x1, y1 - h1]], rng, {
      baseWidth: 1.4 * s,
      color: THEME_COLORS.ink,
      doubleChance: 0,
    });
    drawInkStroke(ctx, [[x0, y0], [x1, y1 - h1]], rng, {
      baseWidth: 1.0 * s,
      color: THEME_COLORS.ink,
      doubleChance: 0,
    });
  }

  // Counter-jib & counterweight block on right
  drawInkStroke(
    ctx,
    [
      [craneBuckleX, craneBuckleY],
      [craneCounterX, craneCounterY],
      [craneCounterX, craneCounterY - 8 * s],
      [craneBuckleX, craneBuckleY - 12 * s],
    ],
    rng,
    { baseWidth: 1.6 * s, color: THEME_COLORS.ink, doubleChance: 0.2 }
  );
  fillRoughenedPolygon(
    ctx,
    [
      [craneCounterX - 14 * s, craneCounterY],
      [craneCounterX + 4 * s, craneCounterY - 2 * s],
      [craneCounterX + 4 * s, craneCounterY + 14 * s],
      [craneCounterX - 14 * s, craneCounterY + 15 * s],
    ],
    rng,
    THEME_COLORS.ink,
    0.8 * s
  );

  // Dangling snapped hoist cables hanging from the bent crane jib
  for (const uHook of [0.58, 0.88, 0.98]) {
    const hx = craneBuckleX + (craneTipX - craneBuckleX) * uHook;
    const hy =
      craneBuckleY +
      (craneTipY - craneBuckleY) * uHook +
      Math.sin(uHook * Math.PI) * 12 * s;
    const dropH = (42 + uHook * 38) * s;
    drawInkStroke(
      ctx,
      [
        [hx, hy],
        [hx - 5 * s, hy + dropH * 0.6],
        [hx + 3 * s, hy + dropH],
      ],
      rng,
      { baseWidth: 1.2 * s, color: THEME_COLORS.ink, wobbleScale: 0.8, doubleChance: 0 }
    );
  }
  // Sparse red aviation warning beacon dot on the buckled crane peak
  drawInkDot(ctx, craneBuckleX, craneBuckleY - 15 * s, 3.2 * s, rng, THEME_COLORS.red);

  // Snapped Highway Overpass hanging over the street in mid-air
  const overpassDeckTop: Point2D[] = [
    [W, horizonY + 16 * s],
    [0.78 * W, horizonY - 12 * s],
    [0.58 * W, horizonY - 24 * s],
    // Broken jagged edge hanging over the street in mid-air:
    [0.495 * W, horizonY - 22 * s],
    [0.482 * W, horizonY - 10 * s],
    [0.502 * W, horizonY - 2 * s],
    [0.775 * W, horizonY + 12 * s],
    [W, horizonY + 46 * s],
  ];
  const overpassUnderside: Point2D[] = [
    [0.482 * W, horizonY - 10 * s],
    [0.502 * W, horizonY - 2 * s],
    [0.775 * W, horizonY + 12 * s],
    [W, horizonY + 46 * s],
    [W, horizonY + 72 * s],
    [0.765 * W, horizonY + 34 * s],
    [0.508 * W, horizonY + 14 * s],
  ];

  fillRoughenedPolygon(ctx, overpassDeckTop, rng, THEME_COLORS.paper, 1.5 * s);
  fillRoughenedPolygon(ctx, overpassUnderside, rng, THEME_COLORS.paper, 1.5 * s);

  // Heavy vertical hatching on the shadowed underside of the snapped overpass
  hatchPolygonVerticalOrAngled(ctx, overpassUnderside, rng, {
    angleRad: Math.PI * 0.5,
    spacing: 4.2 * s,
    baseWidth: 1.9 * s,
    breakChance: 0.08,
    doubleChance: 0.25,
  });

  outlinePolygonWithInk(ctx, overpassDeckTop, rng, {
    baseWidth: 2.5 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.9,
    doubleChance: 0.4,
    dryBrush: true,
  });
  outlinePolygonWithInk(ctx, overpassUnderside, rng, {
    baseWidth: 2.6 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.9,
    doubleChance: 0.4,
    dryBrush: true,
  });

  // Twisted rebar strands and dangling concrete chunks hanging from the snapped overpass tip
  for (let r = 0; r < 7; r++) {
    const rx = (0.482 + r * 0.005) * W;
    const ry = horizonY - (16 - r * 4) * s;
    const hangLen = rng.range(18, 44) * s;
    drawInkStroke(
      ctx,
      [
        [rx, ry],
        [rx - rng.range(6, 16) * s, ry + hangLen * 0.5],
        [rx - rng.range(4, 14) * s, ry + hangLen],
      ],
      rng,
      { baseWidth: 1.3 * s, color: THEME_COLORS.ink, wobbleScale: 0.9, doubleChance: 0.15 }
    );
    if (r % 2 === 0) {
      // Hanging concrete block on rebar
      const bx = rx - 10 * s;
      const by = ry + hangLen * 0.75;
      fillRoughenedPolygon(
        ctx,
        [
          [bx - 5 * s, by - 4 * s],
          [bx + 6 * s, by - 3 * s],
          [bx + 4 * s, by + 6 * s],
          [bx - 6 * s, by + 5 * s],
        ],
        rng,
        THEME_COLORS.ink,
        0.7 * s
      );
    }
  }

  // Crumbled overpass support pier at x = 0.76W
  const pierPoly: Point2D[] = [
    [0.745 * W, horizonY + 30 * s],
    [0.785 * W, horizonY + 34 * s],
    [0.792 * W, horizonY + 138 * s],
    [0.738 * W, horizonY + 132 * s],
  ];
  fillRoughenedPolygon(ctx, pierPoly, rng, THEME_COLORS.paper, 1.4 * s);
  hatchPolygonVerticalOrAngled(ctx, pierPoly, rng, {
    angleRad: Math.PI * 0.5,
    spacing: 4.5 * s,
    baseWidth: 1.8 * s,
  });
  outlinePolygonWithInk(ctx, pierPoly, rng, {
    baseWidth: 2.4 * s,
    color: THEME_COLORS.ink,
    doubleChance: 0.3,
  });

  recorder.captureStage(canvas, 0.08, 0.11, 'top-down');

  // ===========================================================================
  // 4. ONE-POINT PERSPECTIVE COLLAPSED AVENUE, CRACKED ASPHALT, BROKEN LANE
  //    DASHES, SAGGING POWER LINES & FALLEN POLES
  // ===========================================================================
  // Horizon ridge line
  drawInkStroke(
    ctx,
    [
      [0.14 * W, horizonY],
      [vpX, vpY],
      [W, horizonY + 4 * s],
    ],
    rng,
    { baseWidth: 2.2 * s, color: THEME_COLORS.ink, breakChance: 0.14, doubleChance: 0.3 }
  );

  // Perspective road curb lines radiating from vanishing point (vpX, vpY)
  const roadLeftBotX = 0.22 * W;
  const roadRightBotX = 0.95 * W;
  const sidewalkLeftBotX = 0.08 * W;

  drawInkStroke(
    ctx,
    [
      [vpX - 18 * s, vpY + 4 * s],
      [roadLeftBotX, H],
    ],
    rng,
    { baseWidth: 2.8 * s, color: THEME_COLORS.ink, wobbleScale: 0.85, doubleChance: 0.4, breakChance: 0.08 }
  );
  drawInkStroke(
    ctx,
    [
      [vpX - 28 * s, vpY + 6 * s],
      [sidewalkLeftBotX, H],
    ],
    rng,
    { baseWidth: 2.0 * s, color: THEME_COLORS.ink, wobbleScale: 0.85, breakChance: 0.12 }
  );
  drawInkStroke(
    ctx,
    [
      [vpX + 18 * s, vpY + 4 * s],
      [roadRightBotX, H],
    ],
    rng,
    { baseWidth: 2.8 * s, color: THEME_COLORS.ink, wobbleScale: 0.85, doubleChance: 0.4, breakChance: 0.08 }
  );

  // Broken dashed center lane markings in one-point perspective
  const laneBotX = 0.58 * W;
  const dashCount = 11;
  for (let d = 1; d <= dashCount; d++) {
    const t0 = Math.pow((d - 0.35) / dashCount, 1.85);
    const t1 = Math.pow((d + 0.22) / dashCount, 1.85);
    // Tectonic crack lateral displacement on broken lane dashes
    const faultShift = (d % 3 === 0 ? -9 : d % 2 === 0 ? 6 : -3) * s * t0;
    const x0 = vpX + (laneBotX - vpX) * t0 + faultShift;
    const y0 = vpY + (H - vpY) * t0;
    const x1 = vpX + (laneBotX - vpX) * t1 + faultShift * 1.15;
    const y1 = vpY + (H - vpY) * t1;
    const dashW = (1.2 + t0 * 5.2) * s;

    // Double broken lane dashes
    drawInkStroke(
      ctx,
      [
        [x0 - dashW * 0.9, y0],
        [x1 - dashW * 0.9, y1],
      ],
      rng,
      {
        baseWidth: Math.max(1.1 * s, dashW * 0.65),
        color: THEME_COLORS.ink,
        wobbleScale: 0.7,
        breakChance: 0.15,
        doubleChance: 0.2,
      }
    );
    drawInkStroke(
      ctx,
      [
        [x0 + dashW * 0.9, y0],
        [x1 + dashW * 0.9, y1],
      ],
      rng,
      {
        baseWidth: Math.max(1.1 * s, dashW * 0.65),
        color: THEME_COLORS.ink,
        wobbleScale: 0.7,
        breakChance: 0.15,
        doubleChance: 0.2,
      }
    );
  }

  // Deep jagged asphalt cracks & sinkhole fissures crossing the street
  const asphaltCracks: Point2D[][] = [
    [
      [0.36 * W, horizonY + 52 * s],
      [0.48 * W, horizonY + 64 * s],
      [0.57 * W, horizonY + 58 * s],
      [0.69 * W, horizonY + 74 * s],
    ],
    [
      [0.29 * W, horizonY + 128 * s],
      [0.44 * W, horizonY + 146 * s],
      [0.55 * W, horizonY + 134 * s],
      [0.66 * W, horizonY + 162 * s],
      [0.82 * W, horizonY + 154 * s],
    ],
    [
      [0.32 * W, horizonY + 235 * s],
      [0.49 * W, horizonY + 258 * s],
      [0.61 * W, horizonY + 242 * s],
      [0.77 * W, horizonY + 278 * s],
      [0.91 * W, horizonY + 266 * s],
    ],
    [
      [0.41 * W, horizonY + 340 * s],
      [0.58 * W, horizonY + 368 * s],
      [0.72 * W, horizonY + 352 * s],
      [0.88 * W, horizonY + 392 * s],
    ],
  ];

  for (const crack of asphaltCracks) {
    drawInkStroke(ctx, crack, rng, {
      baseWidth: 2.8 * s,
      color: THEME_COLORS.ink,
      wobbleScale: 1.25,
      doubleChance: 0.45,
      dryBrush: true,
    });
    // Short vertical depth ticks along the crack lip so the broken slab has thickness
    for (let i = 0; i < crack.length - 1; i++) {
      const p0 = crack[i];
      const p1 = crack[i + 1];
      for (let k = 1; k <= 4; k++) {
        const u = k / 5;
        const tx = p0[0] + (p1[0] - p0[0]) * u;
        const ty = p0[1] + (p1[1] - p0[1]) * u;
        drawInkStroke(
          ctx,
          [
            [tx, ty],
            [tx + rng.range(-2, 2) * s, ty + rng.range(6, 14) * s],
          ],
          rng,
          { baseWidth: 1.4 * s, color: THEME_COLORS.ink, doubleChance: 0 }
        );
      }
    }
  }

  // Scattered street rubble, broken concrete chunks & stipple gravel along the road
  for (let c = 0; c < 28; c++) {
    const depth = structuralRng.range(0.08, 0.94);
    const ry = horizonY + 24 * s + Math.pow(depth, 1.4) * (H - horizonY - 40 * s);
    const rx = structuralRng.range(0.32 * W, 0.92 * W);
    const scale = (0.5 + depth * 0.9) * s;
    const rw = structuralRng.range(6, 16) * scale;
    const rh = rw * structuralRng.range(0.4, 0.65);

    const chunkPoly: Point2D[] = [
      [rx - rw, ry],
      [rx - rw * 0.4, ry - rh],
      [rx + rw * 0.7, ry - rh * 0.7],
      [rx + rw, ry + rh * 0.2],
      [rx, ry + rh * 0.5],
    ];
    fillRoughenedPolygon(ctx, chunkPoly, rng, THEME_COLORS.paper, 0.8 * scale);
    outlinePolygonWithInk(ctx, chunkPoly, rng, {
      baseWidth: Math.max(1.1 * s, 1.6 * scale),
      color: THEME_COLORS.ink,
      doubleChance: 0.15,
    });
    // Cast shadow line under rubble chunk
    drawInkStroke(
      ctx,
      [
        [rx - rw * 0.8, ry + rh * 0.45],
        [rx + rw * 1.1, ry + rh * 0.45],
      ],
      rng,
      { baseWidth: Math.max(1.4 * s, 2.2 * scale), color: THEME_COLORS.ink, doubleChance: 0 }
    );
    for (let d = 0; d < 4; d++) {
      drawInkDot(
        ctx,
        rx + structuralRng.range(-22, 22) * scale,
        ry + structuralRng.range(-6, 8) * scale,
        rng.range(0.9, 2.2) * scale,
        rng,
        THEME_COLORS.ink
      );
    }
  }

  // Tilted roadside hazard sign with sparse red diamond accent on right curb
  const signBase: Point2D = [0.785 * W, horizonY + 265 * s];
  const signTop: Point2D = [0.768 * W, horizonY + 212 * s];
  drawInkStroke(ctx, [signBase, signTop], rng, {
    baseWidth: 2.2 * s,
    color: THEME_COLORS.ink,
    doubleChance: 0,
  });
  const diamondPoly: Point2D[] = [
    [signTop[0], signTop[1] - 12 * s],
    [signTop[0] + 11 * s, signTop[1]],
    [signTop[0], signTop[1] + 12 * s],
    [signTop[0] - 11 * s, signTop[1]],
  ];
  fillRoughenedPolygon(ctx, diamondPoly, rng, THEME_COLORS.red, 0.5 * s);
  outlinePolygonWithInk(ctx, diamondPoly, rng, {
    baseWidth: 1.8 * s,
    color: THEME_COLORS.ink,
    doubleChance: 0,
  });

  // ---------------------------------------------------------------------------
  // UTILITY POLES (LEANING + FALLEN ACROSS THE ROAD) & SAGGING POWER LINES
  // ---------------------------------------------------------------------------
  const drawUtilityPole = (
    base: Point2D,
    top: Point2D,
    poleWidth: number,
    crossArmSpan: number
  ): { leftArm: Point2D; rightArm: Point2D; lowerLeftArm: Point2D; lowerRightArm: Point2D } => {
    drawInkStroke(ctx, [base, top], rng, {
      baseWidth: poleWidth,
      color: THEME_COLORS.ink,
      wobbleScale: 0.65,
      doubleChance: 0.35,
      dryBrush: true,
    });

    const dx = top[0] - base[0];
    const dy = top[1] - base[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    // Upper cross-arm
    const arm1Center: Point2D = [base[0] + dx * 0.92, base[1] + dy * 0.92];
    const leftArm: Point2D = [
      arm1Center[0] - nx * crossArmSpan,
      arm1Center[1] - ny * crossArmSpan,
    ];
    const rightArm: Point2D = [
      arm1Center[0] + nx * crossArmSpan,
      arm1Center[1] + ny * crossArmSpan,
    ];
    drawInkStroke(ctx, [leftArm, rightArm], rng, {
      baseWidth: poleWidth * 0.62,
      color: THEME_COLORS.ink,
      doubleChance: 0.2,
    });

    // Lower cross-arm
    const arm2Center: Point2D = [base[0] + dx * 0.81, base[1] + dy * 0.81];
    const lowerLeftArm: Point2D = [
      arm2Center[0] - nx * (crossArmSpan * 0.82),
      arm2Center[1] - ny * (crossArmSpan * 0.82),
    ];
    const lowerRightArm: Point2D = [
      arm2Center[0] + nx * (crossArmSpan * 0.82),
      arm2Center[1] + ny * (crossArmSpan * 0.82),
    ];
    drawInkStroke(ctx, [lowerLeftArm, lowerRightArm], rng, {
      baseWidth: poleWidth * 0.55,
      color: THEME_COLORS.ink,
      doubleChance: 0.15,
    });

    // Insulator pins
    for (const pt of [leftArm, rightArm, lowerLeftArm, lowerRightArm]) {
      drawInkDot(ctx, pt[0], pt[1] - 2.5 * s, poleWidth * 0.55, rng, THEME_COLORS.ink);
    }

    return { leftArm, rightArm, lowerLeftArm, lowerRightArm };
  };

  // 1. Far-right leaning pole down the avenue
  const poleFarRight = drawUtilityPole(
    [0.655 * W, horizonY + 96 * s],
    [0.632 * W, horizonY - 68 * s],
    2.8 * s,
    20 * s
  );

  // 2. Near-right heavily leaning utility pole
  const poleNearRight = drawUtilityPole(
    [0.865 * W, horizonY + 340 * s],
    [0.795 * W, horizonY - 95 * s],
    4.6 * s,
    34 * s
  );

  // 3. Mid-left leaning utility pole
  const poleMidLeft = drawUtilityPole(
    [0.375 * W, horizonY + 148 * s],
    [0.408 * W, horizonY - 62 * s],
    3.0 * s,
    22 * s
  );

  // 4. FALLEN UTILITY POLE lying diagonally across the cracked road
  const fallenBase: Point2D = [0.335 * W, horizonY + 298 * s];
  const fallenTop: Point2D = [0.695 * W, horizonY + 252 * s];
  // Snapped stump on left curb
  drawInkStroke(
    ctx,
    [
      [0.325 * W, horizonY + 318 * s],
      [0.332 * W, horizonY + 286 * s],
    ],
    rng,
    { baseWidth: 4.4 * s, color: THEME_COLORS.ink, doubleChance: 0.3, dryBrush: true }
  );
  const fallenPoleArms = drawUtilityPole(fallenBase, fallenTop, 4.2 * s, 26 * s);

  // Sagging catenary power lines crossing the road and running down the avenue
  const cablePairs: Array<{ start: Point2D; end: Point2D; sag: number; w: number }> = [
    // Along right side of avenue
    { start: poleNearRight.leftArm, end: poleFarRight.leftArm, sag: 42 * s, w: 1.8 * s },
    { start: poleNearRight.rightArm, end: poleFarRight.rightArm, sag: 48 * s, w: 1.7 * s },
    { start: poleNearRight.lowerLeftArm, end: poleFarRight.lowerLeftArm, sag: 38 * s, w: 1.5 * s },
    // Crossing high over the collapsed avenue from right poles to left pole
    { start: poleNearRight.leftArm, end: poleMidLeft.rightArm, sag: 64 * s, w: 1.9 * s },
    { start: poleFarRight.leftArm, end: poleMidLeft.leftArm, sag: 44 * s, w: 1.5 * s },
    // Sagging down to the fallen pole lying across the road
    { start: poleMidLeft.lowerRightArm, end: fallenPoleArms.leftArm, sag: 52 * s, w: 1.7 * s },
    { start: poleNearRight.lowerLeftArm, end: fallenPoleArms.rightArm, sag: 58 * s, w: 1.8 * s },
    // Trailing off top-right edge
    { start: [W, horizonY - 120 * s], end: poleNearRight.rightArm, sag: 36 * s, w: 2.0 * s },
  ];

  for (const c of cablePairs) {
    drawCatenaryCable(ctx, {
      start: c.start,
      end: c.end,
      sag: c.sag,
      baseWidth: c.w,
      rng,
      structuralRng,
      color: THEME_COLORS.ink,
      tieTicks: true,
    });
  }

  // Ink spatter clusters around the ruptured towers and road fissures
  drawInkSpatterCluster(ctx, W * 0.49, horizonY - 12 * s, W * 0.05, 10, rng);
  drawInkSpatterCluster(ctx, W * 0.68, horizonY + 18 * s, W * 0.06, 12, rng);

  recorder.captureStage(canvas, 0.11, 0.14, 'top-down');
}
