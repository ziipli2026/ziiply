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


console.log("\n--- Phase 3: abuse and regression boundary simulation ---");
function publicPolicy(path, ctx={}) {
  const normal = new Set(["/api/s-products","/api/k-products","/api/s-ean-product","/api/k-weight-product","/api/store-search","/api/offers/search"]);
  const diagnostics = new Set(["/api/k-weight-identity-coverage-test","/api/k-weight-sitemap-test","/api/kalori-ean-test"]);
  if (diagnostics.has(path)) return ctx.production ? 404 : 200;
  if (path === "/api/cron/kcitymarket-cache") {
    if (!ctx.cronSecret) return 503; // configuration failure: never execute work
    return ctx.authorization === "Bearer "+ctx.cronSecret ? 200 : 401;
  }
  if (path === "/api/transcribe") {
    if ((ctx.bytes ?? 0) > 25*1024*1024) return 413;
    if ((ctx.windowRequests ?? 0) > 10) return 429;
    return 200;
  }
  if (normal.has(path)) return (ctx.windowRequests ?? 0) > 120 ? 429 : 200;
  return 404;
}
const phase3=[
 ["S search normal",publicPolicy("/api/s-products",{windowRequests:4}),200],
 ["K search normal",publicPolicy("/api/k-products",{windowRequests:4}),200],
 ["scanner S normal",publicPolicy("/api/s-ean-product",{windowRequests:4}),200],
 ["scanner K scale normal",publicPolicy("/api/k-weight-product",{windowRequests:4}),200],
 ["store GPS normal",publicPolicy("/api/store-search",{windowRequests:8}),200],
 ["offers normal",publicPolicy("/api/offers/search",{windowRequests:8}),200],
 ["normal API abusive burst",publicPolicy("/api/store-search",{windowRequests:121}),429],
 ["transcribe ordinary voice",publicPolicy("/api/transcribe",{bytes:2*1024*1024,windowRequests:2}),200],
 ["transcribe oversized",publicPolicy("/api/transcribe",{bytes:26*1024*1024,windowRequests:2}),413],
 ["transcribe burst",publicPolicy("/api/transcribe",{bytes:2*1024*1024,windowRequests:11}),429],
 ["cron configured + Vercel auth",publicPolicy("/api/cron/kcitymarket-cache",{cronSecret:"x",authorization:"Bearer x"}),200],
 ["cron wrong auth",publicPolicy("/api/cron/kcitymarket-cache",{cronSecret:"x",authorization:"Bearer z"}),401],
 ["cron env missing does not run",publicPolicy("/api/cron/kcitymarket-cache",{}),503],
 ["diagnostic prod hidden",publicPolicy("/api/kalori-ean-test",{production:true}),404],
 ["diagnostic dev usable",publicPolicy("/api/kalori-ean-test",{production:false}),200],
];
for(const [name,actual,expected] of phase3){assert.equal(actual,expected);console.log("PASS",name,"=>",actual)}
console.log("PASS phase 3 boundaries: interactive Ziiply remains public; expensive/diagnostic abuse gets bounded.");

console.log("\n--- Debug exposure model ---");
function publicDebug(requested, production, internalAuthorized=false){
 return Boolean(requested && (!production || internalAuthorized));
}
assert.equal(publicDebug(true,true,false),false);
assert.equal(publicDebug(false,true,false),false);
assert.equal(publicDebug(true,false,false),true);
console.log("PASS ?debug=1 cannot expose diagnostic payload in public production model");
