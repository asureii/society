precision highp float;

varying vec2 vUv;

uniform vec2 uEyeUv;        // Normalized screen [x, y] (origin top-left)
uniform vec2 uOrbUv;        // Normalized screen [x, y] (origin top-left)
uniform vec2 uResolution;   // Viewport pixel size [width, height]
uniform float uTime;
uniform float uReveal;
uniform float uActiveAlpha; // 1.0 when active, dims slightly if dormant
uniform vec3 uColorInk;
uniform vec3 uColorRed;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float noise1D(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash11(i), hash11(i + 1.0), u);
}

void main() {
  float gate = smoothstep(0.85, 0.98, uReveal);
  if (gate < 0.01) discard;

  // Convert vUv (origin bottom-left) to screen coordinates (origin top-left)
  vec2 screenUv = vec2(vUv.x, 1.0 - vUv.y);
  vec2 pPx = screenUv * uResolution;
  vec2 eyePx = uEyeUv * uResolution;
  vec2 orbPx = uOrbUv * uResolution;

  // 1. Reticle around the orb (4 cardinal tick marks + broken outer arc, 1 short red tick)
  vec2 dOrb = pPx - orbPx;
  float rOrb = length(dOrb);
  if (rOrb >= 21.0 && rOrb <= 40.0) {
    // Quantize time slightly for hand-inked boil
    float boilT = floor(uTime * 10.0);
    float rWobble = (noise1D(atan(dOrb.y, dOrb.x) * 6.0 + boilT * 0.7) - 0.5) * 1.4;
    float rAdj = rOrb + rWobble;

    // 4 cardinal ticks: N (up), S (down), W (left), E (right = short RED tick)
    bool onHorizontalTick = abs(dOrb.y) < 1.35 && rAdj >= 24.0 && rAdj <= 36.0;
    bool onVerticalTick = abs(dOrb.x) < 1.35 && rAdj >= 24.0 && rAdj <= 36.0;

    if (onHorizontalTick && dOrb.x > 0.0) {
      // Short red tick on the East (+X) side of the reticle
      gl_FragColor = vec4(uColorRed, 1.0);
      return;
    }
    if (onHorizontalTick || onVerticalTick) {
      gl_FragColor = vec4(uColorInk, 1.0);
      return;
    }

    // Broken hand-inked diagonal bracket arcs at r ~ 29px
    if (abs(rAdj - 29.0) < 1.05 && abs(dOrb.x) > 7.5 && abs(dOrb.y) > 7.5) {
      gl_FragColor = vec4(uColorInk, 1.0);
      return;
    }
  }

  // 2. Hand-inked dashed sight line from eyePx to orbPx
  vec2 seg = orbPx - eyePx;
  float segLen = length(seg);
  if (segLen < 12.0 || uActiveAlpha < 0.05) discard;

  vec2 dir = seg / segLen;
  vec2 nrm = vec2(-dir.y, dir.x);
  vec2 rel = pPx - eyePx;

  float along = dot(rel, dir);
  // Clip endpoints cleanly at the eye center margin and orb reticle edge
  if (along < 6.0 || along > segLen - 25.0) discard;

  float boilStep = floor(uTime * 12.0) * 0.35;
  float wobble = (noise1D(along * 0.045 + boilStep) - 0.5) * 2.2;
  float perpDist = abs(dot(rel, nrm) - wobble);

  // Per-dash length & gap variation
  float cellSize = 16.0;
  float cellIdx = floor(along / cellSize);
  float cellFrac = fract(along / cellSize);
  float dashDuty = 0.45 + 0.26 * hash11(cellIdx * 17.3);

  // Taper dash tips slightly like a pen nib
  float tipTaper = smoothstep(0.0, 0.12, cellFrac) * (1.0 - smoothstep(dashDuty - 0.12, dashDuty, cellFrac));
  float halfWidth = 0.95 * tipTaper;

  if (cellFrac < dashDuty && perpDist < halfWidth) {
    gl_FragColor = vec4(uColorInk, 1.0);
    return;
  }

  discard;
}
