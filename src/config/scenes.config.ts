/**
 * MULTI-SCENE STORYBOARD CONFIGURATION (src/config/scenes.config.ts)
 *
 * Maps each of the 7 chapters to its own illustrated 2.5D world, camera viewpoint,
 * camera movement rig (`dolly`, `drift`, `crane`, `pushIn`, `tiltUp`, `track`),
 * Red Orb anchor (`orb: { pos, radius }`), `focalRect`, `uiSafeRects`, and `blackBudget`.
 */

import type { ChapterId } from '../store/useAppStore';
import { COMPUTED_SCROLL_RANGES } from './scroll.config';

export type SceneId =
  | 's1-causeway'
  | 's2-observation'
  | 's3-archive-city'
  | 's4-plug'
  | 's5-three-pillars'
  | 's6-long-scroll'
  | 's7-threshold';

export type CameraRigType =
  | 'dolly'
  | 'crane'
  | 'tiltUp'
  | 'track'
  | 'pushIn'
  | 'drift';

export type SceneTransitionType = 'orbIris' | 'panelSlice';

export interface CameraVelocity {
  vx: number;
  vy: number;
  vz: number;
  vRollDeg: number;
}

export interface CameraRigSpec {
  type: CameraRigType;
  xFrom: number;
  xTo: number;
  yFrom: number;
  yTo: number;
  zFrom: number;
  zTo: number;
  rollDegFrom: number;
  rollDegTo: number;
  /** Matched velocities (rate of change per local t) for C^1 continuous Hermite camera flight */
  entryVelocity?: CameraVelocity;
  exitVelocity?: CameraVelocity;
}

export interface OrbAnchorSpec {
  /** Normalized screen anchor [x, y] in [0..1] (0,0 = top-left, 1,1 = bottom-right) */
  pos: [number, number];
  /** Normalized screen radius relative to viewport width */
  radius: number;
}

export interface StageRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SceneLayerShaderOptions {
  hatchDensity: number;
  edgeStrength: number;
  boilAmount: number;
  depthDisplacement: number;
  rippleAmount: number;
}

export interface SceneLayerConfig {
  id: string;
  z: number;
  y: number;
  scale: [number, number];
  parallaxFactor: [number, number];
  textureSize: [number, number];
  boilVariants: number;
  allowRedChannel: boolean;
  hideOnMobile?: boolean;
  /** Asset override path `/layers/<scene-id>/<layer-id>.png` */
  assetPath: string;
  shaderOptions: SceneLayerShaderOptions;
}

export interface SceneSpec {
  id: SceneId;
  chapterId: ChapterId;
  chapterNumber: string;
  title: string;
  jpSubtitle: string;
  scrollRange: [number, number];
  orb: OrbAnchorSpec;
  focalRect: StageRect;
  uiSafeRects: StageRect[];
  transitionOut: SceneTransitionType;
  blackBudget: number;
  cameraRig: CameraRigSpec;
  layers: SceneLayerConfig[];
}

export const SCENES_CONFIG: SceneSpec[] = [
  // ---------------------------------------------------------------------------
  // S1 · Cover · "The Causeway"
  // ---------------------------------------------------------------------------
  {
    id: 's1-causeway',
    chapterId: 'cover',
    chapterNumber: '01',
    title: 'THE CAUSEWAY',
    jpSubtitle: '壱 // 参道',
    scrollRange: COMPUTED_SCROLL_RANGES[0].scrollRange,
    orb: {
      pos: [0.46, 0.37],
      radius: 0.072,
    },
    focalRect: { x: 0.36, y: 0.16, w: 0.32, h: 0.64 },
    uiSafeRects: [
      { x: 0.03, y: 0.56, w: 0.30, h: 0.36 },
      { x: 0.72, y: 0.74, w: 0.24, h: 0.18 },
    ],
    transitionOut: 'orbIris',
    blackBudget: 0.28,
    cameraRig: {
      type: 'dolly',
      xFrom: 0.0,
      xTo: 0.04,
      yFrom: 0.14,
      yTo: 0.04,
      zFrom: 6.0,
      zTo: 4.4,
      rollDegFrom: 0.0,
      rollDegTo: -0.4,
      entryVelocity: { vx: 0.02, vy: -0.06, vz: -1.2, vRollDeg: -0.2 },
      exitVelocity: { vx: 0.05, vy: -0.08, vz: -1.4, vRollDeg: -0.3 },
    },
    layers: [
      {
        id: 'sky',
        z: -14,
        y: 0,
        scale: [30, 18],
        parallaxFactor: [0.05, 0.03],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s1-causeway/sky.png',
        shaderOptions: {
          hatchDensity: 22.0,
          edgeStrength: 1.15,
          boilAmount: 0.0012,
          depthDisplacement: 0.008,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'orb',
        z: -12,
        y: 0,
        scale: [27, 16.5],
        parallaxFactor: [0.1, 0.06],
        textureSize: [1600, 1000],
        boilVariants: 3,
        allowRedChannel: true,
        assetPath: '/layers/s1-causeway/orb.png',
        shaderOptions: {
          hatchDensity: 24.0,
          edgeStrength: 1.2,
          boilAmount: 0.0014,
          depthDisplacement: 0.012,
          rippleAmount: 1.0,
        },
      },
      {
        id: 'monolith',
        z: -10,
        y: 0,
        scale: [25, 15.5],
        parallaxFactor: [0.16, 0.09],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s1-causeway/monolith.png',
        shaderOptions: {
          hatchDensity: 28.0,
          edgeStrength: 1.3,
          boilAmount: 0.0015,
          depthDisplacement: 0.016,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'horizon',
        z: -7,
        y: 0,
        scale: [22, 13.5],
        parallaxFactor: [0.24, 0.14],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s1-causeway/horizon.png',
        shaderOptions: {
          hatchDensity: 24.0,
          edgeStrength: 1.2,
          boilAmount: 0.0014,
          depthDisplacement: 0.018,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'path',
        z: -3.5,
        y: 0,
        scale: [18, 11],
        parallaxFactor: [0.38, 0.22],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s1-causeway/path.png',
        shaderOptions: {
          hatchDensity: 28.0,
          edgeStrength: 1.3,
          boilAmount: 0.0016,
          depthDisplacement: 0.022,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'foreground',
        z: -0.5,
        y: 0,
        scale: [14.5, 9],
        parallaxFactor: [0.55, 0.3],
        textureSize: [1600, 1000],
        boilVariants: 3,
        allowRedChannel: false,
        hideOnMobile: true,
        assetPath: '/layers/s1-causeway/foreground.png',
        shaderOptions: {
          hatchDensity: 30.0,
          edgeStrength: 1.35,
          boilAmount: 0.0018,
          depthDisplacement: 0.026,
          rippleAmount: 0.0,
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S2 · Dossier · "The Observation Room"
  // ---------------------------------------------------------------------------
  {
    id: 's2-observation',
    chapterId: 'about',
    chapterNumber: '02',
    title: 'THE OBSERVATION ROOM',
    jpSubtitle: '弐 // 観測室',
    scrollRange: COMPUTED_SCROLL_RANGES[1].scrollRange,
    orb: {
      pos: [0.5, 0.42],
      radius: 0.052,
    },
    focalRect: { x: 0.38, y: 0.22, w: 0.24, h: 0.42 },
    uiSafeRects: [
      { x: 0.04, y: 0.14, w: 0.28, h: 0.76 },
      { x: 0.68, y: 0.14, w: 0.28, h: 0.76 },
    ],
    transitionOut: 'panelSlice',
    blackBudget: 0.4,
    cameraRig: {
      type: 'drift',
      xFrom: 0.04,
      xTo: 0.16,
      yFrom: 0.04,
      yTo: -0.02,
      zFrom: 4.4,
      zTo: 4.6,
      rollDegFrom: -0.4,
      rollDegTo: 0.2,
      entryVelocity: { vx: 0.05, vy: -0.08, vz: -1.4, vRollDeg: -0.3 },
      exitVelocity: { vx: 0.08, vy: -0.02, vz: 0.2, vRollDeg: 0.4 },
    },
    layers: [
      {
        id: 'window-view',
        z: -14,
        y: 0,
        scale: [30, 18],
        parallaxFactor: [0.05, 0.03],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: true,
        assetPath: '/layers/s2-observation/window-view.png',
        shaderOptions: {
          hatchDensity: 22.0,
          edgeStrength: 1.15,
          boilAmount: 0.0012,
          depthDisplacement: 0.008,
          rippleAmount: 0.7,
        },
      },
      {
        id: 'room-walls',
        z: -10,
        y: 0,
        scale: [24, 15],
        parallaxFactor: [0.14, 0.08],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s2-observation/room-walls.png',
        shaderOptions: {
          hatchDensity: 26.0,
          edgeStrength: 1.25,
          boilAmount: 0.0014,
          depthDisplacement: 0.014,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'ceiling-ribs',
        z: -6,
        y: 0,
        scale: [20, 13],
        parallaxFactor: [0.24, 0.14],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s2-observation/ceiling-ribs.png',
        shaderOptions: {
          hatchDensity: 28.0,
          edgeStrength: 1.3,
          boilAmount: 0.0015,
          depthDisplacement: 0.018,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'cables',
        z: -3,
        y: 0,
        scale: [17, 11],
        parallaxFactor: [0.36, 0.2],
        textureSize: [1600, 1000],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s2-observation/cables.png',
        shaderOptions: {
          hatchDensity: 24.0,
          edgeStrength: 1.3,
          boilAmount: 0.0018,
          depthDisplacement: 0.022,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'console-fg',
        z: -0.8,
        y: 0,
        scale: [15, 9.5],
        parallaxFactor: [0.48, 0.25],
        textureSize: [1600, 1000],
        boilVariants: 3,
        allowRedChannel: true,
        hideOnMobile: true,
        assetPath: '/layers/s2-observation/console-fg.png',
        shaderOptions: {
          hatchDensity: 30.0,
          edgeStrength: 1.35,
          boilAmount: 0.0018,
          depthDisplacement: 0.026,
          rippleAmount: 0.0,
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S3 · The Work · "The Archive City"
  // ---------------------------------------------------------------------------
  {
    id: 's3-archive-city',
    chapterId: 'work',
    chapterNumber: '03',
    title: 'THE ARCHIVE CITY',
    jpSubtitle: '参 // 記録都市',
    scrollRange: COMPUTED_SCROLL_RANGES[2].scrollRange,
    orb: {
      pos: [0.54, 0.34],
      radius: 0.048,
    },
    focalRect: { x: 0.38, y: 0.20, w: 0.24, h: 0.44 },
    uiSafeRects: [
      { x: 0.04, y: 0.14, w: 0.29, h: 0.76 },
      { x: 0.67, y: 0.14, w: 0.29, h: 0.76 },
    ],
    transitionOut: 'orbIris',
    blackBudget: 0.3,
    cameraRig: {
      type: 'crane',
      xFrom: 0.16,
      xTo: -0.08,
      yFrom: -0.02,
      yTo: 0.08,
      zFrom: 4.6,
      zTo: 4.8,
      rollDegFrom: 0.2,
      rollDegTo: -0.6,
      entryVelocity: { vx: 0.08, vy: -0.02, vz: 0.2, vRollDeg: 0.4 },
      exitVelocity: { vx: -0.12, vy: 0.06, vz: 0.1, vRollDeg: -0.5 },
    },
    layers: [
      {
        id: 'city-ground',
        z: -13,
        y: 0,
        scale: [30, 18],
        parallaxFactor: [0.08, 0.08],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s3-archive-city/city-ground.png',
        shaderOptions: {
          hatchDensity: 24.0,
          edgeStrength: 1.2,
          boilAmount: 0.0012,
          depthDisplacement: 0.01,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'river-canal',
        z: -11,
        y: 0,
        scale: [27, 16.5],
        parallaxFactor: [0.14, 0.12],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s3-archive-city/river-canal.png',
        shaderOptions: {
          hatchDensity: 26.0,
          edgeStrength: 1.25,
          boilAmount: 0.0014,
          depthDisplacement: 0.012,
          rippleAmount: 0.3,
        },
      },
      {
        id: 'city-blocks',
        z: -8,
        y: 0,
        scale: [24, 14.5],
        parallaxFactor: [0.22, 0.18],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s3-archive-city/city-blocks.png',
        shaderOptions: {
          hatchDensity: 28.0,
          edgeStrength: 1.3,
          boilAmount: 0.0015,
          depthDisplacement: 0.018,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'dome-orb',
        z: -5,
        y: 0,
        scale: [20, 12.5],
        parallaxFactor: [0.3, 0.24],
        textureSize: [1600, 1000],
        boilVariants: 3,
        allowRedChannel: true,
        assetPath: '/layers/s3-archive-city/dome-orb.png',
        shaderOptions: {
          hatchDensity: 26.0,
          edgeStrength: 1.25,
          boilAmount: 0.0015,
          depthDisplacement: 0.018,
          rippleAmount: 0.85,
        },
      },
      {
        id: 'towers-fg',
        z: -1.5,
        y: 0,
        scale: [16, 10],
        parallaxFactor: [0.46, 0.35],
        textureSize: [1600, 1000],
        boilVariants: 3,
        allowRedChannel: true,
        hideOnMobile: true,
        assetPath: '/layers/s3-archive-city/towers-fg.png',
        shaderOptions: {
          hatchDensity: 30.0,
          edgeStrength: 1.35,
          boilAmount: 0.0018,
          depthDisplacement: 0.025,
          rippleAmount: 0.0,
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S4 · Pilot Status · "The Plug"
  // ---------------------------------------------------------------------------
  {
    id: 's4-plug',
    chapterId: 'status',
    chapterNumber: '04',
    title: 'THE PLUG',
    jpSubtitle: '肆 // 同調槽',
    scrollRange: COMPUTED_SCROLL_RANGES[3].scrollRange,
    orb: {
      pos: [0.5, 0.5],
      radius: 0.068,
    },
    focalRect: { x: 0.28, y: 0.20, w: 0.40, h: 0.56 },
    uiSafeRects: [{ x: 0.72, y: 0.52, w: 0.24, h: 0.38 }],
    transitionOut: 'panelSlice',
    blackBudget: 0.28,
    cameraRig: {
      type: 'pushIn',
      xFrom: -0.08,
      xTo: -0.04,
      yFrom: 0.08,
      yTo: -0.15,
      zFrom: 4.8,
      zTo: 4.0,
      rollDegFrom: -0.6,
      rollDegTo: 2.5,
      entryVelocity: { vx: -0.12, vy: 0.06, vz: 0.1, vRollDeg: -0.5 },
      exitVelocity: { vx: 0.04, vy: -0.15, vz: -0.8, vRollDeg: 1.8 },
    },
    layers: [
      {
        id: 'plug-chamber',
        z: -13,
        y: 0,
        scale: [29, 17.5],
        parallaxFactor: [0.06, 0.06],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s4-plug/plug-chamber.png',
        shaderOptions: {
          hatchDensity: 22.0,
          edgeStrength: 1.15,
          boilAmount: 0.0012,
          depthDisplacement: 0.008,
          rippleAmount: 0.4,
        },
      },
      {
        id: 'plug-rings',
        z: -9,
        y: 0,
        scale: [24, 14.5],
        parallaxFactor: [0.16, 0.16],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s4-plug/plug-rings.png',
        shaderOptions: {
          hatchDensity: 26.0,
          edgeStrength: 1.25,
          boilAmount: 0.0016,
          depthDisplacement: 0.015,
          rippleAmount: 0.85,
        },
      },
      {
        id: 'plug-orb',
        z: -6,
        y: 0,
        scale: [20, 12.5],
        parallaxFactor: [0.24, 0.24],
        textureSize: [1600, 1000],
        boilVariants: 3,
        allowRedChannel: true,
        assetPath: '/layers/s4-plug/plug-orb.png',
        shaderOptions: {
          hatchDensity: 26.0,
          edgeStrength: 1.3,
          boilAmount: 0.0016,
          depthDisplacement: 0.018,
          rippleAmount: 1.1,
        },
      },
      {
        id: 'plug-corner-frame',
        z: -2,
        y: 0,
        scale: [16.5, 10.2],
        parallaxFactor: [0.38, 0.38],
        textureSize: [1600, 1000],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s4-plug/plug-corner-frame.png',
        shaderOptions: {
          hatchDensity: 28.0,
          edgeStrength: 1.35,
          boilAmount: 0.0018,
          depthDisplacement: 0.024,
          rippleAmount: 0.0,
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S5 · Skills (MAGI) · "The Three Pillars"
  // ---------------------------------------------------------------------------
  {
    id: 's5-three-pillars',
    chapterId: 'skills',
    chapterNumber: '05',
    title: 'THE THREE PILLARS',
    jpSubtitle: '伍 // 三柱',
    scrollRange: COMPUTED_SCROLL_RANGES[4].scrollRange,
    orb: {
      pos: [0.5, 0.24],
      radius: 0.044,
    },
    focalRect: { x: 0.36, y: 0.17, w: 0.28, h: 0.18 },
    uiSafeRects: [
      { x: 0.04, y: 0.40, w: 0.92, h: 0.50 },
    ],
    transitionOut: 'panelSlice',
    blackBudget: 0.4,
    cameraRig: {
      type: 'tiltUp',
      xFrom: -0.04,
      xTo: -0.45,
      yFrom: -0.15,
      yTo: 0.22,
      zFrom: 4.0,
      zTo: 4.8,
      rollDegFrom: 2.5,
      rollDegTo: 1.2,
      entryVelocity: { vx: 0.04, vy: -0.15, vz: -0.8, vRollDeg: 1.8 },
      exitVelocity: { vx: -0.40, vy: 0.12, vz: 0.6, vRollDeg: -0.8 },
    },
    layers: [
      {
        id: 'hex-sky',
        z: -14,
        y: 0,
        scale: [30, 18.5],
        parallaxFactor: [0.06, 0.08],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s5-three-pillars/hex-sky.png',
        shaderOptions: {
          hatchDensity: 24.0,
          edgeStrength: 1.2,
          boilAmount: 0.0012,
          depthDisplacement: 0.008,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'red-hex-orb',
        z: -11,
        y: 0,
        scale: [26, 16],
        parallaxFactor: [0.12, 0.14],
        textureSize: [1600, 1000],
        boilVariants: 3,
        allowRedChannel: true,
        assetPath: '/layers/s5-three-pillars/red-hex-orb.png',
        shaderOptions: {
          hatchDensity: 26.0,
          edgeStrength: 1.25,
          boilAmount: 0.0015,
          depthDisplacement: 0.012,
          rippleAmount: 0.95,
        },
      },
      {
        id: 'pillar-left-right',
        z: -7.5,
        y: 0,
        scale: [23, 14.5],
        parallaxFactor: [0.24, 0.28],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s5-three-pillars/pillar-left-right.png',
        shaderOptions: {
          hatchDensity: 28.0,
          edgeStrength: 1.3,
          boilAmount: 0.0015,
          depthDisplacement: 0.018,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'pillar-center',
        z: -4.5,
        y: 0,
        scale: [19.5, 12.5],
        parallaxFactor: [0.34, 0.36],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s5-three-pillars/pillar-center.png',
        shaderOptions: {
          hatchDensity: 30.0,
          edgeStrength: 1.35,
          boilAmount: 0.0016,
          depthDisplacement: 0.022,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'base-stairs',
        z: -1.5,
        y: 0,
        scale: [16, 10],
        parallaxFactor: [0.45, 0.42],
        textureSize: [1600, 1000],
        boilVariants: 3,
        allowRedChannel: false,
        hideOnMobile: true,
        assetPath: '/layers/s5-three-pillars/base-stairs.png',
        shaderOptions: {
          hatchDensity: 28.0,
          edgeStrength: 1.3,
          boilAmount: 0.0016,
          depthDisplacement: 0.024,
          rippleAmount: 0.0,
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S6 · Timeline · "The Long Scroll"
  // ---------------------------------------------------------------------------
  {
    id: 's6-long-scroll',
    chapterId: 'timeline',
    chapterNumber: '06',
    title: 'THE LONG SCROLL',
    jpSubtitle: '陸 // 絵巻',
    scrollRange: COMPUTED_SCROLL_RANGES[5].scrollRange,
    orb: {
      pos: [0.74, 0.28],
      radius: 0.056,
    },
    focalRect: { x: 0.16, y: 0.17, w: 0.68, h: 0.18 },
    uiSafeRects: [{ x: 0.04, y: 0.40, w: 0.92, h: 0.50 }],
    transitionOut: 'orbIris',
    blackBudget: 0.26,
    cameraRig: {
      type: 'track',
      xFrom: -0.45,
      xTo: 0.65,
      yFrom: 0.22,
      yTo: 0.08,
      zFrom: 4.8,
      zTo: 5.0,
      rollDegFrom: 1.2,
      rollDegTo: 0.0,
      entryVelocity: { vx: -0.40, vy: 0.12, vz: 0.6, vRollDeg: -0.8 },
      exitVelocity: { vx: 0.95, vy: -0.10, vz: 0.15, vRollDeg: -1.0 },
    },
    layers: [
      {
        id: 'scroll-far-monolith',
        z: -13,
        y: 0,
        scale: [32, 17],
        parallaxFactor: [0.12, 0.04],
        textureSize: [2200, 1100],
        boilVariants: 3,
        allowRedChannel: true,
        assetPath: '/layers/s6-long-scroll/scroll-far-monolith.png',
        shaderOptions: {
          hatchDensity: 24.0,
          edgeStrength: 1.2,
          boilAmount: 0.0012,
          depthDisplacement: 0.01,
          rippleAmount: 0.75,
        },
      },
      {
        id: 'scroll-mid-arch',
        z: -9.5,
        y: 0,
        scale: [27, 13.8],
        parallaxFactor: [0.26, 0.06],
        textureSize: [2200, 1100],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s6-long-scroll/scroll-mid-arch.png',
        shaderOptions: {
          hatchDensity: 26.0,
          edgeStrength: 1.25,
          boilAmount: 0.0014,
          depthDisplacement: 0.014,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'scroll-causeway',
        z: -6,
        y: 0,
        scale: [22, 10.6],
        parallaxFactor: [0.42, 0.08],
        textureSize: [2200, 1100],
        boilVariants: 3,
        allowRedChannel: true,
        assetPath: '/layers/s6-long-scroll/scroll-causeway.png',
        shaderOptions: {
          hatchDensity: 28.0,
          edgeStrength: 1.3,
          boilAmount: 0.0015,
          depthDisplacement: 0.018,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'scroll-fg-ruins',
        z: -2,
        y: 0,
        scale: [16, 7.0],
        parallaxFactor: [0.65, 0.1],
        textureSize: [1920, 1000],
        boilVariants: 3,
        allowRedChannel: false,
        hideOnMobile: true,
        assetPath: '/layers/s6-long-scroll/scroll-fg-ruins.png',
        shaderOptions: {
          hatchDensity: 30.0,
          edgeStrength: 1.35,
          boilAmount: 0.0018,
          depthDisplacement: 0.024,
          rippleAmount: 0.0,
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // S7 · Contact · "The Threshold"
  // ---------------------------------------------------------------------------
  {
    id: 's7-threshold',
    chapterId: 'contact',
    chapterNumber: '07',
    title: 'THE THRESHOLD',
    jpSubtitle: '漆 // 境界門',
    scrollRange: COMPUTED_SCROLL_RANGES[6].scrollRange,
    orb: {
      pos: [0.5, 0.36],
      radius: 0.064,
    },
    focalRect: { x: 0.30, y: 0.14, w: 0.40, h: 0.40 },
    uiSafeRects: [{ x: 0.25, y: 0.62, w: 0.5, h: 0.28 }],
    transitionOut: 'orbIris',
    blackBudget: 0.38,
    cameraRig: {
      type: 'pushIn',
      xFrom: 0.65,
      xTo: 0.0,
      yFrom: 0.08,
      yTo: 0.0,
      zFrom: 5.0,
      zTo: 1.4,
      rollDegFrom: 0.0,
      rollDegTo: 0.0,
      entryVelocity: { vx: 0.95, vy: -0.10, vz: 0.15, vRollDeg: -1.0 },
      exitVelocity: { vx: -0.5, vy: -0.05, vz: -2.8, vRollDeg: 0.0 },
    },
    layers: [
      {
        id: 'threshold-distant',
        z: -14,
        y: 0,
        scale: [30, 18],
        parallaxFactor: [0.06, 0.04],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s7-threshold/threshold-distant.png',
        shaderOptions: {
          hatchDensity: 24.0,
          edgeStrength: 1.2,
          boilAmount: 0.0012,
          depthDisplacement: 0.008,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'threshold-orb',
        z: -11,
        y: 0,
        scale: [25, 15],
        parallaxFactor: [0.12, 0.08],
        textureSize: [1600, 1000],
        boilVariants: 3,
        allowRedChannel: true,
        assetPath: '/layers/s7-threshold/threshold-orb.png',
        shaderOptions: {
          hatchDensity: 26.0,
          edgeStrength: 1.25,
          boilAmount: 0.0015,
          depthDisplacement: 0.012,
          rippleAmount: 0.9,
        },
      },
      {
        id: 'threshold-steps',
        z: -6.5,
        y: 0,
        scale: [21, 13],
        parallaxFactor: [0.22, 0.14],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s7-threshold/threshold-steps.png',
        shaderOptions: {
          hatchDensity: 28.0,
          edgeStrength: 1.3,
          boilAmount: 0.0015,
          depthDisplacement: 0.018,
          rippleAmount: 0.0,
        },
      },
      {
        id: 'threshold-doorframe',
        z: -2,
        y: 0,
        scale: [17, 10.6],
        parallaxFactor: [0.36, 0.22],
        textureSize: [1920, 1200],
        boilVariants: 3,
        allowRedChannel: false,
        assetPath: '/layers/s7-threshold/threshold-doorframe.png',
        shaderOptions: {
          hatchDensity: 30.0,
          edgeStrength: 1.35,
          boilAmount: 0.0018,
          depthDisplacement: 0.024,
          rippleAmount: 0.0,
        },
      },
    ],
  },
];

export const SCENES_MAP: Record<SceneId, SceneSpec> = Object.fromEntries(
  SCENES_CONFIG.map((s) => [s.id, s]),
) as Record<SceneId, SceneSpec>;

export const CHAPTER_TO_SCENE: Record<ChapterId, SceneSpec> = Object.fromEntries(
  SCENES_CONFIG.map((s) => [s.chapterId, s]),
) as Record<ChapterId, SceneSpec>;
