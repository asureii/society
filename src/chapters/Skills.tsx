import React, { useEffect, useRef } from 'react';
import { PROFILE, type MagiTier } from '../config/profile';
import { gsap } from '../lib/gsap';
import { useAppStore } from '../store/useAppStore';
import {
  MangaPanel,
  MangaPinnedChapter,
} from '../ui/MangaPageLayout';

const HatchTierIndicator: React.FC<{ tier: MagiTier; label: string }> = ({
  tier,
  label,
}) => {
  return (
    <div
      className="inline-flex items-center gap-1"
      title={`Proficiency tier: ${label}`}
      aria-label={`Tier: ${label}`}
    >
      <span className="font-mono text-[9px] sm:text-[10px] font-bold uppercase text-ink">
        {label}
      </span>
      <div className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < tier;
          return (
            <span
              key={i}
              className={`w-1.5 h-2.5 border border-ink ${
                filled
                  ? i === tier - 1 && tier === 5
                    ? 'bg-red'
                    : 'bg-ink'
                  : 'pattern-hatch bg-paper'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

export const Skills: React.FC = () => {
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasLoadedRef = useRef<boolean>(false);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const tilts = [-1.5, 1.2, -1.4];

  useEffect(() => {
    if (activeChapter !== 'skills' || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const elements = colRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (elements.length === 0) return;

    if (reducedMotion) {
      elements.forEach((el) => {
        el.style.transform = 'translate3d(0, 0, 0)';
        el.style.clipPath = 'none';
      });
      return;
    }

    gsap.fromTo(
      elements,
      { y: 14 },
      {
        y: 0,
        duration: 0.42,
        stagger: 0.07,
        ease: 'power3.out',
        clearProps: 'clipPath',
      },
    );
  }, [activeChapter, reducedMotion]);

  return (
    <MangaPinnedChapter
      id="skills"
      sceneId="s5-three-pillars"
      chapterNumber="05"
      title="THE THREE PILLARS"
      jpSubtitle="伍 // 三柱"
      classification="UNANIMOUS APPROVAL"
      summary="THREE COLOSSAL MONOLITHS CONVERGE TOWARD THE PULSING HEXAGONAL ZENITH."
      alignment="full"
    >
      {/* Upper area stays open for S5 Zenith Convergence & Red Hex Cell; 3 Pillars positioned below */}
      <div className="w-full flex-1 flex flex-col justify-end pb-2 pointer-events-none">
        {/* Three Irregular Skewed Manga Panels (Melchior / Balthasar / Caspar) loaded once and kept intact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 max-h-[45vh] lg:max-h-none overflow-hidden">
          {PROFILE.magiSkills.map((col, idx) => (
            <MangaPanel
              key={col.code}
              panelCode={`05.${idx + 1} // ${col.code}`}
              panelTitle={`${col.persona} • ${col.jpLabel}`}
              tiltDeg={tilts[idx]}
              bleedEdge={idx === 0 ? 'left' : idx === 2 ? 'right' : 'none'}
              redAccentCorner={idx === 1}
            >
              <div
                ref={(el) => {
                  colRefs.current[idx] = el;
                }}
              >
                <div>
                  <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-red border-b border-ink/15 pb-1 mb-1.5">
                    {col.category}
                  </div>
                  <ul className="space-y-1 sm:space-y-1.5">
                    {col.items.map((item) => (
                      <li
                        key={item.name}
                        className="border border-ink px-2 py-1 bg-paper flex flex-col gap-0.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif font-bold text-xs text-ink truncate">
                            {item.name}
                          </span>
                          <HatchTierIndicator
                            tier={item.tier}
                            label={item.tierLabel}
                          />
                        </div>
                        <div className="font-mono text-[9px] sm:text-[10px] text-ink/85 truncate">
                          {item.spec}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-1.5 pt-1 border-t border-ink/20 flex items-center justify-between font-mono text-[9px] sm:text-[10px] font-bold uppercase">
                  <span>STATUS: ONLINE</span>
                  <span className="text-red">PILLAR 0{idx + 1}</span>
                </div>
              </div>
            </MangaPanel>
          ))}
        </div>
      </div>
    </MangaPinnedChapter>
  );
};
