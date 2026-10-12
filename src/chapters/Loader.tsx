import React, { useEffect, useState } from 'react';
import { PROFILE } from '../config/profile';
import { generateAllSceneArt } from '../scene/art';
import { useAppStore } from '../store/useAppStore';

export const Loader: React.FC = () => {
  const loadProgress = useAppStore((s) => s.loadProgress);
  const isLoaded = useAppStore((s) => s.isLoaded);
  const setLoadProgress = useAppStore((s) => s.setLoadProgress);
  const setIsLoaded = useAppStore((s) => s.setIsLoaded);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const isMobile = useAppStore((s) => s.isMobile);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const singleVariantOnly = reducedMotion || isMobile;

    void generateAllSceneArt({
      singleVariantOnly,
      onProgress: (pct) => {
        if (!cancelled) {
          setLoadProgress(pct);
        }
      },
    }).then(() => {
      if (cancelled) return;
      setLoadProgress(100);
      window.setTimeout(() => {
        if (cancelled) return;
        setIsLoaded(true);
        window.setTimeout(() => {
          if (!cancelled) setHidden(true);
        }, reducedMotion ? 80 : 500);
      }, 120);
    });

    return () => {
      cancelled = true;
    };
  }, [isMobile, reducedMotion, setIsLoaded, setLoadProgress]);

  if (hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Entry Plug Dossier"
      className={`fixed inset-0 z-50 bg-paper flex flex-col items-center justify-center p-6 transition-transform duration-500 ease-in-out ${
        isLoaded ? '-translate-x-full pointer-events-none' : 'translate-x-0'
      }`}
    >
      {/* Manga page-turn right border shadow */}
      <div className="absolute top-0 bottom-0 right-0 w-3 bg-ink" />

      <div className="relative w-full max-w-xl bg-paper-pure border-3 border-ink p-6 sm:p-8 shadow-[6px_6px_0px_var(--ink)]">
        {/* Top classification bar */}
        <div className="flex items-center justify-between border-b-2 border-ink pb-3 mb-5">
          <span className="font-mono text-xs font-bold tracking-widest uppercase">
            CHAPTER 00 // INK CALIBRATION
          </span>
          <span className="bg-red text-paper-pure font-mono text-xs font-bold px-2 py-0.5 tracking-widest">
            STAGE INIT
          </span>
        </div>

        {/* SVG Ink-draw illustration preview: Stepping stones leading to Twin Monolith + Red Orb (No Pilot Figure) */}
        <div className="relative h-36 border-2 border-ink mb-5 overflow-hidden bg-paper flex items-center justify-center">
          <svg
            className="w-full h-full p-4"
            viewBox="0 0 400 120"
            fill="none"
            aria-hidden="true"
          >
            {/* Horizon line drawing in */}
            <line
              x1="15"
              y1="88"
              x2={15 + (370 * loadProgress) / 100}
              y2="88"
              stroke="var(--ink)"
              strokeWidth="2.5"
            />
            {/* Red Orb at Twin Monolith Base */}
            <circle
              cx="260"
              cy="56"
              r={Math.max(2, (22 * loadProgress) / 100)}
              fill="var(--red)"
              stroke="var(--ink)"
              strokeWidth="2.5"
            />
            {/* Twin Monolith Slabs */}
            <polygon
              points="232,18 250,16 252,88 230,88"
              fill="var(--paper-pure)"
              stroke="var(--ink)"
              strokeWidth="2.5"
            />
            <polygon
              points="266,26 282,24 284,88 264,88"
              fill="var(--paper-pure)"
              stroke="var(--ink)"
              strokeWidth="2.5"
            />
            {/* Stepping Stones Receding */}
            <polygon
              points="155,108 235,108 228,101 162,101"
              fill="var(--paper-pure)"
              stroke="var(--ink)"
              strokeWidth="2"
            />
            <polygon
              points="185,98 242,98 237,93 190,93"
              fill="var(--paper-pure)"
              stroke="var(--ink)"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Title & Red Percentage Counter */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-widest uppercase text-ink mb-1">
              {PROFILE.designationCode}
            </p>
            <h1 className="font-serif font-bold text-2xl sm:text-3xl tracking-tight text-ink uppercase">
              {PROFILE.fullName}
            </h1>
          </div>
          <div className="text-right">
            <span className="font-mono text-xs tracking-widest uppercase block text-ink">
              INK SYNTHESIS
            </span>
            <span className="font-display text-4xl sm:text-5xl text-red leading-none">
              {String(loadProgress).padStart(3, '0')}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 w-full h-3 border-2 border-ink bg-paper p-0.5">
          <div
            className="h-full bg-red transition-all duration-75"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
