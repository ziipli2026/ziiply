#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const js=ts.transpileModule(readFileSync("src/lib/sparGroceryIntent.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};vm.runInNewContext(js,{exports});
const cases=[
 ["maito","kissanruoka",false],["maito","Maitotuotteet",true],
 ["kahvi","koiran heitto- ja noutolelut",false],["kahvi","kahvinkeittimien tarvikkeet",false],
 ["kananmuna","koiran kuivaruoka",false],["leipä","miny pehmolelut",false],
 ["juusto","kissan makupalat",false],["riisi","koiran kuivaruoka",false],
 ["peruna","koiran märkäruoka",false],["banaani","koiran vesilelut",false],
 ["banaani","shampoo vaurioituneille hiuksille",false],
 ["kana","kissan kuivaruoka",false],["kala","kissanlelut",false],
 ["jäätelö","miny sukat",false],["kerma","matot",false],
 ["tee","wc-puhdistusaineet",false],["makkara","koiran märkäruoka",false],
 ["riisi","Riisi ja viljat",true],["kana","Liha ja kala",true],
 ["maito","",true],["shampoo","shampoo vaurioituneille hiuksille",true],
 ["koiranruoka","koiran kuivaruoka",true],
];
for(const [intent,category,expected] of cases){
 const items=[{ean:"",category}];
 assert.equal(exports.filterSparHumanFoodIntent(items,intent).length===1,expected,intent+" / "+category);
}
console.log("PASS: "+cases.length+" grocery intent category checks; missing category and non-food intent preserved");
