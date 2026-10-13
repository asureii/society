/**
 * HAND-INKED PROCEDURAL ART TUNABLES (src/config/ink.ts)
 *
 * Every parameter controlling the hand-drawn ink brush, hatching engine,
 * line-boil animation, and print misregistration lives in this single file.
 * Adjust these knobs to tune the manga illustration feel across the entire site.
 */

export interface InkConfig {
  /** Global deterministic seed for mulberry32 PRNG */
  globalSeed: number;

  /**
   * Wobble amplitude (in 1x pixels) perpendicular to stroke direction.
   * Higher values make lines shakier and more hand-drawn; 0 makes lines ruler-straight.
   * Recommended range: 0.45 – 1.35
   */
  wobbleAmplitude: number;

  /**
   * Low-frequency noise spatial scale along the stroke length.
   * Lower values produce long sweeping hand drift; higher values produce nervous jitter.
   */
  wobbleFrequency: number;

  /**
   * Strength of pressure tapering at stroke attack and release (0 = blunt, 1 = sharp nib taper).
   */
  taperStrength: number;

  /**
   * Probability [0..1] of a slight ink pooling blob at the start of a stroke.
   */
  startBlobProbability: number;

  /**
   * Probability [0..1] of a quick flicked tail at the end of a stroke.
   */
  endFlickProbability: number;

  /**
   * Corner overshoot / endpoint miss distance in 1x pixels (1–4px).
   * Prevents vector-clean closed corners so joins feel hand-inked.
   */
  endpointMissPx: [number, number];

  /**
   * Probability [0..1] (~0.25) that an outline receives a second, thinner, shorter,
   * slightly offset sketch stroke.
   */
  doubledLineProbability: number;

  /**
   * Probability [0..1] (~0.03) per segment of a brief pen lift / gap on long strokes.
   */
  lineBreakProbability: number;

  /**
   * Dry-brush streak intensity [0..1] on thick strokes and solid shadow fringes.
   * Carves thin lengthwise paper slivers near stroke edges.
   */
  dryBrushStrength: number;

  /**
   * Edge roughening displacement amplitude in 1x pixels so no polygon edge is vector-clean.
   */
  edgeRougheningPx: number;

  /**
   * Relative spacing jitter (±0.35 = ±35%) between adjacent hatch lines.
   */
  hatchSpacingJitter: number;

  /**
   * Per-line angle jitter in degrees (±4 deg) plus slow drift across a hatched region.
   */
  hatchAngleJitterDeg: number;

  /**
   * Density of clustered spatter & stipple ink dots near shadow boundaries.
   */
  stippleDensity: number;

  /**
   * Line-boil playback rate in frames per second (8–10 fps for traditional anime/manga boil).
   */
  boilFps: number;

  /**
   * Number of distinct inked variants generated per layer for line-boil cycling (3 on desktop, 1 on mobile/reduced-motion).
   */
  boilVariantCount: number;

  /**
   * Print misregistration offset of the Red Orb plate in 1x pixels [x, y] (2–3px offset from black linework).
   */
  misregistrationOffsetPx: [number, number];

  /**
   * Maximum texture dimension cap (4096px per brief).
   */
  maxTextureSize: number;

  /**
   * Zero-mean paper fiber grain amplitude (<= 0.016 so average empty-paper luminance stays >= 248/255).
   */
  paperGrainStrength: number;

  /**
   * Maximum live texture memory budget in megabytes (150MB per Part A4 & F).
   */
  maxLiveTextureMemoryMB: number;

  /**
   * Noise jaggedness of the Orb Iris Wipe transition edge.
   */
  irisJaggedness: number;

  /**
   * Low-frequency domain-warped edge displacement amplitude for Orb Iris transition.
   */
  irisEdgeAmplitude: number;

  /**
   * Quantized edge boil rate in frames per second (8–10 fps) for transition boundary.
   */
  irisEdgeBoilFps: number;

  /**
   * Maximum allowed per-frame radius derivative for the Orb Iris mask.
   */
  irisMaxStepDelta: number;

  /**
   * Low-frequency domain-warped edge displacement amplitude for S7 doorway ink closing finale.
   */
  endEdgeAmplitude: number;

  /**
   * Maximum downward ink drip length (in normalized UV units) from the top edge during S7 closing.
   */
  endDripLengthMax: number;

  /**
   * Safe radius multiplier around S7 orb during closing so ink does not cover the orb before endP ≈ 0.88.
   */
  endOrbSafeMultiplier: number;

  /**
   * Target radius in CSS pixels for the solid red accent disc above "THE END?" at endP = 1.0.
   */
  endAccentRadiusPx: number;
}

export const INK_CONFIG: InkConfig = {
  globalSeed: 19951004,
  wobbleAmplitude: 0.95,
  wobbleFrequency: 0.035,
  taperStrength: 0.82,
  startBlobProbability: 0.38,
  endFlickProbability: 0.42,
  endpointMissPx: [1.2, 3.8],
  doubledLineProbability: 0.26,
  lineBreakProbability: 0.032,
  dryBrushStrength: 0.65,
  edgeRougheningPx: 0.85,
  hatchSpacingJitter: 0.35,
  hatchAngleJitterDeg: 4.0,
  stippleDensity: 0.75,
  boilFps: 9.0,
  boilVariantCount: 3,
  misregistrationOffsetPx: [2.6, -2.1],
  maxTextureSize: 4096,
  paperGrainStrength: 0.012,
  maxLiveTextureMemoryMB: 150,
  irisJaggedness: 0.028,
  irisEdgeAmplitude: 0.014,
  irisEdgeBoilFps: 8.5,
  irisMaxStepDelta: 0.072,
  endEdgeAmplitude: 0.038,
  endDripLengthMax: 0.085,
  endOrbSafeMultiplier: 1.15,
  endAccentRadiusPx: 10,
};


