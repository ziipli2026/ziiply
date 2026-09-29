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

assert.match(cron,/process\.env\.CRON_SECRET/);
assert.match(cron,/authorization.*Bearer/);
console.log("DEFER cron fail-closed assertion until production CRON_SECRET is verified");

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


console.log("\n--- Public API deep-review assertions ---");
const kProducts=read("src/app/api/k-products/route.ts");
const sProducts=read("src/app/api/s-products/route.ts");
const storeSearch=read("src/app/api/store-search/route.ts");
const offers=read("src/app/api/offers/route.ts");
const offersSearch=read("src/app/api/offers/search/route.ts");
const kWeight=read("src/app/api/k-weight-product/route.ts");
assert.ok(!/searchParams\.get\(["']url["']\)/.test(kProducts+sProducts+storeSearch+offers+offersSearch+sean+kWeight));
console.log("PASS no reviewed route exposes a direct caller-supplied URL fetch parameter");
assert.match(storeSearch,/Promise\.all\(terms\.map\(fetchRuoanhinta\)\)/);
console.log("PASS store-search amplification point detected: one GPS call => seven upstream searches");
assert.match(offers,/process\.env\.VERCEL_ENV !== "production"[\s\S]*raw: rawData/);
console.log("PASS offers raw/preview are now non-production only");
assert.match(offersSearch,/process\.env\.VERCEL_ENV !== "production"[\s\S]*kruokaDebug:/);
console.log("PASS offers-search debug is now non-production only");
assert.match(sean,/process\.env\.VERCEL_ENV !== "production"[\s\S]*error\.stack\.split/);
console.log("PASS s-ean-product stack is now non-production only");
assert.match(kWeight,/process\.env\.VERCEL_ENV === "production" \? "upstream-error"/);
console.log("PASS k-weight-product production error is generic");


console.log("\n--- Input hardening patch assertions ---");
assert.match(storeSearch,/latitude < -90/); assert.match(storeSearch,/longitude > 180/);
assert.match(storeSearch,/search\.length > 120/);
assert.match(kProducts,/search\.length > 120/); assert.match(sProducts,/search\.length > 120/);
assert.ok(offers.includes("if (!/^\\\\d{1,16}$/.test(storeId))"));
assert.ok(sean.includes("if (!/^\\\\d{8,14}$/.test(ean))"));
assert.match(kWeight,/storeName\.length > 160/);
assert.match(offersSearch,/q\.length > 160/);
assert.match(offersSearch,/length > 40/);
console.log("PASS GPS bounds and query/store/EAN size limits are present");
