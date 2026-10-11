import type { ThemeColorKey } from './theme';

export type LayerKind =
  | 'far-sky-monolith'
  | 'red-orb'
  | 'mid-far-horizon'
  | 'mid-pilot'
  | 'near-stepping-stones'
  | 'foreground-debris';

export interface LayerConfig {
  id: string;
  kind: LayerKind;
  scene: string;
  /** Path to custom PNG asset in /public/layers/<scene>/<layer-name>.png */
  texturePath: string;
  /** Optional grayscale depth map in /public/layers/<scene>/<layer-name>.depth.png */
  depthMapPath?: string;
  /** Base Z position in world units (camera starts at z=6 and dollies toward z=-6) */
  z: number;
  /** Base Y offset in world units */
  y: number;
  /** Plane dimensions in world units [width, height] */
  scale: [number, number];
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
 * 2.5D LAYER CONTRACT
 * Drop custom illustrated PNGs into `/public/layers/entry-plug/<layer-name>.png`
 * and optional grayscale depth maps into `/public/layers/entry-plug/<layer-name>.depth.png`.
 * Until external PNG files are added, the engine automatically synthesizes high-detail
 * procedural manga ink + depth textures matching these exact layer specs.
 */
export const SCENE_LAYERS: LayerConfig[] = [
  {
    id: 'far-sky',
    kind: 'far-sky-monolith',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/far-sky-monolith.png',
    depthMapPath: '/layers/entry-plug/far-sky-monolith.depth.png',
    z: -14,
    y: 0.4,
    scale: [28, 16],
    parallaxFactor: [0.08, 0.05],
    tintToken: 'ink',
    allowRedChannel: false,
    shaderOptions: {
      hatchDensity: 48.0,
      edgeStrength: 1.15,
      boilAmount: 0.0012,
      depthDisplacement: 0.008,
      halftoneMix: 0.2,
      rippleAmount: 0.0,
    },
  },
  {
    id: 'red-orb',
    kind: 'red-orb',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/red-orb.png',
    depthMapPath: '/layers/entry-plug/red-orb.depth.png',
    z: -11.5,
    y: 1.15,
    scale: [11, 11],
    parallaxFactor: [0.14, 0.1],
    tintToken: 'red',
    allowRedChannel: true,
    shaderOptions: {
      hatchDensity: 60.0,
      edgeStrength: 1.3,
      boilAmount: 0.0018,
      depthDisplacement: 0.012,
      halftoneMix: 0.35,
      rippleAmount: 1.0,
    },
  },
  {
    id: 'mid-far-horizon',
    kind: 'mid-far-horizon',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/mid-far-horizon.png',
    depthMapPath: '/layers/entry-plug/mid-far-horizon.depth.png',
    z: -8.5,
    y: -0.6,
    scale: [22, 12.5],
    parallaxFactor: [0.24, 0.14],
    tintToken: 'ink',
    allowRedChannel: false,
    shaderOptions: {
      hatchDensity: 56.0,
      edgeStrength: 1.25,
      boilAmount: 0.0014,
      depthDisplacement: 0.014,
      halftoneMix: 0.15,
      rippleAmount: 0.0,
    },
  },
  {
    id: 'near-stepping-stones',
    kind: 'near-stepping-stones',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/near-stepping-stones.png',
    depthMapPath: '/layers/entry-plug/near-stepping-stones.depth.png',
    z: -4.2,
    y: -1.65,
    scale: [15, 9],
    parallaxFactor: [0.48, 0.25],
    tintToken: 'ink',
    allowRedChannel: false,
    shaderOptions: {
      hatchDensity: 64.0,
      edgeStrength: 1.35,
      boilAmount: 0.0016,
      depthDisplacement: 0.022,
      halftoneMix: 0.1,
      rippleAmount: 0.0,
    },
  },
  {
    id: 'mid-pilot',
    kind: 'mid-pilot',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/mid-pilot.png',
    depthMapPath: '/layers/entry-plug/mid-pilot.depth.png',
    z: -2.4,
    y: -0.55,
    scale: [9.5, 9.5],
    parallaxFactor: [0.62, 0.35],
    tintToken: 'ink',
    allowRedChannel: true, // Single thin red scarf/band on white cloaked figure
    shaderOptions: {
      hatchDensity: 72.0,
      edgeStrength: 1.5,
      boilAmount: 0.0018,
      depthDisplacement: 0.028,
      halftoneMix: 0.25,
      rippleAmount: 0.15,
    },
  },
  {
    id: 'foreground-debris',
    kind: 'foreground-debris',
    scene: 'entry-plug',
    texturePath: '/layers/entry-plug/foreground-debris.png',
    depthMapPath: '/layers/entry-plug/foreground-debris.depth.png',
    z: 1.4,
    y: 0.0,
    scale: [12, 7.5],
    parallaxFactor: [1.05, 0.55],
    tintToken: 'ink',
    allowRedChannel: false,
    hideOnMobile: true,
    shaderOptions: {
      hatchDensity: 52.0,
      edgeStrength: 1.4,
      boilAmount: 0.002,
      depthDisplacement: 0.032,
      halftoneMix: 0.0,
      rippleAmount: 0.0,
    },
  },
];
