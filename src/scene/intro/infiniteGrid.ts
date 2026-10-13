/**
 * HAND-INKED INFINITE PERSPECTIVE GRID ATLAS & SHADER (src/scene/intro/infiniteGrid.ts)
 *
 * Generates an 8-cell (`4x2`) hand-inked grid-cell atlas using `drawInkStroke` and `drawInkDot`
 * with varied line weight, wobble, corner overshoots, and broken dash segments,
 * plus the GLSL inverse-perspective plane projection that scrolls `z` seamlessly
 * with modulo wrapping and thins/dashes lines toward the horizon (never grey).
 */

import { THEME_COLORS } from '../../config/theme';
import { drawInkDot, drawInkStroke } from '../art/inkBrush';
import { createRng } from '../art/rng';

export function generateInfiniteGridAtlas(
  width = 1024,
  height = 512,
  seed = 20261012,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const rng = createRng(seed ^ 0x51a3);

  // Fill entire atlas with warm manga paper (#FAFAF8)
  ctx.fillStyle = THEME_COLORS.paper;
  ctx.fillRect(0, 0, width, height);

  const cols = 4;
  const rows = 2;
  const cellW = width / cols;
  const cellH = height / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const variant = row * cols + col;
      const ox = col * cellW;
      const oy = row * cellH;

      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, cellW, cellH);
      ctx.clip();

      const margin = 14;
      const weightH = rng.range(3.2, 4.8);
      const weightV = rng.range(3.2, 4.8);
      const wobbleScale = rng.range(0.75, 1.35);

      // Primary top horizontal ruling (with slight overshoot or dash break in some variants)
      if (variant % 3 === 1) {
        const gapStart = rng.range(0.38, 0.52);
        const gapEnd = gapStart + rng.range(0.08, 0.14);
        drawInkStroke(
          ctx,
          [
            [ox - 6, oy + margin],
            [ox + cellW * gapStart, oy + margin + rng.range(-1, 1)],
          ],
          rng,
          { baseWidth: weightH, color: THEME_COLORS.ink, wobbleScale },
        );
        drawInkStroke(
          ctx,
          [
            [ox + cellW * gapEnd, oy + margin + rng.range(-1, 1)],
            [ox + cellW + 6, oy + margin],
          ],
          rng,
          { baseWidth: weightH, color: THEME_COLORS.ink, wobbleScale },
        );
      } else {
        drawInkStroke(
          ctx,
          [
            [ox - 6, oy + margin],
            [ox + cellW * 0.5, oy + margin + rng.range(-1.2, 1.2)],
            [ox + cellW + 6, oy + margin],
          ],
          rng,
          { baseWidth: weightH, color: THEME_COLORS.ink, wobbleScale },
        );
      }

      // Primary left vertical ruling (converges toward vanishing point in shader)
      if (variant % 4 === 2) {
        const gapStart = rng.range(0.42, 0.56);
        const gapEnd = gapStart + rng.range(0.08, 0.13);
        drawInkStroke(
          ctx,
          [
            [ox + margin, oy - 6],
            [ox + margin + rng.range(-1, 1), oy + cellH * gapStart],
          ],
          rng,
          { baseWidth: weightV, color: THEME_COLORS.ink, wobbleScale },
        );
        drawInkStroke(
          ctx,
          [
            [ox + margin + rng.range(-1, 1), oy + cellH * gapEnd],
            [ox + margin, oy + cellH + 6],
          ],
          rng,
          { baseWidth: weightV, color: THEME_COLORS.ink, wobbleScale },
        );
      } else {
        drawInkStroke(
          ctx,
          [
            [ox + margin, oy - 6],
            [ox + margin + rng.range(-1.2, 1.2), oy + cellH * 0.5],
            [ox + margin, oy + cellH + 6],
          ],
          rng,
          { baseWidth: weightV, color: THEME_COLORS.ink, wobbleScale },
        );
      }

      // Corner overshoot tick at intersection (top-left of cell)
      drawInkStroke(
        ctx,
        [
          [ox + margin - 7, oy + margin + rng.range(2, 5)],
          [ox + margin + rng.range(10, 18), oy + margin + rng.range(2, 5)],
        ],
        rng,
        { baseWidth: 1.8, color: THEME_COLORS.ink, wobbleScale: 0.6 },
      );

      // Secondary architectural sub-tick or measurement mark in half the variants
      if (variant % 2 === 0) {
        const midX = ox + cellW * 0.52;
        const midY = oy + cellH * 0.52;
        drawInkStroke(
          ctx,
          [
            [midX - 9, midY],
            [midX + 9, midY],
          ],
          rng,
          { baseWidth: 1.6, color: THEME_COLORS.ink, wobbleScale: 0.5, doubleChance: 0 },
        );
        drawInkStroke(
          ctx,
          [
            [midX, midY - 9],
            [midX, midY + 9],
          ],
          rng,
          { baseWidth: 1.6, color: THEME_COLORS.ink, wobbleScale: 0.5, doubleChance: 0 },
        );
      }

      // Sparse grain stipple (8 tiny ink specks per cell)
      for (let d = 0; d < 8; d++) {
        drawInkDot(
          ctx,
          ox + margin + 12 + rng.range(0, cellW - 36),
          oy + margin + 12 + rng.range(0, cellH - 36),
          rng.range(0.7, 1.35),
          rng,
          THEME_COLORS.ink,
        );
      }

      ctx.restore();
    }
  }

  return canvas;
}

/**
 * GLSL snippet providing `sampleInfiniteGridInk` for the floor plane and mirror reflection.
 * Binary black ink (#0A0A0A) on warm paper (#FAFAF8) — thins and breaks into dashes
 * toward the horizon, never grey.
 */
export const INFINITE_GRID_GLSL = /* glsl */ `
float gridHash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

/**
 * Returns 1.0 where grid ink is drawn, 0.0 where paper shows.
 */
float sampleInfiniteGridInk(
  vec2 uv,
  float horizonY,
  float zScroll,
  float uReveal,
  sampler2D gridAtlas
) {
  float dy = horizonY - uv.y;

  // Horizon ruling with hand-inked wobble & broken dashes near edges
  float hWobble = sin(uv.x * 42.0) * 0.0012 + cos(uv.x * 97.0) * 0.0006;
  float hDist = abs(dy + hWobble);
  float hDash = step(0.18, fract(uv.x * 28.0 + sin(uv.x * 19.0) * 0.35));
  if (hDist < 0.0016 && hDash > 0.5 && uReveal >= 0.02) {
    return 1.0;
  }

  if (dy <= 0.001) {
    return 0.0;
  }

  // Normalized distance from horizon (0 at horizon -> 1 at bottom of screen)
  float normDist = clamp(dy / max(0.05, horizonY), 0.0, 1.0);

  // Draw-order gating: grid draws outward from horizon over uReveal in [0.00, 0.28]
  float gridOrder = mix(0.01, 0.27, pow(normDist, 0.75));
  if (uReveal < gridOrder) {
    return 0.0;
  }

  // Inverse-perspective floor projection
  float invZ = 1.0 / max(dy, 0.006);
  float planeX = (uv.x - 0.5) * invZ * 1.45;
  float planeZ = invZ * 0.68 - zScroll;

  vec2 cellId = floor(vec2(planeX, planeZ));
  vec2 cellUv = fract(vec2(planeX, planeZ));

  // Choose 1 of 8 hand-inked atlas variants via deterministic cell hash
  float h = floor(gridHash12(cellId) * 8.0);
  float col = mod(h, 4.0);
  float row = floor(h / 4.0);
  vec2 atlasUv = (vec2(col, row) + clamp(cellUv, 0.03, 0.97)) / vec2(4.0, 2.0);

  vec4 texSample = texture2D(gridAtlas, atlasUv);
  float isInkSample = step(texSample.r, 0.55);

  // Analytic crisp perspective grid lines reinforce the atlas so lines stay razor-sharp at all depths
  float lineThickness = mix(0.012, 0.042, clamp(normDist * 1.3, 0.0, 1.0));
  float wobbleX = sin(planeZ * 6.2831 + cellId.x * 1.7) * 0.012;
  float wobbleZ = cos(planeX * 6.2831 + cellId.y * 2.3) * 0.012;
  float distToGridX = min(fract(planeX + wobbleX), 1.0 - fract(planeX + wobbleX));
  float distToGridZ = min(fract(planeZ + wobbleZ), 1.0 - fract(planeZ + wobbleZ));
  float analyticInk = step(min(distToGridX, distToGridZ), lineThickness);

  float rawInk = max(isInkSample, analyticInk);
  if (rawInk < 0.5) {
    return 0.0;
  }

  // Thin out and break into dashes toward the horizon until lines dissolve (never grey)
  if (normDist < 0.36) {
    float dashFreq = mix(22.0, 7.0, normDist / 0.36);
    float dashHash = gridHash12(floor(vec2(planeX * dashFreq, planeZ * dashFreq)));
    float keepProb = smoothstep(0.018, 0.34, normDist);
    if (dashHash > keepProb) {
      return 0.0;
    }
  }

  return 1.0;
}
`;
