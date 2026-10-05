import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("src/app/api/offers/search/route.ts", "utf8");
const card = fs.readFileSync("src/app/components/ziiply/cards/ZiiplyMobileOfferSearchCard.tsx", "utf8");
const core = fs.readFileSync("src/app/components/ziiply/offerSearch/ziiplyOfferSearchCore.ts", "utf8");

assert.match(route, /campaignType:\s*"campaign"/, "Lidl campaign rows must be explicitly tagged");
assert.match(route, /item\.campaignType === "campaign" \? "campaign" : "offer"/, "dedupe identity must keep campaign and offer namespaces separate");
assert.match(route, /const activeOfferKeys = new Set/, "Lidl campaign feed must compare against active dated offers");
assert.match(route, /!activeOfferKeys\.has/, "exact active offer duplicates must be removed from campaign feed");
assert.match(route, /\.replace\(\/\\b\\d\+\(\?:\[\.,\]\\d\+\)\?\\s\*\(\?:g\|kg\|ml\|l\|kpl\)\\b\/g/, "campaign normalization must strip package sizes with working word-boundary regex");
assert.match(card, /contentTab === "campaigns"\s*\? offers\.filter\(\(offer\) => offer\.campaignType === "campaign"\)\s*:\s*offers\.filter\(\(offer\) => offer\.campaignType !== "campaign"\)/s, "Gösta tabs must partition campaign and dated offers");
assert.match(core, /if \(category === "Muut"\) return false;/, "Muut must be excluded from visible Gösta grocery offers");

console.log("PASS: Lidl campaign/offer separation, dedupe and grocery visibility guards");
