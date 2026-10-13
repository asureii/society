/**
 * SCENE MODULE TYPES (src/scene/scenes/types.ts)
 */

import type {
  CameraRigSpec,
  OrbAnchorSpec,
  SceneId,
  SceneLayerConfig,
  StageRect,
} from '../../config/scenes.config';
import type { Canvas2DContext } from '../art/inkBrush';
import type { PRNG } from '../art/rng';

export interface SceneLayerDrawContext {
  layerId: string;
  canvasCtx: Canvas2DContext;
  width: number;
  height: number;
  rng: PRNG;
  structuralRng: PRNG;
  variantIndex: number;
  presenceStatus?: 'online' | 'idle' | 'dnd' | 'offline';
  hoveredRepoIndex?: number | null;
}

export interface SceneDepthDrawContext {
  layerId: string;
  depthCtx: Canvas2DContext;
  width: number;
  height: number;
}

export interface SceneModule {
  id: SceneId;
  layers: SceneLayerConfig[];
  cameraRig: CameraRigSpec;
  orb: OrbAnchorSpec;
  focalRect: StageRect;
  uiSafeRects: StageRect[];
  blackBudget: number;
  generate: (ctx: SceneLayerDrawContext) => void;
  generateDepth: (ctx: SceneDepthDrawContext) => void;
}
