import React, { useEffect, useState } from 'react';
import { PROFILE } from '../config/profile';
import { useAppStore } from '../store/useAppStore';
import { STAGE_DASHBOARD_CONFIG } from './stage.config';
import { DASHBOARD_LAYOUT_CONFIG, type DashboardWidgetSlotId } from './layout.config';
import {
  clearStagePointer,
  nudgeStageOrbByKey,
  stageInputState,
  updateStagePointerFromClient,
} from './stageInput';
import { resolveWidgetForSlot, useWidgetRegistryVersion } from './widgets/registry';
import { EmptySlotPlaceholder, WidgetFrame } from './widgets/WidgetFrame';
import { EvaDebugOverlay } from './EvaDebugOverlay';

const SlotRenderer: React.FC<{ slotId: DashboardWidgetSlotId }> = ({ slotId }) => {
  const widget = resolveWidgetForSlot(slotId);
  if (!widget) {
    return <EmptySlotPlaceholder slotId={slotId} />;
  }
  const Component = widget.component;
  return (
    <WidgetFrame
      slotId={slotId}
      widgetId={widget.id}
      title={widget.title}
      kicker={widget.kicker}
      size={widget.size}
      accentRed={widget.accentRed}
    >
      <Component />
    </WidgetFrame>
  );
};

export const DashboardPage: React.FC = () => {
  useWidgetRegistryVersion();
  const { rightRail, bottomDock } = STAGE_DASHBOARD_CONFIG.uiSafeRects;

  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(window.innerWidth < 768);
    onChange();
    mql.addEventListener('change', onChange);
    window.addEventListener('resize', onChange);
    return () => {
      mql.removeEventListener('change', onChange);
      window.removeEventListener('resize', onChange);
      clearStagePointer();
    };
  }, []);

  // Lock document scrolling on dashboard so only the right rail panels can scroll, never the background
  useEffect(() => {
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
    };
  }, []);

  // Strictly prevent mouse wheel scrolling on the stage / canvas background
  useEffect(() => {
    const stageEl = document.getElementById('dashboard-stage-target');
    if (!stageEl) return;
    const blockWheel = (e: WheelEvent) => {
      e.preventDefault();
    };
    stageEl.addEventListener('wheel', blockWheel, { passive: false });
    return () => {
      stageEl.removeEventListener('wheel', blockWheel);
    };
  }, []);

  // Global window pointer tracking so the red orb tracks cursor across entire viewport
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      updateStagePointerFromClient(e.clientX, e.clientY, e.buttons > 0);
    };
    const onPointerDown = (e: PointerEvent) => {
      updateStagePointerFromClient(e.clientX, e.clientY, true);
    };
    const onPointerUp = () => {
      stageInputState.pointerDown = false;
    };
    const onWindowLeave = () => {
      clearStagePointer();
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('mouseleave', onWindowLeave);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('mouseleave', onWindowLeave);
      clearStagePointer();
    };
  }, []);

  const handleStageKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight'
    ) {
      e.preventDefault();
      nudgeStageOrbByKey(e.key, useAppStore.getState().dashboardOrbUv);
    }
  };

  return (
    <main
      id="dashboard-page"
      data-route="dashboard"
      aria-label="Pilot Live Telemetry Dashboard"
      className="relative w-full h-[100dvh] overflow-hidden select-none"
    >
      <h1 className="sr-only">
        {PROFILE.fullName} — Live Telemetry &amp; Eva-01 Berserk Dashboard
      </h1>

      {/* Interactive Stage Region (Full viewport behind HUD/Rails on Desktop, Top 58dvh on Mobile) */}
      <div
        id="dashboard-stage-target"
        data-dashboard-stage
        tabIndex={0}
        role="region"
        aria-label="Eva-01 Berserk target stage. Move pointer or press arrow keys to steer the red target dot."
        style={{ touchAction: 'none' }}
        onPointerMove={(e) => {
          updateStagePointerFromClient(e.clientX, e.clientY, e.buttons > 0);
        }}
        onPointerDown={(e) => {
          updateStagePointerFromClient(e.clientX, e.clientY, true);
        }}
        onPointerUp={() => {
          stageInputState.pointerDown = false;
        }}
        onKeyDown={handleStageKeyDown}
        className="relative w-full h-[58dvh] md:fixed md:inset-0 md:h-full z-10 cursor-crosshair focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[var(--red)]"
      />

      <EvaDebugOverlay />

      {!isMobile ? (
        <>
          {/* Desktop Right Widget Rail (Strictly inside uiSafeRects.rightRail: x 70%..97%, y 11%..95%) */}
          <aside
            aria-label="Primary Telemetry Rail"
            data-widget-rail="right"
            style={{
              left: `${rightRail.x[0] * 100}%`,
              width: `${(rightRail.x[1] - rightRail.x[0]) * 100}%`,
              top: `${rightRail.y[0] * 100}%`,
              height: `${(rightRail.y[1] - rightRail.y[0]) * 100}%`,
              maxHeight: `${(rightRail.y[1] - rightRail.y[0]) * 100}%`,
            }}
            className="fixed z-20 flex flex-col gap-2.5 pointer-events-auto overflow-y-auto overscroll-contain pr-1.5 pb-6 pt-0.5 select-auto"
          >
            {DASHBOARD_LAYOUT_CONFIG.rightRailSlots.map((slotId) => (
              <SlotRenderer key={slotId} slotId={slotId} />
            ))}
          </aside>

          {/* Desktop Bottom Dock (Strictly inside uiSafeRects.bottomDock: x 52%..69%, y 66%..95%) */}
          {DASHBOARD_LAYOUT_CONFIG.bottomDockSlots.length > 0 && (
            <aside
              aria-label="Secondary Telemetry Dock"
              data-widget-rail="bottom"
              style={{
                left: `${bottomDock.x[0] * 100}%`,
                width: `${(bottomDock.x[1] - bottomDock.x[0]) * 100}%`,
                top: `${bottomDock.y[0] * 100}%`,
                maxHeight: `${(bottomDock.y[1] - bottomDock.y[0]) * 100}%`,
              }}
              className="fixed z-20 flex flex-col justify-end gap-2 pointer-events-none overflow-hidden"
            >
              {DASHBOARD_LAYOUT_CONFIG.bottomDockSlots.map((slotId) => (
                <SlotRenderer key={slotId} slotId={slotId} />
              ))}
            </aside>
          )}
        </>
      ) : (
        /* Mobile Single-Column Ordered Widget Stack below 58dvh stage */
        <section
          aria-label="Mobile Telemetry Stack"
          data-widget-rail="mobile-stack"
          className="relative z-20 px-4 pb-10 pt-2 flex flex-col gap-3 bg-[var(--paper)] border-t-2 border-[var(--ink)]"
        >
          {DASHBOARD_LAYOUT_CONFIG.mobileOrder.map((slotId) => (
            <SlotRenderer key={slotId} slotId={slotId} />
          ))}
        </section>
      )}
    </main>
  );
};

export default DashboardPage;
