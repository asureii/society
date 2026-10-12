import type { ThemeColorKey } from './theme';

export type LayerKind =
  | 'sky'
  | 'monolith'
  | 'orb'
  | 'horizon'
  | 'path'
  | 'foreground';

export interface LayerConfig {
  id: string;
  kind: LayerKind;
  scene: string;
  /** Path to custom PNG asset in /public/layers/<scene>/<layer-name>.png */
  texturePath: string;
  /** Optional grayscale depth map in /public/layers/<scene>/<layer-name>.depth.png */
  depthMapPath?: string;
  /** Base Z position in world units (camera starts at z=6.2 and dollies toward z=-5.2) */
  z: number;
  /** Base Y offset in world units */
  y: number;
  /** Plane dimensions in world units [width, height] (overscanned ~8% in Layer.tsx to prevent depth seams) */
  scale: [number, number];
  /** Target 2x pixel canvas resolution [width, height] capped at 4096px */
  textureSize: [number, number];
  /** Number of line-boil variants on desktop (3 for main ink layers, 1 on foreground to keep memory <150MB) */
  boilVariants: number;
  /** Mouse & scroll parallax multiplier */
  parallaxFactor: [number, number];
  /** Strict palette tint token */
  tintToken: ThemeColorKey;
  /** Whether the shader is allowed to output the red accent channel on this layer */
  allowRedChannel: boolean;
  /** Shader parameters for hatching, edge detection, line boil, and depth wiggle */
  shaderOptions: {
    hatchDensity: number;
    edgeStrength: number;
    boilAmount: number;
    depthDisplacement: number;
    halftoneMix: number;
    rippleAmount: number;
  };
  /** Whether to skip this layer on low-power mobile screens for 60fps guarantee */
  hideOnMobile?: boolean;
}

/**
 * 2.5D LAYER CONTRACT (NO PILOT FIGURE — EMPTY SCALE & TWIN MONOLITH)
 * Drop custom illustrated PNGs into `/public/layers/entry-plug/<layer-name>.png`
 * and optional grayscale depth maps into `/public/layers/entry-plug/<layer-name>.depth.png`.
 * Until external PNG files are added, `src/scene/art/` synthesizes variable-width hand-inked
 * brush & hatching textures with 3-frame line-boil atlases.
 */
export const SCENE_LAYERS: LayerConfig[] = [
  {
    id: 'sky',
    kind: 'sky',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/sky.png',
    depthMapPath: '/layers/entry-plug/sky.depth.png',
    z: -14.5,
    y: 0.45,
    scale: [30, 17],
    textureSize: [1600, 900],
    boilVariants: 3,
    parallaxFactor: [0.07, 0.04],
    tintToken: 'ink',
    allowRedChannel: false,
    shaderOptions: {
      hatchDensity: 54.0,
      edgeStrength: 1.15,
      boilAmount: 0.0008,
      depthDisplacement: 0.006,
      halftoneMix: 0.12,
      rippleAmount: 0.0,
    },
  },
  {
    id: 'orb',
    kind: 'orb',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/orb.png',
    depthMapPath: '/layers/entry-plug/orb.depth.png',
    z: -12.6,
    y: 0.25,
    scale: [22, 13],
    textureSize: [1400, 900],
    boilVariants: 3,
    parallaxFactor: [0.12, 0.08],
    tintToken: 'red',
    allowRedChannel: true,
    shaderOptions: {
      hatchDensity: 62.0,
      edgeStrength: 1.25,
      boilAmount: 0.0011,
      depthDisplacement: 0.01,
      halftoneMix: 0.18,
      rippleAmount: 1.0,
    },
  },
  {
    id: 'monolith',
    kind: 'monolith',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/monolith.png',
    depthMapPath: '/layers/entry-plug/monolith.depth.png',
    z: -11.2,
    y: 0.35,
    scale: [24, 14],
    textureSize: [1600, 1000],
    boilVariants: 3,
    parallaxFactor: [0.16, 0.1],
    tintToken: 'ink',
    allowRedChannel: false,
    shaderOptions: {
      hatchDensity: 68.0,
      edgeStrength: 1.35,
      boilAmount: 0.001,
      depthDisplacement: 0.014,
      halftoneMix: 0.12,
      rippleAmount: 0.0,
    },
  },
  {
    id: 'horizon',
    kind: 'horizon',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/horizon.png',
    depthMapPath: '/layers/entry-plug/horizon.depth.png',
    z: -8.4,
    y: -0.5,
    scale: [23, 13],
    textureSize: [1600, 900],
    boilVariants: 3,
    parallaxFactor: [0.26, 0.14],
    tintToken: 'ink',
    allowRedChannel: false,
    shaderOptions: {
      hatchDensity: 58.0,
      edgeStrength: 1.2,
      boilAmount: 0.001,
      depthDisplacement: 0.014,
      halftoneMix: 0.1,
      rippleAmount: 0.0,
    },
  },
  {
    id: 'path',
    kind: 'path',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/path.png',
    depthMapPath: '/layers/entry-plug/path.depth.png',
    z: -4.2,
    y: -1.15,
    scale: [17, 10],
    textureSize: [1600, 1000],
    boilVariants: 3,
    parallaxFactor: [0.52, 0.26],
    tintToken: 'ink',
    allowRedChannel: false,
    shaderOptions: {
      hatchDensity: 66.0,
      edgeStrength: 1.35,
      boilAmount: 0.0012,
      depthDisplacement: 0.02,
      halftoneMix: 0.08,
      rippleAmount: 0.0,
    },
  },
  {
    id: 'foreground',
    kind: 'foreground',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/foreground.png',
    depthMapPath: '/layers/entry-plug/foreground.depth.png',
    z: 1.2,
    y: -0.1,
    scale: [13.5, 8.2],
    textureSize: [1280, 800],
    boilVariants: 1, // Drop variants on foreground first per brief B5
    parallaxFactor: [0.95, 0.48],
    tintToken: 'ink',
    allowRedChannel: false,
    hideOnMobile: true,
    shaderOptions: {
      hatchDensity: 56.0,
      edgeStrength: 1.4,
      boilAmount: 0.0012,
      depthDisplacement: 0.025,
      halftoneMix: 0.0,
      rippleAmount: 0.0,
    },
  },
];
