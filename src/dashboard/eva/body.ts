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
 * Draws the Eva-01 `body/shoulders` layer (1024x1024 transparent canvas):
 * Faithfully matches the hunched Berserk Eva-01 posture & biomechanical armor from the reference artwork:
 * - Tall, swept-back Shoulder Restraint Pylons (`(158, 342)` peak and rear shadow pylon `(24, 535)`)
 *   with the iconic triangular white negative-space shoulder armor plate + circular black port dot.
 * - Continuous solid neck & upper back (`(245..455, 345..520)`) connecting seamlessly to the head/jaw.
 * - Arched hunched back with the 3 curved white negative-space dorsal spine / entry-plug vertebrae fins.
 * - Barrel-shaped segmented pectoral chest armor plates, sub-pectoral core dome, and narrow wasp-like waist.
 * - Slender, tapered forearms (with pointed elbow spurs and elongated white forearm blade fins) reaching
 *   forward into separated, articulated, hooked Berserk claw fingers!
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

  // 1. Tall Swept-Back Shoulder Restraint Pylons & Looming Rear Shadow Pylon Block
  const rearShadowPylonPoly: Point2D[] = [
    [22 * s, 538 * s],
    [72 * s, 446 * s],
    [132 * s, 468 * s],
    [168 * s, 396 * s],
    [156 * s, 340 * s],
    [252 * s, 376 * s],
    [328 * s, 438 * s],
    [298 * s, 588 * s],
    [122 * s, 688 * s],
    [62 * s, 638 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, rearShadowPylonPoly, rng, 3.4 * s, 5.2 * s);

  recorder.captureStage(canvas, 0.14, 0.21, 'top-down');

  // 2. Continuous Neck, Barrel Pectoral Chest Armor, Core & Wasp Waist
  // Leaves 100% open white paper at x > 435, y = 525..780 beneath the extended jaw & vertical drips!
  const torsoAndNeckPoly: Point2D[] = [
    [255 * s, 355 * s],
    [445 * s, 395 * s],
    [432 * s, 516 * s],
    // Barrel-shaped pectoral chest armor front contour
    [428 * s, 578 * s],
    [406 * s, 636 * s],
    // Sub-pectoral chest core dome & sharp inward taper to narrow waist
    [368 * s, 672 * s],
    [328 * s, 728 * s],
    [316 * s, 812 * s],
    // Lower hip / thigh armor extending to bottom edge
    [376 * s, 935 * s],
    [412 * s, 1024 * s],
    [78 * s, 1024 * s],
    // Arched lower back & dorsal contour
    [68 * s, 895 * s],
    [98 * s, 755 * s],
    [132 * s, 615 * s],
    [208 * s, 455 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, torsoAndNeckPoly, rng, 3.6 * s, 5.4 * s);

  // Iconic White Negative-Space Triangular Shoulder Armor Fin Plate + Black Port Dot (drawn over combined shoulder/torso so it is never clipped!)
  const whiteShoulderPlate: Point2D[] = [
    [156 * s, 424 * s],
    [236 * s, 406 * s],
    [216 * s, 514 * s],
    [176 * s, 536 * s],
    [162 * s, 488 * s],
  ];
  fillRoughenedPolygon(ctx, whiteShoulderPlate, rng, THEME_COLORS.paper, 1.6 * s);
  drawInkStroke(
    ctx,
    [...whiteShoulderPlate, whiteShoulderPlate[0]],
    rng,
    { baseWidth: 2.6 * s, color: THEME_COLORS.ink, wobbleScale: 0.65 }
  );
  drawInkDot(ctx, 192 * s, 488 * s, 7.8 * s, rng, THEME_COLORS.ink);

  // Stepped outer shoulder pylon fin seam lines
  carveNegativeSeam(
    ctx,
    [
      [162 * s, 350 * s],
      [242 * s, 384 * s],
      [304 * s, 444 * s],
    ],
    rng,
    { baseWidth: 2.8 * s, wobbleScale: 0.55 }
  );

  // 3 Curved White Negative-Space Dorsal Spine / Entry-Plug Vertebrae Fins down the arched back
  const dorsalFins: Array<[number, number, number, number]> = [
    [146, 562, 26, 44],
    [136, 624, 28, 46],
    [120, 688, 30, 48],
  ];
  for (const [fx, fy, fw, fh] of dorsalFins) {
    const finPoly: Point2D[] = [
      [fx * s, (fy + fh * 0.25) * s],
      [(fx + fw) * s, fy * s],
      [(fx + fw + 4) * s, (fy + fh * 0.75) * s],
      [(fx + 4) * s, (fy + fh) * s],
    ];
    fillRoughenedPolygon(ctx, finPoly, rng, THEME_COLORS.paper, 1.4 * s);
    drawInkStroke(
      ctx,
      [...finPoly, finPoly[0]],
      rng,
      { baseWidth: 2.2 * s, color: THEME_COLORS.ink, wobbleScale: 0.6 }
    );
  }

  // Segmented Pectoral Chest Armor Plates (white negative-space curved ribs & sternum plate)
  carveNegativeSeam(
    ctx,
    [
      [268 * s, 502 * s],
      [338 * s, 492 * s],
      [412 * s, 532 * s],
      [414 * s, 594 * s],
      [352 * s, 634 * s],
      [284 * s, 606 * s],
      [268 * s, 502 * s],
    ],
    rng,
    { baseWidth: 3.0 * s, wobbleScale: 0.55 }
  );
  for (let p = 0; p < 2; p++) {
    const py = (538 + p * 34) * s;
    carveNegativeSeam(
      ctx,
      [
        [278 * s, py - 4 * s],
        [346 * s, py + 10 * s],
        [408 * s, py + 2 * s],
      ],
      rng,
      { baseWidth: 2.3 * s }
    );
  }
  // Sub-pectoral hemispherical core dome seam
  carveNegativeSeam(
    ctx,
    [
      [312 * s, 626 * s],
      [356 * s, 658 * s],
      [396 * s, 636 * s],
    ],
    rng,
    { baseWidth: 2.8 * s }
  );

  // Bold white V-shaped pelvic/thigh armor chevron at bottom-left
  carveNegativeSeam(
    ctx,
    [
      [132 * s, 868 * s],
      [212 * s, 945 * s],
      [284 * s, 892 * s],
    ],
    rng,
    { baseWidth: 3.8 * s }
  );

  recorder.captureStage(canvas, 0.23, 0.31, 'top-down');

  // 3. Slender Tapered Forearms, Pointed Elbow Spur & Separated Hooked Berserk Claw Fingers
  // Main upper arm + tapered forearm reaching to a narrow wrist at (468, 848)
  const slenderArmPoly: Point2D[] = [
    [206 * s, 520 * s],
    [264 * s, 536 * s],
    [248 * s, 682 * s],
    // Narrow tapered forearm upper edge
    [368 * s, 774 * s],
    [468 * s, 832 * s],
    // Compact palm base
    [504 * s, 838 * s],
    [496 * s, 872 * s],
    [452 * s, 866 * s],
    // Tapered forearm lower edge sweeping back to pointed elbow spur at (172, 722)
    [338 * s, 808 * s],
    [208 * s, 738 * s],
    [172 * s, 722 * s],
    [186 * s, 648 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, slenderArmPoly, rng, 3.0 * s, 4.6 * s);

  // Secondary far forearm reaching slightly higher/forward to (515, 795)
  const farForearmPoly: Point2D[] = [
    [318 * s, 734 * s],
    [442 * s, 782 * s],
    [518 * s, 792 * s],
    [512 * s, 818 * s],
    [428 * s, 806 * s],
    [306 * s, 756 * s],
  ];
  fillInkSilhouetteWithFringe(ctx, farForearmPoly, rng, 2.6 * s, 4.2 * s);

  // Iconic elongated white negative-space forearm armor fin stripe
  const forearmFinPoly: Point2D[] = [
    [228 * s, 704 * s],
    [362 * s, 782 * s],
    [438 * s, 828 * s],
    [426 * s, 842 * s],
    [264 * s, 748 * s],
    [214 * s, 718 * s],
  ];
  fillRoughenedPolygon(ctx, forearmFinPoly, rng, THEME_COLORS.paper, 1.2 * s);
  drawInkStroke(
    ctx,
    [...forearmFinPoly, forearmFinPoly[0]],
    rng,
    { baseWidth: 2.2 * s, color: THEME_COLORS.ink, wobbleScale: 0.6 }
  );

  // Separated, Articulated, Hooked Berserk Claw Fingers (with open white space between fingers!)
  const hookedClawFingers: Point2D[][] = [
    // Far hand: upward-hooked thumb
    [
      [502 * s, 794 * s],
      [528 * s, 768 * s],
      [544 * s, 752 * s],
    ],
    // Far hand: 3 curled claw fingers
    [
      [514 * s, 798 * s],
      [554 * s, 786 * s],
      [576 * s, 766 * s],
      [566 * s, 754 * s],
    ],
    [
      [516 * s, 808 * s],
      [562 * s, 802 * s],
      [588 * s, 782 * s],
      [580 * s, 768 * s],
    ],
    [
      [512 * s, 818 * s],
      [556 * s, 818 * s],
      [582 * s, 802 * s],
    ],
    // Near hand: upward-angled thumb
    [
      [468 * s, 838 * s],
      [496 * s, 816 * s],
      [518 * s, 804 * s],
    ],
    // Near hand: 4 splayed, hooked Berserk claw fingers
    [
      [496 * s, 844 * s],
      [542 * s, 842 * s],
      [568 * s, 824 * s],
      [558 * s, 812 * s],
    ],
    [
      [498 * s, 854 * s],
      [548 * s, 858 * s],
      [576 * s, 844 * s],
      [568 * s, 832 * s],
    ],
    [
      [494 * s, 864 * s],
      [542 * s, 874 * s],
      [568 * s, 864 * s],
    ],
    [
      [484 * s, 870 * s],
      [526 * s, 888 * s],
      [548 * s, 882 * s],
    ],
  ];

  for (const fingerPts of hookedClawFingers) {
    drawInkStroke(ctx, fingerPts, rng, {
      baseWidth: 5.2 * s,
      color: THEME_COLORS.ink,
      wobbleScale: 0.55,
      taperScale: 1.35,
    });
  }

  // Cross-contour hatching along the lower back
  carveCrossContourEdgeHatch(
    ctx,
    [88 * s, 745 * s],
    [74 * s, 965 * s],
    [0.96, 0.15],
    10,
    14 * s,
    rng
  );

  recorder.captureStage(canvas, 0.31, 0.38, 'bottom-up');
}
