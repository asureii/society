import React, { useEffect, useState } from 'react';
import { PROFILE } from '../config/profile';
import { useAppStore } from '../store/useAppStore';

export const Loader: React.FC = () => {
  const loadProgress = useAppStore((s) => s.loadProgress);
  const isLoaded = useAppStore((s) => s.isLoaded);
  const setLoadProgress = useAppStore((s) => s.setLoadProgress);
  const setIsLoaded = useAppStore((s) => s.setIsLoaded);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let raf: number;
    let current = 0;

    const tick = () => {
      current += reducedMotion ? 20 : 3.2;
      if (current >= 100) {
        setLoadProgress(100);
        setTimeout(() => {
          setIsLoaded(true);
          setTimeout(() => setHidden(true), reducedMotion ? 100 : 650);
        }, 180);
        return;
      }
      setLoadProgress(Math.min(99, Math.floor(current)));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, setIsLoaded, setLoadProgress]);

  if (hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading Entry Plug Dossier"
      className={`fixed inset-0 z-50 bg-paper flex flex-col items-center justify-center p-6 transition-transform duration-700 ease-in-out ${
        isLoaded ? '-translate-x-full skew-x-3 pointer-events-none' : 'translate-x-0'
      }`}
    >
      {/* Manga page-turn right border shadow */}
      <div className="absolute top-0 bottom-0 right-0 w-4 bg-ink" />

      <div className="relative w-full max-w-xl bg-paper-pure border-4 border-ink p-6 sm:p-10 shadow-[8px_8px_0px_var(--ink)]">
        {/* Top classification bar */}
        <div className="flex items-center justify-between border-b-2 border-ink pb-3 mb-6">
          <span className="font-mono text-xs font-bold tracking-widest uppercase">
            CHAPTER 00 // INITIALIZATION
          </span>
          <span className="bg-red text-paper-pure font-mono text-[10px] font-bold px-2 py-0.5 tracking-widest">
            INK CALIBRATION
          </span>
        </div>

        {/* SVG Ink-draw illustration preview */}
        <div className="relative h-40 border-2 border-ink mb-6 overflow-hidden bg-paper flex items-center justify-center">
          <div className="absolute inset-0 pattern-hatch opacity-20" />
          <svg
            className="w-full h-full p-4"
            viewBox="0 0 400 120"
            fill="none"
            aria-hidden="true"
          >
            {/* Horizon line drawing in */}
            <line
              x1="10"
              y1="95"
              x2={10 + (380 * loadProgress) / 100}
              y2="95"
              stroke="var(--ink)"
              strokeWidth="3"
            />
            {/* Monolith */}
            <rect
              x="290"
              y="22"
              width="28"
              height="73"
              fill="var(--paper-pure)"
              stroke="var(--ink)"
              strokeWidth="3"
              strokeDasharray={220}
              strokeDashoffset={220 - (220 * loadProgress) / 100}
            />
            {/* Red Orb */}
            <circle
              cx="304"
              cy="48"
              r={Math.max(2, (24 * loadProgress) / 100)}
              fill="var(--red)"
              stroke="var(--ink)"
              strokeWidth="2.5"
            />
            {/* Cloaked Pilot Silhouette */}
            <polygon
              points="110,42 128,95 92,95"
              fill="var(--paper-pure)"
              stroke="var(--ink)"
              strokeWidth="3"
            />
            <line
              x1="102"
              y1="56"
              x2="122"
              y2="53"
              stroke="var(--red)"
              strokeWidth="3"
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
            <span className="font-mono text-[10px] tracking-widest uppercase block text-ink">
              SYNC RATIO
            </span>
            <span className="font-display text-4xl sm:text-5xl text-red leading-none">
              {String(loadProgress).padStart(3, '0')}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-5 w-full h-3 border-2 border-ink bg-paper p-0.5">
          <div
            className="h-full bg-red transition-all duration-75"
            style={{ width: `${loadProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
