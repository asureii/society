/**
 * CINEMATIC INTRO WEBGL STAGE & SHADER (src/scene/intro/introScene.tsx)
 *
 * Renders the procedural hand-inked intro composition ("Machinery is a projection of the mind")
 * inside the single shared WebGL `<Canvas>`:
 * - Generates the 4 offscreen canvas textures (`artTexture`, `orderTexture`, `gridAtlasTexture`,
 *   `spriteSheetTexture`) and pre-uploads them via `renderer.initTexture` + `compileAsync`
 *   during the `loading` phase (`0.0s .. 2.6s`).
 * - Executes the single-clock intro shader:
 *   - 0.0 .. 5.0s (`loading`, `quote`): Full-bleed Sumi black (`#0A0A0A`) behind the DOM emblem & quote.
 *   - 5.0 .. 6.4s (`reveal`): Horizontal ink-edged paper band parts the quote lines while the
 *     infinite grid, mirror, brain, and machine draw themselves in sequentially (`order <= uReveal`).
 *   - 6.4 .. 7.8s (`hold`): Band expands to full screen; live gear rotation, piston reciprocation,
 *     brain 0.8Hz breathing & synapse blinking, infinite grid scroll, and red projection dot run at 60fps.
 *   - 7.8 .. 9.2s (`portal`): Camera pushes into the mirror; the machine's red orb core expands into
 *     the ink-edged Orb Iris reveal directly into Scene 1 (`s1-causeway` Cover) underneath.
 * - Disposes intro GPU textures once `introState === 'done'` (unless debug scrubber is active).
 */

import { useFrame, useThree } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { INTRO_CONFIG } from '../../config/intro';
import { clamp } from '../../lib/math';
import { useAppStore } from '../../store/useAppStore';
import { drawAnatomicalBrain, type BrainDrawMetrics } from './brain';
import { createDrawOrderRecorder } from './drawOrder';
import { generateInfiniteGridAtlas, INFINITE_GRID_GLSL } from './infiniteGrid';
import {
  drawMachineBrainAndProjection,
  generateMachineSpriteSheet,
  type MachineBrainDrawMetrics,
} from './machineBrain';
import { drawStandingMirror, type MirrorDrawMetrics } from './mirror';

interface GeneratedIntroBundle {
  artTexture: THREE.CanvasTexture;
  orderTexture: THREE.CanvasTexture;
  gridAtlasTexture: THREE.CanvasTexture;
  spriteSheetTexture: THREE.CanvasTexture;
  brainMetrics: BrainDrawMetrics;
  mirrorMetrics: MirrorDrawMetrics;
  machineMetrics: MachineBrainDrawMetrics;
  isMobileLayout: boolean;
}

function buildIntroTextures(isMobile: boolean): GeneratedIntroBundle {
  const W = INTRO_CONFIG.budget.artWidth;
  const H = INTRO_CONFIG.budget.artHeight;
  const seed = INTRO_CONFIG.seed;

  const artCanvas = document.createElement('canvas');
  artCanvas.width = W;
  artCanvas.height = H;
  const ctx = artCanvas.getContext('2d');

  const recorder = createDrawOrderRecorder(W, H);

  let brainMetrics: BrainDrawMetrics;
  let mirrorMetrics: MirrorDrawMetrics;
  let machineMetrics: MachineBrainDrawMetrics;

  if (ctx) {
    ctx.clearRect(0, 0, W, H);
    // 1. Standing Mirror (`0.28 .. 0.52`)
    mirrorMetrics = drawStandingMirror(ctx, artCanvas, recorder, seed, isMobile);
    // 2. Anatomical Brain (`0.52 .. 0.76`)
    brainMetrics = drawAnatomicalBrain(ctx, artCanvas, recorder, seed, isMobile);
    // 3. Machine Brain Reflection & Dotted Projection Arc (`0.76 .. 1.00`)
    machineMetrics = drawMachineBrainAndProjection(
      ctx,
      artCanvas,
      recorder,
      brainMetrics,
      mirrorMetrics,
      seed,
    );
  } else {
    brainMetrics = {
      centerPx: { x: W * 0.3, y: H * 0.5 },
      projectionOriginPx: { x: W * 0.42, y: H * 0.48 },
      synapseUvPoints: [[0.3, 0.5]],
    };
    mirrorMetrics = {
      glassPoly: [
        [W * 0.55, H * 0.25],
        [W * 0.8, H * 0.25],
        [W * 0.8, H * 0.75],
        [W * 0.55, H * 0.75],
      ],
      glassCenterPx: { x: W * 0.68, y: H * 0.5 },
      machineCorePx: { x: W * 0.68, y: H * 0.48 },
      machineCoreUv: [0.68, 0.52],
      glassHalfSizePx: { rx: W * 0.12, ry: H * 0.22 },
    };
    machineMetrics = {
      orbCoreUv: [0.68, 0.52],
      orbRadiusNormH: 0.025,
      gearPivots: [
        { uv: [0.64, 0.48], radiusNormH: 0.022, angularSpeed: 0.8, cellIndex: 0 },
        { uv: [0.72, 0.49], radiusNormH: 0.019, angularSpeed: -0.95, cellIndex: 1 },
        { uv: [0.68, 0.58], radiusNormH: 0.017, angularSpeed: 1.15, cellIndex: 2 },
      ],
      pistonSpec: { uv: [0.7, 0.38], sizeNormH: [0.028, 0.045] },
      projectionArcUv: [
        [0.42, 0.52],
        [0.55, 0.64],
        [0.68, 0.52],
      ],
    };
  }

  const orderCanvas = recorder.finalizeCanvas();
  const gridAtlasCanvas = generateInfiniteGridAtlas(
    INTRO_CONFIG.budget.gridAtlasWidth,
    INTRO_CONFIG.budget.gridAtlasHeight,
    seed,
  );
  const spriteSheetCanvas = generateMachineSpriteSheet(512, seed);

  const makeTex = (c: HTMLCanvasElement) => {
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  };

  return {
    artTexture: makeTex(artCanvas),
    orderTexture: makeTex(orderCanvas),
    gridAtlasTexture: makeTex(gridAtlasCanvas),
    spriteSheetTexture: makeTex(spriteSheetCanvas),
    brainMetrics,
    mirrorMetrics,
    machineMetrics,
    isMobileLayout: isMobile,
  };
}

const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform sampler2D uArtTex;
uniform sampler2D uOrderTex;
uniform sampler2D uGridAtlas;
uniform sampler2D uSpriteSheet;

uniform vec2 uResolution;
uniform float uTime;
uniform float uElapsedSec;
uniform float uReveal;
uniform float uBandHalfHeight;
uniform float uPortalP;
uniform float uCameraPush;
uniform vec2 uMouseOffset;
uniform float uHorizonY;

uniform vec2 uBrainCenterUv;
uniform vec2 uOrbCoreUv;
uniform float uOrbRadiusNormH;

uniform vec3 uGear1; // xy = uv, z = radiusNormH
uniform vec3 uGear2;
uniform vec3 uGear3;
uniform vec4 uPiston; // xy = uv, zw = sizeNormH
uniform vec2 uArcP0;
uniform vec2 uArcP1;
uniform vec2 uArcP2;
uniform float uReducedMotion;

${INFINITE_GRID_GLSL}

// Strict 3-color palette constants:
// Paper: #FAFAF8 (250, 250, 248)
// Pure Paper: #FFFFFF (255, 255, 255)
// Sumi Ink: #0A0A0A (10, 10, 10)
// Signal Red: #D4141C (212, 20, 28)
const vec3 COL_PAPER = vec3(250.0 / 255.0, 250.0 / 255.0, 248.0 / 255.0);
const vec3 COL_PAPER_PURE = vec3(1.0, 1.0, 1.0);
const vec3 COL_INK = vec3(10.0 / 255.0, 10.0 / 255.0, 10.0 / 255.0);
const vec3 COL_RED = vec3(212.0 / 255.0, 20.0 / 255.0, 28.0 / 255.0);

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2D(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * noise2D(p);
    p = p * 2.03 + vec2(17.1, 31.7);
    a *= 0.5;
  }
  return v;
}

/**
 * Samples a rotating gear sprite cell (0, 1, or 2) from the 2x2 spriteSheet.
 */
vec4 sampleGearSprite(vec2 sceneUv, vec2 pivotUv, float radiusNormH, float angle, float cellIdx, float aspect) {
  vec2 d = sceneUv - pivotUv;
  d.x *= aspect;
  float dist = length(d);
  if (dist > radiusNormH) {
    return vec4(0.0);
  }
  float c = cos(angle);
  float s = sin(angle);
  vec2 rot = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
  vec2 localUv = (rot / (radiusNormH * 2.0)) + 0.5;
  localUv = clamp(localUv, 0.02, 0.98);

  float col = mod(cellIdx, 2.0);
  // Note: CanvasTexture has Y=1 at top, so row 0 is y in [0.5, 1.0], row 1 is y in [0.0, 0.5]
  float rowTop = step(1.5, cellIdx); // 0 for cells 0,1; 1 for cell 2
  vec2 sheetUv = vec2(
    (col + localUv.x) * 0.5,
    (1.0 - rowTop - (1.0 - localUv.y)) * 0.5 + (1.0 - rowTop) * 0.5
  );
  return texture2D(uSpriteSheet, sheetUv);
}

void main() {
  float aspect = uResolution.x / max(1.0, uResolution.y);

  // ---------------------------------------------------------------------------
  // 1. PORTAL ORB IRIS REVEAL INTO SCENE 1 COVER (7.8s .. 9.2s or fast skip)
  // ---------------------------------------------------------------------------
  if (uPortalP > 0.0001) {
    vec2 dPortal = vUv - uOrbCoreUv;
    dPortal.x *= aspect;
    float distPortal = length(dPortal);

    float angle = atan(dPortal.y, dPortal.x);
    vec2 nCoord = vec2(cos(angle), sin(angle)) * 2.8 + vec2(12.3, 45.6);
    float edgeNoise = (fbm2D(nCoord) - 0.5) * 0.045 * (1.0 - uPortalP * 0.5);

    float maxDiag = length(vec2(aspect, 1.0)) * 1.18;
    float baseOrbR = uOrbRadiusNormH * (1.0 + uCameraPush * 0.45);
    float easedPortal = uPortalP * uPortalP * (3.0 - 2.0 * uPortalP);
    float irisR = mix(baseOrbR * 0.35, maxDiag, pow(easedPortal, 1.35)) + edgeNoise;

    float rimWidth = mix(0.018, 0.036, sin(uPortalP * 3.14159));
    // Inside the growing Orb Iris: discard so live Scene 1 (s1-causeway) shows underneath!
    if (distPortal < irisR - rimWidth) {
      discard;
    }
    // Ragged black-ink + signal-red iris rim
    if (distPortal < irisR) {
      float rimT = (distPortal - (irisR - rimWidth)) / max(0.0001, rimWidth);
      vec3 rimCol = rimT < 0.36 ? COL_RED : COL_INK;
      gl_FragColor = vec4(rimCol, 1.0);
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // 2. BLACK INK BAND / FULL-BLEED BLACK (0.0s .. 6.8s)
  // ---------------------------------------------------------------------------
  if (uBandHalfHeight <= 0.0005) {
    gl_FragColor = vec4(COL_INK, 1.0);
    return;
  }

  // Horizontal ink-edged paper band centered at vUv.y = 0.50
  if (uBandHalfHeight < 0.54) {
    float bandNoise =
      (fbm2D(vec2(vUv.x * 16.0, 3.7)) - 0.5) * 0.022 +
      (noise2D(vec2(vUv.x * 58.0, 9.1)) - 0.5) * 0.007;
    float distFromCenterY = abs(vUv.y - 0.50) + bandNoise;

    if (distFromCenterY > uBandHalfHeight) {
      gl_FragColor = vec4(COL_INK, 1.0);
      return;
    }
    // Crisp dry-brush ink border along the parting band edge
    if (distFromCenterY > uBandHalfHeight - 0.0045) {
      float bristle = step(0.35, hash21(floor(vec2(vUv.x * 320.0, vUv.y * 180.0))));
      if (bristle > 0.5) {
        gl_FragColor = vec4(COL_INK, 1.0);
        return;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. CAMERA PUSH TOWARD MIRROR & SUBTLE MOUSE PARALLAX
  // ---------------------------------------------------------------------------
  float zoom = 1.0 + uCameraPush * 0.34;
  vec2 sceneUv = (vUv - uOrbCoreUv) / zoom + uOrbCoreUv + uMouseOffset;
  sceneUv = clamp(sceneUv, 0.001, 0.999);

  // Start with warm manga paper (#FAFAF8)
  vec3 finalColor = COL_PAPER;

  // ---------------------------------------------------------------------------
  // 4. INFINITE PERSPECTIVE FLOOR GRID (0.00 .. 0.28 draw order)
  // ---------------------------------------------------------------------------
  float zScroll = uReducedMotion > 0.5 ? 0.0 : uTime * 0.52;
  float gridInk = sampleInfiniteGridInk(sceneUv, uHorizonY, zScroll, uReveal, uGridAtlas);
  if (gridInk > 0.5) {
    finalColor = COL_INK;
  }

  // ---------------------------------------------------------------------------
  // 5. BRAIN BREATHING SCALE PULSE (~0.8 Hz, <= 1%) & ART CANVAS COMPOSITING
  // ---------------------------------------------------------------------------
  vec2 sampleUv = sceneUv;
  float isBrainSide = 1.0 - smoothstep(0.45, 0.51, sceneUv.x);
  if (isBrainSide > 0.01 && uReducedMotion < 0.5) {
    float breath = sin(uTime * 5.0265) * 0.0075 * isBrainSide; // 0.8 Hz, 0.75% scale pulse
    sampleUv = (sceneUv - uBrainCenterUv) / (1.0 + breath) + uBrainCenterUv;
  }

  vec4 artSample = texture2D(uArtTex, sampleUv);
  float orderVal = texture2D(uOrderTex, sampleUv).r;

  // Per-pixel draw-order reveal with ragged ink-bleed leading edge
  float strokeWobble = (noise2D(sampleUv * 65.0) - 0.5) * 0.025;
  float effectiveOrder = orderVal + strokeWobble;

  if (artSample.a > 0.08 && uReveal >= effectiveOrder) {
    // Classify art pixel into strict 3-color + white palette (no mud/grey):
    // Red pixel: high R, low G/B
    bool isRedPixel = (artSample.r > 0.55 && artSample.g < 0.28 && artSample.b < 0.28);
    // Ink pixel: low luminance
    float lum = dot(artSample.rgb, vec3(0.299, 0.587, 0.114));
    if (isRedPixel) {
      finalColor = COL_RED;
    } else if (lum < 0.48) {
      finalColor = COL_INK;
    } else if (lum > 0.985) {
      finalColor = COL_PAPER_PURE;
    } else {
      finalColor = COL_PAPER;
    }

    // Leading-edge ink nib emphasis right as a stroke is being drawn
    if (uReveal < 0.99 && (uReveal - effectiveOrder) < 0.018 && lum < 0.65) {
      finalColor = COL_INK;
    }
  }

  // ---------------------------------------------------------------------------
  // 6. ROTATING GEAR SPRITES & RECIPROCATING PISTON INSIDE THE MIRROR
  // ---------------------------------------------------------------------------
  if (uReveal > 0.86) {
    float animT = uReducedMotion > 0.5 ? 0.0 : uTime;

    // 3 rotating gears inside the mechanical brain reflection
    vec4 g1 = sampleGearSprite(sceneUv, uGear1.xy, uGear1.z, animT * 0.85, 0.0, aspect);
    vec4 g2 = sampleGearSprite(sceneUv, uGear2.xy, uGear2.z, -animT * 1.05, 1.0, aspect);
    vec4 g3 = sampleGearSprite(sceneUv, uGear3.xy, uGear3.z, animT * 1.25, 2.0, aspect);

    vec4 gearComb = g1.a > 0.2 ? g1 : (g2.a > 0.2 ? g2 : g3);
    if (gearComb.a > 0.25) {
      float gLum = dot(gearComb.rgb, vec3(0.299, 0.587, 0.114));
      finalColor = gLum < 0.52 ? COL_INK : COL_PAPER_PURE;
    }

    // Reciprocating vertical piston rod at brainstem position
    float pistonShiftY = sin(animT * 7.5) * 0.0045;
    vec2 pDiff = (sceneUv - (uPiston.xy + vec2(0.0, pistonShiftY))) / uPiston.zw;
    if (abs(pDiff.x) < 0.45 && abs(pDiff.y) < 0.45) {
      vec2 pLocal = pDiff + 0.5;
      // Cell 3 (bottom-right of spriteSheet: x in [0.5, 1.0], y in [0.0, 0.5])
      vec2 pSheetUv = vec2(0.5 + pLocal.x * 0.5, pLocal.y * 0.5);
      vec4 pSample = texture2D(uSpriteSheet, pSheetUv);
      if (pSample.a > 0.25) {
        float pLum = dot(pSample.rgb, vec3(0.299, 0.587, 0.114));
        finalColor = pLum < 0.52 ? COL_INK : COL_PAPER_PURE;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 7. BRAIN SYNAPSE STIPPLE BLINK (Pure Black Ink, Zero Red on Brain)
  // ---------------------------------------------------------------------------
  if (uReveal > 0.72 && isBrainSide > 0.5 && uReducedMotion < 0.5) {
    for (int s = 0; s < 5; s++) {
      float fs = float(s);
      float ang = fs * 1.2566 + 0.4;
      vec2 synUv = uBrainCenterUv + vec2(cos(ang) * 0.055, sin(ang) * 0.065);
      vec2 dSyn = sceneUv - synUv;
      dSyn.x *= aspect;
      float blink = step(0.55, sin(uTime * 4.2 + fs * 1.9));
      if (blink > 0.5 && length(dSyn) < 0.0032) {
        finalColor = COL_INK;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 8. MACHINE RED ORB CORE PULSE & TRAVELING RED PROJECTION DOT
  // ---------------------------------------------------------------------------
  if (uReveal > 0.92) {
    vec2 dOrb = sceneUv - uOrbCoreUv;
    dOrb.x *= aspect;
    float distOrb = length(dOrb);

    float orbPulse = uReducedMotion > 0.5 ? 1.0 : (1.0 + sin(uTime * 3.6) * 0.06);
    float liveOrbR = uOrbRadiusNormH * orbPulse;

    if (distOrb < liveOrbR) {
      finalColor = COL_RED;
    } else if (distOrb < liveOrbR + 0.0024) {
      finalColor = COL_INK;
    }

    // Expanding single-ring red ripple around the machine's orb core
    float ripplePhase = fract(uTime * 0.55);
    float rippleR = mix(liveOrbR * 1.15, liveOrbR * 1.85, ripplePhase);
    float rippleThickness = 0.0018 * (1.0 - ripplePhase * 0.65);
    if (abs(distOrb - rippleR) < rippleThickness) {
      finalColor = COL_RED;
    }

    // Single small red projection dot traveling along the dotted arc from brain to machine core
    float dotT = uReducedMotion > 0.5 ? 0.52 : fract(uTime * 0.68);
    float mt = 1.0 - dotT;
    vec2 dotUv = mt * mt * uArcP0 + 2.0 * mt * dotT * uArcP1 + dotT * dotT * uArcP2;
    vec2 dDot = sceneUv - dotUv;
    dDot.x *= aspect;
    float dotRadius = 0.0052 * (1.0 - smoothstep(0.88, 1.0, dotT));
    if (length(dDot) < dotRadius) {
      finalColor = COL_RED;
    }
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const IntroStage: React.FC = () => {
  const { gl, scene, camera, size } = useThree();
  const introState = useAppStore((s) => s.introState);
  const debugEnabled = useAppStore((s) => s.debugScrubber.enabled);
  const debugMode = useAppStore((s) => s.debugScrubber.mode);

  const isMobile = size.width <= INTRO_CONFIG.layout.mobileBreakpointPx;
  const bundleRef = useRef<GeneratedIntroBundle | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  const fallbackTex = useMemo(() => {
    const data = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < 16; i++) {
      data[i * 4] = 250;
      data[i * 4 + 1] = 250;
      data[i * 4 + 2] = 248;
      data[i * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, 4, 4, THREE.RGBAFormat);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const uniforms = useMemo(
    () => ({
      uArtTex: { value: fallbackTex as THREE.Texture },
      uOrderTex: { value: fallbackTex as THREE.Texture },
      uGridAtlas: { value: fallbackTex as THREE.Texture },
      uSpriteSheet: { value: fallbackTex as THREE.Texture },
      uResolution: { value: new THREE.Vector2(1440, 900) },
      uTime: { value: 0 },
      uElapsedSec: { value: 0 },
      uReveal: { value: 0 },
      uBandHalfHeight: { value: 0 },
      uPortalP: { value: 0 },
      uCameraPush: { value: 0 },
      uMouseOffset: { value: new THREE.Vector2(0, 0) },
      uHorizonY: { value: INTRO_CONFIG.layout.desktop.horizonUvY },
      uBrainCenterUv: { value: new THREE.Vector2(0.3, 0.5) },
      uOrbCoreUv: { value: new THREE.Vector2(0.68, 0.52) },
      uOrbRadiusNormH: { value: 0.024 },
      uGear1: { value: new THREE.Vector3(0.64, 0.48, 0.022) },
      uGear2: { value: new THREE.Vector3(0.72, 0.49, 0.019) },
      uGear3: { value: new THREE.Vector3(0.68, 0.58, 0.017) },
      uPiston: { value: new THREE.Vector4(0.7, 0.38, 0.028, 0.045) },
      uArcP0: { value: new THREE.Vector2(0.42, 0.52) },
      uArcP1: { value: new THREE.Vector2(0.55, 0.64) },
      uArcP2: { value: new THREE.Vector2(0.68, 0.52) },
      uReducedMotion: { value: 0 },
    }),
    [fallbackTex],
  );

  const shouldStayResident =
    introState !== 'done' || (debugEnabled && debugMode === 'intro');

  // Generate procedural intro art & upload textures to GPU during loading phase
  useEffect(() => {
    if (!shouldStayResident) {
      if (bundleRef.current) {
        bundleRef.current.artTexture.dispose();
        bundleRef.current.orderTexture.dispose();
        bundleRef.current.gridAtlasTexture.dispose();
        bundleRef.current.spriteSheetTexture.dispose();
        bundleRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const rafId = requestAnimationFrame(() => {
      if (cancelled) return;
      if (!bundleRef.current || bundleRef.current.isMobileLayout !== isMobile) {
        if (bundleRef.current) {
          bundleRef.current.artTexture.dispose();
          bundleRef.current.orderTexture.dispose();
          bundleRef.current.gridAtlasTexture.dispose();
          bundleRef.current.spriteSheetTexture.dispose();
        }
        const bundle = buildIntroTextures(isMobile);
        bundleRef.current = bundle;

        // Pre-initialize all 4 textures on the GPU so zero upload stutter occurs during reveal/hold
        gl.initTexture(bundle.artTexture);
        gl.initTexture(bundle.orderTexture);
        gl.initTexture(bundle.gridAtlasTexture);
        gl.initTexture(bundle.spriteSheetTexture);

        uniforms.uArtTex.value = bundle.artTexture;
        uniforms.uOrderTex.value = bundle.orderTexture;
        uniforms.uGridAtlas.value = bundle.gridAtlasTexture;
        uniforms.uSpriteSheet.value = bundle.spriteSheetTexture;

        uniforms.uHorizonY.value = isMobile
          ? INTRO_CONFIG.layout.mobile.horizonUvY
          : INTRO_CONFIG.layout.desktop.horizonUvY;

        uniforms.uBrainCenterUv.value.set(
          bundle.brainMetrics.centerPx.x / INTRO_CONFIG.budget.artWidth,
          1 - bundle.brainMetrics.centerPx.y / INTRO_CONFIG.budget.artHeight,
        );
        uniforms.uOrbCoreUv.value.set(
          bundle.machineMetrics.orbCoreUv[0],
          bundle.machineMetrics.orbCoreUv[1],
        );
        uniforms.uOrbRadiusNormH.value = bundle.machineMetrics.orbRadiusNormH;

        const [g1, g2, g3] = bundle.machineMetrics.gearPivots;
        uniforms.uGear1.value.set(g1.uv[0], g1.uv[1], g1.radiusNormH);
        uniforms.uGear2.value.set(g2.uv[0], g2.uv[1], g2.radiusNormH);
        uniforms.uGear3.value.set(g3.uv[0], g3.uv[1], g3.radiusNormH);

        const pSpec = bundle.machineMetrics.pistonSpec;
        uniforms.uPiston.value.set(
          pSpec.uv[0],
          pSpec.uv[1],
          pSpec.sizeNormH[0],
          pSpec.sizeNormH[1],
        );

        const [p0, p1, p2] = bundle.machineMetrics.projectionArcUv;
        uniforms.uArcP0.value.set(p0[0], p0[1]);
        uniforms.uArcP1.value.set(p1[0], p1[1]);
        uniforms.uArcP2.value.set(p2[0], p2[1]);

        if (typeof gl.compileAsync === 'function') {
          gl.compileAsync(scene, camera)
            .catch(() => {})
            .finally(() => {
              useAppStore.getState().setIntroAssetsReady(true);
            });
        } else {
          gl.compile(scene, camera);
          useAppStore.getState().setIntroAssetsReady(true);
        }
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [camera, gl, isMobile, scene, shouldStayResident, uniforms]);

  useFrame((state) => {
    const store = useAppStore.getState();
    const active =
      store.introState !== 'done' ||
      (store.debugScrubber.enabled && store.debugScrubber.mode === 'intro');

    if (meshRef.current) {
      meshRef.current.visible = active;
    }
    if (!active) return;

    const dpr = state.gl.getPixelRatio();
    uniforms.uResolution.value.set(state.size.width * dpr, state.size.height * dpr);
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uReducedMotion.value = store.reducedMotion ? 1.0 : 0.0;

    const elapsed = store.introElapsedSec;
    uniforms.uElapsedSec.value = elapsed;

    const b = INTRO_CONFIG.boundaries;

    // Fast skip override (~0.6s ink-wipe into Cover iris from any phase)
    if (store.isSkippingIntro) {
      const sp = clamp(store.skipProgress, 0, 1);
      uniforms.uBandHalfHeight.value = 0.6;
      uniforms.uReveal.value = 1.0;
      uniforms.uCameraPush.value = sp * 0.5;
      uniforms.uPortalP.value = sp;
      return;
    }

    // Reduced-motion static cross-fade fallback
    if (store.reducedMotion && !store.debugScrubber.enabled) {
      if (elapsed < b.quoteEnd) {
        uniforms.uBandHalfHeight.value = 0.0;
        uniforms.uReveal.value = 0.0;
        uniforms.uPortalP.value = 0.0;
      } else if (elapsed < b.holdEnd) {
        uniforms.uBandHalfHeight.value = 0.6;
        uniforms.uReveal.value = 1.0;
        uniforms.uPortalP.value = 0.0;
      } else {
        const portalP = clamp((elapsed - b.holdEnd) / INTRO_CONFIG.durations.portal, 0, 1);
        uniforms.uBandHalfHeight.value = 0.6;
        uniforms.uReveal.value = 1.0;
        uniforms.uPortalP.value = portalP;
      }
      uniforms.uCameraPush.value = 0.0;
      uniforms.uMouseOffset.value.set(0, 0);
      return;
    }

    // Standard 5-phase single-clock choreography:
    // 1. 0.0 .. 5.0s ('loading' & 'quote'): Full-bleed black
    if (elapsed <= b.quoteEnd) {
      uniforms.uBandHalfHeight.value = 0.0;
      uniforms.uReveal.value = 0.0;
      uniforms.uCameraPush.value = 0.0;
      uniforms.uPortalP.value = 0.0;
    }
    // 2. 5.0 .. 6.4s ('reveal'): Quote lines part vertically, horizontal paper band opens, uReveal 0->1
    else if (elapsed <= b.revealEnd) {
      const revealP = clamp((elapsed - b.quoteEnd) / INTRO_CONFIG.durations.reveal, 0, 1);
      if (revealP <= 0.75) {
        const bandEase = 1 - Math.pow(1 - revealP / 0.75, 2.2);
        // Band opens from 0 to ~34% half-height (~68% total height) as quote lines part
        uniforms.uBandHalfHeight.value = 0.04 + bandEase * 0.30;
      } else {
        const expandP = clamp((revealP - 0.75) / 0.25, 0, 1);
        const expandEase = 1 - Math.pow(1 - expandP, 2.2);
        uniforms.uBandHalfHeight.value = 0.34 + expandEase * 0.24;
      }
      uniforms.uReveal.value = clamp(revealP * 1.06, 0, 1);
      uniforms.uCameraPush.value = revealP * 0.12;
      uniforms.uPortalP.value = 0.0;
    }
    // 3. 6.4 .. 7.8s ('hold'): Full screen paper, 100% drawn, live machine & projection animation
    else if (elapsed <= b.holdEnd) {
      const holdP = clamp((elapsed - b.revealEnd) / INTRO_CONFIG.durations.hold, 0, 1);
      uniforms.uBandHalfHeight.value = 0.6; // >= 0.54 = full-screen paper
      uniforms.uReveal.value = 1.0;
      uniforms.uCameraPush.value = 0.12 + holdP * 0.22;
      uniforms.uPortalP.value = 0.0;
    }
    // 4. 7.8 .. 9.2s ('portal'): Camera pushes into mirror & machine red orb opens Orb Iris into Scene 1 Cover
    else {
      const portalP = clamp((elapsed - b.holdEnd) / INTRO_CONFIG.durations.portal, 0, 1);
      uniforms.uBandHalfHeight.value = 0.6;
      uniforms.uReveal.value = 1.0;
      uniforms.uCameraPush.value = 0.34 + portalP * 0.66;
      uniforms.uPortalP.value = portalP;
    }

    // Subtle mouse parallax (<= 12px equivalent)
    const [mx, my] = store.mouseTarget;
    uniforms.uMouseOffset.value.set(mx * -0.006, my * -0.006);
  });

  if (!shouldStayResident) {
    return null;
  }

  return (
    <mesh ref={meshRef} renderOrder={998} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
};
