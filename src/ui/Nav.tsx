import React from 'react';
import { PROFILE } from '../config/profile';
import { useAppStore, type ChapterId } from '../store/useAppStore';
import { StatusChip } from './StatusChip';

const NAV_ITEMS: { id: ChapterId; label: string; anchor: string }[] = [
  { id: 'about', label: 'DOSSIER', anchor: '#chapter-about' },
  { id: 'work', label: 'THE WORK', anchor: '#chapter-work' },
  { id: 'skills', label: 'MAGI', anchor: '#chapter-skills' },
  { id: 'contact', label: 'CONTACT', anchor: '#chapter-contact' },
];

export const Nav: React.FC = () => {
  const activeChapter = useAppStore((s) => s.activeChapter);
  const scrollToTarget = useAppStore((s) => s.scrollToTarget);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, anchor: string) => {
    e.preventDefault();
    if (scrollToTarget) {
      scrollToTarget(anchor);
    } else {
      document.querySelector(anchor)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-4 left-4 right-4 md:top-6 md:left-14 md:right-8 z-40 pointer-events-none flex items-start justify-between gap-2">
      {/* Top-left original emblem + wordmark */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pointer-events-auto">
        <a
          href="#chapter-cover"
          onClick={(e) => handleNavClick(e, '#chapter-cover')}
          className="group flex items-center gap-2.5 bg-paper-pure border-2 border-ink px-3 py-1.5 shadow-[3px_3px_0px_var(--ink)] hover:bg-ink hover:text-paper-pure transition-colors"
        >
          {/* Original geometric emblem (triangle + red core) */}
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="21" height="21" stroke="currentColor" strokeWidth="2" />
            <polygon points="12,4 20,19 4,19" fill="currentColor" />
            <circle cx="12" cy="14" r="2.6" fill="var(--red)" />
          </svg>
          <div className="flex flex-col leading-none">
            <span className="font-display text-sm tracking-[0.14em] uppercase">
              {PROFILE.shortName}
            </span>
            <span className="font-mono text-[9px] tracking-widest opacity-80">
              {PROFILE.designationCode}
            </span>
          </div>
        </a>

        <div className="hidden lg:block">
          <StatusChip />
        </div>
      </div>

      {/* Top-right boxed bar with center emblem mark & red active mark */}
      <nav
        aria-label="Chapter Navigation"
        className="pointer-events-auto flex items-center bg-paper-pure border-2 border-ink shadow-[3px_3px_0px_var(--ink)]"
      >
        {NAV_ITEMS.slice(0, 2).map((item) => {
          const isActive = activeChapter === item.id;
          return (
            <a
              key={item.id}
              href={item.anchor}
              onClick={(e) => handleNavClick(e, item.anchor)}
              className={`relative px-2.5 sm:px-3.5 py-2 font-display text-xs sm:text-sm tracking-[0.14em] border-r-2 border-ink transition-colors ${
                isActive
                  ? 'bg-paper-pure text-ink'
                  : 'bg-paper-pure text-ink hover:bg-ink hover:text-paper-pure'
              }`}
            >
              {isActive && (
                <span
                  className="inline-block w-1.5 h-1.5 bg-red mr-1.5 align-middle"
                  aria-hidden="true"
                />
              )}
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-red" />
              )}
            </a>
          );
        })}

        {/* Small center logo mark */}
        <div
          className="hidden sm:flex items-center justify-center px-2.5 py-2 border-r-2 border-ink bg-ink text-paper-pure"
          aria-hidden="true"
          title="ENTRY PLUG TELEMETRY"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <polygon points="8,2 14,13 2,13" stroke="var(--paper-pure)" strokeWidth="1.5" />
            <rect x="7" y="8" width="2" height="2" fill="var(--red)" />
          </svg>
        </div>

        {NAV_ITEMS.slice(2).map((item, idx) => {
          const isActive = activeChapter === item.id;
          return (
            <a
              key={item.id}
              href={item.anchor}
              onClick={(e) => handleNavClick(e, item.anchor)}
              className={`relative px-2.5 sm:px-3.5 py-2 font-display text-xs sm:text-sm tracking-[0.14em] transition-colors ${
                idx === 0 ? 'border-r-2 border-ink' : ''
              } ${
                isActive
                  ? 'bg-paper-pure text-ink'
                  : 'bg-paper-pure text-ink hover:bg-ink hover:text-paper-pure'
              }`}
            >
              {isActive && (
                <span
                  className="inline-block w-1.5 h-1.5 bg-red mr-1.5 align-middle"
                  aria-hidden="true"
                />
              )}
              {item.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-red" />
              )}
            </a>
          );
        })}
      </nav>
    </header>
  );
};
