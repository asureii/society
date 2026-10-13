import { clamp } from '../lib/math';
import { STAGE_DASHBOARD_CONFIG } from './stage.config';

export interface StageInputState {
  pointerActive: boolean;
  pointerDown: boolean;
  pointerUv: [number, number];
  keyboardActive: boolean;
  keyboardUv: [number, number];
  lastKeyboardAt: number;
}

export const stageInputState: StageInputState = {
  pointerActive: false,
  pointerDown: false,
  pointerUv: [...STAGE_DASHBOARD_CONFIG.orb.defaultPos],
  keyboardActive: false,
  keyboardUv: [...STAGE_DASHBOARD_CONFIG.orb.defaultPos],
  lastKeyboardAt: 0,
};

export function updateStagePointerFromClient(
  clientX: number,
  clientY: number,
  isDown = stageInputState.pointerDown
): void {
  if (typeof window === 'undefined') return;
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  const u = clamp(clientX / w, 0.04, 0.96);
  const v = clamp(clientY / h, 0.06, 0.94);
  stageInputState.pointerActive = true;
  stageInputState.pointerDown = isDown;
  stageInputState.pointerUv = [u, v];
  stageInputState.keyboardActive = false;
}

export function clearStagePointer(): void {
  stageInputState.pointerActive = false;
  stageInputState.pointerDown = false;
}

export function nudgeStageOrbByKey(
  key: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
  currentOrbUv: [number, number]
): [number, number] {
  const step = STAGE_DASHBOARD_CONFIG.orb.keyboardNudgeStep;
  const baseUv = stageInputState.keyboardActive ? stageInputState.keyboardUv : currentOrbUv;
  let [u, v] = baseUv;
  if (key === 'ArrowLeft') u -= step;
  if (key === 'ArrowRight') u += step;
  if (key === 'ArrowUp') v -= step;
  if (key === 'ArrowDown') v += step;

  u = clamp(u, 0.08, 0.92);
  v = clamp(v, 0.08, 0.92);
  stageInputState.keyboardUv = [u, v];
  stageInputState.keyboardActive = true;
  stageInputState.pointerActive = false;
  stageInputState.lastKeyboardAt = performance.now();
  return [u, v];
}
