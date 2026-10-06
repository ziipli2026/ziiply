const fs = require("fs");
const p = "src/app/components/ziiply/offerSearch/providers/tokmanniProvider.ts";
const s = fs.readFileSync(p, "utf8");
const checks = [
  ["no arbitrary text normal-price fallback", !s.includes("ordinaryAfterMulti")],
  ["structured card-price fallback", s.includes("ordinaryCardPrice") && s.includes("priceElementValues")],
  ["complete Magento product cards retained", s.includes("function rawProductBlocks") && !s.includes("part.split(/<\\/li>/i)")],
  ["Magento card regex uses real escapes", /\.split\(\/<li\\\\b/.test(s) && !/\.split\(\/<li\\\\\\\\b/.test(s)],
  ["offer marker regex uses real escapes", /Normaalihinta\|\\\\d\+\\\\s\*kpl/.test(s) && !/Normaalihinta\|\\\\\\\\d\+/.test(s)],
  ["weekly rows explicitly offers", s.includes('campaignType: "offer"')],
  ["listing completeness checks raw cards", s.includes("rawProductCardCount") && s.includes("Tokmanni listing incomplete")],
  ["filtered offer count is not compared to advertised total", !s.includes("dedupedItems.length !== total")],
  ["page-cap overflow fails closed", s.includes("Tokmanni offer listing exceeds parser page cap")],
  ["short master cache", s.includes("TOKMANNI_CACHE_TTL_MS = 10 * 60 * 1000")],
  ["in-flight request coalescing", s.includes("tokmanniOffersInFlight")],
];
let failed = false;
for (const [name, ok] of checks) {
  console.log(ok ? "PASS" : "FAIL", name);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
