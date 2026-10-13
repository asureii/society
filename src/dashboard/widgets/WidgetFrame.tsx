import React, { useMemo } from 'react';
import type { DashboardWidgetSize, DashboardWidgetSlotId } from '../layout.config';

interface WidgetFrameProps {
  slotId: DashboardWidgetSlotId;
  widgetId: string;
  title: string;
  kicker: string;
  size?: DashboardWidgetSize;
  accentRed?: boolean;
  children: React.ReactNode;
}

function buildStaticWobblyPath(seedStr: string): string {
  let seed = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    seed ^= seedStr.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const nextRand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 1000) / 1000 - 0.5;
  };

  const j = (amp = 0.85) => (1 + nextRand() * amp).toFixed(2);
  const b = (base: number, amp = 0.85) => (base + nextRand() * amp).toFixed(2);

  return [
    `M ${j()} ${j()}`,
    `L 33 ${j()}`,
    `L 67 ${j()}`,
    `L ${b(99)} ${j()}`,
    `L ${b(99)} 35`,
    `L ${b(99)} 68`,
    `L ${b(99)} ${b(99)}`,
    `L 66 ${b(99)}`,
    `L 32 ${b(99)}`,
    `L ${j()} ${b(99)}`,
    `L ${j()} 65`,
    `L ${j()} 31`,
    'Z',
  ].join(' ');
}

export const WidgetFrame: React.FC<WidgetFrameProps> = ({
  slotId,
  widgetId,
  title,
  kicker,
  accentRed = false,
  children,
}) => {
  const wobblyPath = useMemo(
    () => buildStaticWobblyPath(`${slotId}:${widgetId}`),
    [slotId, widgetId]
  );

  return (
    <section
      data-slot-id={slotId}
      data-widget-id={widgetId}
      aria-label={`${kicker} ${title}`}
      className="relative bg-[var(--paper-pure)] border-2 border-[var(--ink)] shadow-[3px_3px_0px_0px_var(--ink)] pointer-events-auto overflow-hidden flex flex-col"
    >
      {/* Baked static hand-inked wobbly SVG border (no live filters) */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        data-wobbly-border="true"
        className="pointer-events-none absolute inset-0 w-full h-full z-20"
      >
        <path
          d={wobblyPath}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.35"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Header bar */}
      <header className="flex items-center justify-between gap-2 px-2.5 py-1 border-b-2 border-[var(--ink)] bg-[var(--paper)] shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`inline-block w-1.5 h-1.5 shrink-0 ${
              accentRed ? 'bg-[var(--red)]' : 'bg-[var(--ink)]'
            }`}
          />
          <span className="font-mono text-[9px] tracking-[0.16em] uppercase font-bold text-[var(--ink)] truncate">
            {kicker}
          </span>
          <span className="font-mono text-[9px] text-[var(--ink)]">//</span>
          <h2 className="font-display text-[11px] tracking-[0.08em] uppercase text-[var(--ink)] truncate m-0">
            {title}
          </h2>
        </div>
        <span className="font-mono text-[8px] tracking-[0.14em] uppercase px-1 py-0.2 border border-[var(--ink)] bg-[var(--paper-pure)] text-[var(--ink)] shrink-0">
          {slotId.toUpperCase()}
        </span>
      </header>

      {/* Body */}
      <div className="p-2.5 text-[var(--ink)] flex-1 flex flex-col justify-between min-h-0">
        {children}
      </div>
    </section>
  );
};

export const EmptySlotPlaceholder: React.FC<{ slotId: DashboardWidgetSlotId }> = ({
  slotId,
}) => {
  const wobblyPath = useMemo(() => buildStaticWobblyPath(`empty:${slotId}`), [slotId]);

  return (
    <section
      data-slot-id={slotId}
      data-widget-id="empty-placeholder"
      aria-label={`Unassigned slot ${slotId}`}
      className="relative bg-[var(--paper)] border border-dashed border-[var(--ink)] pointer-events-auto overflow-hidden p-2.5 flex flex-col justify-between min-h-[68px]"
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
        data-wobbly-border="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
      >
        <path
          d={wobblyPath}
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          stroke="var(--ink)"
          strokeWidth="0.6"
          strokeDasharray="2 4"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="font-mono text-[8px] tracking-[0.16em] uppercase font-bold text-[var(--ink)]">
          SLOT // {slotId.toUpperCase()}
        </span>
        <span className="inline-block w-1.5 h-1.5 border border-[var(--ink)] bg-[var(--paper-pure)]" />
      </div>

      <div className="relative z-10 my-1 py-1 px-1.5 border border-[var(--ink)] bg-[var(--paper-pure)] inline-block self-start">
        <span className="font-mono text-[9px] tracking-[0.14em] uppercase font-bold text-[var(--ink)]">
          UNASSIGNED // AWAITING SIGNAL
        </span>
      </div>
    </section>
  );
};
