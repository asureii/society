import React from 'react';

interface ChapterCardProps {
  number: string;
  title: string;
  jpSubtitle: string;
  inverted?: boolean;
  alertText?: string;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  number,
  title,
  jpSubtitle,
  inverted = false,
  alertText,
}) => {
  return (
    <div
      className={`inline-block border-2 border-ink p-4 sm:p-5 shadow-[5px_5px_0px_var(--ink)] ${
        inverted ? 'bg-ink text-paper-pure' : 'bg-paper-pure text-ink'
      }`}
    >
      {alertText && (
        <div className="bg-red text-paper-pure font-mono text-[10px] font-bold tracking-[0.2em] uppercase px-2 py-0.5 mb-2 inline-block">
          {alertText}
        </div>
      )}
      <div className="flex items-baseline justify-between gap-6 border-b-2 border-red pb-1.5 mb-2">
        <span className="font-display text-sm sm:text-base tracking-[0.22em] uppercase">
          CHAPTER {number}
        </span>
        <span className="font-serif text-xs tracking-widest opacity-85" aria-hidden="true">
          {jpSubtitle}
        </span>
      </div>
      <h2 className="font-serif font-bold text-2xl sm:text-4xl md:text-5xl tracking-tight uppercase leading-none">
        {title}
      </h2>
    </div>
  );
};
