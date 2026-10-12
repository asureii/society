# PILOT FILE // Jonathan Erick Christovandy — 2.5D Interactive Manga Portfolio

An interactive, scroll-driven 2.5D manga portfolio and NERV-inspired personnel dossier built for **Jonathan Erick Christovandy**.

## Tech Stack
- **Framework**: Vite + React 18 + TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 (strict custom `@theme` tokens, zero rounded corners)
- **WebGL / 2.5D Scene**: Three.js via `@react-three/fiber` with custom GLSL vertex/fragment shaders (`vite-plugin-glsl`)
- **Scroll Choreography**: GSAP + ScrollTrigger synced with `Lenis` smooth scrolling
- **State Management**: Zustand (`src/store/useAppStore.ts`)
- **Typography**: Self-hosted via Fontsource (`@fontsource/shippori-mincho`, `@fontsource/anton`, `@fontsource/jetbrains-mono`)

---

## Strict Three-Color Palette System

All UI elements, procedural canvas illustrations, and WebGL fragment shaders adhere strictly to 5 color tokens defined in [`src/config/theme.ts`](src/config/theme.ts) and [`src/index.css`](src/index.css):

| Token | Hex | Target Proportion / Usage |
| :--- | :--- | :--- |
| `--paper` | `#FAFAF8` | **~65–70%** (Warm white paper background with subtle grain) |
| `--paper-pure` | `#FFFFFF` | Caption boxes, manga panels, navigation bar fills |
| `--ink` | `#0A0A0A` | **~25–30%** (Line work, hatching, frames, typography, dramatic ink masses) |
| `--red` | `#D4141C` | **≤ 8%** (Focal red orb, crop-marks, active states, warnings) |
| `--red-deep` | `#A30F15` | Hover/pressed state of red only |

- **No flat greys or stray hues**: Mid-tones are produced strictly via luminance-driven ink hatching, cross-hatching, stippling, or halftone dots on white paper.
- **Shader Safeguard**: [`src/scene/shaders/layer.frag.glsl`](src/scene/shaders/layer.frag.glsl) applies a noisy paper-edge ink threshold (`smoothstep` perturbed by procedural noise), 4-tap edge ink pooling, subtle paper fiber grain (`≤3%` on white only), print misregistration (`uRedOffset`), ~9fps 3-frame line-boil (`uMap0`/`uMap1`/`uMap2`), and final palette quantization.
- **Automated Verification**: Run `npm run check:palette` at any time to verify no unauthorized hex codes exist in `src/`.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Verify strict palette compliance
npm run check:palette

# Run linter & production build
npm run lint
npm run build
```

---

## Tuning the Hand-Inked Procedural Art (`src/config/ink.ts`)

All procedural ink brush, hatching, line-boil, and shader parameters live in a single configuration file: [`src/config/ink.ts`](src/config/ink.ts). Every stroke in [`src/scene/art/inkBrush.ts`](src/scene/art/inkBrush.ts) is constructed as a filled variable-width polygon (never `ctx.lineWidth`), and [`src/scene/art/hatch.ts`](src/scene/art/hatch.ts) drives organic tone-graded hatching and stippling.

Key tunables in `INK_CONFIG`:
- `globalSeed`: Master deterministic PRNG seed (`mulberry32`) for the entire scene.
- `wobbleAmplitude` / `wobbleFrequency`: Perpendicular hand-tremor displacement (`px` at 1x scale) and noise frequency along each stroke.
- `taperAttackRange` / `taperReleaseRange` / `minTipWidthRatio`: Nib pressure envelope proportions.
- `startBlobProbability` / `endFlickProbability`: Likelihood of an ink pool at stroke start or a sharp flicked tail on release.
- `overshootPxRange`: Corner overshoot and endpoint miss distance (`1–4px`) so intersections feel hand-drawn.
- `doubledLineProbability`: Chance (`~0.25`) that an outline receives a second, thinner, slightly offset sketch pass.
- `lineBreakProbability`: Chance (`~0.03`) per segment of a small pen lift/gap on long strokes.
- `dryBrushMinWidth` / `dryBrushStreaks`: Threshold and sliver count for scratchy white paper streaks inside thick brush strokes.
- `hatchSpacingJitter` / `hatchAngleJitterDeg` / `hatchAngleDriftDeg`: Spacing (`±35%`) and angle (`±4°` + slow drift) variance across hatched regions.
- `boilFps` / `boilVariantCount`: Frame rate (`9 fps`) and texture variant count (`3`) for subtle hand-drawn line boil.
- `misregistrationOffsetPx`: Print misregistration offset (`1.5–2px`) on the red channel of the orb (`uRedOffset`).

---

## Supplying Custom Scanned / Hand-Drawn 2.5D Layers

By default, [`src/scene/art/index.ts`](src/scene/art/index.ts) asynchronously generates high-resolution (2x display size, chunked across frames) hand-inked layers and depth maps.

To override any procedural layer with your own scanned or digitally inked artwork, drop a PNG file into `public/layers/entry-plug/` matching the paths configured in [`src/config/layers.config.ts`](src/config/layers.config.ts):

| Layer ID (`generatorKey`) | Color Texture Override Path | Optional Depth Map Path | Red Allowed? |
| :--- | :--- | :--- | :--- |
| `sky` (`far-sky`) | `/public/layers/entry-plug/sky.png` | `/public/layers/entry-plug/sky.depth.png` | No |
| `orb` (`red-orb`) | `/public/layers/entry-plug/orb.png` | `/public/layers/entry-plug/orb.depth.png` | **Yes** |
| `monolith` (`twin-monolith`) | `/public/layers/entry-plug/monolith.png` | `/public/layers/entry-plug/monolith.depth.png` | No |
| `horizon` (`mid-far-horizon`) | `/public/layers/entry-plug/horizon.png` | `/public/layers/entry-plug/horizon.depth.png` | No |
| `path` (`near-stepping-stones`) | `/public/layers/entry-plug/path.png` | `/public/layers/entry-plug/path.depth.png` | No |
| `foreground` (`foreground-frame`) | `/public/layers/entry-plug/foreground.png` | `/public/layers/entry-plug/foreground.depth.png` | No |

### Palette Rules for Artists
1. **Strict 3-color artwork**: Draw in pure black ink (`#0A0A0A`) on transparent or pure white (`#FFFFFF` / `#FAFAF8`) backgrounds.
2. **No grey washes**: Achieve all mid-tones using line hatching, cross-hatching, or stipple dots. The fragment shader thresholds luminance with a subtle paper-edge perturbation and will quantize any stray hues.
3. **Red channel isolation**: Only the `orb` layer has `allowRed: true` (`#D4141C`). All other layers are strictly black ink and white paper.

---

## Personalization & Live Integrations (`src/config/profile.ts`)

All personal data, GitHub settings, Lanyard Discord presence, MAGI skills, and timeline entries live in [`src/config/profile.ts`](src/config/profile.ts):
1. **GitHub Live Integration (`githubUsername` & `featuredRepos`)**: Queries `/users/{username}/repos` and `/users/{username}/events/public`, caches in `sessionStorage` for 10 minutes, and falls back to `PROFILE.fallbackRepos`.
2. **Discord Lanyard Live Presence (`discordUserId`)**: Connects to `wss://api.lanyard.rest/socket` with REST polling fallback (`GET https://api.lanyard.rest/v1/users/{id}`) and surfaces live status directly in the top-left HUD wordmark plate and Chapter 04 side panel.

---

## Deployment (Vercel / Netlify)

- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Node.js version**: 20+

