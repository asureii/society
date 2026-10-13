/**
 * SCENE 3 · THE WORK · "THE ARCHIVE CITY" (src/scene/scenes/s3-archive-city/index.ts)
 *
 * Viewpoint: High bird's-eye / near-isometric look-down over a sprawling architectural grid
 * (`crane` rig drifting diagonally across the plane).
 * Composition:
 * - `city-ground`: White paper streets and isometric grid avenues with subtle pavement stipple.
 * - `river-canal`: Ragged black ink river cutting diagonally across the grid with white speckle
 *   reflections and a small hand-inked stone bridge spanning the central channel.
 * - `city-blocks`: Dense field of stepped rectangular rooftops and monolith blocks seen from above
 *   (`drawRooftopBlock`) with hard black cast-shadow wedges, hatched vertical faces, and rooftop vents.
 * - `dome-orb`: Circular Red Orb / dome sitting in a stepped plaza near a central rooftop (`[0.58, 0.34]`),
 *   plus optional thin red district outline when a repo card is hovered (`hoveredRepoIndex`).
 * - `towers-fg`: Two taller hatched scale towers rising toward the camera for dramatic crane parallax depth.
 */

import { SCENES_MAP } from '../../../config/scenes.config';
import { THEME_COLORS } from '../../../config/theme';
import { drawRooftopBlock } from '../../art/architecture';
import { hatchRegion } from '../../art/hatch';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Point2D,
} from '../../art/inkBrush';
import { drawHandInkedOrb } from '../../art/orb';
import { drawIsometricGrid } from '../../art/perspective';
import { drawConcentricRings } from '../../art/radial';
import type { SceneDepthDrawContext, SceneLayerDrawContext, SceneModule } from '../types';

const spec = SCENES_MAP['s3-archive-city'];

export const id = spec.id;
export const layers = spec.layers;
export const cameraRig = spec.cameraRig;
export const orb = spec.orb;
export const focalRect = spec.focalRect;
export const uiSafeRects = spec.uiSafeRects;
export const blackBudget = spec.blackBudget;

interface CityBlockDef {
  x: number;
  y: number;
  w: number;
  h: number;
  extrudeX: number;
  extrudeY: number;
  stepped: boolean;
}

function getCityBlocks(width: number, height: number): CityBlockDef[] {
  // Concentrated in and around the central vertical window corridor (x: 0.24..0.76)
  // and spreading out to the wings so transitions and crane pans reveal a full city
  return [
    // Central corridor blocks (indices 0..5 correspond to hoveredRepoIndex 0..5!)
    { x: width * 0.37, y: height * 0.18, w: width * 0.085, h: height * 0.095, extrudeX: 16, extrudeY: 22, stepped: true },
    { x: width * 0.48, y: height * 0.16, w: width * 0.075, h: height * 0.08, extrudeX: 14, extrudeY: 19, stepped: false },
    { x: width * 0.38, y: height * 0.32, w: width * 0.09, h: height * 0.11, extrudeX: 18, extrudeY: 24, stepped: true },
    { x: width * 0.51, y: height * 0.46, w: width * 0.095, h: height * 0.105, extrudeX: 18, extrudeY: 25, stepped: true },
    { x: width * 0.37, y: height * 0.58, w: width * 0.085, h: height * 0.11, extrudeX: 17, extrudeY: 23, stepped: true },
    { x: width * 0.50, y: height * 0.64, w: width * 0.09, h: height * 0.12, extrudeX: 19, extrudeY: 26, stepped: true },

    // Surrounding archive district blocks
    { x: width * 0.14, y: height * 0.16, w: width * 0.09, h: height * 0.10, extrudeX: 16, extrudeY: 22, stepped: true },
    { x: width * 0.26, y: height * 0.22, w: width * 0.075, h: height * 0.09, extrudeX: 14, extrudeY: 18, stepped: false },
    { x: width * 0.16, y: height * 0.34, w: width * 0.085, h: height * 0.11, extrudeX: 16, extrudeY: 21, stepped: true },
    { x: width * 0.25, y: height * 0.48, w: width * 0.08, h: height * 0.10, extrudeX: 15, extrudeY: 20, stepped: false },
    { x: width * 0.15, y: height * 0.64, w: width * 0.095, h: height * 0.11, extrudeX: 18, extrudeY: 24, stepped: true },
    { x: width * 0.27, y: height * 0.72, w: width * 0.075, h: height * 0.095, extrudeX: 15, extrudeY: 20, stepped: false },

    { x: width * 0.66, y: height * 0.15, w: width * 0.085, h: height * 0.10, extrudeX: 16, extrudeY: 22, stepped: true },
    { x: width * 0.78, y: height * 0.20, w: width * 0.09, h: height * 0.11, extrudeX: 18, extrudeY: 24, stepped: true },
    { x: width * 0.67, y: height * 0.32, w: width * 0.08, h: height * 0.095, extrudeX: 15, extrudeY: 20, stepped: false },
    { x: width * 0.79, y: height * 0.38, w: width * 0.085, h: height * 0.105, extrudeX: 16, extrudeY: 22, stepped: true },
    { x: width * 0.66, y: height * 0.56, w: width * 0.09, h: height * 0.11, extrudeX: 17, extrudeY: 23, stepped: true },
    { x: width * 0.78, y: height * 0.62, w: width * 0.085, h: height * 0.10, extrudeX: 16, extrudeY: 21, stepped: false },
  ];
}

export function generate(ctx: SceneLayerDrawContext): void {
  const { layerId, canvasCtx: c, width, height, rng, structuralRng, hoveredRepoIndex } = ctx;
  c.clearRect(0, 0, width, height);

  switch (layerId) {
    case 'city-ground': {
      // Base white paper city plane
      c.fillStyle = THEME_COLORS.paper;
      c.fillRect(0, 0, width, height);

      // Bird's-eye isometric street grid across the city plane
      const fullBounds: Point2D[] = [
        [width * 0.04, height * 0.06],
        [width * 0.96, height * 0.06],
        [width * 0.96, height * 0.94],
        [width * 0.04, height * 0.94],
      ];
      drawIsometricGrid(c, fullBounds, Math.round(width * 0.065), rng, {
        angleA: 0.22,
        angleB: Math.PI * 0.5 + 0.12,
        baseWidth: 1.35,
        breakChance: 0.22,
      });
      break;
    }

    case 'river-canal': {
      // Ragged black ink river cutting diagonally across the grid (from lower-left to upper-right)
      // Passes right through the central window corridor around y ~ 0.42..0.52 with a small bridge!
      const steps = 36;
      const topBank: Point2D[] = [];
      const botBank: Point2D[] = [];
      const canalHalfW = height * 0.032;

      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const x = u * width;
        const centerY =
          height * (0.68 - u * 0.38) +
          Math.sin(u * Math.PI * 2.2) * height * 0.025 +
          (structuralRng.noise1D(u * 9.0) - 0.5) * 14;
        const jitterTop = (rng.noise1D(u * 22.0) - 0.5) * 8;
        const jitterBot = (rng.noise1D(u * 22.0 + 7.3) - 0.5) * 8;
        topBank.push([x, centerY - canalHalfW + jitterTop]);
        botBank.unshift([x, centerY + canalHalfW + jitterBot]);
      }

      const canalPoly: Point2D[] = [...topBank, ...botBank];
      fillRoughenedPolygon(c, canalPoly, rng, THEME_COLORS.ink, 2.2);

      // White ripple lines and speckle reflections on the black ink canal
      for (let r = 0; r < 42; r++) {
        const u = structuralRng.range(0.05, 0.95);
        const rx = u * width;
        const ry =
          height * (0.68 - u * 0.38) +
          Math.sin(u * Math.PI * 2.2) * height * 0.025 +
          structuralRng.range(-canalHalfW * 0.55, canalHalfW * 0.55);
        drawInkStroke(
          c,
          [
            [rx - 12, ry + 4],
            [rx + 12, ry - 4],
          ],
          rng,
          { baseWidth: 1.4, color: THEME_COLORS.paperPure, taperScale: 1.3 },
        );
      }

      // Embankment wall hatching along the lower bank
      drawInkStroke(c, topBank, rng, {
        baseWidth: 3.6,
        color: THEME_COLORS.ink,
        dryBrush: true,
        doubleChance: 0.35,
      });

      // Tiny hand-inked stone bridge spanning the canal inside the central window (u ~ 0.47)
      const bridgeU = 0.47;
      const bx = bridgeU * width;
      const by =
        height * (0.68 - bridgeU * 0.38) +
        Math.sin(bridgeU * Math.PI * 2.2) * height * 0.025;
      const bridgePoly: Point2D[] = [
        [bx - 16, by - canalHalfW * 1.35],
        [bx + 12, by - canalHalfW * 1.42],
        [bx + 22, by + canalHalfW * 1.35],
        [bx - 6, by + canalHalfW * 1.42],
      ];
      fillRoughenedPolygon(c, bridgePoly, rng, THEME_COLORS.paperPure, 1.4);
      hatchRegion(c, bridgePoly, rng, {
        angleRad: 0.35,
        baseSpacing: 5.0,
        baseWidth: 1.4,
        toneAt: (u) => (u > 0.65 ? 0.75 : 0.15),
      });
      outlinePolygonWithInk(c, bridgePoly, rng, {
        baseWidth: 3.2,
        doubleChance: 0.35,
      });
      break;
    }

    case 'city-blocks': {
      const blocks = getCityBlocks(width, height);
      for (const blk of blocks) {
        drawRooftopBlock(c, blk, rng, structuralRng);
      }
      break;
    }

    case 'dome-orb': {
      // Circular Red Orb / dome sitting in a stepped plaza near a central rooftop ([0.58, 0.34])
      const orbCx = width * spec.orb.pos[0];
      const orbCy = height * spec.orb.pos[1];
      const orbR = width * spec.orb.radius;

      // Stepped plaza flagstones & concentric rings around the Red Dome
      drawConcentricRings(c, {
        cx: orbCx,
        cy: orbCy,
        minRadius: orbR * 1.12,
        maxRadius: orbR * 1.55,
        ringCount: 3,
        rng,
        structuralRng,
        aspectY: 0.86,
        baseWidth: 2.2,
        breakChance: 0.12,
        doubleChance: 0.28,
        radialTicks: true,
      });

      // Hard black cast-shadow wedge on the lower-right of the dome
      const domeShadow: Point2D[] = [
        [orbCx + orbR * 0.2, orbCy + orbR * 0.75],
        [orbCx + orbR * 0.92, orbCy - orbR * 0.15],
        [orbCx + orbR * 1.35, orbCy + orbR * 0.35],
        [orbCx + orbR * 0.65, orbCy + orbR * 1.15],
      ];
      fillRoughenedPolygon(c, domeShadow, rng, THEME_COLORS.ink, 1.5);

      drawHandInkedOrb(c, orbCx, orbCy, orbR, orbR * 0.9, rng, structuralRng, {
        halo: true,
        strokeScale: 0.92,
      });

      // Optional thin red district outline when a repo card is hovered in Work.tsx (Part B3)
      if (typeof hoveredRepoIndex === 'number' && hoveredRepoIndex >= 0) {
        const blocks = getCityBlocks(width, height);
        const target = blocks[hoveredRepoIndex % 6];
        if (target) {
          const pad = 6;
          const highlightPoly: Point2D[] = [
            [target.x - pad, target.y - pad],
            [target.x + target.w + pad, target.y - pad],
            [target.x + target.w + pad, target.y + target.h + pad],
            [target.x - pad, target.y + target.h + pad],
          ];
          outlinePolygonWithInk(c, highlightPoly, rng, {
            baseWidth: 3.4,
            color: THEME_COLORS.red,
            doubleChance: 0.45,
          });
        }
      }
      break;
    }

    case 'towers-fg': {
      // Two taller hatched scale towers rising toward the camera for dramatic crane parallax depth
      // Positioned near the edges of the central corridor so they frame the bird's-eye view
      const leftTower = {
        x: width * 0.31,
        y: height * 0.42,
        w: width * 0.068,
        h: height * 0.088,
        extrudeX: 34,
        extrudeY: 52,
        stepped: true,
      };
      const rightTower = {
        x: width * 0.61,
        y: height * 0.52,
        w: width * 0.072,
        h: height * 0.092,
        extrudeX: 38,
        extrudeY: 56,
        stepped: true,
      };

      drawRooftopBlock(c, leftTower, rng, structuralRng);
      drawRooftopBlock(c, rightTower, rng, structuralRng);

      // Spire antennas on top of the two foreground towers
      for (const tw of [leftTower, rightTower]) {
        const ax = tw.x + tw.w * 0.5;
        const ay = tw.y + tw.h * 0.4;
        drawInkStroke(
          c,
          [
            [ax, ay],
            [ax - 8, ay - 46],
          ],
          rng,
          { baseWidth: 2.4, taperScale: 1.35, doubleChance: 0.25 },
        );
        drawInkDot(c, ax - 8, ay - 48, 3.2, rng, THEME_COLORS.red);
      }
      break;
    }
  }
}

export function generateDepth(ctx: SceneDepthDrawContext): void {
  const { layerId, depthCtx: d, width, height } = ctx;
  d.fillStyle = THEME_COLORS.ink;
  d.fillRect(0, 0, width, height);
  if (layerId === 'towers-fg' || layerId === 'dome-orb') {
    d.fillStyle = THEME_COLORS.paperPure;
    d.fillRect(width * 0.28, height * 0.25, width * 0.44, height * 0.55);
  }
}

export const sceneS3ArchiveCity: SceneModule = {
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
