import React, { useEffect, useRef } from 'react';
import { PROFILE } from '../config/profile';
import { computeIntroFrameTelemetry } from '../lib/introTimeline';
import { useAppStore } from '../store/useAppStore';

export const SoundToggle: React.FC = () => {
  const audioEnabled = useAppStore((s) => s.audioEnabled);
  const toggleAudio = useAppStore((s) => s.toggleAudio);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const onBlack = useAppStore((s) => s.onBlack);
  const introState = useAppStore((s) => s.introState);
  const introElapsedSec = useAppStore((s) => s.introElapsedSec);
  const isSkippingIntro = useAppStore((s) => s.isSkippingIntro);
  const skipProgress = useAppStore((s) => s.skipProgress);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const debugScrubber = useAppStore((s) => s.debugScrubber);
  const ambientRef = useRef<HTMLAudioElement | null>(null);

  const isScrubbingIntro = debugScrubber.enabled && debugScrubber.mode === 'intro';
  const hudOpacity =
    introState === 'done' && !isScrubbingIntro
      ? 1
      : computeIntroFrameTelemetry(introElapsedSec, isSkippingIntro, skipProgress, reducedMotion)
          .hudOpacity;

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
      data-hud
      data-hud-element="sound-toggle"
      data-on-black={onBlack ? 'true' : 'false'}
      style={{
        opacity: hudOpacity,
        visibility: hudOpacity <= 0.01 ? 'hidden' : 'visible',
      }}
      className={`fixed bottom-2.5 right-2.5 md:bottom-3.5 md:right-4 z-40 flex items-end ${
        hudOpacity <= 0.01 ? 'pointer-events-none' : 'pointer-events-auto'
      }`}
    >
      <button
        type="button"
        onClick={toggleAudio}
        aria-pressed={audioEnabled}
        aria-label={
          audioEnabled
            ? 'Mute sound effects and ambient audio'
            : 'Enable sound effects and ambient audio'
        }
        className={`group flex items-center gap-1.5 border-2 px-2 py-1 transition-colors duration-200 cursor-pointer ${
          onBlack
            ? 'bg-ink text-paper-pure border-paper-pure hover:bg-red hover:border-red'
            : 'bg-paper-pure text-ink border-ink shadow-[2px_2px_0px_var(--ink)] hover:bg-ink hover:text-paper-pure'
        }`}
      >
        <div className="flex items-end gap-[2px] h-2.5" aria-hidden="true">
          {[0.45, 0.95, 0.65, 1.0].map((barHeight, i) => (
            <span
              key={i}
              className={`w-[2.5px] transition-all duration-200 ${
                audioEnabled
                  ? 'bg-red animate-pulse'
                  : onBlack
                    ? 'bg-paper-pure'
                    : 'bg-ink group-hover:bg-paper-pure'
              }`}
              style={{
                height: audioEnabled ? `${Math.round(barHeight * 10)}px` : '4px',
                animationDelay: `${i * 110}ms`,
              }}
            />
          ))}
        </div>
        <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
          {audioEnabled ? 'ON' : 'OFF'}
        </span>
      </button>
    </div>
  );
};
