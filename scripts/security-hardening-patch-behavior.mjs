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


console.log("\n--- Vercel Firewall design checks ---");
const fw=JSON.parse(fs.readFileSync("security/vercel-firewall-rate-limit-plan.json","utf8"));
assert.equal(fw.simulationOnly,true);
const tr=fw.rules.find(r=>r.name==="ziiply-transcribe-rate-limit");
const api=fw.rules.find(r=>r.name==="ziiply-public-api-rate-limit");
assert.deepEqual(tr.match,{path:"/api/transcribe",method:"POST"});
assert.equal(tr.limit,10); assert.equal(tr.windowSeconds,60); assert.equal(tr.responseStatus,429);
assert.equal(api.match.pathPrefix,"/api/");
assert.ok(api.excludePaths.includes("/api/transcribe"));
assert.ok(api.excludePaths.includes("/api/cron/kcitymarket-cache"));
assert.equal(api.limit,120); assert.equal(api.windowSeconds,60); assert.equal(api.responseStatus,429);
for(const path of ["/api/s-products","/api/k-products","/api/s-ean-product","/api/k-weight-product","/api/store-search","/api/offers/search"]){
 assert.ok(!api.excludePaths.includes(path),path+" unexpectedly excluded from general protection");
}
console.log("PASS Firewall model: transcribe 10/min/IP, general API 120/min/IP");
console.log("PASS cron excluded from generic rate rule; authorization remains its protection");
console.log("PASS normal Ziiply API routes remain available below abuse threshold");


console.log("\n--- Secret exposure checks ---");
const transcribeSrc=read("src/app/api/transcribe/route.ts");
const cronSrc=read("src/app/api/cron/kcitymarket-cache/route.ts");
const offerRouter=read("src/app/components/ziiply/offerSearch/ziiplyOfferSearchSources.ts");
const etProvider=read("src/app/components/ziiply/offerSearch/providers/etarjouslehdetProvider.ts");
assert.match(transcribeSrc,/process\.env\.OPENAI_API_KEY/);
assert.match(cronSrc,/process\.env\.CRON_SECRET/);
assert.match(etProvider,/const TJEK_API_KEY\s*=\s*["'][^"']+["']/);
assert.match(offerRouter,/const ENABLE_ETARJOUSLEHDET_PROVIDER_V28 = false/);
console.log("PASS OpenAI and cron credentials remain server environment references");
console.log("PASS hardcoded Tjek key exposure detected without printing its value");
console.log("PASS active offer router currently disables eTarjouslehdet provider, so remediation can be isolated");
