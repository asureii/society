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
| `--red` | `#D4141C` | **≤ 8%** (Focal red orb, pilot scarf stripe, crop-marks, active states, warnings) |
| `--red-deep` | `#A30F15` | Hover/pressed state of red only |

- **No flat greys or stray hues**: Mid-tones are produced strictly via luminance-driven ink hatching, cross-hatching, or halftone dots on white paper.
- **Shader Safeguard**: [`src/scene/shaders/layer.frag.glsl`](src/scene/shaders/layer.frag.glsl) quantizes all output pixels to `uColorPaper`, `uColorInk`, and `uColorRed` (gated per layer by `uAllowRed`).
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

## Personalization & Live Integrations (`src/config/profile.ts`)

All personal data, GitHub settings, Lanyard Discord presence, MAGI skills, and timeline entries live in [`src/config/profile.ts`](src/config/profile.ts). Search for `TODO` in that file to fill in your details:

1. **GitHub Live Integration (`githubUsername` & `featuredRepos`)**:
   - Set `githubUsername` to your GitHub handle.
   - Set `featuredRepos` to an array of repository names you want pinned first.
   - The hook [`src/hooks/useGithubRepos.ts`](src/hooks/useGithubRepos.ts) queries `/users/{username}/repos?sort=pushed&per_page=30` and `/users/{username}/events/public?per_page=30`, caches results in `sessionStorage` for 10 minutes, and falls back to `PROFILE.fallbackRepos` if rate-limited or offline.

2. **Discord Lanyard Live Presence (`discordUserId`)**:
   - Join the [Lanyard Discord server](https://github.com/Phineas/lanyard) so Lanyard can observe your presence.
   - Put your 18/19-digit Discord Snowflake ID in `discordUserId` inside [`src/config/profile.ts`](src/config/profile.ts).
   - [`src/hooks/useDiscordPresence.ts`](src/hooks/useDiscordPresence.ts) connects to `wss://api.lanyard.rest/socket` (handling op 1 Hello, op 2 Initialize, op 3 Heartbeat, `INIT_STATE`, and `PRESENCE_UPDATE`) with exponential backoff and a 30-second REST polling fallback (`GET https://api.lanyard.rest/v1/users/{id}`).

---

## Supplying Custom Illustrated 2.5D Layers

Until external PNG files are placed in `public/layers/entry-plug/`, [`src/scene/proceduralArt.ts`](src/scene/proceduralArt.ts) synthesizes placeholder art and depth maps in-palette so the experience works out of the box.

To drop in your own hand-drawn illustrations, place PNGs (2048×1152 or 1024×1024 recommended, transparent background, drawn in `#0A0A0A` ink on `#FFFFFF`/`#FAFAF8` paper with `#D4141C` only on the orb and pilot scarf) at these paths configured in [`src/config/layers.config.ts`](src/config/layers.config.ts):

| Layer ID | Color Texture Path | Optional Grayscale Depth Map Path | Red Allowed? |
| :--- | :--- | :--- | :--- |
| `far-sky` | `/public/layers/entry-plug/far-sky-monolith.png` | `/public/layers/entry-plug/far-sky-monolith.depth.png` | No |
| `red-orb` | `/public/layers/entry-plug/red-orb.png` | `/public/layers/entry-plug/red-orb.depth.png` | **Yes** |
| `mid-far-horizon` | `/public/layers/entry-plug/mid-far-horizon.png` | `/public/layers/entry-plug/mid-far-horizon.depth.png` | No |
| `near-stepping-stones` | `/public/layers/entry-plug/near-stepping-stones.png` | `/public/layers/entry-plug/near-stepping-stones.depth.png` | No |
| `mid-pilot` | `/public/layers/entry-plug/mid-pilot.png` | `/public/layers/entry-plug/mid-pilot.depth.png` | **Yes** (scarf only) |
| `foreground-debris` | `/public/layers/entry-plug/foreground-debris.png` | `/public/layers/entry-plug/foreground-debris.depth.png` | No |

---

## Deployment (Vercel / Netlify)

- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Node.js version**: 20+
- Chunk splitting is pre-configured in [`vite.config.ts`](vite.config.ts) (`three` and `gsap` chunks separated from application code).
