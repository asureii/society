import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useReducedMotion(): void {
  const setReducedMotion = useAppStore((s) => s.setReducedMotion);
  const setIsMobile = useAppStore((s) => s.setIsMobile);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia('(max-width: 768px)');

    setReducedMotion(mediaQuery.matches);
    setIsMobile(mobileQuery.matches);

    const onMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    const onMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);

    mediaQuery.addEventListener('change', onMotionChange);
    mobileQuery.addEventListener('change', onMobileChange);

    return () => {
      mediaQuery.removeEventListener('change', onMotionChange);
      mobileQuery.removeEventListener('change', onMobileChange);
    };
  }, [setReducedMotion, setIsMobile]);
}
