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
  carveCrossContourEdgeHatch,
  carveNegativeSeam,
  fillInkSilhouetteWithFringe,
  type AnyCanvas,
  type EvaDrawOrderRecorder,
} from './evaSurface.ts';
import { EVA_PROPORTIONS } from './proportions.ts';
import { EVA_SKELETON, hToPx, polyHToPx, type PointH } from './skeleton.ts';

/**
 * Draws Eva-01 `jaw` layer matching official bust reference artwork:
 * - Hinged mandible with sharp angled chin-guard projection
 * - 6 jagged upward lower teeth along mandible rim
 * - Angular faceted chin-plate seam cuts (white negative space)
 * - Vertical ink drips falling into open paper space
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
  const sk = EVA_SKELETON;
  const s = W / 1024;

  ctx.clearRect(0, 0, W, H);

  const { joints } = sk;
  const { jawHinge, jawTip } = joints;

  // 1. Mandible & Sharp Angled Chin Guard matching reference
  const jawPolyH: PointH[] = [
    // Hinge root under cheek pod
    [jawHinge[0], jawHinge[1]],
    // Mandible upper tooth rim
    [jawHinge[0] + 0.22, jawHinge[1] + 0.08],
    [jawTip[0] - 0.08, jawTip[1] - 0.14],
    // Sharp angled chin guard tip (the green chin guard in reference)
    [jawTip[0], jawTip[1] - 0.04],
    [jawTip[0] - 0.06, jawTip[1] + 0.08],
    // Under-chin barb / sub-mandible notch
    [jawTip[0] - 0.16, jawTip[1] + 0.02],
    [jawTip[0] - 0.28, jawTip[1] - 0.06],
    // Mandible underside sweeping back to throat connection
    [jawHinge[0] + 0.16, jawTip[1] - 0.16],
    [jawHinge[0] + 0.02, jawHinge[1] + 0.14],
  ];

  fillInkSilhouetteWithFringe(ctx, polyHToPx(jawPolyH, W, sk), rng, 2.0 * s, 3.8 * s);

  // Angular chin guard plate seam (the boundary of the green chin plate in reference)
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [jawTip[0] - 0.12, jawTip[1] - 0.12],
        [jawTip[0] - 0.04, jawTip[1] + 0.02],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.3 }
  );

  // Mandibular armor seam line
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [jawHinge[0] + 0.08, jawHinge[1] + 0.10],
        [jawHinge[0] + 0.26, jawHinge[1] + 0.14],
        [jawTip[0] - 0.18, jawTip[1] - 0.08],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.35 }
  );

  // 2. Lower Jagged Teeth along mandible rim
  const toothStartX = jawHinge[0] + 0.22;
  const toothEndX = jawTip[0] - 0.08;
  const toothY = jawHinge[1] + 0.12;
  const numTeeth = EVA_PROPORTIONS.head.lowerTeethCount;
  const slotW = (toothEndX - toothStartX) / numTeeth;

  for (let i = 0; i < numTeeth; i++) {
    const tx0 = toothStartX + i * slotW + slotW * 0.08;
    const tx1 = toothStartX + (i + 1) * slotW - slotW * 0.08;
    const tMidX = (tx0 + tx1) * 0.5;
    const tY = toothY + (i / numTeeth) * 0.10;
    const toothLenH = i === 1 || i === 4 ? 0.090 : 0.075;

    const toothPolyPx: Point2D[] = polyHToPx(
      [
        [tx0, tY],
        [tx1, tY],
        [tMidX, tY - toothLenH],
      ],
      W,
      sk
    );
    fillRoughenedPolygon(ctx, toothPolyPx, rng, THEME_COLORS.paperPure, 0.7 * s);
  }

  // 3. Vertical Ink Drips hanging from the chin tip
  const chinDripPx0 = hToPx([jawTip[0] - 0.04, jawTip[1] + 0.06], W, sk);
  const chinDripPxMid = hToPx([jawTip[0] - 0.04, jawTip[1] + 0.28], W, sk);
  const chinDripPxEnd = hToPx([jawTip[0] - 0.045, jawTip[1] + 0.46], W, sk);
  drawInkStroke(ctx, [chinDripPx0, chinDripPxMid, chinDripPxEnd], rng, {
    baseWidth: 2.6 * s,
    color: THEME_COLORS.ink,
    taperScale: 1.35,
    wobbleScale: 0.3,
  });
  drawInkDot(ctx, chinDripPxEnd[0], chinDripPxEnd[1] + 6 * s, 2.2 * s, rng, THEME_COLORS.ink);

  const midDripPx0 = hToPx([jawTip[0] - 0.22, jawTip[1] - 0.02], W, sk);
  const midDripPxEnd = hToPx([jawTip[0] - 0.22, jawTip[1] + 0.24], W, sk);
  drawInkStroke(ctx, [midDripPx0, midDripPxEnd], rng, {
    baseWidth: 2.2 * s,
    color: THEME_COLORS.ink,
    taperScale: 1.3,
    wobbleScale: 0.3,
  });
  drawInkDot(ctx, midDripPxEnd[0], midDripPxEnd[1] + 5 * s, 1.8 * s, rng, THEME_COLORS.ink);

  // Cross-contour hatching under mandible
  carveCrossContourEdgeHatch(
    ctx,
    hToPx([jawHinge[0] + 0.12, jawHinge[1] + 0.12], W, sk),
    hToPx([jawTip[0] - 0.18, jawTip[1] - 0.04], W, sk),
    [0.18, -0.98],
    5,
    7.0 * s,
    rng
  );

  recorder.captureStage(canvas, 0.74, 0.96, 'left-right');
}
