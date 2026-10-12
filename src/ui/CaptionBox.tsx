import React, { useEffect, useState } from 'react';
import { CHAPTERS, useAppStore } from '../store/useAppStore';

interface CaptionBoxProps {
  text?: string;
  code?: string;
  className?: string;
  /** If true, keeps the caption persistently visible inside a page beat; default false (auto-dismisses after ~4s on scene beats per C4) */
  persistent?: boolean;
}

export const CaptionBox: React.FC<CaptionBoxProps> = ({
  text,
  code,
  className = '',
  persistent = false,
}) => {
  const activeChapter = useAppStore((s) => s.activeChapter);
  const currentMeta = CHAPTERS.find((c) => c.id === activeChapter) ?? CHAPTERS[0];
  const [dismissed, setDismissed] = useState(false);

  const displayCaption = text ?? currentMeta.caption;
  const displayCode = code ?? `CH.${currentMeta.number}`;

  // Auto-dismiss after ~4s when entering a scene beat (never fades to grey; slides cleanly out)
  useEffect(() => {
    if (persistent) {
      setDismissed(false);
      return;
    }
    setDismissed(false);
    const timer = window.setTimeout(() => {
      setDismissed(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeChapter, displayCaption, persistent]);

  return (
    <div
      className={`bg-paper-pure border-2 border-ink p-3 shadow-[4px_4px_0px_var(--ink)] w-full max-w-[280px] transition-transform duration-300 ease-in-out ${
        dismissed ? 'translate-y-[150%] pointer-events-none' : 'translate-y-0'
      } ${className}`}
    >
      <div className="flex items-center justify-between border-b border-ink/15 pb-1 mb-1.5">
        <span className="font-mono text-xs font-bold tracking-widest uppercase text-ink">
          {displayCode}
        </span>
        <span className="inline-block w-2 h-2 bg-red" aria-hidden="true" />
      </div>
      <p className="font-display text-xs sm:text-sm tracking-[0.12em] uppercase leading-snug text-ink">
        {displayCaption}
      </p>
    </div>
  );
};
