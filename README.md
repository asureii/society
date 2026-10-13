# PILOT FILE // Jonathan Erick Christovandy — 2.5D Interactive Manga Portfolio

An interactive, scroll-driven 2.5D manga portfolio and NERV-inspired personnel dossier built for **Jonathan Erick Christovandy**. Every chapter (`S1` through `S7`) has its own hand-inked 2.5D illustrated world, horizon silhouette, camera angle, and camera movement rig (`dolly`, `drift`, `crane`, `pushIn`, `tiltUp`, `track`), threaded together by the recurring **Red Orb** motif and **Orb Iris Match-Cut** / **Manga Panel Slice** transitions.

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
| `--paper` | `#FAFAF8` | **~65–70%** (Warm white paper background with subtle grain, luminance ≥ 245/255) |
| `--paper-pure` | `#FFFFFF` | Caption boxes, manga panels, navigation bar fills |
| `--ink` | `#0A0A0A` | **~25–30%** (Line work, hatching, frames, typography, dramatic ink masses; up to 40% in S2/S5) |
| `--red` | `#D4141C` | **≤ 8%** (Focal red orb, crop-marks, active states, warnings) |
| `--red-deep` | `#A30F15` | Hover/pressed state of red only |

- **No flat greys or stray hues**: Mid-tones are produced strictly via luminance-driven ink hatching, cross-hatching, stippling, or halftone dots on white paper.
- **Automated Verification**: Run `npm run check:palette` at any time to verify no unauthorized hex codes exist in `src/`.

---

## Seven-Shot Manga Storyboard & Camera Rigs (`src/config/scenes.config.ts`)

Each chapter maps to its own scene module under [`src/scene/scenes/<scene-id>/index.ts`](src/scene/scenes/index.ts):

| Scene ID | Chapter | Title | Beat Mode | Camera Rig | Orb Anchor (`pos`, `r`) | Outgoing Transition |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `s1-causeway` | 01 · Cover | **The Causeway** | Stage Beat | `dolly` (forward z-push) | `[0.46, 0.37]`, `r=0.072` | `orbIris` |
| `s2-observation` | 02 · Dossier | **The Observation Room** | Pinned Spread | `drift` (lateral sway) | `[0.50, 0.42]`, `r=0.052` | `panelSlice` |
| `s3-archive-city` | 03 · The Work | **The Archive City** | Pinned Spread | `crane` (diagonal top-down pan) | `[0.54, 0.34]`, `r=0.048` | `orbIris` |
| `s4-plug` | 04 · Status | **The Plug** | Stage Beat | `pushIn` (z-push + ±2.5° roll) | `[0.50, 0.50]`, `r=0.068` | `panelSlice` |
| `s5-three-pillars` | 05 · Skills | **The Three Pillars** | Pinned Spread | `tiltUp` (worm's-eye + Dutch roll) | `[0.50, 0.24]`, `r=0.044` | `panelSlice` |
| `s6-long-scroll` | 06 · Timeline | **The Long Scroll** | Pinned Spread | `track` (4-plane lateral emaki pan) | `[0.74, 0.28]`, `r=0.056` | `orbIris` |
| `s7-threshold` | 07 · Contact | **The Threshold** | Stage Beat | `pushIn` (through doorway → `"THE END?"`) | `[0.50, 0.36]`, `r=0.064` | `orbIris` |

---

## Pinned Panel Choreography: `ENTER` / `HOLD` / `TRANSITION` (`src/config/scroll.config.ts`)

Rather than placing chapter panels in document flow where they scroll off-screen, the scroll architecture uses **one document scroll spacer** (`#scroll-spacer`, height `980vh`) driven by native scrolling + `Lenis`, paired with **one fixed viewport panel layer** (`#pinned-panel-layer`, `position: fixed; inset: 0; pointer-events: none`). Individual interactive panels restore `pointer-events: auto` while leaving the WebGL canvas permanently unmasked and unobstructed.

### Phase Breakdown (Per Chapter Span)
Each chapter's normalized scroll span is partitioned into three phases in [`src/config/scroll.config.ts`](src/config/scroll.config.ts) (default `0.15` / `0.50` / `0.35`):

1. **`ENTER` (`15%` of chapter span, overlapping previous `TRANSITION`)**:
   - `enterP` ramps `0 → 1`. To prevent empty viewport gaps (`> 10vh`) between chapters, chapter `N+1` begins its `ENTER` phase at `τ = 0.25` of chapter `N`'s outgoing transition (`enterP: 0 → 0.75`) and completes the final `0.75 → 1.0` settle during the first `15%` of chapter `N+1`'s own range.
   - Panels execute a ragged polygon `clip-path` reveal and directional slide-in via DOM refs in `gsap.ticker` (zero React re-renders per scroll tick).
2. **`HOLD` (`50%` of chapter span; `85%` on final chapter `S7`)**:
   - `enterP = 1`, `exitP = 0`, while `holdP` advances `0 → 1`.
   - **Strict Stationary Box Rule**: The outer panel bounding box (`transform` and `clip-path`) remains 100% constant across the entire `HOLD` phase (`≤ 1px` drift), anchored inside the chapter's safe zones (`uiSafeRects`) and outside the scene's `focalRect` and HUD (`Nav` / `ScrollPill`). On mobile viewports (`< 1024px`), panels fit cleanly as a bottom/split sheet (`≤ 45vh`) with zero internal scrollbars.
   - **Internal Progression**: Content *inside* the stationary panel advances with `holdP` via `gsap.ticker` refs:
     - **Dossier (`S2`)**: Internal dossier sections reveal sequentially via `clip-path`.
     - **The Work (`S3`)**: Repository artifact rows (`01`–`06`) reveal sequentially via horizontal `clip-path`.
     - **Skills (`S5`)**: The three MAGI columns (`MELCHIOR-1`, `BALTHASAR-2`, `CASPAR-3`) reveal one by one.
     - **Timeline (`S6`)**: The four milestone cards translate horizontally (`translate3d`) inside the stationary emaki frame.
     - **Contact (`S7`)**: The conclusion `"THE END?"` card reveals inside its frame as `holdP` approaches `1.0`.
3. **`TRANSITION` / `EXIT` (`35%` of chapter span)**:
   - `exitP` (and `transitionProgress` $\tau$) ramps `0 → 1`.
   - **Panel `EXIT`**: The outgoing panel accelerates away from the scene's Red Orb in the opposite direction of its entry, clearing the focal area before the growing transition iris reaches it.
   - **Concurrent Dual-Scene Fly-Through (`Scene.tsx` + `PostInk.tsx`)**: Both the outgoing scene `N` and incoming scene `N+1` render concurrently. Scene `N` renders to the primary canvas while Scene `N+1` renders live to an offscreen `WebGLRenderTarget` (`FBO`) via R3F `createPortal`.
   - **Growing Orb Iris & Live Panel Slices**:
     - For `orbIris`, an ink-and-signal-red ragged collar grows outward from Scene `N`'s Red Orb screen anchor (`uOrbPosOut`), sampling `uIncomingTex` inside the iris and discarding outside so both worlds remain simultaneously visible (never blanketing the screen with a flat mask).
     - For `panelSlice`, three staggered diagonal manga gutters part continuously with $\tau$, revealing the live incoming scene inside the slices.
     - Both transition modes are 100% scrubbable in reverse with zero visual pops.

### Tuning Knobs (`src/config/scroll.config.ts` & `src/config/ink.ts`)
- `TOTAL_SCROLL_HEIGHT_VH` (`980`): Total height of `#scroll-spacer` in `vh` units, controlling overall scroll travel speed.
- `MAX_CHAPTERS_PER_SECOND` (`0.40`): Caps virtual scroll speed (`virtualProgress`) so every chapter transition (`timing.transition = 0.36`) lasts at least `0.36 / 0.40 = 0.90s >= 0.80s` of real time even under rapid flick scrolling.
- `CHAPTER_SCROLL_SPECS[i].weight`: Relative scroll budget weight assigned to chapter `i` (`1.0` default; `1.15` for `work`).
- `CHAPTER_SCROLL_SPECS[i].timing`: `{ enter: 0.14, hold: 0.50, transition: 0.36 }` fractions summing to `1.0` per chapter.
- `COMPUTED_SCROLL_RANGES[i].holdMidpointProgress`: Auto-computed global scroll progress at the exact midpoint of chapter `i`'s `HOLD` phase, used by top navigation links (`lenis.scrollTo`) so clicking any chapter lands directly on its pinned `HOLD` state.
- `INK_CONFIG.irisEdgeAmplitude` (`0.014`): Low-frequency domain-warped polar edge displacement amplitude for the Orb Iris collar.
- `INK_CONFIG.irisEdgeBoilFps` (`8.5`): Quantized edge boil rate (`8–10 fps`) eliminating per-frame random edge flicker.
- `INK_CONFIG.irisMaxStepDelta` (`0.045`): Maximum allowed per-frame iris radius step delta.

---

## Single-Clock Transitions, Readiness Gating & Dev Transition Scrubber (`[T]`)

### 1. Single Authoritative Clock (`ChapterState { from, to, τ }`)
All layers in a transition consume the same `chapterState` derived from the capped `virtualProgress` in [`src/hooks/useLenis.ts`](src/hooks/useLenis.ts):
- **WebGL Stage & Camera (`Scene.tsx`, `CameraRig.tsx`)**: Renders `fromScene` on the main canvas and `toScene` into an offscreen `WebGLRenderTarget` (`FBO`).
- **Transition Shader (`PostInk.tsx`)**: Grows a monotonic ink-and-red-edged circular mask from `uOrbPosOut` (or parts diagonal `panelSlice` shutters) using `chapterState.tau`, keeping flat collar coverage `< 4%` (`<= 35%` limit) so both worlds remain visible simultaneously.
- **Disjoint Panel Handoff (`MangaPageLayout.tsx`)**:
  - For $\tau < 0.50$: Only `chapterState.from` is active (`panelChapter === sceneChapter === from`). It exits via `transform` and `clip-path` over $\tau \in [0, 0.45]$ and is completely hidden by $\tau = 0.45$.
  - For $\tau \ge 0.50$: Only `chapterState.to` is active (`panelChapter === sceneChapter === to`), entering via `transform` and `clip-path` over $\tau \in [0.55, 1.00]$.
  - `opacity` is strictly `1` when visible (zero opacity cross-fades, zero ghosted text, zero SVG filters).

### 2. GPU Readiness Gating (`src/scene/art/index.ts`)
- Scenes are pre-generated in scroll order ahead of the user and immediately uploaded to the GPU via `renderer.initTexture(tex)` with shaders pre-compiled via `renderer.compileAsync`.
- A boundary is crossable only when `isSceneReady(nextSceneId)` is `true`. If `virtualProgress` reaches `transitionStartProgress` before `nextSceneId` is ready, `virtualProgress` gently eases asymptotically toward the boundary without crossing ($\tau = 0$), keeping the outgoing scene alive and resuming automatically once `ready` flips to `true`.
- `<Layer>` binds cached textures synchronously on Frame 0 and hides any mesh whose texture is not yet ready, preventing blank white frames.

### 3. Dev Transition Scrubber (`Press T`) & Automated Verification (`scripts/transition-check.ts`)
- Press **`T`** at any time to toggle the interactive **Transition Scrubber** (`src/ui/TransitionScrubber.tsx`), featuring:
  - Boundary selector (`1→2` through `6→7`)
  - Continuous $\tau \in [0, 1]$ slider
  - `Play / Pause` toggle and `-1F / +1F` (`1/120` step) buttons
  - Live telemetry readout of `ChapterState { from, to, τ }`, `panelChapter` vs `sceneChapter`, and `GPU Readiness` (`fromReady` / `toReady`).
- Programmatic debug hook: `window.__PILOT_TRANSITION_DEBUG__.setBoundaryTau(boundaryIndex, tau)` and `getState()`.
- Run `npm run check:transitions` (`node scripts/transition-check.ts`) to execute the 120-step forward/reverse scrub suite across all 6 boundaries and the 2.5s / 5s / 10s wheel scroll tests (with 1x and 4x CPU throttling).

---

## Continuous Camera Flight & $C^1$ Hermite Continuity Rule (`src/scene/CameraRig.tsx`)

To eliminate camera restarts at chapter boundaries (`t = 0` snaps) and stacked-smoothing lag:

1. **Single Smoothing Stage**:
   - `Lenis` (`lerp: 0.085`, synced to `gsap.ticker` with `lagSmoothing(0)`) is the sole smoothing stage.
   - `CameraRig` reads the exact Lenis-driven `sceneLocalProgress` on every frame and sets `camera.position` and `camera.rotation.z` directly—without a second exponential damping filter or boundary snap.
2. **$C^1$ Piecewise Cubic Hermite Trajectory**:
   - Each scene in `SCENES_CONFIG` defines start pose $\mathbf{P}_0 = (x_{\text{from}}, y_{\text{from}}, z_{\text{from}}, \theta_{\text{from}})$, end pose $\mathbf{P}_1 = (x_{\text{to}}, y_{\text{to}}, z_{\text{to}}, \theta_{\text{to}})$, entry velocity $\mathbf{V}_0 = \text{entryVelocity}$, and exit velocity $\mathbf{V}_1 = \text{exitVelocity}$.
   - Along local progress $t \in [0, 1]$, pose and velocity are evaluated via cubic Hermite basis functions:
     $$\mathbf{P}(t) = (2t^3 - 3t^2 + 1)\mathbf{P}_0 + (t^3 - 2t^2 + t)\mathbf{V}_0 + (-2t^3 + 3t^2)\mathbf{P}_1 + (t^3 - t^2)\mathbf{V}_1$$
   - **Boundary Continuity Rule**: For every boundary $N \to N+1$:
     $$\mathbf{P}_1^{(N)} = \mathbf{P}_0^{(N+1)} \quad \text{and} \quad \mathbf{V}_1^{(N)} = \mathbf{V}_0^{(N+1)}$$
     guaranteeing $C^1$ position and velocity continuity across all 7 chapters with zero velocity jumps or ease-in-out stalls at scene handoffs.
3. **Continuous Motion in `HOLD` + Autonomous Idle Drift**:
   - Because $t$ progresses continuously across `ENTER`, `HOLD`, and `TRANSITION`, the camera continues gliding through 3D space while the UI panel is pinned during `HOLD`.
   - An organic sinusoidal idle drift ($\Delta x = 0.035\sin(0.45\tau_{\text{clock}})$, $\Delta y = 0.025\cos(0.38\tau_{\text{clock}})$) is superimposed when `reducedMotion` is false so the background world breathes even when the user pauses scrolling.

### Lazy Generation & `<150MB` Texture Budget
- Only Scene 1 (`s1-causeway`) blocks the initial Chapter 00 Loader.
- While the user explores Scene `N`, [`src/scene/art/index.ts`](src/scene/art/index.ts) pre-generates Scene `N+1` in idle chunks (`<50ms` per chunk) and disposes GPU textures (`tex.dispose()`) of scenes more than 1 step away, keeping live texture memory well under `150MB`.

---

## Per-Scene Layer Override Contract (`/public/layers/<scene-id>/`)

To override any procedural layer with custom scanned or digitally inked artwork, drop a PNG into `/public/layers/<scene-id>/<layer-id>.png` and set `window.__ENABLE_LAYER_OVERRIDES__ = true`:

### 1. `s1-causeway` (`/public/layers/s1-causeway/`)
- `sky.png` — Upper-right ragged black ink mass & wind lines
- `orb.png` — Red Orb with spherical contour hatching (`allowRedChannel: true`)
- `monolith.png` — Twin Monolith stone slabs
- `horizon.png` — Broken desert horizon, dunes, stone clusters & distant scale tower
- `path.png` — Perspective stepping stones with cracked-ground hatching & stipple
- `foreground.png` — Cropped corner rocks & drifting debris fragments

### 2. `s2-observation` (`/public/layers/s2-observation/`)
- `window-view.png` — Central circular porthole view of sky, Twin Monolith & Red Orb (`allowRedChannel: true`)
- `room-walls.png` — Bulkhead wall bays with hexagonal technical linework & bolted collar
- `ceiling-ribs.png` — Perspective ceiling ribs & upper corner ink shadows
- `cables.png` — Drooping catenary cable bundles
- `console-fg.png` — Foreground observation console with 3 tiny red indicator lights (`allowRedChannel: true`)

### 3. `s3-archive-city` (`/public/layers/s3-archive-city/`)
- `city-ground.png` — Isometric bird's-eye street grid
- `river-canal.png` — Diagonal black ink river canal & stone bridge
- `city-blocks.png` — Stepped rectangular rooftops, cast shadows & hatched vertical faces
- `dome-orb.png` — Rooftop plaza Red Dome Orb & interactive repo district highlight (`allowRedChannel: true`)
- `towers-fg.png` — Two taller foreground scale towers with spire beacons (`allowRedChannel: true`)

### 4. `s4-plug` (`/public/layers/s4-plug/`)
- `plug-chamber.png` — Cylindrical shaft radial rays & halftone ring band
- `plug-rings.png` — Lanyard presence-reactive concentric hand-inked ripple rings
- `plug-orb.png` — Central half-submerged Red Orb & liquid reflection ripples (`allowRedChannel: true`)
- `plug-corner-frame.png` — Outer corner black ink shaft framing masses

### 5. `s5-three-pillars` (`/public/layers/s5-three-pillars/`)
- `hex-sky.png` — Upper black ink canopy etched with white-line hexagonal lattice
- `red-hex-orb.png` — Pulsing red hex cell, Red Orb core & worm's-eye speedlines (`allowRedChannel: true`)
- `pillar-left-right.png` — Outer converging colossal pillars with foreshortened hatching
- `pillar-center.png` — Central converging monolith slab
- `base-stairs.png` — Tiny architectural stairs at the base for scale

### 6. `s6-long-scroll` (`/public/layers/s6-long-scroll/`)
- `scroll-far-monolith.png` — Far horizon Twin Monolith, low setting Red Orb & screentone mist (`allowRedChannel: true`)
- `scroll-mid-arch.png` — Broken multi-bay aqueduct arches & rising hills
- `scroll-causeway.png` — Elevated causeway on stilts with 4 red milestone beacons (`allowRedChannel: true`)
- `scroll-fg-ruins.png` — Foreground ruined stone pillars & catenary cables

### 7. `s7-threshold` (`/public/layers/s7-threshold/`)
- `threshold-distant.png` — Symmetrical portal view of horizon & Twin Monolith
- `threshold-orb.png` — Centered Red Orb framed inside the doorway (`allowRedChannel: true`)
- `threshold-steps.png` — Weathered stone steps leading up to the threshold sill
- `threshold-doorframe.png` — Monumental chipped black stone doorframe

---

## S7 Finale: Doorway Closes Into `"THE END?"` (`src/ui/EndScreen.tsx` & `src/scene/PostInk.tsx`)

1. **Single-Clock Finale Scalar (`endP ∈ [0, 1]`)**:
   - Configured in [`src/config/scroll.config.ts`](src/config/scroll.config.ts) via `end: { closeShare: 0.35, readHoldVh: 60 }`.
   - S7 (`contact` / `s7-threshold`) progresses through `ENTER`, `HOLD` (Contact panel), `CLOSE` (`endP: 0 → 1` over `closeShare = 35%` of S7's active range), and a final `readHold` (`60vh` at `endP = 1.0`).
   - The Contact panel finishes exiting by `endP = 0.05` and all chapter panels are hidden (`display: none`), `inert`, and `aria-hidden="true"` for `endP >= 0.05`.
2. **Ragged Ink Closing Shader (`PostInk.tsx`)**:
   - A signed-distance box opening shrinks inward with an ease-out curve as `endP` rises, displaced by deterministic domain-warped noise (`uSeed`), vertical tapered ink drips from the top edge, dry-brush fringe, and white paper speckle holes.
   - A circular safe region protects S7's Red Orb until `endP ≈ 0.88`. Between `endP = 0.88` and `endP = 1.0`, the world behind the orb is 100% full-bleed `#0A0A0A` black and the Red Orb smoothly migrates and scales into the solid `#D4141C` red accent disc directly above the centered `"THE END?"` heading (`#end-screen-accent-anchor`, matched within `<= 2px`).
3. **Full-Bleed DOM End Screen (`src/ui/EndScreen.tsx`) & HUD `onBlack` Mode**:
   - Editable in [`src/config/profile.ts`](src/config/profile.ts) via `PROFILE.endCard` (`title`, `subline`, `jpLabel`, `cta`).
   - Inert and hidden before `endP >= 0.92`; announces arrival via `aria-live="polite"` and moves keyboard focus to `REWIND TO START`.
   - When `onBlack` (`endP > 0.6`) is true, `Frame`, `Nav`, `ScrollPill`, and `SoundToggle` switch cleanly to white-on-black (`#FFFFFF` on `#0A0A0A`).
4. **Seamless Rewind & Replay Intro**:
   - Clicking `REWIND TO START` (or the Cover wordmark from the end screen) resets scroll to `0` under the full-bleed black cover and opens the Orb Iris forward from Cover's orb anchor (`[0.46, 0.37]`) over `~0.58s` to reveal Scene 1 (`s1-causeway`) with zero white frames and zero intermediate scene flashes.
   - Clicking `REPLAY INTRO` on the End Screen replays the full `9.2s` opening sequence from `0.0s`.

---

## Cinematic Intro Sequence: *"Machinery is a projection of the mind"* (`src/config/intro.ts` & `src/chapters/Intro/Intro.tsx`)

1. **Configuration (`src/config/intro.ts` & `src/config/profile.ts`)**:
   - Editable copy in `PROFILE.intro` (`quote: ["MACHINERY IS A", "PROJECTION OF THE MIND"]`, `attribution: "— JONATHAN ERICK CHRISTOVANDY"`).
   - Tunable parameters in [`src/config/intro.ts`](src/config/intro.ts): `enabled`, `seed`, `showOncePerSession`, `skipDurationSec` (`0.6s`), phase durations (`loading: 2.6s`, `quote: 2.4s`, `reveal: 1.4s`, `hold: 1.4s`, `portal: 1.4s`, total `9.2s <= 10.0s`), layout anchors, and GPU memory ceiling (`<= 30MB`).
2. **Single Intro Clock & 5-Phase Choreography (`src/lib/introTimeline.ts`)**:
   - **`0.0–2.6s` (`loading`)**: Black `#0A0A0A` screen, white wordmark, original geometric emblem drawing via `stroke-dashoffset`, hairline progress bar tied to real preload progress, and red mono percentage readout.
   - **`2.6–5.0s` (`quote`)**: Stacked white Shippori Mincho display quote (`2` lines on desktop, `3` lines on mobile `<= 768px`) revealed letter-by-letter via ragged ink-wipe masks.
   - **`5.0–6.4s` (`reveal`)**: Quote lines part vertically (`topLine` up, `bottomLine` down), opening an ink-edged band of warm white paper while the procedural scene draws itself in sequentially via per-pixel stroke timestamps (`order <= uReveal`) and a thin red rule strokes in beneath `"PROJECTION"`.
   - **`6.4–7.8s` (`hold`)**: Band expands to full screen (`>= 65%` white paper, `<= 4%` signal red); the anatomical brain (curl-noise gyri, cross-contour hatching, terminator stippling, 0.8Hz breathing & synapse blink) faces the 3/4 standing mirror containing its mechanical counterpart (rotating gear sprites, reciprocating piston, riveted plates, conduits, hanging cables, and pulsing `#D4141C` red orb core) linked by a dotted projection arc with a traveling red dot.
   - **`7.8–9.2s` (`portal` $\to$ `done`)**: Camera pushes into the mirror and the machine's red orb core opens the Orb Iris reveal directly into Scene 1 (`s1-causeway` Cover), with the HUD fading in during the last 25% of the iris before unlocking scroll at `9.2s`.
3. **Skip, Session Persistence & Scrubber (`[T]`)**:
   - `SKIP ▸` button + `Escape` / `Enter` / `Space` runs a fast (`0.6s`) ink-wipe iris straight into Scene 1 Cover from any phase.
   - Plays once per session (`sessionStorage.getItem('introSeen') === '1'`); `?intro=1` forces play; `?intro=0` bypasses immediately to Cover.
   - Press **`T`** and select **`INTRO`** to scrub `introP` (`0.00s .. 9.20s`) frame-by-frame.

---

## `/dashboard` Route: Eva-01 Telemetry Cockpit & Modular Widget System

### 1. Overview of the Two Routes (`/` and `/dashboard`)
- **`/` (Pilot File Journey)**: The scroll-driven 7-chapter 2.5D manga portfolio (`Lenis` + `GSAP` single-clock choreography) preceded by the 9.2s *"Machinery is a projection of the mind"* intro sequence.
- **`/dashboard` (Eva-01 Telemetry Cockpit)**: A lazy-loaded (`React.lazy`), single-viewport (`100dvh`) interactive stage on the same shared `@react-three/fiber` WebGL canvas.
  - **Left Stage (`~55%` width)**: An original hand-inked **Eva-01 Berserk Silhouette** generated off the main thread in `src/dashboard/eva/evaWorker.ts` (`body`, `head`, `jaw`, `eye`, `pupil`, `glint`, `drips`, `background`), revealed stroke-by-stroke over `1.2s` via a per-pixel draw-order channel (`order <= uReveal`).
  - **Right Stage (`~40%` width)**: The **Red Orb** (`#D4141C`) with black curved hatching, misregistration offset, target reticle ticks, and a hand-inked dashed **Sight Line** (`src/dashboard/shaders/sightLine.frag.glsl`) connecting Eva's eye to the orb.
  - **Gaze Tracking & Input Physics (`src/dashboard/eva.config.ts`)**: Under-damped springs drive pupil slide (`<= 35%` eye radius), head translation (`<= 2.5%`), head rotation (`±6°`), scale (`±1.5%`), proximity-reactive jaw opening (`6°–25°` with attached jagged teeth), and 12fps quantized micro-twitch (`±0.4°` + `1–2px` jaw tremor when wide open). Pointer hover/drag and keyboard arrow keys move the orb while enforcing `orb.minFaceDistance` repulsion.
  - **Presence-Driven Behavior (`src/dashboard/presenceBehavior.ts`)**: Live Lanyard Discord status (`online`, `idle`, `dnd`, `offline`, or `unreachable` fallback) smoothly eases over `0.8s` between behavior profiles—from alert tracking (`online`), to half-lidded droop (`idle`), to locked jaw tension with a black DND bar (`dnd`), to a bowed head, blacked-out eye, and hollow red ring (`offline`).
  - **Shared Lanyard Socket & Deep-Link Isolation**: A module-level singleton WebSocket (`src/hooks/useDiscordPresence.ts`) is shared across `/` and `/dashboard` with zero duplicate sockets (`window.__LANYARD_SOCKET_COUNT__ === 1`). Deep-linking `/dashboard` skips the intro and never marks `sessionStorage.introSeen`, while navigating between `/` and `/dashboard` wipes via the 0.6s **Orb Iris** transition.

---

### 2. Portable Static Deployment (GitHub Pages, Netlify, Vercel)
Because static hosting can target a user domain (`https://<username>.github.io/`), a project subpath (`https://<username>.github.io/<repo>/`), Netlify, or Vercel:
1. **`VITE_BASE` Support**: Both Vite (`vite.config.ts`) and `BrowserRouter` (`src/main.tsx`) read `process.env.VITE_BASE` (default `/`).
2. **Post-Build Route Shell (`scripts/postbuild-routes.mjs`)**: Runs automatically after `npm run build` to emit:
   - `dist/dashboard/index.html` with route-specific `<title>`, `<meta name="description">`, and Open Graph tags (`/og-dashboard.svg`) so `/dashboard/` returns a real **HTTP 200** on every static host.
   - `dist/404.html` using the `spa-github-pages` redirect technique paired with the restore script in `index.html`, so arbitrary deep links gracefully restore without server config.
3. **Host Configs Included**:
   - **GitHub Pages (`.github/workflows/deploy.yml`)**: Uses `actions/deploy-pages@v4`. For a user site (`<username>.github.io`), leave `VITE_BASE=/`. For a project site (`<username>.github.io/<repo>/`), set repository variable `VITE_BASE=/<repo>/`.
   - **Netlify (`public/_redirects`)**: Ships `/dashboard /dashboard/index.html 200` and `/* /index.html 200`.
   - **Vercel (`vercel.json`)**: Rewrites `/dashboard` and `/dashboard/` to `/dashboard/index.html` and fallback routes to `/index.html`.
4. **Local GitHub Pages Emulator (`scripts/serve-like-ghpages.mjs`)**:
   ```bash
   npm run build
   npm run preview:ghpages
   ```
   Mimics GitHub Pages locally on `http://127.0.0.1:4173`: serves static files from `dist/`, redirects `/dashboard` $\to$ `301 /dashboard/`, serves `dist/dashboard/index.html` with status `200`, and serves `dist/404.html` with status `404` for unknown paths.

---

### 3. How to Add a New Dashboard Widget in 5 Steps
The widget rail (`rail-1`, `rail-2`, `rail-3`) and bottom dock (`dock-left`, `dock-right`) are driven by [`src/dashboard/widgets/registry.ts`](src/dashboard/widgets/registry.ts) and [`src/dashboard/layout.config.ts`](src/dashboard/layout.config.ts). Empty or disabled slots automatically render the `"UNASSIGNED // AWAITING SIGNAL"` placeholder frame.

1. **Create your widget component** in `src/dashboard/widgets/MyCustomWidget.tsx`:
   ```tsx
   import React from 'react';
   import { useSharedSecondTicker } from './useSharedTicker';

   export const MyCustomWidget: React.FC = () => {
     const nowMs = useSharedSecondTicker();
     return (
       <div className="flex flex-col gap-1.5 font-mono text-[11px] text-ink">
         <div className="flex items-center justify-between border-b border-ink/20 pb-1">
           <span className="font-bold tracking-wider">SIGNAL LOCK</span>
           <span className="text-red font-bold">NOMINAL</span>
         </div>
         <div className="text-[10px] tracking-widest uppercase">
           FRAME TICK // {Math.floor(nowMs / 1000)}S
         </div>
       </div>
     );
   };
   ```
2. **Import and register the widget** in [`src/dashboard/widgets/registry.ts`](src/dashboard/widgets/registry.ts) using `defineWidget`:
   ```tsx
   import { MyCustomWidget } from './MyCustomWidget';

   // Inside WIDGETS array:
   defineWidget({
     id: 'my-custom-widget',
     title: 'CUSTOM TELEMETRY',
     kicker: 'SYS.06 // PROBE',
     slot: 'dock-left',
     size: 'sm',
     enabled: true,
     requires: ['none'],
     component: MyCustomWidget,
   }),
   ```
3. **Assign its desktop slot** in [`src/dashboard/layout.config.ts`](src/dashboard/layout.config.ts):
   ```ts
   desktopSlots: {
     'rail-1': 'discord-presence',
     'rail-2': 'spotify',
     'rail-3': 'activity',
     'dock-left': 'my-custom-widget',
     'dock-right': 'now-building',
   },
   ```
4. **Add its ID to `mobileOrder`** in [`src/dashboard/layout.config.ts`](src/dashboard/layout.config.ts) if it should appear in the stacked `<768px` drawer.
5. **Run verification**: Execute `npm run check:palette && npm run check:dashboard` to verify palette compliance and zero stage overlap.

*(Note: Three ready-to-enable stub widgets—`ClockWidget.tsx`, `NowBuildingWidget.tsx`, and `GithubActivityWidget.tsx`—are already wired in `src/dashboard/widgets/` and can be activated simply by flipping `enabled: true` in `registry.ts`.)*

---

### 4. Custom Hand-Drawn Eva-01 Layer Overrides (`public/eva/*.png`)
Every procedural Eva-01 layer generated by `src/dashboard/eva/evaGenerator.ts` supports drop-in PNG overrides with zero shader changes:
1. Create `/public/eva/` and drop any of the following transparent PNGs (matching the strict `#0A0A0A` ink / `#FAFAF8` paper palette):
   - `public/eva/background.png` (`1024×1024`) — Radial speed lines & ink spatter behind the head
   - `public/eva/body.png` (`1024×1024`) — Neck, chest V-seam, and left/right shoulder pylons with chevron grooves
   - `public/eva/head.png` (`1024×1024`) — Forward-leaning helmet, horn, brow & cheek armor seams, upper jagged teeth
   - `public/eva/jaw.png` (`1024×1024`) — Hinged lower jaw plate, chin spur, and lower row of jagged teeth
   - `public/eva/eye.png` (`256×256`) — White negative-space eye aperture
   - `public/eva/pupil.png` (`256×256`) — Sliding ink pupil disc
   - `public/eva/drips.png` (`512×512`) — Looping vertical ink drips off the jaw and horn
2. Set `enablePngOverrides: true` in [`src/dashboard/eva.config.ts`](src/dashboard/eva.config.ts) (or `window.__ENABLE_EVA_PNG_OVERRIDES__ = true` in the console). Any layer with a matching PNG in `public/eva/<layer>.png` will load that file while remaining layers fall back to the procedural worker art.

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Verify strict palette compliance
npm run check:palette

# Run /dashboard 6-suite verification & generate 7 visual state PNGs
npm run check:dashboard

# Run cinematic intro verification suite & generate 10 key-moment screenshots
npm run check:intro

# Run single-clock transition & S7 finale verification suite
npm run check:transitions

# Run linter & production build (including /dashboard/index.html & 404.html)
npm run lint
npm run build

# Test portable static build on the local GitHub Pages emulator
npm run preview:ghpages
```


