import React, { useEffect, useRef, useState } from 'react';
import { THEME_COLORS } from '../../config/theme';

interface HalftoneThumbProps {
  src?: string | null;
  alt: string;
  size?: number;
  fallbackLabel?: string;
}

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/**
 * Renders an image (Discord avatar, Spotify album art, activity icon) as a true
 * 1-bit manga halftone/dithered bitmap on canvas using strictly THEME_COLORS.ink
 * and THEME_COLORS.paper. Falls back to an ink-hatched monogram when no image
 * or CORS is unavailable.
 */
export const HalftoneThumb: React.FC<HalftoneThumbProps> = ({
  src,
  alt,
  size = 44,
  fallbackLabel = 'N/A',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw deterministic manga halftone fallback first
    const drawFallback = () => {
      ctx.fillStyle = THEME_COLORS.paper;
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = THEME_COLORS.ink;
      for (let y = 0; y < size; y += 3) {
        for (let x = 0; x < size; x += 3) {
          if ((x + y) % 6 === 0) {
            ctx.fillRect(x, y, 1.5, 1.5);
          }
        }
      }
      // Diagonal ink slash + monogram plate
      ctx.strokeStyle = THEME_COLORS.ink;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(1, 1, size - 2, size - 2);
      ctx.fillStyle = THEME_COLORS.paperPure;
      ctx.fillRect(5, Math.floor(size * 0.3), size - 10, Math.floor(size * 0.4));
      ctx.strokeRect(5, Math.floor(size * 0.3), size - 10, Math.floor(size * 0.4));
      ctx.fillStyle = THEME_COLORS.ink;
      ctx.font = `700 ${Math.max(9, Math.floor(size * 0.24))}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fallbackLabel.slice(0, 3).toUpperCase(), size / 2, size / 2 + 0.5);
    };

    drawFallback();

    if (!src) return;

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const off = document.createElement('canvas');
        off.width = size;
        off.height = size;
        const offCtx = off.getContext('2d');
        if (!offCtx) return;
        offCtx.drawImage(img, 0, 0, size, size);
        const imgData = offCtx.getImageData(0, 0, size, size);
        const data = imgData.data;

        ctx.fillStyle = THEME_COLORS.paper;
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = THEME_COLORS.ink;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const a = data[idx + 3];
            if (a < 32) continue;
            const lum = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255;
            const threshold = (BAYER_4X4[y % 4][x % 4] + 0.5) / 16;
            if (lum < threshold * 0.92) {
              ctx.fillRect(x, y, 1, 1);
            }
          }
        }
        ctx.strokeStyle = THEME_COLORS.ink;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0.75, 0.75, size - 1.5, size - 1.5);
        setLoaded(true);
      } catch {
        drawFallback();
      }
    };
    img.onerror = () => {
      if (!cancelled) drawFallback();
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, size, fallbackLabel]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      role="img"
      aria-label={alt}
      data-loaded={loaded ? 'true' : 'false'}
      className="shrink-0 block border border-[var(--ink)] bg-[var(--paper)]"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};
