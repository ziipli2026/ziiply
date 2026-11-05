import {createHash} from "node:crypto";

/** Matches the beta-login implementation on feature/arvo-health-sync-contract-20261030.
 * Raw session tokens are 32 random bytes encoded as 43 base64url characters.
 * Read only the server's HttpOnly cookie; never accept a token from request JSON.
 */
export const ARVO_BETA_COOKIE_NAME="__Host-ziiply_beta";
export function hashArvoBetaSessionToken(rawToken:string):string{
 if(typeof rawToken!=="string"||!/^[A-Za-z0-9_-]{43}$/.test(rawToken))
  throw Error("arvo-invalid-beta-session-token");
 return createHash("sha256").update(rawToken,"utf8").digest("hex");
}
