#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const d=JSON.parse(readFileSync("tokmanni-spar-merged-classification.json","utf8"));
const fertilizer=d.items.filter(x=>/lannoit|puutarhamulta|kasvualusta/i.test(String(x.name||"")));
assert(fertilizer.length>0,"Missing fertilizer fixtures");
assert(fertilizer.every(x=>x.productClass==="department_store"),"Fertilizer leaked into grocery classification");
const detergents=d.items.filter(x=>/astianpesuaine/i.test(String(x.name||"")));
assert(detergents.length>0);
assert(detergents.every(x=>x.productClass!=="department_store"),"Dishwashing detergent incorrectly excluded");
console.log(JSON.stringify({fertilizerExcluded:fertilizer.length,dishwashingPreserved:detergents.length}));
