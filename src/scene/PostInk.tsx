import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME_VEC3 } from '../config/theme';
import { useAppStore } from '../store/useAppStore';

const postVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const postFragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform float uBleed;
  uniform float uReducedMotion;
  uniform vec3 uColorPaper;
  uniform vec3 uColorInk;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    // Faint paper fiber grain across the viewport (<= 2.5% strength so page reads bright white)
    float tick = floor(uTime * 8.0) * (1.0 - uReducedMotion);
    float g = hash21(vUv * 550.0 + vec2(tick * 0.17));
    float grainAlpha = step(0.988, g) * 0.024;

    // Crisp pure-ink stipple/splatter along top/bottom viewport edges during chapter transitions (alpha = 1.0, never grey)
    float edgeDist = min(vUv.y, 1.0 - vUv.y);
    float n = noise(vUv * vec2(42.0, 18.0) + vec2(tick * 0.05, 0.0));
    float stipple = step(0.68, hash21(floor(vUv * vec2(320.0, 180.0))));
    float bleedMask = step(edgeDist * 9.5, uBleed * n) * stipple * (1.0 - uReducedMotion);

    float alpha = clamp(max(grainAlpha, bleedMask), 0.0, 1.0);
    gl_FragColor = vec4(uColorInk, alpha);
  }
`;

export const PostInk: React.FC = () => {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBleed: { value: 0 },
      uReducedMotion: { value: 0 },
      uColorPaper: { value: new THREE.Vector3(...THEME_VEC3.paper) },
      uColorInk: { value: new THREE.Vector3(...THEME_VEC3.ink) },
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    const state = useAppStore.getState();
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    matRef.current.uniforms.uBleed.value = state.chapterTransitionBleed;
    matRef.current.uniforms.uReducedMotion.value = state.reducedMotion ? 1.0 : 0.0;
  });

  return (
    <mesh renderOrder={99} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={postVertex}
        fragmentShader={postFragment}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
};
