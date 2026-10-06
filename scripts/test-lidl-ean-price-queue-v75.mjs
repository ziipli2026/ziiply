#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";
const links=JSON.parse(fs.readFileSync("data/lidl/verified-ean-links.json","utf8"));
assert.ok(links.length>0);
const seen=new Set();
for(const row of links){
 assert.match(row.ean,/^\d{8,14}$/);
 assert.ok(String(row.lidlProductId||"").trim());
 assert.ok(!seen.has(row.ean),"duplicate EAN "+row.ean);
 seen.add(row.ean);
}
const queue=links.map(({ean,lidlProductId})=>({ean,lidlProductId,priceLookup:"neon-first",refreshWhen:["missing","stale"]}));
assert.equal(queue.length,links.length);
console.log(JSON.stringify({suite:"Lidl verified EAN price queue",passed:links.length,failed:0,queueSize:queue.length,policy:"neon-first; refresh missing/stale only"}));
