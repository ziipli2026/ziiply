// Offline diagnostic for K-store comparable-product matching.
// Usage after compiling ziiplyCore.ts to /tmp/ziiply-core:
// node scripts/audit-k-comparable-diagnostics-20261001.cjs "source product" EAN candidates.json
// candidates.json: [{"name":"...","price":1.99,"ean":"..."}]
// This diagnostic never fetches upstream data: supply store-specific candidate snapshots.
const fs = require("node:fs");
const core = require("/tmp/ziiply-core/ziiplyCore.js");
const [query, ean = "", file] = process.argv.slice(2);
if (!query || !file) {
  console.error("usage: <query> <ean-or-empty> <candidates.json>");
  process.exit(2);
}
const payload = JSON.parse(fs.readFileSync(file, "utf8"));
const items = Array.isArray(payload) ? payload : payload.items;
const provenance = Array.isArray(payload) ? {kind:"unlabelled-offline-array"} : {
  kind: typeof payload.provenance === "string" ? payload.provenance : "unlabelled-offline-snapshot",
  store: typeof payload.store === "string" ? payload.store : null,
  capturedAt: typeof payload.capturedAt === "string" ? payload.capturedAt : null,
};
if (!Array.isArray(items)) {
  console.error("INVALID_CANDIDATES: expected an array or an object containing items[]");
  process.exit(2);
}
const malformedIndex = items.findIndex(item => !item || typeof item !== "object" || Array.isArray(item) || typeof item.name !== "string" || !item.name.trim());
if (malformedIndex !== -1) {
  console.error(`INVALID_CANDIDATE_ROW: items[${malformedIndex}] must contain a nonempty string name`);
  process.exit(2);
}
const sourceSize = core.parseMetricSize(query);
const rows = items.map((item) => {
  const targetSize = core.parseMetricSize(item.name);
  const sizeConflict = Boolean(
    core.isUsableEan(core.normalizeEan(ean)) && sourceSize && targetSize &&
    (sourceSize.unitGroup !== targetSize.unitGroup || sourceSize.amount !== targetSize.amount)
  );
  const reasons = [];
  if (!(Number(item.price) > 0)) reasons.push("no-positive-price");
  if (core.isHardRejectedAlternative(query,item.name)) reasons.push("hard-alternative");
  if (core.isHardRejectedKMatch(query,item.name)) reasons.push("hard-k-match");
  if (!core.productGroupGate(query,item.name)) reasons.push("product-group");
  if (sizeConflict) reasons.push("size-conflict-with-source-ean");
  const score = core.scoreNameMatch(query,item.name);
  if (score <= -100) reasons.push("score-reject");
  return {name:item.name,ean:item.ean,price:item.price,score,reasons};
});
rows.sort((a,b)=>b.score-a.score);
console.table(rows);
const best = core.pickBestKProduct(items,query,ean);
console.log("BEST",best ? {name:best.name,ean:best.ean,price:best.price} : null);
const positive = rows.filter(row => Number(row.price) > 0);
const diagnosticStatus = items.length === 0 ? "NO_CANDIDATES_RETURNED"
  : positive.length === 0 ? "NO_PRICED_CANDIDATES"
  : best ? "MATCH_FOUND" : "CANDIDATES_REJECTED_OR_BELOW_THRESHOLD";
console.log("DIAGNOSTIC_SUMMARY",JSON.stringify({
  status:diagnosticStatus,
  provenance,
  totalCandidates:items.length,
  pricedCandidates:positive.length,
  bestEan:best?.ean ?? null,
  rejectionCounts:rows.flatMap(row => row.reasons).reduce((counts, reason) => {
    counts[reason] = (counts[reason] || 0) + 1;
    return counts;
  }, {}),
}));
