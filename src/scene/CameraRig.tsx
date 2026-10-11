import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { lerp } from '../lib/math';
import { useAppStore } from '../store/useAppStore';

export const CameraRig: React.FC = () => {
  const { camera } = useThree();
  const currentZ = useRef<number>(6.2);
  const currentY = useRef<number>(0.15);
  const currentX = useRef<number>(0.0);

  useFrame(() => {
    const { scrollProgress, mouseTarget, reducedMotion } = useAppStore.getState();

    // Camera dollies on Z from +6.2 down to -5.2 as user scrolls from Chapter 1 to Chapter 7
    const targetZ = reducedMotion ? 4.8 : 6.2 - scrollProgress * 11.4;
    const targetY = reducedMotion
      ? 0.0
      : 0.15 - scrollProgress * 0.35 + mouseTarget[1] * 0.18;
    const targetX = reducedMotion ? 0.0 : mouseTarget[0] * 0.28;

    currentZ.current = lerp(currentZ.current, targetZ, 0.08);
    currentY.current = lerp(currentY.current, targetY, 0.08);
    currentX.current = lerp(currentX.current, targetX, 0.08);

    camera.position.set(currentX.current, currentY.current, currentZ.current);
    camera.lookAt(0, 0.1, -12);
  });

  return null;
};
