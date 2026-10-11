import * as THREE from 'three';
import type { LayerKind } from '../config/layers.config';
import { THEME_COLORS } from '../config/theme';

export interface GeneratedLayerMaps {
  colorMap: THREE.CanvasTexture;
  depthMap: THREE.CanvasTexture;
}

/**
 * Generates high-detail 2.5D placeholder manga art & matching grayscale depth maps
 * using ONLY the strict palette tokens (#FAFAF8, #FFFFFF, #0A0A0A, #D4141C).
 * If the user drops real PNG files into /public/layers/entry-plug/<layer>.png,
 * Layer.tsx automatically overrides these procedural canvases.
 */
export function generateLayerTextures(kind: LayerKind): GeneratedLayerMaps {
  const width = 1024;
  const height = 1024;

  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = width;
  colorCanvas.height = height;
  const ctx = colorCanvas.getContext('2d')!;

  const depthCanvas = document.createElement('canvas');
  depthCanvas.width = width;
  depthCanvas.height = height;
  const dctx = depthCanvas.getContext('2d')!;

  // Default depth gradient
  const baseGrad = dctx.createLinearGradient(0, 0, 0, height);
  baseGrad.addColorStop(0, THEME_COLORS.ink);
  baseGrad.addColorStop(1, THEME_COLORS.paperPure);
  dctx.fillStyle = baseGrad;
  dctx.fillRect(0, 0, width, height);

  ctx.clearRect(0, 0, width, height);

  switch (kind) {
    case 'far-sky-monolith': {
      // Predominantly white paper sky (~75% white) with dramatic upper ragged ink mass & white speckle holes
      ctx.fillStyle = THEME_COLORS.paper;
      ctx.fillRect(0, 0, width, height);

      // Dramatic upper-left/right ragged black ink mass (not dominant, ~22% of sky)
      ctx.fillStyle = THEME_COLORS.ink;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, 210);
      for (let x = width; x >= 0; x -= 32) {
        const jag = 155 + Math.sin(x * 0.025) * 42 + Math.cos(x * 0.07) * 18;
        ctx.lineTo(x, jag);
      }
      ctx.closePath();
      ctx.fill();

      // White speckle holes inside the black ink mass
      ctx.fillStyle = THEME_COLORS.paperPure;
      for (let i = 0; i < 65; i++) {
        const sx = ((i * 173) % (width - 40)) + 20;
        const sy = ((i * 79) % 140) + 12;
        const sr = (i % 3) + 1.5;
        ctx.fillRect(sx, sy, sr * 2, sr * 1.5);
      }

      // Distant Towering Monolith (white stone with heavy black outline and hatched shadow side)
      const mx = 468;
      const my = 210;
      const mw = 88;
      const mh = 520;

      ctx.fillStyle = THEME_COLORS.paperPure;
      ctx.strokeStyle = THEME_COLORS.ink;
      ctx.lineWidth = 6;
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeRect(mx, my, mw, mh);

      // Shadow side hatching on the monolith (triggers shader luminance hatching too)
      ctx.strokeStyle = THEME_COLORS.ink;
      ctx.lineWidth = 2.5;
      for (let y = my + 8; y < my + mh - 8; y += 9) {
        ctx.beginPath();
        ctx.moveTo(mx + mw * 0.52, y);
        ctx.lineTo(mx + mw - 4, y + 10);
        ctx.stroke();
      }

      // Depth map for monolith
      dctx.fillStyle = THEME_COLORS.paperPure;
      dctx.fillRect(mx, my, mw, mh);
      break;
    }

    case 'red-orb': {
      // Distant focal Red Orb (#D4141C) with ink-hatched lower crescent and bold ink ring
      const cx = width * 0.5;
      const cy = height * 0.46;
      const radius = 210;

      // Outer subtle ink aura rings
      ctx.strokeStyle = THEME_COLORS.ink;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 24, 0, Math.PI * 2);
      ctx.stroke();

      // Solid RED orb (#D4141C)
      ctx.fillStyle = THEME_COLORS.red;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 7;
      ctx.strokeStyle = THEME_COLORS.ink;
      ctx.stroke();

      // Ink-hatched lower shadow lines across the red orb
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = THEME_COLORS.ink;
      ctx.lineWidth = 3.5;
      for (let y = cy + 35; y < cy + radius; y += 11) {
        ctx.beginPath();
        ctx.moveTo(cx - radius, y);
        ctx.lineTo(cx + radius, y - 28);
        ctx.stroke();
      }
      ctx.restore();

      // Depth sphere
      const radGrad = dctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
      radGrad.addColorStop(0, THEME_COLORS.paperPure);
      radGrad.addColorStop(1, THEME_COLORS.ink);
      dctx.fillStyle = radGrad;
      dctx.beginPath();
      dctx.arc(cx, cy, radius, 0, Math.PI * 2);
      dctx.fill();
      break;
    }

    case 'mid-far-horizon': {
      // Horizon ridge & distant transmission pylons (white paper fill + black ink hatching)
      const horizonY = 640;

      ctx.fillStyle = THEME_COLORS.paper;
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(0, horizonY);
      ctx.lineTo(260, horizonY - 48);
      ctx.lineTo(440, horizonY + 8);
      ctx.lineTo(620, horizonY + 8);
      ctx.lineTo(790, horizonY - 55);
      ctx.lineTo(width, horizonY - 12);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = THEME_COLORS.ink;
      ctx.lineWidth = 6;
      ctx.stroke();

      // Perspective convergence lines & cross-hatching on ridges
      ctx.lineWidth = 2.5;
      for (let i = 0; i <= 24; i++) {
        const x = (i / 24) * width;
        ctx.beginPath();
        ctx.moveTo(width * 0.5, horizonY - 10);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Distant structural transmission towers on left and right
      const drawPylon = (px: number, py: number, scale: number) => {
        ctx.strokeStyle = THEME_COLORS.ink;
        ctx.lineWidth = 4 * scale;
        ctx.beginPath();
        ctx.moveTo(px - 28 * scale, py);
        ctx.lineTo(px - 8 * scale, py - 180 * scale);
        ctx.lineTo(px + 8 * scale, py - 180 * scale);
        ctx.lineTo(px + 28 * scale, py);
        ctx.stroke();

        // Cross braces
        for (let h = 30; h < 170; h += 35) {
          ctx.beginPath();
          ctx.moveTo(px - 20 * scale, py - h * scale);
          ctx.lineTo(px + 20 * scale, py - (h + 25) * scale);
          ctx.moveTo(px + 20 * scale, py - h * scale);
          ctx.lineTo(px - 20 * scale, py - (h + 25) * scale);
          ctx.stroke();
        }
      };

      drawPylon(170, horizonY - 25, 1.0);
      drawPylon(855, horizonY - 35, 1.1);
      break;
    }

    case 'near-stepping-stones': {
      // Stepping-stone slabs leading toward the monolith: white paper tops with bold black hatched edges
      const slabs = [
        { y: 880, w: 540, h: 56, xOff: 0 },
        { y: 780, w: 430, h: 46, xOff: -18 },
        { y: 695, w: 340, h: 38, xOff: 14 },
        { y: 625, w: 260, h: 30, xOff: -10 },
        { y: 568, w: 195, h: 24, xOff: 6 },
      ];

      for (const slab of slabs) {
        const sx = width * 0.5 - slab.w * 0.5 + slab.xOff;
        // Drop shadow block
        ctx.fillStyle = THEME_COLORS.ink;
        ctx.fillRect(sx + 8, slab.y + 10, slab.w, slab.h);

        // White stone top face
        ctx.fillStyle = THEME_COLORS.paperPure;
        ctx.strokeStyle = THEME_COLORS.ink;
        ctx.lineWidth = 5;
        ctx.fillRect(sx, slab.y, slab.w, slab.h);
        ctx.strokeRect(sx, slab.y, slab.w, slab.h);

        // Hatched stone side bevel
        ctx.lineWidth = 2.5;
        for (let hx = sx + 12; hx < sx + slab.w - 12; hx += 16) {
          ctx.beginPath();
          ctx.moveTo(hx, slab.y + slab.h * 0.55);
          ctx.lineTo(hx - 8, slab.y + slab.h - 3);
          ctx.stroke();
        }
      }
      break;
    }

    case 'mid-pilot': {
      // Cloaked figure seen from behind: WHITE paper cloak with heavy black hatching, bold black outline,
      // and ONE thin red scarf/band accent that draws the eye.
      const cx = width * 0.5;
      const topY = 310;
      const botY = 860;

      ctx.save();
      // Cloak silhouette path
      ctx.beginPath();
      ctx.moveTo(cx, topY); // Hood peak
      ctx.lineTo(cx + 42, topY + 52); // Right hood shoulder
      ctx.lineTo(cx + 95, topY + 125); // Right shoulder
      ctx.lineTo(cx + 145, botY - 25); // Right cloak hem
      ctx.lineTo(cx + 65, botY);
      ctx.lineTo(cx - 10, botY - 18);
      ctx.lineTo(cx - 135, botY - 8); // Left windswept cloak hem
      ctx.lineTo(cx - 88, topY + 120); // Left shoulder
      ctx.lineTo(cx - 38, topY + 52);
      ctx.closePath();

      // White paper cloak fill + bold black outline
      ctx.fillStyle = THEME_COLORS.paperPure;
      ctx.fill();
      ctx.lineWidth = 8;
      ctx.strokeStyle = THEME_COLORS.ink;
      ctx.stroke();

      ctx.clip();

      // Heavy black parallel hatching along cloak folds (right side and lower hem)
      ctx.strokeStyle = THEME_COLORS.ink;
      ctx.lineWidth = 3;
      for (let y = topY + 60; y < botY; y += 10) {
        ctx.beginPath();
        ctx.moveTo(cx + 15, y);
        ctx.lineTo(cx + 150, y + 38);
        ctx.stroke();
      }

      // Vertical drapery fold lines
      ctx.lineWidth = 4.5;
      [-55, -18, 22, 58].forEach((offset) => {
        ctx.beginPath();
        ctx.moveTo(cx + offset * 0.4, topY + 115);
        ctx.lineTo(cx + offset * 1.45, botY);
        ctx.stroke();
      });

      // THE SINGLE RED ACCENT: Thin red collar band + trailing scarf tail (#D4141C)
      ctx.fillStyle = THEME_COLORS.red;
      ctx.strokeStyle = THEME_COLORS.ink;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 58, topY + 96);
      ctx.lineTo(cx + 66, topY + 88);
      ctx.lineTo(cx + 72, topY + 112);
      ctx.lineTo(cx - 52, topY + 120);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Flowing thin red scarf tail to the left
      ctx.beginPath();
      ctx.moveTo(cx - 42, topY + 112);
      ctx.lineTo(cx - 122, topY + 148);
      ctx.lineTo(cx - 114, topY + 166);
      ctx.lineTo(cx - 32, topY + 124);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // Depth map for pilot
      dctx.fillStyle = THEME_COLORS.paperPure;
      dctx.beginPath();
      ctx.arc(cx, (topY + botY) * 0.5, 160, 0, Math.PI * 2);
      dctx.fill();
      break;
    }

    case 'foreground-debris': {
      // Framing inked rocks & floating debris fragments at the outer edges (leaves center clear)
      const rocks = [
        { x: 95, y: 180, w: 110, h: 75 },
        { x: 910, y: 220, w: 125, h: 85 },
        { x: 75, y: 820, w: 160, h: 120 },
        { x: 920, y: 840, w: 150, h: 110 },
      ];

      for (const r of rocks) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(r.x - r.w * 0.5, r.y);
        ctx.lineTo(r.x - r.w * 0.2, r.y - r.h * 0.5);
        ctx.lineTo(r.x + r.w * 0.45, r.y - r.h * 0.35);
        ctx.lineTo(r.x + r.w * 0.5, r.y + r.h * 0.3);
        ctx.lineTo(r.x - r.w * 0.15, r.y + r.h * 0.5);
        ctx.closePath();

        ctx.fillStyle = THEME_COLORS.paperPure;
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = THEME_COLORS.ink;
        ctx.stroke();
        ctx.clip();

        ctx.lineWidth = 3;
        for (let y = r.y - r.h; y < r.y + r.h; y += 8) {
          ctx.beginPath();
          ctx.moveTo(r.x - r.w, y);
          ctx.lineTo(r.x + r.w, y + 25);
          ctx.stroke();
        }
        ctx.restore();
      }
      break;
    }
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.needsUpdate = true;

  const depthMap = new THREE.CanvasTexture(depthCanvas);
  depthMap.needsUpdate = true;

  return { colorMap, depthMap };
}
