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
    crestNotch1,
    crestMidTip,
    crestNotch2,
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
  // 2. HELMET CREST & CONTINUOUS SLOPED FACE SILHOUETTE
  // Stack of 3 swept-back diagonal plates + brow overhang + sloped snout to beak
  // ---------------------------------------------------------------------------
  const helmetPolyH: PointH[] = [
    // Top crest rearmost tip
    [crestTopTip[0], crestTopTip[1]],
    // Curved crown arching up to peak
    [crestTopTip[0] + 0.26, crestTopTip[1] - 0.06],
    [headTop[0], headTop[1]],
    [hornBase[0] - 0.06, hornBase[1] + 0.02],
    // Brow overhang over the eye slit
    [browRidge[0], browRidge[1]],
    // Long continuous slope down-right to blunt beak chin tip
    [snoutTip[0], snoutTip[1]],
    // Upper beak tip meets jaw seam
    [chinTip[0] - 0.04, chinTip[1] - 0.04],
    // Clean mechanical jaw seam line running back to hinge
    [jawHinge[0] + 0.22, jawHinge[1] + 0.02],
    [jawHinge[0], jawHinge[1]],
    [neckTop[0], neckTop[1]],
    // Lower cowl plate rearmost tip
    [crestBotTip[0], crestBotTip[1]],
    // Notch 2 between mid and lower plate
    [crestNotch2[0], crestNotch2[1]],
    // Middle crest plate rearmost tip
    [crestMidTip[0], crestMidTip[1]],
    // Notch 1 between top and mid plate
    [crestNotch1[0], crestNotch1[1]],
  ];

  fillInkSilhouetteWithFringe(ctx, polyHToPx(helmetPolyH, W, sk), rng, 2.0 * s, 3.4 * s);

  // ---------------------------------------------------------------------------
  // 3. LAYERED CREST PLATE SEAMS (crisp diagonal negative seams)
  // ---------------------------------------------------------------------------
  // Top crest dividing seam
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [crestNotch1[0], crestNotch1[1]],
        [crestNotch1[0] + 0.24, crestNotch1[1] - 0.02],
        [headTop[0] + 0.06, headTop[1] + 0.14],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.4 * s, wobbleScale: 0.25 }
  );

  // Middle crest dividing seam
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [crestNotch2[0], crestNotch2[1]],
        [crestNotch2[0] + 0.26, crestNotch2[1] + 0.02],
        [sideVent[0] - 0.10, sideVent[1] - 0.04],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.25 }
  );

  // Brow plate overhang seam line
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [browRidge[0] + 0.02, browRidge[1] + 0.02],
        [hornBase[0] - 0.04, hornBase[1] + 0.10],
        [sideVent[0] + 0.06, sideVent[1] - 0.08],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.25 }
  );

  // Closed jaw plate seam (clean diagonal mechanical seam)
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [jawHinge[0], jawHinge[1]],
        [jawHinge[0] + 0.22, jawHinge[1] + 0.02],
        [chinTip[0] - 0.04, chinTip[1] - 0.04],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.2 }
  );

  // ---------------------------------------------------------------------------
  // 4. RED EYE SLASH MARKS ON BROW PLATE
  // 2 short parallel red slashes directly above the slanted eye slit
  // ---------------------------------------------------------------------------
  const slash1Px = polyHToPx(
    [
      [joints.eyeCenter[0] - 0.04, joints.eyeCenter[1] - 0.05],
      [joints.eyeCenter[0] + 0.02, joints.eyeCenter[1] - 0.03],
    ],
    W,
    sk
  );
  const slash2Px = polyHToPx(
    [
      [joints.eyeCenter[0] + 0.04, joints.eyeCenter[1] - 0.06],
      [joints.eyeCenter[0] + 0.10, joints.eyeCenter[1] - 0.04],
    ],
    W,
    sk
  );
  drawInkStroke(ctx, slash1Px, rng, {
    baseWidth: 2.8 * s,
    color: THEME_COLORS.red,
    wobbleScale: 0.15,
  });
  drawInkStroke(ctx, slash2Px, rng, {
    baseWidth: 2.8 * s,
    color: THEME_COLORS.red,
    wobbleScale: 0.15,
  });

  // ---------------------------------------------------------------------------
  // 5. SIDE CAPSULE VENT (red border + white inset oval + inner slit)
  // ---------------------------------------------------------------------------
  const ventCenterPx = hToPx(sideVent, W, sk);
  const ventW = 0.18 * sk.headUnitPx;
  const ventH = 0.075 * sk.headUnitPx;
  const vRx = ventW * 0.5;
  const vRy = ventH * 0.5;

  // Outer red capsule border
  const ventPolyPx: Point2D[] = [];
  const vSteps = 20;
  for (let i = 0; i < vSteps; i++) {
    const a = (i / vSteps) * Math.PI * 2;
    const cornerBoost = Math.pow(Math.abs(Math.cos(a)), 0.75) * Math.sign(Math.cos(a));
    ventPolyPx.push([
      ventCenterPx[0] + cornerBoost * vRx,
      ventCenterPx[1] + Math.sin(a) * vRy,
    ]);
  }
  fillRoughenedPolygon(ctx, ventPolyPx, rng, THEME_COLORS.red, 0.6 * s);

  // Inset white oval
  const insetPolyPx: Point2D[] = [];
  for (let i = 0; i < vSteps; i++) {
    const a = (i / vSteps) * Math.PI * 2;
    const cornerBoost = Math.pow(Math.abs(Math.cos(a)), 0.75) * Math.sign(Math.cos(a));
    insetPolyPx.push([
      ventCenterPx[0] + cornerBoost * (vRx * 0.68),
      ventCenterPx[1] + Math.sin(a) * (vRy * 0.60),
    ]);
  }
  fillRoughenedPolygon(ctx, insetPolyPx, rng, THEME_COLORS.paperPure, 0.5 * s);

  // Inner red core slit
  drawInkStroke(
    ctx,
    [
      [ventCenterPx[0] - vRx * 0.35, ventCenterPx[1]],
      [ventCenterPx[0] + vRx * 0.35, ventCenterPx[1]],
    ],
    rng,
    { baseWidth: 2.2 * s, color: THEME_COLORS.red, wobbleScale: 0.1 }
  );

  // 2 circular vent ports behind the side vent
  const port1Px = hToPx([sideVent[0] - 0.06, sideVent[1] - 0.08], W, sk);
  const port2Px = hToPx([sideVent[0] + 0.01, sideVent[1] - 0.07], W, sk);
  drawInkDot(ctx, port1Px[0], port1Px[1], 4.2 * s, rng, THEME_COLORS.paperPure);
  drawInkDot(ctx, port1Px[0], port1Px[1], 1.8 * s, rng, THEME_COLORS.ink);
  drawInkDot(ctx, port2Px[0], port2Px[1], 3.8 * s, rng, THEME_COLORS.paperPure);
  drawInkDot(ctx, port2Px[0], port2Px[1], 1.6 * s, rng, THEME_COLORS.ink);

  // ---------------------------------------------------------------------------
  // 6. CHEEK HONEYCOMB HEXAGONAL CELL GRID (INTERLOCKING 7-CELL ROSETTE)
  // Positioned cleanly inside the cheek panel (below eye/vent, above jaw seam)
  // ---------------------------------------------------------------------------
  const cheekCenterH: PointH = [sideVent[0] + 0.16, sideVent[1] + 0.06];
  const cheekCenterPx = hToPx(cheekCenterH, W, sk);
  const hexR = 0.024 * sk.headUnitPx;
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
            baseWidth: 1.6 * s,
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
    drawInkDot(ctx, hc[0], hc[1], 1.6 * s, rng, THEME_COLORS.paperPure);
  }

  // Mechanical accent seam separating cheek from snout
  carveNegativeSeam(
    ctx,
    polyHToPx(
      [
        [sideVent[0] + 0.10, sideVent[1] - 0.04],
        [cheekCenterH[0] + 0.08, cheekCenterH[1] - 0.02],
        [snoutTip[0] - 0.06, snoutTip[1] + 0.06],
      ],
      W,
      sk
    ),
    rng,
    { baseWidth: 1.8 * s, wobbleScale: 0.15 }
  );

  recorder.captureStage(canvas, 0.75, 0.88, 'left-right');
}
