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
