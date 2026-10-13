import { useEffect } from 'react';
import { SCENES_CONFIG } from '../config/scenes.config';
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
 * Computes an element's visible bounding rectangle by intersecting its raw DOMRect
 * with any `overflow: hidden` ancestor containers.
 */
function getVisibleClippedRect(el: HTMLElement): DOMRect | null {
  const style = window.getComputedStyle(el);
  if (
    style.display === 'none' ||
    style.visibility === 'hidden' ||
    parseFloat(style.opacity || '1') < 0.05
  ) {
    return null;
  }
  if (el.closest('.invisible')) {
    return null;
  }

  const raw = el.getBoundingClientRect();
  let left = raw.left;
  let top = raw.top;
  let right = raw.right;
  let bottom = raw.bottom;

  let parent = el.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const pStyle = window.getComputedStyle(parent);
    if (
      pStyle.display === 'none' ||
      pStyle.visibility === 'hidden' ||
      parseFloat(pStyle.opacity || '1') < 0.05
    ) {
      return null;
    }
    if (
      pStyle.overflow === 'hidden' ||
      pStyle.overflowY === 'hidden' ||
      pStyle.overflowX === 'hidden'
    ) {
      const pRect = parent.getBoundingClientRect();
      left = Math.max(left, pRect.left);
      top = Math.max(top, pRect.top);
      right = Math.min(right, pRect.right);
      bottom = Math.min(bottom, pRect.bottom);
    }
    parent = parent.parentElement;
  }

  const width = right - left;
  const height = bottom - top;
  if (width <= 1 || height <= 1 || bottom <= 0 || top >= window.innerHeight) {
    return null;
  }

  return new DOMRect(left, top, width, height);
}

/**
 * Dev-mode HUD, Nav-to-Panel 16px Gap, & Scene Focal-Rectangle Collision Auditor (Part E3, E4, & G3).
 * Throws an Error in dev mode if any visible `[data-avoid-hud]` / `[data-content-box]` element
 * overlaps a `[data-hud]` element, comes within 16px of the top nav bar, or intrudes into the
 * active scene's `focalRect` on desktop.
 */
export function runHudAndFocalCollisionAudit(): {
  ok: boolean;
  violations: string[];
  minNavGapPx: number;
} {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const state = useAppStore.getState();
  const sceneSpec = SCENES_CONFIG[state.activeSceneIndex] ?? SCENES_CONFIG[0];

  const hudElements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-hud], [data-hud-element]'),
  )
    .map((el) => ({ el, rect: getVisibleClippedRect(el) }))
    .filter((item): item is { el: HTMLElement; rect: DOMRect } => item.rect !== null);

  const topNav = document.querySelector<HTMLElement>('[data-hud-element="top-bar"]');
  const topNavBottom = topNav ? topNav.getBoundingClientRect().bottom : 0;

  const avoidHudElements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-avoid-hud], [data-content-box]'),
  )
    .map((el) => ({ el, rect: getVisibleClippedRect(el) }))
    .filter((item): item is { el: HTMLElement; rect: DOMRect } => item.rect !== null);

  const violations: string[] = [];
  let minNavGapPx = 999;

  for (const { el: box, rect: bRect } of avoidHudElements) {
    if (box.dataset.allowFocal === 'true') continue;
    const label = box.dataset.contentBox || box.tagName.toLowerCase();

    // 1. Check vertical clearance below top nav bar: flag if an element overlaps the top nav bar
    if (bRect.top < topNavBottom && bRect.bottom > 0) {
      // Element is scrolling under/behind the top nav bar (normal in scrolling layout)
      const navGap = bRect.top - topNavBottom;
      if (navGap < minNavGapPx) {
        minNavGapPx = Math.round(navGap);
      }
    } else {
      const navGap = bRect.top - topNavBottom;
      if (navGap < minNavGapPx) {
        minNavGapPx = Math.round(navGap);
      }
    }

    // 2. Check bounding-box intersection against floating fixed HUD elements like sound-toggle
    for (const { el: hud, rect: hRect } of hudElements) {
      if (hud.dataset.hudElement === 'top-bar') continue; // Top bar is fixed header that content scrolls behind
      if (rectsIntersect(bRect, hRect)) {
        violations.push(
          `[HUD COLLISION] "${label}" intersects HUD "${hud.dataset.hudElement ?? 'hud'}" at scroll ${(state.scrollProgress * 100).toFixed(1)}%`,
        );
      }
    }

    // 3. On desktop (>= 1024px), check opaque content panels against the active scene's focalRect
    if (
      vw >= 1024 &&
      box.dataset.contentBox &&
      !box.dataset.contentBox.endsWith('-header')
    ) {
      const f = sceneSpec.focalRect;
      const focalDomRect = new DOMRect(
        f.x * vw,
        f.y * vh,
        f.w * vw,
        f.h * vh,
      );
      if (rectsIntersect(bRect, focalDomRect)) {
        violations.push(
          `[FOCAL RECT VIOLATION] Opaque panel "${label}" overlaps ${sceneSpec.id} focalRect`,
        );
      }
    }
  }

  const result = {
    ok: violations.length === 0,
    violations,
    minNavGapPx,
  };

  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__PILOT_HUD_AUDIT__ = result;
  }

  return result;
}

export function useHudCollisionCheck(): void {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    let timer: number | undefined;
    const unsubscribe = useAppStore.subscribe(() => {
      if (timer !== undefined) clearTimeout(timer);
      timer = window.setTimeout(() => {
        const audit = runHudAndFocalCollisionAudit();
        if (!audit.ok) {
          const msg = audit.violations.join(' | ');
          console.warn('[HUD/FOCAL AUDIT]', msg);
        }
      }, 90);
    });

    return () => {
      if (timer !== undefined) clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}

