#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const data=JSON.parse(readFileSync("src/data/tokmanni-spar-approved-index.json","utf8"));
assert.equal(data.schemaVersion,1);
assert.equal(data.source,"reviewed-approvals");
assert.equal(data.neonWrites,0);
assert(Array.isArray(data.items));
const seen=new Set();
for(const row of data.items){
 assert.match(String(row.ean),/^\\d{8,14}$/);
 assert(!seen.has(row.ean),"Duplicate approved EAN: "+row.ean);seen.add(row.ean);
 assert.equal(row.classificationStatus,"approved");
 assert(["daily","department_store"].includes(row.productClass));
 if(row.productClass==="daily")assert(String(row.ziiplyCategory||"").trim());
}
console.log("PASS: versioned approved EAN index contract; rows="+data.items.length+"; no Neon writes");
