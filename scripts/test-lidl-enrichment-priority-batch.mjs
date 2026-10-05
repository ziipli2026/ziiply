import fs from "node:fs";
const data=JSON.parse(fs.readFileSync("data/lidl/enrichment-priority-v1-2026-10-05.json","utf8"));
if(data.priority.length!==15) throw new Error("priority batch must contain 15 products");
if(data.policy.thirdPass!=="EAN only with explicit packaging evidence") throw new Error("unsafe EAN policy");
console.log("PASS: Lidl enrichment batch one contains 15 products with safe EAN policy");
