export type DashboardWidgetSlotId =
  | 'rail-1'
  | 'rail-2'
  | 'rail-3'
  | 'rail-4'
  | 'rail-5'
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
    'rail-4': 'favorite-tracks',
    'rail-5': 'social-links',
    'dock-left': 'clock',
    'dock-right': 'now-building',
  },
  rightRailSlots: ['rail-1', 'rail-2', 'rail-3', 'rail-4', 'rail-5'],
  bottomDockSlots: [],
  mobileOrder: ['rail-1', 'rail-2', 'rail-3', 'rail-4', 'rail-5'],
};
