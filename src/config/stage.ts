import type { ChapterId } from '../store/useAppStore';

export type BeatMode = 'scene' | 'page';

export interface FocalRect {
  /** Normalized X range [min, max] in [0..1] viewport coordinates */
  x: [number, number];
  /** Normalized Y range [min, max] in [0..1] viewport coordinates */
  y: [number, number];
}

export interface StageBeatConfig {
  id: ChapterId;
  mode: BeatMode;
  /** Protected focal rectangle where no opaque UI may sit during scene beats */
  focalRect: FocalRect;
  /** Maximum allowed opaque UI ratio (<= 0.25 in hero, <= 0.45 in side-panel scene beats) */
  maxOpaqueRatio: number;
  /** Side panel alignment for scene beats with content (Status = left, Contact = right) */
  sideAlignment?: 'left' | 'right';
}

/**
 * STAGE & FOCAL RECTANGLE RULES (src/config/stage.ts)
 * Principle: The scene is the stage, and the UI is the frame.
 * Hero default focal rect: x 28–78%, y 12–78% on desktop.
 */
export const HERO_FOCAL_RECT: FocalRect = {
  x: [0.28, 0.78],
  y: [0.12, 0.78],
};

export const STAGE_CONFIG: Record<ChapterId, StageBeatConfig> = {
  cover: {
    id: 'cover',
    mode: 'scene',
    focalRect: HERO_FOCAL_RECT,
    maxOpaqueRatio: 0.25,
    sideAlignment: 'left',
  },
  about: {
    id: 'about',
    mode: 'page',
    focalRect: HERO_FOCAL_RECT,
    maxOpaqueRatio: 1.0,
  },
  work: {
    id: 'work',
    mode: 'page',
    focalRect: HERO_FOCAL_RECT,
    maxOpaqueRatio: 1.0,
  },
  status: {
    id: 'status',
    mode: 'scene',
    // Twin monolith & orb shifted slightly right so left <=38vw side panel never touches focal rect
    focalRect: { x: [0.42, 0.88], y: [0.12, 0.78] },
    maxOpaqueRatio: 0.42,
    sideAlignment: 'left',
  },
  skills: {
    id: 'skills',
    mode: 'page',
    focalRect: HERO_FOCAL_RECT,
    maxOpaqueRatio: 1.0,
  },
  timeline: {
    id: 'timeline',
    mode: 'page',
    focalRect: HERO_FOCAL_RECT,
    maxOpaqueRatio: 1.0,
  },
  contact: {
    id: 'contact',
    mode: 'scene',
    // Side panel sits on the right (x: 58–94%), leaving x: 14–56% open for the monolith approach
    focalRect: { x: [0.14, 0.56], y: [0.12, 0.78] },
    maxOpaqueRatio: 0.42,
    sideAlignment: 'right',
  },
};
