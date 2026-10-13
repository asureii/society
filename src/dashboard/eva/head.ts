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
 * Draws the Eva-01 `head` layer (1024x1024 transparent canvas, pivot at neck base `(355, 385)`):
 * Faithfully matches the reference Eva-01 Berserk silhouette & helmet proportions:
 * - Hyper-elongated, needle-sharp horn erupting from the front of the brow (`(545..594, 242)`)
 *   and shooting forward-up past the snout to `(754, 24)`, with the small step-barb at `(542, 206)`
 *   and the long vertical ink drip hanging straight down in front of the snout (`x = 678, y = 108..236`).
 * - Parallel foreground armored horn (`(456, 258) -> (552, 128)`) etched with crisp white negative-space seams.
 * - Sleek, low cranial dome sweeping back to the occipital overhang (`(252, 294)`) and solid black throat column
 *   (`x = 328..515, y = 335..465`) so there is zero white gap behind the jaw hinge!
 * - Short, brutal upper snout (`(638, 276) -> (626, 338)`) directly beneath the horn base, with gnarled
 *   downward fangs (`x = 538..624`) and a viscous flared vertical black saliva/ink column (`x = 576`).
 * Draw-order range: `0.38 .. 0.66` (horn & cranium), `0.82 .. 0.92` (upper fangs & mouth strand)
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

  // 1. Single Iconic Hyper-Elongated Berserk Razor Horn at the front brow -> (754, 24)
  const berserkHornPoly: Point2D[] = [
    [504 * s, 242 * s],
    [538 * s, 208 * s],
    // Signature small rear step-barb near base of horn
    [526 * s, 198 * s],
    [626 * s, 114 * s],
    [714 * s, 46 * s],
    [754 * s, 24 * s],
    [732 * s, 56 * s],
    [666 * s, 134 * s],
    [592 * s, 248 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, berserkHornPoly, rng, 2.4 * s, 4.2 * s);

  // Subtle white negative-space armor edge along the lower-rear base of the horn
  carveNegativeSeam(
    ctx,
    [
      [514 * s, 236 * s],
      [564 * s, 186 * s],
      [618 * s, 136 * s],
    ],
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.45 }
  );

  // Iconic long vertical ink drip hanging straight down from the horn underside in front of the snout
  drawInkStroke(
    ctx,
    [
      [678 * s, 108 * s],
      [678 * s, 174 * s],
      [677 * s, 236 * s],
    ],
    rng,
    { baseWidth: 2.8 * s, color: THEME_COLORS.ink, taperScale: 1.4, wobbleScale: 0.35 }
  );
  drawInkDot(ctx, 677 * s, 244 * s, 2.2 * s, rng, THEME_COLORS.ink);

  recorder.captureStage(canvas, 0.38, 0.48, 'top-down');

  // 2. Sleek, Low Cranial Dome, Short Snub Snout & Solid Black Throat Column (zero gap behind jaw!)
  const craniumSnoutThroatPoly: Point2D[] = [
    // Swept-back rear occipital fin tip
    [252 * s, 294 * s],
    [282 * s, 266 * s],
    [348 * s, 236 * s],
    [436 * s, 224 * s],
    [522 * s, 234 * s],
    // Front brow directly under the horn base -> short, brutal upper snout
    [592 * s, 246 * s],
    [622 * s, 262 * s],
    [642 * s, 282 * s],
    [636 * s, 314 * s],
    [626 * s, 342 * s],
    // Upper maxilla receding to deep solid throat column at x = 508
    [578 * s, 346 * s],
    [526 * s, 348 * s],
    [506 * s, 376 * s],
    [508 * s, 438 * s],
    [486 * s, 478 * s],
    // Solid throat base overlapping neck & jaw hinge (eliminates any white gap!)
    [332 * s, 474 * s],
    [314 * s, 404 * s],
    // Swept-back lateral helmet cheek/ear wing
    [214 * s, 386 * s],
    [258 * s, 362 * s],
    [308 * s, 348 * s],
    // Stepped rear occipital notch
    [264 * s, 322 * s],
    [286 * s, 308 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, craniumSnoutThroatPoly, rng, 3.4 * s, 5.2 * s);

  // Swept-back lateral helmet cheek/ear wing fin (kept below the eye socket so the glowing white eye sits in pure black ink!)
  carveNegativeSeam(
    ctx,
    [
      [226 * s, 382 * s],
      [326 * s, 368 * s],
      [432 * s, 362 * s],
    ],
    rng,
    { baseWidth: 2.8 * s, wobbleScale: 0.55 }
  );

  // Cross-contour hatching along the upper cranium dome
  carveCrossContourEdgeHatch(
    ctx,
    [315 * s, 242 * s],
    [515 * s, 234 * s],
    [0.08, 0.98],
    10,
    12 * s,
    rng
  );

  recorder.captureStage(canvas, 0.48, 0.66, 'left-right');

  // 4. Gnarled Downward Upper Fangs & Flared Viscous Vertical Saliva/Ink Column
  // Recorded in [0.82, 0.92] so fangs & jaw appear last before the eye flash!
  const upperFangPolys: Point2D[][] = [
    // Rear molar projection
    [
      [528 * s, 344 * s],
      [548 * s, 344 * s],
      [538 * s, 368 * s],
    ],
    // Mid fang (connected to the vertical saliva strand)
    [
      [554 * s, 342 * s],
      [584 * s, 342 * s],
      [576 * s, 382 * s],
      [564 * s, 372 * s],
    ],
    // Front canine fang
    [
      [588 * s, 340 * s],
      [612 * s, 338 * s],
      [602 * s, 376 * s],
    ],
    // Snout tip incisor barb
    [
      [612 * s, 338 * s],
      [626 * s, 336 * s],
      [622 * s, 364 * s],
    ],
  ];

  for (const poly of upperFangPolys) {
    fillRoughenedPolygon(ctx, poly, rng, THEME_COLORS.ink, 1.4 * s);
  }

  // Subtle white upper tooth enamel edge on the foreground jaw
  carveNegativeSeam(
    ctx,
    [
      [522 * s, 342 * s],
      [574 * s, 340 * s],
      [618 * s, 336 * s],
    ],
    rng,
    { baseWidth: 2.4 * s }
  );

  // Iconic Viscous Vertical Saliva/Ink Column bridging the open maw at x = 576 (flared web at top & bottom)
  const salivaWebTop: Point2D[] = [
    [564 * s, 362 * s],
    [586 * s, 362 * s],
    [578 * s, 398 * s],
    [573 * s, 398 * s],
  ];
  fillRoughenedPolygon(ctx, salivaWebTop, rng, THEME_COLORS.ink, 1.0 * s);
  drawInkStroke(
    ctx,
    [
      [576 * s, 364 * s],
      [575 * s, 424 * s],
      [576 * s, 488 * s],
    ],
    rng,
    { baseWidth: 3.6 * s, color: THEME_COLORS.ink, wobbleScale: 0.4, taperScale: 1.05 }
  );

  recorder.captureStage(canvas, 0.82, 0.92, 'left-right');
}
