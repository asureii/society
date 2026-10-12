/**
 * SEEDED MULBERRY32 PRNG & 2D VALUE NOISE (src/scene/art/rng.ts)
 *
 * Provides deterministic pseudo-random numbers per layer and variant so that
 * line-boil frames share the exact same composition while varying their
 * hand-drawn wobble, pressure curves, and hatch spacing jitter.
 */

export interface PRNG {
  /** Next uniform float in [0, 1) */
  next: () => number;
  /** Uniform float in [min, max) */
  range: (min: number, max: number) => number;
  /** Random integer in [min, max] inclusive */
  int: (min: number, max: number) => number;
  /** True with probability p in [0, 1] */
  chance: (p: number) => boolean;
  /** Approximate Gaussian with mean 0, std 1 */
  gaussian: () => number;
  /** Deterministic 1D smooth value noise along t */
  noise1D: (t: number) => number;
  /** Deterministic 2D value noise */
  noise2D: (x: number, y: number) => number;
  /** Domain-warped fractal Brownian motion (fbm) in [0, 1] for ragged ink clouds */
  fbm2D: (x: number, y: number, octaves?: number) => number;
}

export function createRng(seed: number): PRNG {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const range = (min: number, max: number): number => min + next() * (max - min);

  const int = (min: number, max: number): number => Math.floor(range(min, max + 1));

  const chance = (p: number): boolean => next() < p;

  const gaussian = (): number => {
    const u = Math.max(1e-6, next());
    const v = Math.max(1e-6, next());
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  const seedOffset = (seed & 0xffff) * 0.137;

  const hash2 = (ix: number, iy: number): number => {
    let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + (seed ^ 0x5bd1e995);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  const noise2D = (x: number, y: number): number => {
    const sx = x + seedOffset;
    const sy = y - seedOffset;
    const ix = Math.floor(sx);
    const iy = Math.floor(sy);
    const fx = sx - ix;
    const fy = sy - iy;
    const ux = fx * fx * (3.0 - 2.0 * fx);
    const uy = fy * fy * (3.0 - 2.0 * fy);

    const a = hash2(ix, iy);
    const b = hash2(ix + 1, iy);
    const c = hash2(ix, iy + 1);
    const d = hash2(ix + 1, iy + 1);

    return a + (b - a) * ux + (c - a) * uy * (1.0 - ux) + (d - b) * ux * uy;
  };

  const noise1D = (t: number): number => noise2D(t, 17.31);

  const fbm2D = (x: number, y: number, octaves = 4): number => {
    let value = 0;
    let amp = 0.5;
    let freq = 1.0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      value += amp * noise2D(x * freq, y * freq);
      norm += amp;
      freq *= 2.03;
      amp *= 0.5;
    }
    return value / norm;
  };

  return {
    next,
    range,
    int,
    chance,
    gaussian,
    noise1D,
    noise2D,
    fbm2D,
  };
}
