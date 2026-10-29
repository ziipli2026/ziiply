// Central entitlement decision for Arvo settings.
// The beta override is server-owned: never trust a client-supplied beta flag.
export type ArvoAccess = {
  phase: "development" | "beta" | "production";
  isAuthenticated: boolean;
  isApprovedBetaTester: boolean;
  hasPaidEntitlement: boolean;
};
export function canUseArvoSettings(access: ArvoAccess): boolean {
  if (access.phase === "development") return true;
  if (access.phase === "beta") return access.isAuthenticated && access.isApprovedBetaTester;
  return access.isAuthenticated && access.hasPaidEntitlement;
}
// Health data access additionally requires separate explicit consent and OS permission.
// Do not treat this function as an authentication or consent check.
