import { THEME_COLORS } from '../../config/theme';
import {
  drawInkStroke,
  fillRoughenedPolygon,
  type Canvas2DContext,
  type Point2D,
} from '../../scene/art/inkBrush';
import { createRng } from '../../scene/art/rng';
import {
  carveCrossContourEdgeHatch,
  carveNegativeSeam,
  drawInkSpatterCluster,
  fillInkSilhouetteWithFringe,
  type AnyCanvas,
  type EvaDrawOrderRecorder,
} from './evaSurface';

/**
 * Draws the Eva-01 `jaw` layer (1024x1024 transparent canvas, pivoted at jaw hinge `(435, 535)`):
 * - Ripped-open lower mandible and splayed chin armor plates
 * - Stretched mouth cavity edge striations at the jaw hinge
 * - Lower row of 8 large jagged white negative-space teeth attached to the mandible
 * - Ink drips hanging off the lower chin spur
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

  // 1. Main Lower Jaw & Ripped Chin Armor Silhouette (hinge at (435, 535))
  const jawPoly: Point2D[] = [
    [412 * s, 518 * s],
    [495 * s, 548 * s],
    [645 * s, 588 * s],
    [792 * s, 616 * s],
    [814 * s, 652 * s],
    [742 * s, 728 * s],
    // Heavy angular chin spur
    [682 * s, 778 * s],
    [598 * s, 742 * s],
    // Splayed lower jaw armor flange ripped downward
    [535 * s, 762 * s],
    [445 * s, 682 * s],
    [392 * s, 598 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, jawPoly, rng, 4.2 * s, 6.4 * s);

  // Mouth cavity edge & stretched hinge striations (white negative space)
  for (let m = 0; m < 4; m++) {
    const off = m * 11 * s;
    carveNegativeSeam(
      ctx,
      [
        [442 * s + off, 492 * s + off * 0.4],
        [462 * s + off, 532 * s + off * 0.5],
        [492 * s + off, 568 * s + off * 0.4],
      ],
      rng,
      { baseWidth: 2.6 * s }
    );
  }

  // Ripped lower jaw armor plate seams (white negative space)
  carveNegativeSeam(
    ctx,
    [
      [438 * s, 608 * s],
      [585 * s, 648 * s],
      [778 * s, 646 * s],
    ],
    rng,
    { baseWidth: 3.6 * s }
  );
  carveNegativeSeam(
    ctx,
    [
      [468 * s, 665 * s],
      [565 * s, 725 * s],
      [675 * s, 746 * s],
    ],
    rng,
    { baseWidth: 3.4 * s }
  );

  // Cross-contour hatching along the underside of the jaw & chin spur
  carveCrossContourEdgeHatch(
    ctx,
    [455 * s, 682 * s],
    [682 * s, 772 * s],
    [0.35, -0.92],
    14,
    18 * s,
    rng
  );

  // Ink drips hanging off the chin spur
  const dripAnchors: Array<[number, number, number]> = [
    [682, 772, 68],
    [718, 744, 46],
    [635, 756, 38],
  ];
  for (const [dx, dy, dLen] of dripAnchors) {
    drawInkStroke(
      ctx,
      [
        [dx * s, dy * s],
        [(dx - 2) * s, (dy + dLen * 0.55) * s],
        [(dx - 3) * s, (dy + dLen) * s],
      ],
      rng,
      { baseWidth: 3.5 * s, color: THEME_COLORS.ink, taperScale: 1.3 }
    );
  }

  drawInkSpatterCluster(ctx, 735 * s, 695 * s, 45 * s, 12, rng);

  recorder.captureStage(canvas, 0.72, 0.85, 'left-right');

  // 2. Lower Row of 8 Large Jagged White Negative-Space Teeth pointing upward
  const toothCount = 8;
  const startX = 522 * s;
  const endX = 772 * s;
  const stepX = (endX - startX) / toothCount;

  // Lower gumline negative-space ridge
  carveNegativeSeam(
    ctx,
    [
      [505 * s, 562 * s],
      [648 * s, 596 * s],
      [782 * s, 622 * s],
    ],
    rng,
    { baseWidth: 3.2 * s }
  );

  for (let i = 0; i < toothCount; i++) {
    const tx0 = startX + i * stepX + 2 * s;
    const tx1 = startX + (i + 1) * stepX - 2 * s;
    const tMid = (tx0 + tx1) * 0.5;
    const tFrac = (i + 0.5) / toothCount;
    const gumY = (560 + tFrac * 58) * s;
    const lenBoost = i === 0 || i === 4 || i === 6 ? 1.25 : 1.0;
    const toothLen = rng.range(36, 50) * lenBoost * s;

    const toothPoly: Point2D[] = [
      [tx0, gumY],
      [tx0 + 3 * s, gumY - toothLen * 0.68],
      [tMid + rng.range(-3, 4) * s, gumY - toothLen],
      [tx1 - 3 * s, gumY - toothLen * 0.65],
      [tx1, gumY + 2 * s],
    ];

    fillRoughenedPolygon(ctx, toothPoly, rng, THEME_COLORS.paper, 1.8 * s);
    drawInkStroke(
      ctx,
      [
        [tx0, gumY],
        [tMid, gumY - toothLen],
        [tx1, gumY + 2 * s],
      ],
      rng,
      { baseWidth: 2.5 * s, color: THEME_COLORS.ink, wobbleScale: 0.85 }
    );
    drawInkStroke(
      ctx,
      [
        [tMid, gumY - 2 * s],
        [tMid + 1 * s, gumY - toothLen * 0.52],
      ],
      rng,
      { baseWidth: 1.5 * s, color: THEME_COLORS.ink, wobbleScale: 0.6 }
    );
  }

  recorder.captureStage(canvas, 0.85, 0.96, 'left-right');
}
