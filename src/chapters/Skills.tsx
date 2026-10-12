import React, { useEffect, useState } from 'react';
import { PROFILE, type MagiTier } from '../config/profile';
import { ChapterCard } from '../ui/ChapterCard';
import { InkSpotIllustration } from '../ui/InkSpotIllustration';
import { useAppStore } from '../store/useAppStore';

/**
 * Non-numeric hatch/tick level indicator (Part C6: replaces fabricated percentages).
 */
const HatchTierIndicator: React.FC<{ tier: MagiTier; label: string }> = ({ tier, label }) => {
  return (
    <div
      className="inline-flex items-center gap-1.5"
      title={`Proficiency tier: ${label}`}
      aria-label={`Tier: ${label}`}
    >
      <span className="font-mono text-xs font-bold uppercase text-ink group-hover:text-paper-pure">
        {label}
      </span>
      <div className="inline-flex items-center gap-0.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i < tier;
          return (
            <span
              key={i}
              className={`w-2 h-3 border border-ink group-hover:border-paper-pure ${
                filled
                  ? i === tier - 1 && tier === 5
                    ? 'bg-red'
                    : 'bg-ink group-hover:bg-paper-pure'
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
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const [pulsingHex, setPulsingHex] = useState<number>(4);

  useEffect(() => {
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setPulsingHex((prev) => (prev + 5) % 18);
    }, 2200);
    return () => clearInterval(id);
  }, [reducedMotion]);

  return (
    <section
      id="chapter-skills"
      aria-labelledby="heading-skills"
      className="relative min-h-screen w-full manga-page-wipe page-beat-safe pb-24 pointer-events-auto flex flex-col justify-center"
    >
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div
          data-content-box="skills-header"
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div id="heading-skills">
            <ChapterCard
              number="05"
              title="MAGI SYSTEM"
              jpSubtitle="伍 // 三賢人"
              alertText="CONSENSUS ARCHITECTURE"
            />
          </div>
          <div className="flex items-center gap-3 border-2 border-ink bg-paper-pure p-2">
            <InkSpotIllustration motif="hex-seal" seed={505} className="w-24 h-14" />
            <span className="font-mono text-xs font-bold uppercase text-ink max-w-[180px]">
              MELCHIOR • BALTHASAR • CASPAR
            </span>
          </div>
        </div>

        {/* MAGI Header Banner with subtle animated Hex-Grid SVG */}
        <div
          data-content-box="skills-hex-banner"
          className="relative bg-paper-pure border-3 border-ink p-4 sm:p-5 shadow-[5px_5px_0px_var(--ink)] overflow-hidden"
        >
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-full h-full"
            viewBox="0 0 720 120"
            preserveAspectRatio="xMidYMid slice"
          >
            {Array.from({ length: 18 }).map((_, idx) => {
              const col = idx % 9;
              const row = Math.floor(idx / 9);
              const cx = 45 + col * 78 + (row % 2) * 39;
              const cy = 35 + row * 50;
              const r = 24;
              const pts = Array.from({ length: 6 })
                .map((__, k) => {
                  const angle = (Math.PI / 3) * k - Math.PI / 6;
                  return `${(cx + r * Math.cos(angle)).toFixed(1)},${(
                    cy +
                    r * Math.sin(angle)
                  ).toFixed(1)}`;
                })
                .join(' ');
              const isPulsing = idx === pulsingHex;
              return (
                <polygon
                  key={idx}
                  points={pts}
                  fill={isPulsing ? 'var(--red)' : 'none'}
                  stroke="var(--ink)"
                  strokeOpacity={isPulsing ? 1 : 0.14}
                  strokeWidth={isPulsing ? '2' : '1'}
                />
              );
            })}
          </svg>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="bg-paper-pure border-2 border-ink px-3 py-1.5">
              <span className="font-display text-sm tracking-[0.18em] uppercase text-ink">
                DIRECT LINK // MELCHIOR•1 / BALTHASAR•2 / CASPAR•3
              </span>
            </div>
            <div className="flex items-center gap-2 bg-ink text-paper-pure px-3 py-1.5 border-2 border-ink">
              <span className="inline-block w-2 h-2 bg-red" />
              <span className="font-mono text-xs font-bold tracking-wider uppercase">
                DECISION: UNANIMOUS APPROVAL
              </span>
            </div>
          </div>
        </div>

        {/* Three-Column MAGI Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {PROFILE.magiSkills.map((col, idx) => (
            <article
              key={col.code}
              data-content-box={`skills-col-${idx}`}
              className="bg-paper-pure border-3 border-ink shadow-[5px_5px_0px_var(--ink)] flex flex-col justify-between"
            >
              <div>
                <div className="bg-ink text-paper-pure p-4 border-b-3 border-ink flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs tracking-[0.16em] text-red font-bold">
                      UNIT 0{idx + 1} // {col.persona}
                    </div>
                    <h3 className="font-display text-2xl tracking-[0.14em] uppercase mt-0.5">
                      {col.code}
                    </h3>
                  </div>
                  <span
                    className="font-serif text-xs tracking-widest border border-paper-pure px-2 py-1"
                    aria-hidden="true"
                  >
                    {col.jpLabel}
                  </span>
                </div>

                <div className="px-5 py-2.5 bg-paper border-b-2 border-ink font-mono text-xs font-bold tracking-wider uppercase text-ink">
                  {col.category}
                </div>

                <ul className="p-5 space-y-3">
                  {col.items.map((item) => (
                    <li
                      key={item.name}
                      className="border-2 border-ink p-3 bg-paper hover:bg-ink hover:text-paper-pure transition-colors group"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-serif font-bold text-base">{item.name}</span>
                        <HatchTierIndicator tier={item.tier} label={item.tierLabel} />
                      </div>
                      <div className="font-mono text-xs mt-1">{item.spec}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-5 py-3 border-t-2 border-ink flex items-center justify-between font-mono text-xs font-bold uppercase">
                <span>STATUS: ONLINE</span>
                <span className="text-red">NODE 0{idx + 1}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
