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
  fillInkSilhouetteWithFringe,
  type AnyCanvas,
  type EvaDrawOrderRecorder,
} from './evaSurface';

/**
 * Draws the Eva-01 `body/shoulders` layer (1024x1024 transparent canvas):
 * - Left massive shoulder pylon cropped by the left frame edge, with rounded-rectangle
 *   restraint plates and white negative-space chevron grooves.
 * - Right forward-angled shoulder pylon with chevron grooves.
 * - Segmented biomechanical neck column and chest armor plates with a bold V-shaped seam,
 *   cropped by the bottom frame edge.
 * Draw-order range: `0.14 .. 0.38`
 */
export function drawEvaBodyLayer(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  recorder: EvaDrawOrderRecorder,
  seed = 709
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);
  const s = W / 1024;

  ctx.clearRect(0, 0, W, H);

  // 1. Left Shoulder Pylon (cropped at left edge x=0)
  const leftPylonPoly: Point2D[] = [
    [0, 195 * s],
    [76 * s, 92 * s],
    [168 * s, 82 * s],
    [232 * s, 145 * s],
    [275 * s, 395 * s],
    [262 * s, 665 * s],
    [0, 680 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, leftPylonPoly, rng, 4.0 * s, 6.2 * s);

  // Rounded-rectangle upper restraint blocks on left pylon (negative-space outline)
  carveNegativeSeam(
    ctx,
    [
      [48 * s, 128 * s],
      [152 * s, 118 * s],
      [178 * s, 212 * s],
      [62 * s, 224 * s],
      [48 * s, 128 * s],
    ],
    rng,
    { baseWidth: 3.4 * s }
  );

  // 3 Chevron grooves on left shoulder pylon
  for (let c = 0; c < 3; c++) {
    const yOff = (275 + c * 68) * s;
    carveNegativeSeam(
      ctx,
      [
        [34 * s, yOff + 18 * s],
        [124 * s, yOff - 12 * s],
        [218 * s, yOff + 22 * s],
      ],
      rng,
      { baseWidth: 3.8 * s }
    );
  }

  // Cross-contour edge hatching along left pylon outer spine
  carveCrossContourEdgeHatch(
    ctx,
    [172 * s, 98 * s],
    [265 * s, 420 * s],
    [-0.92, 0.25],
    14,
    18 * s,
    rng
  );

  recorder.captureStage(canvas, 0.14, 0.23, 'top-down');

  // 2. Right Shoulder Pylon (angled behind neck/jaw)
  const rightPylonPoly: Point2D[] = [
    [435 * s, 465 * s],
    [545 * s, 310 * s],
    [625 * s, 326 * s],
    [658 * s, 455 * s],
    [618 * s, 770 * s],
    [445 * s, 760 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, rightPylonPoly, rng, 3.8 * s, 5.8 * s);

  // Rounded-rectangle plate + chevron grooves on right pylon
  carveNegativeSeam(
    ctx,
    [
      [530 * s, 345 * s],
      [612 * s, 358 * s],
      [625 * s, 438 * s],
      [520 * s, 428 * s],
      [530 * s, 345 * s],
    ],
    rng,
    { baseWidth: 3.2 * s }
  );
  for (let c = 0; c < 3; c++) {
    const yOff = (475 + c * 58) * s;
    carveNegativeSeam(
      ctx,
      [
        [495 * s, yOff + 14 * s],
        [565 * s, yOff - 10 * s],
        [628 * s, yOff + 16 * s],
      ],
      rng,
      { baseWidth: 3.4 * s }
    );
  }

  recorder.captureStage(canvas, 0.23, 0.3, 'top-down');

  // 3. Neck Column & Chest Armor Plates (cropped at left and bottom edges)
  const chestAndNeckPoly: Point2D[] = [
    [0, 560 * s],
    [195 * s, 515 * s],
    [340 * s, 495 * s],
    [468 * s, 555 * s],
    [590 * s, 695 * s],
    [695 * s, 855 * s],
    [725 * s, 1024 * s],
    [0, 1024 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, chestAndNeckPoly, rng, 4.4 * s, 6.8 * s);

  // Biomechanical neck ribs (negative-space curved ribs)
  for (let r = 0; r < 4; r++) {
    const ry = (555 + r * 44) * s;
    carveNegativeSeam(
      ctx,
      [
        [215 * s, ry + 12 * s],
        [325 * s, ry - 6 * s],
        [435 * s, ry + 18 * s],
      ],
      rng,
      { baseWidth: 3.2 * s }
    );
  }

  // Prominent V-shaped collar & chest armor seam
  carveNegativeSeam(
    ctx,
    [
      [95 * s, 720 * s],
      [355 * s, 925 * s],
      [595 * s, 745 * s],
    ],
    rng,
    { baseWidth: 5.2 * s, doubleChance: 0.4 }
  );
  // Inner secondary V-seam & sternum vertical split
  carveNegativeSeam(
    ctx,
    [
      [165 * s, 775 * s],
      [355 * s, 968 * s],
      [535 * s, 805 * s],
    ],
    rng,
    { baseWidth: 3.4 * s }
  );
  carveNegativeSeam(
    ctx,
    [
      [355 * s, 925 * s],
      [358 * s, 1024 * s],
    ],
    rng,
    { baseWidth: 4.2 * s }
  );

  // Cross-contour hatching along chest/shoulder edge
  carveCrossContourEdgeHatch(
    ctx,
    [480 * s, 575 * s],
    [685 * s, 860 * s],
    [-0.8, 0.55],
    16,
    22 * s,
    rng
  );

  // Extra jagged dry-brush ink spikes along upper neck shadow
  fillRoughenedPolygon(
    ctx,
    [
      [220 * s, 515 * s],
      [380 * s, 505 * s],
      [360 * s, 560 * s],
    ],
    rng,
    THEME_COLORS.ink,
    3.5 * s
  );
  drawInkStroke(
    ctx,
    [
      [45 * s, 690 * s],
      [210 * s, 645 * s],
    ],
    rng,
    { baseWidth: 3.0 * s, color: THEME_COLORS.paper }
  );

  recorder.captureStage(canvas, 0.3, 0.38, 'bottom-up');
}
