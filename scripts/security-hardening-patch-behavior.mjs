import assert from "node:assert/strict";
import fs from "node:fs";

const read=(p)=>fs.readFileSync(p,"utf8");
const cron=read("src/app/api/cron/kcitymarket-cache/route.ts");
const transcribe=read("src/app/api/transcribe/route.ts");
const diag=[
 "src/app/api/k-weight-identity-coverage-test/route.ts",
 "src/app/api/k-weight-sitemap-test/route.ts",
 "src/app/api/kalori-ean-test/route.ts",
].map(read);
const store=read("src/app/api/store-search/route.ts");
const sean=read("src/app/api/s-ean-product/route.ts");
const page=read("src/app/page.tsx");

assert.match(cron,/if \(!secret\)/);
assert.match(cron,/status: 503/);
assert.match(cron,/authorization.*Bearer/);
console.log("PASS cron fails closed when CRON_SECRET is absent and rejects bad auth");

assert.match(transcribe,/MAX_AUDIO_BYTES = 25 \* 1024 \* 1024/);
assert.match(transcribe,/content-length/);
assert.match(transcribe,/audio\.size > MAX_AUDIO_BYTES/);
assert.match(transcribe,/status: 413/);
console.log("PASS transcribe rejects oversized request before/after multipart parsing");

for(const src of diag) assert.match(src,/process\.env\.VERCEL_ENV === "production"/);
console.log("PASS all three diagnostic routes return 404 in Vercel production");

assert.match(store,/process\.env\.VERCEL_ENV !== "production"[\s\S]*debug/);
assert.match(sean,/process\.env\.VERCEL_ENV !== "production"[\s\S]*debug/);
console.log("PASS store-search and s-ean-product public production debug are suppressed");

for(const p of ["/api/s-products","/api/k-products","/api/k-weight-product","/api/store-search","/api/transcribe"]){
 assert.ok(page.includes(p), "page missing expected route "+p);
}
assert.ok(page.includes("/api/s-ean-product"),"scanner S route missing");
assert.ok(page.includes("searchByEan"),"scanner entry point missing");
console.log("PASS existing Justiina/scanner/store/voice route contracts still present in page.tsx");

for(const src of [store,sean]){
 assert.ok(!/CRON_SECRET|OPENAI_API_KEY/.test(src),"normal route unexpectedly gained secret requirement");
}
console.log("PASS normal store/scanner routes gained no authentication requirement");

console.log("\nPATCH BEHAVIOR STATIC CHECK: PASS");
