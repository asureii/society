/**
 * SCENE REGISTRY BARREL (src/scene/scenes/index.ts)
 *
 * Maps all 7 scene IDs (`s1-causeway` .. `s7-threshold`) to their SceneModule definitions.
 */

import type { SceneId } from '../../config/scenes.config';
import { sceneS1Causeway } from './s1-causeway';
import { sceneS2Observation } from './s2-observation';
import { sceneS3ArchiveCity } from './s3-archive-city';
import { sceneS4Plug } from './s4-plug';
import { sceneS5ThreePillars } from './s5-three-pillars';
import { sceneS6LongScroll } from './s6-long-scroll';
import { sceneS7Threshold } from './s7-threshold';
import type { SceneModule } from './types';

export const SCENE_REGISTRY: Record<SceneId, SceneModule> = {
  's1-causeway': sceneS1Causeway,
  's2-observation': sceneS2Observation,
  's3-archive-city': sceneS3ArchiveCity,
  's4-plug': sceneS4Plug,
  's5-three-pillars': sceneS5ThreePillars,
  's6-long-scroll': sceneS6LongScroll,
  's7-threshold': sceneS7Threshold,
};

export const ORDERED_SCENE_MODULES: SceneModule[] = [
  sceneS1Causeway,
  sceneS2Observation,
  sceneS3ArchiveCity,
  sceneS4Plug,
  sceneS5ThreePillars,
  sceneS6LongScroll,
  sceneS7Threshold,
];

export type { SceneDepthDrawContext, SceneLayerDrawContext, SceneModule } from './types';
