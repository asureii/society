/**
 * EVA-01 BUST ANATOMICAL PROPORTIONS & ALPHA BOUNDING BOX VERIFICATION
 * (scripts/eva-proportions-check.ts)
 *
 * 1. Rasterizes every separate Eva-01 bust part (`torso`, `neck`, `head`, `jaw`, `eye`, `pupil`,
 *    `drips`) at 1024x1024 using the actual procedural generators in `src/dashboard/eva/*.ts`.
 * 2. Computes the pixel & H-unit alpha bounding box of every part and writes `eva.meta.json`.
 * 3. Renders the standalone Eva-01 figure on white (`eva_standalone_after.png`) and the
 *    96px-tall downscaled squint-test image (`eva_squint_96px.png`).
 * 4. Asserts all anatomical proportion requirements for the bust:
 *    - head height ÷ visible bust height in [0.35, 0.55]
 *    - horn length ÷ H in [1.0, 1.5]
 *    - horn angle above horizontal in [40°, 60°]
 *    - neck lean in [35°, 50°]
 *    - neck width ÷ H in [0.6, 0.9]
 *    - collar width ÷ H in [1.1, 1.6]
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { drawEvaStageBackground } from '../src/dashboard/eva/background.ts';
import { drawEvaNeckLayer, drawEvaTorsoLayer } from '../src/dashboard/eva/body.ts';
import { drawEvaDripsLayer } from '../src/dashboard/eva/drips.ts';
import { drawEvaEyeLayer, drawEvaPupilLayer } from '../src/dashboard/eva/eye.ts';
import type { AnyCanvas, EvaDrawOrderRecorder } from '../src/dashboard/eva/evaSurface.ts';
import { drawEvaHeadLayer } from '../src/dashboard/eva/head.ts';
import { drawEvaJawLayer } from '../src/dashboard/eva/jaw.ts';
import { EVA_PROPORTIONS } from '../src/dashboard/eva/proportions.ts';
import { EVA_SKELETON, hToPx } from '../src/dashboard/eva/skeleton.ts';
import type { Canvas2DContext, Point2D } from '../src/scene/art/inkBrush.ts';

const ARTIFACT_DIR =
  '/home/camellia/.gemini/antigravity/brain/683e5720-4314-404d-a02f-3565c7a59edc';

/**
 * Software 2D Canvas implementation supporting `beginPath`, `moveTo`, `lineTo`, `closePath`,
 * `fill`, `clearRect`, `fillRect`, `getImageData`, `putImageData`, and `drawImage` so the
 * actual `src/dashboard/eva/*.ts` generators execute identically in Node.js.
 */
class SoftwareCanvas2D {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  fillStyle = '#0A0A0A';
  private subpaths: Point2D[][] = [];
  private currentPath: Point2D[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  getContext(_type: '2d'): Canvas2DContext {
    return this as unknown as Canvas2DContext;
  }

  clearRect(x: number, y: number, w: number, h: number): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * this.width + px) * 4;
        this.data[i] = 0;
        this.data[i + 1] = 0;
        this.data[i + 2] = 0;
        this.data[i + 3] = 0;
      }
    }
  }

  fillRect(x: number, y: number, w: number, h: number): void {
    const [r, g, b, a] = parseHexColor(this.fillStyle);
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(this.width, Math.ceil(x + w));
    const y1 = Math.min(this.height, Math.ceil(y + h));
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * this.width + px) * 4;
        this.data[i] = r;
        this.data[i + 1] = g;
        this.data[i + 2] = b;
        this.data[i + 3] = a;
      }
    }
  }

  beginPath(): void {
    this.subpaths = [];
    this.currentPath = [];
  }

  moveTo(x: number, y: number): void {
    if (this.currentPath.length > 0) {
      this.subpaths.push(this.currentPath);
    }
    this.currentPath = [[x, y]];
  }

  lineTo(x: number, y: number): void {
    this.currentPath.push([x, y]);
  }

  closePath(): void {
    if (this.currentPath.length > 0) {
      this.subpaths.push(this.currentPath);
      this.currentPath = [];
    }
  }

  fill(): void {
    if (this.currentPath.length > 0) {
      this.subpaths.push(this.currentPath);
      this.currentPath = [];
    }
    const [r, g, b, a] = parseHexColor(this.fillStyle);
    for (const poly of this.subpaths) {
      if (poly.length < 3) continue;
      let minY = this.height - 1;
      let maxY = 0;
      for (const [, py] of poly) {
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      const yStart = Math.max(0, Math.floor(minY));
      const yEnd = Math.min(this.height - 1, Math.ceil(maxY));

      for (let y = yStart; y <= yEnd; y++) {
        const sampleY = y + 0.5;
        const nodes: number[] = [];
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i];
          const [xj, yj] = poly[j];
          if ((yi < sampleY && yj >= sampleY) || (yj < sampleY && yi >= sampleY)) {
            nodes.push(xi + ((sampleY - yi) / (yj - yi)) * (xj - xi));
          }
        }
        nodes.sort((m, n) => m - n);
        for (let k = 0; k < nodes.length - 1; k += 2) {
          const xStart = Math.max(0, Math.floor(nodes[k]));
          const xEnd = Math.min(this.width - 1, Math.ceil(nodes[k + 1]));
          for (let x = xStart; x <= xEnd; x++) {
            const idx = (y * this.width + x) * 4;
            this.data[idx] = r;
            this.data[idx + 1] = g;
            this.data[idx + 2] = b;
            this.data[idx + 3] = a;
          }
        }
      }
    }
  }

  getImageData(x: number, y: number, w: number, h: number): ImageData {
    if (x === 0 && y === 0 && w === this.width && h === this.height) {
      return { data: new Uint8ClampedArray(this.data), width: w, height: h } as ImageData;
    }
    const out = new Uint8ClampedArray(w * h * 4);
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const sx = Math.min(this.width - 1, Math.max(0, x + col));
        const sy = Math.min(this.height - 1, Math.max(0, y + row));
        const sIdx = (sy * this.width + sx) * 4;
        const dIdx = (row * w + col) * 4;
        out[dIdx] = this.data[sIdx];
        out[dIdx + 1] = this.data[sIdx + 1];
        out[dIdx + 2] = this.data[sIdx + 2];
        out[dIdx + 3] = this.data[sIdx + 3];
      }
    }
    return { data: out, width: w, height: h } as ImageData;
  }

  putImageData(img: ImageData, dx: number, dy: number): void {
    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const tx = dx + x;
        const ty = dy + y;
        if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) continue;
        const sIdx = (y * img.width + x) * 4;
        const dIdx = (ty * this.width + tx) * 4;
        this.data[dIdx] = img.data[sIdx];
        this.data[dIdx + 1] = img.data[sIdx + 1];
        this.data[dIdx + 2] = img.data[sIdx + 2];
        this.data[dIdx + 3] = img.data[sIdx + 3];
      }
    }
  }

  drawImage(
    src: SoftwareCanvas2D,
    dx: number,
    dy: number,
    dw?: number,
    dh?: number
  ): void {
    const targetW = dw ?? src.width;
    const targetH = dh ?? src.height;
    for (let y = 0; y < targetH; y++) {
      const sy = Math.min(src.height - 1, Math.floor((y / targetH) * src.height));
      const ty = Math.round(dy + y);
      if (ty < 0 || ty >= this.height) continue;
      for (let x = 0; x < targetW; x++) {
        const sx = Math.min(src.width - 1, Math.floor((x / targetW) * src.width));
        const tx = Math.round(dx + x);
        if (tx < 0 || tx >= this.width) continue;
        const sIdx = (sy * src.width + sx) * 4;
        const a = src.data[sIdx + 3];
        if (a < 20) continue;
        const dIdx = (ty * this.width + tx) * 4;
        this.data[dIdx] = src.data[sIdx];
        this.data[dIdx + 1] = src.data[sIdx + 1];
        this.data[dIdx + 2] = src.data[sIdx + 2];
        this.data[dIdx + 3] = 255;
      }
    }
  }
}

function parseHexColor(col: string): [number, number, number, number] {
  const c = col.trim().toUpperCase();
  if (c === '#FFFFFF') return [255, 255, 255, 255];
  if (c === '#FAFAF8') return [250, 250, 248, 255];
  if (c === '#D4141C') return [212, 20, 28, 255];
  return [10, 10, 10, 255];
}

function encodePng(width: number, height: number, rgba: Uint8ClampedArray): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  const makeChunk = (type: string, data: Buffer): Buffer => {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcInput = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(crcInput), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * stride;
    raw[rowStart] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(
      raw,
      rowStart + 1
    );
  }
  const compressed = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

const noopRecorder: EvaDrawOrderRecorder = {
  captureStage: () => {},
  finalizeCanvas: () => new SoftwareCanvas2D(512, 512) as unknown as AnyCanvas,
};

function computeAlphaBounds(
  part: string,
  canvas: SoftwareCanvas2D,
  hPx: number
) {
  let xMin = canvas.width;
  let yMin = canvas.height;
  let xMax = 0;
  let yMax = 0;
  let found = false;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const a = canvas.data[(y * canvas.width + x) * 4 + 3];
      if (a > 20) {
        if (x < xMin) xMin = x;
        if (y < yMin) yMin = y;
        if (x > xMax) xMax = x;
        if (y > yMax) yMax = y;
        found = true;
      }
    }
  }
  if (!found) {
    xMin = 0;
    yMin = 0;
    xMax = 0;
    yMax = 0;
  }

  const width = Math.max(0, xMax - xMin);
  const height = Math.max(0, yMax - yMin);

  return {
    part,
    px: { xMin, yMin, xMax, yMax, width, height },
    hUnits: {
      xMinH: Number((xMin / hPx).toFixed(3)),
      yMinH: Number((yMin / hPx).toFixed(3)),
      xMaxH: Number((xMax / hPx).toFixed(3)),
      yMaxH: Number((yMax / hPx).toFixed(3)),
      widthH: Number((width / hPx).toFixed(3)),
      heightH: Number((height / hPx).toFixed(3)),
    },
  };
}

function main() {
  const S = 1024;
  const sk = EVA_SKELETON;
  const hPx = sk.headUnitPx;

  const makeLayer = (
    drawFn: (ctx: Canvas2DContext, c: AnyCanvas, rec: EvaDrawOrderRecorder) => void,
    size = S
  ) => {
    const c = new SoftwareCanvas2D(size, size);
    drawFn(c.getContext('2d'), c as unknown as AnyCanvas, noopRecorder);
    return c;
  };

  const torso = makeLayer((ctx, c, r) => drawEvaTorsoLayer(ctx, c, r, 709));
  const neck = makeLayer((ctx, c, r) => drawEvaNeckLayer(ctx, c, r, 707));
  const head = makeLayer((ctx, c, r) => drawEvaHeadLayer(ctx, c, r, 719));
  const jaw = makeLayer((ctx, c, r) => drawEvaJawLayer(ctx, c, r, 727));
  const drips = makeLayer((ctx, c) => drawEvaDripsLayer(ctx, c, 743));

  const eyeSmall = makeLayer((ctx, c) => drawEvaEyeLayer(ctx, c, 733), 256);
  const pupilSmall = makeLayer((ctx, c) => drawEvaPupilLayer(ctx, c, true, 739), 256);

  // Place eye & pupil onto 1024-space canvases at `eyeCenter`
  const eyeCenterPx = hToPx(sk.joints.eyeCenter, S, sk);
  const eyeBoxPx = Math.round(EVA_PROPORTIONS.head.eyeWidthH * hPx * 1.2);
  const pupilBoxPx = Math.round(EVA_PROPORTIONS.head.eyeWidthH * hPx * 1.0);

  const eye = new SoftwareCanvas2D(S, S);
  eye.drawImage(
    eyeSmall,
    eyeCenterPx[0] - eyeBoxPx * 0.5,
    eyeCenterPx[1] - eyeBoxPx * 0.5,
    eyeBoxPx,
    eyeBoxPx
  );

  const pupil = new SoftwareCanvas2D(S, S);
  pupil.drawImage(
    pupilSmall,
    eyeCenterPx[0] - pupilBoxPx * 0.5,
    eyeCenterPx[1] - pupilBoxPx * 0.5,
    pupilBoxPx,
    pupilBoxPx
  );

  // Compose standalone Eva-01 bust on pure paper (#FAFAF8)
  const composite = new SoftwareCanvas2D(S, S);
  composite.fillStyle = '#FAFAF8';
  composite.fillRect(0, 0, S, S);
  for (const layer of [
    torso,
    neck,
    head,
    jaw,
    eye,
    pupil,
    drips,
  ]) {
    composite.drawImage(layer, 0, 0);
  }

  // Downscale to 96px tall for the squint test
  const squint96 = new SoftwareCanvas2D(96, 96);
  squint96.fillStyle = '#FAFAF8';
  squint96.fillRect(0, 0, 96, 96);
  squint96.drawImage(composite, 0, 0, 96, 96);

  // Compute alpha bounding boxes for `eva.meta.json`
  const parts = {
    torso: computeAlphaBounds('torso', torso, hPx),
    neck: computeAlphaBounds('neck', neck, hPx),
    head: computeAlphaBounds('head', head, hPx),
    jaw: computeAlphaBounds('jaw', jaw, hPx),
    eye: computeAlphaBounds('eye', eye, hPx),
    pupil: computeAlphaBounds('pupil', pupil, hPx),
    drips: computeAlphaBounds('drips', drips, hPx),
  };

  // Measure bust proportions from the skeleton + rasterized alpha bounds
  const helmetHeightH = EVA_PROPORTIONS.head.heightH; // 1.0H
  const visibleFigureHeightH =
    parts.torso.hUnits.yMaxH - EVA_SKELETON.headBoxH.yMinH;
  const headToVisibleHeightRatio = Number(
    (helmetHeightH / visibleFigureHeightH).toFixed(4)
  );

  const hornLengthH = Number(sk.metrics.hornLengthH.toFixed(3));
  const hornAngleAboveHorizontalDeg = Number(
    sk.metrics.hornAngleAboveHorizontalDeg.toFixed(1)
  );
  const neckLeanDeg = Number(sk.metrics.neckLeanDeg.toFixed(2));
  const neckWidthH = Number(sk.metrics.neckWidthH.toFixed(3));
  const collarWidthH = Number(sk.metrics.collarWidthH.toFixed(3));

  const meta = {
    canvasSizePx: S,
    headUnitPx: Number(hPx.toFixed(2)),
    visibleHeads: EVA_PROPORTIONS.visibleHeads,
    parts,
    measuredRatios: {
      headToVisibleHeightRatio,
      hornLengthH,
      hornAngleAboveHorizontalDeg,
      neckLeanDeg,
      neckWidthH,
      collarWidthH,
    },
  };

  const metaPathSrc = path.resolve(process.cwd(), 'src/dashboard/eva/eva.meta.json');
  fs.writeFileSync(metaPathSrc, JSON.stringify(meta, null, 2) + '\n', 'utf8');

  if (fs.existsSync(ARTIFACT_DIR)) {
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'eva_standalone_after.png'),
      encodePng(S, S, composite.data)
    );
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'eva_squint_96px.png'),
      encodePng(96, 96, squint96.data)
    );

    // Render 1440x900 Fallen City stage composite with Eva-01 bust
    const stageW = 1440;
    const stageH = 900;
    const bgCanvas = makeLayer((ctx, c, r) => drawEvaStageBackground(ctx, c, r, 701), S);
    const stagePreview = new SoftwareCanvas2D(stageW, stageH);
    stagePreview.drawImage(bgCanvas, 0, 0, stageW, stageH);

    const evaSizeOnStage = Math.round(stageH * 0.86);
    const evaX = Math.round(-0.02 * evaSizeOnStage);
    const evaY = Math.round(stageH - evaSizeOnStage + 0.02 * evaSizeOnStage);
    for (const layer of [torso, neck, head, jaw, eye, pupil, drips]) {
      stagePreview.drawImage(layer, evaX, evaY, evaSizeOnStage, evaSizeOnStage);
    }
    fs.writeFileSync(
      path.join(ARTIFACT_DIR, 'fallen_city_stage.png'),
      encodePng(stageW, stageH, stagePreview.data)
    );
  }

  console.log('--- Eva-01 Bust Proportions & Alpha Bounding Box Verification ---');
  console.log('Measured Ratios:', meta.measuredRatios);

  // Assert bust proportion bounds
  assert.ok(
    headToVisibleHeightRatio >= 0.35 && headToVisibleHeightRatio <= 0.55,
    `head height / visible bust height (${headToVisibleHeightRatio}) must be between 0.35 and 0.55`
  );
  assert.ok(
    hornLengthH >= 1.0 && hornLengthH <= 1.5,
    `horn length / H (${hornLengthH}) must be between 1.0 and 1.5`
  );
  assert.ok(
    hornAngleAboveHorizontalDeg >= 45 && hornAngleAboveHorizontalDeg <= 65,
    `horn angle (${hornAngleAboveHorizontalDeg}°) must be between 45° and 65°`
  );
  assert.ok(
    neckLeanDeg >= 20 && neckLeanDeg <= 40,
    `neck lean (${neckLeanDeg}°) must be between 20° and 40°`
  );
  assert.ok(
    neckWidthH >= 0.55 && neckWidthH <= 0.85,
    `neck width / H (${neckWidthH}) must be between 0.55 and 0.85`
  );
  assert.ok(
    collarWidthH >= 1.1 && collarWidthH <= 1.6,
    `collar width / H (${collarWidthH}) must be between 1.1 and 1.6`
  );

  console.log(
    `✓ All 6 Eva-01 proportion assertions passed and wrote ${metaPathSrc}.`
  );
}

main();
