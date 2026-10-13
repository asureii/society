/**
 * SCENE 6 · TIMELINE · "THE LONG SCROLL" (src/scene/scenes/s6-long-scroll/index.ts)
 *
 * Viewpoint: Pure side-profile horizontal panorama, like a traditional Japanese emaki handscroll
 * (`track` rig: lateral side-scroll across a wide canvas).
 * Composition:
 * - `scroll-far-monolith`: Far horizon sky, upper-right black ink cloud edge, distant Twin Monolith
 *   and low setting Red Orb on the right (`[0.74, 0.35]`, `r = 0.056`), plus horizontal mist bands.
 * - `scroll-mid-arch`: Broken multi-bay stone viaduct/aqueduct arch (`drawBrokenArch`) and rising
 *   hatched hills across the midplane.
 * - `scroll-causeway`: Long elevated causeway on stilts/rails spanning left-to-right with 4 small
 *   red milestone beacon markers corresponding to the 4 timeline entries.
 * - `scroll-fg-ruins`: Foreground weathered ruined stone pillars (`drawChippedSlab`) and drooping
 *   power cables (`cables.ts`) that pass rapidly across the lateral tracking shot.
 */

import { SCENES_MAP } from '../../../config/scenes.config';
import { THEME_COLORS } from '../../../config/theme';
import { drawBrokenArch, drawChippedSlab } from '../../art/architecture';
import { drawCatenaryCable } from '../../art/cables';
import { hatchRegion } from '../../art/hatch';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Point2D,
} from '../../art/inkBrush';
import { drawHandInkedOrb } from '../../art/orb';
import { drawScreentone } from '../../art/screentone';
import type { SceneDepthDrawContext, SceneLayerDrawContext, SceneModule } from '../types';

const spec = SCENES_MAP['s6-long-scroll'];

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

  // Concentrate the emaki panorama in the upper-middle horizon (y ~ 0.15..0.41) so it shines
  // inside the top window strip (y: 0.15..0.41) and also extends gracefully across the full canvas
  const horY = height * 0.30;

  switch (layerId) {
    case 'scroll-far-monolith': {
      // Base white paper
      c.fillStyle = THEME_COLORS.paper;
      c.fillRect(0, 0, width, height);

      // Ragged black ink storm bank along the upper-right sky edge (x: 0.62..1.0, y: 0..0.22)
      const skyCloud: Point2D[] = [
        [width * 0.62, 0],
        [width, 0],
        [width, height * 0.21],
        [width * 0.88, height * 0.19],
        [width * 0.76, height * 0.14],
        [width * 0.66, height * 0.08],
      ];
      fillRoughenedPolygon(c, skyCloud, rng, THEME_COLORS.ink, 2.2);

      // Low setting Red Orb on the far right ([0.74, 0.35], r = 0.056)
      const orbCx = width * spec.orb.pos[0];
      const orbCy = height * spec.orb.pos[1];
      const orbR = width * spec.orb.radius;

      drawHandInkedOrb(c, orbCx, orbCy, orbR, orbR * 0.96, rng, structuralRng, {
        halo: true,
        strokeScale: 0.92,
      });

      // Twin Monolith rising beside the setting Red Orb on the right horizon (x ~ 0.79..0.85)
      drawChippedSlab(
        c,
        {
          x: width * 0.785,
          topY: height * 0.13,
          botY: horY + 12,
          litWidth: width * 0.022,
          shadowWidth: width * 0.016,
          tiltPx: -5,
        },
        rng,
        structuralRng,
      );
      drawChippedSlab(
        c,
        {
          x: width * 0.835,
          topY: height * 0.16,
          botY: horY + 14,
          litWidth: width * 0.02,
          shadowWidth: width * 0.015,
          tiltPx: 6,
        },
        rng,
        structuralRng,
      );

      // Thin horizontal screentone mist bands separating the far plane
      const mistBand: Point2D[] = [
        [width * 0.05, horY - 14],
        [width * 0.95, horY - 14],
        [width * 0.95, horY + 8],
        [width * 0.05, horY + 8],
      ];
      drawScreentone(c, mistBand, rng, {
        spacing: 11,
        maxRadius: 2.1,
        angleRad: 0.08,
        toneAt: (u, v) => Math.sin(u * Math.PI) * (1 - Math.abs(v - 0.5) * 2) * 0.55,
      });
      break;
    }

    case 'scroll-mid-arch': {
      // Rising ground ridge from left to right + broken multi-bay aqueduct/arch in the midplane
      const ridgePoly: Point2D[] = [
        [0, horY + 26],
        [width * 0.28, horY + 18],
        [width * 0.58, horY + 4],
        [width * 0.82, horY - 6],
        [width, horY - 2],
        [width, horY + 65],
        [0, horY + 65],
      ];
      fillRoughenedPolygon(c, ridgePoly, rng, THEME_COLORS.paperPure, 1.5);
      hatchRegion(c, ridgePoly, rng, {
        angleRad: 0.18,
        baseSpacing: 8.0,
        baseWidth: 1.5,
        toneAt: (_u, v) => (1 - v) * 0.58,
      });
      drawInkStroke(c, ridgePoly.slice(0, 5), rng, {
        baseWidth: 2.6,
        doubleChance: 0.3,
        breakChance: 0.08,
      });

      // Broken aqueduct arches spanning x: 0.26..0.58
      for (let a = 0; a < 3; a++) {
        const ax = width * (0.27 + a * 0.105);
        const ay = horY - 48 + a * 4;
        drawBrokenArch(
          c,
          ax,
          ay,
          width * 0.088,
          height * 0.11,
          width * 0.018,
          rng,
          structuralRng,
        );
      }

      // Horizontal mist strokes drifting across the midplane
      for (let m = 0; m < 5; m++) {
        const mx = width * (0.08 + m * 0.18);
        const my = horY + 8 + (m % 2) * 14;
        drawInkStroke(
          c,
          [
            [mx, my],
            [mx + width * 0.15, my - 2],
          ],
          rng,
          { baseWidth: 1.6, taperScale: 1.25, breakChance: 0.18, doubleChance: 0.15 },
        );
      }
      break;
    }

    case 'scroll-causeway': {
      // Long elevated causeway on stilts/rails spanning horizontally across the scroll
      const deckY = horY + 16;
      const deckThick = 11;

      const deckPoly: Point2D[] = [
        [width * 0.02, deckY],
        [width * 0.96, deckY - 12],
        [width * 0.96, deckY - 12 + deckThick],
        [width * 0.02, deckY + deckThick],
      ];
      fillRoughenedPolygon(c, deckPoly, rng, THEME_COLORS.paperPure, 1.4);
      hatchRegion(c, deckPoly, rng, {
        angleRad: Math.PI * 0.5,
        baseSpacing: 5.5,
        baseWidth: 1.7,
        toneAt: () => 0.72,
      });
      outlinePolygonWithInk(c, deckPoly, rng, {
        baseWidth: 3.2,
        doubleChance: 0.32,
      });

      // Vertical stilts supporting the elevated causeway
      const stiltCount = 14;
      for (let s = 0; s < stiltCount; s++) {
        const u = (s + 0.5) / stiltCount;
        const sx = width * (0.04 + u * 0.90);
        const syTop = deckY - u * 12 + deckThick;
        const syBot = syTop + height * 0.065;
        drawInkStroke(
          c,
          [
            [sx - 3, syTop],
            [sx - 3, syBot],
          ],
          rng,
          { baseWidth: 2.4, doubleChance: 0.2 },
        );
        drawInkStroke(
          c,
          [
            [sx + 3, syTop],
            [sx + 3, syBot],
          ],
          rng,
          { baseWidth: 3.0, color: THEME_COLORS.ink },
        );
      }

      // 4 small red milestone markers along the causeway corresponding to the 4 timeline milestones (Part B6)
      const milestoneXs = [0.18, 0.38, 0.56, 0.72];
      for (let i = 0; i < milestoneXs.length; i++) {
        const u = milestoneXs[i];
        const mx = width * u;
        const my = deckY - u * 12;

        // Vertical pylon mast
        drawInkStroke(
          c,
          [
            [mx, my],
            [mx, my - 34],
          ],
          rng,
          { baseWidth: 2.5, doubleChance: 0.25 },
        );

        // Red beacon diamond / marker head
        const markerPoly: Point2D[] = [
          [mx, my - 46],
          [mx + 8, my - 37],
          [mx, my - 28],
          [mx - 8, my - 37],
        ];
        fillRoughenedPolygon(c, markerPoly, rng, THEME_COLORS.red, 1.0);
        outlinePolygonWithInk(c, markerPoly, rng, {
          baseWidth: 2.0,
          color: THEME_COLORS.ink,
        });
      }
      break;
    }

    case 'scroll-fg-ruins': {
      // Foreground ruined stone pillars on the left and center-left + drooping cables
      drawChippedSlab(
        c,
        {
          x: width * 0.09,
          topY: height * 0.11,
          botY: horY + 46,
          litWidth: width * 0.026,
          shadowWidth: width * 0.018,
          tiltPx: 7,
        },
        rng,
        structuralRng,
      );
      drawChippedSlab(
        c,
        {
          x: width * 0.21,
          topY: height * 0.16,
          botY: horY + 42,
          litWidth: width * 0.022,
          shadowWidth: width * 0.015,
          tiltPx: -6,
        },
        rng,
        structuralRng,
      );

      // Drooping catenary cable strung between the foreground ruined pillars
      drawCatenaryCable(c, {
        start: [width * 0.11, height * 0.15],
        end: [width * 0.22, height * 0.19],
        sag: height * 0.06,
        baseWidth: 2.4,
        rng,
        structuralRng,
        tieTicks: true,
      });

      // Subtle foreground stone fragments & gravel at the lower corners of the panorama strip
      for (let d = 0; d < 12; d++) {
        const dx = structuralRng.range(width * 0.06, width * 0.92);
        const dy = horY + structuralRng.range(24, 52);
        drawInkDot(c, dx, dy, rng.range(1.4, 3.2), rng, THEME_COLORS.ink);
      }
      break;
    }
  }
}

export function generateDepth(ctx: SceneDepthDrawContext): void {
  const { layerId, depthCtx: d, width, height } = ctx;
  d.fillStyle = THEME_COLORS.ink;
  d.fillRect(0, 0, width, height);
  if (layerId === 'scroll-fg-ruins' || layerId === 'scroll-causeway') {
    d.fillStyle = THEME_COLORS.paperPure;
    d.fillRect(0, height * 0.1, width, height * 0.35);
  }
}

export const sceneS6LongScroll: SceneModule = {
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
