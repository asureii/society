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
import { polyUvToPx, uvToPx, type PointUV } from './skeleton.ts';

/**
 * Draws Eva-01 `head` layer with exact 1-to-1 geometry matching the official
 * Evangelion Unit-01 bust reference poster:
 * 1. Long straight tapered horn rooted on forehead above the eye with beveled tip & red band
 * 2. Top crest hood + recessed light mechanical pod with 2 circular ports
 * 3. Long swept-back middle spoiler fin with upturned rear tip + lower port pod
 * 4. Forehead arch & heavy overhanging brow visor with 2 red slash marks
 * 5. Cylindrical side vent pod with red capsule border and inner core slit
 * 6. Sculpted lighter cheek & upper snout plate with 3 large interlocking hexagons
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

  const P = (pts: PointUV[]): Point2D[] => polyUvToPx(pts, W);
  const U = (u: number, v: number): Point2D => uvToPx([u, v], W);

  // ---------------------------------------------------------------------------
  // 1. HORN (rooted on front forehead above eye, thick base, beveled tip, red band)
  // ---------------------------------------------------------------------------
  const hornShaftUv: PointUV[] = [
    [0.608, 0.352], // back-left base collar
    [0.624, 0.345], // back edge above collar
    [0.865, 0.062], // top-left bevel corner
    [0.918, 0.056], // top-right sharp point
    [0.694, 0.402], // front-right base
    [0.698, 0.416], // front base collar corner
    [0.642, 0.398], // base center step
  ];
  fillInkSilhouetteWithFringe(ctx, P(hornShaftUv), rng, 1.5 * s, 3.0 * s);

  // Red accent band on horn (~1/4 up from base, matching green band in ref)
  const hornBandUv: PointUV[] = [
    [0.668, 0.288],
    [0.704, 0.244],
    [0.758, 0.292],
    [0.728, 0.338],
  ];
  fillRoughenedPolygon(ctx, P(hornBandUv), rng, THEME_COLORS.red, 0.5 * s);

  // Crisp black borders and notch ticks on the horn band
  drawInkStroke(
    ctx,
    P([
      [0.666, 0.290],
      [0.730, 0.340],
    ]),
    rng,
    { baseWidth: 3.0 * s, color: THEME_COLORS.ink, wobbleScale: 0.1, doubleChance: 0 }
  );
  drawInkStroke(
    ctx,
    P([
      [0.702, 0.244],
      [0.760, 0.294],
    ]),
    rng,
    { baseWidth: 3.0 * s, color: THEME_COLORS.ink, wobbleScale: 0.1, doubleChance: 0 }
  );
  // Small black detail ticks inside left side of band
  drawInkStroke(
    ctx,
    P([
      [0.684, 0.272],
      [0.700, 0.284],
    ]),
    rng,
    { baseWidth: 1.8 * s, color: THEME_COLORS.ink, wobbleScale: 0.05, doubleChance: 0 }
  );

  // Central longitudinal ridge line along the horn (white negative seam)
  carveNegativeSeam(
    ctx,
    P([
      [0.886, 0.062],
      [0.734, 0.268],
    ]),
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.15, doubleChance: 0 }
  );
  carveNegativeSeam(
    ctx,
    P([
      [0.696, 0.316],
      [0.654, 0.376],
    ]),
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.15, doubleChance: 0 }
  );
  // Horn base collar seam
  carveNegativeSeam(
    ctx,
    P([
      [0.610, 0.356],
      [0.652, 0.382],
      [0.696, 0.412],
    ]),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.15, doubleChance: 0 }
  );

  recorder.captureStage(canvas, 0.36, 0.46, 'top-down');

  // ---------------------------------------------------------------------------
  // 2. RECESSED MECHANICAL HOUSINGS AT REAR OF HEAD (Light hatched pods + twin circular ports)
  // ---------------------------------------------------------------------------
  // Upper recessed pod (under top crest hood, holding the 2 circular ports)
  const upperPodUv: PointUV[] = [
    [0.210, 0.344],
    [0.355, 0.352],
    [0.352, 0.394],
    [0.145, 0.394],
  ];
  fillRoughenedPolygon(ctx, P(upperPodUv), rng, THEME_COLORS.paperPure, 0.6 * s);
  drawInkStroke(ctx, [...P(upperPodUv), U(0.210, 0.344)], rng, {
    baseWidth: 2.8 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.15,
    doubleChance: 0,
  });

  // Twin circular mechanical ports inside upper recessed pod
  const port1 = U(0.292, 0.356);
  const port2 = U(0.278, 0.380);
  drawInkDot(ctx, port1[0], port1[1], 13.5 * s, rng, THEME_COLORS.ink);
  drawInkDot(ctx, port2[0], port2[1], 12.5 * s, rng, THEME_COLORS.ink);

  // Mechanical slot lines to the left of the twin ports
  drawInkStroke(
    ctx,
    P([
      [0.185, 0.368],
      [0.245, 0.366],
    ]),
    rng,
    { baseWidth: 2.6 * s, color: THEME_COLORS.ink, wobbleScale: 0.1, doubleChance: 0 }
  );
  drawInkStroke(
    ctx,
    P([
      [0.165, 0.382],
      [0.235, 0.382],
    ]),
    rng,
    { baseWidth: 2.6 * s, color: THEME_COLORS.ink, wobbleScale: 0.1, doubleChance: 0 }
  );

  // Lower recessed mechanical pod (under middle spoiler fin)
  const lowerPodUv: PointUV[] = [
    [0.130, 0.406],
    [0.315, 0.418],
    [0.295, 0.464],
    [0.120, 0.452],
  ];
  fillRoughenedPolygon(ctx, P(lowerPodUv), rng, THEME_COLORS.paperPure, 0.6 * s);
  drawInkStroke(ctx, [...P(lowerPodUv), U(0.130, 0.406)], rng, {
    baseWidth: 2.8 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.15,
    doubleChance: 0,
  });
  // Circular port + vertical struts inside lower pod
  const port3 = U(0.255, 0.436);
  drawInkDot(ctx, port3[0], port3[1], 11.0 * s, rng, THEME_COLORS.ink);
  drawInkStroke(
    ctx,
    P([
      [0.175, 0.410],
      [0.165, 0.454],
    ]),
    rng,
    { baseWidth: 4.5 * s, color: THEME_COLORS.ink, wobbleScale: 0.1, doubleChance: 0 }
  );
  drawInkStroke(
    ctx,
    P([
      [0.208, 0.414],
      [0.198, 0.456],
    ]),
    rng,
    { baseWidth: 4.0 * s, color: THEME_COLORS.ink, wobbleScale: 0.1, doubleChance: 0 }
  );

  // ---------------------------------------------------------------------------
  // 3. SCULPTED LIGHT CHEEK & UPPER SNOUT MASK (with 3 large interlocking hexagons)
  // ---------------------------------------------------------------------------
  const cheekMaskUv: PointUV[] = [
    [0.430, 0.465], // behind capsule vent
    [0.485, 0.422], // under brow visor
    [0.675, 0.460], // under front brow visor tip
    [0.665, 0.490], // upper nose step
    [0.672, 0.525], // mid nose bridge
    [0.696, 0.562], // angular nose bridge projection
    [0.688, 0.592], // top of chin wedge
    [0.640, 0.598], // lower snout seam above jaw
    [0.535, 0.545], // mid cheek-jaw seam
    [0.425, 0.472], // rear cheek corner
  ];
  fillRoughenedPolygon(ctx, P(cheekMaskUv), rng, THEME_COLORS.paperPure, 0.8 * s);

  // Fine contour hatching along lower-left cheek shadow & nose projection
  const cheekHatchLines: PointUV[][] = [
    [
      [0.662, 0.555],
      [0.688, 0.565],
    ],
    [
      [0.658, 0.568],
      [0.684, 0.578],
    ],
    [
      [0.654, 0.580],
      [0.680, 0.588],
    ],
    [
      [0.545, 0.525],
      [0.575, 0.542],
    ],
    [
      [0.585, 0.548],
      [0.625, 0.568],
    ],
  ];
  for (const hl of cheekHatchLines) {
    drawInkStroke(ctx, P(hl), rng, {
      baseWidth: 1.8 * s,
      color: THEME_COLORS.ink,
      wobbleScale: 0.1,
      doubleChance: 0,
    });
  }

  // 3 LARGE INTERLOCKING HONEYCOMB HEXAGONS ON CHEEK (matching reference 1-to-1)
  const hexCells: Array<{ center: PointUV; rx: number; ry: number; tilt: number }> = [
    { center: [0.500, 0.476], rx: 0.031, ry: 0.025, tilt: 0.22 },
    { center: [0.550, 0.460], rx: 0.029, ry: 0.023, tilt: 0.22 },
    { center: [0.588, 0.494], rx: 0.032, ry: 0.026, tilt: 0.22 },
  ];

  for (const cell of hexCells) {
    const verts: Point2D[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const lx = Math.cos(a) * cell.rx;
      const ly = Math.sin(a) * cell.ry;
      const u = cell.center[0] + lx * Math.cos(cell.tilt) - ly * Math.sin(cell.tilt);
      const v = cell.center[1] + lx * Math.sin(cell.tilt) + ly * Math.cos(cell.tilt);
      verts.push(U(u, v));
    }
    for (let i = 0; i < 6; i++) {
      drawInkStroke(ctx, [verts[i], verts[(i + 1) % 6]], rng, {
        baseWidth: 2.6 * s,
        color: THEME_COLORS.ink,
        wobbleScale: 0.08,
        taperScale: 0.0,
        doubleChance: 0,
        breakChance: 0,
        imperfectJoin: false,
      });
    }
    // Small inner mechanical tick marks inside each hex cell (as in reference)
    const cPx = U(cell.center[0], cell.center[1]);
    drawInkDot(ctx, cPx[0] - 5 * s, cPx[1] - 3 * s, 1.8 * s, rng, THEME_COLORS.ink);
    drawInkDot(ctx, cPx[0] + 5 * s, cPx[1] + 3 * s, 1.8 * s, rng, THEME_COLORS.ink);
  }

  // Heavy black outline around the cheek & snout mask
  drawInkStroke(ctx, [...P(cheekMaskUv), U(0.430, 0.465)], rng, {
    baseWidth: 3.4 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.18,
    doubleChance: 0,
  });

  // ---------------------------------------------------------------------------
  // 4. SOLID BLACK HELMET CREST PLATES, FOREHEAD ARCH & OVERHANGING BROW VISOR
  // ---------------------------------------------------------------------------
  // A. Top Crest Hood (sharp rear point at u=0.095, v=0.338)
  const topCrestUv: PointUV[] = [
    [0.095, 0.338], // sharp rear point
    [0.265, 0.280], // upper crest peak
    [0.415, 0.288], // rear crown
    [0.455, 0.308], // front crown step
    [0.442, 0.358], // lower front corner of top crest
    [0.345, 0.358], // underside notch
    [0.258, 0.340], // underside arch over twin ports
    [0.178, 0.350],
  ];
  fillInkSilhouetteWithFringe(ctx, P(topCrestUv), rng, 1.6 * s, 3.0 * s);

  // White negative facet seam across top crest hood
  carveNegativeSeam(
    ctx,
    P([
      [0.105, 0.338],
      [0.265, 0.312],
      [0.348, 0.342],
      [0.440, 0.342],
    ]),
    rng,
    { baseWidth: 2.2 * s, wobbleScale: 0.15, doubleChance: 0 }
  );

  // B. Forehead Arch & Horn Base Mount (wraps over the eye socket)
  const foreheadArchUv: PointUV[] = [
    [0.415, 0.305],
    [0.525, 0.312],
    [0.608, 0.352],
    [0.698, 0.415],
    [0.706, 0.434], // front forehead step
    [0.658, 0.432],
    [0.605, 0.412], // solid black eye socket backing
    [0.505, 0.382],
    [0.425, 0.358],
  ];
  fillInkSilhouetteWithFringe(ctx, P(foreheadArchUv), rng, 1.5 * s, 2.8 * s);

  carveNegativeSeam(
    ctx,
    P([
      [0.445, 0.324],
      [0.535, 0.332],
      [0.622, 0.376],
      [0.696, 0.426],
    ]),
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.15, doubleChance: 0 }
  );

  // C. Long Swept Middle Spoiler Fin (upturned rear tip at u=0.006, v=0.375)
  const midSpoilerFinUv: PointUV[] = [
    [0.006, 0.375], // upturned rear spoiler tip
    [0.075, 0.388],
    [0.255, 0.390],
    [0.385, 0.398],
    [0.495, 0.420],
    [0.320, 0.422],
    [0.175, 0.408],
    [0.035, 0.402], // underside curve of tip
  ];
  fillInkSilhouetteWithFringe(ctx, P(midSpoilerFinUv), rng, 1.6 * s, 3.0 * s);

  carveNegativeSeam(
    ctx,
    P([
      [0.022, 0.388],
      [0.180, 0.398],
      [0.365, 0.410],
    ]),
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.15, doubleChance: 0 }
  );

  // D. Heavy Overhanging Brow & Nose Bridge Visor (projects to u=0.712, v=0.468)
  const browVisorUv: PointUV[] = [
    [0.352, 0.362], // temple root
    [0.485, 0.358], // brow ridge above eye
    [0.520, 0.385], // inner eye socket corner
    [0.605, 0.414], // front eye socket corner
    [0.712, 0.468], // sharp overhanging brow/nose visor point
    [0.685, 0.476], // underside of visor tip
    [0.585, 0.442], // underside of brow over cheek
    [0.485, 0.422],
    [0.355, 0.398],
  ];
  fillInkSilhouetteWithFringe(ctx, P(browVisorUv), rng, 1.6 * s, 3.0 * s);

  // Crisp mechanical seam line along the overhanging brow visor
  carveNegativeSeam(
    ctx,
    P([
      [0.385, 0.382],
      [0.495, 0.396],
      [0.610, 0.432],
      [0.702, 0.466],
    ]),
    rng,
    { baseWidth: 2.0 * s, wobbleScale: 0.15, doubleChance: 0 }
  );

  // ---------------------------------------------------------------------------
  // 5. RED BROW SLASH MARKS & EYE SOCKET ACCENT
  // ---------------------------------------------------------------------------
  drawInkStroke(
    ctx,
    P([
      [0.500, 0.398],
      [0.534, 0.388],
    ]),
    rng,
    { baseWidth: 3.4 * s, color: THEME_COLORS.red, wobbleScale: 0.1, doubleChance: 0 }
  );
  drawInkStroke(
    ctx,
    P([
      [0.538, 0.412],
      [0.574, 0.402],
    ]),
    rng,
    { baseWidth: 3.4 * s, color: THEME_COLORS.red, wobbleScale: 0.1, doubleChance: 0 }
  );
  // Small red accent notch on upper-front eye arch (matching reference)
  const eyeArchNotch = U(0.608, 0.384);
  drawInkDot(ctx, eyeArchNotch[0], eyeArchNotch[1], 3.5 * s, rng, THEME_COLORS.red);

  // ---------------------------------------------------------------------------
  // 6. CYLINDRICAL SIDE CAPSULE VENT POD (u=0.28..0.495, v=0.425..0.468)
  // ---------------------------------------------------------------------------
  // Rear cylindrical barrel
  const ventBarrelUv: PointUV[] = [
    [0.282, 0.430],
    [0.415, 0.424],
    [0.415, 0.468],
    [0.282, 0.462],
  ];
  fillInkSilhouetteWithFringe(ctx, P(ventBarrelUv), rng, 1.2 * s, 2.4 * s);

  // 3 chevron rib grooves on the barrel
  for (const uOff of [0.335, 0.355, 0.375]) {
    carveNegativeSeam(
      ctx,
      P([
        [uOff, 0.432],
        [uOff - 0.012, 0.446],
        [uOff, 0.460],
      ]),
      rng,
      { baseWidth: 1.6 * s, wobbleScale: 0.1, doubleChance: 0 }
    );
  }

  // Front capsule opening (red border + white inset + red/black core)
  const ventCenter = U(0.445, 0.446);
  const vRx = 0.048 * W;
  const vRy = 0.022 * H;
  const ventOuterPx: Point2D[] = [];
  const ventInnerPx: Point2D[] = [];
  const vSteps = 20;
  for (let i = 0; i < vSteps; i++) {
    const a = (i / vSteps) * Math.PI * 2;
    const cb = Math.pow(Math.abs(Math.cos(a)), 0.7) * Math.sign(Math.cos(a));
    ventOuterPx.push([ventCenter[0] + cb * vRx, ventCenter[1] + Math.sin(a) * vRy]);
    ventInnerPx.push([
      ventCenter[0] + cb * (vRx * 0.72),
      ventCenter[1] + Math.sin(a) * (vRy * 0.62),
    ]);
  }
  fillRoughenedPolygon(ctx, ventOuterPx, rng, THEME_COLORS.red, 0.5 * s);
  drawInkStroke(ctx, [...ventOuterPx, ventOuterPx[0]], rng, {
    baseWidth: 2.4 * s,
    color: THEME_COLORS.ink,
    wobbleScale: 0.1,
    doubleChance: 0,
  });
  fillRoughenedPolygon(ctx, ventInnerPx, rng, THEME_COLORS.ink, 0.4 * s);
  // Bright center core highlight inside capsule vent
  drawInkStroke(
    ctx,
    [
      [ventCenter[0] - vRx * 0.42, ventCenter[1]],
      [ventCenter[0] + vRx * 0.42, ventCenter[1]],
    ],
    rng,
    { baseWidth: 3.2 * s, color: THEME_COLORS.red, wobbleScale: 0.08, doubleChance: 0 }
  );

  recorder.captureStage(canvas, 0.75, 0.88, 'left-right');
}
