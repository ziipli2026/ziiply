// Server-only helpers for beta login cookies. No account lookup or email sending.
import { createHmac, timingSafeEqual } from "node:crypto";
export const BETA_COOKIE_NAME = "__Host-ziiply_beta";
export function betaCookieOptions(maxAgeSeconds = 7 * 24 * 3600) {
  return { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: maxAgeSeconds };
}
export function validateBetaRedirect(path) {
  if (typeof path !== "string" || !path.startsWith("/") || path.startsWith("//") ||
      path.includes("\\") || /[\r\n]/.test(path)) return "/arvo-tilastot";
  return path;
}
export function signBetaState(payload, secret) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("Missing signing secret");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256",secret).update(body).digest("base64url");
  return body+"."+signature;
}
export function verifyBetaState(value, secret, now = Date.now()) {
  if (typeof value !== "string" || value.length > 2048 || typeof secret !== "string" || secret.length < 32) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  const expected = createHmac("sha256",secret).update(parts[0]).digest();
  const received = Buffer.from(parts[1],"base64url");
  if (expected.length !== received.length || !timingSafeEqual(expected,received)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(parts[0],"base64url").toString("utf8"));
    if (!Number.isSafeInteger(parsed.expiresAt) || parsed.expiresAt <= now ||
        parsed.expiresAt > now + 15 * 60 * 1000 ||
        typeof parsed.nonce !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(parsed.nonce)) return null;
    return parsed;
  } catch { return null; }
}
