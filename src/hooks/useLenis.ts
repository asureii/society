import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { CHAPTERS, useAppStore } from '../store/useAppStore';
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

    // Sync Lenis scroll events to GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // Drive Lenis from gsap.ticker
    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    // Register global scroll trigger to compute progress, active chapter, and chapter transition ink-bleed
    const masterTrigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        const p = clamp(self.progress, 0, 1);
        const totalChapters = CHAPTERS.length;
        const scaled = p * totalChapters;
        const idx = clamp(Math.floor(scaled), 0, totalChapters - 1);
        const chapterProgress = scaled - idx;

        // Compute ink-bleed pulse near chapter boundaries (when crossing from one chapter to the next)
        let bleed = 0;
        if (!reducedMotion) {
          if (chapterProgress > 0.86) {
            bleed = (chapterProgress - 0.86) / 0.14;
          } else if (chapterProgress < 0.14 && idx > 0) {
            bleed = 1.0 - chapterProgress / 0.14;
          }
        }

        setScrollState(p, CHAPTERS[idx].id, clamp(bleed, 0, 1));
      },
    });

    // Expose programmatic eased scrollTo helper for Nav and Return-To-Start
    const scrollToFn = (target: string | number) => {
      lenis.scrollTo(target, {
        duration: reducedMotion ? 0 : 1.35,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    };
    setScrollToTarget(scrollToFn);

    // Keyboard navigation support (Space / PageDown / PageUp / Arrows)
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
