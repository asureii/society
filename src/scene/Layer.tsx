import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { INK_CONFIG } from '../config/ink';
import type { LayerConfig } from '../config/layers.config';
import { THEME_COLORS, THEME_VEC3 } from '../config/theme';
import { lerp } from '../lib/math';
import { useAppStore } from '../store/useAppStore';
import { getCachedLayerArt } from './art';
import vertexShader from './shaders/layer.vert.glsl';
import fragmentShader from './shaders/layer.frag.glsl';

interface LayerProps {
  config: LayerConfig;
}

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

export const Layer: React.FC<LayerProps> = ({ config }) => {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const dampedMouse = useRef<[number, number]>([0, 0]);
  const hasExternalOverride = useRef<boolean>(false);

  const isMobile = useAppStore((s) => s.isMobile);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const isLoaded = useAppStore((s) => s.isLoaded);

  const fallbackDummy = useMemo(
    () => createPlaceholderTexture(config.kind === 'sky' ? THEME_COLORS.paper : 'rgba(0,0,0,0)'),
    [config.kind],
  );

  const uniforms = useMemo(
    () => ({
      uTex0: { value: fallbackDummy },
      uTex1: { value: fallbackDummy },
      uTex2: { value: fallbackDummy },
      uDepthMap: { value: fallbackDummy },
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
      uColorPaper: { value: new THREE.Vector3(...THEME_VEC3.paper) },
      uColorInk: { value: new THREE.Vector3(...THEME_VEC3.ink) },
      uColorRed: { value: new THREE.Vector3(...THEME_VEC3.red) },
    }),
    [config, fallbackDummy, isMobile, reducedMotion],
  );

  // Sync async-generated hand-inked variants from src/scene/art/
  useEffect(() => {
    const applyBundle = () => {
      if (hasExternalOverride.current || !materialRef.current) return;
      const bundle = getCachedLayerArt(config.id);
      if (bundle) {
        materialRef.current.uniforms.uTex0.value = bundle.variants[0];
        materialRef.current.uniforms.uTex1.value = bundle.variants[1];
        materialRef.current.uniforms.uTex2.value = bundle.variants[2];
        materialRef.current.uniforms.uDepthMap.value = bundle.depthMap;
      }
    };

    applyBundle();
    const timer = window.setInterval(applyBundle, 120);
    return () => clearInterval(timer);
  }, [config.id, isLoaded]);

  // Support external PNG layer override contract (/public/layers/<scene>/<layer>.png)
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      config.texturePath,
      (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        hasExternalOverride.current = true;
        if (materialRef.current) {
          materialRef.current.uniforms.uTex0.value = loadedTex;
          materialRef.current.uniforms.uTex1.value = loadedTex;
          materialRef.current.uniforms.uTex2.value = loadedTex;
        }
      },
      undefined,
      () => {
        // External file not present; procedural hand-inked art remains active
      },
    );

    if (config.depthMapPath) {
      loader.load(
        config.depthMapPath,
        (loadedDepth) => {
          if (materialRef.current) {
            materialRef.current.uniforms.uDepthMap.value = loadedDepth;
          }
        },
        undefined,
        () => {},
      );
    }
  }, [config.depthMapPath, config.texturePath]);

  useFrame(({ clock }) => {
    const state = useAppStore.getState();
    const [targetX, targetY] = state.mouseTarget;

    dampedMouse.current[0] = lerp(dampedMouse.current[0], targetX, 0.07);
    dampedMouse.current[1] = lerp(dampedMouse.current[1], targetY, 0.07);

    if (materialRef.current) {
      const elapsed = clock.getElapsedTime();
      materialRef.current.uniforms.uTime.value = elapsed;
      materialRef.current.uniforms.uMouse.value.set(
        dampedMouse.current[0],
        dampedMouse.current[1],
      );
      materialRef.current.uniforms.uScrollProgress.value = state.scrollProgress;
      materialRef.current.uniforms.uTransitionBleed.value = state.chapterTransitionBleed;
      materialRef.current.uniforms.uReducedMotion.value = state.reducedMotion ? 1.0 : 0.0;

      // Cycle 3 line-boil variants at INK_CONFIG.boilFps (~9fps) on desktop when motion is allowed
      const canBoil = !state.reducedMotion && !state.isMobile && config.boilVariants > 1;
      const frameIdx = canBoil ? Math.floor(elapsed * INK_CONFIG.boilFps) % 3 : 0;
      materialRef.current.uniforms.uBoilFrame.value = frameIdx;

      // Print misregistration offset (2–3px base + subtle drift with scroll)
      const baseOffX = INK_CONFIG.misregistrationOffsetPx[0] / config.textureSize[0];
      const baseOffY = INK_CONFIG.misregistrationOffsetPx[1] / config.textureSize[1];
      const scrollDrift = (state.scrollProgress - 0.5) * 0.0022 * (state.reducedMotion ? 0 : 1);
      materialRef.current.uniforms.uRedOffset.value.set(
        baseOffX + scrollDrift,
        baseOffY - scrollDrift * 0.7,
      );
    }

    if (meshRef.current) {
      const parallaxScale = state.reducedMotion ? 0 : 1;
      const px = dampedMouse.current[0] * config.parallaxFactor[0] * 0.52 * parallaxScale;
      const py =
        config.y +
        dampedMouse.current[1] * config.parallaxFactor[1] * 0.32 * parallaxScale +
        state.scrollProgress * config.parallaxFactor[1] * 0.42 * parallaxScale;
      meshRef.current.position.set(px, py, config.z);
    }
  });

  if (isMobile && config.hideOnMobile) {
    return null;
  }

  // Overscan layers by 8% per B6 so depth displacement never reveals plane seams
  const overscannedScale: [number, number] = [
    config.scale[0] * 1.08,
    config.scale[1] * 1.08,
  ];

  return (
    <mesh ref={meshRef} position={[0, config.y, config.z]}>
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
