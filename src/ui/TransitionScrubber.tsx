/**
 * DEV-ONLY INTRO, TRANSITION & FINALE SCRUBBER OVERLAY (src/ui/TransitionScrubber.tsx)
 *
 * Keyboard-toggled by pressing `T`. Allows frame-accurate inspection of:
 * - The Cinematic Intro Sequence (`INTRO`, `introP` in `[0, 1]` / `0.00s .. 9.20s`)
 * - All 6 scene boundaries (`S1->S2` through `S6->S7`, `tau` in `[0, 1]`)
 * - The S7 Doorway-Closing Finale (`END`, `endP` in `[0, 1]`)
 */

import React from 'react';
import { INTRO_CONFIG } from '../config/intro';
import { SCENES_CONFIG } from '../config/scenes.config';
import { clamp } from '../lib/math';
import { useAppStore } from '../store/useAppStore';

export const TransitionScrubber: React.FC = () => {
  const scrubber = useAppStore((s) => s.debugScrubber);
  const setDebugScrubber = useAppStore((s) => s.setDebugScrubber);
  const chapterState = useAppStore((s) => s.chapterState);
  const endP = useAppStore((s) => s.endP);
  const onBlack = useAppStore((s) => s.onBlack);
  const introState = useAppStore((s) => s.introState);
  const introElapsedSec = useAppStore((s) => s.introElapsedSec);
  const introAssetsReady = useAppStore((s) => s.introAssetsReady);
  const sceneReadyMap = useAppStore((s) => s.sceneReadyMap);

  if (!scrubber.enabled) {
    return null;
  }

  const isIntroMode = scrubber.mode === 'intro';
  const isFinaleMode = scrubber.mode === 'finale';
  const bIdx = scrubber.boundaryIndex;
  const tau = scrubber.tau;
  const activeScalar = isIntroMode
    ? scrubber.introP
    : isFinaleMode
      ? scrubber.endP
      : tau;

  const fromScene = SCENES_CONFIG[bIdx] ?? SCENES_CONFIG[0];
  const toScene = SCENES_CONFIG[bIdx + 1] ?? SCENES_CONFIG[1];
  const fromReady = sceneReadyMap[fromScene.id];
  const toReady = sceneReadyMap[toScene.id];

  const applyIntroP = (nextIntroP: number, playing = false) => {
    const clampedP = Number(clamp(nextIntroP, 0, 1).toFixed(4));
    const win = window as unknown as {
      __PILOT_TRANSITION_DEBUG__?: {
        setIntroProgress: (p: number) => void;
      };
    };
    if (win.__PILOT_TRANSITION_DEBUG__ && !playing) {
      win.__PILOT_TRANSITION_DEBUG__.setIntroProgress(clampedP);
    } else {
      setDebugScrubber({
        enabled: true,
        mode: 'intro',
        introP: clampedP,
        playing,
      });
    }
  };

  const applyBoundaryTau = (nextBoundary: number, nextTau: number, playing = false) => {
    const clampedB = clamp(nextBoundary, 0, SCENES_CONFIG.length - 2);
    const clampedT = Number(clamp(nextTau, 0, 1).toFixed(4));
    const win = window as unknown as {
      __PILOT_TRANSITION_DEBUG__?: {
        setBoundaryTau: (b: number, t: number) => void;
      };
    };
    if (win.__PILOT_TRANSITION_DEBUG__ && !playing) {
      win.__PILOT_TRANSITION_DEBUG__.setBoundaryTau(clampedB, clampedT);
    } else {
      setDebugScrubber({
        enabled: true,
        mode: 'boundary',
        boundaryIndex: clampedB,
        tau: clampedT,
        playing,
      });
    }
  };

  const applyFinaleEndP = (nextEndP: number, playing = false) => {
    const clampedE = Number(clamp(nextEndP, 0, 1).toFixed(4));
    const win = window as unknown as {
      __PILOT_TRANSITION_DEBUG__?: {
        setEndProgress: (e: number) => void;
      };
    };
    if (win.__PILOT_TRANSITION_DEBUG__ && !playing) {
      win.__PILOT_TRANSITION_DEBUG__.setEndProgress(clampedE);
    } else {
      setDebugScrubber({
        enabled: true,
        mode: 'finale',
        endP: clampedE,
        playing,
      });
    }
  };

  const stepFrame = (deltaSteps: number) => {
    const stepSize = isIntroMode ? 1 / (INTRO_CONFIG.totalDurationSec * 60) : 1 / 120;
    if (isIntroMode) {
      applyIntroP(scrubber.introP + deltaSteps * stepSize, false);
    } else if (isFinaleMode) {
      applyFinaleEndP(scrubber.endP + deltaSteps * stepSize, false);
    } else {
      applyBoundaryTau(bIdx, tau + deltaSteps * stepSize, false);
    }
  };

  return (
    <aside
      data-hud
      data-hud-element="transition-scrubber"
      aria-label="Transition Scrubber Debug Panel"
      className="fixed bottom-4 left-4 z-50 w-[350px] sm:w-[440px] bg-paper-pure border-3 border-ink p-3 shadow-[5px_5px_0px_var(--ink)] font-mono text-xs text-ink pointer-events-auto"
    >
      <div className="flex items-center justify-between border-b-2 border-ink pb-1.5 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="bg-red text-paper-pure px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            SCRUBBER [T]
          </span>
          <span className="font-bold text-[11px] uppercase">
            {isIntroMode
              ? 'INTRO TIMELINE'
              : isFinaleMode
                ? 'FINALE endP'
                : 'SINGLE CLOCK τ'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDebugScrubber({ enabled: false, playing: false })}
          className="border border-ink px-1.5 py-0.5 text-[10px] font-bold uppercase hover:bg-ink hover:text-paper-pure cursor-pointer"
        >
          CLOSE
        </button>
      </div>

      {/* Mode & Boundary Selector Buttons (INTRO + 0..5 + END) */}
      <div className="grid grid-cols-8 gap-1 mb-2">
        <button
          type="button"
          onClick={() => applyIntroP(scrubber.introP, false)}
          className={`border border-ink py-1 text-[10px] font-bold uppercase cursor-pointer ${
            isIntroMode ? 'bg-red text-paper-pure' : 'bg-paper text-red hover:bg-red/10'
          }`}
        >
          INTRO
        </button>
        {SCENES_CONFIG.slice(0, -1).map((s, idx) => {
          const isSelected = !isIntroMode && !isFinaleMode && bIdx === idx;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => applyBoundaryTau(idx, tau, false)}
              className={`border border-ink py-1 text-[10px] font-bold uppercase cursor-pointer ${
                isSelected ? 'bg-ink text-paper-pure' : 'bg-paper text-ink hover:bg-ink/10'
              }`}
            >
              {idx + 1}→{idx + 2}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => applyFinaleEndP(scrubber.endP, false)}
          className={`border border-ink py-1 text-[10px] font-bold uppercase cursor-pointer ${
            isFinaleMode ? 'bg-red text-paper-pure' : 'bg-paper text-red hover:bg-red/10'
          }`}
        >
          END
        </button>
      </div>

      {/* Slider + Frame Controls */}
      <div className="space-y-1.5 mb-2">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span>
            {isIntroMode
              ? `introP = ${activeScalar.toFixed(3)} (${introElapsedSec.toFixed(2)}s / ${INTRO_CONFIG.totalDurationSec.toFixed(1)}s)`
              : `${isFinaleMode ? 'endP' : 'τ'} = ${activeScalar.toFixed(4)} (STEP ${Math.round(activeScalar * 120)}/120)`}
          </span>
          <span className="text-red uppercase">
            {isIntroMode
              ? introState.toUpperCase()
              : isFinaleMode
                ? 'DOORWAY CLOSE'
                : fromScene.transitionOut}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={activeScalar}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (isIntroMode) {
              applyIntroP(v, false);
            } else if (isFinaleMode) {
              applyFinaleEndP(v, false);
            } else {
              applyBoundaryTau(bIdx, v, false);
            }
          }}
          aria-label="Intro, transition, or finale progress"
          className="w-full accent-red cursor-pointer"
        />

        <div className="flex items-center justify-between gap-1.5">
          <button
            type="button"
            onClick={() => stepFrame(-1)}
            className="flex-1 border border-ink bg-paper py-1 text-[10px] font-bold uppercase hover:bg-ink hover:text-paper-pure cursor-pointer"
          >
            -1F
          </button>
          <button
            type="button"
            onClick={() =>
              setDebugScrubber({
                playing: !scrubber.playing,
              })
            }
            className="flex-1 border border-ink bg-red text-paper-pure py-1 text-[10px] font-bold uppercase cursor-pointer"
          >
            {scrubber.playing ? 'PAUSE' : 'PLAY'}
          </button>
          <button
            type="button"
            onClick={() => stepFrame(1)}
            className="flex-1 border border-ink bg-paper py-1 text-[10px] font-bold uppercase hover:bg-ink hover:text-paper-pure cursor-pointer"
          >
            +1F
          </button>
          <button
            type="button"
            onClick={() =>
              isIntroMode
                ? applyIntroP(7.5 / INTRO_CONFIG.totalDurationSec, false)
                : isFinaleMode
                  ? applyFinaleEndP(0.88, false)
                  : applyBoundaryTau(bIdx, 0.5, false)
            }
            className="border border-ink bg-paper px-2 py-1 text-[10px] font-bold uppercase hover:bg-ink hover:text-paper-pure cursor-pointer"
          >
            {isIntroMode ? '7.5s' : isFinaleMode ? '0.88' : 'τ=0.5'}
          </button>
        </div>
      </div>

      {/* Telemetry Readout */}
      <div className="border border-ink bg-paper p-2 space-y-1 text-[10px]">
        <div className="flex justify-between">
          <span className="font-bold">INTRO TELEMETRY:</span>
          <span>
            PHASE={introState.toUpperCase()} | ASSETS={introAssetsReady ? 'READY' : 'WAIT'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">CHAPTER STATE:</span>
          <span>
            {chapterState.from.toUpperCase()} → {chapterState.to.toUpperCase()} (FINALE={endP.toFixed(2)}, BLACK={onBlack ? 'Y' : 'N'})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">GPU READINESS:</span>
          <span>
            S1={sceneReadyMap['s1-causeway'] ? 'READY' : 'WAIT'} | FROM={fromReady ? 'READY' : 'WAIT'} | TO={toReady ? 'READY' : 'WAIT'}
          </span>
        </div>
      </div>
    </aside>
  );
};
