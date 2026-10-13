import { THEME_COLORS } from '../../config/theme';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  type Canvas2DContext,
  type Point2D,
} from '../../scene/art/inkBrush';
import { createRng } from '../../scene/art/rng';
import {
  carveCrossContourEdgeHatch,
  carveNegativeSeam,
  fillInkSilhouetteWithFringe,
  type AnyCanvas,
  type EvaDrawOrderRecorder,
} from './evaSurface';

/**
 * Draws the Eva-01 `jaw` layer (1024x1024 transparent canvas, pivoted at jaw hinge `(438, 398)`):
 * Faithfully reproduces the gnarled, asymmetric, hyper-extended Berserk lower mandible from the reference artwork:
 * - Solid black throat-hinge root (`x = 335..510, y = 395..530`) so there is never a detached white gap
 *   between the neck/throat and the lower jaw at any jaw angle.
 * - Concave inner mouth curve (`(506, 426) -> (546, 482)`) leading into irregular jagged projections
 *   (`(568, 472)`, `(614, 494)`), the prominent forward chin-guard fang (`(688, 534)`), and the
 *   hyper-extended needle-sharp chin spear (`(758, 622)`).
 * - Sharp downward sub-chin barb (`(696, 636)`) and 4 long, needle-thin vertical ink drips hanging
 *   straight down into the open white paper negative space below (`x = 696, 608, 532, 444`).
 * Draw-order range: `0.72 .. 0.96` (appears last before the eye flash)
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

  // 1. Continuous Throat Root + Hyper-Extended Gnarled Berserk Mandible & Needle Chin Spear
  const jawPoly: Point2D[] = [
    // Deep throat root overlapping head/neck column (zero gap!)
    [336 * s, 405 * s],
    [498 * s, 402 * s],
    // Concave inner mouth corner curving down into the lower jaw
    [506 * s, 438 * s],
    [526 * s, 478 * s],
    [548 * s, 488 * s],
    // First irregular jagged tooth/crag on mandible
    [568 * s, 470 * s],
    [584 * s, 498 * s],
    // Second irregular jagged tooth/crag (where vertical saliva strand lands)
    [608 * s, 488 * s],
    [624 * s, 518 * s],
    // Deep concave dip before the large chin-guard fang
    [658 * s, 542 * s],
    // Prominent upward/forward chin-guard fang projection
    [688 * s, 532 * s],
    [706 * s, 566 * s],
    // Hyper-extended needle-sharp chin spear tip
    [758 * s, 622 * s],
    // Underside of chin spear with sharp downward sub-chin barb at (696, 636)
    [710 * s, 608 * s],
    [696 * s, 636 * s],
    [674 * s, 594 * s],
    // Slender, dripping underside of the mandible sweeping back to the throat overhang
    [608 * s, 562 * s],
    [532 * s, 528 * s],
    [484 * s, 518 * s],
    [444 * s, 534 * s],
    [412 * s, 512 * s],
    [342 * s, 516 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, jawPoly, rng, 3.0 * s, 4.8 * s);

  // Crisp foreground biomechanical chin-guard seam (white negative space)
  carveNegativeSeam(
    ctx,
    [
      [488 * s, 492 * s],
      [584 * s, 532 * s],
      [678 * s, 574 * s],
      [736 * s, 608 * s],
    ],
    rng,
    { baseWidth: 2.4 * s, wobbleScale: 0.55 }
  );

  // Cross-contour hatching along the underside of the extended mandible
  carveCrossContourEdgeHatch(
    ctx,
    [485 * s, 518 * s],
    [675 * s, 592 * s],
    [0.36, -0.93],
    9,
    11 * s,
    rng
  );

  // 2. Iconic 4 Long, Needle-Thin Vertical Ink Drips off the Lower Jaw (into open white space!)
  const verticalDrips: Array<[number, number, number, number]> = [
    // [x, startY, endY, baseWidth]
    [696, 624, 688, 3.0], // Drip off the sub-chin barb
    [608, 554, 784, 3.6], // The signature ultra-long vertical drip from mid-mandible!
    [532, 522, 596, 2.6], // Mid-rear jaw drip
    [444, 526, 632, 2.8], // Rear throat-jaw corner drip
  ];
  for (const [dx, y0, y1, bw] of verticalDrips) {
    // Small triangular liquid web at the root of the main drip
    if (dx === 608 || dx === 444) {
      const web: Point2D[] = [
        [(dx - 9) * s, (y0 - 2) * s],
        [(dx + 9) * s, (y0 + 2) * s],
        [dx * s, (y0 + 28) * s],
      ];
      fillRoughenedPolygon(ctx, web, rng, THEME_COLORS.ink, 1.0 * s);
    }
    drawInkStroke(
      ctx,
      [
        [dx * s, y0 * s],
        [(dx - 0.5) * s, ((y0 + y1) * 0.55) * s],
        [(dx - 0.5) * s, y1 * s],
      ],
      rng,
      { baseWidth: bw * s, color: THEME_COLORS.ink, taperScale: 1.4, wobbleScale: 0.35 }
    );
    drawInkDot(ctx, (dx - 0.5) * s, (y1 + 7) * s, bw * 0.6 * s, rng, THEME_COLORS.ink);
  }

  recorder.captureStage(canvas, 0.72, 0.96, 'left-right');
}
