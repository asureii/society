import React, { useEffect, useRef, useState } from 'react';
import { PROFILE } from '../config/profile';
import { useAppStore, type ChapterId, type DiscordStatusType } from '../store/useAppStore';

const NAV_ITEMS: { id: ChapterId; label: string; anchor: string }[] = [
  { id: 'about', label: 'DOSSIER', anchor: '#chapter-about' },
  { id: 'work', label: 'THE WORK', anchor: '#chapter-work' },
  { id: 'status', label: 'STATUS', anchor: '#chapter-status' },
  { id: 'skills', label: 'MAGI', anchor: '#chapter-skills' },
  { id: 'timeline', label: 'TIMELINE', anchor: '#chapter-timeline' },
  { id: 'contact', label: 'CONTACT', anchor: '#chapter-contact' },
];

function renderCompactDiscordDot(status: DiscordStatusType) {
  switch (status) {
    case 'online':
      return {
        label: 'SYNC ACTIVE',
        dot: (
          <span
            className="inline-block w-2.5 h-2.5 bg-red border border-ink shrink-0"
            style={{ borderRadius: '9999px' }}
          />
        ),
      };
    case 'idle':
      return {
        label: 'STANDBY',
        dot: (
          <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 12 12" aria-hidden="true">
            <circle cx="6" cy="6" r="5" fill="var(--paper-pure)" stroke="var(--ink)" strokeWidth="1.5" />
            <path d="M6 1 A5 5 0 0 1 6 11 Z" fill="var(--ink)" />
          </svg>
        ),
      };
    case 'dnd':
      return {
        label: 'DND',
        dot: (
          <span className="inline-flex items-center justify-center w-2.5 h-2.5 bg-ink shrink-0">
            <span className="block w-1.5 h-[1.5px] bg-paper-pure" />
          </span>
        ),
      };
    case 'offline':
    default:
      return {
        label: 'SIGNAL LOST',
        dot: (
          <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 12 12" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--ink)" strokeWidth="2" />
          </svg>
        ),
      };
  }
}

export const Nav: React.FC = () => {
  const headerRef = useRef<HTMLElement | null>(null);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const activeBeatMode = useAppStore((s) => s.activeBeatMode);
  const isPageOpaque = useAppStore((s) => s.isPageOpaque);
  const discordStatus = useAppStore((s) => s.discord.status);
  const scrollToTarget = useAppStore((s) => s.scrollToTarget);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Measure real HUD height and set CSS variables --hud-top and --hud-side (Part C5)
  useEffect(() => {
    const updateHudMetrics = () => {
      if (!headerRef.current) return;
      const rect = headerRef.current.getBoundingClientRect();
      const hudTop = Math.ceil(rect.bottom);
      document.documentElement.style.setProperty('--hud-top', `${hudTop}px`);
      document.documentElement.style.setProperty(
        '--hud-side',
        window.innerWidth >= 768 ? '44px' : '16px',
      );
    };

    updateHudMetrics();
    window.addEventListener('resize', updateHudMetrics);
    return () => window.removeEventListener('resize', updateHudMetrics);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, anchor: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (scrollToTarget) {
      scrollToTarget(anchor);
    } else {
      document.querySelector(anchor)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const { label: statusLabel, dot: statusDot } = renderCompactDiscordDot(discordStatus);
  const isSolidBand = activeBeatMode === 'page' || isPageOpaque;

  return (
    <header
      ref={headerRef}
      data-hud-element="top-bar"
      className={`fixed top-0 left-0 right-0 z-40 px-4 md:px-10 pt-3 md:pt-4 pb-2.5 transition-colors duration-200 ${
        isSolidBand
          ? 'bg-paper border-b-2 border-ink pointer-events-auto'
          : 'bg-transparent pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Merged Wordmark Plate + Compact Discord Status Dot + 12px Label (No sub-label line, no separate floating chip per C4) */}
        <div className="pointer-events-auto inline-flex items-stretch bg-paper-pure border-2 border-ink shadow-[3px_3px_0px_var(--ink)]">
          <a
            href="#chapter-cover"
            onClick={(e) => handleNavClick(e, '#chapter-cover')}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-ink hover:text-paper-pure transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="1.5" y="1.5" width="21" height="21" stroke="currentColor" strokeWidth="2" />
              <polygon points="12,4 20,19 4,19" fill="currentColor" />
              <circle cx="12" cy="14" r="2.6" fill="var(--red)" />
            </svg>
            <span className="font-display text-xs sm:text-sm tracking-[0.14em] uppercase">
              {PROFILE.shortName}
            </span>
          </a>

          <a
            href="#chapter-status"
            onClick={(e) => handleNavClick(e, '#chapter-status')}
            aria-live="polite"
            className="flex items-center gap-1.5 border-l-2 border-ink px-2.5 py-1.5 hover:bg-ink hover:text-paper-pure transition-colors"
          >
            {statusDot}
            <span className="font-mono text-xs font-bold tracking-wider uppercase">
              {statusLabel}
            </span>
          </a>
        </div>

        {/* Desktop Boxed Navigation Bar */}
        <nav
          aria-label="Chapter Navigation"
          className="hidden md:flex pointer-events-auto items-center bg-paper-pure border-2 border-ink shadow-[3px_3px_0px_var(--ink)]"
        >
          {NAV_ITEMS.slice(0, 3).map((item) => {
            const isActive = activeChapter === item.id;
            return (
              <a
                key={item.id}
                href={item.anchor}
                onClick={(e) => handleNavClick(e, item.anchor)}
                className="relative px-3 py-1.5 font-display text-xs tracking-[0.14em] border-r-2 border-ink bg-paper-pure text-ink hover:bg-ink hover:text-paper-pure transition-colors"
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

          {/* Center Emblem Mark */}
          <div
            className="flex items-center justify-center px-2 py-1.5 border-r-2 border-ink bg-ink text-paper-pure"
            aria-hidden="true"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
              <polygon points="8,2 14,13 2,13" stroke="var(--paper-pure)" strokeWidth="1.5" />
              <rect x="7" y="8" width="2" height="2" fill="var(--red)" />
            </svg>
          </div>

          {NAV_ITEMS.slice(3).map((item, idx, arr) => {
            const isActive = activeChapter === item.id;
            return (
              <a
                key={item.id}
                href={item.anchor}
                onClick={(e) => handleNavClick(e, item.anchor)}
                className={`relative px-3 py-1.5 font-display text-xs tracking-[0.14em] bg-paper-pure text-ink hover:bg-ink hover:text-paper-pure transition-colors ${
                  idx < arr.length - 1 ? 'border-r-2 border-ink' : ''
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

        {/* Mobile Boxed MENU Button (Part C7) */}
        <div className="md:hidden pointer-events-auto relative">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle chapter navigation menu"
            className="bg-paper-pure border-2 border-ink px-3 py-1.5 font-display text-xs tracking-[0.16em] uppercase shadow-[3px_3px_0px_var(--ink)] flex items-center gap-2 cursor-pointer"
          >
            <span className="inline-block w-2 h-2 bg-red" />
            <span>{mobileMenuOpen ? 'CLOSE' : 'MENU'}</span>
          </button>

          {mobileMenuOpen && (
            <nav
              aria-label="Mobile Chapter Navigation"
              className="absolute right-0 mt-2 w-48 bg-paper-pure border-2 border-ink shadow-[5px_5px_0px_var(--ink)] flex flex-col z-50"
            >
              {NAV_ITEMS.map((item) => {
                const isActive = activeChapter === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.anchor}
                    onClick={(e) => handleNavClick(e, item.anchor)}
                    className="px-3.5 py-2.5 font-display text-xs tracking-[0.14em] border-b border-ink last:border-b-0 flex items-center justify-between bg-paper-pure text-ink hover:bg-ink hover:text-paper-pure"
                  >
                    <span>{item.label}</span>
                    {isActive && <span className="w-2 h-2 bg-red inline-block" />}
                  </a>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
};
