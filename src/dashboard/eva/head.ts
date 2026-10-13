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
  carveNegativeSeam,
  fillInkSilhouetteWithFringe,
  type AnyCanvas,
  type EvaDrawOrderRecorder,
} from './evaSurface.ts';
import { EVA_PROPORTIONS } from './proportions.ts';
import { EVA_SKELETON, hToPx, polyHToPx, type PointH } from './skeleton.ts';

/**
 * Draws Eva-01 `head` layer matching official bust reference artwork:
 * - Thick tapered horn rooted directly above the eye with red accent band at 1/3
 * - Stack of 3 diagonal swept-back helmet crest plates ending in sharp tips
 * - Continuous sloped face from brow to blunt beak-like chin tip with red chin cap
 * - Closed jaw with clean mechanical plate seams (zero teeth, zero serrations)
 * - Honeycomb hexagonal cell grid across cheek panel
 * - Side capsule vent with red border and white inset oval + 2 circular vent ports
 * - Heavy overhanging brow plate with 2 red slash marks above eye slit
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
  const {
    hornBase,
    hornTip,
    crestTopTip,
    crestBotTip,
    browRidge,
    snoutTip,
    chinTip,
    jawHinge,
    sideVent,
    neckTop,
    headTop,
  } = joints;

  // ---------------------------------------------------------------------------
  // 1. THICK TAPERED RAZOR HORN (sweeps up-forward at 56°, thick base, red band)
  // ---------------------------------------------------------------------------
  const hdx = hornTip[0] - hornBase[0];
  const hdy = hornTip[1] - hornBase[1];
  const hLen = Math.hypot(hdx, hdy) || 1;
  const hnx = -hdy / hLen;
  const hny = hdx / hLen;
  const halfBase = EVA_PROPORTIONS.horn.baseWidthH * 0.5; // 0.10H wide base

  const hornPolyH: PointH[] = [
    [hornBase[0] - hnx * halfBase * 0.90, hornBase[1] - hny * halfBase * 0.90],
    [hornBase[0] + hnx * halfBase * 0.90, hornBase[1] + hny * halfBase * 0.90],
    // Straight taper up to fine beveled point
    [hornTip[0] + hnx * (halfBase * 0.16), hornTip[1] + hny * (halfBase * 0.16)],
    [hornTip[0] + 0.035, hornTip[1] - 0.025],
    [hornTip[0] - hnx * (halfBase * 0.12), hornTip[1] - hny * (halfBase * 0.12)],
  ];

  fillInkSilhouetteWithFringe(ctx, polyHToPx(hornPolyH, W, sk), rng, 1.8 * s, 3.2 * s);

  // Horn base mounting collar seam (white negative space)
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [hornBase[0] - hnx * halfBase * 0.88, hornBase[1] - hny * halfBase * 0.88],
        [hornBase[0] + hnx * halfBase * 0.88, hornBase[1] + hny * halfBase * 0.88],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.6 * s, wobbleScale: 0.2 }
  );

  // Distinct red band segment ~1/3 of the way up the horn (the green band in reference)
  const bandDist0 = 0.29;
  const bandDist1 = 0.36;
  const b0x = hornBase[0] + hdx * bandDist0;
  const b0y = hornBase[1] + hdy * bandDist0;
  const b1x = hornBase[0] + hdx * bandDist1;
  const b1y = hornBase[1] + hdy * bandDist1;
  const bandWidthFrac = 1.0 - (bandDist0 + bandDist1) * 0.5 * 0.75;
  const bandHalfW = halfBase * bandWidthFrac;

  const bandPolyH: PointH[] = [
    [b0x - hnx * bandHalfW, b0y - hny * bandHalfW],
    [b0x + hnx * bandHalfW, b0y + hny * bandHalfW],
    [b1x + hnx * (bandHalfW * 0.92), b1y + hny * (bandHalfW * 0.92)],
    [b1x - hnx * (bandHalfW * 0.92), b1y - hny * (bandHalfW * 0.92)],
  ];
  fillRoughenedPolygon(ctx, polyHToPx(bandPolyH, W, sk), rng, THEME_COLORS.red, 0.6 * s);

  // Clean white negative seams framing the red band
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [b0x - hnx * (bandHalfW + 0.01), b0y - hny * (bandHalfW + 0.01)],
        [b0x + hnx * (bandHalfW + 0.01), b0y + hny * (bandHalfW + 0.01)],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.2 }
  );
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [b1x - hnx * (bandHalfW + 0.01), b1y - hny * (bandHalfW + 0.01)],
        [b1x + hnx * (bandHalfW + 0.01), b1y + hny * (bandHalfW + 0.01)],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.2 }
  );

  recorder.captureStage(canvas, 0.38, 0.48, 'top-down');

  // ---------------------------------------------------------------------------
  // 2. UNIFIED AERODYNAMIC HELMET CREST & STEEPLY SLOPED PREDATORY FACE
  // Streamlined cowl hugging skull + heavy brow overhang + steep downward muzzle
  // ---------------------------------------------------------------------------
  const helmetPolyH: PointH[] = [
    // Aerodynamic crest fin tip - sharp swept-back point
    [crestTopTip[0], crestTopTip[1]],
    // Curved crown arching smoothly up to peak and horn root
    [crestTopTip[0] + 0.18, crestTopTip[1] - 0.08],
    [headTop[0], headTop[1]],
    [hornBase[0] - 0.04, hornBase[1] + 0.02],
    // Heavy angular brow overhang plate shielding the eye slit
    [browRidge[0], browRidge[1]],
    // Steep downward slope from brow to snout (~70° downward)
    [snoutTip[0], snoutTip[1]],
    // Upper beak tip meets jaw seam
    [chinTip[0] - 0.04, chinTip[1] - 0.06],
    // Clean mechanical jaw seam line running back to hinge
    [jawHinge[0] + 0.18, jawHinge[1] + 0.02],
    [jawHinge[0], jawHinge[1]],
    [neckTop[0], neckTop[1]],
    // Smooth aerodynamic underside of helmet cowl flowing to nape
    [crestBotTip[0] + 0.06, crestBotTip[1] + 0.02],
    [crestTopTip[0] + 0.14, crestTopTip[1] + 0.08],
  ];

  fillInkSilhouetteWithFringe(ctx, polyHToPx(helmetPolyH, W, sk), rng, 2.0 * s, 3.4 * s);

  // ---------------------------------------------------------------------------
  // 3. LAYERED CREST PLATE SEAMS (subtle diagonal aerodynamic seams inside cowl)
  // ---------------------------------------------------------------------------
  // Top crest dividing seam
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [crestTopTip[0] + 0.06, crestTopTip[1] + 0.04],
        [crestTopTip[0] + 0.20, crestTopTip[1] - 0.02],
        [headTop[0] + 0.04, headTop[1] + 0.10],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.2 }
  );

  // Middle crest dividing seam
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [crestBotTip[0] + 0.04, crestBotTip[1] - 0.02],
        [crestBotTip[0] + 0.18, crestBotTip[1] - 0.06],
        [sideVent[0] - 0.04, sideVent[1] - 0.04],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.2 }
  );

  // Heavy brow armor seam line (routed high along forehead, keeping eye socket dark)
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [browRidge[0] - 0.02, browRidge[1] - 0.08],
        [hornBase[0] - 0.04, hornBase[1] + 0.04],
        [sideVent[0] + 0.02, sideVent[1] - 0.10],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.2 }
  );

  // Closed jaw plate seam (clean diagonal mechanical seam)
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [jawHinge[0], jawHinge[1]],
        [jawHinge[0] + 0.18, jawHinge[1] + 0.02],
        [chinTip[0] - 0.04, chinTip[1] - 0.06],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.2 }
  );

  // Distinct horizontal line cutouts on the snout armor
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [snoutTip[0] - 0.12, snoutTip[1] - 0.04],
        [snoutTip[0] + 0.01, snoutTip[1] - 0.02],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.15 }
  );
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [snoutTip[0] - 0.08, snoutTip[1] + 0.06],
        [snoutTip[0] + 0.02, snoutTip[1] + 0.08],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 1.8 * s, wobbleScale: 0.15 }
  );

  // ---------------------------------------------------------------------------
  // 4. BOLD RED EYE SLASH MARKS ON BROW PLATE
  // 2 sharp parallel red slashes directly above the slanted eye slit
  // ---------------------------------------------------------------------------
  const slash1Px = polyHToPx(
    [
      [joints.eyeCenter[0] - 0.03, joints.eyeCenter[1] - 0.07],
      [joints.eyeCenter[0] + 0.03, joints.eyeCenter[1] - 0.04],
    ],
    W,
    sk
  );
  const slash2Px = polyHToPx(
    [
      [joints.eyeCenter[0] + 0.05, joints.eyeCenter[1] - 0.08],
      [joints.eyeCenter[0] + 0.11, joints.eyeCenter[1] - 0.05],
    ],
    W,
    sk
  );
  drawInkStroke(ctx, slash1Px, rng, {
    baseWidth: 3.0 * s,
    color: THEME_COLORS.red,
    wobbleScale: 0.1,
    doubleChance: 0,
    breakChance: 0,
    imperfectJoin: false,
  });
  drawInkStroke(ctx, slash2Px, rng, {
    baseWidth: 3.0 * s,
    color: THEME_COLORS.red,
    wobbleScale: 0.1,
    doubleChance: 0,
    breakChance: 0,
    imperfectJoin: false,
  });

  // ---------------------------------------------------------------------------
  // 5. SUBTLE MECHANICAL SIDE VENT (compact dark intake slot, NOT an eye!)
  // Small recessed intake behind the cheek, no white oval
  // ---------------------------------------------------------------------------
  const ventCenterPx = hToPx(sideVent, W, sk);
  const ventW = 0.09 * sk.headUnitPx;
  const ventH = 0.028 * sk.headUnitPx;
  const vRx = ventW * 0.5;
  const vRy = ventH * 0.5;

  // Thin red outer trim border
  const ventPolyPx: Point2D[] = [
    [ventCenterPx[0] - vRx, ventCenterPx[1] - vRy],
    [ventCenterPx[0] + vRx, ventCenterPx[1] - vRy],
    [ventCenterPx[0] + vRx, ventCenterPx[1] + vRy],
    [ventCenterPx[0] - vRx, ventCenterPx[1] + vRy],
  ];
  fillRoughenedPolygon(ctx, ventPolyPx, rng, THEME_COLORS.red, 0.4 * s);

  // Inset dark ink core slot
  const insetVentPx: Point2D[] = [
    [ventCenterPx[0] - vRx * 0.75, ventCenterPx[1] - vRy * 0.60],
    [ventCenterPx[0] + vRx * 0.75, ventCenterPx[1] - vRy * 0.60],
    [ventCenterPx[0] + vRx * 0.75, ventCenterPx[1] + vRy * 0.60],
    [ventCenterPx[0] - vRx * 0.75, ventCenterPx[1] + vRy * 0.60],
  ];
  fillRoughenedPolygon(ctx, insetVentPx, rng, THEME_COLORS.ink, 0.3 * s);

  // 2 small circular intake ports tucked above the vent
  const port1Px = hToPx([sideVent[0] - 0.04, sideVent[1] - 0.06], W, sk);
  const port2Px = hToPx([sideVent[0] + 0.02, sideVent[1] - 0.05], W, sk);
  drawInkDot(ctx, port1Px[0], port1Px[1], 3.0 * s, rng, THEME_COLORS.paperPure);
  drawInkDot(ctx, port1Px[0], port1Px[1], 1.4 * s, rng, THEME_COLORS.ink);
  drawInkDot(ctx, port2Px[0], port2Px[1], 2.8 * s, rng, THEME_COLORS.paperPure);
  drawInkDot(ctx, port2Px[0], port2Px[1], 1.2 * s, rng, THEME_COLORS.ink);

  // ---------------------------------------------------------------------------
  // 6. CHEEK HONEYCOMB HEXAGONAL CELL GRID (INTERLOCKING 7-CELL ROSETTE)
  // Positioned cleanly inside the cheek panel (below eye, in front of vent)
  // ---------------------------------------------------------------------------
  const cheekCenterH: PointH = [sideVent[0] + 0.16, sideVent[1] + 0.06];
  const cheekCenterPx = hToPx(cheekCenterH, W, sk);
  const hexR = 0.020 * sk.headUnitPx;
  const hexDist = Math.sqrt(3) * hexR;
  const cheekTilt = -0.22; // align slightly with cheek plate slant

  // 7 interlocking cell centers: center + 6 surrounding neighbors
  const hexCenters: Point2D[] = [cheekCenterPx];
  for (let k = 0; k < 6; k++) {
    const angle = cheekTilt + (k * Math.PI) / 3;
    hexCenters.push([
      cheekCenterPx[0] + Math.cos(angle) * hexDist,
      cheekCenterPx[1] + Math.sin(angle) * hexDist,
    ]);
  }

  // Draw shared regular hexagon edges cleanly
  const edgeKey = (p1: Point2D, p2: Point2D) => {
    const x1 = Math.round(p1[0]);
    const y1 = Math.round(p1[1]);
    const x2 = Math.round(p2[0]);
    const y2 = Math.round(p2[1]);
    return x1 < x2 || (x1 === x2 && y1 < y2)
      ? `${x1},${y1}-${x2},${y2}`
      : `${x2},${y2}-${x1},${y1}`;
  };

  const drawnEdges = new Set<string>();

  for (const hc of hexCenters) {
    const verts: Point2D[] = [];
    for (let i = 0; i < 6; i++) {
      const a = cheekTilt + (i / 6) * Math.PI * 2 + Math.PI / 6;
      verts.push([
        hc[0] + Math.cos(a) * hexR,
        hc[1] + Math.sin(a) * hexR,
      ]);
    }
    for (let i = 0; i < 6; i++) {
      const v0 = verts[i];
      const v1 = verts[(i + 1) % 6];
      const key = edgeKey(v0, v1);
      if (!drawnEdges.has(key)) {
        drawnEdges.add(key);
        drawInkStroke(
          ctx,
          [v0, v1],
          rng,
          {
            baseWidth: 1.5 * s,
            color: THEME_COLORS.paperPure,
            wobbleScale: 0.05,
            taperScale: 0.0,
            doubleChance: 0,
            breakChance: 0,
            imperfectJoin: false,
          }
        );
      }
    }
    // Subtle central cell glint
    drawInkDot(ctx, hc[0], hc[1], 1.4 * s, rng, THEME_COLORS.paperPure);
  }

  // Mechanical accent seam separating cheek from snout
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [sideVent[0] + 0.08, sideVent[1] - 0.04],
        [cheekCenterH[0] + 0.06, cheekCenterH[1] - 0.02],
        [snoutTip[0] - 0.06, snoutTip[1] + 0.04],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 1.8 * s, wobbleScale: 0.15 }
  );

  recorder.captureStage(canvas, 0.75, 0.88, 'left-right');
}
