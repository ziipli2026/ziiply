/**
 * A validated beta session is a server-side fact, never a client-provided user ID.
 * This pure guard is deliberately independent of the database adapter.
 */
export type ArvoServerAccess = {
  sessionUserId: string | null;
  sessionExpiresAt: string | Date | null;
  sessionRevokedAt: string | Date | null;
  userDisabledAt: string | Date | null;
  cloudMealGrantedAt: string | Date | null;
  cloudMealRevokedAt: string | Date | null;
};

const toMillis=(value:string | Date | null):number=>value instanceof Date ? value.getTime() : value ? Date.parse(value) : NaN;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function canAccessArvoCloudMeals(access: ArvoServerAccess, now: Date = new Date()): boolean {
  if (!access.sessionUserId || !uuid.test(access.sessionUserId)) return false;
  if (!Number.isFinite(now.getTime())) return false;
  if (!access.sessionExpiresAt || !Number.isFinite(toMillis(access.sessionExpiresAt))) return false;
  if (Date.parse(access.sessionExpiresAt) <= now.getTime()) return false;
  if (access.sessionRevokedAt !== null || access.userDisabledAt !== null) return false;
  if (!access.cloudMealGrantedAt || !Number.isFinite(toMillis(access.cloudMealGrantedAt))) return false;
  if (Date.parse(access.cloudMealGrantedAt) > now.getTime()) return false;
  if (access.cloudMealRevokedAt !== null) return false;
  return true;
}
