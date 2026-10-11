#!/usr/bin/env node
// Execute actual TypeScript search code against deterministic fixtures.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const Module = require("node:module");
const original = require.extensions[".ts"];
require.extensions[".ts"] = function(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX
  }}).outputText;
  module._compile(compiled, filename);
};
const root = "../src/app/components/ziiply";
const core = require(root+"/ziiplyCore.ts");
const memory = require(root+"/search/searchIntentMemory.ts");
const samples = [
  ["ketsuppi","ketchup"],["sinappi","mustard"],["majoneesi","mayonnaise"],
  ["tomaattimurska","tomato_crush"],["tomaattipyree","tomato_paste"],
  ["mysli","muesli"],["wc-paperi","toilet_paper"],["talouspaperi","paper_towels"],
  ["pyykinpesuaine","laundry_detergent"],["astianpesuaine","dishwashing"],
  ["kahvi","coffee"],["maito","milk"]
];
const results=[];
for (const [query,expected] of samples) {
 const actual=core.detectSearchIntent(query).category;
 results.push({query,expected,actual,pass:actual===expected});
}
const data=new Map();
global.window={localStorage:{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}};
const chosen={id:101,name:"Felix Ketsuppi 500 g",ean:"6411234567890",brandName:"Felix",category:"Ketsupit"};
const alternative={id:102,name:"Heinz Tomato Ketchup 500 g",ean:"6411234567891",brandName:"Heinz",category:"Ketsupit"};
const before=memory.getLearnedSearchBoost("ketsuppi",chosen);
memory.rememberSearchChoice("ketsuppi",chosen,"added_to_cart");
memory.rememberSearchChoice("ketsuppi",chosen,"added_to_cart");
const after=memory.getLearnedSearchBoost("ketsuppi",chosen);
const structure=memory.getLearnedStructureBoost("ketsuppi",alternative);
const learning={before:before.boost,after:after.boost,positive:after.positiveCount,structure:structure.boost,pass:after.positiveCount===2&&after.boost>before.boost};
const failures=results.filter(r=>!r.pass);
console.log(JSON.stringify({total:results.length,passed:results.length-failures.length,failures,learning},null,2));
if(failures.length||!learning.pass)process.exitCode=1;
