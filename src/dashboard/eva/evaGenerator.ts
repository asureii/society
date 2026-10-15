import * as THREE from 'three';
import { drawHandInkedOrb } from '../../scene/art/orb.ts';
import { createRng } from '../../scene/art/rng.ts';
import { useAppStore } from '../../store/useAppStore.ts';
import { drawEvaStageBackground, drawHandInkedRoadPuddle } from './background.ts';
import { drawEvaNeckLayer, drawEvaTorsoLayer } from './body.ts';
import { drawEvaDripsLayer } from './drips.ts';
import { drawEvaEyeLayer, drawEvaPupilLayer } from './eye.ts';
import { createEvaDrawOrderRecorder, createSurface, type AnyCanvas } from './evaSurface.ts';
import type { EvaWorkerRequest, EvaWorkerResponse } from './evaWorker.ts';
import EvaWorkerConstructor from './evaWorker?worker';
import { drawEvaHeadLayer } from './head.ts';
import { drawEvaJawLayer } from './jaw.ts';
import { EVA_PROPORTIONS } from './proportions.ts';
import { EVA_SKELETON } from './skeleton.ts';

export type BitmapOrCanvas = ImageBitmap | HTMLCanvasElement | OffscreenCanvas;

export interface EvaPartAlphaBounds {
  part: string;
  px: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
    width: number;
    height: number;
  };
  hUnits: {
    xMinH: number;
    yMinH: number;
    xMaxH: number;
    yMaxH: number;
    widthH: number;
    heightH: number;
  };
}

export interface EvaMetaJson {
  canvasSizePx: number;
  headUnitPx: number;
  visibleHeads: number;
  parts: Record<string, EvaPartAlphaBounds>;
  measuredRatios: {
    headToVisibleHeightRatio: number;
    hornLengthH: number;
    hornAngleAboveHorizontalDeg: number;
    neckLeanDeg: number;
    neckWidthH: number;
    collarWidthH: number;
  };
}

export interface EvaCpuBitmapCache {
  mainSize: number;
  backgroundBitmap: BitmapOrCanvas;
  backgroundOrderBitmap: BitmapOrCanvas;
  torsoBitmap: BitmapOrCanvas;
  torsoOrderBitmap: BitmapOrCanvas;
  neckBitmap: BitmapOrCanvas;
  neckOrderBitmap: BitmapOrCanvas;
  headBitmap: BitmapOrCanvas;
  headOrderBitmap: BitmapOrCanvas;
  jawBitmap: BitmapOrCanvas;
  jawOrderBitmap: BitmapOrCanvas;
  eyeBitmap: BitmapOrCanvas;
  pupilBitmap: BitmapOrCanvas;
  dripsBitmap: BitmapOrCanvas;
  orbBitmap: BitmapOrCanvas;
  puddleBitmap: BitmapOrCanvas;
  memoryBytes: number;
}

export interface EvaGpuTextureBundle {
  backgroundTex: THREE.Texture;
  backgroundOrderTex: THREE.Texture;
  torsoTex: THREE.Texture;
  torsoOrderTex: THREE.Texture;
  neckTex: THREE.Texture;
  neckOrderTex: THREE.Texture;
  headTex: THREE.Texture;
  headOrderTex: THREE.Texture;
  jawTex: THREE.Texture;
  jawOrderTex: THREE.Texture;
  eyeTex: THREE.Texture;
  pupilTex: THREE.Texture;
  dripsTex: THREE.Texture;
  orbTex: THREE.Texture;
  puddleTex: THREE.Texture;
  memoryBytes: number;
  gpuUploaded: boolean;
}

let cachedCpuBitmaps: EvaCpuBitmapCache | null = null;
let activeGpuBundle: EvaGpuTextureBundle | null = null;
let inFlightPromise: Promise<EvaCpuBitmapCache> | null = null;
let listeners: Array<() => void> = [];

export function subscribeEvaArtReady(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function notifyEvaArtReady() {
  listeners.forEach((cb) => cb());
}

function generateOrbCanvas(size = 256): AnyCanvas {
  const { canvas, ctx } = createSurface(size, size, false);
  ctx.clearRect(0, 0, size, size);
  const rng = createRng(809);
  const sRng = createRng(811);
  drawHandInkedOrb(ctx, size * 0.5, size * 0.5, size * 0.36, size * 0.36, rng, sRng, {
    halo: true,
    strokeScale: 1.0,
  });
  return canvas;
}

export function generatePuddleCanvas(w = 256, h = 128): AnyCanvas {
  const { canvas, ctx } = createSurface(w, h, false);
  ctx.clearRect(0, 0, w, h);
  drawHandInkedRoadPuddle(ctx, w * 0.5, h * 0.5, w * 0.38, h * 0.22, 715);
  return canvas;
}

function computeTotalMemoryBytes(isMobile: boolean): number {
  const bgSize = isMobile ? 768 : 1024;
  const primarySize = isMobile ? 512 : 768;
  const dripsSize = 512;
  const eyeSize = 256;
  const puddleW = 256;
  const puddleH = 128;

  const withOrder = (sz: number) => sz * sz * 4 + (sz / 2) * (sz / 2) * 4;
  return (
    withOrder(bgSize) +
    4 * withOrder(primarySize) +
    dripsSize * dripsSize * 4 +
    3 * (eyeSize * eyeSize * 4) +
    puddleW * puddleH * 4
  );
}

function generateEvaOnMainThread(isMobile: boolean, eyeGlint: boolean): EvaCpuBitmapCache {
  const bgSize = isMobile ? 768 : 1024;
  const primarySize = isMobile ? 512 : 768;
  const dripsSize = 512;
  const eyeSize = 256;

  const makeWithOrder = (
    size: number,
    drawFn: (
      ctx: ReturnType<typeof createSurface>['ctx'],
      c: AnyCanvas,
      rec: ReturnType<typeof createEvaDrawOrderRecorder>
    ) => void
  ) => {
    const { canvas, ctx } = createSurface(size, size, false);
    const rec = createEvaDrawOrderRecorder(size, size, false);
    drawFn(ctx, canvas, rec);
    return {
      bitmap: canvas,
      orderBitmap: rec.finalizeCanvas(),
    };
  };

  const makeSimple = (
    size: number,
    drawFn: (ctx: ReturnType<typeof createSurface>['ctx'], c: AnyCanvas) => void
  ) => {
    const { canvas, ctx } = createSurface(size, size, false);
    drawFn(ctx, canvas);
    return canvas;
  };

  const bg = makeWithOrder(bgSize, (ctx, c, rec) => drawEvaStageBackground(ctx, c, rec, 701));
  const torso = makeWithOrder(primarySize, (ctx, c, rec) => drawEvaTorsoLayer(ctx, c, rec, 709));
  const neck = makeWithOrder(primarySize, (ctx, c, rec) => drawEvaNeckLayer(ctx, c, rec, 707));
  const head = makeWithOrder(primarySize, (ctx, c, rec) => drawEvaHeadLayer(ctx, c, rec, 719));
  const jaw = makeWithOrder(primarySize, (ctx, c, rec) => drawEvaJawLayer(ctx, c, rec, 727));
  const eyeBitmap = makeSimple(eyeSize, (ctx, c) => drawEvaEyeLayer(ctx, c, 733));
  const pupilBitmap = makeSimple(eyeSize, (ctx, c) =>
    drawEvaPupilLayer(ctx, c, eyeGlint, 739)
  );
  const dripsBitmap = makeSimple(dripsSize, (ctx, c) => drawEvaDripsLayer(ctx, c, 743));
  const orbBitmap = generateOrbCanvas(256);
  const puddleBitmap = generatePuddleCanvas(256, 128);

  return {
    mainSize: bgSize,
    backgroundBitmap: bg.bitmap,
    backgroundOrderBitmap: bg.orderBitmap,
    torsoBitmap: torso.bitmap,
    torsoOrderBitmap: torso.orderBitmap,
    neckBitmap: neck.bitmap,
    neckOrderBitmap: neck.orderBitmap,
    headBitmap: head.bitmap,
    headOrderBitmap: head.orderBitmap,
    jawBitmap: jaw.bitmap,
    jawOrderBitmap: jaw.orderBitmap,
    eyeBitmap,
    pupilBitmap,
    dripsBitmap,
    orbBitmap,
    puddleBitmap,
    memoryBytes: computeTotalMemoryBytes(isMobile),
  };
}

export function ensureEvaArtBitmaps(
  isMobile = false,
  eyeGlint = true
): Promise<EvaCpuBitmapCache> {
  if (cachedCpuBitmaps) {
    return Promise.resolve(cachedCpuBitmaps);
  }
  if (inFlightPromise) {
    return inFlightPromise;
  }

  const canUseWorker =
    typeof window !== 'undefined' &&
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined';

  if (!canUseWorker) {
    const built = generateEvaOnMainThread(isMobile, eyeGlint);
    cachedCpuBitmaps = built;
    useAppStore.getState().setDashboardReady(true);
    notifyEvaArtReady();
    return Promise.resolve(built);
  }

  inFlightPromise = new Promise<EvaCpuBitmapCache>((resolve) => {
    let settled = false;
    const fallback = () => {
      if (settled) return;
      settled = true;
      const built = generateEvaOnMainThread(isMobile, eyeGlint);
      cachedCpuBitmaps = built;
      inFlightPromise = null;
      useAppStore.getState().setDashboardReady(true);
      notifyEvaArtReady();
      resolve(built);
    };

    try {
      const worker = new EvaWorkerConstructor();
      const timeoutId = window.setTimeout(() => {
        worker.terminate();
        fallback();
      }, 650);

      worker.onmessage = (ev: MessageEvent<EvaWorkerResponse>) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        worker.terminate();

        const data = ev.data;
        const built: EvaCpuBitmapCache = {
          mainSize: isMobile ? 768 : 1024,
          backgroundBitmap: data.backgroundBitmap,
          backgroundOrderBitmap: data.backgroundOrderBitmap,
          torsoBitmap: data.torsoBitmap,
          torsoOrderBitmap: data.torsoOrderBitmap,
          neckBitmap: data.neckBitmap,
          neckOrderBitmap: data.neckOrderBitmap,
          headBitmap: data.headBitmap,
          headOrderBitmap: data.headOrderBitmap,
          jawBitmap: data.jawBitmap,
          jawOrderBitmap: data.jawOrderBitmap,
          eyeBitmap: data.eyeBitmap,
          pupilBitmap: data.pupilBitmap,
          dripsBitmap: data.dripsBitmap,
          orbBitmap: generateOrbCanvas(256),
          puddleBitmap: data.puddleBitmap,
          memoryBytes: computeTotalMemoryBytes(isMobile),
        };
        cachedCpuBitmaps = built;
        inFlightPromise = null;
        useAppStore.getState().setDashboardReady(true);
        notifyEvaArtReady();
        resolve(built);
      };

      worker.onerror = () => {
        window.clearTimeout(timeoutId);
        worker.terminate();
        fallback();
      };

      const req: EvaWorkerRequest = { id: 1, eyeGlint, isMobile };
      worker.postMessage(req);
    } catch {
      fallback();
    }
  });

  return inFlightPromise;
}

function makeThreeTexture(source: BitmapOrCanvas, isLinearOrder = false): THREE.CanvasTexture {
  let canvas: HTMLCanvasElement;
  if (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) {
    canvas = source;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(source as CanvasImageSource, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isLinearOrder ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.flipY = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function getOrUploadEvaGpuBundle(
  renderer?: THREE.WebGLRenderer | null
): EvaGpuTextureBundle | null {
  if (!cachedCpuBitmaps) return null;
  if (!activeGpuBundle) {
    activeGpuBundle = {
      backgroundTex: makeThreeTexture(cachedCpuBitmaps.backgroundBitmap, false),
      backgroundOrderTex: makeThreeTexture(cachedCpuBitmaps.backgroundOrderBitmap, true),
      torsoTex: makeThreeTexture(cachedCpuBitmaps.torsoBitmap, false),
      torsoOrderTex: makeThreeTexture(cachedCpuBitmaps.torsoOrderBitmap, true),
      neckTex: makeThreeTexture(cachedCpuBitmaps.neckBitmap, false),
      neckOrderTex: makeThreeTexture(cachedCpuBitmaps.neckOrderBitmap, true),
      headTex: makeThreeTexture(cachedCpuBitmaps.headBitmap, false),
      headOrderTex: makeThreeTexture(cachedCpuBitmaps.headOrderBitmap, true),
      jawTex: makeThreeTexture(cachedCpuBitmaps.jawBitmap, false),
      jawOrderTex: makeThreeTexture(cachedCpuBitmaps.jawOrderBitmap, true),
      eyeTex: makeThreeTexture(cachedCpuBitmaps.eyeBitmap, false),
      pupilTex: makeThreeTexture(cachedCpuBitmaps.pupilBitmap, false),
      dripsTex: makeThreeTexture(cachedCpuBitmaps.dripsBitmap, false),
      orbTex: makeThreeTexture(cachedCpuBitmaps.orbBitmap, false),
      puddleTex: makeThreeTexture(cachedCpuBitmaps.puddleBitmap, false),
      memoryBytes: cachedCpuBitmaps.memoryBytes,
      gpuUploaded: false,
    };
  }
  if (renderer && !activeGpuBundle.gpuUploaded) {
    const allTex: THREE.Texture[] = [
      activeGpuBundle.backgroundTex,
      activeGpuBundle.backgroundOrderTex,
      activeGpuBundle.torsoTex,
      activeGpuBundle.torsoOrderTex,
      activeGpuBundle.neckTex,
      activeGpuBundle.neckOrderTex,
      activeGpuBundle.headTex,
      activeGpuBundle.headOrderTex,
      activeGpuBundle.jawTex,
      activeGpuBundle.jawOrderTex,
      activeGpuBundle.eyeTex,
      activeGpuBundle.pupilTex,
      activeGpuBundle.dripsTex,
      activeGpuBundle.orbTex,
      activeGpuBundle.puddleTex,
    ];
    for (const t of allTex) {
      renderer.initTexture(t);
    }
    activeGpuBundle.gpuUploaded = true;
  }
  return activeGpuBundle;
}

export function disposeEvaGpuTextures(): void {
  if (!activeGpuBundle) return;
  activeGpuBundle.backgroundTex.dispose();
  activeGpuBundle.backgroundOrderTex.dispose();
  activeGpuBundle.torsoTex.dispose();
  activeGpuBundle.torsoOrderTex.dispose();
  activeGpuBundle.neckTex.dispose();
  activeGpuBundle.neckOrderTex.dispose();
  activeGpuBundle.headTex.dispose();
  activeGpuBundle.headOrderTex.dispose();
  activeGpuBundle.jawTex.dispose();
  activeGpuBundle.jawOrderTex.dispose();
  activeGpuBundle.eyeTex.dispose();
  activeGpuBundle.pupilTex.dispose();
  activeGpuBundle.dripsTex.dispose();
  activeGpuBundle.orbTex.dispose();
  activeGpuBundle.puddleTex.dispose();
  activeGpuBundle = null;
}

export function getEvaMemoryUsageBytes(): number {
  return activeGpuBundle?.memoryBytes ?? cachedCpuBitmaps?.memoryBytes ?? 0;
}

export function buildEvaMetaSnapshot(): EvaMetaJson {
  const sk = EVA_SKELETON;
  const hPx = sk.headUnitPx;
  const toBounds = (
    part: string,
    xMinH: number,
    yMinH: number,
    xMaxH: number,
    yMaxH: number
  ): EvaPartAlphaBounds => {
    const xMin = Math.round(xMinH * hPx);
    const yMin = Math.round(yMinH * hPx);
    const xMax = Math.round(xMaxH * hPx);
    const yMax = Math.round(yMaxH * hPx);
    return {
      part,
      px: {
        xMin,
        yMin,
        xMax,
        yMax,
        width: xMax - xMin,
        height: yMax - yMin,
      },
      hUnits: {
        xMinH: Number(xMinH.toFixed(3)),
        yMinH: Number(yMinH.toFixed(3)),
        xMaxH: Number(xMaxH.toFixed(3)),
        yMaxH: Number(yMaxH.toFixed(3)),
        widthH: Number((xMaxH - xMinH).toFixed(3)),
        heightH: Number((yMaxH - yMinH).toFixed(3)),
      },
    };
  };

  const { headBoxH, joints } = sk;
  const p = EVA_PROPORTIONS;

  const parts: Record<string, EvaPartAlphaBounds> = {
    torso: toBounds(
      'torso',
      0.0,
      joints.napeBot[1],
      joints.collarCenter[0] + 0.36,
      joints.chestCropCenter[1]
    ),
    neck: toBounds(
      'neck',
      joints.napeTop[0] - 0.14,
      joints.neckTop[1],
      joints.throatTop[0] + 0.12,
      joints.throatBot[1]
    ),
    head: toBounds(
      'head',
      headBoxH.xMinH,
      headBoxH.yMinH,
      headBoxH.xMaxH,
      headBoxH.yMaxH
    ),
    horn: toBounds(
      'horn',
      joints.hornBase[0],
      joints.hornTip[1],
      joints.hornTip[0] + 0.04,
      joints.hornBase[1]
    ),
    jaw: toBounds(
      'jaw',
      joints.jawHinge[0],
      joints.jawHinge[1],
      joints.jawTip[0],
      joints.jawTip[1] + 0.08
    ),
    eye: toBounds(
      'eye',
      joints.eyeCenter[0] - p.head.eyeWidthH * 0.5,
      joints.eyeCenter[1] - p.head.eyeHeightH * 0.5,
      joints.eyeCenter[0] + p.head.eyeWidthH * 0.5,
      joints.eyeCenter[1] + p.head.eyeHeightH * 0.5
    ),
    pupil: toBounds(
      'pupil',
      joints.eyeCenter[0] - 0.06,
      joints.eyeCenter[1] - 0.06,
      joints.eyeCenter[0] + 0.06,
      joints.eyeCenter[1] + 0.06
    ),
    drips: toBounds(
      'drips',
      joints.jawTip[0] - 0.44,
      joints.jawTip[1] - 0.14,
      joints.jawTip[0],
      joints.jawTip[1] + 0.52
    ),
  };

  const visibleFigureHeightH = Number(
    (parts.torso.hUnits.yMaxH - parts.head.hUnits.yMinH).toFixed(3)
  );

  return {
    canvasSizePx: p.canvasSizePx,
    headUnitPx: Number(hPx.toFixed(2)),
    visibleHeads: p.visibleHeads,
    parts,
    measuredRatios: {
      headToVisibleHeightRatio: Number(
        (parts.head.hUnits.heightH / visibleFigureHeightH).toFixed(4)
      ),
      hornLengthH: Number(sk.metrics.hornLengthH.toFixed(3)),
      hornAngleAboveHorizontalDeg: Number(sk.metrics.hornAngleAboveHorizontalDeg.toFixed(1)),
      neckLeanDeg: Number(sk.metrics.neckLeanDeg.toFixed(1)),
      neckWidthH: Number(sk.metrics.neckWidthH.toFixed(3)),
      collarWidthH: Number(sk.metrics.collarWidthH.toFixed(3)),
    },
  };
}

export const EVA_META: EvaMetaJson = buildEvaMetaSnapshot();
