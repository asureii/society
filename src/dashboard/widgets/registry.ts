import React, { useEffect, useState } from 'react';
import type { DashboardWidgetSize, DashboardWidgetSlotId } from '../layout.config';
import { DASHBOARD_LAYOUT_CONFIG } from '../layout.config';
import { DiscordPresenceWidget } from './DiscordPresenceWidget';
import { SpotifyWidget } from './SpotifyWidget';
import { ActivityWidget } from './ActivityWidget';
import { ClockWidget } from './ClockWidget';
import { GithubActivityWidget } from './GithubActivityWidget';
import { NowBuildingWidget } from './NowBuildingWidget';

export type WidgetRequirement = 'discord' | 'spotify' | 'github' | 'timezone' | 'profile';

export interface DashboardWidgetDefinition {
  id: string;
  title: string;
  kicker: string;
  slot: DashboardWidgetSlotId;
  size: DashboardWidgetSize;
  enabled: boolean;
  requires?: WidgetRequirement[];
  accentRed?: boolean;
  component: React.ComponentType;
}

export function defineWidget(def: DashboardWidgetDefinition): DashboardWidgetDefinition {
  return def;
}

export const WIDGETS: DashboardWidgetDefinition[] = [
  defineWidget({
    id: 'discord-presence',
    title: 'PILOT PRESENCE',
    kicker: 'SYNC.01',
    slot: 'rail-1',
    size: 'lg',
    enabled: true,
    accentRed: true,
    requires: ['discord'],
    component: DiscordPresenceWidget,
  }),
  defineWidget({
    id: 'spotify',
    title: 'AUDIO FEED',
    kicker: 'SYNC.02',
    slot: 'rail-2',
    size: 'md',
    enabled: true,
    requires: ['discord', 'spotify'],
    component: SpotifyWidget,
  }),
  defineWidget({
    id: 'activity',
    title: 'ACTIVE PROCESS',
    kicker: 'SYNC.03',
    slot: 'rail-3',
    size: 'md',
    enabled: true,
    requires: ['discord'],
    component: ActivityWidget,
  }),
  // Stub widgets (implemented, disabled by default, ready to enable)
  defineWidget({
    id: 'clock',
    title: 'CHRONO // LOCAL',
    kicker: 'AUX.01',
    slot: 'dock-left',
    size: 'sm',
    enabled: false,
    requires: ['timezone'],
    component: ClockWidget,
  }),
  defineWidget({
    id: 'now-building',
    title: 'NOW BUILDING',
    kicker: 'AUX.02',
    slot: 'dock-right',
    size: 'sm',
    enabled: false,
    requires: ['profile'],
    component: NowBuildingWidget,
  }),
  defineWidget({
    id: 'github-activity',
    title: 'COMMIT PULSE',
    kicker: 'AUX.03',
    slot: 'dock-left',
    size: 'sm',
    enabled: false,
    requires: ['github'],
    component: GithubActivityWidget,
  }),
];

const runtimeOverrides = new Map<DashboardWidgetSlotId, DashboardWidgetDefinition | null>();
const registryListeners = new Set<() => void>();

function notifyRegistryListeners() {
  registryListeners.forEach((fn) => fn());
}

export function registerRuntimeWidget(def: DashboardWidgetDefinition): void {
  runtimeOverrides.set(def.slot, def);
  notifyRegistryListeners();
}

export function setSlotEmpty(slot: DashboardWidgetSlotId): void {
  runtimeOverrides.set(slot, null);
  notifyRegistryListeners();
}

export function clearRuntimeWidgets(): void {
  runtimeOverrides.clear();
  notifyRegistryListeners();
}

export function resolveWidgetForSlot(
  slotId: DashboardWidgetSlotId
): DashboardWidgetDefinition | null {
  if (runtimeOverrides.has(slotId)) {
    const override = runtimeOverrides.get(slotId) ?? null;
    return override && override.enabled ? override : null;
  }

  // First check layout.config.ts explicit slot mapping
  const mappedId = DASHBOARD_LAYOUT_CONFIG.desktopSlots[slotId];
  if (mappedId) {
    const byId = WIDGETS.find((w) => w.id === mappedId && w.enabled);
    if (byId) return byId;
  }

  // Fallback to any enabled widget assigned to this slot
  const bySlot = WIDGETS.find((w) => w.slot === slotId && w.enabled);
  return bySlot ?? null;
}

export function useWidgetRegistryVersion(): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    registryListeners.add(listener);
    return () => {
      registryListeners.delete(listener);
    };
  }, []);
  return version;
}

declare global {
  interface Window {
    __registerTestWidget?: (opts: {
      id: string;
      title: string;
      kicker?: string;
      slot: DashboardWidgetSlotId;
      text?: string;
    }) => void;
    __clearTestWidgets?: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.__registerTestWidget = ({ id, title, kicker = 'TEST.99', slot, text = 'SIGNAL LOCKED' }) => {
    const TestComponent: React.FC = () =>
      React.createElement(
        'div',
        {
          'data-testid': `custom-widget-${id}`,
          className: 'font-mono text-[10px] tracking-[0.12em] uppercase font-bold text-[var(--ink)]',
        },
        text
      );
    registerRuntimeWidget(
      defineWidget({
        id,
        title,
        kicker,
        slot,
        size: 'sm',
        enabled: true,
        component: TestComponent,
      })
    );
  };
  window.__clearTestWidgets = () => {
    clearRuntimeWidgets();
  };
}
