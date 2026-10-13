import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME_VEC3 } from '../config/theme';
import { useAppStore } from '../store/useAppStore';
import { STAGE_DASHBOARD_CONFIG } from './stage.config';

export interface DashboardWebGLStageProps {
  role: 'main' | 'sub';
}

export const DashboardWebGLStage: React.FC<DashboardWebGLStageProps> = ({ role }) => {
  const groupRef = useRef<THREE.Group | null>(null);
  const { viewport } = useThree();

  useEffect(() => {
    if (role === 'main') {
      useAppStore.getState().setDashboardReady(true);
    }
  }, [role]);

  useFrame(() => {
    if (!groupRef.current) return;
    const state = useAppStore.getState();
    const rt = state.routeTransition;

    const isVisible =
      role === 'main'
        ? (state.activeRoute === '/dashboard' && !rt.active) ||
          (rt.active && rt.direction === 'to-home')
        : rt.active && rt.direction === 'to-dashboard';

    groupRef.current.visible = isVisible;
  });

  const orbPos = STAGE_DASHBOARD_CONFIG.orb.defaultPos;
  const orbWorldX = (orbPos[0] - 0.5) * viewport.width;
  const orbWorldY = (0.5 - orbPos[1]) * viewport.height;
  const orbRadiusWorld = STAGE_DASHBOARD_CONFIG.orb.radius * viewport.width;

  return (
    <group ref={groupRef} visible={false}>
      {/* Paper base plane */}
      <mesh position={[0, 0, -0.5]}>
        <planeGeometry args={[viewport.width * 1.2, viewport.height * 1.2]} />
        <meshBasicMaterial color={new THREE.Color(...THEME_VEC3.paper)} depthWrite={false} />
      </mesh>

      {/* Initial red dot placeholder plane (upgraded to full Eva-01 rig + orb shader in Phases 3-4) */}
      <mesh position={[orbWorldX, orbWorldY, 0.1]}>
        <circleGeometry args={[orbRadiusWorld, 32]} />
        <meshBasicMaterial color={new THREE.Color(...THEME_VEC3.red)} depthWrite={false} />
      </mesh>
    </group>
  );
};
