import { THEME_COLORS } from '../../config/theme.ts';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  type Canvas2DContext,
  type Point2D,
} from '../../scene/art/inkBrush.ts';
import { createRng } from '../../scene/art/rng.ts';
import {
  carveNegativeSeam,
  fillInkSilhouetteWithFringe,
  type AnyCanvas,
  type EvaDrawOrderRecorder,
} from './evaSurface.ts';
import { polyUvToPx, uvToPx, type PointUV } from './skeleton.ts';

/**
 * 1. WIDE NECK AT THE BACK OF THE HEAD, NAPE ARMOR, DARK MESH & CURVED CHEST PLATE (`neck`)
 * Exact 1-to-1 geometry matching the official Evangelion Unit-01 bust poster:
 * - Neck spans from the left edge (u = 0.00) to the jaw-throat junction (u = 0.552) at the BACK of the head
 * - Dorsal trapezius/nape armor plate at top-left with 3 parallel angled louver fins
 * - Wide dark carbon-stipple mesh band between the head/nape and the chest plate
 * - Sweeping curved white chest plate (orange plate in ref) curving from (0.512, 0.628) down-left to (0.185, 0.898)
 *   with heavy black borders, central double groove channel, parallel grooves, and dark inset panels
 */
export function drawEvaNeckLayer(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  recorder?: EvaDrawOrderRecorder,
  seed = 707
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);
  const s = W / 1024;

  ctx.clearRect(0, 0, W, H);

  const P = (pts: PointUV[]): Point2D[] => polyUvToPx(pts, W);
  const U = (u: number, v: number): Point2D => uvToPx([u, v], W);

  // ---------------------------------------------------------------------------
  // A. WIDE NECK SILHOUETTE AT THE BACK OF THE HEAD (u = 0.00..0.552)
  // ---------------------------------------------------------------------------
  const neckBaseUv: PointUV[] = [
    [0.000, 0.440], // dorsal top-left under rear helmet cowl
    [0.120, 0.435],
    [0.425, 0.468], // under side capsule vent
    [0.552, 0.618], // jaw-throat junction (mid-head, behind snout/jaw)
    [0.512, 0.630], // front peak of curved chest plate
    [0.435, 0.715], // chest curve descending
    [0.320, 0.792],
    [0.225, 0.898], // bottom tip of curved chest plate
    [0.000, 0.898], // left edge bleed
  ];
  fillInkSilhouetteWithFringe(ctx, P(neckBaseUv), rng, 1.8 * s, 3.4 * s);

  // ---------------------------------------------------------------------------
  // B. DARK MESH / FINE-DOT TEXTURE ACROSS UPPER NECK & THROAT RECESS
  // Spans between the nape armor / head underside and the top of the chest plate
  // ---------------------------------------------------------------------------
  const dotStep = Math.max(5, Math.round(5.5 * s));
  const yStart = Math.round(0.47 * H);
  const yEnd = Math.round(0.64 * H);

  for (let py = yStart; py <= yEnd; py += dotStep) {
    const v = py / H;
    const rowShift = ((py / dotStep) % 2) * (dotStep * 0.5);
    for (let px = Math.round(0.01 * W + rowShift); px <= Math.round(0.55 * W); px += dotStep) {
      const u = px / W;
      // Upper bound: below nape plate on left, below head/jaw on right
      const topBoundV =
        u < 0.24 ? 0.555 - u * 0.25 : u < 0.42 ? 0.490 : 0.490 + (u - 0.42) * 0.95;
      // Lower bound: above the curved chest plate
      const botBoundV =
        u < 0.12 ? 0.612 : u < 0.38 ? 0.612 - (u - 0.12) * 0.35 : 0.520 + (u - 0.38) * 0.85;

      if (v >= topBoundV && v <= botBoundV && u <= 0.545) {
        drawInkDot(ctx, px, py, 1.35 * s, rng, THEME_COLORS.paperPure);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // C. DORSAL NAPE / TRAPEZIUS ARMOR PLATE (Top-left, u = 0.00..0.24, v = 0.435..0.562)
  // ---------------------------------------------------------------------------
  const napePlateUv: PointUV[] = [
    [0.000, 0.442],
    [0.115, 0.435],
    [0.215, 0.468],
    [0.238, 0.495],
    [0.025, 0.562],
    [0.000, 0.560],
  ];
  fillInkSilhouetteWithFringe(ctx, P(napePlateUv), rng, 1.4 * s, 2.8 * s);

  // Crisp white negative seams defining the nape armor rim and 3 angled louver fins
  carveNegativeSeam(
    ctx,
    P([
      [0.005, 0.470],
      [0.135, 0.462],
      [0.210, 0.488],
      [0.025, 0.552],
    ]),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.15, doubleChance: 0 }
  );

  // 3 parallel angled louver slots inside the nape armor (matching light blue louvers in ref)
  for (const [u0, v0, u1, v1] of [
    [0.045, 0.535, 0.082, 0.482],
    [0.085, 0.524, 0.118, 0.478],
    [0.125, 0.512, 0.152, 0.476],
  ] as const) {
    carveNegativeSeam(
      ctx,
      P([
        [u0, v0],
        [u1, v1],
      ]),
      rng,
      { baseWidth: 4.2 * s, wobbleScale: 0.1, doubleChance: 0 }
    );
  }

  // Two oval mechanical buttons on top of the nape plate
  const napeBtn1 = U(0.045, 0.454);
  const napeBtn2 = U(0.088, 0.452);
  drawInkDot(ctx, napeBtn1[0], napeBtn1[1], 4.5 * s, rng, THEME_COLORS.paperPure);
  drawInkDot(ctx, napeBtn2[0], napeBtn2[1], 4.5 * s, rng, THEME_COLORS.paperPure);

  // ---------------------------------------------------------------------------
  // D. BIG SWEEPING CURVED CHEST & SHOULDER PLATE (Orange plate in ref -> Paper White #FAFAF8)
  // ---------------------------------------------------------------------------
  const chestPlateUv: PointUV[] = [
    [0.000, 0.615], // left shoulder tab
    [0.105, 0.612],
    [0.118, 0.612],
    [0.375, 0.520], // ascending upper-left slope
    [0.392, 0.518], // upper-right throat cap
    [0.455, 0.524],
    [0.512, 0.628], // front-most chest peak
    [0.435, 0.715], // sweeping convex front curve
    [0.320, 0.792],
    [0.225, 0.898], // bottom point of chest plate
    [0.185, 0.898],
    [0.165, 0.808], // lower-left inner curve
    [0.095, 0.720],
    [0.000, 0.690],
  ];
  fillRoughenedPolygon(ctx, P(chestPlateUv), rng, THEME_COLORS.paperPure, 1.0 * s);

  // Heavy black outline around the entire curved chest plate
  drawInkStroke(ctx, [...P(chestPlateUv), U(0.000, 0.615)], rng, {
    baseWidth: 4.2 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.2,
    doubleChance: 0,
  });

  // 1. Central double black dividing groove channel (splits chest plate into left & right halves)
  const centerGrooveLeftUv: PointUV[] = [
    [0.376, 0.520],
    [0.316, 0.662],
    [0.176, 0.788],
    [0.186, 0.896],
  ];
  const centerGrooveRightUv: PointUV[] = [
    [0.390, 0.520],
    [0.332, 0.668],
    [0.194, 0.794],
    [0.204, 0.896],
  ];
  drawInkStroke(ctx, P(centerGrooveLeftUv), rng, {
    baseWidth: 3.4 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.15,
    doubleChance: 0,
  });
  drawInkStroke(ctx, P(centerGrooveRightUv), rng, {
    baseWidth: 3.4 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.15,
    doubleChance: 0,
  });

  // 2. Parallel black contour groove following the outer convex curve
  const outerContourGrooveUv: PointUV[] = [
    [0.442, 0.526],
    [0.490, 0.626],
    [0.415, 0.704],
    [0.304, 0.778],
    [0.215, 0.884],
  ];
  drawInkStroke(ctx, P(outerContourGrooveUv), rng, {
    baseWidth: 2.6 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.15,
    doubleChance: 0,
  });

  // 3. Parallel black contour groove following the upper-left diagonal slope
  const innerContourGrooveUv: PointUV[] = [
    [0.125, 0.618],
    [0.355, 0.538],
    [0.302, 0.656],
    [0.168, 0.782],
  ];
  drawInkStroke(ctx, P(innerContourGrooveUv), rng, {
    baseWidth: 2.4 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.15,
    doubleChance: 0,
  });

  // 4. Recessed dark geometric panels inside the chest plate (matching brown recesses in ref)
  const leftRecessUv: PointUV[] = [
    [0.205, 0.635],
    [0.300, 0.618],
    [0.288, 0.662],
    [0.195, 0.758],
    [0.220, 0.678],
  ];
  fillRoughenedPolygon(ctx, P(leftRecessUv), rng, THEME_COLORS.ink, 0.8 * s);

  const rightUpperRecessUv: PointUV[] = [
    [0.394, 0.534],
    [0.432, 0.538],
    [0.430, 0.606],
    [0.376, 0.604],
  ];
  fillRoughenedPolygon(ctx, P(rightUpperRecessUv), rng, THEME_COLORS.ink, 0.8 * s);

  // Additional angular facet lines on the right half of the chest plate
  drawInkStroke(
    ctx,
    P([
      [0.345, 0.652],
      [0.425, 0.612],
      [0.478, 0.630],
    ]),
    rng,
    { baseWidth: 2.2 * s, color: THEME_COLORS.ink, wobbleScale: 0.12, doubleChance: 0 }
  );
  drawInkStroke(
    ctx,
    P([
      [0.335, 0.675],
      [0.375, 0.720],
      [0.425, 0.698],
    ]),
    rng,
    { baseWidth: 2.0 * s, color: THEME_COLORS.ink, wobbleScale: 0.12, doubleChance: 0 }
  );

  // Left shoulder tab step seam
  drawInkStroke(
    ctx,
    P([
      [0.105, 0.612],
      [0.095, 0.720],
    ]),
    rng,
    { baseWidth: 3.2 * s, color: THEME_COLORS.ink, wobbleScale: 0.12, doubleChance: 0 }
  );

  recorder?.captureStage(canvas, 0.22, 0.32, 'bottom-up');
}

/**
 * 2. CHUNKY SEGMENTED LOWER SHOULDER & COLLAR ARMOR (`torso`)
 * Exact 1-to-1 geometry matching the lower portion of the Evangelion Unit-01 bust poster:
 * - Segmented black/purple armor blocks on the lower-left (u = 0.00..0.28, v = 0.69..1.00)
 * - Angular red V-fin accent at the bottom-left corner (matching green fin in ref)
 * - Forward lower chest strut descending from under the curved chest plate to (0.595, 1.00)
 */
export function drawEvaTorsoLayer(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  recorder?: EvaDrawOrderRecorder,
  seed = 709
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);
  const s = W / 1024;

  ctx.clearRect(0, 0, W, H);

  const P = (pts: PointUV[]): Point2D[] => polyUvToPx(pts, W);
  const U = (u: number, v: number): Point2D => uvToPx([u, v], W);

  // ---------------------------------------------------------------------------
  // A. LOWER TORSO & COLLAR SILHOUETTE (u = 0.00..0.60, v = 0.68..1.00)
  // ---------------------------------------------------------------------------
  const torsoSilhouetteUv: PointUV[] = [
    [0.000, 0.685],
    [0.335, 0.775], // emerges from under the curved white chest plate
    [0.430, 0.885], // front collar strut angle
    [0.595, 0.985], // bottom-right chest tip
    [0.595, 1.000],
    [0.000, 1.000],
  ];
  fillInkSilhouetteWithFringe(ctx, P(torsoSilhouetteUv), rng, 2.0 * s, 3.6 * s);

  // ---------------------------------------------------------------------------
  // B. DARK STIPPLE MESH IN LOWER COLLAR RECESS (between chest plate tip & front strut)
  // ---------------------------------------------------------------------------
  const dotStep = Math.max(5, Math.round(5.8 * s));
  for (let py = Math.round(0.78 * H); py <= Math.round(0.95 * H); py += dotStep) {
    const v = py / H;
    for (let px = Math.round(0.24 * W); px <= Math.round(0.36 * W); px += dotStep) {
      const u = px / W;
      if (u >= 0.25 && u <= 0.34 && v >= 0.79 && v <= 0.93) {
        drawInkDot(ctx, px, py, 1.3 * s, rng, THEME_COLORS.paperPure);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // C. CHUNKY SEGMENTED ARMOR SEAMS & LIGHT MECHANICAL COLLAR WEDGE
  // ---------------------------------------------------------------------------
  // Light hatched inner collar wedge under the chest plate point (u = 0.19..0.31, v = 0.84..0.97)
  const collarWedgeUv: PointUV[] = [
    [0.215, 0.885],
    [0.255, 0.835],
    [0.305, 0.945],
    [0.285, 0.975],
    [0.195, 0.925],
  ];
  fillRoughenedPolygon(ctx, P(collarWedgeUv), rng, THEME_COLORS.paperPure, 0.6 * s);
  drawInkStroke(ctx, [...P(collarWedgeUv), U(0.215, 0.885)], rng, {
    baseWidth: 2.8 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.15,
    doubleChance: 0,
  });

  // White negative seams dividing the chunky lower-left purple armor blocks
  const armorSeamsUv: PointUV[][] = [
    // Upper-left shoulder block seam
    [
      [0.000, 0.735],
      [0.105, 0.765],
      [0.165, 0.885],
      [0.000, 0.875],
    ],
    // Lower collar chevron plate seam
    [
      [0.000, 0.895],
      [0.165, 0.905],
      [0.285, 0.985],
    ],
    // Forward chest strut seam
    [
      [0.318, 0.885],
      [0.365, 0.995],
    ],
    [
      [0.330, 0.800],
      [0.415, 0.895],
      [0.575, 0.995],
    ],
  ];
  for (const seam of armorSeamsUv) {
    carveNegativeSeam(ctx, P(seam), rng, {
      baseWidth: 2.4 * s,
      wobbleScale: 0.2,
      doubleChance: 0,
    });
  }

  // ---------------------------------------------------------------------------
  // D. BOTTOM-LEFT ANGULAR RED V-FIN ACCENT (Green V-fin in reference -> Red #D4141C)
  // ---------------------------------------------------------------------------
  const bottomVFinUv: PointUV[] = [
    [0.028, 0.955],
    [0.118, 0.925],
    [0.085, 0.958],
    [0.148, 1.000],
    [0.068, 1.000],
  ];
  fillRoughenedPolygon(ctx, P(bottomVFinUv), rng, THEME_COLORS.red, 0.5 * s);
  drawInkStroke(ctx, [...P(bottomVFinUv), U(0.028, 0.955)], rng, {
    baseWidth: 2.6 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.12,
    doubleChance: 0,
  });

  recorder?.captureStage(canvas, 0.14, 0.22, 'top-down');
}

/**
 * Composite bust helper (draws `torso` then `neck` in depth order).
 */
export function drawEvaBodyLayer(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  recorder: EvaDrawOrderRecorder,
  seed = 709
): void {
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  drawEvaTorsoLayer(ctx, canvas, recorder, seed);
  drawEvaNeckLayer(ctx, canvas, recorder, seed + 2);
}
