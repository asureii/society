import type { Canvas2DContext } from '../../scene/art/inkBrush.ts';
import { createRng } from '../../scene/art/rng.ts';
import {
  carveCrossContourEdgeHatch,
  carveNegativeSeam,
  fillInkSilhouetteWithFringe,
  type AnyCanvas,
  type EvaDrawOrderRecorder,
} from './evaSurface.ts';
import { EVA_SKELETON, hToPx, polyHToPx, type PointH } from './skeleton.ts';

/**
 * 1. MUSCULAR NECK & SEGMENTED FACETED THROAT ARMOR (`neck`)
 * Matches the official Eva-01 bust reference artwork:
 * - Muscular neck leaning forward at ~42°
 * - Segmented faceted throat plates (the orange neck armor in reference) with crisp
 *   white negative-space seam lines
 * - Dorsal nape vertebrae contour connecting head to collar
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
  const sk = EVA_SKELETON;
  const s = W / 1024;

  ctx.clearRect(0, 0, W, H);

  const { joints } = sk;
  const { neckTop, neckBase, throatTop, throatBot, napeTop, napeBot } = joints;

  // 1. Muscular Neck Silhouette
  const neckPolyH: PointH[] = [
    // Throat top connection under jaw
    [throatTop[0], throatTop[1]],
    [throatTop[0] + 0.10, throatTop[1] + 0.16],
    // Front throat contour (the orange faceted plates)
    [throatBot[0] + 0.08, throatBot[1] - 0.16],
    [throatBot[0], throatBot[1]],
    // Collar connection at base
    [neckBase[0] + 0.08, neckBase[1] + 0.04],
    [napeBot[0], napeBot[1]],
    // Dorsal nape contour ascending to occipital cowl
    [napeBot[0] - 0.04, napeBot[1] - 0.18],
    [napeTop[0], napeTop[1]],
    [neckTop[0] - 0.12, neckTop[1]],
  ];

  fillInkSilhouetteWithFringe(ctx, polyHToPx(neckPolyH, W, sk), rng, 2.6 * s, 4.4 * s);

  // 2. Segmented Faceted Throat Armor Plates (the iconic orange chest/throat armor in reference)
  // Outer faceted plate boundaries
  const throatSeamOuterH: PointH[] = [
    [throatTop[0] - 0.02, throatTop[1] + 0.04],
    [throatTop[0] + 0.08, throatTop[1] + 0.18],
    [throatBot[0] + 0.06, throatBot[1] - 0.16],
    [throatBot[0] - 0.02, throatBot[1] - 0.02],
    [neckBase[0] + 0.10, neckBase[1] - 0.02],
    [throatTop[0] - 0.14, throatTop[1] + 0.22],
    [throatTop[0] - 0.02, throatTop[1] + 0.04],
  ];
  carveNegativeSeam(ctx, polyHToPx(throatSeamOuterH, W, sk), rng, {
    baseWidth: 2.8 * s,
    wobbleScale: 0.35,
  });

  // Vertical and horizontal faceted facet dividing seams
  const facetDividersH: PointH[][] = [
    // Central vertical dividing rib
    [
      [throatTop[0] + 0.04, throatTop[1] + 0.12],
      [throatBot[0] + 0.02, throatBot[1] - 0.08],
    ],
    // Upper horizontal facet cut
    [
      [throatTop[0] - 0.08, throatTop[1] + 0.18],
      [throatTop[0] + 0.06, throatTop[1] + 0.14],
    ],
    // Mid horizontal facet cut
    [
      [throatBot[0] - 0.10, throatBot[1] - 0.20],
      [throatBot[0] + 0.04, throatBot[1] - 0.16],
    ],
  ];
  for (const fd of facetDividersH) {
    carveNegativeSeam(ctx, polyHToPx(fd, W, sk), rng, {
      baseWidth: 2.2 * s,
      wobbleScale: 0.3,
    });
  }

  // 3. Dorsal Nape Vertebrae Seams (connecting to head cowl)
  const napeSeamsH: PointH[][] = [
    [
      [napeTop[0] + 0.04, napeTop[1] + 0.08],
      [napeTop[0] + 0.18, napeTop[1] + 0.12],
    ],
    [
      [napeTop[0] - 0.02, napeTop[1] + 0.20],
      [napeTop[0] + 0.14, napeTop[1] + 0.24],
    ],
    [
      [napeBot[0] + 0.02, napeBot[1] - 0.12],
      [napeBot[0] + 0.16, napeBot[1] - 0.08],
    ],
  ];
  for (const ns of napeSeamsH) {
    carveNegativeSeam(ctx, polyHToPx(ns, W, sk), rng, {
      baseWidth: 2.0 * s,
      wobbleScale: 0.3,
    });
  }

  // Cross-contour hatching on throat plate edge
  carveCrossContourEdgeHatch(
    ctx,
    hToPx([throatTop[0] + 0.06, throatTop[1] + 0.20], W, sk),
    hToPx([throatBot[0] + 0.06, throatBot[1] - 0.14], W, sk),
    [-0.92, -0.38],
    7,
    9.0 * s,
    rng
  );

  recorder?.captureStage(canvas, 0.22, 0.32, 'bottom-up');
}

/**
 * 2. UPPER CHEST & COLLAR RIM (`torso`)
 * Matches the bust reference: collar rim, upper pectoral plates, and shoulder collar mount
 * cropped cleanly at the bottom and left edges. NO arms, NO legs, NO full body.
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
  const sk = EVA_SKELETON;
  const s = W / 1024;

  ctx.clearRect(0, 0, W, H);

  const { joints } = sk;
  const { throatBot, neckBase, napeBot, collarCenter } = joints;
  const cropY = sk.canvasSizeH;

  // Upper chest / collar silhouette bleeding off left and bottom
  const chestPolyH: PointH[] = [
    // Collar front under throat armor
    [throatBot[0], throatBot[1]],
    [collarCenter[0] + 0.28, collarCenter[1]],
    [collarCenter[0] + 0.36, collarCenter[1] + 0.22],
    // Front pectoral plate contour descending to bottom crop
    [collarCenter[0] + 0.24, cropY],
    // Bottom crop bleed to left
    [0.0, cropY],
    // Left crop bleed ascending to rear shoulder / trapezius
    [0.0, napeBot[1] + 0.10],
    [napeBot[0] - 0.18, napeBot[1] + 0.04],
    [napeBot[0], napeBot[1]],
    [neckBase[0] + 0.04, neckBase[1] + 0.08],
  ];

  fillInkSilhouetteWithFringe(ctx, polyHToPx(chestPolyH, W, sk), rng, 3.0 * s, 5.0 * s);

  // Iconic Collar Bone Armor Rim (white negative space)
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [napeBot[0] - 0.10, napeBot[1] + 0.08],
        [neckBase[0] + 0.04, neckBase[1] + 0.14],
        [collarCenter[0] + 0.28, collarCenter[1] + 0.02],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 3.2 * s, wobbleScale: 0.4 }
  );

  // Upper pectoral chevron groove (the green/black chevron in reference)
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [collarCenter[0] - 0.14, collarCenter[1] + 0.16],
        [collarCenter[0] + 0.10, collarCenter[1] + 0.30],
        [collarCenter[0] + 0.32, collarCenter[1] + 0.20],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.6 * s, wobbleScale: 0.35 }
  );

  // Rear shoulder / collar pylon mounting plate seam at left
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [napeBot[0] - 0.14, napeBot[1] + 0.14],
        [napeBot[0] - 0.22, napeBot[1] + 0.38],
        [0.05, napeBot[1] + 0.44],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.4 * s, wobbleScale: 0.35 }
  );

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
