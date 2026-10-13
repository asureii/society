import React, { useEffect, useRef, useState } from 'react';
import { PROFILE } from '../config/profile';
import { computeIntroFrameTelemetry } from '../lib/introTimeline';
import { useAppStore, type ChapterId, type DiscordStatusType } from '../store/useAppStore';

const NAV_ITEMS: { id: ChapterId; label: string; anchor: string }[] = [
  { id: 'about', label: 'DOSSIER', anchor: '#chapter-about' },
  { id: 'work', label: 'THE WORK', anchor: '#chapter-work' },
  { id: 'status', label: 'STATUS', anchor: '#chapter-status' },
  { id: 'skills', label: 'MAGI', anchor: '#chapter-skills' },
  { id: 'timeline', label: 'TIMELINE', anchor: '#chapter-timeline' },
  { id: 'contact', label: 'CONTACT', anchor: '#chapter-contact' },
];

function renderCompactDiscordDot(status: DiscordStatusType, onBlack: boolean) {
  const strokeVar = onBlack ? 'var(--paper-pure)' : 'var(--ink)';
  const fillVar = onBlack ? 'var(--ink)' : 'var(--paper-pure)';
  switch (status) {
    case 'online':
      return {
        label: 'SYNC ACTIVE',
        dot: (
          <span
            className={`inline-block w-2.5 h-2.5 bg-red border shrink-0 ${
              onBlack ? 'border-paper-pure' : 'border-ink'
            }`}
            style={{ borderRadius: '9999px' }}
          />
        ),
      };
    case 'idle':
      return {
        label: 'STANDBY',
        dot: (
          <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 12 12" aria-hidden="true">
            <circle cx="6" cy="6" r="5" fill={fillVar} stroke={strokeVar} strokeWidth="1.5" />
            <path d="M6 1 A5 5 0 0 1 6 11 Z" fill={strokeVar} />
          </svg>
        ),
      };
    case 'dnd':
      return {
        label: 'DND',
        dot: (
          <span
            className={`inline-flex items-center justify-center w-2.5 h-2.5 shrink-0 ${
              onBlack ? 'bg-paper-pure' : 'bg-ink'
            }`}
          >
            <span className={`block w-1.5 h-[1.5px] ${onBlack ? 'bg-ink' : 'bg-paper-pure'}`} />
          </span>
        ),
      };
    case 'offline':
    default:
      return {
        label: 'SIGNAL LOST',
        dot: (
          <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 12 12" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" fill="none" stroke={strokeVar} strokeWidth="2" />
          </svg>
        ),
      };
  }
}

export const Nav: React.FC = () => {
  const headerRef = useRef<HTMLElement | null>(null);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const onBlack = useAppStore((s) => s.onBlack);
  const discordStatus = useAppStore((s) => s.discord.status);
  const scrollToTarget = useAppStore((s) => s.scrollToTarget);
  const introState = useAppStore((s) => s.introState);
  const introElapsedSec = useAppStore((s) => s.introElapsedSec);
  const isSkippingIntro = useAppStore((s) => s.isSkippingIntro);
  const skipProgress = useAppStore((s) => s.skipProgress);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const debugScrubber = useAppStore((s) => s.debugScrubber);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isScrubbingIntro = debugScrubber.enabled && debugScrubber.mode === 'intro';
  const hudOpacity =
    introState === 'done' && !isScrubbingIntro
      ? 1
      : computeIntroFrameTelemetry(introElapsedSec, isSkippingIntro, skipProgress, reducedMotion)
          .hudOpacity;

  // Measure real HUD bottom and set CSS variables --hud-top and --hud-side (Part E2 & E3)
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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (scrollToTarget) {
      scrollToTarget(target);
    } else {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const { label: statusLabel, dot: statusDot } = renderCompactDiscordDot(discordStatus, onBlack);

  const plateTheme = onBlack
    ? 'bg-ink text-paper-pure border-paper-pure'
    : 'bg-paper-pure text-ink border-ink shadow-[3px_3px_0px_var(--ink)]';

  const linkTheme = onBlack
    ? 'bg-ink text-paper-pure hover:bg-red hover:text-paper-pure'
    : 'bg-paper-pure text-ink hover:bg-ink hover:text-paper-pure';

  const dividerBorder = onBlack ? 'border-paper-pure' : 'border-ink';

  return (
    <header
      ref={headerRef}
      data-hud
      data-hud-element="top-bar"
      data-on-black={onBlack ? 'true' : 'false'}
      style={{
        opacity: hudOpacity,
        visibility: hudOpacity <= 0.01 ? 'hidden' : 'visible',
      }}
      className="fixed top-0 left-0 right-0 z-40 px-3 sm:px-5 md:px-10 pt-2 md:pt-3 pb-2 bg-transparent pointer-events-none transition-colors duration-200"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Compact Wordmark Plate + Discord Status Dot */}
        <div
          className={`pointer-events-auto inline-flex items-stretch border-2 transition-colors duration-200 ${plateTheme}`}
        >
          <a
            href="#chapter-cover"
            onClick={(e) => handleNavClick(e, '#chapter-cover')}
            className={`flex items-center gap-1.5 px-2.5 py-1 transition-colors ${linkTheme}`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="1.5" y="1.5" width="21" height="21" stroke="currentColor" strokeWidth="2" />
              <polygon points="12,4 20,19 4,19" fill="currentColor" />
              <circle cx="12" cy="14" r="2.6" fill="var(--red)" />
            </svg>
            <span className="font-display text-xs tracking-[0.14em] uppercase">
              {PROFILE.shortName}
            </span>
          </a>

          <a
            href="#chapter-status"
            onClick={(e) => handleNavClick(e, '#chapter-status')}
            aria-live="polite"
            className={`flex items-center gap-1.5 border-l-2 ${dividerBorder} px-2 py-1 transition-colors ${linkTheme}`}
          >
            {statusDot}
            <span className="font-mono text-[10px] sm:text-xs font-bold tracking-wider uppercase">
              {statusLabel}
            </span>
          </a>
        </div>

        {/* Desktop Boxed Navigation Bar */}
        <nav
          aria-label="Chapter Navigation"
          className={`hidden md:flex pointer-events-auto items-center border-2 transition-colors duration-200 ${plateTheme}`}
        >
          {NAV_ITEMS.slice(0, 3).map((item) => {
            const isActive = activeChapter === item.id;
            return (
              <a
                key={item.id}
                href={item.anchor}
                onClick={(e) => handleNavClick(e, item.anchor)}
                className={`relative px-3 py-1 font-display text-xs tracking-[0.14em] border-r-2 ${dividerBorder} transition-colors ${linkTheme}`}
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

          <div
            className={`flex items-center justify-center px-2 py-1 border-r-2 ${dividerBorder} bg-ink text-paper-pure`}
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
                className={`relative px-3 py-1 font-display text-xs tracking-[0.14em] transition-colors ${linkTheme} ${
                  idx < arr.length - 1 ? `border-r-2 ${dividerBorder}` : ''
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

        {/* Compact Mobile Boxed MENU Button */}
        <div className="md:hidden pointer-events-auto relative">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle chapter navigation menu"
            className={`border-2 px-2.5 py-1 font-display text-xs tracking-[0.14em] uppercase flex items-center gap-1.5 cursor-pointer transition-colors duration-200 ${plateTheme}`}
          >
            <span className="inline-block w-1.5 h-1.5 bg-red" />
            <span>{mobileMenuOpen ? 'CLOSE' : 'MENU'}</span>
          </button>

          {mobileMenuOpen && (
            <nav
              aria-label="Mobile Chapter Navigation"
              className={`absolute right-0 mt-1.5 w-44 border-2 flex flex-col z-50 ${plateTheme}`}
            >
              {NAV_ITEMS.map((item) => {
                const isActive = activeChapter === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.anchor}
                    onClick={(e) => handleNavClick(e, item.anchor)}
                    className={`px-3 py-2 font-display text-xs tracking-[0.14em] border-b ${dividerBorder} last:border-b-0 flex items-center justify-between ${linkTheme}`}
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
