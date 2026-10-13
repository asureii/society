export type DashboardWidgetSlotId =
  | 'rail-1'
  | 'rail-2'
  | 'rail-3'
  | 'dock-left'
  | 'dock-right';

export type DashboardWidgetSize = 'sm' | 'md' | 'lg';

export interface DashboardLayoutConfig {
  /** Named desktop slots mapped to default widget IDs (or null for unassigned) */
  desktopSlots: Record<DashboardWidgetSlotId, string | null>;
  /** Ordered list of widget slots for mobile vertical stacking */
  mobileOrder: DashboardWidgetSlotId[];
  /** Right rail slots in top-to-bottom order */
  rightRailSlots: DashboardWidgetSlotId[];
  /** Bottom dock slots in left-to-right order */
  bottomDockSlots: DashboardWidgetSlotId[];
}

export const DASHBOARD_LAYOUT_CONFIG: DashboardLayoutConfig = {
  desktopSlots: {
    'rail-1': 'discord-presence',
    'rail-2': 'spotify',
    'rail-3': 'activity',
    'dock-left': 'clock',
    'dock-right': 'now-building',
  },
  rightRailSlots: ['rail-1', 'rail-2', 'rail-3'],
  bottomDockSlots: ['dock-left', 'dock-right'],
  mobileOrder: ['rail-1', 'rail-2', 'rail-3', 'dock-left', 'dock-right'],
};
