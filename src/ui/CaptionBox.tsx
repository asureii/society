import React from 'react';
import { CHAPTERS, useAppStore } from '../store/useAppStore';

interface CaptionBoxProps {
  text?: string;
  code?: string;
  className?: string;
}

export const CaptionBox: React.FC<CaptionBoxProps> = ({ text, code, className = '' }) => {
  const activeChapter = useAppStore((s) => s.activeChapter);
  const currentMeta = CHAPTERS.find((c) => c.id === activeChapter) ?? CHAPTERS[0];

  const displayCaption = text ?? currentMeta.caption;
  const displayCode = code ?? `NARRATION // CH.${currentMeta.number}`;

  return (
    <div
      className={`bg-paper-pure border-2 border-ink p-3 shadow-[4px_4px_0px_var(--ink)] max-w-xs sm:max-w-sm ${className}`}
    >
      <div className="flex items-center justify-between border-b border-ink/15 pb-1 mb-1.5">
        <span className="font-mono text-[9px] font-bold tracking-widest uppercase text-ink">
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
