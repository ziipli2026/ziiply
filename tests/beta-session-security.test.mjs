import test from "node:test";
import assert from "node:assert/strict";
import { BETA_COOKIE_NAME, betaCookieOptions, validateBetaRedirect, signBetaState, verifyBetaState } from "../src/lib/ziiplyBetaSessionSecurity.mjs";

test("beta session cookie is host-only, secure and httpOnly", () => {
  assert.equal(BETA_COOKIE_NAME, "__Host-ziiply_beta");
  const options = betaCookieOptions();
  assert.equal(options.secure, true);
  assert.equal(options.httpOnly, true);
  assert.equal(options.path, "/");
  assert.equal(options.sameSite, "lax");
  assert.equal(Object.hasOwn(options, "domain"), false);
});
test("redirects stay on site and default to beta onboarding", () => {
  assert.equal(validateBetaRedirect("/beta/aloitus"), "/beta/aloitus");
  for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/\r\nInjected", "", null]) {
    assert.equal(validateBetaRedirect(value), "/beta/aloitus");
  }
});
test("signed beta state expires and rejects tampering", () => {
  const secret = "test-secret-012345678901234567890123456789";
  const now = 1800000000000;
  const signed = signBetaState({ nonce: "0123456789abcdef", expiresAt: now + 60_000 }, secret);
  assert.equal(verifyBetaState(signed, secret, now)?.nonce, "0123456789abcdef");
  assert.equal(verifyBetaState(signed + "a", secret, now), null);
  assert.equal(verifyBetaState(signed, secret, now + 60_001), null);
  assert.equal(verifyBetaState(signed, "wrong-secret-012345678901234567890123", now), null);
});

test("beta welcome opens the app on the same origin", async () => {
  const { readFile } = await import("node:fs/promises");
  const page = await readFile(new URL("../src/app/beta/aloitus/page.tsx", import.meta.url), "utf8");
  assert.match(page, /href:"\/",action:"Avaa Ziiply"/);
  assert.doesNotMatch(page, /href:"https:\/\/ziiply\.vercel\.app"/);
});
test("beta middleware is explicitly opt-in and host-scoped", async () => {
  const { readFile } = await import("node:fs/promises");
  const middleware = await readFile(new URL("../src/middleware.ts", import.meta.url), "utf8");
  assert.match(middleware, /ZIIPLY_BETA_APP_GATE !== "true"/);
  assert.match(middleware, /request\.nextUrl\.hostname !== expectedHost/);
  assert.match(middleware, /ZIIPLY_BETA_GATE_HOST/);
});

test("logout reports revocation failures without claiming success", async () => {
  const { readFile } = await import("node:fs/promises");
  const route = await readFile(new URL("../src/app/api/beta/login/logout/route.ts", import.meta.url), "utf8");
  assert.match(route, /LOGOUT_RETRY_REQUIRED/);
  assert.match(route, /status: 503/);
  assert.match(route, /revoked_at = now\(\)/);
});
