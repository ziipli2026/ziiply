import fs from "node:fs";
const d=JSON.parse(fs.readFileSync("data/lidl/enrichment-priority-v4-2026-10-05.json","utf8"));
if(d.priority.length!==15) throw new Error("batch 4 must contain 15 products");
if(d.priority.some(x=>x.checkoutComparable!==false)) throw new Error("public observations cannot be checkout comparable");
if(d.priority.some(x=>x.ean!==null)) throw new Error("EAN must remain null without evidence");
console.log("PASS: Lidl batch four has 15 official observations with EANs quarantined");
