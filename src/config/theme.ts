/**
 * STRICT PALETTE TOKENS
 * Target proportions across the entire experience:
 * - White (--paper / --paper-pure): ~65–70%
 * - Black (--ink): ~25–30%
 * - Red (--red / --red-deep): <= 8% (signal accent only)
 *
 * RULE: Do NOT hard-code hex values outside this file or index.css @theme.
 * Run `npm run check:palette` to verify compliance.
 */

export const THEME_COLORS = {
  paper: '#FAFAF8',
  paperPure: '#FFFFFF',
  ink: '#0A0A0A',
  red: '#D4141C',
  redDeep: '#A30F15',
} as const;

export const THEME_VEC3 = {
  paper: [250 / 255, 250 / 255, 248 / 255] as [number, number, number],
  paperPure: [1.0, 1.0, 1.0] as [number, number, number],
  ink: [10 / 255, 10 / 255, 10 / 255] as [number, number, number],
  red: [212 / 255, 20 / 255, 28 / 255] as [number, number, number],
  redDeep: [163 / 255, 15 / 255, 21 / 255] as [number, number, number],
} as const;

export type ThemeColorKey = keyof typeof THEME_COLORS;
