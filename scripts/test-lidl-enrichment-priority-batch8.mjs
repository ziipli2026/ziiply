import fs from "node:fs";
const d=JSON.parse(fs.readFileSync("data/lidl/enrichment-priority-v8-2026-10-05.json","utf8"));
if(d.priority.length!==15)throw new Error("batch 8 must contain 15 products");
if(new Set(d.priority.map(x=>x.lidlProductId)).size!==15)throw new Error("duplicate product id");
if(d.priority.some(x=>x.checkoutComparable!==false||x.ean!==null))throw new Error("unverified checkout/EAN data");
console.log("PASS: Lidl batch eight contains 15 distinct official public observations");
