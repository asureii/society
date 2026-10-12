import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { STAGE_CONFIG } from '../config/stage';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { CHAPTERS, useAppStore, type ChapterId } from '../store/useAppStore';
import { clamp } from '../lib/math';

export function useLenis(): void {
  const lenisRef = useRef<Lenis | null>(null);
  const setScrollState = useAppStore((s) => s.setScrollState);
  const setScrollToTarget = useAppStore((s) => s.setScrollToTarget);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: reducedMotion ? 1 : 0.085,
      smoothWheel: !reducedMotion,
      syncTouch: false,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    // Inspect real DOM chapter sections to determine active chapter, page-beat opacity, and transition ink-bleed
    const masterTrigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const p = clamp(self.progress, 0, 1);
        const vh = window.innerHeight || 1;
        const viewportCenterY = vh * 0.45;

        let detectedChapter: ChapterId = 'cover';
        let isPageOpaque = false;
        let bleed = 0;

        for (const ch of CHAPTERS) {
          const el = document.getElementById(`chapter-${ch.id}`);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top <= viewportCenterY && rect.bottom >= viewportCenterY) {
            detectedChapter = ch.id;
            const mode = STAGE_CONFIG[ch.id].mode;
            if (mode === 'page') {
              // Page beat is fully covering the viewport when its top is above HUD and bottom is below viewport
              if (rect.top <= 72 && rect.bottom >= vh - 32) {
                isPageOpaque = true;
              }
              // Ink-bleed pulse near the entry/exit wipe of a page beat
              const distTop = Math.abs(rect.top);
              const distBot = Math.abs(rect.bottom - vh);
              const edgeProximity = Math.min(distTop, distBot);
              if (!reducedMotion && edgeProximity < vh * 0.28) {
                bleed = 1.0 - edgeProximity / (vh * 0.28);
              }
            }
            break;
          }
        }

        setScrollState(p, detectedChapter, clamp(bleed, 0, 1), isPageOpaque);
      },
    });

    const scrollToFn = (target: string | number) => {
      lenis.scrollTo(target, {
        duration: reducedMotion ? 0 : 1.25,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    };
    setScrollToTarget(scrollToFn);

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const step = window.innerHeight * 0.85;
      if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        scrollToFn(window.scrollY + step);
      } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        scrollToFn(Math.max(0, window.scrollY - step));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToFn(window.scrollY + window.innerHeight * 0.35);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToFn(Math.max(0, window.scrollY - window.innerHeight * 0.35));
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToFn(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToFn(document.documentElement.scrollHeight);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      masterTrigger.kill();
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      setScrollToTarget(null);
    };
  }, [reducedMotion, setScrollState, setScrollToTarget]);
}
