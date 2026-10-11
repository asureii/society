import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { SCENE_LAYERS } from '../config/layers.config';
import { THEME_COLORS } from '../config/theme';
import { useAppStore } from '../store/useAppStore';
import { CameraRig } from './CameraRig';
import { Layer } from './Layer';
import { PostInk } from './PostInk';

export const Scene: React.FC = () => {
  const isMobile = useAppStore((s) => s.isMobile);
  const [tabVisible, setTabVisible] = useState<boolean>(true);

  // Pause rendering when browser tab is hidden
  useEffect(() => {
    const onVisibilityChange = () => {
      setTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none bg-paper"
      aria-hidden="true"
    >
      <Canvas
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        frameloop={tabVisible ? 'always' : 'never'}
        camera={{ position: [0, 0.15, 6.2], fov: 50, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={[THEME_COLORS.paper]} />
        <CameraRig />
        <group>
          {SCENE_LAYERS.map((layer) => (
            <Layer key={layer.id} config={layer} />
          ))}
        </group>
        <PostInk />
      </Canvas>
    </div>
  );
};
