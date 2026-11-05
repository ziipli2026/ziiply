// Pure beta passwordless login token utilities. No email delivery or DB writes.
// Never log raw tokens; persist only SHA-256 hashes.
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
export const BETA_LOGIN_TTL_MS = 15 * 60 * 1000;
export const BETA_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export function createBetaToken() {
  return randomBytes(32).toString("base64url");
}
export function hashBetaToken(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new Error("Invalid beta token");
  return createHash("sha256").update(token, "utf8").digest("hex");
}
export function verifyBetaToken(token, storedHash) {
  if (typeof storedHash !== "string" || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  try {
    const candidate = Buffer.from(hashBetaToken(token), "hex");
    return timingSafeEqual(candidate, Buffer.from(storedHash, "hex"));
  } catch { return false; }
}
export function isBetaChallengeUsable({ expiresAt, consumedAt }, now = Date.now()) {
  const expiry = new Date(expiresAt).getTime();
  return consumedAt == null && Number.isFinite(expiry) && now < expiry;
}
