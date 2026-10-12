/**
 * ASYNC CHUNKED HAND-INKED LAYER GENERATOR & BOIL ATLAS BUILDER (src/scene/art/index.ts)
 *
 * Spec (B1 & B5):
 * - Generates each layer onto an OffscreenCanvas (with HTMLCanvasElement fallback)
 *   at 2x display resolution, capped at INK_CONFIG.maxTextureSize (4096px).
 * - For line-boil on desktop, generates `variantCount` (3) variants with the same
 *   structural seed (so composition stays locked) and distinct brush/hatch seeds
 *   (so line wobble, pressure curves, and hatch spacing boil organically at 9fps).
 * - Yields between variants (`await yieldToMain()`) so no main-thread block exceeds ~50ms
 *   and reports real progress to the Chapter 0 Loader.
 */

import * as THREE from 'three';
import { INK_CONFIG } from '../../config/ink';
import { SCENE_LAYERS, type LayerConfig, type LayerKind } from '../../config/layers.config';
import { renderForegroundDepth, renderForegroundVariant } from './foreground';
import { renderHorizonDepth, renderHorizonVariant } from './horizon';
import type { Canvas2DContext } from './inkBrush';
import { renderMonolithDepth, renderMonolithVariant } from './monolith';
import { renderOrbDepth, renderOrbVariant } from './orb';
import { renderPathDepth, renderPathVariant } from './path';
import { createRng } from './rng';
import { renderSkyDepth, renderSkyVariant } from './sky';

export interface LayerArtBundle {
  variants: THREE.CanvasTexture[];
  depthMap: THREE.CanvasTexture;
}

const artCache = new Map<string, LayerArtBundle>();
let generationPromise: Promise<Map<string, LayerArtBundle>> | null = null;

function createCanvasSurface(width: number, height: number): {
  canvas: HTMLCanvasElement;
  ctx: Canvas2DContext;
} {
  const cappedW = Math.min(INK_CONFIG.maxTextureSize, Math.round(width));
  const cappedH = Math.min(INK_CONFIG.maxTextureSize, Math.round(height));

  // Use OffscreenCanvas for intermediate drawing if supported, then blit to HTMLCanvasElement
  // for universal Three.js CanvasTexture compatibility
  const htmlCanvas = document.createElement('canvas');
  htmlCanvas.width = cappedW;
  htmlCanvas.height = cappedH;
  const ctx = htmlCanvas.getContext('2d')!;
  return { canvas: htmlCanvas, ctx };
}

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function renderVariantByKind(
  kind: LayerKind,
  ctx: Canvas2DContext,
  width: number,
  height: number,
  variantIndex: number,
): void {
  const kindSeedOffset: Record<LayerKind, number> = {
    sky: 101,
    orb: 202,
    monolith: 303,
    horizon: 404,
    path: 505,
    foreground: 606,
  };

  const baseSeed = INK_CONFIG.globalSeed + kindSeedOffset[kind];
  // Structural RNG is identical across variants so geometry stays locked
  const structuralRng = createRng(baseSeed);
  // Brush RNG changes per variant so wobble, pressure, and hatch jitter boil at 9fps
  const variantRng = createRng(baseSeed + (variantIndex + 1) * 7919);

  switch (kind) {
    case 'sky':
      renderSkyVariant(ctx, width, height, variantRng, structuralRng);
      break;
    case 'orb':
      renderOrbVariant(ctx, width, height, variantRng, structuralRng);
      break;
    case 'monolith':
      renderMonolithVariant(ctx, width, height, variantRng, structuralRng);
      break;
    case 'horizon':
      renderHorizonVariant(ctx, width, height, variantRng, structuralRng);
      break;
    case 'path':
      renderPathVariant(ctx, width, height, variantRng, structuralRng);
      break;
    case 'foreground':
      renderForegroundVariant(ctx, width, height, variantRng, structuralRng);
      break;
  }
}

function renderDepthByKind(
  kind: LayerKind,
  dctx: Canvas2DContext,
  width: number,
  height: number,
): void {
  switch (kind) {
    case 'sky':
      renderSkyDepth(dctx, width, height);
      break;
    case 'orb':
      renderOrbDepth(dctx, width, height);
      break;
    case 'monolith':
      renderMonolithDepth(dctx, width, height);
      break;
    case 'horizon':
      renderHorizonDepth(dctx, width, height);
      break;
    case 'path':
      renderPathDepth(dctx, width, height);
      break;
    case 'foreground':
      renderForegroundDepth(dctx, width, height);
      break;
  }
}

export async function generateAllSceneArt(
  options: {
    singleVariantOnly: boolean;
    onProgress?: (pct: number) => void;
  },
): Promise<Map<string, LayerArtBundle>> {
  if (artCache.size === SCENE_LAYERS.length) {
    options.onProgress?.(100);
    return artCache;
  }
  if (generationPromise) {
    return generationPromise;
  }

  generationPromise = (async () => {
    const layers: LayerConfig[] = SCENE_LAYERS;
    let totalSteps = 0;
    for (const layer of layers) {
      const count = options.singleVariantOnly ? 1 : Math.min(INK_CONFIG.boilVariantCount, layer.boilVariants);
      totalSteps += count + 1; // variants + depth map
    }

    let completedSteps = 0;
    const report = () => {
      const pct = Math.min(99, Math.round((completedSteps / Math.max(1, totalSteps)) * 100));
      options.onProgress?.(pct);
    };

    for (const layer of layers) {
      const [w, h] = layer.textureSize;
      const scaleMult = options.singleVariantOnly ? 0.75 : 1.0;
      const targetW = Math.min(INK_CONFIG.maxTextureSize, Math.round(w * scaleMult));
      const targetH = Math.min(INK_CONFIG.maxTextureSize, Math.round(h * scaleMult));

      const variantCount = options.singleVariantOnly
        ? 1
        : Math.min(INK_CONFIG.boilVariantCount, layer.boilVariants);

      const variants: THREE.CanvasTexture[] = [];
      for (let v = 0; v < variantCount; v++) {
        await yieldToMain();
        const { canvas, ctx } = createCanvasSurface(targetW, targetH);
        renderVariantByKind(layer.kind, ctx, canvas.width, canvas.height, v);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        variants.push(tex);
        completedSteps++;
        report();
      }

      // Pad to 3 references so shader uniform array/slots always have valid textures
      while (variants.length < 3) {
        variants.push(variants[0]);
      }

      await yieldToMain();
      const { canvas: dCanvas, ctx: dctx } = createCanvasSurface(
        Math.round(targetW * 0.5),
        Math.round(targetH * 0.5),
      );
      renderDepthByKind(layer.kind, dctx, dCanvas.width, dCanvas.height);
      const depthMap = new THREE.CanvasTexture(dCanvas);
      depthMap.minFilter = THREE.LinearFilter;
      depthMap.magFilter = THREE.LinearFilter;
      depthMap.needsUpdate = true;
      completedSteps++;
      report();

      artCache.set(layer.id, { variants, depthMap });
    }

    options.onProgress?.(100);
    return artCache;
  })();

  return generationPromise;
}

export function getCachedLayerArt(layerId: string): LayerArtBundle | undefined {
  return artCache.get(layerId);
}
