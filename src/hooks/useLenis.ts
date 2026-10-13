import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { INTRO_CONFIG } from '../config/intro';
import { SCENES_CONFIG } from '../config/scenes.config';
import {
  CHAPTER_SCROLL_MAP,
  COMPUTED_SCROLL_RANGES,
  MIN_TRANSITION_REALTIME_SECONDS,
} from '../config/scroll.config';
import { gsap, ScrollTrigger } from '../lib/gsap';
import { clamp } from '../lib/math';
import { generateSceneArt, isSceneReady } from '../scene/art';
import {
  useAppStore,
  type ChapterId,
  type ChapterProgressMetrics,
  type ChapterState,
} from '../store/useAppStore';

export interface TransitionDebugController {
  setBoundaryTau: (boundaryIndex: number, tau: number) => void;
  setEndProgress: (endP: number) => void;
  setIntroProgress: (introP: number) => void;
  setIntroElapsedSec: (elapsedSec: number) => void;
  setVirtualProgress: (p: number) => void;
  triggerRewind: () => void;
  clearOverride: () => void;
  getState: () => {
    chapterState: ChapterState;
    fromReady: boolean;
    toReady: boolean;
    panelChapter: ChapterId | null;
    sceneChapter: ChapterId;
    irisRadius: number;
    virtualProgress: number;
    rawScrollProgress: number;
    isGateClamped: boolean;
    endP: number;
    onBlack: boolean;
    isRewinding: boolean;
    rewindRevealP: number;
    introState: string;
    introP: number;
    introElapsedSec: number;
    introAssetsReady: boolean;
  };
}

/**
 * Pure single-clock state evaluator from virtualProgress (or explicit boundaryIndex + tau / finale endP override).
 * Exported so unit tests and debug scrubber share identical math.
 */
export function evaluateSingleClockState(
  virtualP: number,
  rawP: number,
  reducedMotion: boolean,
  isGateClamped: boolean,
  explicitBoundary?: { boundaryIndex: number; tau: number } | null,
  explicitFinaleEndP?: number | null,
) {
  let p = clamp(virtualP, 0, 1);
  let activeIdx = SCENES_CONFIG.length - 1;
  let u = 0;
  let tau = 0;
  let endP = 0;

  const contactRange = COMPUTED_SCROLL_RANGES[COMPUTED_SCROLL_RANGES.length - 1];
  const closeStartP = contactRange.closeStartProgress;
  const readHoldStartP = contactRange.readHoldStartProgress;
  const closeSpanP = Math.max(0.0001, readHoldStartP - closeStartP);

  if (typeof explicitFinaleEndP === 'number') {
    endP = clamp(explicitFinaleEndP, 0, 1);
    activeIdx = SCENES_CONFIG.length - 1;
    p = clamp(closeStartP + endP * closeSpanP, 0, 1);
    const [start, end] = contactRange.scrollRange;
    u = clamp((p - start) / Math.max(0.0001, end - start), 0, 1);
    tau = 0;
  } else if (explicitBoundary) {
    const bIdx = clamp(explicitBoundary.boundaryIndex, 0, SCENES_CONFIG.length - 2);
    const bTau = clamp(explicitBoundary.tau, 0, 1);
    const range = COMPUTED_SCROLL_RANGES[bIdx];
    const [start, end] = range.scrollRange;
    const span = Math.max(0.0001, end - start);
    const transStart = range.timing.enter + range.timing.hold;
    u = transStart + bTau * range.timing.transition;
    p = clamp(start + u * span, 0, 1);
    activeIdx = bIdx;
    tau = bTau;
    endP = 0;
  } else {
    for (let i = 0; i < SCENES_CONFIG.length; i++) {
      const [start, end] = SCENES_CONFIG[i].scrollRange;
      if (p >= start && p < end) {
        activeIdx = i;
        break;
      }
    }
    const activeSceneSpec = SCENES_CONFIG[activeIdx] ?? SCENES_CONFIG[0];
    const [start, end] = activeSceneSpec.scrollRange;
    const span = Math.max(0.0001, end - start);
    u = clamp((p - start) / span, 0, 1);

    const timing = COMPUTED_SCROLL_RANGES[activeIdx]?.timing ?? {
      enter: 0.14,
      hold: 0.5,
      transition: 0.36,
    };

    if (activeIdx < SCENES_CONFIG.length - 1 && timing.transition > 0.001) {
      const transStart = timing.enter + timing.hold;
      if (u > transStart) {
        tau = clamp((u - transStart) / timing.transition, 0, 1);
      }
    }

    // S7 Doorway-closing finale scalar `endP` derived strictly from virtualProgress `p`
    if (activeIdx === SCENES_CONFIG.length - 1) {
      if (p <= closeStartP) {
        endP = 0;
      } else if (p >= readHoldStartP) {
        endP = 1;
      } else {
        endP = clamp((p - closeStartP) / closeSpanP, 0, 1);
      }
    }
  }

  const fromIndex = activeIdx;
  const toIndex = Math.min(SCENES_CONFIG.length - 1, activeIdx + 1);
  const fromSpec = SCENES_CONFIG[fromIndex];
  const toSpec = SCENES_CONFIG[toIndex];

  // Authoritative single-clock ChapterState { from, to, tau }
  const displaySceneIndex = tau >= 0.5 ? toIndex : fromIndex;
  const displayChapter = tau >= 0.5 ? toSpec.chapterId : fromSpec.chapterId;

  const chapterState: ChapterState = {
    fromIndex,
    toIndex,
    from: fromSpec.chapterId,
    to: toSpec.chapterId,
    fromScene: fromSpec.id,
    toScene: toSpec.id,
    tau: Number(tau.toFixed(5)),
    boundaryIndex: Math.min(SCENES_CONFIG.length - 2, fromIndex),
    displayChapter,
    displaySceneIndex,
    transitionType: fromSpec.transitionOut,
  };

  // Disjoint Panel Handoff computed strictly from the same single clock:
  // - Outgoing panel (`from`) exits over tau in [0.00, 0.48] and is completely gone by tau = 0.48
  // - Incoming panel (`to`) starts entering at tau = 0.52 and completes entry at tau = 0.90
  // - In S7 finale: Contact panel exits over endP in [0.00, 0.05] and is 100% hidden & inert for endP >= 0.05
  const chapterMetrics = {} as Record<ChapterId, ChapterProgressMetrics>;

  for (let i = 0; i < COMPUTED_SCROLL_RANGES.length; i++) {
    const range = COMPUTED_SCROLL_RANGES[i];
    let enterP = 0;
    let holdP = 0;
    let exitP = 0;

    if (tau > 0.0001) {
      // Currently inside boundary transition `fromIndex -> toIndex`
      if (i === fromIndex) {
        enterP = 1.0;
        holdP = 1.0;
        exitP = clamp(tau / 0.48, 0, 1);
      } else if (i === toIndex) {
        const incomingReady = isSceneReady(toSpec.id);
        if (tau >= 0.52 && incomingReady) {
          enterP = clamp((tau - 0.52) / 0.38, 0, 1);
        } else {
          enterP = 0;
        }
        holdP = 0;
        exitP = 0;
      } else {
        enterP = 0;
        holdP = 0;
        exitP = 0;
      }
    } else {
      // Not in a boundary transition
      if (i === activeIdx) {
        if (i === COMPUTED_SCROLL_RANGES.length - 1 && endP > 0) {
          // S7 finale closing: Contact panel exits rapidly over endP in [0, 0.05]
          if (endP >= 0.05) {
            enterP = 0;
            holdP = 1;
            exitP = 1;
          } else {
            enterP = 1;
            holdP = 1;
            exitP = clamp(endP / 0.05, 0, 1);
          }
        } else {
          enterP = 1.0;
          exitP = 0.0;
          const holdSpan = Math.max(0.001, range.localHoldEnd);
          holdP = clamp(u / holdSpan, 0, 1);
        }
      } else {
        enterP = 0;
        holdP = 0;
        exitP = 0;
      }
    }

    chapterMetrics[range.id] = {
      enterP: Number(enterP.toFixed(4)),
      holdP: Number(holdP.toFixed(4)),
      exitP: Number(exitP.toFixed(4)),
    };
  }

  const activeMetrics = chapterMetrics[displayChapter] ?? {
    enterP: 1,
    holdP: 0,
    exitP: 0,
  };

  const bleed = !reducedMotion && tau > 0 ? Math.sin(tau * Math.PI) : 0;
  const formattedEndP = Number(endP.toFixed(5));

  return {
    rawScrollProgress: Number(rawP.toFixed(5)),
    virtualProgress: Number(p.toFixed(5)),
    scrollProgress: Number(p.toFixed(5)),
    isGateClamped,
    activeChapter: displayChapter,
    activeSceneIndex: fromIndex,
    sceneLocalProgress: Number(u.toFixed(5)),
    transitionProgress: Number(tau.toFixed(5)),
    transitionType: fromSpec.transitionOut,
    chapterTransitionBleed: clamp(bleed, 0, 1),
    isPageOpaque: false,
    chapterProgress: chapterMetrics,
    chapterState,
    enterP: activeMetrics.enterP,
    holdP: activeMetrics.holdP,
    exitP: activeMetrics.exitP,
    endP: formattedEndP,
    onBlack: formattedEndP > 0.6,
  };
}

export function useLenis(): void {
  const lenisRef = useRef<Lenis | null>(null);
  const rawProgressRef = useRef<number>(0);
  const virtualProgressRef = useRef<number>(0);
  const lastTickTimeRef = useRef<number>(performance.now() / 1000);
  const rewindTweenRef = useRef<gsap.core.Tween | null>(null);

  const setScrollState = useAppStore((s) => s.setScrollState);
  const setScrollToTarget = useAppStore((s) => s.setScrollToTarget);
  const setTriggerRewind = useAppStore((s) => s.setTriggerRewind);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: reducedMotion ? 1 : 0.12,
      smoothWheel: !reducedMotion,
      syncTouch: false,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const syncRawScroll = () => {
      if (useAppStore.getState().isRewinding) return;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      rawProgressRef.current = clamp(window.scrollY / maxScroll, 0, 1);
    };

    const masterTrigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        if (useAppStore.getState().isRewinding) return;
        rawProgressRef.current = clamp(self.progress, 0, 1);
      },
    });

    window.addEventListener('scroll', syncRawScroll, { passive: true });
    syncRawScroll();

    // Seamless Rewind (~0.6s):
    // Under full-bleed black, jumps scroll to 0 and opens the Orb Iris on Cover (`s1-causeway`)
    // without flashing any intermediate scenes (S2..S6) or white frames.
    const executeSeamlessRewind = () => {
      const store = useAppStore.getState();
      if (rewindTweenRef.current) {
        rewindTweenRef.current.kill();
        rewindTweenRef.current = null;
      }

      store.setDebugScrubber({ enabled: false, playing: false });
      store.setRewindState({ isRewinding: true, rewindRevealP: 0 });

      // Ensure Scene 1 is GPU-ready (always loaded at startup)
      if (!isSceneReady('s1-causeway')) {
        void generateSceneArt('s1-causeway', { singleVariantOnly: false, urgent: true });
      }

      // Reset scroll position immediately under the black cover
      lenis.scrollTo(0, { immediate: true });
      window.scrollTo(0, 0);
      ScrollTrigger.update();
      rawProgressRef.current = 0;
      virtualProgressRef.current = 0;

      const coverState = evaluateSingleClockState(0, 0, store.reducedMotion, false, null, null);
      setScrollState({
        ...coverState,
        onBlack: true,
      });

      const animProxy = { p: 0 };
      const duration = store.reducedMotion ? 0.25 : 0.58;
      rewindTweenRef.current = gsap.to(animProxy, {
        p: 1,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          useAppStore.getState().setRewindState({
            isRewinding: true,
            rewindRevealP: Number(animProxy.p.toFixed(4)),
          });
        },
        onComplete: () => {
          rewindTweenRef.current = null;
          useAppStore.getState().setRewindState({
            isRewinding: false,
            rewindRevealP: 1,
          });
          const settled = evaluateSingleClockState(
            0,
            0,
            useAppStore.getState().reducedMotion,
            false,
            null,
            null,
          );
          setScrollState(settled);
        },
      });
    };

    setTriggerRewind(executeSeamlessRewind);

    let lenisStoppedForIntro = false;

    const updateTicker = (timeSec: number) => {
      const storeState = useAppStore.getState();
      const scrubber = storeState.debugScrubber;

      // Lock Lenis while cinematic intro is active
      const introBlockingScroll =
        storeState.introState !== 'done' ||
        (scrubber.enabled && scrubber.mode === 'intro');

      if (introBlockingScroll) {
        if (!lenisStoppedForIntro) {
          lenis.stop();
          lenisStoppedForIntro = true;
        }
      } else if (lenisStoppedForIntro) {
        lenis.start();
        lenisStoppedForIntro = false;
      }

      if (!introBlockingScroll) {
        lenis.raf(timeSec * 1000);
      }

      const dt = clamp(timeSec - lastTickTimeRef.current, 0.001, 0.1);
      lastTickTimeRef.current = timeSec;

      // If seamless rewind is currently animating, keep virtualProgress locked at Cover (0)
      if (storeState.isRewinding) {
        rawProgressRef.current = 0;
        virtualProgressRef.current = 0;
        return;
      }

      // 1. If dev transition scrubber is active, drive directly from scrubber
      if (scrubber.enabled) {
        if (scrubber.mode === 'intro') {
          let nextIntroP = scrubber.introP;
          if (scrubber.playing) {
            nextIntroP = scrubber.introP + dt / INTRO_CONFIG.totalDurationSec;
            if (nextIntroP > 1) nextIntroP = 0;
            storeState.setDebugScrubber({ introP: Number(nextIntroP.toFixed(4)) });
          }
          if (!isSceneReady('s1-causeway')) {
            void generateSceneArt('s1-causeway', { singleVariantOnly: false, urgent: true });
          }
          rawProgressRef.current = 0;
          virtualProgressRef.current = 0;
          const nextState = evaluateSingleClockState(0, 0, reducedMotion, false, null, null);
          setScrollState(nextState);
          return;
        }

        if (scrubber.mode === 'finale') {
          let nextEndP = scrubber.endP;
          if (scrubber.playing) {
            nextEndP = scrubber.endP + dt * 0.4;
            if (nextEndP > 1) nextEndP = 0;
            storeState.setDebugScrubber({ endP: Number(nextEndP.toFixed(4)) });
          }
          if (!isSceneReady('s7-threshold')) {
            void generateSceneArt('s7-threshold', { singleVariantOnly: false, urgent: true });
          }
          const nextState = evaluateSingleClockState(
            virtualProgressRef.current,
            rawProgressRef.current,
            reducedMotion,
            false,
            null,
            nextEndP,
          );
          virtualProgressRef.current = nextState.virtualProgress;
          setScrollState(nextState);
          return;
        }

        let nextTau = scrubber.tau;
        if (scrubber.playing) {
          nextTau = scrubber.tau + dt * 0.45;
          if (nextTau > 1) nextTau = 0;
          storeState.setDebugScrubber({ tau: Number(nextTau.toFixed(4)) });
        }

        const bIdx = clamp(scrubber.boundaryIndex, 0, SCENES_CONFIG.length - 2);
        const fromId = SCENES_CONFIG[bIdx].id;
        const toId = SCENES_CONFIG[bIdx + 1].id;
        if (!isSceneReady(fromId)) {
          void generateSceneArt(fromId, { singleVariantOnly: false, urgent: true });
        }
        if (!isSceneReady(toId)) {
          void generateSceneArt(toId, { singleVariantOnly: false, urgent: true });
        }

        const nextState = evaluateSingleClockState(
          virtualProgressRef.current,
          rawProgressRef.current,
          reducedMotion,
          false,
          { boundaryIndex: bIdx, tau: nextTau },
          null,
        );
        virtualProgressRef.current = nextState.virtualProgress;
        setScrollState(nextState);
        return;
      }

      // 2. Phase-Aware Scroll Pacing:
      //    - Inside a chapter's ENTER / HOLD span: 1:1 smooth natural scroll (no speed cap).
      //    - Inside a boundary TRANSITION span (or S7 CLOSE finale span): paced so every transition
      //      and the doorway closing get >= MIN_TRANSITION_REALTIME_SECONDS (0.80s).
      const targetP = rawProgressRef.current;
      const currentP = virtualProgressRef.current;
      let proposedP = targetP;
      let gateClamped = false;

      let curIdx = COMPUTED_SCROLL_RANGES.length - 1;
      for (let i = 0; i < COMPUTED_SCROLL_RANGES.length; i++) {
        const [rStart, rEnd] = COMPUTED_SCROLL_RANGES[i].scrollRange;
        if (currentP >= rStart && (currentP < rEnd || i === COMPUTED_SCROLL_RANGES.length - 1)) {
          curIdx = i;
          break;
        }
      }

      const curRange = COMPUTED_SCROLL_RANGES[curIdx];
      const [rStart, rEnd] = curRange.scrollRange;
      const isFinalChapter = curIdx === COMPUTED_SCROLL_RANGES.length - 1;
      const transThreshold = isFinalChapter
        ? curRange.closeStartProgress
        : curRange.transitionStartProgress;
      const transEnd = isFinalChapter ? curRange.readHoldStartProgress : rEnd;
      const hasOutgoingPacedPhase =
        isFinalChapter ||
        (curIdx < COMPUTED_SCROLL_RANGES.length - 1 && curRange.timing.transition > 0.001);
      const transSpan = Math.max(0.0001, transEnd - transThreshold);
      const maxTransStep = (transSpan / MIN_TRANSITION_REALTIME_SECONDS) * dt;

      if (targetP >= currentP) {
        // Scrolling forward (or stationary)
        if (!hasOutgoingPacedPhase || targetP <= transThreshold || currentP >= transEnd) {
          // Completely within ENTER / HOLD or final readHold: 1:1 natural scroll
          const delta = targetP - currentP;
          proposedP =
            delta < 0.012 ? targetP : currentP + delta * Math.min(1, dt * 20);
        } else {
          // Entering or inside outgoing transition (or S7 CLOSE phase)
          if (!isFinalChapter) {
            const nextSceneId = SCENES_CONFIG[curIdx + 1].id;
            if (!isSceneReady(nextSceneId)) {
              void generateSceneArt(nextSceneId, {
                singleVariantOnly: storeState.isMobile || storeState.reducedMotion,
                isMobile: storeState.isMobile,
                urgent: true,
              });
              const gentleTarget = transThreshold - 0.0002;
              proposedP =
                currentP < gentleTarget
                  ? currentP + (gentleTarget - currentP) * 0.18
                  : gentleTarget;
              gateClamped = true;
            } else if (currentP < transThreshold) {
              const stepIntoTrans = Math.min(targetP - transThreshold, maxTransStep);
              proposedP = transThreshold + stepIntoTrans;
            } else {
              const nextStep = Math.min(targetP, currentP + maxTransStep);
              proposedP = Math.min(rEnd + 0.0005, nextStep);
            }
          } else {
            // S7 CLOSE phase pacing
            if (currentP < transThreshold) {
              const stepIntoClose = Math.min(targetP - transThreshold, maxTransStep);
              proposedP = transThreshold + stepIntoClose;
            } else {
              const nextStep = Math.min(targetP, currentP + maxTransStep);
              proposedP = nextStep;
            }
          }
        }
      } else {
        // Scrolling backward (targetP < currentP)
        if (hasOutgoingPacedPhase && currentP > transThreshold && currentP <= transEnd) {
          // Inside current chapter's outgoing transition or S7 CLOSE: pace reverse down to transThreshold
          const prevStep = Math.max(targetP, currentP - maxTransStep);
          proposedP = Math.max(transThreshold, prevStep);
        } else if (targetP >= rStart || curIdx === 0) {
          // Completely within ENTER / HOLD of current chapter: 1:1 natural reverse scroll
          const delta = currentP - targetP;
          proposedP =
            delta < 0.012 ? targetP : currentP - delta * Math.min(1, dt * 20);
        } else {
          // Crossing backward across rStart into previous chapter's transition
          const prevRange = COMPUTED_SCROLL_RANGES[curIdx - 1];
          const prevTransSpan = Math.max(
            0.0001,
            prevRange.scrollRange[1] - prevRange.transitionStartProgress,
          );
          const prevMaxTransStep = (prevTransSpan / MIN_TRANSITION_REALTIME_SECONDS) * dt;
          proposedP = Math.max(targetP, rStart - prevMaxTransStep);
        }
      }

      virtualProgressRef.current = clamp(proposedP, 0, 1);

      const nextState = evaluateSingleClockState(
        virtualProgressRef.current,
        rawProgressRef.current,
        reducedMotion,
        gateClamped,
        null,
        null,
      );
      setScrollState(nextState);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    // Expose deterministic debug & Playwright verification controller on window
    const debugController: TransitionDebugController = {
      setBoundaryTau: (boundaryIndex: number, tau: number) => {
        const bIdx = clamp(boundaryIndex, 0, SCENES_CONFIG.length - 2);
        const bTau = clamp(tau, 0, 1);
        const state = useAppStore.getState();
        state.setDebugScrubber({
          enabled: true,
          mode: 'boundary',
          boundaryIndex: bIdx,
          tau: bTau,
          playing: false,
        });
        const evaluated = evaluateSingleClockState(
          virtualProgressRef.current,
          rawProgressRef.current,
          state.reducedMotion,
          false,
          { boundaryIndex: bIdx, tau: bTau },
          null,
        );
        virtualProgressRef.current = evaluated.virtualProgress;
        setScrollState(evaluated);
      },
      setEndProgress: (endPVal: number) => {
        const clampedEndP = clamp(endPVal, 0, 1);
        const state = useAppStore.getState();
        if (!isSceneReady('s7-threshold')) {
          void generateSceneArt('s7-threshold', { singleVariantOnly: false, urgent: true });
        }
        state.setDebugScrubber({
          enabled: true,
          mode: 'finale',
          endP: clampedEndP,
          playing: false,
        });
        const evaluated = evaluateSingleClockState(
          virtualProgressRef.current,
          rawProgressRef.current,
          state.reducedMotion,
          false,
          null,
          clampedEndP,
        );
        virtualProgressRef.current = evaluated.virtualProgress;
        rawProgressRef.current = evaluated.virtualProgress;
        setScrollState(evaluated);
      },
      setIntroProgress: (introPVal: number) => {
        const clampedIntroP = clamp(introPVal, 0, 1);
        const state = useAppStore.getState();
        if (!isSceneReady('s1-causeway')) {
          void generateSceneArt('s1-causeway', { singleVariantOnly: false, urgent: true });
        }
        state.setDebugScrubber({
          enabled: true,
          mode: 'intro',
          introP: clampedIntroP,
          playing: false,
        });
        state.setIntroTelemetry({
          introP: clampedIntroP,
          introElapsedSec: clampedIntroP * INTRO_CONFIG.totalDurationSec,
        });
      },
      setIntroElapsedSec: (elapsedSecVal: number) => {
        const clampedSec = clamp(elapsedSecVal, 0, INTRO_CONFIG.totalDurationSec);
        const introP = clampedSec / INTRO_CONFIG.totalDurationSec;
        const state = useAppStore.getState();
        if (!isSceneReady('s1-causeway')) {
          void generateSceneArt('s1-causeway', { singleVariantOnly: false, urgent: true });
        }
        state.setDebugScrubber({
          enabled: true,
          mode: 'intro',
          introP,
          playing: false,
        });
        state.setIntroTelemetry({
          introP,
          introElapsedSec: clampedSec,
        });
      },
      setVirtualProgress: (p: number) => {
        const clampedP = clamp(p, 0, 1);
        rawProgressRef.current = clampedP;
        virtualProgressRef.current = clampedP;
        const state = useAppStore.getState();
        state.setDebugScrubber({ enabled: false, playing: false });
        const evaluated = evaluateSingleClockState(
          clampedP,
          clampedP,
          state.reducedMotion,
          false,
          null,
          null,
        );
        setScrollState(evaluated);
      },
      triggerRewind: () => {
        executeSeamlessRewind();
      },
      clearOverride: () => {
        useAppStore.getState().setDebugScrubber({ enabled: false, playing: false });
      },
      getState: () => {
        const s = useAppStore.getState();
        const cs = s.chapterState;
        const win = window as unknown as Record<string, unknown>;
        const irisRadius =
          typeof win.__PILOT_IRIS_RADIUS__ === 'number'
            ? (win.__PILOT_IRIS_RADIUS__ as number)
            : 0;

        let visiblePanelId: ChapterId | null = null;
        if (s.endP < 0.05) {
          for (const [chId, m] of Object.entries(s.chapterProgress)) {
            if (m.enterP > 0.01 && m.exitP < 0.99) {
              visiblePanelId = chId as ChapterId;
              break;
            }
          }
        }

        return {
          chapterState: cs,
          fromReady: isSceneReady(cs.fromScene),
          toReady: isSceneReady(cs.toScene),
          panelChapter: s.endP >= 0.05 ? null : (visiblePanelId ?? cs.displayChapter),
          sceneChapter: cs.displayChapter,
          irisRadius,
          virtualProgress: s.virtualProgress,
          rawScrollProgress: s.rawScrollProgress,
          isGateClamped: s.isGateClamped,
          endP: s.endP,
          onBlack: s.onBlack,
          isRewinding: s.isRewinding,
          rewindRevealP: s.rewindRevealP,
          introState: s.introState,
          introP: s.introP,
          introElapsedSec: s.introElapsedSec,
          introAssetsReady: s.introAssetsReady,
        };
      },
    };

    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__PILOT_TRANSITION_DEBUG__ =
        debugController;
    }

    // Programmatic scrollTo that navigates directly to a chapter's HOLD midpoint
    // (or triggers Seamless Rewind when navigating to Cover/0 from the black End Screen)
    const scrollToFn = (target: string | number) => {
      const s = useAppStore.getState();
      if (
        s.endP >= 0.85 &&
        (target === 0 || target === '#chapter-cover' || target === 'cover')
      ) {
        executeSeamlessRewind();
        return;
      }

      let resolvedTarget: string | number = target;
      if (typeof target === 'string') {
        const cleanId = target.replace('#chapter-', '').replace('#', '') as ChapterId;
        const cfg = CHAPTER_SCROLL_MAP[cleanId];
        if (cfg) {
          const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          resolvedTarget = cfg.holdMidpointProgress * maxScroll;
        }
      }

      lenis.scrollTo(resolvedTarget, {
        duration: reducedMotion ? 0 : 1.25,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    };
    setScrollToTarget(scrollToFn);

    const handlePointerDown = () => {
      if (useAppStore.getState().lastInputWasKeyboard) {
        useAppStore.getState().setLastInputWasKeyboard(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      useAppStore.getState().setLastInputWasKeyboard(true);

      // Toggle Transition Scrubber when pressing 'T' or 't'
      if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const state = useAppStore.getState();
        const cur = state.debugScrubber;
        const curBoundary = state.chapterState.boundaryIndex;
        const curTau = state.chapterState.tau;
        const curEndP = state.endP;
        const nextMode =
          state.introState !== 'done'
            ? 'intro'
            : curEndP > 0
              ? 'finale'
              : 'boundary';
        state.setDebugScrubber({
          enabled: !cur.enabled,
          mode: nextMode,
          boundaryIndex: curBoundary,
          tau: curTau,
          endP: curEndP,
          introP: state.introP,
          playing: false,
        });
        return;
      }

      // While intro is playing, do not scroll on keyboard keys (Intro.tsx handles Escape/Enter/Space skip)
      if (useAppStore.getState().introState !== 'done') {
        return;
      }

      // If focus is on a button or link and Enter/Space is pressed, let native click fire
      if ((tag === 'BUTTON' || tag === 'A') && (e.key === ' ' || e.key === 'Enter')) {
        return;
      }

      const step = window.innerHeight * 0.85;
      if (e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        scrollToFn(window.scrollY + step);
      } else if (e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        scrollToFn(Math.max(0, window.scrollY - step));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToFn(window.scrollY + window.innerHeight * 0.35);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToFn(Math.max(0, window.scrollY - window.innerHeight * 0.35));
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToFn(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToFn(document.documentElement.scrollHeight);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (rewindTweenRef.current) {
        rewindTweenRef.current.kill();
      }
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', syncRawScroll);
      masterTrigger.kill();
      gsap.ticker.remove(updateTicker);
      lenis.destroy();
      setScrollToTarget(null);
      setTriggerRewind(null);
    };
  }, [reducedMotion, setScrollState, setScrollToTarget, setTriggerRewind]);
}
