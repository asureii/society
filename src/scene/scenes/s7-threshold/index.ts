/**
 * SCENE 7 · CONTACT · "THE THRESHOLD" (src/scene/scenes/s7-threshold/index.ts)
 *
 * Viewpoint: Symmetrical 1-point perspective standing directly in front of a monumental stone
 * doorframe (`pushIn` rig pushing through the threshold).
 * Composition:
 * - `threshold-distant`: Bright white sky & desert causeway vista seen through the portal,
 *   with the Twin Monolith flanking the centered Red Orb.
 * - `threshold-orb`: Centered Red Orb (`[0.50, 0.36]`, `r = 0.068`) framed symmetrically inside
 *   the doorway opening.
 * - `threshold-steps`: Weathered stone threshold steps leading up to the portal sill, keeping the
 *   lower-center (`y: 0.64..0.90`) clean white paper for the Contact caption panel before the
 *   final push-in.
 * - `threshold-doorframe`: Heavy black rectangular stone doorway (`drawThresholdDoorframe`,
 *   chipped, cracked, dry-brush edges) framing the central portal. As the user scrolls to the
 *   end of S7, the camera pushes in and the black doorframe expands to become the full-screen
 *   "THE END?" card.
 */

import { SCENES_MAP } from '../../../config/scenes.config';
import { THEME_COLORS } from '../../../config/theme';
import { drawChippedSlab, drawThresholdDoorframe } from '../../art/architecture';
import { hatchRegion } from '../../art/hatch';
import {
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Point2D,
} from '../../art/inkBrush';
import { drawHandInkedOrb } from '../../art/orb';
import { drawPerspectiveRays } from '../../art/perspective';
import type { SceneDepthDrawContext, SceneLayerDrawContext, SceneModule } from '../types';

const spec = SCENES_MAP['s7-threshold'];

export const id = spec.id;
export const layers = spec.layers;
export const cameraRig = spec.cameraRig;
export const orb = spec.orb;
export const focalRect = spec.focalRect;
export const uiSafeRects = spec.uiSafeRects;
export const blackBudget = spec.blackBudget;

export function generate(ctx: SceneLayerDrawContext): void {
  const { layerId, canvasCtx: c, width, height, rng, structuralRng } = ctx;
  c.clearRect(0, 0, width, height);

  const cx = width * spec.orb.pos[0];
  const cy = height * spec.orb.pos[1];
  const orbR = width * spec.orb.radius;
  const horY = height * 0.50;

  switch (layerId) {
    case 'threshold-distant': {
      // Base white paper sky & ground seen through the portal
      c.fillStyle = THEME_COLORS.paper;
      c.fillRect(0, 0, width, height);

      // Symmetrical horizon line across the portal opening
      drawInkStroke(
        c,
        [
          [width * 0.24, horY + 2],
          [cx, horY - 3],
          [width * 0.76, horY + 2],
        ],
        rng,
        { baseWidth: 2.2, breakChance: 0.12, doubleChance: 0.25 },
      );

      // Twin Monolith flanking the centered Red Orb inside the doorway vista
      drawChippedSlab(
        c,
        {
          x: cx - width * 0.095,
          topY: height * 0.19,
          botY: horY + 12,
          litWidth: width * 0.025,
          shadowWidth: width * 0.017,
          tiltPx: -5,
        },
        rng,
        structuralRng,
      );
      drawChippedSlab(
        c,
        {
          x: cx + width * 0.055,
          topY: height * 0.21,
          botY: horY + 12,
          litWidth: width * 0.024,
          shadowWidth: width * 0.016,
          tiltPx: 5,
        },
        rng,
        structuralRng,
      );

      // Subtle radial perspective rays converging toward the centered portal orb
      drawPerspectiveRays(c, [cx, cy], 16, orbR * 1.35, width * 0.34, rng, {
        baseWidth: 1.25,
        breakChance: 0.22,
      });
      break;
    }

    case 'threshold-orb': {
      // Centered Red Orb ([0.50, 0.36], r = 0.068) framed symmetrically in the doorway
      drawHandInkedOrb(c, cx, cy, orbR, orbR * 0.96, rng, structuralRng, {
        halo: true,
        strokeScale: 0.96,
      });
      break;
    }

    case 'threshold-steps': {
      // Stone steps leading up to the threshold sill (y: 0.50..0.62)
      // Keeps y > 0.63 clean white paper so the Contact caption box before the final push-in
      // sits on crisp white ground
      const stepCount = 5;
      for (let s = 0; s < stepCount; s++) {
        const t = s / (stepCount - 1);
        const sy = horY + 4 + t * (height * 0.11);
        const stepH = 6 + t * 5;
        const halfW = width * (0.14 + t * 0.14);

        const stepPoly: Point2D[] = [
          [cx - halfW * 0.92, sy],
          [cx + halfW * 0.92, sy],
          [cx + halfW, sy + stepH],
          [cx - halfW, sy + stepH],
        ];
        fillRoughenedPolygon(c, stepPoly, rng, THEME_COLORS.paperPure, 1.2);
        hatchRegion(c, stepPoly, rng, {
          angleRad: Math.PI * 0.5,
          baseSpacing: 5.5,
          baseWidth: 1.5,
          toneAt: (u) => (u > 0.65 ? 0.72 : 0.18),
        });
        outlinePolygonWithInk(c, stepPoly, rng, {
          baseWidth: 2.6,
          doubleChance: 0.25,
        });
      }
      break;
    }

    case 'threshold-doorframe': {
      // Monumental chipped black rectangular stone doorframe framing the central portal
      // Inner opening: x = 0.25..0.75, y = 0.14..0.88 so the center stays >= 65% white paper
      drawThresholdDoorframe(
        c,
        width,
        height,
        {
          x: width * 0.24,
          y: height * 0.14,
          w: width * 0.52,
          h: height * 0.76,
        },
        rng,
        structuralRng,
      );
      break;
    }
  }
}

export function generateDepth(ctx: SceneDepthDrawContext): void {
  const { layerId, depthCtx: d, width, height } = ctx;
  d.fillStyle = THEME_COLORS.ink;
  d.fillRect(0, 0, width, height);
  if (layerId === 'threshold-doorframe') {
    d.fillStyle = THEME_COLORS.paperPure;
    d.fillRect(0, 0, width * 0.24, height);
    d.fillRect(width * 0.76, 0, width * 0.24, height);
  }
}

export const sceneS7Threshold: SceneModule = {
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
