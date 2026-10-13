import React from 'react';
import { PROFILE } from '../config/profile';
import { STAGE_DASHBOARD_CONFIG } from './stage.config';

export const DashboardPage: React.FC = () => {
  const { rightRail, bottomDock } = STAGE_DASHBOARD_CONFIG.uiSafeRects;

  return (
    <main
      id="dashboard-page"
      data-route="dashboard"
      aria-label="Pilot Live Telemetry Dashboard"
      className="relative w-full min-h-[100dvh] md:h-[100dvh] md:overflow-hidden select-none"
    >
      <h1 className="sr-only">
        {PROFILE.fullName} — Live Telemetry &amp; Eva-01 Berserk Dashboard
      </h1>

      {/* Interactive Stage Region (Left/Center on Desktop, Top ~45vh on Mobile) */}
      <div
        id="dashboard-stage-target"
        data-dashboard-stage
        tabIndex={0}
        role="region"
        aria-label="Eva-01 Berserk target stage. Move pointer or press arrow keys to steer the red target dot."
        style={{ touchAction: 'pan-y' }}
        className="relative w-full h-[45dvh] md:fixed md:inset-0 md:h-full z-10 cursor-crosshair focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-red"
      />

      {/* Desktop Right Widget Rail (Strictly inside uiSafeRects.rightRail: x 70%..97%, y 11%..95%) */}
      <aside
        aria-label="Primary Telemetry Rail"
        data-widget-rail="right"
        style={{
          left: `${rightRail.x[0] * 100}%`,
          width: `${(rightRail.x[1] - rightRail.x[0]) * 100}%`,
          top: `${rightRail.y[0] * 100}%`,
          maxHeight: `${(rightRail.y[1] - rightRail.y[0]) * 100}%`,
        }}
        className="hidden md:flex fixed z-20 flex-col gap-2.5 pointer-events-none"
      >
        <div
          data-widget-slot="rail-1"
          className="pointer-events-auto bg-paper-pure border-2 border-ink p-3 shadow-[4px_4px_0px_var(--ink)]"
        >
          <span className="font-mono text-xs font-bold uppercase text-ink">
            SLOT // RAIL-1 READY
          </span>
        </div>
      </aside>

      {/* Desktop Bottom Dock (Strictly inside uiSafeRects.bottomDock: x 52%..69%, y 66%..95%) */}
      <aside
        aria-label="Secondary Telemetry Dock"
        data-widget-rail="bottom"
        style={{
          left: `${bottomDock.x[0] * 100}%`,
          width: `${(bottomDock.x[1] - bottomDock.x[0]) * 100}%`,
          top: `${bottomDock.y[0] * 100}%`,
          maxHeight: `${(bottomDock.y[1] - bottomDock.y[0]) * 100}%`,
        }}
        className="hidden md:flex fixed z-20 flex-col justify-end gap-2.5 pointer-events-none"
      />
    </main>
  );
};

export default DashboardPage;
