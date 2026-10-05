import fs from "node:fs";
const j=JSON.parse(fs.readFileSync("data/lidl/product-metadata-enrichment-v1-2026-10-05.json","utf8"));
if(j.records.length!==226)throw new Error("expected 226 records");
const ids=j.records.map(r=>r.lidlProductId);if(new Set(ids).size!==226)throw new Error("duplicate Product IDs");
if(j.records.some(r=>r.checkoutComparable!==false))throw new Error("public metadata became comparable");
if(j.records.some(r=>r.ean!==null))throw new Error("unverified EAN imported");
for(const c of j.identifierConflicts||[])if(c.policy!=="do-not-merge-by-ian")throw new Error("unsafe IAN conflict policy");
console.log(JSON.stringify({records:j.records.length,ianConflicts:j.identifierConflicts.length,ok:true}));
