import React, { useEffect, useRef } from 'react';
import { THEME_COLORS } from '../config/theme';
import { hatchRegion } from '../scene/art/hatch';
import {
  drawInkDot,
  drawInkStroke,
  fillRoughenedPolygon,
  outlinePolygonWithInk,
  type Point2D,
} from '../scene/art/inkBrush';
import { createRng } from '../scene/art/rng';

export type SpotMotif = 'monolith-fragment' | 'hex-seal' | 'horizon-spire' | 'stone-cairn';

interface InkSpotIllustrationProps {
  motif: SpotMotif;
  seed?: number;
  className?: string;
}

/**
 * Small original hand-inked spot illustration drawn on a canvas using the exact
 * same variable-width brush (`inkBrush.ts`) and hatching (`hatch.ts`) primitives
 * as the 2.5D scene, so full-bleed manga page beats feel hand-drawn.
 */
export const InkSpotIllustration: React.FC<InkSpotIllustrationProps> = ({
  motif,
  seed = 404,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const rng = createRng(seed);

    switch (motif) {
      case 'monolith-fragment': {
        const poly: Point2D[] = [
          [w * 0.34, h * 0.12],
          [w * 0.56, h * 0.08],
          [w * 0.66, h * 0.88],
          [w * 0.3, h * 0.9],
        ];
        fillRoughenedPolygon(ctx, poly, rng, THEME_COLORS.paperPure, 1.4);
        hatchRegion(ctx, poly, rng, {
          angleRad: Math.PI * 0.5,
          baseSpacing: 4.5,
          baseWidth: 1.8,
          toneAt: (u, v) => 0.35 + u * 0.55 + v * 0.15,
        });
        outlinePolygonWithInk(ctx, poly, rng, {
          baseWidth: 3.2,
          doubleChance: 0.4,
          dryBrush: true,
        });
        drawInkDot(ctx, w * 0.74, h * 0.34, 8.5, rng, THEME_COLORS.red);
        break;
      }

      case 'hex-seal': {
        const cx = w * 0.5;
        const cy = h * 0.5;
        const r = Math.min(w, h) * 0.36;
        const hex: Point2D[] = [];
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2 - Math.PI / 6;
          hex.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
        }
        fillRoughenedPolygon(ctx, hex, rng, THEME_COLORS.paperPure, 1.2);
        hatchRegion(ctx, hex, rng, {
          angleRad: -Math.PI * 0.25,
          baseSpacing: 5.0,
          baseWidth: 1.7,
          toneAt: (u, v) => (u + v) * 0.55,
        });
        outlinePolygonWithInk(ctx, hex, rng, {
          baseWidth: 3.0,
          doubleChance: 0.35,
        });
        drawInkDot(ctx, cx, cy, 6.0, rng, THEME_COLORS.red);
        break;
      }

      case 'horizon-spire': {
        drawInkStroke(
          ctx,
          [
            [w * 0.1, h * 0.78],
            [w * 0.9, h * 0.76],
          ],
          rng,
          { baseWidth: 3.0, breakChance: 0.1, doubleChance: 0.3 },
        );
        const spire: Point2D[] = [
          [w * 0.44, h * 0.77],
          [w * 0.5, h * 0.16],
          [w * 0.58, h * 0.77],
        ];
        fillRoughenedPolygon(ctx, spire, rng, THEME_COLORS.paperPure, 1.2);
        hatchRegion(ctx, spire, rng, {
          angleRad: Math.PI * 0.5,
          baseSpacing: 4.5,
          baseWidth: 1.6,
          toneAt: (u) => 0.3 + u * 0.65,
        });
        outlinePolygonWithInk(ctx, spire, rng, { baseWidth: 2.8, doubleChance: 0.3 });
        break;
      }

      case 'stone-cairn': {
        const slabs: Point2D[][] = [
          [
            [w * 0.22, h * 0.72],
            [w * 0.78, h * 0.7],
            [w * 0.82, h * 0.86],
            [w * 0.18, h * 0.88],
          ],
          [
            [w * 0.3, h * 0.48],
            [w * 0.7, h * 0.46],
            [w * 0.74, h * 0.64],
            [w * 0.26, h * 0.66],
          ],
          [
            [w * 0.38, h * 0.24],
            [w * 0.62, h * 0.22],
            [w * 0.65, h * 0.4],
            [w * 0.35, h * 0.42],
          ],
        ];
        for (const s of slabs) {
          fillRoughenedPolygon(ctx, s, rng, THEME_COLORS.paperPure, 1.2);
          hatchRegion(ctx, s, rng, {
            angleRad: Math.PI * 0.5,
            baseSpacing: 4.8,
            baseWidth: 1.7,
            toneAt: (u, v) => 0.3 + u * 0.5 + v * 0.2,
          });
          outlinePolygonWithInk(ctx, s, rng, { baseWidth: 2.6, doubleChance: 0.25 });
        }
        break;
      }
    }
  }, [motif, seed]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={110}
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
    />
  );
};
