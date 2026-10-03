#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function load(path,replaceImport=false){
 let source=readFileSync(path,"utf8");
 if(replaceImport)source=source.replace(/^import reviewedIndex from .*;\s*/m,"const reviewedIndex = {items: []};\n");
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(js,{exports,require:()=>{throw Error("Unexpected import")}});return exports;
}
const milk=load("src/lib/sparMilkSearch.ts");
const approved=load("src/lib/sparApprovedCategories.ts",true);
const index=approved.buildApprovedIndex(JSON.parse(readFileSync("src/data/tokmanni-spar-approved-index.json","utf8")).items);
const cases=[
 ["maito","6408653127312","Rasvaton maitojuoma Juustoportti",true],
 ["maito","6408653127282","Kevytmaitojuoma Juustoportti",true],
 ["maito","4032549001770","Kondensoitu maito makeutettu",true],
 ["maito","6408430840618","Kevyt maitojauhe laktoositon",true],
 ["maito","9002859056932","Woogie 250 g Milk Caramel",false],
 ["maito","6412600819939","Lumene Kauramaito-öljypuhdistus",false],
 ["maito","6438565656853","Sukat Miny keksi ja maito",false],
 ["maito","6438565656846","Sukat Miny keksi ja maito",false],
 ["maito","","Maitosuklaa",false],
 ["maito","","Maitotuttipullo",false],
 ["maito","","Kaura maitojuoma 1 l",true],
 ["maito","","Rasvaton maito 1 l",true]
];
let pass=0;
for(const [term,ean,name,expected] of cases){
 const input=[{ean,name}];
 const actual=approved.filterApprovedSparMilkCategory(milk.filterSparMilkQuery(input,term),term,index).length===1;
 assert.equal(actual,expected,term+" / "+ean+" / "+name);pass++;
}
for(const term of ["kahvi","kananmuna","leipä","juusto","jogurtti","voi","riisi","pasta","sokeri","jauho","mehu","cola","peruna","banaani","shampoo","koiranruoka"]){
 const item={ean:"",name:"Testituote"};
 assert.equal(milk.filterSparMilkQuery([item],term).length,1);
 assert.equal(approved.filterApprovedSparMilkCategory([item],term,index).length,1);
 pass++;
}
console.log("PASS: "+pass+" multi-category fixture assertions; unknown EANs retained, no DB or live-provider calls");
