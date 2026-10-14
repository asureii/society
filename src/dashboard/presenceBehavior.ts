/**
 * DISCORD PRESENCE -> EVA-01 & ORB BEHAVIOR PROFILES
 * (src/dashboard/presenceBehavior.ts)
 *
 * Maps live Lanyard Discord status (`online`, `idle`, `dnd`, `offline`, or `unreachable`)
 * to continuous behavior parameters that ease smoothly over `0.8s` without snapping.
 */

import { lerp } from '../lib/math.ts';
import type { DiscordStatusType } from '../store/useAppStore.ts';

export type OrbRenderMode = 'solid-pulse' | 'solid-slow' | 'solid-dnd-bar' | 'hollow-ring';

export interface PresenceBehaviorProfile {
  status: DiscordStatusType;
  /** Gaze tracking response multiplier (1 = full, 0 = dormant) */
  trackingGain: number;
  /** Spring speed multiplier (1.0 online, 0.35 idle) */
  trackingSpeedMultiplier: number;
  /** Additional pitch droop angle in degrees (0 online, -8° idle droop, -11° offline bowed) */
  headDroopDeg: number;
  /** Eye vertical openness (1.0 full, ~0.34 half-lidded slit in idle) */
  eyeOpenness: number;
  /** Eye interior blackout (0 = white sclera + pupil, 1 = dormant filled black) */
  eyeBlackout: number;
  /** Base jaw opening fraction in [0..1] (0.25 online, 0.10 idle, 0.50 dnd, 0.0 offline) */
  jawBase: number;
  /** Proximity-driven jaw modulation weight */
  jawProximityGain: number;
  /** Multiplier on 12fps predatory micro-twitch and jaw shake */
  jitterScale: number;
  /** 1.0 when pointer/touch attraction is active; 0.0 when disabled (dnd / offline) */
  pointerAttraction: number;
  /** 1.0 when the orb parks at the center of orbRegion (dnd / offline); 0.0 when drifting/following */
  orbParkAtCenter: number;
  /** Orb pulse speed multiplier (1.0 online, 0.35 idle, 0.0 steady/static) */
  orbPulseSpeed: number;
  /** 1.0 when orb renders with a horizontal black bar across it (dnd) */
  orbDndBar: number;
  /** 1.0 when orb renders as a static hollow red ring (offline) */
  orbHollowRing: number;
  /** Symbolic mode label for diagnostics */
  orbMode: OrbRenderMode;
}

export const PRESENCE_TRANSITION_DURATION_SEC = 0.8;

export const PRESENCE_BEHAVIOR_PROFILES: Record<DiscordStatusType, PresenceBehaviorProfile> = {
  online: {
    status: 'online',
    trackingGain: 1.0,
    trackingSpeedMultiplier: 1.0,
    headDroopDeg: 0.0,
    eyeOpenness: 1.0,
    eyeBlackout: 0.0,
    jawBase: 0.25,
    jawProximityGain: 0.75,
    jitterScale: 1.0,
    pointerAttraction: 1.0,
    orbParkAtCenter: 0.0,
    orbPulseSpeed: 1.0,
    orbDndBar: 0.0,
    orbHollowRing: 0.0,
    orbMode: 'solid-pulse',
  },
  idle: {
    status: 'idle',
    trackingGain: 0.85,
    trackingSpeedMultiplier: 0.35,
    headDroopDeg: -8.0,
    eyeOpenness: 0.34,
    eyeBlackout: 0.0,
    jawBase: 0.1,
    jawProximityGain: 0.35,
    jitterScale: 0.25,
    pointerAttraction: 1.0,
    orbParkAtCenter: 0.0,
    orbPulseSpeed: 0.35,
    orbDndBar: 0.0,
    orbHollowRing: 0.0,
    orbMode: 'solid-slow',
  },
  dnd: {
    status: 'dnd',
    trackingGain: 1.0,
    trackingSpeedMultiplier: 1.15,
    headDroopDeg: -1.0,
    eyeOpenness: 1.0,
    eyeBlackout: 0.0,
    jawBase: 0.5,
    jawProximityGain: 0.4,
    jitterScale: 1.45,
    pointerAttraction: 1.0,
    orbParkAtCenter: 0.0,
    orbPulseSpeed: 0.0,
    orbDndBar: 1.0,
    orbHollowRing: 0.0,
    orbMode: 'solid-dnd-bar',
  },
  offline: {
    status: 'offline',
    trackingGain: 0.0,
    trackingSpeedMultiplier: 0.2,
    headDroopDeg: -11.5,
    eyeOpenness: 0.85,
    eyeBlackout: 1.0,
    jawBase: 0.0,
    jawProximityGain: 0.0,
    jitterScale: 0.0,
    pointerAttraction: 1.0,
    orbParkAtCenter: 0.0,
    orbPulseSpeed: 0.0,
    orbDndBar: 0.0,
    orbHollowRing: 1.0,
    orbMode: 'hollow-ring',
  },
};

export function resolveTargetPresenceProfile(
  status: DiscordStatusType,
  unreachable: boolean
): PresenceBehaviorProfile {
  if (unreachable) {
    return PRESENCE_BEHAVIOR_PROFILES.offline;
  }
  return PRESENCE_BEHAVIOR_PROFILES[status] ?? PRESENCE_BEHAVIOR_PROFILES.online;
}

export function interpolatePresenceProfiles(
  from: PresenceBehaviorProfile,
  to: PresenceBehaviorProfile,
  rawT: number
): PresenceBehaviorProfile {
  const t = Math.max(0, Math.min(1, rawT));
  // Cubic ease-in-out over the 0.8s transition window
  const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  return {
    status: e >= 0.5 ? to.status : from.status,
    trackingGain: lerp(from.trackingGain, to.trackingGain, e),
    trackingSpeedMultiplier: lerp(from.trackingSpeedMultiplier, to.trackingSpeedMultiplier, e),
    headDroopDeg: lerp(from.headDroopDeg, to.headDroopDeg, e),
    eyeOpenness: lerp(from.eyeOpenness, to.eyeOpenness, e),
    eyeBlackout: lerp(from.eyeBlackout, to.eyeBlackout, e),
    jawBase: lerp(from.jawBase, to.jawBase, e),
    jawProximityGain: lerp(from.jawProximityGain, to.jawProximityGain, e),
    jitterScale: lerp(from.jitterScale, to.jitterScale, e),
    pointerAttraction: lerp(from.pointerAttraction, to.pointerAttraction, e),
    orbParkAtCenter: lerp(from.orbParkAtCenter, to.orbParkAtCenter, e),
    orbPulseSpeed: lerp(from.orbPulseSpeed, to.orbPulseSpeed, e),
    orbDndBar: lerp(from.orbDndBar, to.orbDndBar, e),
    orbHollowRing: lerp(from.orbHollowRing, to.orbHollowRing, e),
    orbMode: e >= 0.5 ? to.orbMode : from.orbMode,
  };
}
