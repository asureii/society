import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME_COLORS, THEME_VEC3 } from '../config/theme';
import { clamp } from '../lib/math';
import { useAppStore } from '../store/useAppStore';
import {
  disposeEvaGpuTextures,
  ensureEvaArtBitmaps,
  getOrUploadEvaGpuBundle,
  subscribeEvaArtReady,
} from './eva/evaGenerator';
import { registerDashboardArtPreloader } from './prefetchDashboard';
import { STAGE_DASHBOARD_CONFIG } from './stage.config';

interface DashboardWebGLStageProps {
  role?: 'main' | 'sub';
}

const LAYER_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EVA_REVEAL_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform sampler2D uOrderTex;
  uniform float uReveal;
  uniform float uIsBackground;
  uniform vec3 uColorPaper;
  uniform vec3 uColorInk;

  void main() {
    vec4 tex = texture2D(uTex, vUv);
    float orderVal = texture2D(uOrderTex, vUv).r;
    float edgeMask = 1.0 - smoothstep(uReveal - 0.04, uReveal + 0.015, orderVal);

    if (uIsBackground > 0.5) {
      float isInk = step(0.45, 1.0 - tex.r) * edgeMask;
      vec3 col = mix(uColorPaper, uColorInk, isInk);
      gl_FragColor = vec4(col, 1.0);
      return;
    }

    float alpha = tex.a * edgeMask;
    if (alpha < 0.05) discard;
    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 col = luma > 0.5 ? uColorPaper : uColorInk;
    gl_FragColor = vec4(col, alpha);
  }
`;

const EVA_EYE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform float uReveal;
  uniform float uFlash;
  uniform float uOpenness;
  uniform float uBlackout;
  uniform vec3 uColorPaper;
  uniform vec3 uColorInk;
  uniform vec3 uColorRed;

  void main() {
    // Eyelid vertical squeeze around vUv.y = 0.5
    float dy = (vUv.y - 0.5) / max(0.08, uOpenness);
    vec2 sampleUv = vec2(vUv.x, 0.5 + dy);
    if (sampleUv.y < 0.02 || sampleUv.y > 0.98) discard;

    vec4 tex = texture2D(uTex, sampleUv);
    // Eye appears at the end of the reveal (uReveal >= 0.88)
    float revealGate = smoothstep(0.86, 0.94, uReveal);
    float alpha = tex.a * revealGate;
    if (alpha < 0.08) discard;

    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 baseCol = luma > 0.5 ? uColorPaper : uColorInk;
    // Dormant offline state fills the eye interior black while keeping a thin paper rim
    if (uBlackout > 0.01 && luma > 0.5) {
      baseCol = mix(baseCol, uColorInk, uBlackout);
    }
    // Brief ignition flash at the very end of the 1.2s load animation
    if (uFlash > 0.05 && luma > 0.5) {
      baseCol = mix(baseCol, uColorRed, step(0.55, uFlash));
    }
    gl_FragColor = vec4(baseCol, alpha);
  }
`;

const EVA_PUPIL_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform float uReveal;
  uniform float uOpenness;
  uniform float uBlackout;
  uniform float uShowGlint;
  uniform vec3 uColorPaper;
  uniform vec3 uColorInk;
  uniform vec3 uColorRed;

  void main() {
    if (uBlackout > 0.65 || uOpenness < 0.12) discard;
    vec4 tex = texture2D(uTex, vUv);
    float revealGate = smoothstep(0.90, 0.97, uReveal);
    float alpha = tex.a * revealGate;
    if (alpha < 0.08) discard;

    bool isRedPixel = (tex.r - max(tex.g, tex.b)) > 0.25;
    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 col = uColorInk;
    if (isRedPixel) {
      col = uShowGlint > 0.5 ? uColorRed : uColorInk;
    } else if (luma > 0.65) {
      col = uColorPaper;
    }
    gl_FragColor = vec4(col, alpha);
  }
`;

const EVA_DRIPS_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uTex;
  uniform float uTime;
  uniform float uReveal;
  uniform vec3 uColorInk;

  void main() {
    float revealGate = smoothstep(0.75, 0.92, uReveal);
    if (revealGate < 0.02) discard;
    // Slow looping vertical drip motion
    vec2 loopUv = vec2(vUv.x, fract(vUv.y - uTime * 0.035));
    // Mask to upper/lower drip zones so wrapped UVs stay anchored near horn & jaw
    float zoneMask = smoothstep(0.05, 0.12, vUv.y) * (1.0 - smoothstep(0.92, 0.99, vUv.y));
    vec4 tex = texture2D(uTex, loopUv);
    float alpha = tex.a * revealGate * zoneMask;
    if (alpha < 0.12) discard;
    gl_FragColor = vec4(uColorInk, alpha);
  }
`;

const ORB_STAGE_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D uOrbTex;
  uniform float uTime;
  uniform float uReveal;
  uniform float uRippleAmount;
  uniform float uHollowRing;
  uniform float uDndBar;
  uniform vec2 uRedOffset;
  uniform vec3 uColorPaper;
  uniform vec3 uColorInk;
  uniform vec3 uColorRed;

  void main() {
    float dropGate = smoothstep(0.84, 0.98, uReveal);
    if (dropGate < 0.01) discard;

    vec2 p = vUv - vec2(0.5);
    float dist = length(p);

    // Offline dormant mode: hollow red ring, static
    if (uHollowRing > 0.5) {
      if (dist > 0.42 || dist < 0.27) discard;
      bool outerInk = dist > 0.39 || dist < 0.295;
      gl_FragColor = vec4(outerInk ? uColorInk : uColorRed, 1.0);
      return;
    }

    vec2 ripple = vec2(0.0);
    if (uRippleAmount > 0.01) {
      float wave = sin(vUv.y * 26.0 + uTime * 2.2) * cos(vUv.x * 22.0 - uTime * 1.6);
      ripple = vec2(wave * 0.004 * uRippleAmount);
    }

    vec2 baseUv = clamp(vUv + ripple, 0.01, 0.99);
    vec2 redUv = clamp(baseUv + uRedOffset, 0.01, 0.99);

    vec4 inkSample = texture2D(uOrbTex, baseUv);
    vec4 redSample = texture2D(uOrbTex, redUv);

    float maxAlpha = max(inkSample.a, redSample.a);
    if (maxAlpha < 0.08) discard;

    // DND mode: thin black horizontal bar across the orb
    if (uDndBar > 0.5 && abs(p.y) < 0.048 && abs(p.x) < 0.30) {
      gl_FragColor = vec4(uColorInk, 1.0);
      return;
    }

    float luma = dot(inkSample.rgb, vec3(0.299, 0.587, 0.114));
    bool isInkHatch = inkSample.a > 0.25 && luma < 0.32;
    bool isRedPlate = (redSample.r - max(redSample.g, redSample.b)) > 0.22 && redSample.a > 0.2;

    if (isInkHatch) {
      gl_FragColor = vec4(uColorInk, 1.0);
    } else if (isRedPlate) {
      gl_FragColor = vec4(uColorRed, 1.0);
    } else if (inkSample.a > 0.35) {
      gl_FragColor = vec4(uColorInk, 1.0);
    } else {
      discard;
    }
  }
`;

function createDummyWhiteTex(): THREE.DataTexture {
  const data = new Uint8Array([250, 250, 248, 255]);
  const tex = new THREE.DataTexture(data, 1, 1);
  tex.needsUpdate = true;
  return tex;
}

export const DashboardWebGLStage: React.FC<DashboardWebGLStageProps> = ({
  role = 'main',
}) => {
  const { gl, camera } = useThree();
  const [, setArtTick] = useState(0);

  const bgMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const bodyMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const headMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const jawMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const eyeMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const pupilMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const dripsMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const orbMatRef = useRef<THREE.ShaderMaterial | null>(null);

  const bodyGroupRef = useRef<THREE.Group | null>(null);
  const headGroupRef = useRef<THREE.Group | null>(null);
  const jawGroupRef = useRef<THREE.Group | null>(null);
  const pupilMeshRef = useRef<THREE.Mesh | null>(null);
  const orbGroupRef = useRef<THREE.Group | null>(null);

  const revealStartRef = useRef<number | null>(null);
  const prevRouteRef = useRef<string>('/');

  const dummyTex = useMemo(() => createDummyWhiteTex(), []);

  useEffect(() => {
    const unsub = subscribeEvaArtReady(() => {
      setArtTick((t) => t + 1);
    });
    if (role === 'main') {
      registerDashboardArtPreloader(() => {
        const isMob = useAppStore.getState().isMobile;
        void ensureEvaArtBitmaps(isMob, STAGE_DASHBOARD_CONFIG.eva.eyeGlint);
      });
    }
    return () => {
      unsub();
    };
  }, [role]);

  const makeRevealUniforms = (isBackground: boolean) => ({
    uTex: { value: dummyTex as THREE.Texture },
    uOrderTex: { value: dummyTex as THREE.Texture },
    uReveal: { value: 1.0 },
    uIsBackground: { value: isBackground ? 1.0 : 0.0 },
    uColorPaper: { value: new THREE.Vector3(...THEME_VEC3.paper) },
    uColorInk: { value: new THREE.Vector3(...THEME_VEC3.ink) },
  });

  const bgUniforms = useMemo(() => makeRevealUniforms(true), [dummyTex]);
  const bodyUniforms = useMemo(() => makeRevealUniforms(false), [dummyTex]);
  const headUniforms = useMemo(() => makeRevealUniforms(false), [dummyTex]);
  const jawUniforms = useMemo(() => makeRevealUniforms(false), [dummyTex]);

  const eyeUniforms = useMemo(
    () => ({
      uTex: { value: dummyTex as THREE.Texture },
      uReveal: { value: 1.0 },
      uFlash: { value: 0.0 },
      uOpenness: { value: 1.0 },
      uBlackout: { value: 0.0 },
      uColorPaper: { value: new THREE.Vector3(...THEME_VEC3.paperPure) },
      uColorInk: { value: new THREE.Vector3(...THEME_VEC3.ink) },
      uColorRed: { value: new THREE.Vector3(...THEME_VEC3.red) },
    }),
    [dummyTex]
  );

  const pupilUniforms = useMemo(
    () => ({
      uTex: { value: dummyTex as THREE.Texture },
      uReveal: { value: 1.0 },
      uOpenness: { value: 1.0 },
      uBlackout: { value: 0.0 },
      uShowGlint: { value: STAGE_DASHBOARD_CONFIG.eva.eyeGlint ? 1.0 : 0.0 },
      uColorPaper: { value: new THREE.Vector3(...THEME_VEC3.paperPure) },
      uColorInk: { value: new THREE.Vector3(...THEME_VEC3.ink) },
      uColorRed: { value: new THREE.Vector3(...THEME_VEC3.red) },
    }),
    [dummyTex]
  );

  const dripsUniforms = useMemo(
    () => ({
      uTex: { value: dummyTex as THREE.Texture },
      uTime: { value: 0.0 },
      uReveal: { value: 1.0 },
      uColorInk: { value: new THREE.Vector3(...THEME_VEC3.ink) },
    }),
    [dummyTex]
  );

  const orbUniforms = useMemo(
    () => ({
      uOrbTex: { value: dummyTex as THREE.Texture },
      uTime: { value: 0.0 },
      uReveal: { value: 1.0 },
      uRippleAmount: { value: 1.0 },
      uHollowRing: { value: 0.0 },
      uDndBar: { value: 0.0 },
      uRedOffset: { value: new THREE.Vector2(0.012, -0.009) },
      uColorPaper: { value: new THREE.Vector3(...THEME_VEC3.paper) },
      uColorInk: { value: new THREE.Vector3(...THEME_VEC3.ink) },
      uColorRed: { value: new THREE.Vector3(...THEME_VEC3.red) },
    }),
    [dummyTex]
  );

  useFrame((state) => {
    const store = useAppStore.getState();
    const isDashboardActive =
      store.activeRoute === '/dashboard' || store.routeTransition.active;

    if (!isDashboardActive) {
      if (role === 'main' && prevRouteRef.current === '/dashboard') {
        disposeEvaGpuTextures();
        prevRouteRef.current = '/';
        revealStartRef.current = null;
      }
      return;
    }

    // Trigger worker generation if not yet cached
    void ensureEvaArtBitmaps(store.isMobile, STAGE_DASHBOARD_CONFIG.eva.eyeGlint);
    const gpuBundle = getOrUploadEvaGpuBundle(gl);

    const t = state.clock.elapsedTime;
    if (role === 'main' && store.activeRoute === '/dashboard' && prevRouteRef.current !== '/dashboard') {
      prevRouteRef.current = '/dashboard';
      revealStartRef.current = t;
      if (store.reducedMotion) {
        store.setDashboardRevealP(1);
      } else {
        store.setDashboardRevealP(0);
      }
    }

    let revealP = store.dashboardRevealP;
    if (role === 'main' && store.activeRoute === '/dashboard' && revealStartRef.current !== null) {
      if (store.reducedMotion) {
        revealP = 1.0;
      } else {
        // ~1.2s stroke-by-stroke draw-order reveal
        revealP = clamp((t - revealStartRef.current) / 1.2, 0, 1);
      }
      if (Math.abs(revealP - store.dashboardRevealP) > 0.005) {
        store.setDashboardRevealP(revealP);
      }
    } else if (role === 'sub') {
      revealP = 1.0;
    }

    if (gpuBundle) {
      if (bgMatRef.current) {
        bgMatRef.current.uniforms.uTex.value = gpuBundle.backgroundTex;
        bgMatRef.current.uniforms.uOrderTex.value = gpuBundle.backgroundOrderTex;
        bgMatRef.current.uniforms.uReveal.value = Math.max(0.25, revealP);
      }
      if (bodyMatRef.current) {
        bodyMatRef.current.uniforms.uTex.value = gpuBundle.bodyTex;
        bodyMatRef.current.uniforms.uOrderTex.value = gpuBundle.bodyOrderTex;
        bodyMatRef.current.uniforms.uReveal.value = revealP;
      }
      if (headMatRef.current) {
        headMatRef.current.uniforms.uTex.value = gpuBundle.headTex;
        headMatRef.current.uniforms.uOrderTex.value = gpuBundle.headOrderTex;
        headMatRef.current.uniforms.uReveal.value = revealP;
      }
      if (jawMatRef.current) {
        jawMatRef.current.uniforms.uTex.value = gpuBundle.jawTex;
        jawMatRef.current.uniforms.uOrderTex.value = gpuBundle.jawOrderTex;
        jawMatRef.current.uniforms.uReveal.value = revealP;
      }
      if (eyeMatRef.current) {
        eyeMatRef.current.uniforms.uTex.value = gpuBundle.eyeTex;
        eyeMatRef.current.uniforms.uReveal.value = revealP;
        // Brief eye ignition flash at the very end of the 1.2s draw-on (0.91 .. 0.99)
        const flashWindow =
          revealP > 0.9 && revealP < 0.99 ? Math.sin(((revealP - 0.9) / 0.09) * Math.PI) : 0.0;
        eyeMatRef.current.uniforms.uFlash.value = flashWindow;
      }
      if (pupilMatRef.current) {
        pupilMatRef.current.uniforms.uTex.value = gpuBundle.pupilTex;
        pupilMatRef.current.uniforms.uReveal.value = revealP;
      }
      if (dripsMatRef.current) {
        dripsMatRef.current.uniforms.uTex.value = gpuBundle.dripsTex;
        dripsMatRef.current.uniforms.uTime.value = store.reducedMotion ? 0 : t;
        dripsMatRef.current.uniforms.uReveal.value = revealP;
      }
      if (orbMatRef.current) {
        orbMatRef.current.uniforms.uOrbTex.value = gpuBundle.orbTex;
        orbMatRef.current.uniforms.uTime.value = store.reducedMotion ? 0 : t;
        orbMatRef.current.uniforms.uReveal.value = revealP;
      }
    }

    // Breathing sway (<= 1% scale sway on body/shoulders)
    if (bodyGroupRef.current) {
      const breathe = store.reducedMotion ? 0 : Math.sin(t * 1.45) * 0.008;
      bodyGroupRef.current.scale.set(1 + breathe * 0.5, 1 + breathe, 1);
    }

    // Position the orb in world space at store.dashboardOrbUv (with drop-in during reveal 0.84..1.0)
    if (orbGroupRef.current) {
      const [orbU, orbV] = store.dashboardOrbUv;
      const persp = camera as THREE.PerspectiveCamera;
      const dist = Math.abs(persp.position.z - 0);
      const vH = 2 * Math.tan(THREE.MathUtils.degToRad((persp.fov || 45) * 0.5)) * dist;
      const vW = vH * (persp.aspect || 1.6);

      const dropEase = smoothstepJS(0.84, 1.0, revealP);
      const dropYOffset = (1 - dropEase) * 0.65;

      const worldX = (orbU - 0.5) * vW;
      const worldY = (0.5 - orbV) * vH + dropYOffset;
      orbGroupRef.current.position.set(worldX, worldY, 0.12);
    }
  });

  // Coordinate mapping for the 5.0 x 5.0 Eva rig centered at (-1.55, -0.10):
  // In 1024x1024 canvas space:
  // - Neck base pivot `(340, 600)` -> local `(-0.84, -0.43)` relative to rig center
  // - Jaw hinge pivot `(435, 535)` -> local `(-0.37, -0.11)` relative to rig center
  // - Eye center `(605, 365)` -> local `(+0.46, +0.72)` relative to rig center
  return (
    <group name={`dashboard-webgl-stage-${role}`}>
      {/* 1. Paper Stage Background with faint radial speed lines & spatter */}
      <mesh position={[0, 0, -2.0]} renderOrder={0}>
        <planeGeometry args={[18, 12]} />
        <shaderMaterial
          ref={bgMatRef}
          vertexShader={LAYER_VERT}
          fragmentShader={EVA_REVEAL_FRAG}
          uniforms={bgUniforms}
          depthWrite={false}
        />
      </mesh>

      {/* Eva-01 Berserk Silhouette Layered Rig (Left ~52% of stage) */}
      <group position={[-1.55, -0.1, 0]}>
        {/* 2. Body & Shoulders Layer (breathing sway) */}
        <group ref={bodyGroupRef} position={[0, -1.6, -0.2]}>
          <mesh position={[0, 1.6, 0]} renderOrder={2}>
            <planeGeometry args={[5.0, 5.0]} />
            <shaderMaterial
              ref={bodyMatRef}
              vertexShader={LAYER_VERT}
              fragmentShader={EVA_REVEAL_FRAG}
              uniforms={bodyUniforms}
              transparent
              depthWrite={false}
            />
          </mesh>
        </group>

        {/* 3. Head Layer (pivoted at neck base `(-0.84, -0.43)`) */}
        <group ref={headGroupRef} position={[-0.84, -0.43, 0]}>
          <mesh position={[0.84, 0.43, 0]} renderOrder={3}>
            <planeGeometry args={[5.0, 5.0]} />
            <shaderMaterial
              ref={headMatRef}
              vertexShader={LAYER_VERT}
              fragmentShader={EVA_REVEAL_FRAG}
              uniforms={headUniforms}
              transparent
              depthWrite={false}
            />
          </mesh>

          {/* 4. Hinged Lower Jaw Layer (pivoted at jaw hinge `(+0.47, +0.32)` relative to neck pivot) */}
          <group ref={jawGroupRef} position={[0.47, 0.32, 0.02]}>
            <mesh position={[0.37, 0.11, 0]} renderOrder={4}>
              <planeGeometry args={[5.0, 5.0]} />
              <shaderMaterial
                ref={jawMatRef}
                vertexShader={LAYER_VERT}
                fragmentShader={EVA_REVEAL_FRAG}
                uniforms={jawUniforms}
                transparent
                depthWrite={false}
              />
            </mesh>
          </group>

          {/* 5. Eye Sclera & Sliding Pupil on Brow Plate (`(+1.30, +1.15)` relative to neck pivot) */}
          <group position={[1.3, 1.15, 0.05]}>
            <mesh renderOrder={5}>
              <planeGeometry args={[0.56, 0.56]} />
              <shaderMaterial
                ref={eyeMatRef}
                vertexShader={LAYER_VERT}
                fragmentShader={EVA_EYE_FRAG}
                uniforms={eyeUniforms}
                transparent
                depthWrite={false}
              />
            </mesh>
            <mesh ref={pupilMeshRef} position={[0, 0, 0.01]} renderOrder={6}>
              <planeGeometry args={[0.48, 0.48]} />
              <shaderMaterial
                ref={pupilMatRef}
                vertexShader={LAYER_VERT}
                fragmentShader={EVA_PUPIL_FRAG}
                uniforms={pupilUniforms}
                transparent
                depthWrite={false}
              />
            </mesh>
          </group>

          {/* 6. Looping Ink Drips Layer */}
          <mesh position={[0.84, 0.43, 0.04]} renderOrder={7}>
            <planeGeometry args={[5.0, 5.0]} />
            <shaderMaterial
              ref={dripsMatRef}
              vertexShader={LAYER_VERT}
              fragmentShader={EVA_DRIPS_FRAG}
              uniforms={dripsUniforms}
              transparent
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>

      {/* 7. Red Target Orb (Hand-inked disc with curved hatching, ripple & misregistration) */}
      <group ref={orbGroupRef} position={[0.6, 0.35, 0.12]}>
        <mesh renderOrder={8}>
          <planeGeometry args={[0.68, 0.68]} />
          <shaderMaterial
            ref={orbMatRef}
            vertexShader={LAYER_VERT}
            fragmentShader={ORB_STAGE_FRAG}
            uniforms={orbUniforms}
            transparent
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
};

function smoothstepJS(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Keep THEME_COLORS referenced for strict palette imports
void THEME_COLORS;
