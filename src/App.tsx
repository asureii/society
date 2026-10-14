import React, { Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { About } from './chapters/About';
import { Contact } from './chapters/Contact';
import { Cover } from './chapters/Cover';
import { Intro } from './chapters/Intro/Intro';
import { Skills } from './chapters/Skills';
import { Status } from './chapters/Status';
import { Timeline } from './chapters/Timeline';
import { Work } from './chapters/Work';
import { INTRO_CONFIG } from './config/intro';
import { SCENES_CONFIG } from './config/scenes.config';
import { TOTAL_SCROLL_HEIGHT_VH } from './config/scroll.config';
import { prefetchDashboardRoute } from './dashboard/prefetchDashboard';
import { STAGE_DASHBOARD_CONFIG } from './dashboard/stage.config';
import { useDiscordPresence } from './hooks/useDiscordPresence';
import { useHudCollisionCheck } from './hooks/useHudCollisionCheck';
import { evaluateSingleClockState, useLenis } from './hooks/useLenis';
import { useMouseParallax } from './hooks/useMouseParallax';
import { useReducedMotion } from './hooks/useReducedMotion';
import { gsap } from './lib/gsap';
import { generateSceneArt, isSceneReady } from './scene/art';
import { Scene } from './scene/Scene';
import {
  isDashboardPath,
  useAppStore,
  type AppRoute,
} from './store/useAppStore';
import { EndScreen } from './ui/EndScreen';
import { Frame } from './ui/Frame';
import { Nav } from './ui/Nav';
import { ScrollPill } from './ui/ScrollPill';
import { SoundToggle } from './ui/SoundToggle';
import { TransitionScrubber } from './ui/TransitionScrubber';

const LazyDashboardPage = React.lazy(prefetchDashboardRoute);

function updateRouteDocumentMeta(route: AppRoute): void {
  if (typeof document === 'undefined') return;
  const isDash = route === '/dashboard';
  const title = isDash
    ? 'DASHBOARD // EVA-01 TELEMETRY — JONATHAN ERICK CHRISTOVANDY'
    : 'PILOT FILE // JONATHAN ERICK CHRISTOVANDY';
  const description = isDash
    ? 'Live Discord telemetry cockpit and hand-inked Eva-01 berserk silhouette for Jonathan Erick Christovandy.'
    : 'Interactive 2.5D manga portfolio dossier of Jonathan Erick Christovandy — Developer, Creative Technologist, and Systems Architect.';
  const ogImage = isDash ? '/og-dashboard.svg' : '/og-image.svg';

  document.title = title;

  const setMeta = (selector: string, content: string) => {
    const el = document.querySelector<HTMLMetaElement>(selector);
    if (el) el.setAttribute('content', content);
  };

  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:image"]', ogImage);
}

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const HomeRoute: React.FC = () => {
  useLenis();
  useHudCollisionCheck();

  const rt = useAppStore((s) => s.routeTransition);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const pinnedLayerRef = useRef<HTMLElement | null>(null);

  // Animate pinned chapter panels OUT when leaving Home towards Dashboard
  useEffect(() => {
    if (!pinnedLayerRef.current) return;
    if (rt.active && rt.direction === 'to-dashboard') {
      if (reducedMotion) {
        pinnedLayerRef.current.style.opacity = '0';
      } else {
        gsap.to(pinnedLayerRef.current, {
          x: -50,
          opacity: 0,
          duration: 0.28,
          ease: 'power2.in',
        });
      }
    }
  }, [rt.active, rt.direction, reducedMotion]);

  // Animate pinned chapter panels IN when landing on Home
  useIsomorphicLayoutEffect(() => {
    if (!pinnedLayerRef.current) return;
    const isDone = useAppStore.getState().introState === 'done';
    if (!isDone) return;
    if (reducedMotion) {
      pinnedLayerRef.current.style.opacity = '1';
    } else {
      gsap.fromTo(
        pinnedLayerRef.current,
        { x: -50, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.44,
          ease: 'power3.out',
          clearProps: 'transform,opacity',
        }
      );
    }
  }, [reducedMotion]);

  return (
    <>
      {/* Chapter 0: Cinematic Intro Sequence ("Machinery is a projection of the mind") */}
      <Intro />

      {/* Full-Bleed "THE END?" Finale Overlay (active at endP >= 0.92, inert otherwise) */}
      <EndScreen />

      {/* 1. Single Scroll Spacer Element: Drives the native single scrollbar via Lenis */}
      <div
        id="scroll-spacer"
        style={{ height: `${TOTAL_SCROLL_HEIGHT_VH}vh` }}
        className="w-full pointer-events-none"
        aria-hidden="true"
      />

      {/* 2. Single Fixed Pinned Panel Layer: position: fixed; inset: 0; pointer-events: none */}
      <main
        ref={pinnedLayerRef}
        id="pinned-panel-layer"
        className="fixed inset-0 pointer-events-none z-10 overflow-hidden"
        aria-label="Pilot Chapters"
      >
        {/* S1 · Cover · "The Causeway" */}
        <Cover />

        {/* S2 · Dossier · "The Observation Room" */}
        <About />

        {/* S3 · The Work · "The Archive City" */}
        <Work />

        {/* S4 · Pilot Status · "The Plug" */}
        <Status />

        {/* S5 · Skills · "The Three Pillars" */}
        <Skills />

        {/* S6 · Timeline · "The Long Scroll" */}
        <Timeline />

        {/* S7 · Contact · "The Threshold" */}
        <Contact />
      </main>
    </>
  );
};

const AppShell: React.FC = () => {
  useReducedMotion();
  useMouseParallax();
  useDiscordPresence();

  const location = useLocation();
  const navigate = useNavigate();
  const isLoaded = useAppStore((s) => s.isLoaded);
  const activeRoute = useAppStore((s) => s.activeRoute);
  const routeTweenRef = useRef<gsap.core.Tween | null>(null);
  const transitioningRef = useRef<boolean>(false);

  // Prefetch dashboard chunk on idle once the current page is loaded
  useEffect(() => {
    if (!isLoaded || activeRoute === '/dashboard') return;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === 'function') {
      const id = win.requestIdleCallback(
        () => {
          void prefetchDashboardRoute();
        },
        { timeout: 2500 },
      );
      return () => {
        if (typeof win.cancelIdleCallback === 'function') {
          win.cancelIdleCallback(id);
        }
      };
    } else {
      const timer = window.setTimeout(() => {
        void prefetchDashboardRoute();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [activeRoute, isLoaded]);

  // Keep SEO meta tags & store activeRoute synced with browser URL changes (e.g. Back/Forward)
  useEffect(() => {
    const urlRoute: AppRoute = isDashboardPath(location.pathname) ? '/dashboard' : '/';
    updateRouteDocumentMeta(urlRoute);

    if (transitioningRef.current) return;

    const state = useAppStore.getState();
    if (state.activeRoute !== urlRoute) {
      if (urlRoute === '/') {
        // Returning to '/' never replays the intro and lands on the Cover
        state.setIntroTelemetry({
          introState: 'done',
          introP: 1,
          introElapsedSec: INTRO_CONFIG.totalDurationSec,
          isSkippingIntro: false,
          skipProgress: 0,
        });
        state.setIsLoaded(true);
        if (!isSceneReady('s1-causeway')) {
          void generateSceneArt('s1-causeway', {
            singleVariantOnly: state.isMobile || state.reducedMotion,
            isMobile: state.isMobile,
            urgent: true,
          });
        }
        const coverScroll = evaluateSingleClockState(0, 0, state.reducedMotion, false);
        state.setScrollState(coverScroll);
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
      state.setActiveRoute(urlRoute);
    }
  }, [location.pathname]);

  // Register single-clock route transition controller (Orb Iris wipe / reduced-motion cross-fade)
  useEffect(() => {
    const executeRouteTransition = async (
      targetRoute: AppRoute,
      clickOriginUv?: [number, number],
    ) => {
      const state = useAppStore.getState();
      if (transitioningRef.current || state.activeRoute === targetRoute) {
        return;
      }
      transitioningRef.current = true;

      if (routeTweenRef.current) {
        routeTweenRef.current.kill();
        routeTweenRef.current = null;
      }

      if (targetRoute === '/dashboard') {
        const curScene =
          SCENES_CONFIG[state.chapterState.fromIndex] ?? SCENES_CONFIG[0];
        const originUv: [number, number] =
          state.endP >= 0.85 && clickOriginUv
            ? clickOriginUv
            : curScene.orb?.pos ?? clickOriginUv ?? [0.46, 0.37];
        const targetUv: [number, number] = state.isMobile
          ? STAGE_DASHBOARD_CONFIG.orb.mobileDefaultPos
          : STAGE_DASHBOARD_CONFIG.orb.defaultPos;

        // Readiness gate: preload dashboard chunk & wait for dashboard WebGL readiness
        await prefetchDashboardRoute();
        state.setDashboardRevealP(1.0);

        state.setRouteTransition({
          active: true,
          direction: 'to-dashboard',
          progress: 0.001,
          originUv,
          targetUv,
        });

        const proxy = { p: 0.001 };
        const duration = state.reducedMotion ? 0.25 : 0.72;

        routeTweenRef.current = gsap.to(proxy, {
          p: 1,
          duration,
          ease: state.reducedMotion ? 'none' : 'power2.inOut',
          onUpdate: () => {
            useAppStore.getState().setRouteTransition({ progress: proxy.p });
          },
          onComplete: () => {
            const st = useAppStore.getState();
            st.setActiveRoute('/dashboard');
            st.setDashboardRevealP(1.0);
            navigate('/dashboard');
            window.scrollTo({ top: 0, behavior: 'auto' });
            requestAnimationFrame(() => {
              useAppStore.getState().setRouteTransition({ active: false, progress: 0 });
              transitioningRef.current = false;
            });
          },
        });
      } else {
        // Transition '/dashboard' -> '/': ensure Cover ('s1-causeway') is GPU-ready and intro is skipped
        state.setIntroTelemetry({
          introState: 'done',
          introP: 1,
          introElapsedSec: INTRO_CONFIG.totalDurationSec,
          isSkippingIntro: false,
          skipProgress: 0,
        });
        state.setIsLoaded(true);

        if (!isSceneReady('s1-causeway')) {
          await generateSceneArt('s1-causeway', {
            singleVariantOnly: state.isMobile || state.reducedMotion,
            isMobile: state.isMobile,
            urgent: true,
          });
        }

        const coverScroll = evaluateSingleClockState(0, 0, state.reducedMotion, false);
        state.setScrollState(coverScroll);

        const originUv: [number, number] = state.dashboardOrbUv ??
          clickOriginUv ?? [0.60, 0.39];
        const targetUv: [number, number] = SCENES_CONFIG[0].orb.pos;

        state.setRouteTransition({
          active: true,
          direction: 'to-home',
          progress: 0.001,
          originUv,
          targetUv,
        });

        const proxy = { p: 0.001 };
        const duration = state.reducedMotion ? 0.25 : 0.72;

        routeTweenRef.current = gsap.to(proxy, {
          p: 1,
          duration,
          ease: state.reducedMotion ? 'none' : 'power2.inOut',
          onUpdate: () => {
            useAppStore.getState().setRouteTransition({ progress: proxy.p });
          },
          onComplete: () => {
            const st = useAppStore.getState();
            st.setActiveRoute('/');
            navigate('/');
            window.scrollTo({ top: 0, behavior: 'auto' });
            requestAnimationFrame(() => {
              useAppStore.getState().setRouteTransition({ active: false, progress: 0 });
              transitioningRef.current = false;
            });
          },
        });
      }
    };

    useAppStore.getState().setTriggerRouteTransition((to, origin) => {
      void executeRouteTransition(to, origin);
    });

    return () => {
      useAppStore.getState().setTriggerRouteTransition(null);
      if (routeTweenRef.current) {
        routeTweenRef.current.kill();
      }
    };
  }, [navigate]);

  return (
    <div className="relative min-h-screen w-full text-ink selection:bg-red selection:text-paper-pure">
      {/* Fixed 2.5D Multi-Scene + Dashboard WebGL Manga Stage (single shared Canvas, aria-hidden) */}
      <Scene />

      {/* Fixed Manga HUD Overlay: Frame, Nav, Scroll Progress Pill, Sound Toggle, Dev Scrubber */}
      <Frame />
      <Nav />
      <ScrollPill />
      <SoundToggle />
      <TransitionScrubber />

      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={null}>
              <LazyDashboardPage />
            </Suspense>
          }
        />
        <Route
          path="/dashboard/*"
          element={
            <Suspense fallback={null}>
              <LazyDashboardPage />
            </Suspense>
          }
        />
        <Route path="*" element={<HomeRoute />} />
      </Routes>
    </div>
  );
};

export const App: React.FC = () => {
  const rawBase = import.meta.env.BASE_URL || '/';
  const basename = rawBase === '/' ? '/' : rawBase.replace(/\/+$/, '');

  return (
    <BrowserRouter basename={basename}>
      <AppShell />
    </BrowserRouter>
  );
};

export default App;
