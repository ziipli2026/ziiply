// Offline diagnostic for K-store comparable-product matching.
// Usage after compiling ziiplyCore.ts to /tmp/ziiply-core:
// node scripts/audit-k-comparable-diagnostics-20261001.cjs "source product" EAN candidates.json
// candidates.json: [{"name":"...","price":1.99,"ean":"..."}]
const fs = require("node:fs");
const core = require("/tmp/ziiply-core/ziiplyCore.js");
const [query, ean = "", file] = process.argv.slice(2);
if (!query || !file) {
  console.error("usage: <query> <ean-or-empty> <candidates.json>");
  process.exit(2);
}
const items = JSON.parse(fs.readFileSync(file, "utf8"));
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
