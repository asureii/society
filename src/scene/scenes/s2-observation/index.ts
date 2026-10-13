/**
 * SCENE 2 · DOSSIER (ABOUT) · "THE OBSERVATION ROOM" (src/scene/scenes/s2-observation/index.ts)
 *
 * Viewpoint: Interior architectural shot looking out through a round aperture (`drift` rig).
 * Composition:
 * - `window-view`: Bright white sky visible through the central circular porthole with the distant
 *   Twin Monolith and a small Red Orb disc at (x=0.50, y=0.42, r=0.052).
 * - `room-walls`: Control room bulkhead wall panels with subtle hexagonal technical linework,
 *   bolted steel seams, and hatched bevels surrounding the central round aperture.
 * - `ceiling-ribs`: Ribbed ceiling beams receding in 1-point perspective toward the central aperture,
 *   with framed black ink shadow pockets at the outer corners.
 * - `cables`: Drooping catenary cables (`cables.ts`) hanging across the upper-left and upper-right bays.
 * - `console-fg`: Low observation console silhouette along the bottom with hatched instrument slopes
 *   and 3 tiny red indicator lights.
 */

import { SCENES_MAP } from '../../../config/scenes.config';
import { THEME_COLORS } from '../../../config/theme';
import { drawChippedSlab } from '../../art/architecture';
import { drawCableBundle, drawCatenaryCable } from '../../art/cables';
import { hatchRegion } from '../../art/hatch';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Point2D,
} from '../../art/inkBrush';
import { drawHandInkedOrb } from '../../art/orb';
import { drawHexLattice, drawPerspectiveRays } from '../../art/perspective';
import { drawConcentricRings } from '../../art/radial';
import type { SceneDepthDrawContext, SceneLayerDrawContext, SceneModule } from '../types';

const spec = SCENES_MAP['s2-observation'];

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

  const cx = width * 0.5;
  const cy = height * 0.42;
  const portR = Math.min(width, height) * 0.29;

  switch (layerId) {
    case 'window-view': {
      // Base bright white paper sky
      c.fillStyle = THEME_COLORS.paper;
      c.fillRect(0, 0, width, height);

      // Distant horizon line across the porthole at y = cy + portR * 0.34
      const horY = cy + portR * 0.34;
      drawInkStroke(
        c,
        [
          [cx - portR * 0.92, horY + 3],
          [cx, horY - 2],
          [cx + portR * 0.92, horY + 4],
        ],
        rng,
        { baseWidth: 2.0, breakChance: 0.14, doubleChance: 0.25 },
      );

      // Distant Twin Monolith silhouettes rising from the horizon inside the porthole
      drawChippedSlab(
        c,
        {
          x: cx - portR * 0.22,
          topY: cy - portR * 0.36,
          botY: horY + 6,
          litWidth: portR * 0.085,
          shadowWidth: portR * 0.055,
          tiltPx: -4,
        },
        rng,
        structuralRng,
      );
      drawChippedSlab(
        c,
        {
          x: cx + portR * 0.08,
          topY: cy - portR * 0.26,
          botY: horY + 8,
          litWidth: portR * 0.075,
          shadowWidth: portR * 0.05,
          tiltPx: 5,
        },
        rng,
        structuralRng,
      );

      // Small Red Orb disc centered at (0.50, 0.42) with radius 0.052 * width
      const orbR = width * spec.orb.radius;
      drawHandInkedOrb(c, cx, cy, orbR, orbR * 0.97, rng, structuralRng, {
        halo: true,
        strokeScale: 0.85,
      });

      // Sparse wind lines and distant ground stipple inside the porthole
      for (let w = 0; w < 3; w++) {
        const wy = cy - portR * (0.52 - w * 0.18);
        drawInkStroke(
          c,
          [
            [cx - portR * 0.65, wy],
            [cx, wy - 8],
            [cx + portR * 0.62, wy + 4],
          ],
          rng,
          { baseWidth: 1.4, taperScale: 1.2, breakChance: 0.12 },
        );
      }
      break;
    }

    case 'room-walls': {
      // Interior bulkhead wall surrounding the central circular porthole
      // Build outer rectangle with inner circular aperture cutout using evenodd path
      c.save();
      c.fillStyle = THEME_COLORS.paper;
      c.beginPath();
      c.rect(0, 0, width, height);
      c.arc(cx, cy, portR, 0, Math.PI * 2, true);
      c.fill('evenodd');
      c.restore();

      // Subtle hexagonal linework on the left and right bulkhead wall bays
      const leftWallBay: Point2D[] = [
        [width * 0.04, height * 0.18],
        [cx - portR - 24, height * 0.22],
        [cx - portR - 24, height * 0.72],
        [width * 0.04, height * 0.76],
      ];
      const rightWallBay: Point2D[] = [
        [cx + portR + 24, height * 0.22],
        [width * 0.96, height * 0.18],
        [width * 0.96, height * 0.76],
        [cx + portR + 24, height * 0.72],
      ];

      drawHexLattice(c, leftWallBay, 34, rng, {
        color: THEME_COLORS.ink,
        baseWidth: 1.35,
        skipChance: 0.28,
      });
      drawHexLattice(c, rightWallBay, 34, rng, {
        color: THEME_COLORS.ink,
        baseWidth: 1.35,
        skipChance: 0.28,
      });

      // Diagonal hatching along the recessed bulkhead bevels
      hatchRegion(c, leftWallBay, rng, {
        angleRad: Math.PI * 0.25,
        baseSpacing: 9.5,
        baseWidth: 1.5,
        toneAt: (u, v) => Math.max(0, (1 - u) * 0.52 + Math.abs(v - 0.5) * 0.3),
      });
      hatchRegion(c, rightWallBay, rng, {
        angleRad: -Math.PI * 0.25,
        baseSpacing: 9.5,
        baseWidth: 1.5,
        toneAt: (u, v) => Math.max(0, u * 0.52 + Math.abs(v - 0.5) * 0.3),
      });

      outlinePolygonWithInk(c, leftWallBay, rng, { baseWidth: 3.0, doubleChance: 0.3 });
      outlinePolygonWithInk(c, rightWallBay, rng, { baseWidth: 3.0, doubleChance: 0.3 });

      // Concentric hand-inked steel porthole frame rings and mechanical crosshairs
      drawConcentricRings(c, {
        cx,
        cy,
        minRadius: portR * 0.98,
        maxRadius: portR * 1.18,
        ringCount: 4,
        rng,
        structuralRng,
        baseWidth: 3.8,
        breakChance: 0.05,
        doubleChance: 0.38,
        radialTicks: true,
      });

      // 8 heavy structural bolt heads around the porthole collar
      for (let b = 0; b < 8; b++) {
        const ang = (b / 8) * Math.PI * 2 + Math.PI * 0.125;
        const bx = cx + Math.cos(ang) * (portR * 1.08);
        const by = cy + Math.sin(ang) * (portR * 1.08);
        drawInkDot(c, bx, by, 5.2, rng, THEME_COLORS.ink);
        drawInkDot(c, bx - 1.2, by - 1.2, 1.8, rng, THEME_COLORS.paperPure);
      }
      break;
    }

    case 'ceiling-ribs': {
      // Ribbed ceiling beams receding in perspective toward the porthole + outer corner black ink masses
      // Outer upper-left and upper-right black ink masses framing the dim room corners (kept compact for white budget)
      const topLeftInk: Point2D[] = [
        [0, 0],
        [width * 0.26, 0],
        [width * 0.16, height * 0.16],
        [width * 0.05, height * 0.34],
        [0, height * 0.42],
      ];
      const topRightInk: Point2D[] = [
        [width * 0.74, 0],
        [width, 0],
        [width, height * 0.42],
        [width * 0.95, height * 0.34],
        [width * 0.84, height * 0.16],
      ];
      fillRoughenedPolygon(c, topLeftInk, rng, THEME_COLORS.ink, 2.4);
      fillRoughenedPolygon(c, topRightInk, rng, THEME_COLORS.ink, 2.4);

      // Ribbed ceiling beams converging toward (cx, cy)
      const ribAngles = [-2.75, -2.42, -2.08, -1.78, -1.36, -1.06, -0.72, -0.39];
      for (const ang of ribAngles) {
        const rInner = portR * 1.15;
        const rOuter = Math.max(width, height) * 0.78;
        const x0 = cx + Math.cos(ang) * rInner;
        const y0 = cy + Math.sin(ang) * rInner;
        const x1 = cx + Math.cos(ang) * rOuter;
        const y1 = cy + Math.sin(ang) * rOuter;

        // Beam thickness flange
        const perpX = -Math.sin(ang) * 14;
        const perpY = Math.cos(ang) * 14;
        const beamPoly: Point2D[] = [
          [x0, y0],
          [x1, y1],
          [x1 + perpX, y1 + perpY],
          [x0 + perpX * 0.4, y0 + perpY * 0.4],
        ];
        fillRoughenedPolygon(c, beamPoly, rng, THEME_COLORS.paperPure, 1.2);
        hatchRegion(c, beamPoly, rng, {
          angleRad: ang + Math.PI * 0.5,
          baseSpacing: 5.5,
          baseWidth: 1.8,
          toneAt: () => 0.72,
        });
        outlinePolygonWithInk(c, beamPoly, rng, {
          baseWidth: 3.4,
          doubleChance: 0.3,
          dryBrush: true,
        });
      }

      // Subtle perspective rays across ceiling and floor bays
      drawPerspectiveRays(c, [cx, cy], 18, portR * 1.18, Math.max(width, height) * 0.72, rng, {
        angleStartRad: -Math.PI * 0.92,
        angleEndRad: -Math.PI * 0.08,
        baseWidth: 1.4,
        breakChance: 0.16,
      });
      break;
    }

    case 'cables': {
      // Hanging catenary cables draped across the upper observation room bays
      drawCableBundle(
        c,
        [width * 0.04, height * 0.08],
        [cx - portR * 0.82, cy - portR * 0.62],
        height * 0.14,
        3,
        rng,
        structuralRng,
        3.2,
      );
      drawCableBundle(
        c,
        [cx + portR * 0.82, cy - portR * 0.62],
        [width * 0.96, height * 0.09],
        height * 0.15,
        3,
        rng,
        structuralRng,
        3.2,
      );
      drawCatenaryCable(c, {
        start: [width * 0.12, height * 0.02],
        end: [width * 0.88, height * 0.03],
        sag: height * 0.11,
        baseWidth: 2.6,
        rng,
        structuralRng,
        tieTicks: true,
      });
      break;
    }

    case 'console-fg': {
      // Low control console silhouette along the bottom with sloped instrument banks and 3 tiny red indicator lights
      const consoleTopY = height * 0.81;
      const consolePoly: Point2D[] = [
        [0, height * 0.85],
        [width * 0.18, consoleTopY],
        [width * 0.36, consoleTopY + 12],
        [width * 0.64, consoleTopY + 12],
        [width * 0.82, consoleTopY],
        [width, height * 0.85],
        [width, height],
        [0, height],
      ];

      fillRoughenedPolygon(c, consolePoly, rng, THEME_COLORS.paperPure, 1.8);

      // Solid black shadow base at the very bottom edge (y: 0.91..1.0)
      const consoleShadowCore: Point2D[] = [
        [0, height * 0.91],
        [width * 0.25, height * 0.89],
        [width * 0.75, height * 0.89],
        [width, height * 0.91],
        [width, height],
        [0, height],
      ];
      fillRoughenedPolygon(c, consoleShadowCore, rng, THEME_COLORS.ink, 2.0);

      // Hatched sloped instrument deck
      hatchRegion(c, consolePoly, rng, {
        angleRad: Math.PI * 0.48,
        baseSpacing: 5.8,
        baseWidth: 2.1,
        toneAt: (_u, v) => 0.38 + v * 0.55,
      });

      outlinePolygonWithInk(c, consolePoly, rng, {
        baseWidth: 4.5,
        doubleChance: 0.35,
        dryBrush: true,
      });

      // 3 tiny red indicator lights on the observation console (Part B2)
      const indicators: Point2D[] = [
        [width * 0.44, consoleTopY + 26],
        [width * 0.5, consoleTopY + 24],
        [width * 0.56, consoleTopY + 26],
      ];
      for (const [ix, iy] of indicators) {
        drawInkDot(c, ix, iy, 5.2, rng, THEME_COLORS.red);
        drawInkStroke(
          c,
          [
            [ix - 6, iy],
            [ix, iy - 6],
            [ix + 6, iy],
            [ix, iy + 6],
            [ix - 6, iy],
          ],
          rng,
          { baseWidth: 1.6, color: THEME_COLORS.ink, doubleChance: 0.1 },
        );
      }
      break;
    }
  }
}

export function generateDepth(ctx: SceneDepthDrawContext): void {
  const { layerId, depthCtx: d, width, height } = ctx;
  d.fillStyle = THEME_COLORS.ink;
  d.fillRect(0, 0, width, height);
  if (layerId === 'console-fg' || layerId === 'room-walls') {
    d.fillStyle = THEME_COLORS.paperPure;
    d.fillRect(0, height * 0.75, width, height * 0.25);
  }
}

export const sceneS2Observation: SceneModule = {
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
