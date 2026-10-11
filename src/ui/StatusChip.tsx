import React from 'react';
import { useAppStore } from '../store/useAppStore';

export const StatusChip: React.FC = () => {
  const status = useAppStore((s) => s.discord.status);
  const customStatus = useAppStore((s) => s.discord.customStatus);
  const listeningToSpotify = useAppStore((s) => s.discord.listeningToSpotify);
  const scrollToTarget = useAppStore((s) => s.scrollToTarget);

  const renderShapeAndLabel = () => {
    switch (status) {
      case 'online':
        return {
          label: 'SYNC ACTIVE',
          icon: <span className="inline-block w-2.5 h-2.5 bg-red border border-ink" style={{ borderRadius: '9999px' }} />,
        };
      case 'idle':
        return {
          label: 'STANDBY',
          icon: (
            <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" aria-hidden="true">
              <circle cx="6" cy="6" r="5" fill="var(--paper-pure)" stroke="var(--ink)" strokeWidth="1.5" />
              <path d="M6 1 A5 5 0 0 1 6 11 Z" fill="var(--ink)" />
            </svg>
          ),
        };
      case 'dnd':
        return {
          label: 'DO NOT DISTURB',
          icon: (
            <span className="inline-flex items-center justify-center w-2.5 h-2.5 bg-ink">
              <span className="block w-1.5 h-[1.5px] bg-paper-pure" />
            </span>
          ),
        };
      case 'offline':
      default:
        return {
          label: 'SIGNAL LOST',
          icon: (
            <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" aria-hidden="true">
              <circle cx="6" cy="6" r="4.5" fill="none" stroke="var(--ink)" strokeWidth="2" />
            </svg>
          ),
        };
    }
  };

  const { label, icon } = renderShapeAndLabel();

  return (
    <button
      type="button"
      onClick={() => scrollToTarget?.('#chapter-status')}
      className="pointer-events-auto flex items-center gap-2 bg-paper-pure border-2 border-ink px-2.5 py-1 text-left hover:bg-ink hover:text-paper-pure transition-colors cursor-pointer"
      aria-live="polite"
      title={customStatus || `Pilot telemetry: ${label}`}
    >
      {icon}
      <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
        {label}
      </span>
      {listeningToSpotify && (
        <span className="font-mono text-[9px] bg-red text-paper-pure px-1 font-bold">
          AUDIO
        </span>
      )}
    </button>
  );
};
