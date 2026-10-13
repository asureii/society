/**
 * CINEMATIC INTRO SEQUENCE OVERLAY & CONTROLLER (src/chapters/Intro/Intro.tsx)
 *
 * Implements the ~9.2s opening sequence ("Machinery is a projection of the mind"),
 * merging and replacing the old Chapter 0 Loader:
 * - Single clock (`introElapsedSec` in `[0, 9.2s]`, `introP` in `[0, 1]`) shared with
 *   `IntroStage` (WebGL), `MangaPageLayout`, and HUD components.
 * - Preloads Scene 1 (`s1-causeway`) + Scene 2 (`s2-observation`) + intro textures
 *   during the `loading` phase and gates boundary progression so zero blank frames occur.
 * - Supports `SKIP ▸` button + `Escape`/`Enter`/`Space` (~0.6s ink-wipe to Cover),
 *   `sessionStorage.introSeen` + `?intro=1`/`?intro=0`, `REPLAY INTRO`, and `prefers-reduced-motion`.
 */

import React, { useEffect, useRef, useState } from 'react';
import { INTRO_CONFIG } from '../../config/intro';
import { PROFILE } from '../../config/profile';
import { gsap } from '../../lib/gsap';
import { computeIntroFrameTelemetry } from '../../lib/introTimeline';
import { clamp } from '../../lib/math';
import { syncSceneWindow } from '../../scene/art';
import { useAppStore } from '../../store/useAppStore';

/**
 * Splits a line of text into words and characters with global character indices
 * so we can apply per-character ragged ink-wipe masks while preserving word wrapping
 * and underlining the word "PROJECTION".
 */
function tokenizeQuoteLines(lines: readonly string[]) {
  let globalIndex = 0;
  const tokenized = lines.map((line) => {
    const words = line.split(' ').map((word) => {
      const chars = Array.from(word).map((ch) => {
        const idx = globalIndex++;
        return { ch, idx };
      });
      return {
        word,
        isProjection: word === 'PROJECTION',
        chars,
      };
    });
    return { line, words };
  });
  return { tokenized, totalChars: Math.max(1, globalIndex) };
}

export const Intro: React.FC = () => {
  const introState = useAppStore((s) => s.introState);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const debugEnabled = useAppStore((s) => s.debugScrubber.enabled);
  const debugMode = useAppStore((s) => s.debugScrubber.mode);

  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.innerWidth <= INTRO_CONFIG.layout.mobileBreakpointPx
      : false,
  );
  const [announceLoaded, setAnnounceLoaded] = useState(false);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const loaderGroupRef = useRef<HTMLDivElement | null>(null);
  const progressBarFillRef = useRef<HTMLDivElement | null>(null);
  const progressPctRef = useRef<HTMLSpanElement | null>(null);
  const emblemPathsRef = useRef<(SVGGeometryElement | null)[]>([]);

  const quoteGroupRef = useRef<HTMLDivElement | null>(null);
  const topQuoteLineRef = useRef<HTMLDivElement | null>(null);
  const bottomQuoteLineRef = useRef<HTMLDivElement | null>(null);
  const charSpansRef = useRef<Map<number, HTMLSpanElement>>(new Map());
  const projectionUnderlineRef = useRef<HTMLSpanElement | null>(null);

  const attributionRef = useRef<HTMLDivElement | null>(null);
  const skipBtnRef = useRef<HTMLButtonElement | null>(null);

  const elapsedRef = useRef<number>(useAppStore.getState().introElapsedSec);
  const skipTweenRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const onResize = () => {
      setIsMobileViewport(window.innerWidth <= INTRO_CONFIG.layout.mobileBreakpointPx);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Kick off background scene preloading immediately on mount
  useEffect(() => {
    void syncSceneWindow(0, {
      singleVariantOnly: reducedMotion,
      isMobile: isMobileViewport,
      onProgress: (pct) => {
        useAppStore.getState().setLoadProgress(pct);
      },
    });
  }, [isMobileViewport, reducedMotion]);

  // Lock document scroll while introState !== 'done'
  useEffect(() => {
    const isScrubbingIntro = debugEnabled && debugMode === 'intro';
    if (introState !== 'done' || isScrubbingIntro) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [introState, debugEnabled, debugMode]);

  // Finalize intro completion: mark sessionStorage, unlock scroll, set state to 'done'
  const finalizeIntroDone = () => {
    if (skipTweenRef.current) {
      skipTweenRef.current.kill();
      skipTweenRef.current = null;
    }
    try {
      if (INTRO_CONFIG.showOncePerSession && typeof window !== 'undefined') {
        window.sessionStorage?.setItem(INTRO_CONFIG.sessionStorageKey, '1');
      }
    } catch {
      // Ignore storage errors
    }
    elapsedRef.current = INTRO_CONFIG.totalDurationSec;
    const store = useAppStore.getState();
    store.setLoadProgress(100);
    store.setIsLoaded(true);
    store.setIntroTelemetry({
      introState: 'done',
      introP: 1,
      introElapsedSec: INTRO_CONFIG.totalDurationSec,
      isSkippingIntro: false,
      skipProgress: 1,
    });
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  };

  // Fast (~0.6s) ink-wipe skip into Cover iris from any phase
  const triggerFastSkip = () => {
    const store = useAppStore.getState();
    if (store.introState === 'done' || store.isSkippingIntro) return;

    if (skipTweenRef.current) {
      skipTweenRef.current.kill();
    }

    const proxy = { p: 0 };
    store.setIntroTelemetry({
      isSkippingIntro: true,
      skipProgress: 0,
    });

    skipTweenRef.current = gsap.to(proxy, {
      p: 1,
      duration: INTRO_CONFIG.skipDurationSec,
      ease: 'power2.inOut',
      onUpdate: () => {
        useAppStore.getState().setIntroTelemetry({
          isSkippingIntro: true,
          skipProgress: proxy.p,
        });
      },
      onComplete: () => {
        finalizeIntroDone();
      },
    });
  };

  // Replay intro from the beginning (triggered by REPLAY INTRO on EndScreen or Nav)
  const triggerReplay = () => {
    if (skipTweenRef.current) {
      skipTweenRef.current.kill();
      skipTweenRef.current = null;
    }
    const store = useAppStore.getState();
    if (store.scrollToTarget) {
      store.scrollToTarget(0);
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    elapsedRef.current = 0;
    setAnnounceLoaded(false);
    store.setRewindState({ isRewinding: false, rewindRevealP: 0 });
    store.setIntroTelemetry({
      introState: 'loading',
      introP: 0,
      introElapsedSec: 0,
      isSkippingIntro: false,
      skipProgress: 0,
    });
  };

  useEffect(() => {
    useAppStore.getState().setTriggerSkipIntro(() => triggerFastSkip);
    useAppStore.getState().setTriggerReplayIntro(() => triggerReplay);
    return () => {
      useAppStore.getState().setTriggerSkipIntro(null);
      useAppStore.getState().setTriggerReplayIntro(null);
    };
  });

  // Keyboard shortcuts (`Escape`, `Enter`, `Space`) skip the intro cleanly
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const store = useAppStore.getState();
      if (store.introState === 'done') return;
      if (store.debugScrubber.enabled) return;
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        store.setLastInputWasKeyboard(true);
        triggerFastSkip();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Master 60fps GSAP ticker driving the Single Intro Clock and DOM elements
  useEffect(() => {
    let lastTime = performance.now();

    const applyDomFromTelemetry = (elapsedSec: number) => {
      const store = useAppStore.getState();
      const tel = computeIntroFrameTelemetry(
        elapsedSec,
        store.isSkippingIntro,
        store.skipProgress,
        store.reducedMotion,
      );

      // 0. Solid #0A0A0A DOM background during loading & quote (and until WebGL intro textures are ready)
      // Guarantees zero white flash on initial page load before WebGL initializes
      if (overlayRef.current) {
        const needsSolidBlackBg =
          !store.isSkippingIntro &&
          (tel.phase === 'loading' || tel.phase === 'quote' || !store.introAssetsReady);
        overlayRef.current.style.backgroundColor = needsSolidBlackBg ? 'var(--ink)' : 'transparent';
      }

      // 1. Loader Group (0.0 .. 2.6s)
      if (loaderGroupRef.current) {
        loaderGroupRef.current.style.display = tel.loaderGroupVisible ? 'flex' : 'none';
        loaderGroupRef.current.style.opacity = String(tel.loaderGroupOpacity);
      }

      // Real preload progress combined with loading phase clock
      const s1Ready = store.sceneReadyMap['s1-causeway'];
      const introReady = store.introAssetsReady;
      const assetBonus = (s1Ready ? 0.5 : 0.15) + (introReady ? 0.5 : 0.15);
      const displayPct = Math.min(
        100,
        Math.round(clamp(tel.loadingP * assetBonus * 1.08, 0, 1) * 100),
      );
      if (store.loadProgress !== displayPct && tel.phase === 'loading') {
        store.setLoadProgress(displayPct);
      }
      if (progressBarFillRef.current) {
        progressBarFillRef.current.style.width = `${displayPct}%`;
      }
      if (progressPctRef.current) {
        progressPctRef.current.textContent = `${String(displayPct).padStart(2, '0')}%`;
      }

      // SVG Emblem stroke-dashoffset draw-in
      for (const pathEl of emblemPathsRef.current) {
        if (!pathEl) continue;
        const len = Number(pathEl.dataset.pathLen || 240);
        const offset = len * (1 - tel.emblemDrawP);
        pathEl.style.strokeDasharray = `${len}`;
        pathEl.style.strokeDashoffset = `${offset}`;
      }

      // 2. Quote Group (2.6 .. 6.76s)
      if (quoteGroupRef.current) {
        quoteGroupRef.current.style.display = tel.quoteGroupVisible ? 'flex' : 'none';
      }

      if (tel.quoteGroupVisible) {
        const clipInsetPct = Math.round(tel.quoteExitClipP * 100);
        if (topQuoteLineRef.current) {
          topQuoteLineRef.current.style.transform = `translate3d(0, -${tel.quotePartVh.toFixed(2)}vh, 0)`;
          topQuoteLineRef.current.style.clipPath = `polygon(0% ${clipInsetPct}%, 100% ${clipInsetPct}%, 100% 100%, 0% 100%)`;
        }
        if (bottomQuoteLineRef.current) {
          bottomQuoteLineRef.current.style.transform = `translate3d(0, ${tel.quotePartVh.toFixed(2)}vh, 0)`;
          bottomQuoteLineRef.current.style.clipPath = `polygon(0% 0%, 100% 0%, 100% ${100 - clipInsetPct}%, 0% ${100 - clipInsetPct}%)`;
        }

        // Per-character ragged ink-wipe reveal (no opacity fade ghosting)
        const totalChars = Math.max(1, charSpansRef.current.size);
        charSpansRef.current.forEach((span, charIdx) => {
          const charStart = (charIdx / totalChars) * 0.76;
          const charP = clamp((tel.quoteRevealP - charStart) / 0.22, 0, 1);
          if (charP <= 0.01) {
            span.style.clipPath = 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)';
          } else if (charP >= 0.98) {
            span.style.clipPath = 'none';
          } else {
            const rightEdge = Math.round(charP * 112);
            const jag = Math.max(0, rightEdge - 14);
            span.style.clipPath = `polygon(-8% -15%, ${rightEdge}% -15%, ${jag}% 50%, ${rightEdge}% 115%, -8% 115%)`;
          }
        });

        // Thin Signal-Red underline beneath "PROJECTION"
        if (projectionUnderlineRef.current) {
          projectionUnderlineRef.current.style.transform = `scaleX(${tel.projectionUnderlineP.toFixed(3)})`;
        }
      }

      // 3. Attribution (bottom-left during hold phase: 6.45 .. 7.95s)
      if (attributionRef.current) {
        attributionRef.current.style.display = tel.attributionVisible ? 'flex' : 'none';
      }

      // 4. Boxed SKIP button theme switching (white-on-black in loading/quote, ink-on-paper in hold)
      if (skipBtnRef.current) {
        const showSkip = tel.phase !== 'done' && tel.portalP < 0.65;
        skipBtnRef.current.style.display = showSkip ? 'inline-flex' : 'none';
        const onWhitePaper = tel.phase === 'hold' || (tel.phase === 'portal' && tel.portalP < 0.65);
        skipBtnRef.current.dataset.theme = onWhitePaper ? 'paper' : 'ink';
      }
    };

    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.06, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const store = useAppStore.getState();

      // If Dev Scrubber [T] is active in 'intro' mode, drive strictly from scrubber introP
      if (store.debugScrubber.enabled && store.debugScrubber.mode === 'intro') {
        const scrubbedElapsed = store.debugScrubber.introP * INTRO_CONFIG.totalDurationSec;
        elapsedRef.current = scrubbedElapsed;
        const scrubbedPhase =
          scrubbedElapsed >= INTRO_CONFIG.totalDurationSec - 1e-4
            ? 'portal'
            : computeIntroFrameTelemetry(scrubbedElapsed).phase;
        store.setIntroTelemetry({
          introState: scrubbedPhase,
          introP: store.debugScrubber.introP,
          introElapsedSec: scrubbedElapsed,
        });
        applyDomFromTelemetry(scrubbedElapsed);
        return;
      }

      if (store.introState === 'done') {
        return;
      }

      if (store.isSkippingIntro) {
        applyDomFromTelemetry(elapsedRef.current);
        return;
      }

      let nextElapsed = elapsedRef.current + dt;
      const b = INTRO_CONFIG.boundaries;

      // Gate 1: Wait at the end of 'loading' (2.52s) if intro textures haven't finished GPU upload yet
      if (nextElapsed >= b.loadingEnd - 0.08 && !store.introAssetsReady) {
        nextElapsed = b.loadingEnd - 0.08;
      }

      // Gate 2: Wait at the end of 'hold' (7.72s) if Scene 1 Cover isn't ready yet (never show a blank Cover)
      if (nextElapsed >= b.holdEnd - 0.08 && !store.sceneReadyMap['s1-causeway']) {
        nextElapsed = b.holdEnd - 0.08;
      }

      if (nextElapsed >= b.loadingEnd && !announceLoaded) {
        setAnnounceLoaded(true);
      }

      if (nextElapsed >= INTRO_CONFIG.totalDurationSec) {
        finalizeIntroDone();
        return;
      }

      elapsedRef.current = nextElapsed;
      store.setIntroTelemetry({
        introElapsedSec: nextElapsed,
        introP: nextElapsed / INTRO_CONFIG.totalDurationSec,
      });

      applyDomFromTelemetry(nextElapsed);
    };

    gsap.ticker.add(tick);
    tick();
    return () => {
      gsap.ticker.remove(tick);
    };
  }, [announceLoaded]);

  const quoteLines = isMobileViewport ? PROFILE.intro.mobileQuote : PROFILE.intro.quote;
  const { tokenized } = tokenizeQuoteLines(quoteLines);

  const isScrubbingIntro = debugEnabled && debugMode === 'intro';
  if (introState === 'done' && !isScrubbingIntro) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      id="cinematic-intro"
      data-intro-overlay
      data-intro-state={introState}
      aria-label="Opening Intro Sequence"
      style={{ backgroundColor: 'var(--ink)' }}
      className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center select-none overflow-hidden"
    >
      {/* Polite screen-reader live region announcing completion of loading and the opening quote */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announceLoaded
          ? `Loading complete. ${PROFILE.intro.quote.join(' ')} ${PROFILE.intro.attribution}`
          : 'Loading Pilot File archive'}
      </div>

      {/* =====================================================================
          PHASE 1 (0.0 .. 2.6s): DARK LOADER SCREEN + DRAWING EMBLEM + HAIRLINE BAR
          ===================================================================== */}
      <div
        ref={loaderGroupRef}
        data-intro-loader
        className="absolute inset-0 flex flex-col items-center justify-center py-8 sm:py-12 px-6 pointer-events-none"
      >
        {/* Center original geometric line-art emblem drawing itself in with white strokes */}
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
            <svg
              className="w-full h-full overflow-visible"
              viewBox="0 0 120 120"
              fill="none"
              aria-hidden="true"
            >
              {/* Outer architectural octagon frame */}
              <polygon
                ref={(el) => {
                  emblemPathsRef.current[0] = el;
                }}
                data-path-len="380"
                points="36,8 84,8 112,36 112,84 84,112 36,112 8,84 8,36"
                stroke="var(--paper-pure)"
                strokeWidth="2"
              />
              {/* Inner precision circle */}
              <circle
                ref={(el) => {
                  emblemPathsRef.current[1] = el;
                }}
                data-path-len="265"
                cx="60"
                cy="60"
                r="41"
                stroke="var(--paper-pure)"
                strokeWidth="1.5"
              />
              {/* Twin monolith slabs + inverted projection triangle */}
              <polygon
                ref={(el) => {
                  emblemPathsRef.current[2] = el;
                }}
                data-path-len="240"
                points="60,22 92,84 28,84"
                stroke="var(--paper-pure)"
                strokeWidth="2"
              />
              <path
                ref={(el) => {
                  emblemPathsRef.current[3] = el;
                }}
                data-path-len="220"
                d="M46 34 V86 M74 34 V86 M20 60 H100"
                stroke="var(--paper-pure)"
                strokeWidth="1.4"
              />
              {/* Signal-red core point at center of emblem */}
              <circle cx="60" cy="60" r="4.5" fill="var(--red)" />
            </svg>
          </div>

          {/* Hairline progress bar + tiny red mono percentage readout */}
          <div className="w-56 sm:w-64 flex flex-col gap-2">
            <div className="w-full h-[2px] bg-paper-pure/25 overflow-hidden">
              <div
                ref={progressBarFillRef}
                data-intro-progress-bar
                className="h-full bg-paper-pure transition-none"
                style={{ width: '0%' }}
              />
            </div>
            <div className="flex items-center justify-between font-mono text-xs tracking-[0.2em] uppercase">
              <span className="text-paper-pure">INITIALIZING STAGE</span>
              <span ref={progressPctRef} data-intro-progress-pct className="text-red font-bold">
                00%
              </span>
            </div>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-6" aria-hidden="true" />
      </div>

      {/* =====================================================================
          PHASE 2 & 3 (2.6 .. 6.76s): HUGE DISPLAY TYPE QUOTE & VERTICAL PARTING
          ===================================================================== */}
      <div
        ref={quoteGroupRef}
        data-intro-quote-group
        style={{ display: 'none' }}
        className="w-full px-4 sm:px-8 flex flex-col items-center justify-center text-center pointer-events-none"
      >
        <h1
          id="intro-quote-heading"
          aria-label="Machinery is a projection of the mind"
          className="font-serif font-extrabold text-paper-pure uppercase tracking-[-0.02em] leading-[1.04] flex flex-col items-center gap-2 sm:gap-3"
          style={{
            fontSize: isMobileViewport
              ? 'clamp(1.85rem, 8.2vw, 2.75rem)'
              : 'clamp(2.4rem, 5.6vw, 5.25rem)',
          }}
        >
          {/* Upper parting block (Line 0) */}
          <div
            ref={topQuoteLineRef}
            data-intro-quote-top
            className="will-change-transform flex flex-wrap items-center justify-center gap-x-[0.32em]"
          >
            {tokenized[0]?.words.map((wObj, wIdx) => (
              <span key={wIdx} className="inline-flex">
                {wObj.chars.map(({ ch, idx }) => (
                  <span
                    key={idx}
                    ref={(el) => {
                      if (el) charSpansRef.current.set(idx, el);
                    }}
                    aria-hidden="true"
                    className="inline-block"
                  >
                    {ch}
                  </span>
                ))}
              </span>
            ))}
          </div>

          {/* Lower parting block (Line 1 on desktop; Lines 1 & 2 on mobile) */}
          <div
            ref={bottomQuoteLineRef}
            data-intro-quote-bottom
            className="will-change-transform flex flex-col items-center gap-1"
          >
            {tokenized.slice(1).map((lineObj, lIdx) => (
              <div
                key={lIdx}
                className="flex flex-wrap items-center justify-center gap-x-[0.32em]"
              >
                {lineObj.words.map((wObj, wIdx) => (
                  <span key={wIdx} className="relative inline-flex flex-col items-center">
                    <span className="inline-flex">
                      {wObj.chars.map(({ ch, idx }) => (
                        <span
                          key={idx}
                          ref={(el) => {
                            if (el) charSpansRef.current.set(idx, el);
                          }}
                          aria-hidden="true"
                          className="inline-block"
                        >
                          {ch}
                        </span>
                      ))}
                    </span>
                    {wObj.isProjection && (
                      <span
                        ref={projectionUnderlineRef}
                        data-intro-projection-underline
                        aria-hidden="true"
                        className="block w-full h-[3px] bg-red origin-left mt-1"
                        style={{ transform: 'scaleX(0)' }}
                      />
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </h1>
      </div>

      {/* =====================================================================
          PHASE 4 (6.4 .. 7.8s): ATTRIBUTION TAG (BOTTOM-LEFT)
          ===================================================================== */}
      <div
        ref={attributionRef}
        data-intro-attribution
        style={{ display: 'none' }}
        className="fixed bottom-4 left-4 sm:bottom-6 sm:left-8 z-50 bg-paper-pure border-2 border-ink px-3 py-1.5 shadow-[3px_3px_0px_var(--ink)] pointer-events-none"
      >
        <span className="font-mono text-xs font-bold tracking-[0.18em] text-ink uppercase">
          {PROFILE.intro.attribution}
        </span>
      </div>

      {/* =====================================================================
          SKIP CONTROL (BOTTOM-RIGHT, ALWAYS ACCESSIBLE DURING INTRO)
          ===================================================================== */}
      <button
        ref={skipBtnRef}
        id="intro-skip-btn"
        data-intro-skip
        type="button"
        onClick={triggerFastSkip}
        aria-label="Skip intro sequence"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-8 z-50 pointer-events-auto inline-flex items-center gap-2 border-2 px-4 py-2 min-h-[44px] font-display text-xs sm:text-sm tracking-[0.18em] uppercase cursor-pointer transition-colors bg-ink text-paper-pure border-paper-pure data-[theme=paper]:bg-paper-pure data-[theme=paper]:text-ink data-[theme=paper]:border-ink data-[theme=paper]:shadow-[3px_3px_0px_var(--ink)] hover:bg-red hover:text-paper-pure hover:border-red focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
      >
        <span className="w-2 h-2 bg-red inline-block shrink-0" aria-hidden="true" />
        <span>SKIP ▸</span>
      </button>

      {/* Reduced-motion static quote card when prefers-reduced-motion is enabled */}
      {reducedMotion && !debugEnabled && introState === 'quote' && (
        <div className="sr-only" aria-hidden="true" />
      )}
    </div>
  );
};
