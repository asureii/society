import React, { useEffect, useState } from 'react';
import { EVA_META } from './eva/evaGenerator.ts';
import { EVA_SKELETON } from './eva/skeleton.ts';
import type { DashboardDebugGeometry } from './DashboardWebGLStage.tsx';

/**
 * H-UNIT ANATOMICAL BUST PROPORTION DEBUG OVERLAY (`G` KEY ON /DASHBOARD)
 * (src/dashboard/EvaDebugOverlay.tsx)
 */
export const EvaDebugOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [geom, setGeom] = useState<DashboardDebugGeometry | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'g' || e.key === 'G') {
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!visible) return;
    let raf = 0;
    const poll = () => {
      const g = window.__DASHBOARD_TELEMETRY__?.debugGeometry;
      if (g) {
        setGeom({ ...g, headBoxScreenPx: { ...g.headBoxScreenPx } });
      }
      raf = window.requestAnimationFrame(poll);
    };
    poll();
    return () => window.cancelAnimationFrame(raf);
  }, [visible]);

  if (!visible) return null;

  const hPx = geom?.headUnitScreenPx ?? 240;
  const headBox = geom?.headBoxScreenPx ?? {
    x: 220,
    y: 180,
    width: 1.15 * hPx,
    height: hPx,
  };
  const hornBase = geom?.hornBaseScreenPx ?? [headBox.x + 0.8 * hPx, headBox.y + 0.16 * hPx];
  const hornTip = geom?.hornTipScreenPx ?? [headBox.x + 1.6 * hPx, headBox.y - 0.78 * hPx];
  const jawTip = geom?.jawTipScreenPx ?? [headBox.x + 1.1 * hPx, headBox.y + 0.98 * hPx];
  const neckTop = geom?.neckTopScreenPx ?? [headBox.x + 0.5 * hPx, headBox.y + 0.64 * hPx];
  const neckBase = geom?.neckBaseScreenPx ?? [headBox.x + 0.1 * hPx, headBox.y + 1.42 * hPx];
  const throatBot = geom?.throatBotScreenPx ?? [headBox.x + 0.48 * hPx, headBox.y + 1.34 * hPx];

  const r = EVA_META.measuredRatios;
  const gridRows = [-1, 0, 1, 2];
  const gridCols = [-1, 0, 1, 2];

  return (
    <div
      data-eva-debug-overlay
      aria-label="Eva-01 Bust H-Unit Proportion Debug Overlay"
      className="fixed inset-0 z-40 pointer-events-none select-none overflow-hidden"
    >
      <svg className="w-full h-full">
        {gridRows.map((row) => {
          const y = headBox.y + row * hPx;
          return (
            <g key={`row-${row}`}>
              <line
                x1={0}
                y1={y}
                x2={headBox.x + hPx * 2.4}
                y2={y}
                stroke="var(--ink)"
                strokeWidth={row === 0 || row === 1 ? 1.5 : 1}
                strokeDasharray={row === 0 || row === 1 ? '6 3' : '3 5'}
              />
              <text
                x={14}
                y={y - 5}
                fill="var(--ink)"
                fontSize="11"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {row >= 0 ? `+${row}.0H` : `${row}.0H`}
              </text>
            </g>
          );
        })}

        {gridCols.map((col) => {
          const x = headBox.x + col * hPx;
          return (
            <line
              key={`col-${col}`}
              x1={x}
              y1={0}
              x2={x}
              y2={headBox.y + hPx * 2.5}
              stroke="var(--ink)"
              strokeWidth={1}
              strokeDasharray="2 6"
            />
          );
        })}

        {/* Head Box */}
        <rect
          x={headBox.x}
          y={headBox.y}
          width={headBox.width}
          height={headBox.height}
          fill="none"
          stroke="var(--red)"
          strokeWidth={2}
        />
        <text
          x={headBox.x + 4}
          y={headBox.y - 6}
          fill="var(--red)"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="bold"
        >
          HEAD BOX: 1.00H x {EVA_SKELETON.headBoxH.widthH.toFixed(2)}H ({Math.round(hPx)}px)
        </text>

        {/* 1.25H Forward-Up 50° Horn Vector */}
        <line
          x1={hornBase[0]}
          y1={hornBase[1]}
          x2={hornTip[0]}
          y2={hornTip[1]}
          stroke="var(--red)"
          strokeWidth={2}
        />
        <circle cx={hornTip[0]} cy={hornTip[1]} r={4} fill="var(--red)" />
        <circle cx={hornBase[0]} cy={hornBase[1]} r={4} fill="var(--red)" />
        <text
          x={hornTip[0] + 6}
          y={hornTip[1] + 4}
          fill="var(--red)"
          fontSize="11"
          fontFamily="monospace"
          fontWeight="bold"
        >
          HORN: {r.hornLengthH.toFixed(2)}H (50° FWD-UP)
        </text>

        {/* Muscular Neck Axis (42° forward lean) */}
        <line
          x1={neckTop[0]}
          y1={neckTop[1]}
          x2={neckBase[0]}
          y2={neckBase[1]}
          stroke="var(--ink)"
          strokeWidth={2.5}
        />
        <circle cx={neckTop[0]} cy={neckTop[1]} r={4} fill="var(--ink)" />
        <circle cx={neckBase[0]} cy={neckBase[1]} r={4} fill="var(--ink)" />

        {/* Throat Armor Vector */}
        <line
          x1={jawTip[0] - 0.2 * hPx}
          y1={jawTip[1] - 0.1 * hPx}
          x2={throatBot[0]}
          y2={throatBot[1]}
          stroke="var(--red)"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
        <circle cx={throatBot[0]} cy={throatBot[1]} r={4} fill="var(--red)" />
      </svg>

      <div className="fixed bottom-4 left-4 bg-[var(--paper)] border-2 border-[var(--ink)] px-3 py-2 font-mono text-[11px] leading-snug text-[var(--ink)] shadow-[4px_4px_0_var(--ink)]">
        <div className="font-bold border-b border-[var(--ink)] pb-1 mb-1 flex items-center gap-2">
          <span className="inline-block w-2 h-2 bg-[var(--red)]" />
          <span>EVA-01 BUST ANATOMY [KEY: G]</span>
        </div>
        <div>H (STAGE PX): {Math.round(hPx)}px</div>
        <div>HEAD / VISIBLE HEIGHT: {r.headToVisibleHeightRatio.toFixed(3)}</div>
        <div>HORN LENGTH: {r.hornLengthH.toFixed(2)}H (50° forward-up)</div>
        <div>NECK LEAN: {r.neckLeanDeg.toFixed(1)}° (muscular forward lean)</div>
        <div>THROAT ARMOR: Segmented Faceted Plates</div>
        <div>COLLAR WIDTH: {r.collarWidthH.toFixed(2)}H</div>
      </div>
    </div>
  );
};
