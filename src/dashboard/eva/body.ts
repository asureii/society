import { THEME_COLORS } from '../../config/theme.ts';
import {
  drawInkDot,
  drawInkStroke,
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
import { EVA_SKELETON, hToPx, polyHToPx, type PointH } from './skeleton.ts';

/**
 * 1. MUSCULAR NECK, DARK MESH & BRIGHT CURVED CHEST PLATE (`neck`)
 * Matches official bust reference artwork translated into dashboard palette:
 * - Dark fine-dot mesh texture in the throat recess between jaw and chest plate
 * - Bright paper-white curved chest plate (orange plate in ref) with heavy black outlines
 * - 2-3 parallel black groove lines following the smooth convex sweep of the plate
 * - Segmented cervical vertebrae plates along the dorsal nape
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
  const { neckTop, neckBase, throatTop, throatBot, napeTop, napeBot, jawThroatJunction } = joints;

  // ---------------------------------------------------------------------------
  // A. SLENDER ELONGATED MECHANICAL NECK SILHOUETTE (solid black ink base)
  // ---------------------------------------------------------------------------
  const neckPolyH: PointH[] = [
    // Throat connection under jaw
    [jawThroatJunction[0], jawThroatJunction[1]],
    [throatTop[0], throatTop[1]],
    // Slender forward curve of the chest armor
    [throatTop[0] + 0.12, throatTop[1] + 0.12],
    [throatTop[0] + 0.16, throatTop[1] + 0.24],
    [throatBot[0] + 0.04, throatBot[1] - 0.10],
    [throatBot[0], throatBot[1]],
    // Collar connection at base
    [neckBase[0] + 0.08, neckBase[1] + 0.02],
    [napeBot[0], napeBot[1]],
    // Stepped dorsal vertebrae ascending to helmet cowl
    [napeBot[0] - 0.04, napeBot[1] - 0.14],
    [napeTop[0] - 0.02, napeTop[1] + 0.08],
    [napeTop[0], napeTop[1]],
    [neckTop[0] - 0.04, neckTop[1]],
  ];

  fillInkSilhouetteWithFringe(ctx, polyHToPx(neckPolyH, W, sk), rng, 2.0 * s, 3.4 * s);

  // ---------------------------------------------------------------------------
  // B. DARK MESH / FINE-DOT STIPPLE IN THROAT RECESS
  // Between the jaw underside and the bright chest plate
  // ---------------------------------------------------------------------------
  const meshX0 = Math.round(hToPx([neckTop[0] - 0.06, 0], W, sk)[0]);
  const meshX1 = Math.round(hToPx([throatTop[0] + 0.04, 0], W, sk)[0]);
  const meshY0 = Math.round(hToPx([0, neckTop[1] + 0.04], W, sk)[1]);
  const meshY1 = Math.round(hToPx([0, throatTop[1] + 0.12], W, sk)[1]);
  const dotStep = Math.max(5, Math.round(5.5 * s));

  for (let py = meshY0; py <= meshY1; py += dotStep) {
    const rowOffset = ((py / dotStep) % 2) * (dotStep * 0.5);
    for (let px = meshX0 + rowOffset; px <= meshX1; px += dotStep) {
      // Check if point falls within the throat recess polygon
      const u = (px / W) * sk.canvasSizeH;
      const v = (py / H) * sk.canvasSizeH;
      if (
        u >= neckTop[0] - 0.06 &&
        u <= throatTop[0] + 0.04 &&
        v >= neckTop[1] + 0.04 &&
        v <= throatTop[1] + 0.12
      ) {
        drawInkDot(ctx, px, py, 1.4 * s, rng, THEME_COLORS.paperPure);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // C. SLENDER BRIGHT WHITE CHEST PLATE (Orange plate in ref -> Paper White)
  // Aerodynamic curved plate with heavy black outline and parallel black grooves
  // ---------------------------------------------------------------------------
  const chestPlatePolyH: PointH[] = [
    // Top inner corner under throat mesh
    [throatTop[0] - 0.02, throatTop[1] + 0.04],
    // Slender convex curve forward
    [throatTop[0] + 0.10, throatTop[1] + 0.12],
    [throatTop[0] + 0.14, throatTop[1] + 0.24],
    [throatBot[0] + 0.02, throatBot[1] - 0.10],
    // Lower front tip
    [throatBot[0] - 0.02, throatBot[1] - 0.02],
    // Inner contour along collar
    [neckBase[0] + 0.12, neckBase[1] - 0.04],
    [neckBase[0] + 0.04, neckBase[1] - 0.16],
    [throatTop[0] - 0.08, throatTop[1] + 0.18],
  ];

  // Fill plate with bright paper pure (#FAFAF8)
  fillRoughenedPolygon(
    ctx,
    polyHToPx(chestPlatePolyH, W, sk),
    rng,
    THEME_COLORS.paperPure,
    1.0 * s
  );

  // Heavy black outline surrounding the bright chest plate
  const chestPlatePx = polyHToPx(chestPlatePolyH, W, sk);
  drawInkStroke(ctx, [...chestPlatePx, chestPlatePx[0]], rng, {
    baseWidth: 3.0 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.2,
  });

  // ---------------------------------------------------------------------------
  // D. PARALLEL BLACK GROOVE LINES FOLLOWING THE CURVE OF THE CHEST PLATE
  // ---------------------------------------------------------------------------
  const groove1H: PointH[] = [
    [throatTop[0] + 0.06, throatTop[1] + 0.10],
    [throatTop[0] + 0.10, throatTop[1] + 0.20],
    [throatBot[0] - 0.02, throatBot[1] - 0.12],
    [throatBot[0] - 0.04, throatBot[1] - 0.06],
  ];
  const groove2H: PointH[] = [
    [throatTop[0], throatTop[1] + 0.14],
    [throatTop[0] + 0.04, throatTop[1] + 0.24],
    [throatBot[0] - 0.06, throatBot[1] - 0.10],
    [throatBot[0] - 0.08, throatBot[1] - 0.04],
  ];
  const groove3H: PointH[] = [
    [throatTop[0] - 0.06, throatTop[1] + 0.18],
    [throatTop[0] - 0.02, throatTop[1] + 0.28],
    [neckBase[0] + 0.08, neckBase[1] - 0.10],
    [neckBase[0] + 0.06, neckBase[1] - 0.04],
  ];
  drawInkStroke(ctx, polyHToPx(groove1H, W, sk), rng, {
    baseWidth: 2.0 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.15,
  });
  drawInkStroke(ctx, polyHToPx(groove2H, W, sk), rng, {
    baseWidth: 1.8 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.15,
  });
  drawInkStroke(ctx, polyHToPx(groove3H, W, sk), rng, {
    baseWidth: 1.6 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.15,
  });

  // Facet division line across lower chest plate
  drawInkStroke(
    ctx,
    polyHToPx(
      [
        [throatTop[0] - 0.06, throatTop[1] + 0.22],
        [throatTop[0] + 0.10, throatTop[1] + 0.18],
      ],
      W,
      sk
    ),
    rng,
    {
      baseWidth: 2.0 * s,
      color: THEME_COLORS.ink,
      wobbleScale: 0.15,
      doubleChance: 0,
      breakChance: 0,
      imperfectJoin: false,
    }
  );

  // ---------------------------------------------------------------------------
  // E. DORSAL NAPE VERTEBRAE PLATES (4 segmented plates)
  // ---------------------------------------------------------------------------
  const napeSeamsH: PointH[][] = [
    [
      [napeTop[0] + 0.02, napeTop[1] + 0.06],
      [napeTop[0] + 0.16, napeTop[1] + 0.10],
    ],
    [
      [napeTop[0] - 0.02, napeTop[1] + 0.18],
      [napeTop[0] + 0.14, napeTop[1] + 0.22],
    ],
    [
      [napeBot[0] + 0.04, napeBot[1] - 0.12],
      [napeBot[0] + 0.18, napeBot[1] - 0.08],
    ],
    // Diagonal biomechanical cervical panel seams on black neck core
    [
      [napeTop[0] + 0.04, napeTop[1] + 0.14],
      [throatTop[0] - 0.14, throatTop[1] + 0.10],
    ],
    [
      [napeBot[0] + 0.02, napeBot[1] - 0.14],
      [neckBase[0] + 0.06, neckBase[1] - 0.10],
    ],
  ];
  for (const ns of napeSeamsH) {
    carveNegativeSeam(ctx, polyHToPx(ns, W, sk), rng, {
      baseWidth: 2.0 * s,
      wobbleScale: 0.25,
    });
  }

  recorder?.captureStage(canvas, 0.22, 0.32, 'bottom-up');
}

/**
 * 2. UPPER CHEST & CHUNKY SEGMENTED COLLAR ARMOR (`torso`)
 * Matches the bust reference: collar rim, pectoral plates, and shoulder mount
 * cropped cleanly at the bottom and left edges.
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

  fillInkSilhouetteWithFringe(ctx, polyHToPx(chestPolyH, W, sk), rng, 2.4 * s, 4.2 * s);

  // Chunky collar armor rim (white negative space)
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
    { baseWidth: 3.0 * s, wobbleScale: 0.3 }
  );

  // Upper pectoral chevron groove (the green/red chevron in reference)
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
    { baseWidth: 2.6 * s, wobbleScale: 0.25 }
  );

  // Red accent notch at the collar chevron point (green accent in ref -> red)
  const redNotchCenter = hToPx([collarCenter[0] + 0.10, collarCenter[1] + 0.30], W, sk);
  drawInkDot(ctx, redNotchCenter[0], redNotchCenter[1], 4.5 * s, rng, THEME_COLORS.red);

  // Rear shoulder collar pylon mounting plate seam at left
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
    { baseWidth: 2.4 * s, wobbleScale: 0.25 }
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
