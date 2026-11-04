import {canAccessArvoCloudMeals, type ArvoServerAccess} from "./arvoServerAccess.ts";

/** Server-only adapter contract. The database query MUST be parameterized by tokenHash. */
export type ArvoSessionLookup = (tokenHash:string)=>Promise<ArvoServerAccess|null>;
export type ArvoResolvedSession = {userId:string};

/**
 * Do not call with an unverified client-supplied user ID.
 * The raw token must come from the server's own secure session cookie.
 * Inject token hashing from the verified beta authentication implementation
 * before connecting to a live database.
 */
export async function resolveArvoCloudSession(
  rawSessionToken:string | null,
  lookup:ArvoSessionLookup,
  hashSessionToken:(rawToken:string)=>string,
  now:Date=new Date(),
):Promise<ArvoResolvedSession|null> {
  if (!rawSessionToken || rawSessionToken.length < 32 || rawSessionToken.length > 4096) return null;
  const tokenHash=hashSessionToken(rawSessionToken);
  if (!/^[0-9a-f]{64}$/i.test(tokenHash)) return null;
  const access=await lookup(tokenHash);
  if (!access || !canAccessArvoCloudMeals(access,now)) return null;
  return {userId:access.sessionUserId!};
}
