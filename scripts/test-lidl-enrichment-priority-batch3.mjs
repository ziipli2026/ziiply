import fs from "node:fs";
const d=JSON.parse(fs.readFileSync("data/lidl/enrichment-priority-v3-2026-10-05.json","utf8"));
if(d.priority.length!==15) throw new Error("batch 3 must contain 15 products");
if(d.priority.some(x=>x.checkoutComparable!==false)) throw new Error("public observations cannot be checkout comparable");
if(d.priority.some(x=>x.ean)) throw new Error("EAN must not be inferred");
console.log("PASS: Lidl batch three has 15 official public observations and no inferred checkout/EAN data");
