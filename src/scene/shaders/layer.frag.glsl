/**
 * MANGA INK & HATCHING FRAGMENT SHADER (src/scene/shaders/layer.frag.glsl)
 *
 * Implements:
 * 1. Line-boil (quantized 10fps UV jitter so inked edges feel hand-drawn)
 * 2. Depth-map-based UV parallax displacement ("pseudo-3D wiggle")
 * 3. Subtle ripple displacement for the distant Red Orb focal point
 * 4. Sobel / gradient edge detection for crisp ink outlines
 * 5. Luminance-driven parallel hatching + cross-hatching + halftone dots
 * 6. Paper grain noise & ink-bleed chapter transition dissolve
 * 7. STRICT PALETTE SAFEGUARD: Quantizes all output strictly to:
 *    - uColorPaper (#FAFAF8)
 *    - uColorInk   (#0A0A0A)
 *    - uColorRed   (#D4141C) — only when uAllowRed > 0.5
 */

precision highp float;

varying vec2 vUv;
varying vec3 vWorldPos;

uniform sampler2D uTexture;
uniform sampler2D uDepthMap;

uniform float uTime;
uniform vec2 uMouse;             // Damped mouse/gyro [-1, 1]
uniform float uScrollProgress;   // Global scroll [0, 1]
uniform float uTransitionBleed;  // Chapter transition ink-bleed [0, 1]
uniform float uReducedMotion;    // 1.0 when prefers-reduced-motion is active

uniform float uHatchDensity;     // Frequency of hatching lines
uniform float uEdgeStrength;     // Multiplier for Sobel outline detection
uniform float uBoilAmount;       // Amplitude of 10fps hand-drawn line boil
uniform float uDepthDisplace;    // Strength of depth-map UV wiggle
uniform float uHalftoneMix;      // Blend factor for halftone mid-tone dots
uniform float uRippleAmount;     // 1.0 on Red Orb layer for subtle heat/LCL ripple
uniform float uAllowRed;         // 1.0 if this layer is permitted to output --red

uniform vec3 uColorPaper;        // #FAFAF8 normalized
uniform vec3 uColorInk;          // #0A0A0A normalized
uniform vec3 uColorRed;          // #D4141C normalized

// 2D hash & value noise for paper grain, line boil, and ragged ink-bleed
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

// Luminance-driven parallel hatching + cross-hatching
float computeHatching(vec2 uv, float luma, float density) {
  // Rotate coordinates -45 deg for primary parallel hatching
  float c = 0.70710678;
  vec2 rot1 = vec2(c * uv.x - c * uv.y, c * uv.x + c * uv.y) * density;
  vec2 rot2 = vec2(c * uv.x + c * uv.y, -c * uv.x + c * uv.y) * density;

  float wave1 = abs(fract(rot1.x) - 0.5) * 2.0;
  float wave2 = abs(fract(rot2.x) - 0.5) * 2.0;

  // Darker luminance (< 0.75) triggers primary hatching; very dark (< 0.42) triggers cross-hatching
  float primaryInk = 1.0 - step(clamp((0.78 - luma) * 1.45, 0.0, 0.85), wave1);
  float crossInk = 1.0 - step(clamp((0.42 - luma) * 1.65, 0.0, 0.85), wave2);

  return clamp(max(primaryInk, crossInk), 0.0, 1.0);
}

// Halftone dot pattern for manga mid-tones
float computeHalftone(vec2 uv, float luma, float density) {
  vec2 grid = fract(uv * density * 0.65) - 0.5;
  float dist = length(grid);
  float radius = clamp((0.72 - luma) * 0.65, 0.0, 0.45);
  return 1.0 - step(radius, dist);
}

void main() {
  // 1. Hand-drawn line-boil quantized at 10 fps (disabled under prefers-reduced-motion)
  float motionScale = 1.0 - uReducedMotion;
  float boilTick = floor(uTime * 10.0);
  vec2 boilOffset = vec2(
    valueNoise(vUv * 22.0 + vec2(boilTick * 1.7, 0.0)) - 0.5,
    valueNoise(vUv * 22.0 + vec2(0.0, boilTick * 2.3)) - 0.5
  ) * uBoilAmount * motionScale;

  // 2. Depth-map UV displacement ("pseudo-3D wiggle") from damped mouse
  float depthSample = texture2D(uDepthMap, vUv).r;
  vec2 depthOffset = uMouse * (depthSample - 0.5) * uDepthDisplace * motionScale;

  // 3. Optional subtle ripple for the Red Orb focal point
  vec2 rippleOffset = vec2(0.0);
  if (uRippleAmount > 0.01 && uReducedMotion < 0.5) {
    float rippleWave = sin(vUv.y * 28.0 + uTime * 2.2) * cos(vUv.x * 24.0 - uTime * 1.6);
    rippleOffset = vec2(rippleWave * 0.0035 * uRippleAmount);
  }

  vec2 sampleUv = clamp(vUv + boilOffset + depthOffset + rippleOffset, 0.002, 0.998);
  vec4 tex = texture2D(uTexture, sampleUv);

  // Transparent pixels discard cleanly so layered depth planes composite over paper
  if (tex.a < 0.08) {
    discard;
  }

  // 4. Sobel / Neighbor Edge Detection on alpha & luminance for crisp ink outlines
  vec2 texel = vec2(1.0 / 1024.0);
  float aN = texture2D(uTexture, clamp(sampleUv + vec2(0.0, texel.y), 0.0, 1.0)).a;
  float aS = texture2D(uTexture, clamp(sampleUv - vec2(0.0, texel.y), 0.0, 1.0)).a;
  float aE = texture2D(uTexture, clamp(sampleUv + vec2(texel.x, 0.0), 0.0, 1.0)).a;
  float aW = texture2D(uTexture, clamp(sampleUv - vec2(texel.x, 0.0), 0.0, 1.0)).a;
  float edgeAlpha = (abs(aN - aS) + abs(aE - aW)) * uEdgeStrength;

  // Detect red signal pixels in source texture (high R, low G & B)
  float redDominance = tex.r - max(tex.g, tex.b);
  float isRedFeature = step(0.32, redDominance) * uAllowRed;

  // Compute perceptual luminance for non-red ink/paper features
  float luma = dot(tex.rgb, vec3(0.299, 0.587, 0.114));

  // 5. Procedural hatching + halftone based on luminance
  float hatchMask = computeHatching(sampleUv, luma, uHatchDensity);
  float dotMask = computeHalftone(sampleUv, luma, uHatchDensity);
  float midtoneInk = mix(hatchMask, max(hatchMask, dotMask), uHalftoneMix);

  // Combine solid dark ink areas (luma < 0.22), mid-tone hatching (0.22..0.78), and edge outlines
  float solidInk = 1.0 - step(0.24, luma);
  float inkCoverage = clamp(max(solidInk, max(midtoneInk, step(0.35, edgeAlpha))), 0.0, 1.0);

  // 6. Subtle animated paper grain (kept faint so white paper reads clean)
  float grain = (hash21(vUv * 420.0 + vec2(boilTick * 0.13)) - 0.5) * 0.04;
  float grainedPaperChoice = step(0.88, luma + grain);

  // 7. STRICT THREE-COLOR PALETTE QUANTIZATION SAFEGUARD
  // Every fragment is strictly quantized to Paper (#FAFAF8), Ink (#0A0A0A), or Red (#D4141C)
  vec3 finalColor = mix(uColorPaper, uColorInk, inkCoverage * (1.0 - grainedPaperChoice * 0.15));

  if (isRedFeature > 0.5) {
    // Red orb / red pilot scarf with subtle ink-hatched shading on its lower rim
    float orbShadeHatch = computeHatching(sampleUv, luma + 0.22, uHatchDensity * 0.85);
    float rimInk = max(step(0.45, edgeAlpha), orbShadeHatch * 0.35);
    finalColor = mix(uColorRed, uColorInk, step(0.55, rimInk));
  }

  // 8. Chapter transition ragged ink-bleed wipe (noise-threshold dissolve)
  if (uTransitionBleed > 0.01 && uReducedMotion < 0.5) {
    float bleedNoise = valueNoise(vUv * 9.0 + vec2(0.0, uScrollProgress * 6.0));
    float bleedEdge = step(1.0 - uTransitionBleed * 0.45, bleedNoise);
    finalColor = mix(finalColor, uColorInk, bleedEdge * 0.65);
  }

  gl_FragColor = vec4(finalColor, tex.a);
}
