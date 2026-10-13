import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { INK_CONFIG } from '../config/ink';
import type { SceneId, SceneLayerConfig } from '../config/scenes.config';
import { THEME_COLORS, THEME_VEC3 } from '../config/theme';
import { lerp } from '../lib/math';
import { useAppStore } from '../store/useAppStore';
import { getCachedLayerArt, subscribeSceneArtUpdates } from './art';
import vertexShader from './shaders/layer.vert.glsl';
import fragmentShader from './shaders/layer.frag.glsl';

interface LayerProps {
  sceneId: SceneId;
  config: SceneLayerConfig;
  isBackgroundLayer: boolean;
  /** 'main' renders in main canvas (`fromScene`); 'sub' renders in offscreen FBO (`toScene`) */
  role?: 'main' | 'sub';
  /** Optional local progress override (e.g. 0 for incoming scene during transition) */
  localProgressOverride?: number;
}

// Shared damped mouse across main and sub-scene layers so incoming -> outgoing handoff has zero parallax jump
const sharedDampedMouse: [number, number] = [0, 0];
let lastMouseFrameTime = -1;

function createPlaceholderTexture(fill: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 4;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, 4, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export const Layer: React.FC<LayerProps> = ({
  sceneId,
  config,
  isBackgroundLayer,
  role = 'main',
  localProgressOverride,
}) => {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);

  const isMobile = useAppStore((s) => s.isMobile);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const fallbackDummy = useMemo(
    () =>
      createPlaceholderTexture(
        isBackgroundLayer ? THEME_COLORS.paperPure : 'rgba(0,0,0,0)',
      ),
    [isBackgroundLayer],
  );

  const uniforms = useMemo(() => {
    // Synchronously bind cached textures on Frame 0 so a Layer never flashes white
    const cached = getCachedLayerArt(sceneId, config.id);
    return {
      uTex0: { value: cached?.variants[0] ?? fallbackDummy },
      uTex1: { value: cached?.variants[1] ?? fallbackDummy },
      uTex2: { value: cached?.variants[2] ?? fallbackDummy },
      uDepthMap: { value: cached?.depthMap ?? fallbackDummy },
      uBoilFrame: { value: 0 },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uScrollProgress: { value: 0 },
      uTransitionBleed: { value: 0 },
      uReducedMotion: { value: reducedMotion ? 1.0 : 0.0 },
      uHatchDensity: {
        value: isMobile
          ? config.shaderOptions.hatchDensity * 0.72
          : config.shaderOptions.hatchDensity,
      },
      uEdgeStrength: { value: config.shaderOptions.edgeStrength },
      uBoilAmount: { value: isMobile ? 0.0 : config.shaderOptions.boilAmount },
      uDepthDisplace: { value: config.shaderOptions.depthDisplacement },
      uRippleAmount: { value: config.shaderOptions.rippleAmount },
      uAllowRed: { value: config.allowRedChannel ? 1.0 : 0.0 },
      uRedOffset: {
        value: new THREE.Vector2(
          INK_CONFIG.misregistrationOffsetPx[0] / config.textureSize[0],
          INK_CONFIG.misregistrationOffsetPx[1] / config.textureSize[1],
        ),
      },
      uColorPaper: { value: new THREE.Vector3(...THEME_VEC3.paperPure) },
      uColorInk: { value: new THREE.Vector3(...THEME_VEC3.ink) },
      uColorRed: { value: new THREE.Vector3(...THEME_VEC3.red) },
    };
  }, [config, fallbackDummy, isMobile, reducedMotion, sceneId]);

  useEffect(() => {
    const applyBundle = () => {
      if (!materialRef.current) return;
      const bundle = getCachedLayerArt(sceneId, config.id);
      if (bundle) {
        materialRef.current.uniforms.uTex0.value = bundle.variants[0];
        materialRef.current.uniforms.uTex1.value = bundle.variants[1];
        materialRef.current.uniforms.uTex2.value = bundle.variants[2];
        materialRef.current.uniforms.uDepthMap.value = bundle.depthMap;
        materialRef.current.needsUpdate = true;
      } else {
        // Unbind evicted textures so disposed GPU textures are never referenced
        materialRef.current.uniforms.uTex0.value = fallbackDummy;
        materialRef.current.uniforms.uTex1.value = fallbackDummy;
        materialRef.current.uniforms.uTex2.value = fallbackDummy;
        materialRef.current.uniforms.uDepthMap.value = fallbackDummy;
      }
    };

    applyBundle();
    const unsub = subscribeSceneArtUpdates(applyBundle);
    return () => unsub();
  }, [config.id, fallbackDummy, sceneId]);

  useFrame(({ clock }) => {
    const state = useAppStore.getState();
    const cs = state.chapterState;

    // Keep Scene 1..7 layers hidden during intro phases 0..3 (until 'portal', skip, or 'done')
    const isScrubbingIntro =
      state.debugScrubber.enabled && state.debugScrubber.mode === 'intro';
    const introHidesScene =
      isScrubbingIntro
        ? state.debugScrubber.introP < 0.84
        : state.introState !== 'done' &&
          state.introState !== 'portal' &&
          !state.isSkippingIntro;

    if (introHidesScene) {
      if (meshRef.current) {
        meshRef.current.visible = false;
      }
      return;
    }

    // Synchronous single-clock visibility check (no React re-render delay on boundary crossing)
    const isActiveSceneForRole =
      role === 'main'
        ? cs.fromScene === sceneId
        : cs.toScene === sceneId && (cs.tau > 0.0001 || cs.fromIndex !== cs.toIndex);

    if (!isActiveSceneForRole) {
      if (meshRef.current) {
        meshRef.current.visible = false;
      }
      return;
    }

    const elapsed = clock.getElapsedTime();
    if (elapsed !== lastMouseFrameTime) {
      const [targetX, targetY] = state.mouseTarget;
      sharedDampedMouse[0] = lerp(sharedDampedMouse[0], targetX, 0.08);
      sharedDampedMouse[1] = lerp(sharedDampedMouse[1], targetY, 0.08);
      lastMouseFrameTime = elapsed;
    }

    // Ensure textures are bound before drawing; never render a layer whose textures are missing
    if (materialRef.current) {
      if (materialRef.current.uniforms.uTex0.value === fallbackDummy) {
        const bundle = getCachedLayerArt(sceneId, config.id);
        if (bundle) {
          materialRef.current.uniforms.uTex0.value = bundle.variants[0];
          materialRef.current.uniforms.uTex1.value = bundle.variants[1];
          materialRef.current.uniforms.uTex2.value = bundle.variants[2];
          materialRef.current.uniforms.uDepthMap.value = bundle.depthMap;
          materialRef.current.needsUpdate = true;
        }
      }

      const hasRealTexture = materialRef.current.uniforms.uTex0.value !== fallbackDummy;
      if (meshRef.current) {
        meshRef.current.visible = hasRealTexture;
      }
      if (!hasRealTexture) return;

      const localP = localProgressOverride ?? state.sceneLocalProgress;

      const presenceMult =
        sceneId === 's4-plug'
          ? state.discord.status === 'online'
            ? 1.35
            : state.discord.status === 'idle'
              ? 0.55
              : 0.15
          : 1.0;

      materialRef.current.uniforms.uTime.value = elapsed * presenceMult;
      materialRef.current.uniforms.uMouse.value.set(
        sharedDampedMouse[0],
        sharedDampedMouse[1],
      );
      materialRef.current.uniforms.uScrollProgress.value = localP;
      materialRef.current.uniforms.uTransitionBleed.value = state.chapterTransitionBleed;
      materialRef.current.uniforms.uReducedMotion.value = state.reducedMotion ? 1.0 : 0.0;

      const canBoil = !state.reducedMotion && !state.isMobile && config.boilVariants > 1;
      const boilRate = INK_CONFIG.boilFps * presenceMult;
      const frameIdx = canBoil ? Math.floor(elapsed * boilRate) % 3 : 0;
      materialRef.current.uniforms.uBoilFrame.value = frameIdx;

      const baseOffX = INK_CONFIG.misregistrationOffsetPx[0] / config.textureSize[0];
      const baseOffY = INK_CONFIG.misregistrationOffsetPx[1] / config.textureSize[1];
      const scrollDrift =
        (localP - 0.5) * 0.0022 * (state.reducedMotion ? 0 : 1);
      materialRef.current.uniforms.uRedOffset.value.set(
        baseOffX + scrollDrift,
        baseOffY - scrollDrift * 0.7,
      );
    }

    if (meshRef.current) {
      const localP = localProgressOverride ?? state.sceneLocalProgress;
      const parallaxScale = state.reducedMotion ? 0 : 1;
      const px =
        sharedDampedMouse[0] * config.parallaxFactor[0] * 0.52 * parallaxScale;
      const py =
        config.y +
        sharedDampedMouse[1] * config.parallaxFactor[1] * 0.32 * parallaxScale +
        (localP - 0.3) * config.parallaxFactor[1] * 0.48 * parallaxScale;
      meshRef.current.position.set(px, py, config.z);
    }
  });

  if (isMobile && config.hideOnMobile) {
    return null;
  }

  const overscannedScale: [number, number] = [
    config.scale[0] * 1.08,
    config.scale[1] * 1.08,
  ];

  const initialState = useAppStore.getState();
  const initialCs = initialState.chapterState;
  const initiallyActive =
    initialState.introState === 'done' &&
    (role === 'main'
      ? initialCs.fromScene === sceneId
      : initialCs.toScene === sceneId && initialCs.tau > 0.0001);
  const hasInitialCache = Boolean(getCachedLayerArt(sceneId, config.id));

  return (
    <mesh
      ref={meshRef}
      position={[0, config.y, config.z]}
      visible={initiallyActive && hasInitialCache}
    >
      <planeGeometry args={overscannedScale} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
};
