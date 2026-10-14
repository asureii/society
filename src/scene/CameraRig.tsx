/**
 * CONTINUOUS C^1 HERMITE CAMERA FLIGHT RIG (src/scene/CameraRig.tsx)
 *
 * Implements:
 * 1. Single smoothing stage: Driven directly from Lenis-smoothed scroll (no secondary camera damping lag or pops).
 * 2. C^1 continuous trajectory: Piecewise Hermite splines where exit pose & velocity of Scene N strictly match
 *    entry pose & velocity of Scene N+1 (zero velocity jumps across boundaries).
 * 3. Shared Pose Evaluator (`applySceneCameraPose`): Used by both the main `CameraRig` and the offscreen
 *    `TransitionSubScene` so that as `tau -> 1`, the incoming FBO camera and the main camera have
 *    bit-for-bit identical position, idle drift, lookAt target, and roll rotation (zero end-of-transition pop).
 * 4. Telemetry: Logs camera pose and velocity to window.__PILOT_CAMERA__ for verification auditing.
 */

import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENES_CONFIG, type CameraVelocity } from '../config/scenes.config';
import { useAppStore } from '../store/useAppStore';

/** Evaluates a cubic Hermite spline at progress t in [0, 1] */
function hermite(p0: number, p1: number, v0: number, v1: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * p0 + h10 * v0 + h01 * p1 + h11 * v1;
}

/** Evaluates the velocity (rate of change with respect to local progress t) */
function hermiteVelocity(p0: number, p1: number, v0: number, v1: number, t: number): number {
  const t2 = t * t;
  const dh00 = 6 * t2 - 6 * t;
  const dh10 = 3 * t2 - 4 * t + 1;
  const dh01 = -6 * t2 + 6 * t;
  const dh11 = 3 * t2 - 2 * t;
  return dh00 * p0 + dh10 * v0 + dh01 * p1 + dh11 * v1;
}

/**
 * Shared camera pose evaluator used by both the main scene camera and the offscreen
 * incoming transition sub-camera so their poses, idle drift, and lookAt targets
 * converge identically before tau reaches 1.0.
 */
export function applySceneCameraPose(
  camera: THREE.PerspectiveCamera,
  sceneIdx: number,
  localProgress: number,
  elapsed: number,
  size: { width: number; height: number },
  reducedMotion: boolean,
  pullBackBlend = 0,
) {
  const clampedIdx = Math.max(0, Math.min(SCENES_CONFIG.length - 1, sceneIdx));
  const sceneSpec = SCENES_CONFIG[clampedIdx];
  const rig = sceneSpec.cameraRig;

  const t = reducedMotion ? 0.35 : localProgress;

  const defV0: CameraVelocity = rig.entryVelocity ?? {
    vx: rig.xTo - rig.xFrom,
    vy: rig.yTo - rig.yFrom,
    vz: rig.zTo - rig.zFrom,
    vRollDeg: rig.rollDegTo - rig.rollDegFrom,
  };
  const defV1: CameraVelocity = rig.exitVelocity ?? defV0;

  let posX = hermite(rig.xFrom, rig.xTo, defV0.vx, defV1.vx, t);
  let posY = hermite(rig.yFrom, rig.yTo, defV0.vy, defV1.vy, t);
  let posZ = hermite(rig.zFrom, rig.zTo, defV0.vz, defV1.vz, t);
  const rollDeg = hermite(rig.rollDegFrom, rig.rollDegTo, defV0.vRollDeg, defV1.vRollDeg, t);

  const velX = hermiteVelocity(rig.xFrom, rig.xTo, defV0.vx, defV1.vx, t);
  const velY = hermiteVelocity(rig.yFrom, rig.yTo, defV0.vy, defV1.vy, t);
  const velZ = hermiteVelocity(rig.zFrom, rig.zTo, defV0.vz, defV1.vz, t);

  // Subtle pull-back during the first half of incoming transition, settling to 0.000 by tau = 0.85
  if (pullBackBlend > 0.0001) {
    posX -= 0.08 * pullBackBlend;
    posY -= 0.05 * pullBackBlend;
    posZ += 1.1 * pullBackBlend;
  }

  const portraitZOffset = size.width < size.height ? 2.1 : 0;
  posZ += portraitZOffset;

  if (!reducedMotion) {
    const driftX = Math.sin(elapsed * 0.45) * 0.035;
    const driftY = Math.cos(elapsed * 0.38) * 0.025;
    posX += driftX;
    posY += driftY;
  }

  camera.position.set(posX, posY, posZ);

  const lookX = rig.type === 'track' || rig.type === 'crane' ? posX * 0.82 : 0;
  const lookY = rig.type === 'tiltUp' ? posY * 0.75 : posY * 0.42;
  camera.lookAt(lookX, lookY, -12);

  const degToRad = Math.PI / 180;
  camera.rotation.z = rollDeg * degToRad;

  return {
    sceneSpec,
    sceneIdx: clampedIdx,
    rig,
    t,
    posX,
    posY,
    posZ,
    rollDeg,
    velX,
    velY,
    velZ,
  };
}

export function applyDashboardCameraPose(camera: THREE.PerspectiveCamera): void {
  camera.position.set(0, 0, 6.0);
  camera.lookAt(0, 0, 0);
  camera.rotation.z = 0;
}

export const CameraRig: React.FC = () => {
  const { camera } = useThree();
  const prevTimeRef = useRef<number>(0);
  const prevPosRef = useRef<[number, number, number]>([0, 0.14, 6.0]);

  useFrame(({ clock, size }) => {
    const state = useAppStore.getState();
    const elapsed = clock.getElapsedTime();
    const rt = state.routeTransition;

    const mainShowingDashboard =
      state.activeRoute === '/dashboard' ||
      (rt.active && rt.direction === 'to-home' && state.activeRoute !== '/');

    if (mainShowingDashboard) {
      applyDashboardCameraPose(camera as THREE.PerspectiveCamera);
      return;
    }

    const pose = applySceneCameraPose(
      camera as THREE.PerspectiveCamera,
      state.chapterState.fromIndex,
      state.sceneLocalProgress,
      elapsed,
      size,
      state.reducedMotion,
      0,
    );

    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__PILOT_CAMERA__ = {
        sceneId: pose.sceneSpec.id,
        sceneIndex: pose.sceneIdx,
        rigType: pose.rig.type,
        localProgress: Number(pose.t.toFixed(4)),
        scrollProgress: Number(state.scrollProgress.toFixed(4)),
        x: Number(pose.posX.toFixed(4)),
        y: Number(pose.posY.toFixed(4)),
        z: Number(pose.posZ.toFixed(4)),
        rollDeg: Number(pose.rollDeg.toFixed(3)),
        vx: Number(pose.velX.toFixed(4)),
        vy: Number(pose.velY.toFixed(4)),
        vz: Number(pose.velZ.toFixed(4)),
      };
    }

    prevTimeRef.current = elapsed;
    prevPosRef.current = [pose.posX, pose.posY, pose.posZ];
  });

  return null;
};
