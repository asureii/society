/**
 * SCENE 5 · SKILLS · "THE THREE PILLARS" (src/scene/scenes/s5-three-pillars/index.ts)
 *
 * Viewpoint: Extreme worm's-eye low angle looking almost straight up, with an ~8° Dutch-angle
 * tilt (`tiltUp` rig).
 * Composition:
 * - `hex-sky`: Black ink sky mass in the upper canopy (<= 35% of canvas) etched with a subtle
 *   white-line hexagonal lattice (`drawHexLattice`).
 * - `red-hex-orb`: A single pulsing red hex cell and red orb core at the high vanishing point
 *   (`[0.50, 0.22]`, `r = 0.044`) with worm's-eye speedlines radiating outward.
 * - `pillar-left-right`: Two colossal outer rectangular slabs (Balthasar / Caspar echoes) rising
 *   from the bottom-left and bottom-right corners, converging toward the high vanishing point
 *   with foreshortened hatching (`drawWormsEyePillar`).
 * - `pillar-center`: The third colossal slab rising from the lower-center edge toward the
 *   vanishing point with chipped stone monolith relief and vertical foreshortened hatching.
 * - `base-stairs`: Tiny architectural stairs and plaza ledges at the bottom base to establish
 *   colossal scale.
 */

import { SCENES_MAP } from '../../../config/scenes.config';
import { THEME_COLORS } from '../../../config/theme';
import { hatchRegion } from '../../art/hatch';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Point2D,
} from '../../art/inkBrush';
import { drawHandInkedOrb } from '../../art/orb';
import {
  drawHexLattice,
  drawSingleHexCell,
  drawWormsEyePillar,
} from '../../art/perspective';
import { drawRadialSpeedlines } from '../../art/speedlines';
import type { SceneDepthDrawContext, SceneLayerDrawContext, SceneModule } from '../types';

const spec = SCENES_MAP['s5-three-pillars'];

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

  const vp: Point2D = [width * spec.orb.pos[0], height * spec.orb.pos[1]];

  switch (layerId) {
    case 'hex-sky': {
      // Base white paper
      c.fillStyle = THEME_COLORS.paper;
      c.fillRect(0, 0, width, height);

      // Upper black ink sky canopy between the converging pillar tops (kept to ~28% area so white >= 68%)
      const skyPoly: Point2D[] = [
        [width * 0.08, 0],
        [width * 0.92, 0],
        [width * 0.84, height * 0.36],
        [width * 0.66, height * 0.44],
        [width * 0.50, height * 0.46],
        [width * 0.34, height * 0.44],
        [width * 0.16, height * 0.36],
      ];
      fillRoughenedPolygon(c, skyPoly, rng, THEME_COLORS.ink, 2.8);

      // Ragged dry-brush fringe along the lower edge of the black ink canopy
      for (let i = 2; i < skyPoly.length - 1; i++) {
        drawInkStroke(c, [skyPoly[i], skyPoly[i + 1]], rng, {
          baseWidth: 5.2,
          color: THEME_COLORS.ink,
          dryBrush: true,
          doubleChance: 0.4,
        });
      }

      // White-line hexagonal lattice etched inside the black ink sky canopy
      drawHexLattice(c, skyPoly, 36, rng, {
        color: THEME_COLORS.paperPure,
        baseWidth: 1.5,
        skipChance: 0.18,
      });

      // White speckle stars inside the upper black sky
      for (let s = 0; s < 48; s++) {
        const sx = structuralRng.range(width * 0.16, width * 0.84);
        const sy = structuralRng.range(10, height * 0.36);
        drawInkDot(c, sx, sy, structuralRng.range(1.2, 3.6), rng, THEME_COLORS.paperPure);
      }
      break;
    }

    case 'red-hex-orb': {
      // Pulsing Red Hex Cell & Orb core at the high vanishing point ([0.50, 0.22])
      const hexR = width * spec.orb.radius;

      // Subtle worm's-eye radial speedlines radiating from the vanishing point into the lower sky
      drawRadialSpeedlines(c, {
        focus: vp,
        innerRadius: hexR * 1.45,
        outerRadius: Math.max(width, height) * 0.68,
        lineCount: 38,
        rng,
        angleStartRad: 0.15,
        angleEndRad: Math.PI - 0.15,
        baseWidth: 1.7,
        color: THEME_COLORS.ink,
      });

      // Outer concentric white + red hex rings around the vanishing point
      drawSingleHexCell(c, vp[0], vp[1], hexR * 1.38, rng, {
        strokeColor: THEME_COLORS.paperPure,
        baseWidth: 2.6,
      });
      drawSingleHexCell(c, vp[0], vp[1], hexR * 1.16, rng, {
        fillColor: THEME_COLORS.red,
        strokeColor: THEME_COLORS.paperPure,
        baseWidth: 3.0,
      });

      // Red Orb core inside the central hex cell so the orb iris transition matches seamlessly
      drawHandInkedOrb(c, vp[0], vp[1], hexR * 0.88, hexR * 0.88, rng, structuralRng, {
        halo: false,
        strokeScale: 0.9,
      });
      break;
    }

    case 'pillar-left-right': {
      // Colossal left & right converging rectangular pillars rising from the bottom corners toward vp
      // Left Pillar (Pillar 01 // Balthasar echo)
      drawWormsEyePillar(
        c,
        [width * 0.02, height * 0.98],
        [width * 0.27, height * 0.98],
        [width * 0.34, height * 0.94],
        vp,
        0.72,
        rng,
      );

      // Right Pillar (Pillar 03 // Caspar echo)
      drawWormsEyePillar(
        c,
        [width * 0.98, height * 0.98],
        [width * 0.73, height * 0.98],
        [width * 0.66, height * 0.94],
        vp,
        0.72,
        rng,
      );
      break;
    }

    case 'pillar-center': {
      // Third colossal slab rising from the lower-center edge toward the high vanishing point
      drawWormsEyePillar(
        c,
        [width * 0.39, height],
        [width * 0.53, height],
        [width * 0.58, height * 0.96],
        vp,
        0.64,
        rng,
      );

      // Etched monolith seam markers along the center pillar lit face
      for (let k = 1; k <= 4; k++) {
        const t = k * 0.14;
        const y = height * (1 - t * 0.75);
        const x0 = width * 0.42 + (vp[0] - width * 0.42) * t;
        const x1 = width * 0.51 + (vp[0] - width * 0.51) * t;
        drawInkStroke(
          c,
          [
            [x0, y],
            [x1, y - 4],
          ],
          rng,
          { baseWidth: 1.8, taperScale: 1.2, doubleChance: 0.2 },
        );
      }
      break;
    }

    case 'base-stairs': {
      // Tiny architectural stairs at the bottom base to establish colossal scale (Part B5)
      const stairBaseX = width * 0.36;
      const stairBaseW = width * 0.28;
      const stairSteps = 9;
      const stepH = 7.5;

      for (let s = 0; s < stairSteps; s++) {
        const frac = s / stairSteps;
        const sy = height - 10 - s * stepH;
        const sw = stairBaseW * (1 - frac * 0.36);
        const sx = stairBaseX + (stairBaseW - sw) * 0.5;

        const stepPoly: Point2D[] = [
          [sx, sy - stepH],
          [sx + sw, sy - stepH],
          [sx + sw + 4, sy],
          [sx - 4, sy],
        ];
        fillRoughenedPolygon(c, stepPoly, rng, THEME_COLORS.paperPure, 1.0);
        hatchRegion(c, stepPoly, rng, {
          angleRad: Math.PI * 0.5,
          baseSpacing: 4.5,
          baseWidth: 1.3,
          toneAt: (u) => (u > 0.65 ? 0.8 : 0.2),
        });
        outlinePolygonWithInk(c, stepPoly, rng, {
          baseWidth: 2.0,
          doubleChance: 0.15,
        });
      }
      break;
    }
  }
}

export function generateDepth(ctx: SceneDepthDrawContext): void {
  const { layerId, depthCtx: d, width, height } = ctx;
  d.fillStyle = THEME_COLORS.ink;
  d.fillRect(0, 0, width, height);
  if (layerId === 'pillar-center' || layerId === 'pillar-left-right') {
    const grad = d.createLinearGradient(0, height * 0.2, 0, height);
    grad.addColorStop(0, THEME_COLORS.ink);
    grad.addColorStop(1, THEME_COLORS.paperPure);
    d.fillStyle = grad;
    d.fillRect(0, 0, width, height);
  }
}

export const sceneS5ThreePillars: SceneModule = {
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
