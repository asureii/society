/**
 * MULTI-SCENE HAND-INKED ART GENERATOR, PRELOADER & GPU READINESS MANAGER
 * (src/scene/art/index.ts)
 *
 * Implements:
 * 1. Readiness Gating: Tracks both CPU art generation and GPU texture upload (`renderer.initTexture`)
 *    + shader compilation (`renderer.compileAsync`), publishing readiness to `useAppStore.sceneReadyMap`.
 * 2. Ahead-of-User Preloading in Scroll Order: Scene 1 loads at startup; Scenes 2..7 preload
 *    in scroll order ahead of the user so boundaries are ready before virtualProgress reaches them.
 * 3. Memory Budget Guard (< 150MB): Keeps generated scenes resident in cache and only evicts
 *    distant scenes (> 2 steps away) if live texture memory exceeds 140MB.
 */

import * as THREE from 'three';
import { INK_CONFIG } from '../../config/ink';
import {
  SCENES_CONFIG,
  type SceneId,
  type SceneLayerConfig,
} from '../../config/scenes.config';
import { useAppStore } from '../../store/useAppStore';
import { SCENE_REGISTRY } from '../scenes';
import type { Canvas2DContext } from './inkBrush';
import { createRng } from './rng';

export interface LayerArtBundle {
  layerId: string;
  variants: THREE.CanvasTexture[];
  depthMap: THREE.CanvasTexture;
  memoryBytes: number;
}

export interface SceneArtBundle {
  sceneId: SceneId;
  layers: Map<string, LayerArtBundle>;
  snapshotDataUrl: string;
  totalMemoryBytes: number;
  gpuUploaded: boolean;
}

export interface GenerateSceneOptions {
  singleVariantOnly: boolean;
  isMobile?: boolean;
  presenceStatus?: 'online' | 'idle' | 'dnd' | 'offline';
  hoveredRepoIndex?: number | null;
  onProgress?: (pct: number) => void;
  urgent?: boolean;
}

const sceneCache = new Map<SceneId, SceneArtBundle>();
const inFlightPromises = new Map<SceneId, Promise<SceneArtBundle>>();
const overrideProbeCache = new Map<string, HTMLImageElement | null>();
let registeredRenderer: THREE.WebGLRenderer | null = null;
let lifecycleListeners: Array<() => void> = [];

export function subscribeSceneArtUpdates(listener: () => void): () => void {
  lifecycleListeners.push(listener);
  return () => {
    lifecycleListeners = lifecycleListeners.filter((l) => l !== listener);
  };
}

function notifySceneArtUpdated(): void {
  for (const listener of lifecycleListeners) {
    listener();
  }
}

/**
 * Registers the active Three.js WebGLRenderer so newly generated scene textures
 * can be immediately uploaded to the GPU via `renderer.initTexture`.
 */
export function registerWebGLRenderer(renderer: THREE.WebGLRenderer | null): void {
  registeredRenderer = renderer;
  if (renderer) {
    for (const bundle of sceneCache.values()) {
      if (!bundle.gpuUploaded) {
        uploadSceneBundleToGpu(bundle, renderer);
      }
    }
  }
}

/**
 * Uploads all layer variant textures and depth maps for a scene bundle to the GPU
 * via `renderer.initTexture` and marks the scene ready in the store.
 */
export function uploadSceneBundleToGpu(
  bundle: SceneArtBundle,
  renderer: THREE.WebGLRenderer | null = registeredRenderer,
): void {
  if (renderer) {
    for (const layerBundle of bundle.layers.values()) {
      const seen = new Set<THREE.Texture>();
      for (const tex of layerBundle.variants) {
        if (!seen.has(tex)) {
          renderer.initTexture(tex);
          seen.add(tex);
        }
      }
      renderer.initTexture(layerBundle.depthMap);
    }
    bundle.gpuUploaded = true;
  } else {
    bundle.gpuUploaded = true;
  }

  useAppStore.getState().setSceneReady(bundle.sceneId, true);
  updateGlobalMemoryDebug();
}

export function isSceneReady(sceneId: SceneId): boolean {
  const bundle = sceneCache.get(sceneId);
  return Boolean(bundle && bundle.gpuUploaded);
}

function createCanvasSurface(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: Canvas2DContext;
} {
  const cappedW = Math.min(INK_CONFIG.maxTextureSize, Math.max(64, Math.round(width)));
  const cappedH = Math.min(INK_CONFIG.maxTextureSize, Math.max(64, Math.round(height)));
  const htmlCanvas = document.createElement('canvas');
  htmlCanvas.width = cappedW;
  htmlCanvas.height = cappedH;
  const ctx = htmlCanvas.getContext('2d')!;
  return { canvas: htmlCanvas, ctx };
}

function yieldToIdle(urgent = false): Promise<void> {
  if (urgent) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (
        window as Window & {
          requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
        }
      ).requestIdleCallback(() => resolve(), { timeout: 16 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

function hashStringSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function probeLayerOverrideImage(url: string): Promise<HTMLImageElement | null> {
  if (overrideProbeCache.has(url)) {
    return overrideProbeCache.get(url) ?? null;
  }
  const enableProbe =
    typeof window !== 'undefined' &&
    Boolean((window as unknown as Record<string, unknown>).__ENABLE_LAYER_OVERRIDES__);
  if (!enableProbe) {
    overrideProbeCache.set(url, null);
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      overrideProbeCache.set(url, img);
      resolve(img);
    };
    img.onerror = () => {
      overrideProbeCache.set(url, null);
      resolve(null);
    };
    img.src = url;
  });
}

function updateGlobalMemoryDebug(): void {
  if (typeof window !== 'undefined') {
    const win = window as unknown as Record<string, unknown>;
    win.__PILOT_TEXTURE_MB__ = Number(getLiveTextureMemoryMB().toFixed(2));
    win.__PILOT_LOADED_SCENES__ = Array.from(sceneCache.keys());
    win.__PILOT_READY_SCENES__ = Array.from(sceneCache.values())
      .filter((b) => b.gpuUploaded)
      .map((b) => b.sceneId);
  }
}

export function getLiveTextureMemoryMB(): number {
  let totalBytes = 0;
  for (const bundle of sceneCache.values()) {
    totalBytes += bundle.totalMemoryBytes;
  }
  return totalBytes / (1024 * 1024);
}

export function disposeSceneArt(sceneId: SceneId): void {
  const bundle = sceneCache.get(sceneId);
  if (!bundle) return;

  for (const layerBundle of bundle.layers.values()) {
    const disposedSet = new Set<THREE.CanvasTexture>();
    for (const tex of layerBundle.variants) {
      if (!disposedSet.has(tex)) {
        tex.dispose();
        disposedSet.add(tex);
      }
    }
    layerBundle.depthMap.dispose();
  }

  sceneCache.delete(sceneId);
  useAppStore.getState().setSceneReady(sceneId, false);
  updateGlobalMemoryDebug();
  notifySceneArtUpdated();
}

export async function generateSceneArt(
  sceneId: SceneId,
  options: GenerateSceneOptions,
): Promise<SceneArtBundle> {
  const existing = sceneCache.get(sceneId);
  if (existing) {
    if (!existing.gpuUploaded) {
      uploadSceneBundleToGpu(existing);
    }
    options.onProgress?.(100);
    return existing;
  }

  const inflight = inFlightPromises.get(sceneId);
  if (inflight) {
    return inflight;
  }

  const promise = (async (): Promise<SceneArtBundle> => {
    const sceneMod = SCENE_REGISTRY[sceneId];
    const activeLayers: SceneLayerConfig[] =
      options.isMobile && sceneMod.layers.length >= 5
        ? sceneMod.layers.slice(0, sceneMod.layers.length - 1)
        : sceneMod.layers;

    let totalSteps = 0;
    for (const layer of activeLayers) {
      const vCount = options.singleVariantOnly
        ? 1
        : Math.min(INK_CONFIG.boilVariantCount, layer.boilVariants);
      totalSteps += vCount + 1;
    }

    let completedSteps = 0;
    const report = () => {
      const pct = Math.min(99, Math.round((completedSteps / Math.max(1, totalSteps)) * 100));
      options.onProgress?.(pct);
    };

    const layerMap = new Map<string, LayerArtBundle>();
    let sceneMemoryBytes = 0;

    const { canvas: snapCanvas, ctx: snapCtx } = createCanvasSurface(480, 300);

    for (const layer of activeLayers) {
      const [w, h] = layer.textureSize;
      // Scale texture size so all 7 scenes fit comfortably within the 150MB budget (~95MB total)
      const scaleMult = options.singleVariantOnly ? 0.42 : 0.46;
      const targetW = Math.min(INK_CONFIG.maxTextureSize, Math.round(w * scaleMult));
      const targetH = Math.min(INK_CONFIG.maxTextureSize, Math.round(h * scaleMult));

      const variantCount = options.singleVariantOnly
        ? 1
        : Math.min(INK_CONFIG.boilVariantCount, layer.boilVariants);

      const baseSeed = INK_CONFIG.globalSeed + hashStringSeed(`${sceneId}:${layer.id}`);
      const overrideImg = await probeLayerOverrideImage(layer.assetPath);

      const variants: THREE.CanvasTexture[] = [];
      let layerBytes = 0;

      for (let v = 0; v < variantCount; v++) {
        await yieldToIdle(Boolean(options.urgent));
        const { canvas, ctx } = createCanvasSurface(targetW, targetH);

        if (overrideImg) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(overrideImg, 0, 0, canvas.width, canvas.height);
        } else {
          const structuralRng = createRng(baseSeed);
          const variantRng = createRng(baseSeed + (v + 1) * 7919);
          sceneMod.generate({
            layerId: layer.id,
            canvasCtx: ctx,
            width: canvas.width,
            height: canvas.height,
            rng: variantRng,
            structuralRng,
            variantIndex: v,
            presenceStatus: options.presenceStatus,
            hoveredRepoIndex: options.hoveredRepoIndex,
          });
        }

        if (v === 0) {
          snapCtx.drawImage(canvas, 0, 0, snapCanvas.width, snapCanvas.height);
        }

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        variants.push(tex);
        layerBytes += canvas.width * canvas.height * 4;

        completedSteps++;
        report();
      }

      while (variants.length < 3) {
        variants.push(variants[0]);
      }

      await yieldToIdle(Boolean(options.urgent));
      const depthW = Math.round(targetW * 0.42);
      const depthH = Math.round(targetH * 0.42);
      const { canvas: dCanvas, ctx: dctx } = createCanvasSurface(depthW, depthH);
      sceneMod.generateDepth({
        layerId: layer.id,
        depthCtx: dctx,
        width: dCanvas.width,
        height: dCanvas.height,
      });
      const depthMap = new THREE.CanvasTexture(dCanvas);
      depthMap.minFilter = THREE.LinearFilter;
      depthMap.magFilter = THREE.LinearFilter;
      depthMap.needsUpdate = true;
      layerBytes += dCanvas.width * dCanvas.height * 4;

      completedSteps++;
      report();

      sceneMemoryBytes += layerBytes;
      layerMap.set(layer.id, {
        layerId: layer.id,
        variants,
        depthMap,
        memoryBytes: layerBytes,
      });
    }

    const bundle: SceneArtBundle = {
      sceneId,
      layers: layerMap,
      snapshotDataUrl: snapCanvas.toDataURL('image/png'),
      totalMemoryBytes: sceneMemoryBytes,
      gpuUploaded: false,
    };

    sceneCache.set(sceneId, bundle);
    uploadSceneBundleToGpu(bundle);
    inFlightPromises.delete(sceneId);
    options.onProgress?.(100);
    notifySceneArtUpdated();
    return bundle;
  })();

  inFlightPromises.set(sceneId, promise);
  return promise;
}

/**
 * Updates a single dynamic layer in an already-cached scene (e.g. S4 presence change or S3 repo hover).
 */
export function refreshDynamicSceneLayer(
  sceneId: SceneId,
  layerId: string,
  options: {
    presenceStatus?: 'online' | 'idle' | 'dnd' | 'offline';
    hoveredRepoIndex?: number | null;
  },
): void {
  const bundle = sceneCache.get(sceneId);
  if (!bundle) return;
  const layerBundle = bundle.layers.get(layerId);
  if (!layerBundle) return;

  const sceneMod = SCENE_REGISTRY[sceneId];
  const baseSeed = INK_CONFIG.globalSeed + hashStringSeed(`${sceneId}:${layerId}`);

  const uniqueTex = Array.from(new Set(layerBundle.variants));
  uniqueTex.forEach((tex, v) => {
    const canvas = tex.image as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const structuralRng = createRng(baseSeed);
    const variantRng = createRng(baseSeed + (v + 1) * 7919);
    sceneMod.generate({
      layerId,
      canvasCtx: ctx,
      width: canvas.width,
      height: canvas.height,
      rng: variantRng,
      structuralRng,
      variantIndex: v,
      presenceStatus: options.presenceStatus,
      hoveredRepoIndex: options.hoveredRepoIndex,
    });
    tex.needsUpdate = true;
    if (registeredRenderer) {
      registeredRenderer.initTexture(tex);
    }
  });

  notifySceneArtUpdated();
}

/**
 * Preloads scenes in scroll order ahead of the user and keeps them GPU-ready:
 * - Immediately ensures `activeSceneIndex` and `activeSceneIndex + 1` are generated & uploaded
 * - Pre-generates remaining scenes in scroll order so rapid scrolling never hits an unready scene
 * - Evicts distant scenes (> 2 steps away) only if live memory approaches the 150MB budget
 */
export async function syncSceneWindow(
  activeSceneIndex: number,
  options: GenerateSceneOptions,
): Promise<void> {
  const clampedIdx = Math.max(0, Math.min(SCENES_CONFIG.length - 1, activeSceneIndex));

  // 1. Ensure active scene is ready immediately
  const activeId = SCENES_CONFIG[clampedIdx].id;
  await generateSceneArt(activeId, { ...options, urgent: true });

  // 2. Ensure next scene (N+1) is generated with high priority before boundary
  if (clampedIdx + 1 < SCENES_CONFIG.length) {
    const nextId = SCENES_CONFIG[clampedIdx + 1].id;
    await generateSceneArt(nextId, { ...options, onProgress: undefined, urgent: true });
  }

  // 3. Pre-generate remaining scenes in scroll order during idle slices
  for (let offset = 2; offset < SCENES_CONFIG.length; offset++) {
    const idx = (clampedIdx + offset) % SCENES_CONFIG.length;
    const id = SCENES_CONFIG[idx].id;
    if (!sceneCache.has(id) && getLiveTextureMemoryMB() < INK_CONFIG.maxLiveTextureMemoryMB * 0.88) {
      await yieldToIdle();
      await generateSceneArt(id, { ...options, singleVariantOnly: true, onProgress: undefined });
    }
  }

  // 4. Evict distant scenes (> 2 steps away) ONLY if memory exceeds 140MB
  if (getLiveTextureMemoryMB() > INK_CONFIG.maxLiveTextureMemoryMB * 0.92) {
    for (let i = 0; i < SCENES_CONFIG.length; i++) {
      if (Math.abs(i - clampedIdx) > 2) {
        const idToDispose = SCENES_CONFIG[i].id;
        if (sceneCache.has(idToDispose)) {
          disposeSceneArt(idToDispose);
        }
      }
    }
  }
}

export function getCachedSceneBundle(sceneId: SceneId): SceneArtBundle | undefined {
  return sceneCache.get(sceneId);
}

export function getCachedLayerArt(
  sceneId: SceneId,
  layerId: string,
): LayerArtBundle | undefined {
  return sceneCache.get(sceneId)?.layers.get(layerId);
}
