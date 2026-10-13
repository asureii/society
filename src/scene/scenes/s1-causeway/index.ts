/**
 * SCENE 1 · COVER · "THE CAUSEWAY" (src/scene/scenes/s1-causeway/index.ts)
 *
 * Viewpoint: Low-angle 1-point perspective along the empty plain (`dolly` rig).
 * Composition: Stepping-stone path, twin monolith, red orb at the base, upper-right black ink mass,
 * foreground drifting debris fragments, and cracked-ground hatching between stones.
 */

import { SCENES_MAP } from '../../../config/scenes.config';
import { renderForegroundDepth, renderForegroundVariant } from '../../art/foreground';
import { renderHorizonDepth, renderHorizonVariant } from '../../art/horizon';
import { renderMonolithDepth, renderMonolithVariant } from '../../art/monolith';
import { renderOrbDepth, renderOrbVariant } from '../../art/orb';
import { renderPathDepth, renderPathVariant } from '../../art/path';
import { renderSkyDepth, renderSkyVariant } from '../../art/sky';
import type { SceneDepthDrawContext, SceneLayerDrawContext, SceneModule } from '../types';

const spec = SCENES_MAP['s1-causeway'];

export const id = spec.id;
export const layers = spec.layers;
export const cameraRig = spec.cameraRig;
export const orb = spec.orb;
export const focalRect = spec.focalRect;
export const uiSafeRects = spec.uiSafeRects;
export const blackBudget = spec.blackBudget;

export function generate(ctx: SceneLayerDrawContext): void {
  const { layerId, canvasCtx, width, height, rng, structuralRng } = ctx;
  switch (layerId) {
    case 'sky':
      renderSkyVariant(canvasCtx, width, height, rng, structuralRng);
      break;
    case 'monolith':
      renderMonolithVariant(canvasCtx, width, height, rng, structuralRng);
      break;
    case 'orb':
      renderOrbVariant(canvasCtx, width, height, rng, structuralRng);
      break;
    case 'horizon':
      renderHorizonVariant(canvasCtx, width, height, rng, structuralRng);
      break;
    case 'path':
      renderPathVariant(canvasCtx, width, height, rng, structuralRng);
      break;
    case 'foreground':
      renderForegroundVariant(canvasCtx, width, height, rng, structuralRng);
      break;
  }
}

export function generateDepth(ctx: SceneDepthDrawContext): void {
  const { layerId, depthCtx, width, height } = ctx;
  switch (layerId) {
    case 'sky':
      renderSkyDepth(depthCtx, width, height);
      break;
    case 'monolith':
      renderMonolithDepth(depthCtx, width, height);
      break;
    case 'orb':
      renderOrbDepth(depthCtx, width, height);
      break;
    case 'horizon':
      renderHorizonDepth(depthCtx, width, height);
      break;
    case 'path':
      renderPathDepth(depthCtx, width, height);
      break;
    case 'foreground':
      renderForegroundDepth(depthCtx, width, height);
      break;
  }
}

export const sceneS1Causeway: SceneModule = {
  id,
  layers,
  cameraRig,
  orb,
  focalRect,
  uiSafeRects,
  blackBudget,
  generate,
  generateDepth,
};
