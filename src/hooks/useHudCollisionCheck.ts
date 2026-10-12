import { useEffect } from 'react';
import { STAGE_CONFIG } from '../config/stage';
import { useAppStore } from '../store/useAppStore';

function rectsIntersect(a: DOMRect, b: DOMRect): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

/**
 * Dev-only HUD & Focal-Rectangle collision auditor (Part C1 & C5).
 * Warns in the console if any visible content box (`[data-content-box]`) intersects
 * a persistent HUD element (`[data-hud-element]`) or intrudes into the protected
 * stage focal rectangle during a scene beat.
 */
export function useHudCollisionCheck(): void {
  const activeChapter = useAppStore((s) => s.activeChapter);
  const scrollProgress = useAppStore((s) => s.scrollProgress);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const timer = window.setTimeout(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw < 768) return; // Desktop focal-rect and HUD check

      const hudElements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-hud-element]'),
      );
      const contentBoxes = Array.from(
        document.querySelectorAll<HTMLElement>('[data-content-box]'),
      );

      for (const box of contentBoxes) {
        const bRect = box.getBoundingClientRect();
        // Only check elements currently visible within the viewport
        if (bRect.bottom <= 0 || bRect.top >= vh || bRect.width === 0 || bRect.height === 0) {
          continue;
        }

        for (const hud of hudElements) {
          const hRect = hud.getBoundingClientRect();
          if (rectsIntersect(bRect, hRect)) {
            console.warn(
              `[HUD COLLISION] Content box (${box.dataset.contentBox}) intersects HUD (${hud.dataset.hudElement}) at scroll ${(scrollProgress * 100).toFixed(1)}%`,
            );
          }
        }

        const stageSpec = STAGE_CONFIG[activeChapter];
        if (stageSpec.mode === 'scene' && box.dataset.allowFocal !== 'true') {
          const focalDomRect = new DOMRect(
            stageSpec.focalRect.x[0] * vw,
            stageSpec.focalRect.y[0] * vh,
            (stageSpec.focalRect.x[1] - stageSpec.focalRect.x[0]) * vw,
            (stageSpec.focalRect.y[1] - stageSpec.focalRect.y[0]) * vh,
          );
          if (rectsIntersect(bRect, focalDomRect)) {
            console.warn(
              `[STAGE FOCAL VIOLATION] Scene-beat box (${box.dataset.contentBox}) intrudes into focal rect of chapter "${activeChapter}"`,
            );
          }
        }
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [activeChapter, scrollProgress]);
}
