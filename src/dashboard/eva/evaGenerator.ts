import * as THREE from 'three';
import { drawHandInkedOrb } from '../../scene/art/orb';
import { createRng } from '../../scene/art/rng';
import { useAppStore } from '../../store/useAppStore';
import { drawEvaStageBackground } from './background';
import { drawEvaBodyLayer } from './body';
import { drawEvaDripsLayer } from './drips';
import { drawEvaEyeLayer, drawEvaPupilLayer } from './eye';
import { createEvaDrawOrderRecorder, createSurface, type AnyCanvas } from './evaSurface';
import type { EvaWorkerRequest, EvaWorkerResponse } from './evaWorker';
import { drawEvaHeadLayer } from './head';
import { drawEvaJawLayer } from './jaw';

export type BitmapOrCanvas = ImageBitmap | HTMLCanvasElement | OffscreenCanvas;

export interface EvaCpuBitmapCache {
  mainSize: number;
  backgroundBitmap: BitmapOrCanvas;
  backgroundOrderBitmap: BitmapOrCanvas;
  bodyBitmap: BitmapOrCanvas;
  bodyOrderBitmap: BitmapOrCanvas;
  headBitmap: BitmapOrCanvas;
  headOrderBitmap: BitmapOrCanvas;
  jawBitmap: BitmapOrCanvas;
  jawOrderBitmap: BitmapOrCanvas;
  eyeBitmap: BitmapOrCanvas;
  pupilBitmap: BitmapOrCanvas;
  dripsBitmap: BitmapOrCanvas;
  orbBitmap: BitmapOrCanvas;
  memoryBytes: number;
}

export interface EvaGpuTextureBundle {
  backgroundTex: THREE.Texture;
  backgroundOrderTex: THREE.Texture;
  bodyTex: THREE.Texture;
  bodyOrderTex: THREE.Texture;
  headTex: THREE.Texture;
  headOrderTex: THREE.Texture;
  jawTex: THREE.Texture;
  jawOrderTex: THREE.Texture;
  eyeTex: THREE.Texture;
  pupilTex: THREE.Texture;
  dripsTex: THREE.Texture;
  orbTex: THREE.Texture;
  memoryBytes: number;
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

function generateEvaOnMainThread(isMobile: boolean, eyeGlint: boolean): EvaCpuBitmapCache {
  const mainSize = isMobile ? 768 : 1024;
  const orderSize = Math.floor(mainSize / 2);
  const dripsSize = 512;
  const eyeSize = 256;

  const makeWithOrder = (
    drawFn: (
      ctx: ReturnType<typeof createSurface>['ctx'],
      c: AnyCanvas,
      rec: ReturnType<typeof createEvaDrawOrderRecorder>
    ) => void
  ) => {
    const { canvas, ctx } = createSurface(mainSize, mainSize, false);
    const rec = createEvaDrawOrderRecorder(mainSize, mainSize, false);
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

  const bg = makeWithOrder((ctx, c, rec) => drawEvaStageBackground(ctx, c, rec, 701));
  const body = makeWithOrder((ctx, c, rec) => drawEvaBodyLayer(ctx, c, rec, 709));
  const head = makeWithOrder((ctx, c, rec) => drawEvaHeadLayer(ctx, c, rec, 719));
  const jaw = makeWithOrder((ctx, c, rec) => drawEvaJawLayer(ctx, c, rec, 727));
  const eyeBitmap = makeSimple(eyeSize, (ctx, c) => drawEvaEyeLayer(ctx, c, 733));
  const pupilBitmap = makeSimple(eyeSize, (ctx, c) =>
    drawEvaPupilLayer(ctx, c, eyeGlint, 739)
  );
  const dripsBitmap = makeSimple(dripsSize, (ctx, c) => drawEvaDripsLayer(ctx, c, 743));
  const orbBitmap = generateOrbCanvas(256);

  const memoryBytes =
    4 * (mainSize * mainSize * 4 + orderSize * orderSize * 4) +
    dripsSize * dripsSize * 4 +
    3 * (eyeSize * eyeSize * 4);

  return {
    mainSize,
    backgroundBitmap: bg.bitmap,
    backgroundOrderBitmap: bg.orderBitmap,
    bodyBitmap: body.bitmap,
    bodyOrderBitmap: body.orderBitmap,
    headBitmap: head.bitmap,
    headOrderBitmap: head.orderBitmap,
    jawBitmap: jaw.bitmap,
    jawOrderBitmap: jaw.orderBitmap,
    eyeBitmap,
    pupilBitmap,
    dripsBitmap,
    orbBitmap,
    memoryBytes,
  };
}

/**
 * Generates or returns the cached CPU ImageBitmaps for the Eva-01 layered rig.
 * Runs inside `evaWorker.ts` (`OffscreenCanvas` -> `ImageBitmap`) when available,
 * with automatic fallback to main-thread canvas generation.
 */
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
      const worker = new Worker(new URL('./evaWorker.ts', import.meta.url), {
        type: 'module',
      });
      const timeoutId = window.setTimeout(() => {
        worker.terminate();
        fallback();
      }, 2200);

      worker.onmessage = (ev: MessageEvent<EvaWorkerResponse>) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        worker.terminate();

        const mainSize = isMobile ? 768 : 1024;
        const orderSize = Math.floor(mainSize / 2);
        const memoryBytes =
          4 * (mainSize * mainSize * 4 + orderSize * orderSize * 4) +
          512 * 512 * 4 +
          3 * (256 * 256 * 4);

        const data = ev.data;
        const built: EvaCpuBitmapCache = {
          mainSize,
          backgroundBitmap: data.backgroundBitmap,
          backgroundOrderBitmap: data.backgroundOrderBitmap,
          bodyBitmap: data.bodyBitmap,
          bodyOrderBitmap: data.bodyOrderBitmap,
          headBitmap: data.headBitmap,
          headOrderBitmap: data.headOrderBitmap,
          jawBitmap: data.jawBitmap,
          jawOrderBitmap: data.jawOrderBitmap,
          eyeBitmap: data.eyeBitmap,
          pupilBitmap: data.pupilBitmap,
          dripsBitmap: data.dripsBitmap,
          orbBitmap: generateOrbCanvas(256),
          memoryBytes,
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
      bodyTex: makeThreeTexture(cachedCpuBitmaps.bodyBitmap, false),
      bodyOrderTex: makeThreeTexture(cachedCpuBitmaps.bodyOrderBitmap, true),
      headTex: makeThreeTexture(cachedCpuBitmaps.headBitmap, false),
      headOrderTex: makeThreeTexture(cachedCpuBitmaps.headOrderBitmap, true),
      jawTex: makeThreeTexture(cachedCpuBitmaps.jawBitmap, false),
      jawOrderTex: makeThreeTexture(cachedCpuBitmaps.jawOrderBitmap, true),
      eyeTex: makeThreeTexture(cachedCpuBitmaps.eyeBitmap, false),
      pupilTex: makeThreeTexture(cachedCpuBitmaps.pupilBitmap, false),
      dripsTex: makeThreeTexture(cachedCpuBitmaps.dripsBitmap, false),
      orbTex: makeThreeTexture(cachedCpuBitmaps.orbBitmap, false),
      memoryBytes: cachedCpuBitmaps.memoryBytes,
    };
  }
  if (renderer) {
    renderer.initTexture(activeGpuBundle.backgroundTex);
    renderer.initTexture(activeGpuBundle.backgroundOrderTex);
    renderer.initTexture(activeGpuBundle.bodyTex);
    renderer.initTexture(activeGpuBundle.bodyOrderTex);
    renderer.initTexture(activeGpuBundle.headTex);
    renderer.initTexture(activeGpuBundle.headOrderTex);
    renderer.initTexture(activeGpuBundle.jawTex);
    renderer.initTexture(activeGpuBundle.jawOrderTex);
    renderer.initTexture(activeGpuBundle.eyeTex);
    renderer.initTexture(activeGpuBundle.pupilTex);
    renderer.initTexture(activeGpuBundle.dripsTex);
    renderer.initTexture(activeGpuBundle.orbTex);
  }
  return activeGpuBundle;
}

/**
 * Disposes the GPU textures when leaving `/dashboard` while keeping `cachedCpuBitmaps`
 * in memory so returning to `/dashboard` re-uploads without re-running the worker.
 */
export function disposeEvaGpuTextures(): void {
  if (!activeGpuBundle) return;
  activeGpuBundle.backgroundTex.dispose();
  activeGpuBundle.backgroundOrderTex.dispose();
  activeGpuBundle.bodyTex.dispose();
  activeGpuBundle.bodyOrderTex.dispose();
  activeGpuBundle.headTex.dispose();
  activeGpuBundle.headOrderTex.dispose();
  activeGpuBundle.jawTex.dispose();
  activeGpuBundle.jawOrderTex.dispose();
  activeGpuBundle.eyeTex.dispose();
  activeGpuBundle.pupilTex.dispose();
  activeGpuBundle.dripsTex.dispose();
  activeGpuBundle.orbTex.dispose();
  activeGpuBundle = null;
}

export function getEvaMemoryUsageBytes(): number {
  return activeGpuBundle?.memoryBytes ?? cachedCpuBitmaps?.memoryBytes ?? 0;
}
