import fs from "node:fs";
const d=JSON.parse(fs.readFileSync("data/lidl/enrichment-priority-v7-2026-10-05.json","utf8"));
if(d.priority.length!==15) throw new Error("batch 7 must contain 15 products");
if(d.priority.some(x=>x.checkoutComparable!==false)) throw new Error("public observations cannot be checkout comparable");
if(d.priority.some(x=>x.ean!==null)) throw new Error("EAN must remain null without evidence");
const ids=new Set(d.priority.map(x=>x.lidlProductId));if(ids.size!==15)throw new Error("duplicate product id");
console.log("PASS: Lidl batch seven preserves Product-ID identity and quarantines checkout/EAN data");
