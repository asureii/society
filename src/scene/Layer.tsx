import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { LayerConfig } from '../config/layers.config';
import { THEME_VEC3 } from '../config/theme';
import { lerp } from '../lib/math';
import { useAppStore } from '../store/useAppStore';
import { generateLayerTextures } from './proceduralArt';
import vertexShader from './shaders/layer.vert.glsl';
import fragmentShader from './shaders/layer.frag.glsl';

interface LayerProps {
  config: LayerConfig;
}

export const Layer: React.FC<LayerProps> = ({ config }) => {
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const dampedMouse = useRef<[number, number]>([0, 0]);

  const isMobile = useAppStore((s) => s.isMobile);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  // Generate procedural fallback textures immediately so there is zero blank flash
  const generated = useMemo(() => generateLayerTextures(config.kind), [config.kind]);

  // Attempt to load external PNG layer / depth map if the user drops art into /public/layers/
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      config.texturePath,
      (loadedTex) => {
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        if (materialRef.current) {
          materialRef.current.uniforms.uTexture.value = loadedTex;
        }
      },
      undefined,
      () => {
        // External file not supplied yet; keep procedural canvas texture
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
        () => {
          // Keep procedural depth map
        },
      );
    }

    return () => {
      generated.colorMap.dispose();
      generated.depthMap.dispose();
    };
  }, [config.depthMapPath, config.texturePath, generated]);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: generated.colorMap },
      uDepthMap: { value: generated.depthMap },
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
      uHalftoneMix: { value: config.shaderOptions.halftoneMix },
      uRippleAmount: { value: config.shaderOptions.rippleAmount },
      uAllowRed: { value: config.allowRedChannel ? 1.0 : 0.0 },
      uColorPaper: { value: new THREE.Vector3(...THEME_VEC3.paper) },
      uColorInk: { value: new THREE.Vector3(...THEME_VEC3.ink) },
      uColorRed: { value: new THREE.Vector3(...THEME_VEC3.red) },
    }),
    [config, generated, isMobile, reducedMotion],
  );

  useFrame(({ clock }) => {
    const state = useAppStore.getState();
    const [targetX, targetY] = state.mouseTarget;

    dampedMouse.current[0] = lerp(dampedMouse.current[0], targetX, 0.07);
    dampedMouse.current[1] = lerp(dampedMouse.current[1], targetY, 0.07);

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      materialRef.current.uniforms.uMouse.value.set(
        dampedMouse.current[0],
        dampedMouse.current[1],
      );
      materialRef.current.uniforms.uScrollProgress.value = state.scrollProgress;
      materialRef.current.uniforms.uTransitionBleed.value = state.chapterTransitionBleed;
      materialRef.current.uniforms.uReducedMotion.value = state.reducedMotion ? 1.0 : 0.0;
    }

    if (meshRef.current) {
      const parallaxScale = state.reducedMotion ? 0 : 1;
      const px = dampedMouse.current[0] * config.parallaxFactor[0] * 0.55 * parallaxScale;
      const py =
        config.y +
        dampedMouse.current[1] * config.parallaxFactor[1] * 0.35 * parallaxScale +
        state.scrollProgress * config.parallaxFactor[1] * 0.45 * parallaxScale;
      meshRef.current.position.set(px, py, config.z);
    }
  });

  if (isMobile && config.hideOnMobile) {
    return null;
  }

  return (
    <mesh ref={meshRef} position={[0, config.y, config.z]}>
      <planeGeometry args={config.scale} />
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
