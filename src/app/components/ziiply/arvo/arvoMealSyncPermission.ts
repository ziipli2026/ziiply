/**
 * Explicit opt-in is required before transmitting Arvo meal history.
 * Local meal tracking is independent of cloud synchronization consent.
 * Authentication is established on the server, never by a client user ID.
 */
export type ArvoMealSyncPermission = {
  authenticated: boolean;
  cloudMealConsent: boolean;
};

export function canSyncArvoMeals(permission: ArvoMealSyncPermission): boolean {
  return permission.authenticated === true && permission.cloudMealConsent === true;
}
