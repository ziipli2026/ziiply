#!/usr/bin/env node
// Execute the actual dependency-free TS helper by stripping its limited type syntax.
// No database, network or production route execution.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const source=readFileSync("src/lib/sparVisibility.ts","utf8");
const js=source
 .replace(/export type SparVisibilityClass = [^;]+;/,"")
 .replace(/export const SPAR_VISIBILITY_ENABLED = false as boolean;/,"const SPAR_VISIBILITY_ENABLED = false;")
 .replace(/export function applySparVisibility<T extends \{ean\?: string\}>\(items: T\[\], approved: ReadonlyMap<string,SparVisibilityClass>, enabled = SPAR_VISIBILITY_ENABLED\): T\[\]/,"function applySparVisibility(items, approved, enabled = SPAR_VISIBILITY_ENABLED)")
 .replace(/export /g,"");
assert(!js.includes("ReadonlyMap"),"Type stripping failed");
const context=vm.createContext({Map});
vm.runInContext(js+"\nthis.apply=applySparVisibility;this.enabled=SPAR_VISIBILITY_ENABLED;",context);
assert.equal(context.enabled,false);
const input=[
 {ean:"11111111",name:"food",price:2.5},
 {ean:"22222222",name:"lamp",price:9},
 {ean:"33333333",name:"review",price:3},
 {ean:"44444444",name:"new",price:4},
 {ean:"",name:"no EAN",price:1}
];
const index=new Map([["11111111","daily"],["22222222","department_store"],["33333333","review"]]);
const off=context.apply(input,index);
assert.equal(off,input,"Disabled gate must return original array unchanged");
const on=context.apply(input,index,true);
assert.deepEqual(Array.from(on,x=>x.ean),["11111111","33333333","44444444",""]);
assert.deepEqual(Array.from(on,x=>x.price),[2.5,3,4,1]);
assert.equal(input.length,5,"Filtering must not mutate source array");
assert.equal(context.apply(input,new Map(),true).length,5,"Missing index must not hide products");
console.log("PASS: disabled passthrough, department-store exclusion, daily/review/unknown preservation, price preservation, no mutation, empty-index fallback");
