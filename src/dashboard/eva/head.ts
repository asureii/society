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
 * Draws the Eva-01 `head` layer (1024x1024 transparent canvas, pivot at neck base):
 * - Helmet-like cranium leaning forward and slightly toward the viewer
 * - Single long blade horn rising from top-left (`(275, 38)`) with white seam grooves
 * - Angular brow and cheek armor plates with negative-space seam lines
 * - Splayed upper jaw restraint flange ripped outward
 * - Upper row of 9 large jagged white negative-space teeth along the upper maxilla
 * Draw-order range: `0.38 .. 0.66` (head & horn), `0.82 .. 0.92` (upper jagged teeth)
 */
export function drawEvaHeadLayer(
  ctx: Canvas2DContext,
  canvas: AnyCanvas,
  recorder: EvaDrawOrderRecorder,
  seed = 719
): void {
  const W = canvas.width;
  const H = canvas.height;
  const rng = createRng(seed);
  const s = W / 1024;

  ctx.clearRect(0, 0, W, H);

  // 1. Single Blade Horn rising sharply from top-left of brow
  const hornPoly: Point2D[] = [
    [358 * s, 255 * s],
    [292 * s, 118 * s],
    [274 * s, 36 * s],
    [318 * s, 58 * s],
    [418 * s, 165 * s],
    [486 * s, 262 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, hornPoly, rng, 3.6 * s, 5.8 * s);

  // Secondary rear occipital crest fin
  const rearFinPoly: Point2D[] = [
    [225 * s, 255 * s],
    [152 * s, 152 * s],
    [195 * s, 138 * s],
    [298 * s, 228 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, rearFinPoly, rng, 3.4 * s, 5.2 * s);

  // White negative-space seam lines & band notches on the horn
  carveNegativeSeam(
    ctx,
    [
      [302 * s, 82 * s],
      [372 * s, 185 * s],
      [435 * s, 248 * s],
    ],
    rng,
    { baseWidth: 2.8 * s }
  );
  carveNegativeSeam(
    ctx,
    [
      [318 * s, 146 * s],
      [388 * s, 132 * s],
    ],
    rng,
    { baseWidth: 3.2 * s }
  );
  carveNegativeSeam(
    ctx,
    [
      [345 * s, 198 * s],
      [432 * s, 182 * s],
    ],
    rng,
    { baseWidth: 3.4 * s }
  );

  // Ink drip off the horn tip
  drawInkStroke(
    ctx,
    [
      [278 * s, 44 * s],
      [275 * s, 96 * s],
      [273 * s, 134 * s],
    ],
    rng,
    { baseWidth: 3.4 * s, color: THEME_COLORS.ink, taperScale: 1.25 }
  );

  recorder.captureStage(canvas, 0.38, 0.48, 'top-down');

  // 2. Main Forward-Leaning Helmet Cranium, Brow Plate, Snout, and Splayed Cheek Armor
  const headPoly: Point2D[] = [
    [182 * s, 325 * s],
    [228 * s, 222 * s],
    [358 * s, 198 * s],
    [515 * s, 224 * s],
    [668 * s, 282 * s],
    [796 * s, 355 * s],
    [824 * s, 398 * s],
    [786 * s, 438 * s],
    [645 * s, 446 * s],
    [522 * s, 458 * s],
    // Splayed, ripped-open upper cheek/mandible restraint wing
    [575 * s, 508 * s],
    [488 * s, 535 * s],
    [418 * s, 512 * s],
    [325 * s, 538 * s],
    [228 * s, 468 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, headPoly, rng, 4.4 * s, 6.8 * s);

  // Angular brow & cheek armor seam cracks (white negative space)
  carveNegativeSeam(
    ctx,
    [
      [245 * s, 278 * s],
      [428 * s, 258 * s],
      [615 * s, 304 * s],
      [782 * s, 376 * s],
    ],
    rng,
    { baseWidth: 3.6 * s }
  );
  // Cheekbone angular armor plate boundary
  carveNegativeSeam(
    ctx,
    [
      [318 * s, 382 * s],
      [468 * s, 368 * s],
      [545 * s, 418 * s],
      [758 * s, 408 * s],
    ],
    rng,
    { baseWidth: 3.8 * s }
  );
  // Splayed mandible restraint wing seam
  carveNegativeSeam(
    ctx,
    [
      [355 * s, 442 * s],
      [468 * s, 435 * s],
      [548 * s, 502 * s],
    ],
    rng,
    { baseWidth: 3.5 * s }
  );
  // Snout/nasal bridge vent slits
  for (let v = 0; v < 3; v++) {
    const vx = (705 + v * 26) * s;
    const vy = (332 + v * 15) * s;
    carveNegativeSeam(
      ctx,
      [
        [vx, vy],
        [vx - 16 * s, vy + 22 * s],
      ],
      rng,
      { baseWidth: 3.0 * s }
    );
  }

  // Cross-contour hatching along cranium & brow ridge for sculptural volume
  carveCrossContourEdgeHatch(
    ctx,
    [245 * s, 224 * s],
    [655 * s, 282 * s],
    [-0.18, 0.96],
    18,
    19 * s,
    rng
  );
  carveCrossContourEdgeHatch(
    ctx,
    [195 * s, 330 * s],
    [320 * s, 520 * s],
    [0.88, -0.35],
    10,
    16 * s,
    rng
  );

  drawInkSpatterCluster(ctx, 765 * s, 345 * s, 48 * s, 12, rng);

  recorder.captureStage(canvas, 0.48, 0.66, 'left-right');

  // 3. Upper Row of Large Jagged Teeth (White negative space hanging from upper jaw)
  // Recorded in [0.82, 0.92] so teeth appear last alongside the jaw during load animation!
  const toothCount = 8;
  const startX = 528 * s;
  const endX = 772 * s;
  const stepX = (endX - startX) / toothCount;

  // Upper gum/mouth cavity edge line
  carveNegativeSeam(
    ctx,
    [
      [498 * s, 454 * s],
      [645 * s, 442 * s],
      [780 * s, 428 * s],
    ],
    rng,
    { baseWidth: 3.2 * s }
  );

  for (let i = 0; i < toothCount; i++) {
    const tx0 = startX + i * stepX + 2 * s;
    const tx1 = startX + (i + 1) * stepX - 2 * s;
    const tMid = (tx0 + tx1) * 0.5;
    const gumY = (448 - i * 2.2) * s;
    // Canine/fang teeth near the front and middle are extra long and jagged
    const lenBoost = i === 1 || i === 5 || i === 6 ? 1.28 : 1.0;
    const toothLen = rng.range(38, 52) * lenBoost * s;

    const toothPoly: Point2D[] = [
      [tx0, gumY],
      [tx1, gumY - 1.5 * s],
      [tx1 - 3 * s, gumY + toothLen * 0.65],
      [tMid + rng.range(-3, 4) * s, gumY + toothLen],
      [tx0 + 3 * s, gumY + toothLen * 0.7],
    ];

    // Fill tooth interior with pure paper negative space, then outline and striate in ink
    fillRoughenedPolygon(ctx, toothPoly, rng, THEME_COLORS.paper, 1.8 * s);
    drawInkStroke(
      ctx,
      [
        [tx0, gumY],
        [tMid, gumY + toothLen],
        [tx1, gumY],
      ],
      rng,
      { baseWidth: 2.6 * s, color: THEME_COLORS.ink, wobbleScale: 0.85 }
    );
    // Vertical enamel root striation
    drawInkStroke(
      ctx,
      [
        [tMid, gumY + 3 * s],
        [tMid + 1 * s, gumY + toothLen * 0.55],
      ],
      rng,
      { baseWidth: 1.5 * s, color: THEME_COLORS.ink, wobbleScale: 0.6 }
    );
  }

  recorder.captureStage(canvas, 0.82, 0.92, 'left-right');
}
