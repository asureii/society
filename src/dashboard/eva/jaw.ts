import { THEME_COLORS } from '../../config/theme.ts';
import {
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
 * Draws Eva-01 `jaw` layer with exact 1-to-1 geometry matching the official
 * Evangelion Unit-01 bust reference poster:
 * - Steep downward-sloping jawline descending from (0.425, 0.472) to (0.710, 0.725)
 * - Actual articulated lower mandible plate with gonial jaw corner at (0.625, 0.678)
 * - Sculpted upper mandible ridge with mechanical vent slits
 * - Long, steep downward-pointing angular red chin wedge from (0.688, 0.590) to (0.775, 0.718)
 */
export function drawEvaJawLayer(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  recorder: EvaDrawOrderRecorder,
  seed = 727
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);
  const s = W / 1024;

  ctx.clearRect(0, 0, W, H);

  const P = (pts: PointUV[]): Point2D[] => polyUvToPx(pts, W);
  const U = (u: number, v: number): Point2D => uvToPx([u, v], W);

  // ---------------------------------------------------------------------------
  // 1. SOLID BLACK LOWER MANDIBLE BASE SILHOUETTE (with real jaw corner & steep drop)
  // ---------------------------------------------------------------------------
  const lowerJawUv: PointUV[] = [
    [0.425, 0.472], // rear jaw hinge under capsule vent
    [0.535, 0.545], // mid cheek-jaw seam
    [0.640, 0.598], // front jaw seam
    [0.688, 0.592], // top of chin wedge
    [0.712, 0.724], // bottom of jaw behind chin wedge
    [0.682, 0.722], // lower chin step
    [0.625, 0.678], // prominent lower jaw gonial corner
    [0.585, 0.645], // underside of jaw concave sweep
    [0.552, 0.618], // jaw-throat junction (where neck mesh attaches)
    [0.495, 0.548], // rear mandible ascending edge
  ];
  fillInkSilhouetteWithFringe(ctx, P(lowerJawUv), rng, 1.5 * s, 3.0 * s);

  // ---------------------------------------------------------------------------
  // 2. SCULPTED LIGHT UPPER-MANDIBLE RIDGE PLATE (matching lighter blue jaw ridge in ref)
  // ---------------------------------------------------------------------------
  const jawRidgeUv: PointUV[] = [
    [0.455, 0.492],
    [0.540, 0.548],
    [0.642, 0.600],
    [0.688, 0.592],
    [0.706, 0.712],
    [0.672, 0.675],
    [0.610, 0.618],
    [0.525, 0.568],
  ];
  fillRoughenedPolygon(ctx, P(jawRidgeUv), rng, THEME_COLORS.paperPure, 0.6 * s);
  drawInkStroke(ctx, [...P(jawRidgeUv), U(0.455, 0.492)], rng, {
    baseWidth: 2.6 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.15,
    doubleChance: 0,
  });

  // Two small dark recessed vent slots along the jaw ridge (as in reference)
  drawInkStroke(
    ctx,
    P([
      [0.545, 0.562],
      [0.568, 0.578],
    ]),
    rng,
    { baseWidth: 3.4 * s, color: THEME_COLORS.ink, wobbleScale: 0.08, doubleChance: 0 }
  );
  drawInkStroke(
    ctx,
    P([
      [0.578, 0.584],
      [0.602, 0.600],
    ]),
    rng,
    { baseWidth: 3.4 * s, color: THEME_COLORS.ink, wobbleScale: 0.08, doubleChance: 0 }
  );

  // Crisp white negative seam along the dark lower jaw rim
  carveNegativeSeam(
    ctx,
    P([
      [0.560, 0.612],
      [0.625, 0.668],
      [0.685, 0.712],
    ]),
    rng,
    { baseWidth: 1.8 * s, wobbleScale: 0.15, doubleChance: 0 }
  );

  // ---------------------------------------------------------------------------
  // 3. LONG DOWNWARD-POINTING ANGULAR RED CHIN WEDGE (Green chin piece in ref)
  // ---------------------------------------------------------------------------
  const chinWedgeUv: PointUV[] = [
    [0.688, 0.590], // top apex on snout
    [0.775, 0.718], // sharp front-bottom chin tip
    [0.742, 0.730], // bottom-most corner of chin cap
    [0.710, 0.722], // rear-bottom corner meeting lower mandible
    [0.702, 0.665], // inner seam step
  ];
  fillRoughenedPolygon(ctx, P(chinWedgeUv), rng, THEME_COLORS.red, 0.6 * s);

  // Heavy black outline around the angular red chin wedge
  drawInkStroke(ctx, [...P(chinWedgeUv), U(0.688, 0.590)], rng, {
    baseWidth: 3.0 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.12,
    doubleChance: 0,
  });

  // Internal bevel facet line near the bottom of the chin wedge
  drawInkStroke(
    ctx,
    P([
      [0.714, 0.706],
      [0.742, 0.714],
      [0.770, 0.716],
    ]),
    rng,
    { baseWidth: 2.0 * s, color: THEME_COLORS.ink, wobbleScale: 0.08, doubleChance: 0 }
  );

  recorder.captureStage(canvas, 0.80, 0.92, 'left-right');
}
