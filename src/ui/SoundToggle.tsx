import React, { useEffect, useRef } from 'react';
import { PROFILE } from '../config/profile';
import { useAppStore } from '../store/useAppStore';

export const SoundToggle: React.FC = () => {
  const audioEnabled = useAppStore((s) => s.audioEnabled);
  const toggleAudio = useAppStore((s) => s.toggleAudio);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const ambientRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!PROFILE.audio.ambientUrl) return;
    if (!ambientRef.current) {
      const audio = new Audio(PROFILE.audio.ambientUrl);
      audio.loop = true;
      audio.volume = 0.25;
      ambientRef.current = audio;
    }
    if (audioEnabled) {
      ambientRef.current.play().catch(() => {});
    } else {
      ambientRef.current.pause();
    }
  }, [audioEnabled]);

  useEffect(() => {
    if (!audioEnabled || !PROFILE.audio.pageTurnUrl) return;
    const sfx = new Audio(PROFILE.audio.pageTurnUrl);
    sfx.volume = 0.35;
    sfx.play().catch(() => {});
  }, [activeChapter, audioEnabled]);

  return (
    <div
      data-hud-element="sound-toggle"
      className="fixed bottom-4 right-4 md:bottom-5 md:right-6 z-40 pointer-events-auto flex items-end"
    >
      <button
        type="button"
        onClick={toggleAudio}
        aria-pressed={audioEnabled}
        aria-label={audioEnabled ? 'Mute sound effects and ambient audio' : 'Enable sound effects and ambient audio'}
        className="group flex items-center gap-2 bg-paper-pure border-2 border-ink px-2.5 py-1.5 shadow-[3px_3px_0px_var(--ink)] hover:bg-ink hover:text-paper-pure transition-colors cursor-pointer"
      >
        <div className="flex items-end gap-[2px] h-3" aria-hidden="true">
          {[0.45, 0.95, 0.65, 1.0].map((barHeight, i) => (
            <span
              key={i}
              className={`w-[3px] transition-all duration-200 ${
                audioEnabled ? 'bg-red animate-pulse' : 'bg-ink group-hover:bg-paper-pure'
              }`}
              style={{
                height: audioEnabled ? `${Math.round(barHeight * 12)}px` : '4px',
                animationDelay: `${i * 110}ms`,
              }}
            />
          ))}
        </div>
        <span className="font-mono text-xs font-bold tracking-wider uppercase">
          {audioEnabled ? 'ON' : 'OFF'}
        </span>
      </button>
    </div>
  );
};
