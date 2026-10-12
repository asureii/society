/**
 * HAND-INKED MANGA FRAGMENT SHADER (src/scene/shaders/layer.frag.glsl)
 *
 * Refinements per Part B5 & B6:
 * 1. 3-Variant Line-Boil: Cycles between uTex0, uTex1, uTex2 via `uBoilFrame` (stepped at ~9fps).
 * 2. Irregular Ink Threshold: `ink = smoothstep(t - w, t + w, lum + (noise(uv * scale) - 0.5) * 0.08)`
 *    so inked edges are ragged and organic.
 * 3. Ink Pooling: 4-tap neighbor darkening where lines meet or intersect.
 * 4. Print Misregistration: Samples the Red Orb plate with `uRedOffset` (2–3px offset that drifts slightly with scroll).
 * 5. Paper Fiber Noise: <= 3% strength on white paper only so the page stays bright white.
 * 6. Gentle Jittered Shader Hatching: Only fills unauthored mid-tones so it never fights the canvas brush hatching.
 * 7. Strict 3-Color Palette Quantization Safeguard: Outputs strictly uColorPaper, uColorInk, or uColorRed.
 */

precision highp float;

varying vec2 vUv;
varying vec3 vWorldPos;

uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform sampler2D uTex2;
uniform sampler2D uDepthMap;

uniform int uBoilFrame;          // 0, 1, or 2 cycled at ~9fps on CPU
uniform float uTime;
uniform vec2 uMouse;             // Damped mouse/gyro [-1, 1]
uniform float uScrollProgress;   // Global scroll [0, 1]
uniform float uTransitionBleed;  // Chapter transition ink-bleed [0, 1]
uniform float uReducedMotion;    // 1.0 when prefers-reduced-motion is active

uniform float uHatchDensity;     // Frequency of gentle fallback shader hatching
uniform float uEdgeStrength;     // Multiplier for 4-tap ink pooling
uniform float uBoilAmount;       // Micro UV boil jitter
uniform float uDepthDisplace;    // Strength of depth-map UV wiggle
uniform float uRippleAmount;     // 1.0 on Red Orb layer for subtle LCL/heat ripple
uniform float uAllowRed;         // 1.0 if this layer is permitted to output --red
uniform vec2 uRedOffset;         // Print misregistration offset in UV space (2–3px + slight scroll drift)

uniform vec3 uColorPaper;        // Warm white paper token
uniform vec3 uColorInk;          // Deep ink black token
uniform vec3 uColorRed;          // Signal red accent token

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
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

vec4 sampleBoilVariant(vec2 uv) {
  if (uBoilFrame == 1) {
    return texture2D(uTex1, uv);
  } else if (uBoilFrame == 2) {
    return texture2D(uTex2, uv);
  }
  return texture2D(uTex0, uv);
}

// Gentle jittered shader hatch only for residual mid-tones (0.35 < luma < 0.72)
float gentleMidtoneHatch(vec2 uv, float luma, float density) {
  float c = 0.70710678;
  float jitter = (valueNoise(uv * 35.0) - 0.5) * 0.25;
  vec2 rot = vec2(c * uv.x - c * uv.y, c * uv.x + c * uv.y) * density + jitter;
  float wave = abs(fract(rot.x) - 0.5) * 2.0;
  float inMidtoneBand = smoothstep(0.32, 0.42, luma) * (1.0 - smoothstep(0.62, 0.74, luma));
  float lineMask = 1.0 - step(0.28, wave);
  return lineMask * inMidtoneBand * 0.45;
}

void main() {
  float motionScale = 1.0 - uReducedMotion;

  // Depth-map UV displacement ("pseudo-3D wiggle") from damped mouse
  float depthSample = texture2D(uDepthMap, vUv).r;
  vec2 depthOffset = uMouse * (depthSample - 0.5) * uDepthDisplace * motionScale;

  // Subtle ripple on the Red Orb
  vec2 rippleOffset = vec2(0.0);
  if (uRippleAmount > 0.01 && uReducedMotion < 0.5) {
    float rippleWave = sin(vUv.y * 26.0 + uTime * 2.0) * cos(vUv.x * 22.0 - uTime * 1.5);
    rippleOffset = vec2(rippleWave * 0.0028 * uRippleAmount);
  }

  vec2 baseUv = clamp(vUv + depthOffset + rippleOffset, 0.003, 0.997);
  vec4 tex = sampleBoilVariant(baseUv);

  // Sample misregistered red plate at baseUv + uRedOffset (2–3px offset + scroll drift)
  vec2 redUv = clamp(baseUv + uRedOffset, 0.003, 0.997);
  vec4 redTex = sampleBoilVariant(redUv);
  float redDominance = (redTex.r - max(redTex.g, redTex.b)) * step(0.15, redTex.a);
  float isRedPlate = step(0.30, redDominance) * uAllowRed;

  // Discard fully transparent pixels where neither ink nor misregistered red plate is present
  if (tex.a < 0.08 && isRedPlate < 0.5) {
    discard;
  }

  // Compute perceptual luminance of the primary ink sample
  // For pixels where only the offset red plate exists, treat base luminance as paper white (1.0)
  float rawLuma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
  float currentPixelIsRedOnly = step(0.30, tex.r - max(tex.g, tex.b));
  float inkLuma = mix(rawLuma, 0.96, currentPixelIsRedOnly);
  if (tex.a < 0.08) {
    inkLuma = 1.0;
  }

  // 4-tap neighbor sampling for Ink Pooling (heavier darkening where lines meet)
  vec2 texel = vec2(1.0 / 1400.0);
  vec4 nN = sampleBoilVariant(clamp(baseUv + vec2(0.0, texel.y), 0.003, 0.997));
  vec4 nS = sampleBoilVariant(clamp(baseUv - vec2(0.0, texel.y), 0.003, 0.997));
  vec4 nE = sampleBoilVariant(clamp(baseUv + vec2(texel.x, 0.0), 0.003, 0.997));
  vec4 nW = sampleBoilVariant(clamp(baseUv - vec2(texel.x, 0.0), 0.003, 0.997));

  float lN = mix(1.0, dot(nN.rgb, vec3(0.299, 0.587, 0.114)), step(0.1, nN.a));
  float lS = mix(1.0, dot(nS.rgb, vec3(0.299, 0.587, 0.114)), step(0.1, nS.a));
  float lE = mix(1.0, dot(nE.rgb, vec3(0.299, 0.587, 0.114)), step(0.1, nE.a));
  float lW = mix(1.0, dot(nW.rgb, vec3(0.299, 0.587, 0.114)), step(0.1, nW.a));

  float darkNeighborCount =
    step(lN, 0.45) + step(lS, 0.45) + step(lE, 0.45) + step(lW, 0.45);
  float poolBias = step(2.5, darkNeighborCount) * 0.09 * uEdgeStrength;

  // Irregular ink threshold per B6:
  // ink = 1.0 - smoothstep(t - w, t + w, lum + (noise(uv * scale) - 0.5) * 0.08)
  float t = 0.54;
  float w = 0.08;
  float edgeNoise = (valueNoise(baseUv * 95.0) - 0.5) * 0.08;
  float whiteFactor = smoothstep(t - w, t + w, inkLuma - poolBias + edgeNoise);
  float inkAmount = 1.0 - whiteFactor;

  // Add gentle fallback shader hatching only in unauthored mid-tone transitions
  float extraHatch = gentleMidtoneHatch(baseUv, inkLuma, uHatchDensity);
  inkAmount = clamp(max(inkAmount, extraHatch), 0.0, 1.0);

  // Fine paper fiber noise at <= 3% strength on the white paper only
  float fiber = (hash21(vUv * 620.0) - 0.5) * 0.026;
  vec3 paperWithFiber = clamp(uColorPaper + vec3(fiber), 0.94, 1.0);

  // Strict 3-color palette composition:
  // Start with bright white paper (or misregistered Red Orb plate), then composite black ink strokes on top
  vec3 basePlate = mix(paperWithFiber, uColorRed, isRedPlate);
  float quantizedInk = step(0.46, inkAmount);
  vec3 finalColor = mix(basePlate, uColorInk, quantizedInk);

  // Chapter transition ragged ink-bleed dissolve (strictly pure ink, never grey)
  if (uTransitionBleed > 0.01 && uReducedMotion < 0.5) {
    float bleedNoise = valueNoise(vUv * 18.0 + vec2(0.0, uScrollProgress * 6.0));
    float bleedEdge = step(1.0 - uTransitionBleed * 0.28, bleedNoise);
    finalColor = mix(finalColor, uColorInk, bleedEdge);
  }

  float outAlpha = step(0.45, max(tex.a, isRedPlate));
  if (outAlpha < 0.5) {
    discard;
  }
  gl_FragColor = vec4(finalColor, 1.0);
}

