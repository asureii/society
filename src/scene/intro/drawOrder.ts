/**
 * PER-PIXEL DRAW-ORDER CHANNEL RECORDER (src/scene/intro/drawOrder.ts)
 *
 * Bakes a normalized stroke-order timestamp `t in [0, 1]` for every hand-inked
 * element of the intro composition so the WebGL shader can reveal the scene
 * sequentially (`order <= uReveal`) with a soft, ragged ink-bleed leading edge:
 *
 * - 0.00 .. 0.28 : Infinite perspective grid (computed in shader from horizon outward)
 * - 0.28 .. 0.52 : Standing mirror pedestal, chipped dry-brush frame, glass interior & glare hatching
 * - 0.52 .. 0.76 : Anatomical brain cast shadow, slab, hemispheres, curl-noise gyri, cross-contour hatching & stippling
 * - 0.76 .. 1.00 : Mirrored machine brain housing, riveted plates, conduits, vacuum tubes, cables, red orb core & projection arc
 */

export interface DrawOrderRecorder {
  /** Snapshot newly drawn or modified pixels on `artCanvas` and assign them draw-order `[tStart, tEnd]` */
  captureStage: (
    artCanvas: HTMLCanvasElement,
    tStart: number,
    tEnd: number,
    sweepDirection?: 'top-down' | 'bottom-up' | 'left-right' | 'radial-in' | 'radial-out',
    centerUv?: readonly [number, number],
  ) => void;
  /** Finalize and return the draw-order `HTMLCanvasElement` (encoded in R, G, B channels) */
  finalizeCanvas: () => HTMLCanvasElement;
}

/**
 * Creates a draw-order recorder at half-resolution (`width/2 x height/2`) to keep
 * CPU snapshot time < 15ms and GPU texture footprint < 2MB while preserving crisp stroke order.
 */
export function createDrawOrderRecorder(width: number, height: number): DrawOrderRecorder {
  const mapW = Math.max(256, Math.floor(width / 2));
  const mapH = Math.max(256, Math.floor(height / 2));

  const orderCanvas = document.createElement('canvas');
  orderCanvas.width = mapW;
  orderCanvas.height = mapH;
  const orderCtx = orderCanvas.getContext('2d', { willReadFrequently: true });

  const scratchCanvas = document.createElement('canvas');
  scratchCanvas.width = mapW;
  scratchCanvas.height = mapH;
  const scratchCtx = scratchCanvas.getContext('2d', { willReadFrequently: true });

  // Previous snapshot of RGBA values at (mapW x mapH)
  const prevRgba = new Uint8ClampedArray(mapW * mapH * 4);
  // Recorded normalized timestamp [0..255] per pixel (0 = untouched background)
  const orderBytes = new Uint8ClampedArray(mapW * mapH);

  const captureStage: DrawOrderRecorder['captureStage'] = (
    artCanvas,
    tStart,
    tEnd,
    sweepDirection = 'top-down',
    centerUv = [0.5, 0.5],
  ) => {
    if (!scratchCtx) return;
    scratchCtx.clearRect(0, 0, mapW, mapH);
    scratchCtx.drawImage(artCanvas, 0, 0, mapW, mapH);
    const imgData = scratchCtx.getImageData(0, 0, mapW, mapH);
    const data = imgData.data;

    const cx = centerUv[0] * mapW;
    const cy = (1 - centerUv[1]) * mapH;
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

        const pr = prevRgba[p4];
        const pg = prevRgba[p4 + 1];
        const pb = prevRgba[p4 + 2];
        const pa = prevRgba[p4 + 3];

        const diff =
          Math.abs(r - pr) + Math.abs(g - pg) + Math.abs(b - pb) + Math.abs(a - pa);

        if (diff > 12 && a > 16) {
          const nx = x / Math.max(1, mapW - 1);
          let sweep = ny;
          if (sweepDirection === 'bottom-up') {
            sweep = 1 - ny;
          } else if (sweepDirection === 'left-right') {
            sweep = nx;
          } else if (sweepDirection === 'radial-out') {
            sweep = Math.min(1, Math.hypot(x - cx, y - cy) / maxRadius);
          } else if (sweepDirection === 'radial-in') {
            sweep = 1 - Math.min(1, Math.hypot(x - cx, y - cy) / maxRadius);
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

  const finalizeCanvas = (): HTMLCanvasElement => {
    if (!orderCtx) return orderCanvas;
    const outImg = orderCtx.createImageData(mapW, mapH);
    const out = outImg.data;
    for (let i = 0; i < mapW * mapH; i++) {
      const v = orderBytes[i];
      const p4 = i * 4;
      // If a pixel was never touched (0), set to 255 so background never prematurely masks
      const encoded = v === 0 ? 255 : v;
      out[p4] = encoded;
      out[p4 + 1] = encoded;
      out[p4 + 2] = encoded;
      out[p4 + 3] = 255;
    }
    orderCtx.putImageData(outImg, 0, 0);
    return orderCanvas;
  };

  return {
    captureStage,
    finalizeCanvas,
  };
}
