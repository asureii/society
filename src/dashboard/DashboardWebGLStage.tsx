import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { THEME_COLORS, THEME_VEC3 } from '../config/theme.ts';
import { clamp, lerp } from '../lib/math.ts';
import { useAppStore, type DiscordStatusType } from '../store/useAppStore.ts';
import { EVA_CONFIG, type SpringSpec } from './eva.config.ts';
import {
  disposeEvaGpuTextures,
  ensureEvaArtBitmaps,
  EVA_META,
  getEvaMemoryUsageBytes,
  getOrUploadEvaGpuBundle,
  subscribeEvaArtReady,
} from './eva/evaGenerator.ts';
import { EVA_PROPORTIONS } from './eva/proportions.ts';
import { EVA_SKELETON, hToPlaneWorld, type PointH } from './eva/skeleton.ts';
import {
  interpolatePresenceProfiles,
  PRESENCE_BEHAVIOR_PROFILES,
  PRESENCE_TRANSITION_DURATION_SEC,
  resolveTargetPresenceProfile,
  type PresenceBehaviorProfile,
} from './presenceBehavior.ts';
import { registerDashboardArtPreloader } from './prefetchDashboard.ts';
import sightLineFrag from './shaders/sightLine.frag.glsl';
import { STAGE_DASHBOARD_CONFIG } from './stage.config.ts';
import { stageInputState } from './stageInput.ts';

interface DashboardWebGLStageProps {
  role?: 'main' | 'sub';
}

export interface DashboardDebugGeometry {
  headUnitScreenPx: number;
  headTopLeftScreenPx: [number, number];
  headBoxScreenPx: { x: number; y: number; width: number; height: number };
  neckBaseScreenPx: [number, number];
  neckTopScreenPx: [number, number];
  throatBotScreenPx: [number, number];
  hornBaseScreenPx: [number, number];
  hornTipScreenPx: [number, number];
  jawTipScreenPx: [number, number];
}

export interface DashboardTelemetrySnapshot {
  eyeScreenUv: [number, number];
  orbScreenUv: [number, number];
  eyeScreenPx: [number, number];
  orbScreenPx: [number, number];
  sightLineStartPx: [number, number];
  sightLineEndPx: [number, number];
  pupilOffsetWorld: [number, number];
  headOffsetWorld: [number, number];
  headRotationDeg: number;
  headScale: number;
  jawAngleDeg: number;
  faceDistanceNorm: number;
  minFaceDistanceNorm: number;
  pointerActive: boolean;
  revealP: number;
  gpuMemoryBytes: number;
  currentProfile: PresenceBehaviorProfile;
  targetStatus: DiscordStatusType;
  transitionProgress: number;
  debugGeometry?: DashboardDebugGeometry;
}

declare global {
  interface Window {
    __DASHBOARD_TELEMETRY__?: DashboardTelemetrySnapshot;
    __EVA_META__?: typeof EVA_META;
  }
}

interface SpringState1D {
  value: number;
  velocity: number;
}

function stepSpring1D(
  state: SpringState1D,
  target: number,
  spec: SpringSpec,
  dt: number
): number {
  const safeDt = Math.min(dt, 0.05);
  const force = (target - state.value) * spec.stiffness;
  const accel = force - state.velocity * spec.damping;
  state.velocity += accel * safeDt;
  state.value += state.velocity * safeDt;
  return state.value;
}

function hashStep(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const LAYER_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SCREEN_QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
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
  uniform vec3 uColorRed;

  void main() {
    vec4 tex = texture2D(uTex, vUv);
    float orderVal = texture2D(uOrderTex, vUv).r;
    float edgeMask = uReveal >= 0.99
      ? 1.0
      : (1.0 - smoothstep(uReveal - 0.05, uReveal + 0.01, orderVal * 0.94));

    if (uIsBackground > 0.5) {
      bool isRed = (tex.r - max(tex.g, tex.b)) > 0.18;
      float isInk = step(0.28, 1.0 - tex.r) * edgeMask;
      vec3 col = isRed
        ? mix(uColorPaper, uColorRed, edgeMask)
        : mix(uColorPaper, uColorInk, isInk);
      gl_FragColor = vec4(col, 1.0);
      return;
    }

    float alpha = tex.a * edgeMask;
    if (alpha < 0.05) discard;
    bool isRed = (tex.r - max(tex.g, tex.b)) > 0.18;
    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 col = isRed ? uColorRed : (luma > 0.22 ? uColorPaper : uColorInk);
    gl_FragColor = vec4(col, 1.0);
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
    float dy = (vUv.y - 0.5) / max(0.08, uOpenness);
    vec2 sampleUv = vec2(vUv.x, 0.5 + dy);
    if (sampleUv.y < 0.02 || sampleUv.y > 0.98) discard;

    vec4 tex = texture2D(uTex, sampleUv);
    float revealGate = smoothstep(0.86, 0.94, uReveal);
    float alpha = tex.a * revealGate;
    if (alpha < 0.08) discard;

    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 baseCol = luma > 0.22 ? uColorPaper : uColorInk;
    if (uBlackout > 0.01 && luma > 0.22) {
      baseCol = mix(baseCol, uColorInk, step(0.5, uBlackout));
    }
    if (uFlash > 0.05 && luma > 0.22) {
      baseCol = mix(baseCol, uColorRed, step(0.55, uFlash));
    }
    gl_FragColor = vec4(baseCol, 1.0);
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

    bool isRedPixel = (tex.r - max(tex.g, tex.b)) > 0.18;
    float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 col = uColorInk;
    if (isRedPixel) {
      col = uShowGlint > 0.5 ? uColorRed : uColorInk;
    } else if (luma > 0.35) {
      col = uColorPaper;
    }
    gl_FragColor = vec4(col, 1.0);
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
    vec2 loopUv = vec2(vUv.x, fract(vUv.y - uTime * 0.035));
    float zoneMask = smoothstep(0.05, 0.12, vUv.y) * (1.0 - smoothstep(0.92, 0.99, vUv.y));
    vec4 tex = texture2D(uTex, loopUv);
    float alpha = tex.a * revealGate * zoneMask;
    if (alpha < 0.12) discard;
    gl_FragColor = vec4(uColorInk, 1.0);
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

    if (uDndBar > 0.5 && abs(p.y) < 0.048 && abs(p.x) < 0.30) {
      gl_FragColor = vec4(uColorInk, 1.0);
      return;
    }

    bool isInkHatch = inkSample.a > 0.35 && inkSample.r < 0.18 && inkSample.g < 0.18;
    bool isRedPlate = (redSample.r - max(redSample.g, redSample.b)) > 0.18 && redSample.a > 0.2;

    if (isInkHatch) {
      gl_FragColor = vec4(uColorInk, 1.0);
    } else if (isRedPlate) {
      gl_FragColor = vec4(uColorRed, 1.0);
    } else if (inkSample.a > 0.35) {
      gl_FragColor = vec4(uColorRed, 1.0);
    } else {
      discard;
    }
  }
`;

function createDummyPaperTex(): THREE.DataTexture {
  const data = new Uint8Array([250, 250, 248, 255]);
  const tex = new THREE.DataTexture(data, 1, 1);
  tex.needsUpdate = true;
  return tex;
}

const P_SIZE = EVA_CONFIG.planeWorldSize;
const PIVOT_CHEST = hToPlaneWorld(EVA_SKELETON.joints.chestCropCenter, P_SIZE);
const PIVOT_NECK = hToPlaneWorld(EVA_SKELETON.joints.neckBase, P_SIZE);
const PIVOT_HEAD = hToPlaneWorld(EVA_SKELETON.joints.neckTop, P_SIZE);
const PIVOT_JAW = hToPlaneWorld(EVA_SKELETON.joints.jawHinge, P_SIZE);
const PIVOT_EYE = hToPlaneWorld(EVA_SKELETON.joints.eyeCenter, P_SIZE);

export const DashboardWebGLStage: React.FC<DashboardWebGLStageProps> = ({
  role = 'main',
}) => {
  const { gl, camera, size } = useThree();
  const [, setArtTick] = useState(0);

  const stageGroupRef = useRef<THREE.Group | null>(null);
  const bgMeshRef = useRef<THREE.Mesh | null>(null);
  const bgMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const torsoMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const neckMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const headMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const jawMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const eyeMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const pupilMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const dripsMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const orbMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const sightLineMatRef = useRef<THREE.ShaderMaterial | null>(null);

  const rigRootGroupRef = useRef<THREE.Group | null>(null);
  const torsoGroupRef = useRef<THREE.Group | null>(null);
  const neckGroupRef = useRef<THREE.Group | null>(null);
  const headGroupRef = useRef<THREE.Group | null>(null);
  const jawGroupRef = useRef<THREE.Group | null>(null);
  const eyeWorldGroupRef = useRef<THREE.Group | null>(null);
  const pupilMeshRef = useRef<THREE.Mesh | null>(null);
  const orbGroupRef = useRef<THREE.Group | null>(null);

  const revealStartRef = useRef<number | null>(null);
  const prevRouteRef = useRef<string>('/');

  const springsRef = useRef({
    pupilX: { value: 0, velocity: 0 } as SpringState1D,
    pupilY: { value: 0, velocity: 0 } as SpringState1D,
    headX: { value: 0, velocity: 0 } as SpringState1D,
    headY: { value: 0, velocity: 0 } as SpringState1D,
    headRotDeg: { value: 0, velocity: 0 } as SpringState1D,
    headScale: { value: 1, velocity: 0 } as SpringState1D,
    jawDeg: { value: 0, velocity: 0 } as SpringState1D,
  });

  const presenceTransitionRef = useRef<{
    fromProfile: PresenceBehaviorProfile;
    toProfile: PresenceBehaviorProfile;
    currentProfile: PresenceBehaviorProfile;
    startTime: number;
    lastKey: string;
  }>({
    fromProfile: PRESENCE_BEHAVIOR_PROFILES.online,
    toProfile: PRESENCE_BEHAVIOR_PROFILES.online,
    currentProfile: PRESENCE_BEHAVIOR_PROFILES.online,
    startTime: 0,
    lastKey: 'online:false',
  });

  const tempVec3 = useMemo(() => new THREE.Vector3(), []);
  const tempOrbWorldVec = useMemo(() => new THREE.Vector3(), []);
  const dummyTex = useMemo(() => createDummyPaperTex(), []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__EVA_META__ = EVA_META;
    }
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
    uColorRed: { value: new THREE.Vector3(...THEME_VEC3.red) },
  });

  const bgUniforms = useMemo(() => makeRevealUniforms(true), [dummyTex]);
  const torsoUniforms = useMemo(() => makeRevealUniforms(false), [dummyTex]);
  const neckUniforms = useMemo(() => makeRevealUniforms(false), [dummyTex]);
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

  const sightLineUniforms = useMemo(
    () => ({
      uEyeUv: { value: new THREE.Vector2(0.32, 0.42) },
      uOrbUv: { value: new THREE.Vector2(0.60, 0.39) },
      uResolution: { value: new THREE.Vector2(1440, 900) },
      uTime: { value: 0.0 },
      uReveal: { value: 1.0 },
      uActiveAlpha: { value: 1.0 },
      uColorInk: { value: new THREE.Vector3(...THEME_VEC3.ink) },
      uColorRed: { value: new THREE.Vector3(...THEME_VEC3.red) },
    }),
    []
  );

  useFrame((state, delta) => {
    const store = useAppStore.getState();
    const rt = store.routeTransition;

    let visible = false;
    if (role === 'main') {
      visible =
        (store.activeRoute === '/dashboard' && !rt.active) ||
        (rt.active && rt.direction === 'to-home');
    } else {
      visible = rt.active && rt.direction === 'to-dashboard';
    }

    if (stageGroupRef.current) {
      stageGroupRef.current.visible = visible;
    }

    if (!visible) {
      if (role === 'main' && store.activeRoute === '/' && !rt.active && prevRouteRef.current === '/dashboard') {
        disposeEvaGpuTextures();
        prevRouteRef.current = '/';
        revealStartRef.current = null;
      }
      return;
    }

    void ensureEvaArtBitmaps(store.isMobile, STAGE_DASHBOARD_CONFIG.eva.eyeGlint);
    const gpuBundle = getOrUploadEvaGpuBundle(gl);

    const t = state.clock.elapsedTime;
    if (role === 'main' && store.activeRoute === '/dashboard' && prevRouteRef.current !== '/dashboard') {
      prevRouteRef.current = '/dashboard';
      revealStartRef.current = null;
      store.setDashboardRevealP(store.reducedMotion ? 1 : 0);
    }

    if (role === 'main' && gpuBundle && revealStartRef.current === null) {
      revealStartRef.current = t;
    }

    let revealP = store.dashboardRevealP;
    if (role === 'main' && store.activeRoute === '/dashboard') {
      if (!gpuBundle) {
        revealP = 0.0;
      } else if (store.reducedMotion) {
        revealP = 1.0;
      } else if (revealStartRef.current !== null) {
        revealP = clamp((t - revealStartRef.current) / 1.2, 0, 1);
      }
      if (Math.abs(revealP - store.dashboardRevealP) > 0.004) {
        store.setDashboardRevealP(revealP);
      }
    } else if (role === 'sub') {
      revealP = 1.0;
    }

    const pKey = `${store.discord.status}:${store.discord.unreachable}`;
    const pState = presenceTransitionRef.current;
    if (pKey !== pState.lastKey) {
      pState.fromProfile = { ...pState.currentProfile };
      pState.toProfile = resolveTargetPresenceProfile(
        store.discord.status,
        store.discord.unreachable
      );
      pState.startTime = t;
      pState.lastKey = pKey;
    }
    const transElapsed = t - pState.startTime;
    const transP = store.reducedMotion
      ? 1.0
      : clamp(transElapsed / PRESENCE_TRANSITION_DURATION_SEC, 0, 1);
    const profile = interpolatePresenceProfiles(
      pState.fromProfile,
      pState.toProfile,
      transP
    );
    pState.currentProfile = profile;

    const isMob = size.width < 768;
    const activeOrbRegion = isMob
      ? STAGE_DASHBOARD_CONFIG.mobileOrbRegion
      : STAGE_DASHBOARD_CONFIG.orbRegion;
    const faceCenter = isMob
      ? STAGE_DASHBOARD_CONFIG.mobileFaceCenterPos
      : STAGE_DASHBOARD_CONFIG.faceCenterPos;
    const minFaceDist = isMob
      ? STAGE_DASHBOARD_CONFIG.orb.mobileMinFaceDistance
      : STAGE_DASHBOARD_CONFIG.orb.minFaceDistance;

    const regionCenterU = (activeOrbRegion.x[0] + activeOrbRegion.x[1]) * 0.5;
    const regionCenterV = (activeOrbRegion.y[0] + activeOrbRegion.y[1]) * 0.5;

    const liss = STAGE_DASHBOARD_CONFIG.orb.lissajous;
    const driftTime = store.reducedMotion ? 0 : t * Math.max(0.2, profile.orbPulseSpeed);
    const lissU = clamp(
      regionCenterU + Math.sin(driftTime * liss.freqX + liss.phaseDelta) * liss.ampX,
      activeOrbRegion.x[0],
      activeOrbRegion.x[1]
    );
    const lissV = clamp(
      regionCenterV + Math.sin(driftTime * liss.freqY) * liss.ampY,
      activeOrbRegion.y[0],
      activeOrbRegion.y[1]
    );

    let desiredU = lerp(lissU, regionCenterU, profile.orbParkAtCenter);
    let desiredV = lerp(lissV, regionCenterV, profile.orbParkAtCenter);

    if (stageInputState.pointerActive && profile.pointerAttraction > 0.05) {
      desiredU = lerp(desiredU, stageInputState.pointerUv[0], profile.pointerAttraction);
      desiredV = lerp(desiredV, stageInputState.pointerUv[1], profile.pointerAttraction);
    } else if (stageInputState.keyboardActive && profile.pointerAttraction > 0.05) {
      desiredU = stageInputState.keyboardUv[0];
      desiredV = stageInputState.keyboardUv[1];
    }

    const fdx = desiredU - faceCenter[0];
    const fdy = desiredV - faceCenter[1];
    const fDist = Math.hypot(fdx, fdy);
    if (fDist < minFaceDist) {
      const safeDirX = fDist < 0.001 ? 1.0 : fdx / fDist;
      const safeDirY = fDist < 0.001 ? 0.0 : fdy / fDist;
      desiredU = faceCenter[0] + safeDirX * minFaceDist;
      desiredV = faceCenter[1] + safeDirY * minFaceDist;
    }

    const [prevOrbU, prevOrbV] = store.dashboardOrbUv;
    const followSpeed =
      STAGE_DASHBOARD_CONFIG.orb.pointerFollowSmoothing *
      (stageInputState.pointerDown ? STAGE_DASHBOARD_CONFIG.orb.pointerDownMultiplier : 1.0);
    const smoothAlpha = stageInputState.keyboardActive
      ? 0.45
      : clamp(followSpeed * (delta * 60), 0.02, 0.65);

    let nextOrbU = lerp(prevOrbU, desiredU, smoothAlpha);
    let nextOrbV = lerp(prevOrbV, desiredV, smoothAlpha);

    const curFdx = nextOrbU - faceCenter[0];
    const curFdy = nextOrbV - faceCenter[1];
    const curFDist = Math.hypot(curFdx, curFdy);
    if (curFDist < minFaceDist) {
      const safeDirX = curFDist < 0.001 ? 1.0 : curFdx / curFDist;
      const safeDirY = curFDist < 0.001 ? 0.0 : curFdy / curFDist;
      nextOrbU = faceCenter[0] + safeDirX * minFaceDist;
      nextOrbV = faceCenter[1] + safeDirY * minFaceDist;
    }

    if (role === 'main') {
      store.setDashboardOrbUv([nextOrbU, nextOrbV]);
    }

    const persp = camera as THREE.PerspectiveCamera;
    const camZ = persp.position.z || 4.8;
    const fovRad = THREE.MathUtils.degToRad((persp.fov || 50) * 0.5);
    const aspect = persp.aspect || size.width / Math.max(1, size.height);
    const vHAtZero = 2 * Math.tan(fovRad) * camZ;
    const vWAtZero = vHAtZero * aspect;

    if (bgMeshRef.current) {
      const camDistBg = Math.abs(camZ - (-2.0));
      const vHAtBg = 2 * Math.tan(fovRad) * camDistBg;
      const vWAtBg = vHAtBg * aspect;
      bgMeshRef.current.position.set(0, persp.position.y, -2.0);
      bgMeshRef.current.scale.set(vWAtBg * 1.02, vHAtBg * 1.02, 1);
    }

    if (rigRootGroupRef.current) {
      if (isMob) {
        const mobStageWorldH = vHAtZero * 0.42;
        const desiredHWorld = mobStageWorldH / EVA_PROPORTIONS.visibleHeads;
        const rigScale = desiredHWorld / EVA_CONFIG.headUnitWorld;
        const bottomWorldY = persp.position.y + vHAtZero * (0.5 - 0.44);
        const leftWorldX = -vWAtZero * 0.5;
        rigRootGroupRef.current.scale.set(rigScale, rigScale, 1);
        rigRootGroupRef.current.position.set(
          leftWorldX + P_SIZE * 0.5 * rigScale - 0.04 * desiredHWorld,
          bottomWorldY + P_SIZE * 0.5 * rigScale - 0.04 * desiredHWorld,
          0
        );
      } else {
        // Desktop: bust spans ~84% of stage height so horn tip stays cleanly inside the top frame
        const desktopStageWorldH = vHAtZero * 0.84;
        const desiredHWorld = desktopStageWorldH / EVA_PROPORTIONS.visibleHeads;
        const rigScale = desiredHWorld / EVA_CONFIG.headUnitWorld;
        const bottomWorldY = persp.position.y - vHAtZero * 0.5;
        const leftWorldX = -vWAtZero * 0.5;
        rigRootGroupRef.current.scale.set(rigScale, rigScale, 1);
        rigRootGroupRef.current.position.set(
          leftWorldX + P_SIZE * 0.5 * rigScale - 0.04 * desiredHWorld,
          bottomWorldY + P_SIZE * 0.5 * rigScale - 0.04 * desiredHWorld,
          0
        );
      }
    }

    const baseEyeUv = isMob
      ? STAGE_DASHBOARD_CONFIG.mobileEyeScreenPos
      : STAGE_DASHBOARD_CONFIG.eyeScreenPos;
    const gazeDx = nextOrbU - baseEyeUv[0];
    const gazeDy = nextOrbV - baseEyeUv[1];
    const gazeDist = Math.hypot(gazeDx, gazeDy);
    const gazeDirX = gazeDx / Math.max(0.001, gazeDist);
    const gazeDirY = gazeDy / Math.max(0.001, gazeDist);

    const [proxNear, proxFar] = EVA_CONFIG.jawProximityRange;
    const proximity = 1.0 - clamp((gazeDist - proxNear) / (proxFar - proxNear), 0, 1);

    const maxPupilSlide = EVA_CONFIG.pupilMaxSlideFraction * EVA_CONFIG.eyeWorldRadius;
    const reachFactor = clamp(gazeDist / 0.36, 0, 1) * profile.trackingGain;
    const targetPupilX = gazeDirX * maxPupilSlide * reachFactor;
    const targetPupilY = -gazeDirY * maxPupilSlide * reachFactor;

    const maxHeadTrans = EVA_CONFIG.headMaxTranslateFraction * EVA_CONFIG.headWorldWidth;
    const targetHeadX = gazeDirX * maxHeadTrans * reachFactor;
    const targetHeadY = -gazeDirY * maxHeadTrans * 0.7 * reachFactor;

    const normalizedPitchSignal = clamp(-gazeDy * 1.65 + (gazeDx - 0.25) * 0.35, -1, 1);
    const gazePitchDeg =
      normalizedPitchSignal * EVA_CONFIG.headMaxRotationDeg * profile.trackingGain;
    const targetHeadRotDeg = gazePitchDeg + profile.headDroopDeg;

    const targetHeadScale =
      1.0 + (proximity - 0.45) * 2.0 * EVA_CONFIG.headMaxScaleDelta * profile.trackingGain;

    const activeJawFraction = clamp(
      profile.jawBase + proximity * profile.jawProximityGain,
      0,
      1
    );
    const targetJawDeg =
      profile.trackingGain < 0.05 && profile.jawBase < 0.02
        ? 0.0
        : lerp(EVA_CONFIG.jawMinDeg, EVA_CONFIG.jawMaxDeg, activeJawFraction);

    const dtSpring = delta * Math.max(0.25, profile.trackingSpeedMultiplier);
    const sp = springsRef.current;
    const curPupilX = stepSpring1D(sp.pupilX, targetPupilX, EVA_CONFIG.springs.pupil, dtSpring);
    const curPupilY = stepSpring1D(sp.pupilY, targetPupilY, EVA_CONFIG.springs.pupil, dtSpring);
    const curHeadX = stepSpring1D(sp.headX, targetHeadX, EVA_CONFIG.springs.head, dtSpring);
    const curHeadY = stepSpring1D(sp.headY, targetHeadY, EVA_CONFIG.springs.head, dtSpring);
    const curHeadRotDeg = stepSpring1D(
      sp.headRotDeg,
      targetHeadRotDeg,
      EVA_CONFIG.springs.head,
      dtSpring
    );
    const curHeadScale = stepSpring1D(
      sp.headScale,
      targetHeadScale,
      EVA_CONFIG.springs.head,
      dtSpring
    );
    const curJawDeg = stepSpring1D(sp.jawDeg, targetJawDeg, EVA_CONFIG.springs.jaw, dtSpring);

    const qTick = Math.floor(t * EVA_CONFIG.jitterFps);
    const jitterActive = store.reducedMotion ? 0 : profile.jitterScale;
    const microTwitchDeg =
      hashStep(qTick * 3.17) * EVA_CONFIG.headMicroTwitchDeg * jitterActive;

    const jawOpenNorm = clamp(
      (curJawDeg - EVA_CONFIG.jawMinDeg) / (EVA_CONFIG.jawMaxDeg - EVA_CONFIG.jawMinDeg),
      0,
      1
    );
    const jawShakeAmp =
      jawOpenNorm > EVA_CONFIG.openJawShakeThreshold
        ? (EVA_CONFIG.openJawShakePx / Math.max(400, size.height)) * 5.0 * jitterActive
        : 0;
    const jawShakeX = hashStep(qTick * 5.71) * jawShakeAmp;
    const jawShakeY = hashStep(qTick * 7.13) * jawShakeAmp;

    const breathe = store.reducedMotion
      ? 0
      : Math.sin(t * EVA_CONFIG.breathingFreqRad) * EVA_CONFIG.breathingScaleAmp;

    if (torsoGroupRef.current) {
      torsoGroupRef.current.position.set(PIVOT_CHEST[0], PIVOT_CHEST[1], 0);
      torsoGroupRef.current.scale.set(1 + breathe * 0.4, 1 + breathe, 1);
    }

    if (neckGroupRef.current) {
      neckGroupRef.current.position.set(
        PIVOT_NECK[0] - PIVOT_CHEST[0],
        PIVOT_NECK[1] - PIVOT_CHEST[1],
        0.01
      );
      neckGroupRef.current.rotation.z = THREE.MathUtils.degToRad(curHeadRotDeg * 0.28);
    }

    if (headGroupRef.current) {
      headGroupRef.current.position.set(
        PIVOT_HEAD[0] - PIVOT_CHEST[0] + curHeadX,
        PIVOT_HEAD[1] - PIVOT_CHEST[1] + curHeadY,
        0.03
      );
      headGroupRef.current.rotation.z = THREE.MathUtils.degToRad(
        curHeadRotDeg + microTwitchDeg
      );
      headGroupRef.current.scale.set(curHeadScale, curHeadScale, 1);
    }

    if (jawGroupRef.current) {
      jawGroupRef.current.position.set(
        PIVOT_JAW[0] - PIVOT_HEAD[0] + jawShakeX,
        PIVOT_JAW[1] - PIVOT_HEAD[1] + jawShakeY,
        0.01
      );
      jawGroupRef.current.rotation.z = THREE.MathUtils.degToRad(-curJawDeg * 0.15);
    }

    if (pupilMeshRef.current) {
      pupilMeshRef.current.position.set(curPupilX, curPupilY, 0.01);
    }

    const camDist = Math.abs(camZ - 0.12);
    const vH = 2 * Math.tan(THREE.MathUtils.degToRad((persp.fov || 50) * 0.5)) * camDist;
    const vW = vH * (persp.aspect || size.width / Math.max(1, size.height));

    const dropEase = smoothstepJS(0.84, 1.0, revealP);
    const dropYOffset = (1 - dropEase) * 0.55;

    if (orbGroupRef.current) {
      const worldX = (nextOrbU - 0.5) * vW;
      const worldY = (0.5 - nextOrbV) * vH + persp.position.y + dropYOffset;
      orbGroupRef.current.position.set(worldX, worldY, 0.12);
      const pulseScale =
        store.reducedMotion || profile.orbPulseSpeed < 0.05
          ? 1.0
          : 1.0 + Math.sin(t * 3.2 * profile.orbPulseSpeed) * 0.035;
      orbGroupRef.current.scale.set(pulseScale, pulseScale, 1);
    }

    if (stageGroupRef.current) {
      stageGroupRef.current.updateMatrixWorld(true);
    }

    let projectedEyeUv: [number, number] = [...baseEyeUv];
    let projectedOrbUv: [number, number] = [nextOrbU, nextOrbV];

    if (eyeWorldGroupRef.current) {
      eyeWorldGroupRef.current.getWorldPosition(tempVec3);
      tempVec3.project(camera);
      projectedEyeUv = [
        clamp((tempVec3.x + 1) * 0.5, 0.01, 0.99),
        clamp((1 - tempVec3.y) * 0.5, 0.01, 0.99),
      ];
    }
    if (orbGroupRef.current) {
      orbGroupRef.current.getWorldPosition(tempOrbWorldVec);
      tempOrbWorldVec.project(camera);
      projectedOrbUv = [
        clamp((tempOrbWorldVec.x + 1) * 0.5, 0.01, 0.99),
        clamp((1 - tempOrbWorldVec.y) * 0.5, 0.01, 0.99),
      ];
    }

    if (gpuBundle) {
      const bindRevealLayer = (
        mat: THREE.ShaderMaterial | null,
        tex: THREE.Texture,
        orderTex: THREE.Texture,
        rev = revealP
      ) => {
        if (!mat) return;
        mat.uniforms.uTex.value = tex;
        mat.uniforms.uOrderTex.value = orderTex;
        mat.uniforms.uReveal.value = rev;
      };

      bindRevealLayer(
        bgMatRef.current,
        gpuBundle.backgroundTex,
        gpuBundle.backgroundOrderTex,
        Math.max(0.25, revealP)
      );
      bindRevealLayer(torsoMatRef.current, gpuBundle.torsoTex, gpuBundle.torsoOrderTex);
      bindRevealLayer(neckMatRef.current, gpuBundle.neckTex, gpuBundle.neckOrderTex);
      bindRevealLayer(headMatRef.current, gpuBundle.headTex, gpuBundle.headOrderTex);
      bindRevealLayer(jawMatRef.current, gpuBundle.jawTex, gpuBundle.jawOrderTex);

      if (eyeMatRef.current) {
        eyeMatRef.current.uniforms.uTex.value = gpuBundle.eyeTex;
        eyeMatRef.current.uniforms.uReveal.value = revealP;
        eyeMatRef.current.uniforms.uOpenness.value = profile.eyeOpenness;
        eyeMatRef.current.uniforms.uBlackout.value = profile.eyeBlackout;
        const flashWindow =
          revealP > 0.9 && revealP < 0.99 ? Math.sin(((revealP - 0.9) / 0.09) * Math.PI) : 0.0;
        eyeMatRef.current.uniforms.uFlash.value = flashWindow;
      }
      if (pupilMatRef.current) {
        pupilMatRef.current.uniforms.uTex.value = gpuBundle.pupilTex;
        pupilMatRef.current.uniforms.uReveal.value = revealP;
        pupilMatRef.current.uniforms.uOpenness.value = profile.eyeOpenness;
        pupilMatRef.current.uniforms.uBlackout.value = profile.eyeBlackout;
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
        orbMatRef.current.uniforms.uRippleAmount.value = store.reducedMotion
          ? 0.0
          : profile.orbPulseSpeed;
        orbMatRef.current.uniforms.uHollowRing.value = profile.orbHollowRing;
        orbMatRef.current.uniforms.uDndBar.value = profile.orbDndBar;
      }
    }

    if (sightLineMatRef.current) {
      sightLineMatRef.current.uniforms.uEyeUv.value.set(
        projectedEyeUv[0],
        projectedEyeUv[1]
      );
      sightLineMatRef.current.uniforms.uOrbUv.value.set(
        projectedOrbUv[0],
        projectedOrbUv[1]
      );
      sightLineMatRef.current.uniforms.uResolution.value.set(size.width, size.height);
      sightLineMatRef.current.uniforms.uTime.value = store.reducedMotion ? 0 : t;
      sightLineMatRef.current.uniforms.uReveal.value = revealP;
      sightLineMatRef.current.uniforms.uActiveAlpha.value = Math.max(
        0.25,
        1.0 - profile.orbHollowRing * 0.7
      );
    }

    if (role === 'main' && typeof window !== 'undefined' && rigRootGroupRef.current) {
      const projectSkeletonPointToScreenPx = (ptH: PointH): [number, number] => {
        const [lx, ly] = hToPlaneWorld(ptH, P_SIZE);
        tempVec3.set(lx, ly, 0);
        rigRootGroupRef.current!.localToWorld(tempVec3);
        tempVec3.project(camera);
        return [
          ((tempVec3.x + 1) * 0.5) * size.width,
          ((1 - tempVec3.y) * 0.5) * size.height,
        ];
      };

      const { headBoxH, joints } = EVA_SKELETON;
      const headTL = projectSkeletonPointToScreenPx([headBoxH.xMinH, headBoxH.yMinH]);
      const headBR = projectSkeletonPointToScreenPx([headBoxH.xMaxH, headBoxH.yMaxH]);
      const headUnitScreenPx = Math.abs(headBR[1] - headTL[1]);

      const eyePx: [number, number] = [
        projectedEyeUv[0] * size.width,
        projectedEyeUv[1] * size.height,
      ];
      const orbPx: [number, number] = [
        projectedOrbUv[0] * size.width,
        projectedOrbUv[1] * size.height,
      ];

      window.__DASHBOARD_TELEMETRY__ = {
        eyeScreenUv: projectedEyeUv,
        orbScreenUv: projectedOrbUv,
        eyeScreenPx: eyePx,
        orbScreenPx: orbPx,
        sightLineStartPx: eyePx,
        sightLineEndPx: orbPx,
        pupilOffsetWorld: [curPupilX, curPupilY],
        headOffsetWorld: [curHeadX, curHeadY],
        headRotationDeg: curHeadRotDeg,
        headScale: curHeadScale,
        jawAngleDeg: curJawDeg,
        faceDistanceNorm: Math.hypot(
          nextOrbU - faceCenter[0],
          nextOrbV - faceCenter[1]
        ),
        minFaceDistanceNorm: minFaceDist,
        pointerActive: stageInputState.pointerActive,
        revealP,
        gpuMemoryBytes: getEvaMemoryUsageBytes(),
        currentProfile: { ...profile },
        targetStatus: store.discord.unreachable ? 'offline' : store.discord.status,
        transitionProgress: transP,
        debugGeometry: {
          headUnitScreenPx,
          headTopLeftScreenPx: headTL,
          headBoxScreenPx: {
            x: headTL[0],
            y: headTL[1],
            width: Math.abs(headBR[0] - headTL[0]),
            height: headUnitScreenPx,
          },
          neckBaseScreenPx: projectSkeletonPointToScreenPx(joints.neckBase),
          neckTopScreenPx: projectSkeletonPointToScreenPx(joints.neckTop),
          throatBotScreenPx: projectSkeletonPointToScreenPx(joints.throatBot),
          hornBaseScreenPx: projectSkeletonPointToScreenPx(joints.hornBase),
          hornTipScreenPx: projectSkeletonPointToScreenPx(joints.hornTip),
          jawTipScreenPx: projectSkeletonPointToScreenPx(joints.jawTip),
        },
      };
    }
  });

  return (
    <group ref={stageGroupRef} name={`dashboard-webgl-stage-${role}`} visible={false}>
      <mesh ref={bgMeshRef} position={[0, 0, -2.0]} renderOrder={0}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={bgMatRef}
          vertexShader={LAYER_VERT}
          fragmentShader={EVA_REVEAL_FRAG}
          uniforms={bgUniforms}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <group ref={rigRootGroupRef}>
        <group ref={torsoGroupRef} position={[PIVOT_CHEST[0], PIVOT_CHEST[1], 0]}>
          <mesh position={[-PIVOT_CHEST[0], -PIVOT_CHEST[1], 0]} renderOrder={1}>
            <planeGeometry args={[P_SIZE, P_SIZE]} />
            <shaderMaterial
              ref={torsoMatRef}
              vertexShader={LAYER_VERT}
              fragmentShader={EVA_REVEAL_FRAG}
              uniforms={torsoUniforms}
              transparent
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          <group
            ref={neckGroupRef}
            position={[
              PIVOT_NECK[0] - PIVOT_CHEST[0],
              PIVOT_NECK[1] - PIVOT_CHEST[1],
              0.01,
            ]}
          >
            <mesh position={[-PIVOT_NECK[0], -PIVOT_NECK[1], 0]} renderOrder={2}>
              <planeGeometry args={[P_SIZE, P_SIZE]} />
              <shaderMaterial
                ref={neckMatRef}
                vertexShader={LAYER_VERT}
                fragmentShader={EVA_REVEAL_FRAG}
                uniforms={neckUniforms}
                transparent
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>

          <group
            ref={headGroupRef}
            position={[
              PIVOT_HEAD[0] - PIVOT_CHEST[0],
              PIVOT_HEAD[1] - PIVOT_CHEST[1],
              0.03,
            ]}
          >
            <mesh position={[-PIVOT_HEAD[0], -PIVOT_HEAD[1], 0]} renderOrder={3}>
              <planeGeometry args={[P_SIZE, P_SIZE]} />
              <shaderMaterial
                ref={headMatRef}
                vertexShader={LAYER_VERT}
                fragmentShader={EVA_REVEAL_FRAG}
                uniforms={headUniforms}
                transparent
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>

            <group
              ref={jawGroupRef}
              position={[
                PIVOT_JAW[0] - PIVOT_HEAD[0],
                PIVOT_JAW[1] - PIVOT_HEAD[1],
                0.01,
              ]}
            >
              <mesh position={[-PIVOT_JAW[0], -PIVOT_JAW[1], 0]} renderOrder={4}>
                <planeGeometry args={[P_SIZE, P_SIZE]} />
                <shaderMaterial
                  ref={jawMatRef}
                  vertexShader={LAYER_VERT}
                  fragmentShader={EVA_REVEAL_FRAG}
                  uniforms={jawUniforms}
                  transparent
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>

            <group
              ref={eyeWorldGroupRef}
              position={[
                PIVOT_EYE[0] - PIVOT_HEAD[0],
                PIVOT_EYE[1] - PIVOT_HEAD[1],
                0.02,
              ]}
            >
              <mesh renderOrder={5}>
                <planeGeometry
                  args={[EVA_CONFIG.eyePlaneWorldSize, EVA_CONFIG.eyePlaneWorldSize]}
                />
                <shaderMaterial
                  ref={eyeMatRef}
                  vertexShader={LAYER_VERT}
                  fragmentShader={EVA_EYE_FRAG}
                  uniforms={eyeUniforms}
                  transparent
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
              <mesh ref={pupilMeshRef} position={[0, 0, 0.01]} renderOrder={6}>
                <planeGeometry
                  args={[EVA_CONFIG.pupilPlaneWorldSize, EVA_CONFIG.pupilPlaneWorldSize]}
                />
                <shaderMaterial
                  ref={pupilMatRef}
                  vertexShader={LAYER_VERT}
                  fragmentShader={EVA_PUPIL_FRAG}
                  uniforms={pupilUniforms}
                  transparent
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>

            <mesh position={[-PIVOT_HEAD[0], -PIVOT_HEAD[1], 0.015]} renderOrder={7}>
              <planeGeometry args={[P_SIZE, P_SIZE]} />
              <shaderMaterial
                ref={dripsMatRef}
                vertexShader={LAYER_VERT}
                fragmentShader={EVA_DRIPS_FRAG}
                uniforms={dripsUniforms}
                transparent
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        </group>
      </group>

      <mesh renderOrder={8} frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={sightLineMatRef}
          vertexShader={SCREEN_QUAD_VERT}
          fragmentShader={sightLineFrag}
          uniforms={sightLineUniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <group ref={orbGroupRef} position={[0.6, 0.35, 0.12]}>
        <mesh renderOrder={9}>
          <planeGeometry args={[0.58, 0.58]} />
          <shaderMaterial
            ref={orbMatRef}
            vertexShader={LAYER_VERT}
            fragmentShader={ORB_STAGE_FRAG}
            uniforms={orbUniforms}
            transparent
            depthWrite={false}
            toneMapped={false}
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

void THEME_COLORS;
