import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { clamp } from '../lib/math';

export function useMouseParallax(): void {
  const setMouseTarget = useAppStore((s) => s.setMouseTarget);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  useEffect(() => {
    if (reducedMotion) {
      setMouseTarget(0, 0);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      setMouseTarget(clamp(nx, -1, 1), clamp(ny, -1, 1));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const nx = (touch.clientX / window.innerWidth) * 2 - 1;
      const ny = -(touch.clientY / window.innerHeight) * 2 + 1;
      setMouseTarget(clamp(nx * 0.65, -1, 1), clamp(ny * 0.65, -1, 1));
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      const nx = clamp(e.gamma / 30, -1, 1);
      const ny = clamp((e.beta - 45) / 30, -1, 1);
      setMouseTarget(nx * 0.7, ny * 0.7);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [setMouseTarget, reducedMotion]);
}
