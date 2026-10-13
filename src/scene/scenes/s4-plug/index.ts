/**
 * SCENE 4 · PILOT STATUS · "THE PLUG" (src/scene/scenes/s4-plug/index.ts)
 *
 * Viewpoint: Centered radial composition looking straight down a cylindrical shaft
 * (`pushIn` rig with a ±3° roll).
 * Composition:
 * - `plug-chamber`: White pool/chamber floor with radial shaft depth lines and subtle halftone rings.
 * - `plug-rings`: Concentric hand-inked ripple rings (`radial.ts`) whose ring density reacts to
 *   Discord Lanyard presence (`online` = 16 rings + dense radial ticks, `idle` = 11 rings,
 *   `offline`/`dnd` = 7 sparse rings).
 * - `plug-orb`: Half-submerged Red Orb in the exact center (`[0.50, 0.50]`, `r = 0.085`) with
 *   curved liquid reflection lines beneath the waterline.
 * - `plug-corner-frame`: Black ink masses in the outer corners framing the circular cylindrical shaft,
 *   keeping the central focal zone and bottom-right diagnostic panel zone open.
 */

import { SCENES_MAP } from '../../../config/scenes.config';
import { THEME_COLORS } from '../../../config/theme';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Point2D,
} from '../../art/inkBrush';
import { drawHandInkedOrb } from '../../art/orb';
import { drawPerspectiveRays } from '../../art/perspective';
import { drawConcentricRings, drawSubmergedOrbReflections } from '../../art/radial';
import { drawScreentone } from '../../art/screentone';
import type { SceneDepthDrawContext, SceneLayerDrawContext, SceneModule } from '../types';

const spec = SCENES_MAP['s4-plug'];

export const id = spec.id;
export const layers = spec.layers;
export const cameraRig = spec.cameraRig;
export const orb = spec.orb;
export const focalRect = spec.focalRect;
export const uiSafeRects = spec.uiSafeRects;
export const blackBudget = spec.blackBudget;

export function generate(ctx: SceneLayerDrawContext): void {
  const { layerId, canvasCtx: c, width, height, rng, structuralRng, presenceStatus = 'online' } = ctx;
  c.clearRect(0, 0, width, height);

  const cx = width * spec.orb.pos[0];
  const cy = height * spec.orb.pos[1];
  const orbR = width * spec.orb.radius;
  const maxShaftR = Math.min(width, height) * 0.46;

  switch (layerId) {
    case 'plug-chamber': {
      // Base white paper chamber floor
      c.fillStyle = THEME_COLORS.paper;
      c.fillRect(0, 0, width, height);

      // Radial cylindrical shaft guide lines converging toward the central pool
      drawPerspectiveRays(c, [cx, cy], 24, orbR * 1.45, maxShaftR * 1.15, rng, {
        baseWidth: 1.35,
        breakChance: 0.22,
      });

      // Subtle outer screentone ring band near the shaft perimeter (avoids bottom-right UI safe rect)
      const upperRingBand: Point2D[] = [
        [cx - maxShaftR * 0.92, cy - maxShaftR * 0.65],
        [cx + maxShaftR * 0.92, cy - maxShaftR * 0.65],
        [cx + maxShaftR * 0.72, cy - maxShaftR * 0.35],
        [cx - maxShaftR * 0.72, cy - maxShaftR * 0.35],
      ];
      drawScreentone(c, upperRingBand, rng, {
        spacing: 13,
        maxRadius: 2.3,
        angleRad: Math.PI * 0.25,
        toneAt: (u, v) => Math.sin(u * Math.PI) * (1 - v) * 0.55,
      });
      break;
    }

    case 'plug-rings': {
      // Presence-reactive concentric hand-inked ripple rings (Part B4)
      const ringCount =
        presenceStatus === 'online'
          ? 15
          : presenceStatus === 'idle'
            ? 10
            : 6;

      drawConcentricRings(c, {
        cx,
        cy,
        minRadius: orbR * 1.12,
        maxRadius: maxShaftR * 0.96,
        ringCount,
        rng,
        structuralRng,
        aspectY: 0.96,
        baseWidth: presenceStatus === 'online' ? 2.6 : 2.1,
        breakChance: presenceStatus === 'online' ? 0.08 : 0.18,
        doubleChance: presenceStatus === 'online' ? 0.35 : 0.18,
        radialTicks: presenceStatus === 'online' || presenceStatus === 'idle',
      });

      // Outer mechanical calibration ring at maxShaftR
      drawConcentricRings(c, {
        cx,
        cy,
        minRadius: maxShaftR * 0.99,
        maxRadius: maxShaftR * 1.05,
        ringCount: 2,
        rng,
        structuralRng,
        aspectY: 0.96,
        baseWidth: 3.6,
        breakChance: 0.04,
        doubleChance: 0.4,
        radialTicks: true,
      });
      break;
    }

    case 'plug-orb': {
      // Half-submerged Red Orb in the exact center ([0.50, 0.50]) with curved reflection lines beneath it
      const waterlineY = cy + orbR * 0.24;

      // Draw the submerged upper hemisphere + waterline meniscus
      drawHandInkedOrb(c, cx, cy, orbR, orbR * 0.96, rng, structuralRng, {
        halo: true,
        submergedBelowY: waterlineY,
        strokeScale: 1.05,
      });

      // Horizontal hand-inked waterline meniscus stroke across the submerged base
      drawInkStroke(
        c,
        [
          [cx - orbR * 1.18, waterlineY],
          [cx, waterlineY + 3],
          [cx + orbR * 1.18, waterlineY],
        ],
        rng,
        {
          baseWidth: 3.4,
          color: THEME_COLORS.ink,
          doubleChance: 0.4,
          dryBrush: true,
        },
      );

      // Curved black & red reflection ripples beneath the half-submerged orb
      drawSubmergedOrbReflections(c, cx, waterlineY + 6, orbR * 0.95, orbR * 1.05, rng);
      break;
    }

    case 'plug-corner-frame': {
      // Black ink masses in the outer corners framing the circular shaft
      // Keep bottom-right corner lighter/cropped above y=0.50 so the bottom-right diagnostic panel
      // sits cleanly on white paper with zero dark ink behind its text
      const topLeftCorner: Point2D[] = [
        [0, 0],
        [width * 0.28, 0],
        [width * 0.16, height * 0.16],
        [width * 0.06, height * 0.34],
        [0, height * 0.48],
      ];
      const topRightCorner: Point2D[] = [
        [width * 0.72, 0],
        [width, 0],
        [width, height * 0.42],
        [width * 0.93, height * 0.28],
        [width * 0.84, height * 0.15],
      ];
      const botLeftCorner: Point2D[] = [
        [0, height * 0.56],
        [width * 0.07, height * 0.70],
        [width * 0.17, height * 0.85],
        [width * 0.28, height],
        [0, height],
      ];

      for (const poly of [topLeftCorner, topRightCorner, botLeftCorner]) {
        fillRoughenedPolygon(c, poly, rng, THEME_COLORS.ink, 2.5);
        outlinePolygonWithInk(c, poly, rng, {
          baseWidth: 4.8,
          dryBrush: true,
          doubleChance: 0.35,
        });
      }

      // White speckle holes inside the corner black ink masses
      for (let s = 0; s < 36; s++) {
        const cornerIdx = s % 3;
        const hx =
          cornerIdx === 0
            ? structuralRng.range(12, width * 0.18)
            : cornerIdx === 1
              ? structuralRng.range(width * 0.82, width - 12)
              : structuralRng.range(12, width * 0.18);
        const hy =
          cornerIdx === 0
            ? structuralRng.range(12, height * 0.28)
            : cornerIdx === 1
              ? structuralRng.range(12, height * 0.24)
              : structuralRng.range(height * 0.74, height - 12);
        drawInkDot(c, hx, hy, structuralRng.range(1.6, 5.5), rng, THEME_COLORS.paperPure);
      }
      break;
    }
  }
}

export function generateDepth(ctx: SceneDepthDrawContext): void {
  const { layerId, depthCtx: d, width, height } = ctx;
  d.fillStyle = THEME_COLORS.ink;
  d.fillRect(0, 0, width, height);
  if (layerId === 'plug-orb') {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const r = width * 0.12;
    d.fillStyle = THEME_COLORS.paperPure;
    d.beginPath();
    d.arc(cx, cy, r, 0, Math.PI * 2);
    d.fill();
  }
}

export const sceneS4Plug: SceneModule = {
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
