import { THEME_COLORS } from '../../config/theme.ts';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  type Canvas2DContext,
  type InkStrokeOptions,
  type Point2D,
} from '../../scene/art/inkBrush.ts';
import type { PRNG } from '../../scene/art/rng.ts';

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

export function createSurface(
  width: number,
  height: number,
  preferOffscreen = false
): { canvas: AnyCanvas; ctx: Canvas2DContext } {
  if (preferOffscreen && typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    return { canvas, ctx };
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    return { canvas, ctx };
  }
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  return { canvas, ctx };
}

export interface EvaDrawOrderRecorder {
  captureStage: (
    artCanvas: AnyCanvas,
    tStart: number,
    tEnd: number,
    sweepDirection?: 'top-down' | 'bottom-up' | 'left-right' | 'radial-out',
    centerUv?: readonly [number, number]
  ) => void;
  finalizeCanvas: () => AnyCanvas;
}

export function createEvaDrawOrderRecorder(
  width: number,
  height: number,
  preferOffscreen = false
): EvaDrawOrderRecorder {
  const mapW = Math.max(256, Math.floor(width / 2));
  const mapH = Math.max(256, Math.floor(height / 2));

  const { canvas: orderCanvas, ctx: orderCtx } = createSurface(mapW, mapH, preferOffscreen);
  const { canvas: scratchCanvas, ctx: scratchCtx } = createSurface(mapW, mapH, preferOffscreen);

  const prevRgba = new Uint8ClampedArray(mapW * mapH * 4);
  const orderBytes = new Uint8ClampedArray(mapW * mapH);

  const captureStage: EvaDrawOrderRecorder['captureStage'] = (
    artCanvas,
    tStart,
    tEnd,
    sweepDirection = 'top-down',
    centerUv = [0.4, 0.45]
  ) => {
    scratchCtx.clearRect(0, 0, mapW, mapH);
    scratchCtx.drawImage(artCanvas as CanvasImageSource, 0, 0, mapW, mapH);
    const imgData = scratchCtx.getImageData(0, 0, mapW, mapH);
    const data = imgData.data;

    const cx = centerUv[0] * mapW;
    const cy = centerUv[1] * mapH;
    const maxRadius = Math.hypot(mapW, mapH) * 0.45;

    for (let y = 0; y < mapH; y++) {
      const ny = y / Math.max(1, mapH - 1);
      for (let x = 0; x < mapW; x++) {
        const idx = y * mapW + x;
        const p4 = idx * 4;
        const r = data[p4];
        const g = data[p4 + 1];
        const b = data[p4 + 2];
        const a = data[p4 + 3];

        const diff =
          Math.abs(r - prevRgba[p4]) +
          Math.abs(g - prevRgba[p4 + 1]) +
          Math.abs(b - prevRgba[p4 + 2]) +
          Math.abs(a - prevRgba[p4 + 3]);

        if (diff > 10 && a > 16) {
          const nx = x / Math.max(1, mapW - 1);
          let sweep = ny;
          if (sweepDirection === 'bottom-up') sweep = 1 - ny;
          else if (sweepDirection === 'left-right') sweep = nx;
          else if (sweepDirection === 'radial-out') {
            sweep = Math.min(1, Math.hypot(x - cx, y - cy) / maxRadius);
          }

          const t = Math.max(0, Math.min(1, tStart + (tEnd - tStart) * sweep));
          orderBytes[idx] = Math.max(1, Math.min(255, Math.round(t * 255)));

          prevRgba[p4] = r;
          prevRgba[p4 + 1] = g;
          prevRgba[p4 + 2] = b;
          prevRgba[p4 + 3] = a;
        }
      }
    }
  };

  const finalizeCanvas = (): AnyCanvas => {
    const outImg = orderCtx.createImageData(mapW, mapH);
    const out = outImg.data;
    for (let i = 0; i < mapW * mapH; i++) {
      const v = orderBytes[i];
      const p4 = i * 4;
      const encoded = v === 0 ? 255 : v;
      out[p4] = encoded;
      out[p4 + 1] = encoded;
      out[p4 + 2] = encoded;
      out[p4 + 3] = 255;
    }
    orderCtx.putImageData(outImg, 0, 0);
    // Reference scratchCanvas so TS never flags unused
    void scratchCanvas;
    return orderCanvas;
  };

  return { captureStage, finalizeCanvas };
}

/**
 * Fills a solid ink silhouette polygon with ragged hand-inked edges, dry-brush fringes,
 * and cross-contour edge hatching.
 */
export function fillInkSilhouetteWithFringe(
  ctx: Canvas2DContext,
  poly: Point2D[],
  rng: PRNG,
  roughness = 4.2,
  outlineWidth = 6.5
): void {
  fillRoughenedPolygon(ctx, poly, rng, THEME_COLORS.ink, roughness);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    drawInkStroke(ctx, [a, b], rng, {
      baseWidth: outlineWidth,
      color: THEME_COLORS.ink,
      wobbleScale: 1.35,
      taperScale: 0.9,
      doubleChance: 0.35,
      dryBrush: true,
    });
  }
}

/**
 * Carves crisp white negative-space seam cracks or interior cutouts inside a black ink silhouette.
 */
export function carveNegativeSeam(
  ctx: Canvas2DContext,
  pts: Point2D[],
  rng: PRNG,
  options: InkStrokeOptions = {}
): void {
  drawInkStroke(ctx, pts, rng, {
    baseWidth: options.baseWidth ?? 3.6,
    color: THEME_COLORS.paper,
    wobbleScale: options.wobbleScale ?? 1.15,
    taperScale: options.taperScale ?? 1.0,
    doubleChance: options.doubleChance ?? 0.15,
    breakChance: options.breakChance ?? 0.04,
    dryBrush: false,
  });
}

/**
 * Adds short cross-contour white negative-space hatch ticks along a silhouette edge
 * so the solid ink silhouette reads with sculptural manga volume without any grey tones.
 */
export function carveCrossContourEdgeHatch(
  ctx: Canvas2DContext,
  start: Point2D,
  end: Point2D,
  inwardNormal: Point2D,
  count: number,
  tickLength: number,
  rng: PRNG
): void {
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count + rng.range(-0.025, 0.025);
    const bx = start[0] + (end[0] - start[0]) * t;
    const by = start[1] + (end[1] - start[1]) * t;
    const len = tickLength * rng.range(0.65, 1.25);
    const ex = bx + inwardNormal[0] * len;
    const ey = by + inwardNormal[1] * len;
    drawInkStroke(
      ctx,
      [
        [bx, by],
        [ex, ey],
      ],
      rng,
      {
        baseWidth: rng.range(1.6, 2.6),
        color: THEME_COLORS.paper,
        wobbleScale: 0.9,
        taperScale: 1.1,
        doubleChance: 0,
        breakChance: 0,
      }
    );
  }
}

/**
 * Scatters organic ink spatter droplets around an anchor point.
 */
export function drawInkSpatterCluster(
  ctx: Canvas2DContext,
  cx: number,
  cy: number,
  spreadRadius: number,
  count: number,
  rng: PRNG
): void {
  for (let i = 0; i < count; i++) {
    const angle = rng.range(0, Math.PI * 2);
    const dist = Math.pow(rng.next(), 0.7) * spreadRadius;
    const r = rng.range(1.4, 4.8);
    drawInkDot(
      ctx,
      cx + Math.cos(angle) * dist,
      cy + Math.sin(angle) * dist,
      r,
      rng,
      THEME_COLORS.ink
    );
  }
}
