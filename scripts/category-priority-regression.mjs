#!/usr/bin/env node
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source=readFileSync("src/app/components/ziiply/offerSearch/ziiplyOfferCategoryCore.ts","utf8");
const js=ts.transpileModule(source,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText;
const exports={};
vm.runInNewContext(js,{exports});

const cases=[
  [{title:"Piparkakut 300 g",category:"Maitotuotteet"},"Makeiset & keksit"],
  [{title:"Kanelipiparit 400 g",category:"Maitotuotteet"},"Makeiset & keksit"],
  [{title:"Pikkuleivät 200 g",category:"Maitotuotteet"},"Makeiset & keksit"],
  [{title:"Keksit 250 g",category:"Maitotuotteet"},"Makeiset & keksit"],
  [{title:"Cookies 150 g",category:"Maitotuotteet"},"Makeiset & keksit"],
  [{title:"Piparkakkujäätelö 500 ml",category:"Maitotuotteet"},"Pakasteet"],
  [{title:"Maito 1 l",category:"Maitotuotteet"},"Maitotuotteet"],
  [{title:"Maitosuklaa 200 g",category:"Maitotuotteet"},"Maitotuotteet"],
  [{title:"Piparkakut 300 g",category:"Makeiset & keksit"},"Makeiset & keksit"],
];

for(const [item,expected] of cases){
  const actual=exports.getOfferCategoryV106(item);
  assert.equal(actual,expected,JSON.stringify({item,expected,actual}));
}

console.log("PASS: "+cases.length+" category-priority regression cases");
