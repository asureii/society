/**
 * FALLEN CITY — HEAVY INK RUINED CITY BACKGROUND (src/dashboard/eva/background.ts)
 *
 * Rebuilt with heavy black ink weight while preserving white paper negative space:
 * - Whole page: black 38–42%, white 52–57%, red ≤ 5%.
 * - Middle section (45–68% across): black 15–25%.
 * - Top third (y = 0..0.33H): black 35–45%.
 * - Right third (x = 0.67..1.0W behind widget rail): black 25–35%.
 * - Pure ink only: no grey fills; tone from hatching, stipple, and solid black with white negative-space details.
 *
 * Depth rule: nearer = darker.
 * - Far skyline: thin, broken line work (keeps distance and air).
 * - Mid ruins: solid black silhouettes with white negative-space details (window grids, girder ribs, peeling floors, cracks).
 * - Foreground: heaviest black masses of concrete rubble and shadow wedges.
 *
 * Negative-space protections:
 * - Sight line: 24px clear white corridor on each side of the dashed eye-to-orb line.
 * - Red dot: 3x-radius clear white halo with radial speed lines.
 * - Horizon behind Eva: stays light so her shoulders and head stay legible.
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

export interface EvaBackgroundOptions {
  orbUv?: [number, number];
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  unreachable?: boolean;
}

/**
 * Checks distance from a point to a line segment [a, b].
 */
function distToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const l2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2;
  if (l2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * (b[0] - a[0])), p[1] - (a[1] + t * (b[1] - a[1])));
}

/**
 * Directional hatching helper with clipping and tone control.
 */
function hatchPolygonClipped(
  ctx: Canvas2DContext,
  poly: Point2D[],
  rng: PRNG,
  opts: {
    angleRad: number;
    spacing: number;
    baseWidth: number;
    color?: string;
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
  const color = opts.color ?? THEME_COLORS.ink;

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
              color,
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
          color,
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
    runPass(opts.angleRad + 1.15, 1.35);
  }
}

/**
 * Draws a solid black ruined tower silhouette with white negative space details
 * (window slits, cracked floor slabs, peeling girders, and rim lighting from the red orb).
 */
function drawSolidRuinedTower(
  ctx: Canvas2DContext,
  rng: PRNG,
  opts: {
    x: number;
    botY: number;
    topY: number;
    width: number;
    leanPx?: number;
    brokenRoofSteps?: number;
    splitChasm?: boolean;
    peelingFloors?: boolean;
    orbX?: number;
    hasRedBeacon?: boolean;
    beaconBlink?: boolean;
  }
): void {
  const lean = opts.leanPx ?? 0;
  const h = opts.botY - opts.topY;
  const steps = opts.brokenRoofSteps ?? 3;

  const roofPts: Point2D[] = [];
  for (let s = 0; s <= steps; s++) {
    const u = s / steps;
    const rx = opts.x + lean + u * opts.width;
    const notch = s % 2 === 1 ? h * rng.range(0.04, 0.08) : 0;
    roofPts.push([rx, opts.topY + notch]);
  }

  const towerPoly: Point2D[] = [
    [opts.x, opts.botY],
    ...roofPts,
    [opts.x + opts.width, opts.botY],
  ];

  // 1. Solid black tower silhouette mass
  fillRoughenedPolygon(ctx, towerPoly, rng, THEME_COLORS.ink, 1.2);
  outlinePolygonWithInk(ctx, towerPoly, rng, {
    baseWidth: 2.4,
    color: THEME_COLORS.ink,
    doubleChance: 0.2,
  });

  // 2. White rim light on edge facing the red dot sun
  const orbX = opts.orbX ?? opts.x + opts.width * 0.5;
  const rimOnRight = orbX > opts.x + opts.width * 0.5;
  const rimX0 = rimOnRight ? opts.x + opts.width : opts.x;
  const rimX1 = rimOnRight ? opts.x + opts.width + lean : opts.x + lean;
  drawInkStroke(
    ctx,
    [
      [rimX0, opts.botY],
      [rimX1, opts.topY],
    ],
    rng,
    {
      baseWidth: 1.6,
      color: THEME_COLORS.paperPure,
      taperScale: 1.2,
      wobbleScale: 0.2,
    }
  );

  // 3. White negative space window matrix cut into the black mass
  const cols = Math.max(2, Math.floor(opts.width / 11));
  const rows = Math.max(4, Math.floor(h / 16));
  const winW = 5.8;
  const winH = 8.2;

  for (let r = 1; r < rows; r++) {
    const wy = opts.topY + (r / rows) * (h - 14) + 6;
    const rowLean = ((opts.botY - wy) / h) * lean;
    for (let c = 0; c < cols; c++) {
      if (rng.chance(0.25)) continue; // broken/blacked out windows
      const wx = opts.x + 5 + (c / Math.max(1, cols - 1)) * (opts.width - 10) + rowLean;
      const winPoly: Point2D[] = [
        [wx, wy],
        [wx + winW, wy],
        [wx + winW, wy + winH],
        [wx, wy + winH],
      ];
      fillRoughenedPolygon(ctx, winPoly, rng, THEME_COLORS.paperPure, 0.4);
    }
  }

  // 4. White negative space cracks and peeling floor slabs
  if (opts.peelingFloors) {
    for (let p = 0; p < 3; p++) {
      const py = opts.topY + h * (0.2 + p * 0.22);
      const rowLean = ((opts.botY - py) / h) * lean;
      const edgeX = (rimOnRight ? opts.x : opts.x + opts.width) + rowLean;
      const dir = rimOnRight ? -1 : 1;
      drawInkStroke(
        ctx,
        [
          [edgeX, py],
          [edgeX + dir * rng.range(12, 22), py + rng.range(4, 10)],
        ],
        rng,
        {
          baseWidth: 1.4,
          color: THEME_COLORS.paperPure,
          taperScale: 1.3,
        }
      );
    }
  }

  // 5. White negative space vertical split chasm with exposed girder ribs
  if (opts.splitChasm) {
    const midX = opts.x + opts.width * 0.5 + lean * 0.5;
    const splitBottomY = opts.topY + h * 0.65;
    drawInkStroke(
      ctx,
      [
        [midX, opts.topY + 4],
        [midX + rng.range(-3, 3), (opts.topY + splitBottomY) * 0.5],
        [midX, splitBottomY],
      ],
      rng,
      {
        baseWidth: 2.2,
        color: THEME_COLORS.paperPure,
        taperScale: 1.2,
      }
    );
    for (let g = 0; g < 4; g++) {
      const gy = opts.topY + 16 + g * 22;
      drawInkStroke(
        ctx,
        [
          [midX - 7, gy],
          [midX + 7, gy + rng.range(-1, 2)],
        ],
        rng,
        {
          baseWidth: 1.2,
          color: THEME_COLORS.paperPure,
        }
      );
    }
  }

  // 6. Optional red warning beacon dot on rooftop peak
  if (opts.hasRedBeacon) {
    const beaconX = opts.x + opts.width * 0.5 + lean;
    const beaconY = opts.topY - 4;
    drawInkStroke(
      ctx,
      [
        [beaconX, opts.topY],
        [beaconX, beaconY],
      ],
      rng,
      { baseWidth: 1.2, color: THEME_COLORS.paperPure }
    );
    drawInkDot(
      ctx,
      beaconX,
      beaconY - 2,
      opts.beaconBlink ? 3.5 : 2.5,
      rng,
      THEME_COLORS.red
    );
  }
}

export function drawEvaStageBackground(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  recorder: EvaDrawOrderRecorder,
  seed = 701,
  options?: EvaBackgroundOptions
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);
  const structuralRng = createRng(seed + 101);

  const orbUv: [number, number] = options?.orbUv ?? [0.60, 0.39];
  const orbX = orbUv[0] * W;
  const orbY = orbUv[1] * H;
  const orbR = 24; // base orb radius in 1024-space
  const orbHaloR = orbR * 3.2; // 3x all-white halo around orb

  const eyeX = 0.34 * W;
  const eyeY = 0.48 * H;
  const sightLineStart: Point2D = [eyeX, eyeY];
  const sightLineEnd: Point2D = [orbX, orbY];
  const sightCorridorHalfW = 24; // 24px clear white corridor on each side

  const status = options?.status ?? 'online';
  const isDnd = status === 'dnd';
  const isOffline = status === 'offline';
  const isIdle = status === 'idle';

  // 1. Base pure white paper
  ctx.fillStyle = THEME_COLORS.paper;
  ctx.fillRect(0, 0, W, H);

  const horizonY = H * 0.53;
  const vpX = W * 0.51;
  const vpY = horizonY;

  // ===========================================================================
  // STAGE 1 (0.25): HEAVY INK CEILING (TOP 30–35% OF SCREEN)
  // ===========================================================================
  // Bleeds in from the top-right corner, covering top 30-35% of the screen,
  // strongest at top-right and fading toward top-left (leaving Eva's horn clear in white sky).
  // Lower boundary is torn/ragged with hanging drips, white speckle ash/stars, and dry-brush cuts.
  const ceilingStartU = 0.28; // starts at 28% across from the top
  const ceilingPoly: Point2D[] = [
    [W * ceilingStartU, 0],
    [W, 0],
    [W, H * 0.34],
  ];

  const ceilingSteps = 48;
  for (let i = ceilingSteps; i >= 0; i--) {
    const u = ceilingStartU + (i / ceilingSteps) * (1.0 - ceilingStartU);
    const x = u * W;
    const progress = (u - ceilingStartU) / (1.0 - ceilingStartU);
    // Depth: starts at 0, smoothly dropping to ~0.30H on the far right
    const baseDepth = H * (0.05 + Math.pow(progress, 1.25) * 0.25);
    const warp = (structuralRng.fbm2D(u * 5.0, 1.8, 4) - 0.5) * H * 0.04;
    const fine = (rng.noise1D(u * 32.0) - 0.5) * H * 0.02;
    let y = Math.max(0, baseDepth + warp + fine);

    // Keep clear above the orb halo (3x radius)
    const dOrb = Math.hypot(x - orbX, y - orbY);
    if (dOrb < orbHaloR + 14) {
      y = Math.min(y, orbY - orbHaloR - 14);
    }
    // Keep clear of sight-line corridor (24px each side)
    const dSight = distToSegment([x, y], sightLineStart, sightLineEnd);
    if (dSight < sightCorridorHalfW + 12) {
      y = Math.min(y, Math.min(eyeY, orbY) - sightCorridorHalfW - 12);
    }
    ceilingPoly.push([x, y]);
  }

  ctx.fillStyle = THEME_COLORS.ink;
  ctx.beginPath();
  ctx.moveTo(ceilingPoly[0][0], ceilingPoly[0][1]);
  for (let i = 1; i < ceilingPoly.length; i++) {
    ctx.lineTo(ceilingPoly[i][0], ceilingPoly[i][1]);
  }
  ctx.closePath();
  ctx.fill();

  // Ragged deckle brush strokes & long vertical drips hanging from the ink ceiling
  for (let i = 3; i < ceilingPoly.length - 2; i++) {
    const pt = ceilingPoly[i];
    const nextPt = ceilingPoly[i + 1];
    drawInkStroke(ctx, [pt, nextPt], rng, {
      baseWidth: rng.range(2.4, 4.6),
      color: THEME_COLORS.ink,
      dryBrush: true,
      doubleChance: 0.3,
    });

    if (structuralRng.chance(0.28)) {
      const dripLen = structuralRng.range(14, 52);
      const dripEnd: Point2D = [pt[0] + rng.range(-2, 2), pt[1] + dripLen];
      // Check clearance with orb halo & sight corridor
      if (
        Math.hypot(dripEnd[0] - orbX, dripEnd[1] - orbY) > orbHaloR + 8 &&
        distToSegment(dripEnd, sightLineStart, sightLineEnd) > sightCorridorHalfW + 6
      ) {
        drawInkStroke(
          ctx,
          [
            [pt[0], pt[1] - 2],
            dripEnd,
          ],
          rng,
          { baseWidth: rng.range(1.4, 2.6), taperScale: 1.25, doubleChance: 0 }
        );
        if (rng.chance(0.65)) {
          drawInkDot(
            ctx,
            dripEnd[0],
            dripEnd[1] + rng.range(4, 10),
            rng.range(1.2, 2.8),
            rng,
            THEME_COLORS.ink
          );
        }
      }
    }
  }

  // White speckle holes (ash and stars) cut into the black ink ceiling
  const starCount = 135;
  for (let s = 0; s < starCount; s++) {
    const u = structuralRng.range(0.02, 0.98);
    const sx = u * W;
    const maxH = H * (0.14 + Math.pow(u, 1.1) * 0.17);
    const sy = structuralRng.range(6, Math.max(10, maxH));
    const sr = structuralRng.chance(0.18)
      ? structuralRng.range(2.8, 5.5)
      : structuralRng.range(0.9, 2.2);
    drawInkDot(ctx, sx, sy, sr, rng, THEME_COLORS.paperPure);
  }

  // Thin white wind lines crossing in negative space through the black ceiling
  const windCount = 3;
  for (let w = 0; w < windCount; w++) {
    const wx0 = W * (0.2 + w * 0.22);
    const wy0 = H * (0.06 + w * 0.05);
    const pts: Point2D[] = [
      [wx0, wy0],
      [wx0 + W * 0.18, wy0 - 8],
      [wx0 + W * 0.35, wy0 + 6],
    ];
    drawInkStroke(ctx, pts, rng, {
      baseWidth: 1.2,
      color: THEME_COLORS.paperPure,
      taperScale: 1.35,
      wobbleScale: 0.3,
    });
  }

  // Subtle horizontal dry-brush negative streaks cut into the upper right ceiling
  for (let d = 0; d < 4; d++) {
    const dx = W * rng.range(0.55, 0.85);
    const dy = H * rng.range(0.04, 0.22);
    const dlen = rng.range(28, 65);
    drawInkStroke(
      ctx,
      [
        [dx, dy],
        [dx + dlen, dy],
      ],
      rng,
      {
        baseWidth: 1.3,
        color: THEME_COLORS.paperPure,
        taperScale: 1.4,
        dryBrush: true,
      }
    );
  }

  recorder.captureStage(canvas, 0.0, 0.25, 'top-down');

  // ===========================================================================
  // STAGE 2 (0.50): FAR SKYLINE (THIN BROKEN LINEWORK — PRESERVES AIR & DEPTH)
  // ===========================================================================
  // Sits along the horizon. Snapped skyscrapers, different heights, some leaning,
  // one toppled across neighbor like a bridge. The avenue center (W*0.48..0.54)
  // stays open so the road perspective leads cleanly to the vanishing point.
  // Behind Eva's silhouette (u = 0.15..0.36), linework stays low and sparse so her
  // contours remain crisp and legible against the light paper.
  const farTowers = [
    // Far left skyline (behind Eva's shoulder/chest)
    { x: W * 0.10, botY: horizonY, topY: H * 0.40, w: 28, lean: 2 },
    { x: W * 0.15, botY: horizonY, topY: H * 0.38, w: 26, lean: -3 },
    { x: W * 0.20, botY: horizonY, topY: H * 0.42, w: 24, lean: 2 },
    // Sparse behind Eva's head/neck (low silhouette)
    { x: W * 0.26, botY: horizonY, topY: H * 0.47, w: 22, lean: 1 },
    { x: W * 0.32, botY: horizonY, topY: H * 0.46, w: 20, lean: -1 },
    // Left avenue flank
    { x: W * 0.38, botY: horizonY, topY: H * 0.41, w: 26, lean: -2 },
    { x: W * 0.43, botY: horizonY, topY: H * 0.44, w: 24, lean: 2 },
    // Right avenue flank (avenue center W*0.48..0.54 is open!)
    // Low distant structures under the orb strictly below orb halo (topY >= H * 0.50)
    { x: W * 0.56, botY: horizonY, topY: H * 0.50, w: 24, lean: -2 },
    { x: W * 0.61, botY: horizonY, topY: H * 0.50, w: 26, lean: 2 },
    // Right distant skyline (outside orb halo x > 0.66W)
    { x: W * 0.67, botY: horizonY, topY: H * 0.38, w: 28, lean: -2 },
    { x: W * 0.72, botY: horizonY, topY: H * 0.36, w: 30, lean: 3 },
    { x: W * 0.83, botY: horizonY, topY: H * 0.37, w: 28, lean: -3 },
    { x: W * 0.89, botY: horizonY, topY: H * 0.40, w: 26, lean: 2 },
    { x: W * 0.94, botY: horizonY, topY: H * 0.42, w: 24, lean: -1 },
  ];

  for (const t of farTowers) {
    const towerBox: Point2D[] = [
      [t.x, t.botY],
      [t.x + t.lean, t.topY],
      [t.x + t.w + t.lean, t.topY],
      [t.x + t.w, t.botY],
    ];
    fillRoughenedPolygon(ctx, towerBox, rng, THEME_COLORS.paperPure, 0.4);
    outlinePolygonWithInk(ctx, towerBox, rng, {
      baseWidth: 1.3,
      wobbleScale: 0.35,
      breakChance: 0.18,
    });
    // Sparse vertical hatching
    hatchPolygonClipped(ctx, towerBox, rng, {
      angleRad: Math.PI * 0.5,
      spacing: 8.5,
      baseWidth: 1.0,
    });
    // Tiny rectangular window slits
    const numWins = Math.max(2, Math.floor((t.botY - t.topY) / 16));
    for (let w = 1; w < numWins; w++) {
      const wy = t.topY + w * 14;
      const wx = t.x + t.w * 0.3 + ((t.botY - wy) / (t.botY - t.topY)) * t.lean;
      drawInkStroke(
        ctx,
        [
          [wx, wy],
          [wx + t.w * 0.4, wy],
        ],
        rng,
        { baseWidth: 0.9, color: THEME_COLORS.ink, breakChance: 0.3 }
      );
    }
  }

  // Toppled skyscraper spanning across neighbors like a bridge (between W*0.67 and W*0.73, outside orb halo)
  const bridgeSlab: Point2D[] = [
    [W * 0.67, H * 0.42],
    [W * 0.73, H * 0.38],
    [W * 0.735, H * 0.395],
    [W * 0.675, H * 0.435],
  ];
  fillRoughenedPolygon(ctx, bridgeSlab, rng, THEME_COLORS.paperPure, 0.4);
  outlinePolygonWithInk(ctx, bridgeSlab, rng, { baseWidth: 1.4, wobbleScale: 0.25 });
  hatchPolygonClipped(ctx, bridgeSlab, rng, {
    angleRad: -0.4,
    spacing: 7.0,
    baseWidth: 1.0,
  });

  // Plumes of inky smoke rising from behind the skyline into the atmosphere
  const smokeOrigins: Array<{ x: number; y: number; driftX: number; height: number }> = [
    { x: W * 0.22, y: horizonY - 4, driftX: 18, height: H * 0.20 },
    { x: W * 0.68, y: horizonY - 6, driftX: 28, height: H * 0.28 },
    { x: W * 0.86, y: horizonY - 4, driftX: 35, height: H * 0.32 },
  ];
  for (const smk of smokeOrigins) {
    const pts: Point2D[] = [];
    const steps = 7;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const sy = smk.y - t * smk.height;
      const sx = smk.x + Math.pow(t, 1.4) * smk.driftX + (rng.noise1D(t * 12) - 0.5) * 12;
      pts.push([sx, sy]);
    }
    drawInkStroke(ctx, pts, rng, {
      baseWidth: rng.range(1.6, 2.6),
      color: THEME_COLORS.ink,
      taperScale: 1.6,
      wobbleScale: 0.4,
      dryBrush: true,
    });
  }

  recorder.captureStage(canvas, 0.25, 0.5, 'top-down');

  // ===========================================================================
  // STAGE 3 (0.75): MID RUINS & RIGHT-SIDE TOWER CLUSTER (SOLID BLACK SILHOUETTES)
  // ===========================================================================
  // Right-side cluster rising behind the widget rail (x = 0.68..0.98W), joining ink ceiling.
  // Widget panels pop with high contrast against these solid black towers!
  const rightRailTowers = [
    { x: W * 0.69, botY: horizonY + 8, topY: H * 0.25, width: 34, leanPx: -3, brokenRoofSteps: 3, splitChasm: true, peelingFloors: true },
    { x: W * 0.75, botY: horizonY + 12, topY: H * 0.16, width: 44, leanPx: -4, brokenRoofSteps: 4, splitChasm: true, peelingFloors: true, hasRedBeacon: true },
    { x: W * 0.82, botY: horizonY + 10, topY: H * 0.21, width: 38, leanPx: 3, brokenRoofSteps: 3, splitChasm: true, peelingFloors: true },
    { x: W * 0.88, botY: horizonY + 14, topY: H * 0.13, width: 52, leanPx: 4, brokenRoofSteps: 5, splitChasm: true, peelingFloors: true, hasRedBeacon: isDnd },
    { x: W * 0.95, botY: horizonY + 16, topY: H * 0.18, width: 38, leanPx: 2, brokenRoofSteps: 3, splitChasm: true, peelingFloors: true },
  ];

  for (const rt of rightRailTowers) {
    drawSolidRuinedTower(ctx, rng, {
      ...rt,
      orbX,
      beaconBlink: isDnd,
    });
  }

  // Snapped concrete highway overpass: elevated bridge deck over the avenue flanks
  // Underside is heavy solid black with concrete pier; broken edge snaps off in mid-air
  const overTop: Point2D[] = [
    [W * 0.22, H * 0.50],
    [W * 0.42, H * 0.465],
    [W * 0.428, H * 0.485],
    [W * 0.22, H * 0.52],
  ];
  const overBottom: Point2D[] = [
    [W * 0.22, H * 0.52],
    [W * 0.428, H * 0.485],
    [W * 0.42, H * 0.535],
    [W * 0.22, H * 0.57],
  ];
  const overPier: Point2D[] = [
    [W * 0.35, H * 0.50],
    [W * 0.38, H * 0.495],
    [W * 0.385, H * 0.63],
    [W * 0.345, H * 0.63],
  ];

  fillRoughenedPolygon(ctx, overPier, rng, THEME_COLORS.ink, 1.2);
  fillRoughenedPolygon(ctx, overBottom, rng, THEME_COLORS.ink, 1.2);
  fillRoughenedPolygon(ctx, overTop, rng, THEME_COLORS.paperPure, 0.8);
  outlinePolygonWithInk(ctx, overTop, rng, { baseWidth: 2.2 });
  outlinePolygonWithInk(ctx, overBottom, rng, { baseWidth: 2.4 });
  outlinePolygonWithInk(ctx, overPier, rng, { baseWidth: 2.2 });

  // White hanging rebar wires from broken overpass edge dangling in mid-air
  for (let r = 0; r < 5; r++) {
    const rx = W * 0.424 + rng.range(-2, 3);
    const ry = H * 0.485 + r * 6.0;
    drawInkStroke(
      ctx,
      [
        [rx, ry],
        [rx + rng.range(6, 15), ry + rng.range(8, 16)],
        [rx + rng.range(4, 18), ry + rng.range(18, 28)],
      ],
      rng,
      { baseWidth: 1.2, color: THEME_COLORS.paperPure, taperScale: 1.3 }
    );
  }

  // Snapped construction crane on top of Tower 2 (mast + cross-braced truss + bent jib arm)
  const mastX = W * 0.77;
  const mastBaseY = H * 0.15;
  const mastTopY = H * 0.085;
  drawInkStroke(
    ctx,
    [
      [mastX - 3, mastBaseY],
      [mastX - 3, mastTopY],
    ],
    rng,
    { baseWidth: 2.4, color: THEME_COLORS.ink }
  );
  drawInkStroke(
    ctx,
    [
      [mastX + 5, mastBaseY],
      [mastX + 5, mastTopY],
    ],
    rng,
    { baseWidth: 2.4, color: THEME_COLORS.ink }
  );
  // Cross bracing
  for (let cb = 0; cb < 4; cb++) {
    const cy0 = mastBaseY - cb * 12;
    const cy1 = cy0 - 12;
    drawInkStroke(ctx, [[mastX - 3, cy0], [mastX + 5, cy1]], rng, { baseWidth: 1.2, color: THEME_COLORS.ink });
    drawInkStroke(ctx, [[mastX + 5, cy0], [mastX - 3, cy1]], rng, { baseWidth: 1.2, color: THEME_COLORS.ink });
  }
  // Jib arm angling rightward away from orb
  drawInkStroke(
    ctx,
    [
      [mastX - 16, mastTopY + 4],
      [mastX, mastTopY],
      [mastX + 52, mastTopY + 10],
      [mastX + 64, mastTopY + 22],
    ],
    rng,
    { baseWidth: 2.2, color: THEME_COLORS.ink }
  );
  // Red warning beacon dot on top of crane mast
  drawInkDot(ctx, mastX + 1, mastTopY - 3, 3.5, rng, THEME_COLORS.red);

  recorder.captureStage(canvas, 0.5, 0.75, 'bottom-up');

  // ===========================================================================
  // STAGE 4 (1.00): ROAD SHADOW WEDGES, GROUND POOLS, FOREGROUND RUBBLE & REFLECTION
  // ===========================================================================
  // Clean ground plane
  const groundPoly: Point2D[] = [
    [0, horizonY],
    [W, horizonY],
    [W, H],
    [0, H],
  ];
  fillRoughenedPolygon(ctx, groundPoly, rng, THEME_COLORS.paper, 0.8);

  // Dense black pools of shadow beneath ruins along horizon
  const shadowPools: Point2D[][] = [
    // Beneath overpass pier and left ruins
    [
      [W * 0.28, horizonY],
      [W * 0.38, horizonY],
      [W * 0.37, horizonY + 20],
      [W * 0.29, horizonY + 20],
    ],
    // Beneath right tower cluster
    [
      [W * 0.68, horizonY],
      [W * 0.98, horizonY],
      [W * 0.97, horizonY + 16],
      [W * 0.69, horizonY + 16],
    ],
  ];
  for (const sp of shadowPools) {
    fillRoughenedPolygon(ctx, sp, rng, THEME_COLORS.ink, 1.4);
    hatchPolygonClipped(ctx, sp, rng, {
      angleRad: 0.05,
      spacing: 4.5,
      baseWidth: 1.8,
    });
  }

  // Long solid shadow wedges cast across the street from the ruins, pointing away from the red dot
  // Left shadow wedge along the left curb under the overpass (x = 0.26..0.36W)
  const leftShadowWedge: Point2D[] = [
    [W * 0.28, horizonY + 6],
    [W * 0.38, horizonY + 10],
    [W * 0.35, H * 0.78],
    [W * 0.22, H * 0.76],
  ];
  fillRoughenedPolygon(ctx, leftShadowWedge, rng, THEME_COLORS.ink, 1.4);
  outlinePolygonWithInk(ctx, leftShadowWedge, rng, { baseWidth: 2.2, dryBrush: true });
  hatchPolygonClipped(ctx, leftShadowWedge, rng, {
    angleRad: -0.32,
    spacing: 3.2,
    baseWidth: 2.0,
  });

  // Right shadow wedge along the right curb from the right towers
  const rightShadowWedge: Point2D[] = [
    [W * 0.65, horizonY + 12],
    [W * 0.72, horizonY + 14],
    [W * 0.73, H * 0.76],
    [W * 0.63, H * 0.74],
  ];
  fillRoughenedPolygon(ctx, rightShadowWedge, rng, THEME_COLORS.ink, 1.4);
  outlinePolygonWithInk(ctx, rightShadowWedge, rng, { baseWidth: 2.2, dryBrush: true });

  // White broken hairline cracks cut through the road shadow wedges
  for (const sw of [leftShadowWedge, rightShadowWedge]) {
    const cx0 = (sw[0][0] + sw[1][0]) * 0.5;
    const cy0 = (sw[0][1] + sw[1][1]) * 0.5;
    const cx1 = (sw[2][0] + sw[3][0]) * 0.5;
    const cy1 = (sw[2][1] + sw[3][1]) * 0.5;
    drawInkStroke(
      ctx,
      [
        [cx0, cy0 + 16],
        [cx0 + (cx1 - cx0) * 0.5 + rng.range(-8, 8), cy0 + (cy1 - cy0) * 0.5],
        [cx1, cy1 - 16],
      ],
      rng,
      { baseWidth: 1.4, color: THEME_COLORS.paperPure, taperScale: 1.3 }
    );
  }

  // Horizon baseline
  drawInkStroke(
    ctx,
    [
      [0, horizonY],
      [W, horizonY],
    ],
    rng,
    { baseWidth: 2.0, wobbleScale: 0.2 }
  );

  // Tilted utility poles and sagging power lines crossing the avenue
  // Left leaning utility pole along avenue curb
  const poleLeft: Point2D[] = [
    [W * 0.44, H * 0.68],
    [W * 0.43, H * 0.54],
  ];
  drawInkStroke(ctx, poleLeft, rng, { baseWidth: 2.6, color: THEME_COLORS.ink });
  // Crossbar
  drawInkStroke(
    ctx,
    [
      [W * 0.41, H * 0.56],
      [W * 0.45, H * 0.56],
    ],
    rng,
    { baseWidth: 1.8, color: THEME_COLORS.ink }
  );

  // Right broken utility pole
  const poleRight: Point2D[] = [
    [W * 0.65, H * 0.66],
    [W * 0.66, H * 0.54],
  ];
  drawInkStroke(ctx, poleRight, rng, { baseWidth: 2.4, color: THEME_COLORS.ink });
  drawInkStroke(
    ctx,
    [
      [W * 0.64, H * 0.56],
      [W * 0.68, H * 0.56],
    ],
    rng,
    { baseWidth: 1.8, color: THEME_COLORS.ink }
  );

  // Sagging power lines looping across the road (catenary arcs)
  for (let wire = 0; wire < 3; wire++) {
    const yOff = wire * 6;
    const wPts: Point2D[] = [
      [W * 0.42 + wire * 3, H * 0.56 + yOff],
      [W * 0.48, H * 0.59 + yOff],
      [W * 0.54, H * 0.61 + yOff],
      [W * 0.60, H * 0.59 + yOff],
      [W * 0.66 + wire * 2, H * 0.56 + yOff],
    ];
    drawInkStroke(ctx, wPts, rng, {
      baseWidth: 1.1,
      color: THEME_COLORS.ink,
      wobbleScale: 0.2,
      breakChance: 0.1,
    });
  }

  // One-point perspective avenue curb lines radiating to (vpX, vpY)
  // Center of road (W*0.44..W*0.58) stays pale white paper as the illuminated path leading to the horizon!
  const curbRays: Array<{ end: Point2D; width: number }> = [
    { end: [W * 0.16, H], width: 2.4 }, // left outer sidewalk
    { end: [W * 0.28, H], width: 2.8 }, // left curb
    { end: [W * 0.76, H], width: 2.8 }, // right curb
    { end: [W * 0.88, H], width: 2.4 }, // right outer sidewalk
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
      });
    }
  }

  // Dashed center lane markings on the lit path
  const dashes = 9;
  for (let d = 1; d <= dashes; d++) {
    const t0 = Math.pow((d - 0.4) / dashes, 1.6);
    const t1 = Math.pow((d + 0.15) / dashes, 1.6);
    const y0 = vpY + (H - vpY) * t0;
    const y1 = vpY + (H - vpY) * t1;
    const cx0 = vpX + (W * 0.52 - vpX) * t0;
    const cx1 = vpX + (W * 0.52 - vpX) * t1;
    drawInkStroke(
      ctx,
      [
        [cx0, y0],
        [cx1, y1],
      ],
      rng,
      { baseWidth: Math.max(1.1, 2.8 * t1), wobbleScale: 0.2 }
    );
  }

  // Asphalt cracks on the street
  for (let c = 0; c < 4; c++) {
    const cy = H * (0.64 + c * 0.08);
    const cx = W * (0.42 + (c % 2) * 0.12);
    drawInkStroke(
      ctx,
      [
        [cx, cy],
        [cx + rng.range(-15, 15), cy + rng.range(8, 16)],
        [cx + rng.range(-25, 25), cy + rng.range(20, 32)],
      ],
      rng,
      { baseWidth: 1.2, color: THEME_COLORS.ink, breakChance: 0.25 }
    );
  }

  // Wet street puddle reflection of the red dot sun (sparse red accent)
  const puddleX = W * 0.525;
  const puddleY = H * 0.685;
  const puddleRx = 24;
  const puddleRy = 7;
  for (let r = -puddleRy + 1; r < puddleRy; r += 2) {
    const xHalf = Math.sqrt(Math.max(0, 1 - (r / puddleRy) ** 2)) * puddleRx;
    drawInkStroke(
      ctx,
      [
        [puddleX - xHalf, puddleY + r],
        [puddleX + xHalf, puddleY + r],
      ],
      rng,
      {
        baseWidth: 1.3,
        color: THEME_COLORS.red,
        taperScale: 1.2,
      }
    );
  }

  // Foreground rubble: concrete chunks strictly in bottom corners
  // Bottom-left corner rubble (behind/below Eva's torso, clear of chin & road)
  const rubbleLeft: Point2D[] = [
    [0, H * 0.84],
    [W * 0.15, H * 0.82],
    [W * 0.17, H * 0.94],
    [W * 0.11, H],
    [0, H],
  ];
  fillRoughenedPolygon(ctx, rubbleLeft, rng, THEME_COLORS.ink, 1.6);
  outlinePolygonWithInk(ctx, rubbleLeft, rng, { baseWidth: 2.6, dryBrush: true });

  // Bottom-right rubble mass & tipped road sign
  const rubbleRight: Point2D[] = [
    [W * 0.88, H * 0.90],
    [W, H * 0.86],
    [W, H],
    [W * 0.86, H],
  ];
  fillRoughenedPolygon(ctx, rubbleRight, rng, THEME_COLORS.ink, 1.6);
  outlinePolygonWithInk(ctx, rubbleRight, rng, { baseWidth: 2.6, dryBrush: true });

  // White rebar curls sticking out of foreground concrete chunks
  for (const rb of [
    [W * 0.12, H * 0.89],
    [W * 0.89, H * 0.89],
  ] as const) {
    drawInkStroke(
      ctx,
      [
        [rb[0], rb[1]],
        [rb[0] + rng.range(-6, 8), rb[1] - rng.range(12, 22)],
        [rb[0] + rng.range(-12, 14), rb[1] - rng.range(24, 34)],
      ],
      rng,
      { baseWidth: 1.4, color: THEME_COLORS.paperPure, taperScale: 1.4 }
    );
  }

  // Tipped red hazard diamond marker in the right rubble
  const signPost: Point2D[] = [
    [W * 0.84, H * 0.86],
    [W * 0.825, H * 0.81],
  ];
  drawInkStroke(ctx, signPost, rng, { baseWidth: 1.6, color: THEME_COLORS.ink });
  const diamondCenter: Point2D = [W * 0.825, H * 0.81];
  const diamond: Point2D[] = [
    [diamondCenter[0], diamondCenter[1] - 8],
    [diamondCenter[0] + 6, diamondCenter[1]],
    [diamondCenter[0], diamondCenter[1] + 8],
    [diamondCenter[0] - 6, diamondCenter[1]],
  ];
  fillRoughenedPolygon(ctx, diamond, rng, THEME_COLORS.red, 0.4);
  outlinePolygonWithInk(ctx, diamond, rng, { baseWidth: 1.2, color: THEME_COLORS.ink });

  // Presence overlay: idle haze stipple over black masses (never grey)
  if (isIdle) {
    const idleStippleCount = 180;
    for (let i = 0; i < idleStippleCount; i++) {
      const u = structuralRng.range(0.55, 0.98);
      const v = structuralRng.range(0.04, 0.42);
      drawInkDot(ctx, u * W, v * H, 1.2, rng, THEME_COLORS.paperPure);
    }
  }

  // Presence overlay: offline dead beacons and static streaks
  if (isOffline) {
    for (let s = 0; s < 5; s++) {
      const sy = H * structuralRng.range(0.12, 0.45);
      const sx = W * structuralRng.range(0.45, 0.95);
      drawInkStroke(
        ctx,
        [
          [sx, sy],
          [sx + rng.range(25, 60), sy],
        ],
        rng,
        { baseWidth: 1.1, color: THEME_COLORS.paperPure, breakChance: 0.4 }
      );
    }
  }

  recorder.captureStage(canvas, 0.75, 1.0, 'bottom-up');
}
