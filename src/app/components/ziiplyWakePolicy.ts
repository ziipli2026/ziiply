export const ZIIPLY_WAKE_LIGHT_MS = 30_000;
export const ZIIPLY_WAKE_FULL_MS = 5 * 60_000;
export const ZIIPLY_WAKE_COOLDOWN_MS = 15_000;
export type ZiiplyWakeKind = 'light' | 'full' | null;
/** Clock-based and side-effect-free so suspended-tab behavior is testable. */
export function classifyZiiplyWake(idleMs: number, sincePreviousWakeMs: number): ZiiplyWakeKind {
  if (!Number.isFinite(idleMs) || idleMs < ZIIPLY_WAKE_LIGHT_MS) return null;
  if (sincePreviousWakeMs < ZIIPLY_WAKE_COOLDOWN_MS) return null;
  return idleMs >= ZIIPLY_WAKE_FULL_MS ? 'full' : 'light';
}
