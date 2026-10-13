import { THEME_COLORS } from '../../config/theme.ts';
import {
  fillRoughenedPolygon,
  type Canvas2DContext,
} from '../../scene/art/inkBrush.ts';
import { createRng } from '../../scene/art/rng.ts';
import {
  carveNegativeSeam,
  fillInkSilhouetteWithFringe,
  type AnyCanvas,
  type EvaDrawOrderRecorder,
} from './evaSurface.ts';
import { EVA_SKELETON, polyHToPx, type PointH } from './skeleton.ts';

/**
 * Draws Eva-01 `jaw` layer matching official bust reference artwork:
 * - Completely CLOSED jaw meeting upper face along clean mechanical seam line
 * - Zero teeth, zero serrations
 * - Angular red chin cap (#D4141C) at the blunt beak tip
 * - Smooth concave sweep on the underside of the jaw curving back to the neck
 * - Internal mandibular plate seam line
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
  const { jawHinge, chinTip, jawThroatJunction } = joints;

  // ---------------------------------------------------------------------------
  // 1. CLOSED LOWER MANDIBLE PLATE SILHOUETTE
  // Upper rim meets steep snout; underside is a smooth concave curve to throat
  // ---------------------------------------------------------------------------
  const jawPolyH: PointH[] = [
    // Hinge root at lower cheek
    [jawHinge[0], jawHinge[1]],
    // Upper jaw-seam rim fitting flush against upper snout
    [jawHinge[0] + 0.18, jawHinge[1] + 0.02],
    [chinTip[0] - 0.04, chinTip[1] - 0.06],
    // Sharp pointed chin tip
    [chinTip[0], chinTip[1]],
    // Chin cap lower edge
    [chinTip[0] - 0.06, chinTip[1] + 0.04],
    // Underside of jaw: smooth concave sweep back to neck/throat junction
    [chinTip[0] - 0.14, chinTip[1] + 0.02],
    [chinTip[0] - 0.22, chinTip[1] - 0.04],
    [jawThroatJunction[0] + 0.06, jawThroatJunction[1] - 0.02],
    [jawThroatJunction[0], jawThroatJunction[1]],
    // Rear mandible contour ascending back to hinge
    [jawHinge[0] + 0.02, jawHinge[1] + 0.08],
  ];

  fillInkSilhouetteWithFringe(ctx, polyHToPx(jawPolyH, W, sk), rng, 1.8 * s, 3.2 * s);

  // ---------------------------------------------------------------------------
  // 2. ANGULAR RED CHIN CAP AT SHARP BEAK TIP
  // ---------------------------------------------------------------------------
  const chinCapPolyH: PointH[] = [
    [chinTip[0] - 0.05, chinTip[1] - 0.08],
    [chinTip[0], chinTip[1]],
    [chinTip[0] - 0.06, chinTip[1] + 0.04],
    [chinTip[0] - 0.10, chinTip[1] - 0.02],
  ];
  fillRoughenedPolygon(ctx, polyHToPx(chinCapPolyH, W, sk), rng, THEME_COLORS.red, 0.6 * s);

  // Negative seam line bounding the red chin cap
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [chinTip[0] - 0.05, chinTip[1] - 0.08],
        [chinTip[0] - 0.10, chinTip[1] - 0.02],
        [chinTip[0] - 0.06, chinTip[1] + 0.04],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.2 }
  );

  // ---------------------------------------------------------------------------
  // 3. HORIZONTAL LINE CUTOUTS ALONG JAW PLATE (matching reference mech cutouts)
  // ---------------------------------------------------------------------------
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [jawHinge[0] + 0.06, jawHinge[1] + 0.06],
        [jawHinge[0] + 0.16, jawHinge[1] + 0.08],
        [chinTip[0] - 0.12, chinTip[1] - 0.04],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.15 }
  );

  recorder.captureStage(canvas, 0.80, 0.92, 'left-right');
}
