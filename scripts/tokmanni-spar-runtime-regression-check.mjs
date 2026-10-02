#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the real production helper, replacing only its JSON import.
const source=readFileSync("src/lib/sparApprovedCategories.ts","utf8")
 .replace(/^import reviewedIndex from .*;\s*/m,"const reviewedIndex = {items: []};\n");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
vm.runInNewContext(js,{exports,require:()=>{throw Error("Unexpected import");}});
const {buildApprovedIndex,applyApprovedSparCategories,filterApprovedSparGroceryItems}=exports;
const approved=new Map([
 ["6411111111111",{productClass:"daily",ziiplyCategory:"Maitotuotteet",classificationStatus:"approved"}],
 ["6412222222222",{productClass:"department_store",ziiplyCategory:"",classificationStatus:"approved"}],
]);
const input=[
 {ean:"6411111111111",name:"Kevytmaito",category:"Tokmanni"},
 {ean:"6412222222222",name:"Maitotuttipullo",category:"Tokmanni"},
 {ean:"6413333333333",name:"Tuntematon maito",category:"Tokmanni"},
 {ean:"",name:"Tuote ilman EANia",category:"Tokmanni"},
];
const visible=filterApprovedSparGroceryItems(input,approved);
assert.equal(visible.length,3);
assert(!visible.some(x=>x.name==="Maitotuttipullo"));
const output=applyApprovedSparCategories(visible,approved);
assert.equal(output[0].category,"Maitotuotteet");
assert.equal(output[1].category,"Tokmanni");
assert.equal(output[2].category,"Tokmanni");
assert.equal(input[0].category,"Tokmanni","Do not mutate provider result");
assert.equal(exports.SPAR_APPROVED_INDEX.size,0,"Unreviewed proposals must not be auto-approved");
console.log("PASS: approved non-grocery excluded, milk categorized, unknown EAN retained, source immutable, zero autoapprovals");
