import fs from "node:fs";
const d=JSON.parse(fs.readFileSync("data/lidl/enrichment-priority-v2-2026-10-05.json","utf8"));
if(d.priority.length!==15) throw new Error("batch 2 must contain 15 products");
if(d.verifiedPreviousPriceLinks.length!==5) throw new Error("expected five verified previous-price links");
if(!d.previousPricePolicy.includes("not current checkout-verified")) throw new Error("previous prices must remain non-checkout evidence");
console.log("PASS: Lidl batch two preserves five previous-price observations as non-checkout evidence");
