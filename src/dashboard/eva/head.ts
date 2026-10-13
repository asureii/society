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
 * Draws Eva-01 `head` layer matching official bust reference artwork:
 * - Forward-up 50° straight razor horn to top-right with beveled tip
 * - Sleek helmet crown + 3 tiers of swept-back rear occipital cowl fins
 * - Sloped brow visor ridge, cylindrical horizontal cheek intake pod, hexagonal cheek seams
 * - Short predatory upper snout with jagged downward upper teeth
 * - Solid black mouth interior cavity so teeth read boldly
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
  const sk = EVA_SKELETON;
  const s = W / 1024;

  ctx.clearRect(0, 0, W, H);

  const { joints } = sk;
  const { hornBase, hornTip, occipitalFinTop, occipitalFinMid, occipitalFinBot, snoutTip } =
    joints;

  // 1. Straight Razor Horn pointing forward-up at 55° to top-right
  const hdx = hornTip[0] - hornBase[0];
  const hdy = hornTip[1] - hornBase[1];
  const hLen = Math.hypot(hdx, hdy) || 1;
  const hnx = -hdy / hLen;
  const hny = hdx / hLen;
  const halfBase = EVA_PROPORTIONS.horn.baseWidthH * 0.5;

  const hornPolyH: PointH[] = [
    [hornBase[0] - hnx * halfBase * 0.85, hornBase[1] - hny * halfBase * 0.85],
    [hornBase[0] + hnx * halfBase * 0.85, hornBase[1] + hny * halfBase * 0.85],
    // Straight taper up to beveled tip
    [hornTip[0] + hnx * (halfBase * 0.28), hornTip[1] + hny * (halfBase * 0.28)],
    [hornTip[0] + 0.04, hornTip[1] - 0.02],
    [hornTip[0] - hnx * (halfBase * 0.24), hornTip[1] - hny * (halfBase * 0.24)],
  ];

  fillInkSilhouetteWithFringe(ctx, polyHToPx(hornPolyH, W, sk), rng, 2.0 * s, 3.8 * s);

  // Beveled horn segment seam (the green band in reference, placed at lower quarter)
  const bandDist = 0.22;
  const bandX = hornBase[0] + hdx * bandDist;
  const bandY = hornBase[1] + hdy * bandDist;
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [bandX - hnx * (halfBase * 0.75), bandY - hny * (halfBase * 0.75)],
        [bandX + hnx * (halfBase * 0.75), bandY + hny * (halfBase * 0.75)],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.6 * s, wobbleScale: 0.25 }
  );

  // Horn base mounting collar seam
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [hornBase[0] - hnx * halfBase * 0.80, hornBase[1] - hny * halfBase * 0.80],
        [hornBase[0] + hnx * halfBase * 0.80, hornBase[1] + hny * halfBase * 0.80],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.4 * s, wobbleScale: 0.3 }
  );

  recorder.captureStage(canvas, 0.42, 0.52, 'top-down');

  // 2. Helmet Silhouette matching reference:
  // Low crown + 3 multi-tiered swept-back rear cowl fins + brow visor ridge + snout
  const helmetPolyH: PointH[] = [
    // Top-most swept-back occipital fin
    [occipitalFinTop[0], occipitalFinTop[1]],
    [occipitalFinTop[0] + 0.28, occipitalFinTop[1] - 0.05],
    [joints.headTop[0], joints.headTop[1]],
    // Sloped crown down to brow ridge and horn base
    [hornBase[0] - 0.06, hornBase[1] + 0.02],
    [joints.browRidge[0], joints.browRidge[1]],
    [joints.browRidge[0] + 0.12, joints.browRidge[1] + 0.08],
    // Sharp predatory upper snout
    [snoutTip[0], snoutTip[1]],
    [snoutTip[0] - 0.04, snoutTip[1] + 0.08],
    // Mouth roof / solid black maw interior
    [joints.headCenter[0] + 0.18, snoutTip[1] + 0.10],
    [joints.jawHinge[0] + 0.08, joints.jawHinge[1]],
    [joints.neckTop[0] + 0.06, joints.neckTop[1]],
    // Lower swept-back occipital cowl fin
    [occipitalFinBot[0], occipitalFinBot[1]],
    [occipitalFinBot[0] + 0.20, occipitalFinBot[1] - 0.04],
    // Mid swept-back occipital cowl fin
    [occipitalFinMid[0], occipitalFinMid[1]],
    [occipitalFinMid[0] + 0.24, occipitalFinMid[1] - 0.05],
    // Notch between mid and top fin
    [occipitalFinTop[0] + 0.14, occipitalFinTop[1] + 0.06],
  ];

  fillInkSilhouetteWithFringe(ctx, polyHToPx(helmetPolyH, W, sk), rng, 2.2 * s, 4.0 * s);

  // 3. Multi-Tiered Swept Occipital Fin Seams (white negative space)
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [occipitalFinTop[0] + 0.08, occipitalFinTop[1] + 0.02],
        [occipitalFinTop[0] + 0.38, occipitalFinTop[1] + 0.02],
        [joints.headTop[0] + 0.04, joints.headTop[1] + 0.16],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.4 }
  );

  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [occipitalFinMid[0] + 0.06, occipitalFinMid[1] + 0.02],
        [occipitalFinMid[0] + 0.36, occipitalFinMid[1] + 0.04],
        [joints.headCenter[0] - 0.12, joints.headCenter[1] + 0.02],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.4 }
  );

  // 4. Cylindrical Horizontal Cheek Intake Pod (the green/red ear cylinder in reference)
  const pod = joints.cheekPod;
  const podPolyH: PointH[] = [
    [pod[0] - 0.16, pod[1] - 0.04],
    [pod[0] + 0.16, pod[1] - 0.04],
    [pod[0] + 0.18, pod[1]],
    [pod[0] + 0.16, pod[1] + 0.04],
    [pod[0] - 0.16, pod[1] + 0.04],
    [pod[0] - 0.18, pod[1]],
  ];
  const podPx = polyHToPx(podPolyH, W, sk);
  drawInkStroke(ctx, [...podPx, podPx[0]], rng, {
    baseWidth: 2.2 * s,
    color: THEME_COLORS.paper,
    wobbleScale: 0.35,
  });

  // Circular inner intake ports on cheek
  const port1Px = hToPx([pod[0] - 0.08, pod[1] - 0.12], W, sk);
  const port2Px = hToPx([pod[0] - 0.02, pod[1] - 0.10], W, sk);
  drawInkDot(ctx, port1Px[0], port1Px[1], 4.2 * s, rng, THEME_COLORS.paper);
  drawInkDot(ctx, port2Px[0], port2Px[1], 3.8 * s, rng, THEME_COLORS.paper);

  // 5. Hexagonal Cheek Plates below the pod (white negative space seams)
  const hexLinesH: PointH[][] = [
    [
      [pod[0] + 0.04, pod[1] + 0.06],
      [pod[0] + 0.12, pod[1] + 0.10],
      [pod[0] + 0.22, pod[1] + 0.08],
    ],
    [
      [pod[0] + 0.12, pod[1] + 0.10],
      [pod[0] + 0.10, pod[1] + 0.18],
      [pod[0] + 0.18, pod[1] + 0.22],
    ],
  ];
  for (const hl of hexLinesH) {
    carveNegativeSeam(ctx, polyHToPx(hl, W, sk), rng, {
      baseWidth: 1.8 * s,
      wobbleScale: 0.3,
    });
  }

  // Cross-contour hatching on rear occipital cowl
  carveCrossContourEdgeHatch(
    ctx,
    hToPx([occipitalFinTop[0] + 0.12, occipitalFinTop[1] + 0.02], W, sk),
    hToPx([joints.headTop[0], joints.headTop[1] + 0.02], W, sk),
    [0.1, 0.98],
    6,
    8.0 * s,
    rng
  );

  recorder.captureStage(canvas, 0.52, 0.68, 'left-right');

  // 6. Upper Jagged Teeth along upper jaw rim
  const toothStartX = joints.headCenter[0] + 0.22;
  const toothEndX = snoutTip[0] - 0.02;
  const toothY = snoutTip[1] + 0.08;
  const numTeeth = EVA_PROPORTIONS.head.upperTeethCount;
  const slotW = (toothEndX - toothStartX) / numTeeth;

  for (let i = 0; i < numTeeth; i++) {
    const tx0 = toothStartX + i * slotW + slotW * 0.08;
    const tx1 = toothStartX + (i + 1) * slotW - slotW * 0.08;
    const tMidX = (tx0 + tx1) * 0.5;
    const toothLenH = i === 1 || i === 4 ? 0.095 : 0.080;

    const toothPolyPx: Point2D[] = polyHToPx(
      [
        [tx0, toothY],
        [tx1, toothY],
        [tMidX, toothY + toothLenH],
      ],
      W,
      sk
    );
    fillRoughenedPolygon(ctx, toothPolyPx, rng, THEME_COLORS.paperPure, 0.7 * s);
  }

  recorder.captureStage(canvas, 0.82, 0.90, 'left-right');
}
