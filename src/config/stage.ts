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
  x: [0.32, 0.78],
  y: [0.12, 0.76],
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
    focalRect: { x: [0.34, 0.66], y: [0.22, 0.64] },
    maxOpaqueRatio: 1.0,
  },
  work: {
    id: 'work',
    mode: 'page',
    focalRect: { x: [0.25, 0.75], y: [0.18, 0.72] },
    maxOpaqueRatio: 1.0,
  },
  status: {
    id: 'status',
    mode: 'scene',
    // Radial Plug orb & rings shifted slightly right so left <=38vw side panel never touches focal rect
    focalRect: { x: [0.44, 0.88], y: [0.16, 0.82] },
    maxOpaqueRatio: 0.40,
    sideAlignment: 'left',
  },
  skills: {
    id: 'skills',
    mode: 'page',
    focalRect: { x: [0.26, 0.76], y: [0.14, 0.78] },
    maxOpaqueRatio: 1.0,
  },
  timeline: {
    id: 'timeline',
    mode: 'page',
    focalRect: { x: [0.15, 0.85], y: [0.22, 0.68] },
    maxOpaqueRatio: 1.0,
  },
  contact: {
    id: 'contact',
    mode: 'scene',
    // Threshold doorway & orb sit in x: 0.24..0.58; right side panel stays strictly in x: 0.60..0.95
    focalRect: { x: [0.24, 0.58], y: [0.16, 0.80] },
    maxOpaqueRatio: 0.40,
    sideAlignment: 'right',
  },
};

