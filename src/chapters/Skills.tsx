import React, { useEffect, useState } from 'react';
import { PROFILE } from '../config/profile';
import { ChapterCard } from '../ui/ChapterCard';
import { CaptionBox } from '../ui/CaptionBox';
import { useAppStore } from '../store/useAppStore';

export const Skills: React.FC = () => {
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const [pulsingHex, setPulsingHex] = useState<number>(4);

  // Subtle occasional red cell pulse in the hexagonal grid
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
      className="relative min-h-[120vh] w-full px-6 sm:px-12 md:px-20 py-28 pointer-events-none flex flex-col justify-center"
    >
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pointer-events-auto">
          <div id="heading-skills">
            <ChapterCard
              number="05"
              title="MAGI SYSTEM"
              jpSubtitle="伍 // 三賢人合議制"
              alertText="SUPERCOMPUTER // 7TH GENERATION"
            />
          </div>
          <CaptionBox
            code="CAPTION // 05 : CONSENSUS"
            text="MELCHIOR, BALTHASAR, AND CASPAR CONCUR: UNANIMOUS APPROVAL."
          />
        </div>

        {/* MAGI Header Banner with subtle animated Hex-Grid SVG (black hairlines on white, occasional red cell pulse) */}
        <div className="pointer-events-auto relative bg-paper-pure border-3 border-ink p-5 shadow-[6px_6px_0px_var(--ink)] overflow-hidden">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 w-full h-full opacity-90"
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
                  fillOpacity={isPulsing ? 0.85 : 0}
                  stroke="var(--ink)"
                  strokeOpacity={isPulsing ? 1 : 0.14}
                  strokeWidth={isPulsing ? '2' : '1'}
                />
              );
            })}
          </svg>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="bg-paper-pure border-2 border-ink px-3 py-1.5">
              <span className="font-display text-sm sm:text-base tracking-[0.2em] uppercase text-ink">
                DIRECT LINK // MELCHIOR•1 / BALTHASAR•2 / CASPAR•3
              </span>
            </div>
            <div className="flex items-center gap-2 bg-ink text-paper-pure px-3 py-1.5 border-2 border-ink">
              <span className="inline-block w-2 h-2 bg-red" />
              <span className="font-mono text-xs font-bold tracking-widest uppercase">
                DECISION: CONDITIONAL APPROVAL // 承認
              </span>
            </div>
          </div>
        </div>

        {/* Three-Column MAGI Architecture */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pointer-events-auto">
          {PROFILE.magiSkills.map((col, idx) => (
            <article
              key={col.code}
              className="bg-paper-pure border-3 border-ink shadow-[6px_6px_0px_var(--ink)] flex flex-col justify-between"
            >
              <div>
                {/* Top MAGI Unit Header */}
                <div className="bg-ink text-paper-pure p-4 border-b-3 border-ink flex items-center justify-between">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.2em] text-red font-bold">
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

                {/* Category Sub-bar */}
                <div className="px-5 py-2.5 bg-paper border-b-2 border-ink font-mono text-xs font-bold tracking-wider uppercase text-ink">
                  {col.category}
                </div>

                {/* Skill Items */}
                <ul className="p-5 space-y-3">
                  {col.items.map((item) => (
                    <li
                      key={item.name}
                      className="border-2 border-ink p-3 bg-paper hover:bg-ink hover:text-paper-pure transition-colors group"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-serif font-bold text-base">{item.name}</span>
                        <span className="font-mono text-xs font-bold text-red group-hover:text-paper-pure">
                          {item.syncLevel}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] opacity-80 mt-1">{item.spec}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="px-5 py-3 border-t-2 border-ink flex items-center justify-between font-mono text-[10px] font-bold uppercase">
                <span>STATUS: ONLINE</span>
                <span className="text-red">PRIORITY // 0{idx + 1}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
