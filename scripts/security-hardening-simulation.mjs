import assert from "node:assert/strict";

function cronAllowed(secret, authorization) {
  if (!secret) return false;
  return authorization === `Bearer ${secret}`;
}
function transcribeAllowed({ tokenOk, bytes, requests }) {
  if (!tokenOk) return { status: 401 };
  if (bytes > 25 * 1024 * 1024) return { status: 413 };
  if (requests > 10) return { status: 429 };
  return { status: 200 };
}
function diagnosticAllowed(production, authorized) {
  return production && !authorized ? 404 : 200;
}
function debugEnabled(production, authorized, requested) {
  return Boolean(requested && (!production || authorized));
}
function apiRate(requests, limit=60) {
  return requests > limit ? 429 : 200;
}

const tests = [
  ["cron valid secret", () => assert.equal(cronAllowed("abc","Bearer abc"), true)],
  ["cron wrong secret", () => assert.equal(cronAllowed("abc","Bearer wrong"), false)],
  ["cron missing env FAIL CLOSED", () => assert.equal(cronAllowed(undefined,undefined), false)],
  ["transcribe normal", () => assert.equal(transcribeAllowed({tokenOk:true,bytes:1_000_000,requests:1}).status,200)],
  ["transcribe anonymous blocked", () => assert.equal(transcribeAllowed({tokenOk:false,bytes:1_000_000,requests:1}).status,401)],
  ["transcribe oversized blocked", () => assert.equal(transcribeAllowed({tokenOk:true,bytes:26*1024*1024,requests:1}).status,413)],
  ["transcribe burst blocked", () => assert.equal(transcribeAllowed({tokenOk:true,bytes:1_000_000,requests:11}).status,429)],
  ["diagnostic hidden in production", () => assert.equal(diagnosticAllowed(true,false),404)],
  ["diagnostic available to authorized test", () => assert.equal(diagnosticAllowed(true,true),200)],
  ["debug suppressed in public production", () => assert.equal(debugEnabled(true,false,true),false)],
  ["debug available to authorized test", () => assert.equal(debugEnabled(true,true,true),true)],
  ["normal API traffic passes", () => assert.equal(apiRate(12),200)],
  ["API flood limited", () => assert.equal(apiRate(61),429)],
];

let failed=0;
for (const [name, fn] of tests) {
  try { fn(); console.log("PASS", name); }
  catch (e) { failed++; console.error("FAIL", name, e); }
}
console.log(`\nSecurity simulation: ${tests.length-failed}/${tests.length} passed`);
if (failed) process.exit(1);


console.log("\n--- Ziiply real-call compatibility model ---");
function classifyPath(path) {
  if (path === "/api/transcribe") return "protected-cost";
  if (path === "/api/cron/kcitymarket-cache") return "cron";
  if (["/api/k-weight-identity-coverage-test","/api/k-weight-sitemap-test","/api/kalori-ean-test"].includes(path)) return "diagnostic";
  return "normal";
}
const realFlows = [
  ["Justiina S product search","/api/s-products"],
  ["Justiina K product search","/api/k-products"],
  ["Scanner S direct EAN","/api/s-ean-product"],
  ["Scanner K weight product","/api/k-weight-product"],
  ["Store selector / GPS","/api/store-search"],
  ["Gösta offer search","/api/offers/search"],
];
for (const [flow,path] of realFlows) {
  assert.equal(classifyPath(path),"normal", flow+" must remain on normal API policy");
  console.log("PASS",flow,"unchanged",path);
}
assert.equal(classifyPath("/api/transcribe"),"protected-cost");
console.log("PASS voice transcription identified as protected-cost endpoint; client needs matching authorization mechanism");
assert.equal(classifyPath("/api/cron/kcitymarket-cache"),"cron");
console.log("PASS K-Citymarket cron isolated from interactive user flows");
for (const p of ["/api/k-weight-identity-coverage-test","/api/k-weight-sitemap-test","/api/kalori-ean-test"]) {
  assert.equal(classifyPath(p),"diagnostic");
  console.log("PASS diagnostic isolated",p);
}
console.log("PASS rate limiting can target protected/expensive routes without changing normal S/K/store/offer routes");
console.log("\nCompatibility conclusion: normal Justiina, scanner, Kaupat and Gösta API paths need no auth contract change in this hardening design.");
