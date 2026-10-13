/**
 * CONTINUOUS MULTI-SCENE STAGE, GPU READINESS & DUAL-SCENE COMPOSITOR
 * (src/scene/Scene.tsx)
 *
 * Implements:
 * 1. Single Clock Consumption: Reads `chapterState { fromIndex, toIndex, tau }` synchronously in `useFrame`.
 * 2. Zero React Lag at Boundary Handoff: All scene groups remain mounted in the scene graph and toggle
 *    visibility synchronously inside `useFrame` (before rendering), eliminating the 1-frame flash when
 *    `fromIndex` advances from N to N+1 and `tau` resets from ~1.0 to 0.0.
 * 3. Identical FBO Resolution & Camera Pose Convergence: Offscreen `WebGLRenderTarget` matches the
 *    exact drawing-buffer pixel size (`size * dpr`) and uses `applySceneCameraPose` so at `tau >= 0.85`
 *    the incoming FBO render is bit-for-bit aligned with the main canvas at `u = 0`.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENES_CONFIG } from '../config/scenes.config';
import { THEME_COLORS } from '../config/theme';
import { useAppStore } from '../store/useAppStore';
import {
  registerWebGLRenderer,
  refreshDynamicSceneLayer,
  syncSceneWindow,
} from './art';
import { applySceneCameraPose, CameraRig } from './CameraRig';
import { IntroStage } from './intro/introScene';
import { Layer } from './Layer';
import { PostInk } from './PostInk';

/**
 * Registers the WebGLRenderer with the texture manager so `renderer.initTexture`
 * uploads every generated CanvasTexture before any boundary is crossed.
 */
const RendererReadinessBridge: React.FC = () => {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    registerWebGLRenderer(gl);
    if ('compileAsync' in gl && typeof gl.compileAsync === 'function') {
      void gl.compileAsync(scene, camera);
    } else {
      gl.compile(scene, camera);
    }
    return () => {
      registerWebGLRenderer(null);
    };
  }, [camera, gl, scene]);

  return null;
};

/**
 * Portals all incoming scene groups into `subScene` so their `Layer` `useFrame` hooks
 * register and execute before `SubSceneRenderer` renders `subScene` to the FBO.
 */
const SubSceneLayers: React.FC<{ subScene: THREE.Scene }> = ({ subScene }) => {
  return (
    <>
      {createPortal(
        <group>
          {SCENES_CONFIG.map((spec) => (
            <group key={`sub-group-${spec.id}`}>
              {spec.layers.map((layer, idx) => (
                <Layer
                  key={`sub-${spec.id}-${layer.id}`}
                  sceneId={spec.id}
                  config={layer}
                  isBackgroundLayer={idx === 0}
                  role="sub"
                  localProgressOverride={0}
                />
              ))}
            </group>
          ))}
        </group>,
        subScene,
      )}
    </>
  );
};

/**
 * Offscreen Transition Renderer: Renders `subScene` (`toIndex`) to `fbo` after `SubSceneLayers`
 * have updated their visibility, uniforms, and positions for the current frame.
 */
const SubSceneRenderer: React.FC<{
  subScene: THREE.Scene;
  fbo: THREE.WebGLRenderTarget;
}> = ({ subScene, fbo }) => {
  const { gl, size } = useThree();

  const subCamera = useMemo(
    () => new THREE.PerspectiveCamera(50, size.width / Math.max(1, size.height), 0.1, 50),
    [size.height, size.width],
  );

  // Match FBO pixel dimensions to exact WebGL drawing buffer size so hatch & ink thresholds never shift at tau = 1 -> 0
  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const targetW = Math.max(1, Math.round(size.width * dpr));
    const targetH = Math.max(1, Math.round(size.height * dpr));
    if (fbo.width !== targetW || fbo.height !== targetH) {
      fbo.setSize(targetW, targetH);
    }
  }, [fbo, gl, size.height, size.width]);

  // Pre-compile all incoming subScene shaders once on mount
  useEffect(() => {
    if ('compileAsync' in gl && typeof gl.compileAsync === 'function') {
      void gl.compileAsync(subScene, subCamera);
    } else {
      gl.compile(subScene, subCamera);
    }
  }, [gl, subCamera, subScene]);

  useFrame(({ clock }) => {
    const state = useAppStore.getState();
    const { tau, fromIndex, toIndex } = state.chapterState;

    // Only render offscreen FBO when inside or approaching a transition
    if (fromIndex === toIndex && tau <= 0.0001) {
      return;
    }

    const dpr = gl.getPixelRatio();
    const targetW = Math.max(1, Math.round(size.width * dpr));
    const targetH = Math.max(1, Math.round(size.height * dpr));
    if (fbo.width !== targetW || fbo.height !== targetH) {
      fbo.setSize(targetW, targetH);
    }

    subCamera.aspect = size.width / Math.max(1, size.height);
    subCamera.updateProjectionMatrix();

    // Settle incoming camera pull-back smoothly to 0.000 by tau = 0.85 so that for tau in [0.85, 1.0]
    // subCamera has the exact same position, idle drift, lookAt, and roll as CameraRig at t = 0
    const settleT = THREE.MathUtils.smoothstep(tau, 0.0, 0.85);
    const pullBackBlend = 1.0 - settleT;

    applySceneCameraPose(
      subCamera,
      toIndex,
      0,
      clock.getElapsedTime(),
      size,
      state.reducedMotion,
      pullBackBlend,
    );

    const prevTarget = gl.getRenderTarget();
    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(subScene, subCamera);
    gl.setRenderTarget(prevTarget);
  });

  return null;
};

export const Scene: React.FC = () => {
  const isMobile = useAppStore((s) => s.isMobile);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const isLoaded = useAppStore((s) => s.isLoaded);
  const fromIndex = useAppStore((s) => s.chapterState.fromIndex);
  const discordStatus = useAppStore((s) => s.discord.status);
  const hoveredRepoIndex = useAppStore((s) => s.hoveredRepoIndex);
  const [tabVisible, setTabVisible] = useState<boolean>(true);

  const subScene = useMemo(() => {
    const s = new THREE.Scene();
    s.background = new THREE.Color(THEME_COLORS.paperPure);
    return s;
  }, []);

  const fbo = useMemo(() => {
    return new THREE.WebGLRenderTarget(1440, 900, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      setTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  // Preload scenes in scroll order ahead of the user
  useEffect(() => {
    if (!isLoaded) return;
    void syncSceneWindow(fromIndex, {
      singleVariantOnly: isMobile || reducedMotion,
      isMobile,
      presenceStatus: discordStatus,
      hoveredRepoIndex,
    });
  }, [discordStatus, fromIndex, hoveredRepoIndex, isLoaded, isMobile, reducedMotion]);

  // S4 Discord presence reactivity
  useEffect(() => {
    if (!isLoaded) return;
    refreshDynamicSceneLayer('s4-plug', 'plug-rings', {
      presenceStatus: discordStatus,
    });
  }, [discordStatus, isLoaded]);

  // S3 Repo hover district highlight
  useEffect(() => {
    if (!isLoaded) return;
    refreshDynamicSceneLayer('s3-archive-city', 'dome-orb', {
      hoveredRepoIndex,
    });
  }, [hoveredRepoIndex, isLoaded]);

  useEffect(() => {
    return () => {
      fbo.dispose();
    };
  }, [fbo]);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none bg-paper-pure"
      aria-hidden="true"
    >
      <Canvas
        dpr={isMobile ? [1, 1.5] : [1, 2]}
        frameloop={!tabVisible ? 'never' : 'always'}
        camera={{ position: [0, 0.14, 6.0], fov: 50, near: 0.1, far: 50 }}
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={[THEME_COLORS.paperPure]} />

        <RendererReadinessBridge />
        <CameraRig />

        {/* All scene groups stay mounted; Layer toggles mesh.visible synchronously in useFrame */}
        <group>
          {SCENES_CONFIG.map((spec) => (
            <group key={`main-${spec.id}`}>
              {spec.layers.map((layer, idx) => (
                <Layer
                  key={`main-${spec.id}-${layer.id}`}
                  sceneId={spec.id}
                  config={layer}
                  isBackgroundLayer={idx === 0}
                  role="main"
                />
              ))}
            </group>
          ))}
        </group>

        {/* Offscreen Sub-Scene layers + FBO render pass in strict execution order */}
        <SubSceneLayers subScene={subScene} />
        <SubSceneRenderer subScene={subScene} fbo={fbo} />

        {/* Single-clock PostInk transition compositor */}
        <PostInk incomingTexture={fbo.texture} />

        {/* Cinematic Intro WebGL Stage (renders during introState !== 'done' and opens Portal Iris into Scene 1) */}
        <IntroStage />
      </Canvas>
    </div>
  );
};
