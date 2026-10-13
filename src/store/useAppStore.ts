import { create } from 'zustand';
import {
  INTRO_CONFIG,
  computeIntroPhaseFromElapsed,
  type IntroPhase,
} from '../config/intro';
import {
  SCENES_CONFIG,
  type SceneId,
  type SceneTransitionType,
} from '../config/scenes.config';
import { STAGE_CONFIG, type BeatMode } from '../config/stage';

/**
 * Evaluates whether the cinematic intro should play on initial page load:
 * - `?intro=1` forces play even if `sessionStorage.introSeen` is set.
 * - `?intro=0` or `!INTRO_CONFIG.enabled` bypasses immediately to `'done'`.
 * - Otherwise plays unless `INTRO_CONFIG.showOncePerSession` and `sessionStorage.getItem('introSeen') === '1'`.
 */
export function shouldPlayIntroOnBoot(): boolean {
  if (!INTRO_CONFIG.enabled) return false;
  if (typeof window === 'undefined') return true;
  try {
    const params = new URLSearchParams(window.location.search);
    const introParam = params.get('intro');
    if (introParam === '0') return false;
    if (introParam === '1') return true;
    if (INTRO_CONFIG.showOncePerSession) {
      const seen = window.sessionStorage?.getItem(INTRO_CONFIG.sessionStorageKey);
      if (seen === '1') return false;
    } else {
      window.sessionStorage?.removeItem(INTRO_CONFIG.sessionStorageKey);
    }
  } catch {
    // Ignore storage/security errors in restricted contexts
  }
  return true;
}

export type ChapterId =
  | 'cover'
  | 'about'
  | 'work'
  | 'status'
  | 'skills'
  | 'timeline'
  | 'contact';

export interface ChapterMeta {
  id: ChapterId;
  sceneId: SceneId;
  number: string;
  title: string;
  jpSubtitle: string;
  caption: string;
  mode: BeatMode;
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 'cover',
    sceneId: 's1-causeway',
    number: '01',
    title: 'THE CAUSEWAY',
    jpSubtitle: '壱 // 参道',
    caption: 'THE STEPPING STONES CROSS EMPTY GROUND. AHEAD, THE TWIN MONOLITH AWAITS.',
    mode: 'scene',
  },
  {
    id: 'about',
    sceneId: 's2-observation',
    number: '02',
    title: 'THE OBSERVATION ROOM',
    jpSubtitle: '弐 // 観測室',
    caption: 'DOSSIER UNSEALED. THROUGH THE BULKHEAD APERTURE, THE MONOLITH HOLDS STEADY.',
    mode: 'page',
  },
  {
    id: 'work',
    sceneId: 's3-archive-city',
    number: '03',
    title: 'THE ARCHIVE CITY',
    jpSubtitle: '参 // 記録都市',
    caption: 'HIGH ABOVE THE STEPPED ROOFTOPS AND BLACK CANAL, FIELD ARTIFACTS ARE INDEXED.',
    mode: 'page',
  },
  {
    id: 'status',
    sceneId: 's4-plug',
    number: '04',
    title: 'THE PLUG',
    jpSubtitle: '肆 // 同調槽',
    caption: 'CONCENTRIC RIPPLES PULSE AROUND THE SUBMERGED CORE VIA LANYARD TELEMETRY.',
    mode: 'scene',
  },
  {
    id: 'skills',
    sceneId: 's5-three-pillars',
    number: '05',
    title: 'THE THREE PILLARS',
    jpSubtitle: '伍 // 三柱',
    caption: 'THREE COLOSSAL MONOLITHS CONVERGE TOWARD THE PULSING HEXAGONAL ZENITH.',
    mode: 'page',
  },
  {
    id: 'timeline',
    sceneId: 's6-long-scroll',
    number: '06',
    title: 'THE LONG SCROLL',
    jpSubtitle: '陸 // 絵巻',
    caption: 'A HORIZONTAL PANORAMA OF RUINED ARCHES, ELEVATED RAILS, AND MILESTONE BEACONS.',
    mode: 'page',
  },
  {
    id: 'contact',
    sceneId: 's7-threshold',
    number: '07',
    title: 'THE THRESHOLD',
    jpSubtitle: '漆 // 境界門',
    caption: 'BEFORE THE MONUMENTAL STONE DOORWAY. STEP ACROSS THE THRESHOLD.',
    mode: 'scene',
  },
];

export type DiscordStatusType = 'online' | 'idle' | 'dnd' | 'offline';

export interface DiscordActivity {
  name: string;
  type: number;
  details?: string;
  state?: string;
  timestamps?: {
    start?: number;
    end?: number;
  };
  application_id?: string;
}

export interface SpotifyData {
  track_id: string;
  timestamps: {
    start: number;
    end: number;
  };
  song: string;
  artist: string;
  album_art_url: string;
  album: string;
}

export interface DiscordPresenceState {
  status: DiscordStatusType;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  customStatus: string | null;
  activities: DiscordActivity[];
  listeningToSpotify: boolean;
  spotify: SpotifyData | null;
  connected: boolean;
  usingFallback: boolean;
  lastUpdated: number;
}

export interface ChapterProgressMetrics {
  enterP: number;
  holdP: number;
  exitP: number;
}

/**
 * Single authoritative transition clock & chapter state consumed by:
 * - WebGL Scene & CameraRig
 * - PostInk Orb Iris / Panel Slice / Doorway Finale shader
 * - Pinned Manga Panel layer
 * - HUD Nav / Frame / ScrollPill / EndScreen
 */
export interface ChapterState {
  fromIndex: number;
  toIndex: number;
  from: ChapterId;
  to: ChapterId;
  fromScene: SceneId;
  toScene: SceneId;
  /** Single transition scalar tau in [0, 1] per boundary */
  tau: number;
  /** Active boundary index in [0..5] */
  boundaryIndex: number;
  /** Authoritative chapter identity: `to` when tau >= 0.5, `from` otherwise */
  displayChapter: ChapterId;
  /** Authoritative scene index: `toIndex` when tau >= 0.5, `fromIndex` otherwise */
  displaySceneIndex: number;
  transitionType: SceneTransitionType;
}

export interface DebugScrubberState {
  enabled: boolean;
  mode: 'boundary' | 'finale' | 'intro';
  boundaryIndex: number;
  tau: number;
  endP: number;
  introP: number;
  playing: boolean;
}

export interface ScrollStateUpdate {
  rawScrollProgress?: number;
  virtualProgress?: number;
  scrollProgress: number;
  activeChapter: ChapterId;
  activeSceneIndex: number;
  sceneLocalProgress: number;
  transitionProgress: number;
  transitionType: SceneTransitionType;
  chapterTransitionBleed: number;
  isPageOpaque: boolean;
  chapterProgress: Record<ChapterId, ChapterProgressMetrics>;
  chapterState?: ChapterState;
  isGateClamped?: boolean;
  enterP: number;
  holdP: number;
  exitP: number;
  endP?: number;
  onBlack?: boolean;
}

interface AppState {
  // Loading & Cinematic Intro state (Single Intro Clock)
  loadProgress: number;
  isLoaded: boolean;
  setLoadProgress: (progress: number) => void;
  setIsLoaded: (loaded: boolean) => void;

  introState: IntroPhase;
  introP: number;
  introElapsedSec: number;
  introAssetsReady: boolean;
  isSkippingIntro: boolean;
  skipProgress: number;
  setIntroTelemetry: (update: {
    introState?: IntroPhase;
    introP?: number;
    introElapsedSec?: number;
    isSkippingIntro?: boolean;
    skipProgress?: number;
  }) => void;
  setIntroAssetsReady: (ready: boolean) => void;
  triggerSkipIntro: (() => void) | null;
  setTriggerSkipIntro: (fn: (() => void) | null) => void;
  triggerReplayIntro: (() => void) | null;
  setTriggerReplayIntro: (fn: (() => void) | null) => void;

  // Per-scene GPU readiness map (art generated + textures uploaded + shaders compiled)
  sceneReadyMap: Record<SceneId, boolean>;
  setSceneReady: (sceneId: SceneId, ready: boolean) => void;

  // Scroll, Virtual Progress, Single-Clock ChapterState & Transition state
  rawScrollProgress: number;
  virtualProgress: number;
  scrollProgress: number;
  isGateClamped: boolean;
  hasScrolled: boolean;
  activeChapter: ChapterId;
  activeSceneIndex: number;
  activeSceneId: SceneId;
  sceneLocalProgress: number;
  transitionProgress: number;
  transitionType: SceneTransitionType;
  activeBeatMode: BeatMode;
  isPageOpaque: boolean;
  chapterTransitionBleed: number;
  chapterProgress: Record<ChapterId, ChapterProgressMetrics>;
  chapterState: ChapterState;
  enterP: number;
  holdP: number;
  exitP: number;
  /** S7 Doorway-closing finale scalar [0..1] derived strictly from single clock */
  endP: number;
  /** True when endP > 0.6 or during seamless rewind, switching HUD to white-on-black */
  onBlack: boolean;
  setScrollState: (update: ScrollStateUpdate) => void;

  // Seamless Rewind state (EndScreen -> Cover iris reveal without scrolling intermediate chapters)
  isRewinding: boolean;
  rewindRevealP: number;
  setRewindState: (update: { isRewinding?: boolean; rewindRevealP?: number }) => void;
  triggerRewind: (() => void) | null;
  setTriggerRewind: (fn: (() => void) | null) => void;

  // Keyboard navigation tracking so focus moves to REWIND TO START when arriving via keyboard
  lastInputWasKeyboard: boolean;
  setLastInputWasKeyboard: (v: boolean) => void;

  // Dev transition scrubber state
  debugScrubber: DebugScrubberState;
  setDebugScrubber: (update: Partial<DebugScrubberState>) => void;

  // Repo hover state for S3 Archive City district highlight
  hoveredRepoIndex: number | null;
  setHoveredRepoIndex: (idx: number | null) => void;

  // Mouse / Gyro Parallax normalized [-1, 1]
  mouseTarget: [number, number];
  setMouseTarget: (x: number, y: number) => void;

  // Audio state (OFF by default, user-initiated only)
  audioEnabled: boolean;
  toggleAudio: () => void;

  // Accessibility & Environment
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
  isMobile: boolean;
  setIsMobile: (mobile: boolean) => void;

  // Live Discord Presence
  discord: DiscordPresenceState;
  setDiscordPresence: (presence: Partial<DiscordPresenceState>) => void;

  // Programmatic scroll request callback registered by useLenis
  scrollToTarget: ((target: string | number) => void) | null;
  setScrollToTarget: (fn: ((target: string | number) => void) | null) => void;
}

const initialChapterState: ChapterState = {
  fromIndex: 0,
  toIndex: 1,
  from: 'cover',
  to: 'about',
  fromScene: 's1-causeway',
  toScene: 's2-observation',
  tau: 0,
  boundaryIndex: 0,
  displayChapter: 'cover',
  displaySceneIndex: 0,
  transitionType: SCENES_CONFIG[0].transitionOut,
};

const initialPlayIntro = shouldPlayIntroOnBoot();

export const useAppStore = create<AppState>((set) => ({
  loadProgress: initialPlayIntro ? 0 : 100,
  isLoaded: !initialPlayIntro,
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setIsLoaded: (isLoaded) => set({ isLoaded }),

  introState: initialPlayIntro ? 'loading' : 'done',
  introP: initialPlayIntro ? 0 : 1,
  introElapsedSec: initialPlayIntro ? 0 : INTRO_CONFIG.totalDurationSec,
  introAssetsReady: false,
  isSkippingIntro: false,
  skipProgress: 0,
  setIntroTelemetry: (u) =>
    set((state) => {
      const nextElapsed =
        u.introElapsedSec ??
        (u.introP !== undefined ? u.introP * INTRO_CONFIG.totalDurationSec : state.introElapsedSec);
      const nextP =
        u.introP ??
        (u.introElapsedSec !== undefined
          ? Math.max(0, Math.min(1, u.introElapsedSec / INTRO_CONFIG.totalDurationSec))
          : state.introP);
      const nextState = u.introState ?? computeIntroPhaseFromElapsed(nextElapsed);
      return {
        introState: nextState,
        introP: nextP,
        introElapsedSec: nextElapsed,
        isSkippingIntro: u.isSkippingIntro ?? state.isSkippingIntro,
        skipProgress: u.skipProgress ?? state.skipProgress,
        isLoaded: nextState === 'done' ? true : state.isLoaded,
      };
    }),
  setIntroAssetsReady: (introAssetsReady) => set({ introAssetsReady }),
  triggerSkipIntro: null,
  setTriggerSkipIntro: (triggerSkipIntro) => set({ triggerSkipIntro }),
  triggerReplayIntro: null,
  setTriggerReplayIntro: (triggerReplayIntro) => set({ triggerReplayIntro }),

  sceneReadyMap: {
    's1-causeway': false,
    's2-observation': false,
    's3-archive-city': false,
    's4-plug': false,
    's5-three-pillars': false,
    's6-long-scroll': false,
    's7-threshold': false,
  },
  setSceneReady: (sceneId, ready) =>
    set((state) => {
      if (state.sceneReadyMap[sceneId] === ready) return state;
      return {
        sceneReadyMap: {
          ...state.sceneReadyMap,
          [sceneId]: ready,
        },
      };
    }),

  rawScrollProgress: 0,
  virtualProgress: 0,
  scrollProgress: 0,
  isGateClamped: false,
  hasScrolled: false,
  activeChapter: 'cover',
  activeSceneIndex: 0,
  activeSceneId: SCENES_CONFIG[0].id,
  sceneLocalProgress: 0,
  transitionProgress: 0,
  transitionType: SCENES_CONFIG[0].transitionOut,
  activeBeatMode: 'scene',
  isPageOpaque: false,
  chapterTransitionBleed: 0,
  chapterProgress: {
    cover: { enterP: 1, holdP: 0, exitP: 0 },
    about: { enterP: 0, holdP: 0, exitP: 0 },
    work: { enterP: 0, holdP: 0, exitP: 0 },
    status: { enterP: 0, holdP: 0, exitP: 0 },
    skills: { enterP: 0, holdP: 0, exitP: 0 },
    timeline: { enterP: 0, holdP: 0, exitP: 0 },
    contact: { enterP: 0, holdP: 0, exitP: 0 },
  },
  chapterState: initialChapterState,
  enterP: 1,
  holdP: 0,
  exitP: 0,
  endP: 0,
  onBlack: false,
  setScrollState: (u) =>
    set((state) => {
      const clampedIdx = Math.max(0, Math.min(SCENES_CONFIG.length - 1, u.activeSceneIndex));
      const derivedChapterState: ChapterState = u.chapterState ?? {
        fromIndex: clampedIdx,
        toIndex: Math.min(SCENES_CONFIG.length - 1, clampedIdx + 1),
        from: SCENES_CONFIG[clampedIdx].chapterId,
        to: SCENES_CONFIG[Math.min(SCENES_CONFIG.length - 1, clampedIdx + 1)].chapterId,
        fromScene: SCENES_CONFIG[clampedIdx].id,
        toScene: SCENES_CONFIG[Math.min(SCENES_CONFIG.length - 1, clampedIdx + 1)].id,
        tau: u.transitionProgress,
        boundaryIndex: Math.min(SCENES_CONFIG.length - 2, clampedIdx),
        displayChapter:
          u.transitionProgress >= 0.5
            ? SCENES_CONFIG[Math.min(SCENES_CONFIG.length - 1, clampedIdx + 1)].chapterId
            : SCENES_CONFIG[clampedIdx].chapterId,
        displaySceneIndex:
          u.transitionProgress >= 0.5
            ? Math.min(SCENES_CONFIG.length - 1, clampedIdx + 1)
            : clampedIdx,
        transitionType: u.transitionType,
      };

      const nextEndP = u.endP ?? 0;
      const nextOnBlack =
        u.onBlack ?? (nextEndP > 0.6 || (state.isRewinding && state.rewindRevealP < 0.45));

      return {
        rawScrollProgress: u.rawScrollProgress ?? u.scrollProgress,
        virtualProgress: u.virtualProgress ?? u.scrollProgress,
        scrollProgress: u.scrollProgress,
        isGateClamped: u.isGateClamped ?? false,
        activeChapter: derivedChapterState.displayChapter,
        activeSceneIndex: clampedIdx,
        activeSceneId: SCENES_CONFIG[clampedIdx].id,
        sceneLocalProgress: u.sceneLocalProgress,
        transitionProgress: derivedChapterState.tau,
        transitionType: derivedChapterState.transitionType,
        activeBeatMode: STAGE_CONFIG[derivedChapterState.displayChapter].mode,
        isPageOpaque: false,
        chapterTransitionBleed: u.chapterTransitionBleed,
        chapterProgress: u.chapterProgress ?? state.chapterProgress,
        chapterState: derivedChapterState,
        enterP: u.enterP ?? state.enterP,
        holdP: u.holdP ?? state.holdP,
        exitP: u.exitP ?? state.exitP,
        endP: nextEndP,
        onBlack: nextOnBlack,
        hasScrolled: state.hasScrolled || u.scrollProgress > 0.008,
      };
    }),

  isRewinding: false,
  rewindRevealP: 0,
  setRewindState: (update) =>
    set((state) => {
      const nextIsRewinding = update.isRewinding ?? state.isRewinding;
      const nextRewindRevealP = update.rewindRevealP ?? state.rewindRevealP;
      return {
        isRewinding: nextIsRewinding,
        rewindRevealP: nextRewindRevealP,
        onBlack: state.endP > 0.6 || (nextIsRewinding && nextRewindRevealP < 0.45),
      };
    }),
  triggerRewind: null,
  setTriggerRewind: (triggerRewind) => set({ triggerRewind }),

  lastInputWasKeyboard: false,
  setLastInputWasKeyboard: (lastInputWasKeyboard) => set({ lastInputWasKeyboard }),

  debugScrubber: {
    enabled: false,
    mode: 'boundary',
    boundaryIndex: 0,
    tau: 0,
    endP: 0,
    introP: 0,
    playing: false,
  },
  setDebugScrubber: (update) =>
    set((state) => ({
      debugScrubber: {
        ...state.debugScrubber,
        ...update,
      },
    })),

  hoveredRepoIndex: null,
  setHoveredRepoIndex: (hoveredRepoIndex) => set({ hoveredRepoIndex }),

  mouseTarget: [0, 0],
  setMouseTarget: (x, y) => set({ mouseTarget: [x, y] }),

  audioEnabled: false,
  toggleAudio: () => set((state) => ({ audioEnabled: !state.audioEnabled })),

  reducedMotion: false,
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  isMobile: false,
  setIsMobile: (isMobile) => set({ isMobile }),

  discord: {
    status: 'offline',
    username: 'christovandy',
    displayName: 'Jonathan Erick Christovandy',
    avatarUrl: null,
    customStatus: null,
    activities: [],
    listeningToSpotify: false,
    spotify: null,
    connected: false,
    usingFallback: true,
    lastUpdated: Date.now(),
  },
  setDiscordPresence: (presence) =>
    set((state) => ({
      discord: {
        ...state.discord,
        ...presence,
        lastUpdated: Date.now(),
      },
    })),

  scrollToTarget: null,
  setScrollToTarget: (scrollToTarget) => set({ scrollToTarget }),
}));
