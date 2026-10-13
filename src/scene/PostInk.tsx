/**
 * SINGLE-CLOCK ORB IRIS, PANEL SLICE & S7 DOORWAY FINALE COMPOSITOR
 * (src/scene/PostInk.tsx)
 *
 * Implements:
 * 1. Single Clock Consumption:
 *    - Boundary transitions driven strictly by `chapterState.tau` in [0, 1].
 *    - S7 doorway-closing finale driven strictly by `endP` (`uEndProgress`) in [0, 1].
 *    - Seamless rewind reveal driven by `rewindRevealP` in [0, 1].
 * 2. S7 Doorway Ink Closing Finale (`uEndProgress > 0`):
 *    - Signed-distance box opening whose half-extents shrink with an ease-out curve as `endP` rises.
 *    - Displaced by deterministic low-frequency domain-warped noise (`uSeed`), with vertical
 *      tapered ink drips from the closing top edge, dry-brush fringe, and white paper speckle holes.
 *    - Circular safe region around S7's Red Orb (`uOrbPos`) that protects the orb until `endP ≈ 0.88`.
 *    - Between `endP = 0.88` and `endP = 1.0`, the world is 100% ink black (`#0A0A0A`) and the
 *      Red Orb smoothly migrates and scales into the solid red accent disc (`#D4141C`) directly
 *      above the centered "THE END?" heading on the End Screen (matched within < 1px to DOM).
 * 3. Seamless Rewind (`uRewindActive == 1`):
 *    - Under full-bleed black (`#0A0A0A`), opens the Orb Iris forward from Cover's orb anchor
 *      to reveal Scene 1 (`s1-causeway`) with zero intermediate scene flash and zero white frames.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { INK_CONFIG } from '../config/ink';
import { SCENES_CONFIG } from '../config/scenes.config';
import { THEME_COLORS, THEME_VEC3 } from '../config/theme';
import { useAppStore } from '../store/useAppStore';

/**
 * Pure monotonic iris radius function of tau in [0, 1].
 * Reaches > 1.0 * maxCornerDist by tau = 0.86 so the iris completely clears the screen
 * before the boundary handoff, while maintaining dR/d(tau) > 0 everywhere on (0, 1).
 */
export function computeTargetIrisRadius(
  tau: number,
  orbPosOut: [number, number],
  aspect: number,
): number {
  if (tau <= 0.0005) return 0;
  const clampedTau = Math.max(0, Math.min(1, tau));
  const dxMax = Math.max(orbPosOut[0], 1.0 - orbPosOut[0]) * aspect;
  const dyMax = Math.max(orbPosOut[1], 1.0 - orbPosOut[1]);
  const maxCornerDist = Math.hypot(dxMax, dyMax) + 0.06;

  const fastT = Math.min(1.0, clampedTau / 0.86);
  const smoothFast = fastT * fastT * (3.0 - 2.0 * fastT);
  const tail = clampedTau * 0.12;
  return (0.34 * fastT + 0.58 * smoothFast + tail) * maxCornerDist;
}

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

  uniform sampler2D uIncomingTex;  // Rendered incoming scene texture from offscreen FBO
  uniform float uWipeProgress;     // [0..1] single-clock transition scalar tau
  uniform float uIrisRadius;       // Monotonic aspect-corrected iris radius
  uniform int uTransitionType;     // 0 = orbIris, 1 = panelSlice
  uniform vec2 uOrbPosOut;         // Outgoing orb normalized screen pos (WebGL UV origin)
  uniform float uOrbRadiusOut;
  uniform vec2 uOrbPosIn;          // Incoming orb normalized screen pos (WebGL UV origin)
  uniform float uOrbRadiusIn;
  uniform float uAspect;           // Viewport width / height
  uniform float uEdgeAmplitude;    // Low-frequency edge warp amplitude
  uniform float uSeed;             // Deterministic seed
  uniform float uBoilStep;         // Quantized 8-10 fps boil step

  // S7 Doorway-Closing Finale uniforms
  uniform float uEndProgress;      // [0..1] single-clock finale scalar endP
  uniform vec2 uOrbPos;            // S7 orb position in WebGL UV [0.50, 0.64]
  uniform float uOrbRadius;        // S7 orb normalized radius (0.064)
  uniform vec2 uAccentPos;         // End screen red accent disc position in WebGL UV
  uniform float uAccentRadius;     // End screen red accent disc normalized radius
  uniform vec2 uResolution;        // Viewport resolution in CSS pixels
  uniform float uTime;             // Elapsed time (seconds)
  uniform float uEndEdgeAmplitude; // Domain-warped noise amplitude for closing doorway
  uniform float uEndDripLengthMax; // Max downward drip length from closing top edge
  uniform int uReducedMotion;      // 1 = reduced motion enabled

  // Seamless Rewind uniforms
  uniform int uRewindActive;       // 1 = seamless rewind from black end screen to Cover active
  uniform float uRewindRevealP;    // [0..1] rewind reveal progress
  uniform float uRewindIrisRadius; // Aspect-corrected iris radius during rewind reveal

  uniform vec3 uColorPaper;
  uniform vec3 uColorInk;
  uniform vec3 uColorRed;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  // Low-frequency domain-warped polar noise seeded per boundary
  float domainWarpedPolarNoise(float ang, float seed, float boilStep) {
    vec2 p = vec2(cos(ang), sin(ang)) * 2.2 + vec2(seed, boilStep * 0.37);
    float w1 = valueNoise(p);
    float w2 = valueNoise(p + vec2(w1 * 1.4, seed * 0.5));
    return (w2 - 0.5) * 2.0;
  }

  // Low-frequency 2D domain-warped noise for the S7 closing doorway ink boundary
  float domainWarpedBoxNoise(vec2 uv, float seed, float boilStep) {
    vec2 p = uv * vec2(4.8, 4.8) + vec2(seed * 0.73, boilStep * 0.29);
    float w1 = valueNoise(p);
    float w2 = valueNoise(p * 1.85 + vec2(w1 * 1.55, seed * 0.41));
    return (w2 - 0.5) * 2.0;
  }

  void main() {
    // =========================================================================
    // 1. SEAMLESS REWIND PASS (Black End Screen -> Orb Iris Reveal of Cover)
    // =========================================================================
    if (uRewindActive == 1) {
      if (uReducedMotion == 1) {
        if (uRewindRevealP >= 0.5) {
          discard;
        }
        gl_FragColor = vec4(uColorInk, 1.0);
        return;
      }

      // First 12% of rewind: morph accent disc to Cover's orb anchor on black
      if (uRewindRevealP <= 0.12) {
        float morphT = clamp(uRewindRevealP / 0.12, 0.0, 1.0);
        vec2 seedPos = mix(uAccentPos, uOrbPosOut, morphT);
        float seedR = mix(uAccentRadius * uAspect, uOrbRadiusOut * 0.65 * uAspect, morphT);
        vec2 d = vUv - seedPos;
        d.x *= uAspect;
        if (length(d) <= seedR) {
          gl_FragColor = vec4(uColorRed, 1.0);
          return;
        }
        gl_FragColor = vec4(uColorInk, 1.0);
        return;
      }

      // 12% -> 100%: grow Orb Iris outward from Cover's orb anchor, discarding inside to reveal Cover
      vec2 diff = vUv - uOrbPosOut;
      diff.x *= uAspect;
      float dist = length(diff);
      float ang = atan(diff.y, diff.x);
      float env = 1.0 - smoothstep(0.75, 0.98, uRewindRevealP);
      float warp = domainWarpedPolarNoise(ang, uSeed, uBoilStep) * uEdgeAmplitude * env;
      float effectiveR = max(0.0, uRewindIrisRadius + warp);
      float collarW = 0.018 * env;

      if (dist < effectiveR - collarW) {
        // Inside expanding iris: reveal live Scene 1 (Cover) rendered underneath
        discard;
      }
      if (dist < effectiveR) {
        float collarT = (dist - (effectiveR - collarW)) / max(0.0001, collarW);
        vec3 cCol = collarT < 0.5 ? uColorRed : uColorInk;
        gl_FragColor = vec4(cCol, 1.0);
        return;
      }
      // Outside expanding iris: keep full-bleed black cover
      gl_FragColor = vec4(uColorInk, 1.0);
      return;
    }

    // =========================================================================
    // 2. S7 DOORWAY INK CLOSING FINALE (uEndProgress > 0.0005)
    // =========================================================================
    if (uEndProgress > 0.0005) {
      float endP = clamp(uEndProgress, 0.0, 1.0);

      // Reduced motion fallback: simple cross-fade / step to black with red accent disc
      if (uReducedMotion == 1) {
        float morphT = clamp((endP - 0.88) / 0.12, 0.0, 1.0);
        vec2 curOrbPos = mix(uOrbPos, uAccentPos, morphT);
        float curOrbR = mix(uOrbRadius * uAspect, uAccentRadius * uAspect, morphT);
        vec2 d = vUv - curOrbPos;
        d.x *= uAspect;
        if (length(d) <= curOrbR) {
          gl_FragColor = vec4(uColorRed, 1.0);
          return;
        }
        if (endP >= 0.5) {
          gl_FragColor = vec4(uColorInk, 1.0);
          return;
        }
        discard;
      }

      // Phase B (endP in [0.88, 1.0]):
      // World is 100% full-bleed black (#0A0A0A) and the Red Orb smoothly moves & scales
      // from S7's orb position to the End Screen's red accent position above "THE END?".
      if (endP >= 0.88) {
        float morphT = clamp((endP - 0.88) / 0.12, 0.0, 1.0);
        float morphS = morphT * morphT * (3.0 - 2.0 * morphT);
        vec2 curOrbPos = mix(uOrbPos, uAccentPos, morphS);
        float curOrbR = mix(uOrbRadius * uAspect, uAccentRadius * uAspect, morphS);

        vec2 orbDiff = vUv - curOrbPos;
        orbDiff.x *= uAspect;
        float distToOrb = length(orbDiff);

        // Subtle hand-inked organic wobble on the orb edge that settles into a crisp accent circle at endP = 1.0
        float ang = atan(orbDiff.y, orbDiff.x);
        float orbWobble =
          domainWarpedPolarNoise(ang, uSeed + 3.7, uBoilStep) * 0.0025 * (1.0 - morphS);

        if (distToOrb <= curOrbR + orbWobble) {
          gl_FragColor = vec4(uColorRed, 1.0);
          return;
        }

        gl_FragColor = vec4(uColorInk, 1.0);
        return;
      }

      // Phase A (endP in (0.0, 0.88)):
      // Signed-distance doorway box opening shrinks inward with an ease-out curve.
      float closeT = clamp(endP / 0.88, 0.0, 1.0);
      // Ease-out shrinking factor: 1.0 at closeT=0 -> 0.0 at closeT=1
      float openFactor = pow(max(0.0, 1.0 - closeT), 1.32);

      // Opening center starts at doorway portal center (0.5, 0.52) and converges toward uOrbPos
      vec2 boxCenter = mix(vec2(0.5, 0.52), uOrbPos, closeT * 0.72);
      // At closeT=0, halfExtents are (0.53, 0.53) so the box is just outside [0, 1] viewport
      vec2 halfExtents = vec2(0.53, 0.53) * openFactor;

      vec2 dVec = abs(vUv - boxCenter) - halfExtents;
      float sdBox = length(max(dVec, 0.0)) + min(max(dVec.x, dVec.y), 0.0);

      // Low-frequency domain-warped organic noise displacing the closing ink boundary
      float rampIn = smoothstep(0.0, 0.06, closeT);
      float warp =
        domainWarpedBoxNoise(vUv, uSeed, uBoilStep) *
        uEndEdgeAmplitude *
        rampIn *
        (0.35 + 0.65 * openFactor);

      // Vertical tapered ink drips extending downward from the top edge as it closes
      float topEdgeY = boxCenter.y + halfExtents.y + warp * 0.55;
      float dripContribution = 0.0;
      if (vUv.y < topEdgeY && abs(vUv.x - boxCenter.x) <= halfExtents.x + 0.04) {
        float colScaled = vUv.x * 36.0;
        float colIdx = floor(colScaled);
        float colFract = fract(colScaled);
        float colSeed = hash21(vec2(colIdx, uSeed * 2.31));
        if (colSeed > 0.34) {
          float boilFlutter = (hash21(vec2(colIdx, uBoilStep * 0.7)) - 0.5) * 0.006;
          float dripLen =
            (0.014 + pow((colSeed - 0.34) / 0.66, 1.7) * uEndDripLengthMax + boilFlutter) *
            smoothstep(0.02, 0.22, closeT) *
            (0.25 + 0.75 * openFactor);
          float distDown = topEdgeY - vUv.y;
          if (distDown > 0.0 && distDown < dripLen) {
            float dripProg = distDown / max(0.0001, dripLen);
            // Tapered streak width with slight tip bulb
            float halfW = 0.36 * (1.0 - dripProg * 0.82);
            if (abs(colFract - 0.5) < halfW) {
              dripContribution = 0.04;
            }
          }
        }
      }

      float sdEffective = sdBox + warp - dripContribution;

      // Circular safe region around the S7 Red Orb that closes last (never covered before endP = 0.88)
      vec2 orbDiff = vUv - uOrbPos;
      orbDiff.x *= uAspect;
      float distToOrb = length(orbDiff);
      float orbVisualR = uOrbRadius * uAspect;
      float orbSafeR = orbVisualR * mix(1.38, 1.0, smoothstep(0.55, 0.88, endP));

      // Keep the orb safe region open against the ragged box edge
      float orbGuard = distToOrb - orbSafeR;
      sdEffective = max(sdEffective, -max(0.0, -orbGuard));
      if (distToOrb < orbSafeR) {
        sdEffective = -1.0;
      }

      // As endP approaches 0.88 (endP in [0.72, 0.88]), transition the orb interior cleanly
      // into the flat signal-red disc so there is zero pop at endP = 0.88
      if (endP > 0.72 && distToOrb <= orbVisualR) {
        float redFillT = smoothstep(0.72, 0.875, endP);
        if (redFillT > 0.85) {
          gl_FragColor = vec4(uColorRed, 1.0);
          return;
        }
      }

      // Inside the shrinking doorway opening (or orb safe region): keep S7 scene visible
      if (sdEffective < 0.0) {
        discard;
      }

      // Near the inward-bleeding boundary: dry-brush fringe & deterministic white paper speckle holes
      float fringeWidth = 0.018 * (0.25 + 0.75 * openFactor);
      if (sdEffective < fringeWidth && distToOrb > orbSafeR + 0.008) {
        // Dry-brush lengthwise sliver right on the leading edge
        if (sdEffective < fringeWidth * 0.28) {
          float dryNoise = valueNoise(vec2(vUv.x * 78.0 + uSeed, vUv.y * 78.0 - uBoilStep * 0.4));
          if (dryNoise > 0.68) {
            discard;
          }
        }
        // Small white paper speckle holes near the ink boundary
        vec2 pixelCell = floor((vUv * uResolution) / 3.2);
        float spHash = hash21(pixelCell + vec2(uSeed * 5.1, uBoilStep * 1.3));
        if (spHash > 0.915 && sdEffective > fringeWidth * 0.22) {
          gl_FragColor = vec4(uColorPaper, 1.0);
          return;
        }
      }

      // Solid sumi ink black (#0A0A0A) outside the opening
      gl_FragColor = vec4(uColorInk, 1.0);
      return;
    }

    // =========================================================================
    // 3. STANDARD BOUNDARY TRANSITIONS (uWipeProgress in (0, 1))
    // =========================================================================
    // Strict discard guard outside transitions (preserves paper luminance >= 248/255)
    if (uWipeProgress <= 0.0005 || uWipeProgress >= 0.9995) {
      discard;
    }

    // Subtle UV anchor settle that eases smoothly to 0.000 by tau = 0.85 so sampleUv === vUv at handoff
    float settleEnv = 1.0 - smoothstep(0.0, 0.85, uWipeProgress);
    vec2 anchorShift = (uOrbPosIn - uOrbPosOut) * settleEnv * 0.14;
    vec2 sampleUv = clamp(vUv + anchorShift, 0.0, 1.0);
    vec4 incomingSample = texture2D(uIncomingTex, sampleUv);

    // Collar envelope vanishes smoothly by tau = 0.88 so the final 12% of the transition is pure incoming scene
    float env = sin(clamp(uWipeProgress / 0.88, 0.0, 1.0) * 3.14159265);

    if (uTransitionType == 0) {
      // -----------------------------------------------------------------------
      // SINGLE-CLOCK ORB IRIS REVEAL
      // -----------------------------------------------------------------------
      vec2 diff = vUv - uOrbPosOut;
      diff.x *= uAspect;
      float dist = length(diff);
      float ang = atan(diff.y, diff.x);

      float warp = domainWarpedPolarNoise(ang, uSeed, uBoilStep) * uEdgeAmplitude * env;
      float effectiveRadius = max(0.0, uIrisRadius + warp);
      float collarWidth = 0.016 * env;

      // Deterministic stipple dots moving outward with the iris edge
      float relDist = dist - effectiveRadius;
      if (env > 0.001 && relDist > 0.0 && relDist < 0.012 * env) {
        float angCell = floor((ang + 3.14159265) * 28.0);
        float radCell = floor((relDist / max(0.001, 0.012 * env)) * 3.0);
        float dotHash = hash21(vec2(angCell + uSeed * 11.0, radCell + uBoilStep));
        if (dotHash > 0.78) {
          gl_FragColor = vec4(uColorInk, 1.0);
          return;
        }
        discard;
      }

      // Outside iris: discard so outgoing scene remains 100% visible
      if (dist >= effectiveRadius) {
        discard;
      }

      // Inside iris core: reveal incoming scene live
      if (dist < effectiveRadius - collarWidth) {
        gl_FragColor = incomingSample;
        return;
      }

      // Thin two-tone ink + signal red collar (< 3% of viewport area)
      float collarT = (dist - (effectiveRadius - collarWidth)) / max(0.0001, collarWidth);
      vec3 collarColor = collarT > 0.55 ? uColorInk : uColorRed;
      gl_FragColor = vec4(collarColor, 1.0);
      return;
    } else {
      // -----------------------------------------------------------------------
      // SINGLE-CLOCK MANGA PANEL SLICE REVEAL
      // -----------------------------------------------------------------------
      float diag = vUv.x * 0.36 + vUv.y * 0.93;
      float bandIndex = floor(vUv.x * 3.0);
      float stagger = bandIndex * 0.07;
      // All 3 diagonal bands reach 100% open by tau = 0.86
      float localPhase = clamp((uWipeProgress - stagger) / (0.86 - 0.14), 0.0, 1.0);
      float smoothPhase = localPhase * localPhase * (3.0 - 2.0 * localPhase);

      float n = (valueNoise(vec2(diag * 6.0 + uSeed, uBoilStep * 0.25)) - 0.5) * uEdgeAmplitude * env;
      float sliceDist = abs(fract(diag * 2.2 + n) - 0.5) * 2.0;

      float openLimit = smoothPhase * 1.06;
      if (sliceDist >= openLimit) {
        discard;
      }

      float borderW = 0.022 * env;
      if (sliceDist < openLimit - borderW) {
        gl_FragColor = incomingSample;
        return;
      }

      vec3 ruleColor = sliceDist > openLimit - borderW * 0.5 ? uColorInk : uColorRed;
      gl_FragColor = vec4(ruleColor, 1.0);
    }
  }
`;

export interface PostInkProps {
  incomingTexture: THREE.Texture | null;
}

export const PostInk: React.FC<PostInkProps> = ({ incomingTexture }) => {
  const matRef = useRef<THREE.ShaderMaterial | null>(null);

  const fallbackTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 4;
    c.height = 4;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = THEME_COLORS.paper;
    ctx.fillRect(0, 0, 4, 4);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }, []);

  const s7Spec = SCENES_CONFIG[SCENES_CONFIG.length - 1];

  const uniforms = useMemo(
    () => ({
      uIncomingTex: { value: incomingTexture ?? fallbackTex },
      uWipeProgress: { value: 0 },
      uIrisRadius: { value: 0 },
      uTransitionType: { value: 0 },
      uOrbPosOut: { value: new THREE.Vector2(0.5, 0.5) },
      uOrbRadiusOut: { value: 0.08 },
      uOrbPosIn: { value: new THREE.Vector2(0.5, 0.5) },
      uOrbRadiusIn: { value: 0.08 },
      uAspect: { value: 1.6 },
      uEdgeAmplitude: { value: INK_CONFIG.irisEdgeAmplitude },
      uSeed: { value: 7.13 },
      uBoilStep: { value: 0 },
      uEndProgress: { value: 0 },
      uOrbPos: { value: new THREE.Vector2(s7Spec.orb.pos[0], 1.0 - s7Spec.orb.pos[1]) },
      uOrbRadius: { value: s7Spec.orb.radius },
      uAccentPos: { value: new THREE.Vector2(0.5, 0.66) },
      uAccentRadius: { value: 0.011 },
      uResolution: { value: new THREE.Vector2(1440, 900) },
      uTime: { value: 0 },
      uEndEdgeAmplitude: { value: INK_CONFIG.endEdgeAmplitude },
      uEndDripLengthMax: { value: INK_CONFIG.endDripLengthMax },
      uReducedMotion: { value: 0 },
      uRewindActive: { value: 0 },
      uRewindRevealP: { value: 0 },
      uRewindIrisRadius: { value: 0 },
      uColorPaper: { value: new THREE.Vector3(...THEME_VEC3.paperPure) },
      uColorInk: { value: new THREE.Vector3(...THEME_VEC3.ink) },
      uColorRed: { value: new THREE.Vector3(...THEME_VEC3.red) },
    }),
    [fallbackTex, incomingTexture, s7Spec.orb.pos, s7Spec.orb.radius],
  );

  useFrame(({ clock, size }) => {
    if (!matRef.current) return;
    const state = useAppStore.getState();
    const cs = state.chapterState;
    const outScene = SCENES_CONFIG[cs.fromIndex] ?? SCENES_CONFIG[0];
    const inScene = SCENES_CONFIG[cs.toIndex] ?? SCENES_CONFIG[0];
    const coverScene = SCENES_CONFIG[0];
    const thresholdScene = SCENES_CONFIG[SCENES_CONFIG.length - 1];

    const w = Math.max(1, size.width);
    const h = Math.max(1, size.height);
    const aspect = w / h;

    const orbOutWebGL: [number, number] = [outScene.orb.pos[0], 1.0 - outScene.orb.pos[1]];
    const orbInWebGL: [number, number] = [inScene.orb.pos[0], 1.0 - inScene.orb.pos[1]];
    const s7OrbWebGL: [number, number] = [
      thresholdScene.orb.pos[0],
      1.0 - thresholdScene.orb.pos[1],
    ];

    // Measure the DOM #end-screen-accent-anchor element so the canvas red accent disc
    // aligns with the EndScreen layout within < 0.5px (strictly <= 2px requirement)
    let accentUvX = 0.5;
    let accentUvY = 0.66;
    if (typeof document !== 'undefined') {
      const anchorEl = document.getElementById('end-screen-accent-anchor');
      if (anchorEl) {
        const rect = anchorEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          const centerX = rect.left + rect.width * 0.5;
          const centerY = rect.top + rect.height * 0.5;
          accentUvX = centerX / w;
          accentUvY = 1.0 - centerY / h;
        }
      }
    }

    const accentRadiusNorm = INK_CONFIG.endAccentRadiusPx / w;

    const tau = cs.tau;
    const finalRadius = computeTargetIrisRadius(tau, orbOutWebGL, aspect);

    // Compute current finale orb screen position (in CSS pixels) for verification telemetry
    const endP = state.endP;
    const morphT = Math.max(0, Math.min(1, (endP - 0.88) / 0.12));
    const morphS = morphT * morphT * (3.0 - 2.0 * morphT);
    const curOrbUvX = s7OrbWebGL[0] + (accentUvX - s7OrbWebGL[0]) * morphS;
    const curOrbUvY = s7OrbWebGL[1] + (accentUvY - s7OrbWebGL[1]) * morphS;
    const curOrbRadiusNorm =
      thresholdScene.orb.radius + (accentRadiusNorm - thresholdScene.orb.radius) * morphS;

    if (typeof window !== 'undefined') {
      const win = window as unknown as Record<string, unknown>;
      win.__PILOT_IRIS_RADIUS__ = Number(finalRadius.toFixed(5));
      win.__PILOT_END_ACCENT_TELEMETRY__ = {
        endP,
        canvasCenterPx: [Number((curOrbUvX * w).toFixed(2)), Number(((1.0 - curOrbUvY) * h).toFixed(2))],
        targetDomCenterPx: [Number((accentUvX * w).toFixed(2)), Number(((1.0 - accentUvY) * h).toFixed(2))],
        radiusPx: Number((curOrbRadiusNorm * w).toFixed(2)),
      };
    }

    matRef.current.uniforms.uIncomingTex.value = incomingTexture ?? fallbackTex;
    matRef.current.uniforms.uWipeProgress.value = tau;
    matRef.current.uniforms.uIrisRadius.value = finalRadius;
    matRef.current.uniforms.uTransitionType.value =
      cs.transitionType === 'panelSlice' ? 1 : 0;

    if (state.isRewinding) {
      const coverOrbWebGL: [number, number] = [
        coverScene.orb.pos[0],
        1.0 - coverScene.orb.pos[1],
      ];
      const revealT = Math.max(0, Math.min(1, (state.rewindRevealP - 0.12) / 0.88));
      const rewindRadius = computeTargetIrisRadius(revealT, coverOrbWebGL, aspect);
      matRef.current.uniforms.uOrbPosOut.value.set(coverOrbWebGL[0], coverOrbWebGL[1]);
      matRef.current.uniforms.uOrbRadiusOut.value = coverScene.orb.radius;
      matRef.current.uniforms.uRewindActive.value = 1;
      matRef.current.uniforms.uRewindRevealP.value = state.rewindRevealP;
      matRef.current.uniforms.uRewindIrisRadius.value = rewindRadius;
    } else {
      matRef.current.uniforms.uOrbPosOut.value.set(orbOutWebGL[0], orbOutWebGL[1]);
      matRef.current.uniforms.uOrbRadiusOut.value = outScene.orb.radius;
      matRef.current.uniforms.uRewindActive.value = 0;
      matRef.current.uniforms.uRewindRevealP.value = 0;
      matRef.current.uniforms.uRewindIrisRadius.value = 0;
    }

    matRef.current.uniforms.uOrbPosIn.value.set(orbInWebGL[0], orbInWebGL[1]);
    matRef.current.uniforms.uOrbRadiusIn.value = inScene.orb.radius;

    matRef.current.uniforms.uAspect.value = aspect;
    matRef.current.uniforms.uEdgeAmplitude.value = state.reducedMotion
      ? 0.0
      : INK_CONFIG.irisEdgeAmplitude;
    matRef.current.uniforms.uSeed.value =
      endP > 0.0005 ? 73.19 : cs.boundaryIndex * 19.37 + 7.13;

    // Finale uniforms
    matRef.current.uniforms.uEndProgress.value = endP;
    matRef.current.uniforms.uOrbPos.value.set(s7OrbWebGL[0], s7OrbWebGL[1]);
    matRef.current.uniforms.uOrbRadius.value = thresholdScene.orb.radius;
    matRef.current.uniforms.uAccentPos.value.set(accentUvX, accentUvY);
    matRef.current.uniforms.uAccentRadius.value = accentRadiusNorm;
    matRef.current.uniforms.uResolution.value.set(w, h);
    matRef.current.uniforms.uTime.value = clock.getElapsedTime();
    matRef.current.uniforms.uEndEdgeAmplitude.value = state.reducedMotion
      ? 0.0
      : INK_CONFIG.endEdgeAmplitude;
    matRef.current.uniforms.uEndDripLengthMax.value = state.reducedMotion
      ? 0.0
      : INK_CONFIG.endDripLengthMax;
    matRef.current.uniforms.uReducedMotion.value = state.reducedMotion ? 1 : 0;

    // Quantize edge boil to 8-10 fps; freeze boil step when scrubber is paused for 100% deterministic scrubbing
    const shouldBoil =
      !state.reducedMotion &&
      (!state.debugScrubber.enabled || state.debugScrubber.playing);
    matRef.current.uniforms.uBoilStep.value = shouldBoil
      ? Math.floor(clock.getElapsedTime() * INK_CONFIG.irisEdgeBoilFps)
      : 0.0;
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
