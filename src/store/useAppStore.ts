import { create } from 'zustand';
import { STAGE_CONFIG, type BeatMode } from '../config/stage';

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
  number: string;
  title: string;
  jpSubtitle: string;
  caption: string;
  mode: BeatMode;
}

export const CHAPTERS: ChapterMeta[] = [
  {
    id: 'cover',
    number: '01',
    title: 'THE ENTRY PLUG',
    jpSubtitle: '壱 // 起動',
    caption: 'THE STEPPING STONES CROSS EMPTY GROUND. AHEAD, THE TWIN MONOLITH AWAITS.',
    mode: 'scene',
  },
  {
    id: 'about',
    number: '02',
    title: 'PERSONNEL FILE',
    jpSubtitle: '弐 // 人事記録',
    caption: 'DOSSIER UNSEALED. HARMONICS REMAIN WITHIN TOLERANCE.',
    mode: 'page',
  },
  {
    id: 'work',
    number: '03',
    title: 'THE WORK',
    jpSubtitle: '参 // 開発記録',
    caption: 'FIELD ARTIFACTS RECOVERED FROM PUBLIC REPOSITORY TRANSMISSIONS.',
    mode: 'page',
  },
  {
    id: 'status',
    number: '04',
    title: 'PILOT STATUS',
    jpSubtitle: '肆 // 同調率',
    caption: 'REAL-TIME NEURAL LINK TELEMETRY VIA LANYARD SOCKET.',
    mode: 'scene',
  },
  {
    id: 'skills',
    number: '05',
    title: 'MAGI SYSTEM',
    jpSubtitle: '伍 // 三賢人',
    caption: 'MELCHIOR, BALTHASAR, AND CASPAR CONCUR: UNANIMOUS APPROVAL.',
    mode: 'page',
  },
  {
    id: 'timeline',
    number: '06',
    title: 'CHRONOLOGY',
    jpSubtitle: '陸 // 航跡',
    caption: 'EACH MILESTONE ETCHED IN INK ALONG THE APPROACH VECTOR.',
    mode: 'page',
  },
  {
    id: 'contact',
    number: '07',
    title: 'FINAL PANEL',
    jpSubtitle: '漆 // 終局',
    caption: 'AT THE FOOT OF THE TWIN MONOLITH. OPEN A DIRECT CHANNEL.',
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

interface AppState {
  // Loading & Chapter 0 state
  loadProgress: number;
  isLoaded: boolean;
  setLoadProgress: (progress: number) => void;
  setIsLoaded: (loaded: boolean) => void;

  // Scroll, Beat Mode & Navigation state
  scrollProgress: number;
  hasScrolled: boolean;
  activeChapter: ChapterId;
  activeBeatMode: BeatMode;
  isPageOpaque: boolean;
  chapterTransitionBleed: number;
  setScrollState: (
    progress: number,
    activeChapter: ChapterId,
    bleed: number,
    isPageOpaque: boolean,
  ) => void;

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

export const useAppStore = create<AppState>((set) => ({
  loadProgress: 0,
  isLoaded: false,
  setLoadProgress: (loadProgress) => set({ loadProgress }),
  setIsLoaded: (isLoaded) => set({ isLoaded }),

  scrollProgress: 0,
  hasScrolled: false,
  activeChapter: 'cover',
  activeBeatMode: 'scene',
  isPageOpaque: false,
  chapterTransitionBleed: 0,
  setScrollState: (scrollProgress, activeChapter, chapterTransitionBleed, isPageOpaque) =>
    set((state) => ({
      scrollProgress,
      activeChapter,
      activeBeatMode: STAGE_CONFIG[activeChapter].mode,
      isPageOpaque,
      chapterTransitionBleed,
      hasScrolled: state.hasScrolled || scrollProgress > 0.008,
    })),

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
