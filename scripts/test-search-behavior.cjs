#!/usr/bin/env node
// Execute actual TypeScript search code against deterministic fixtures.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const ts = require("typescript");
require.extensions[".ts"] = function(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX
  }}).outputText;
  module._compile(compiled, filename);
};
// Node does not resolve extensionless local TypeScript imports by default.
const Module = require("node:module");
const path = require("node:path");
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
  try { return originalResolve.call(this, request, parent, isMain, options); }
  catch (error) {
    if (error.code === "MODULE_NOT_FOUND" && request.startsWith(".")) {
      const candidate = path.resolve(path.dirname(parent.filename), request + ".ts");
      if (fs.existsSync(candidate)) return candidate;
    }
    throw error;
  }
};
const root = "../src/app/components/ziiply";
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === "posthog-js") return { __esModule: true, default: {} };
  return originalLoad.call(this, request, parent, isMain);
};
const core = require(root+"/ziiplyCore.ts");
Module._load = originalLoad;
const memory = require(root+"/search/searchIntentMemory.ts");
const samples = [
  ["ketsuppi","ketchup"],["sinappi","mustard"],["majoneesi","mayonnaise"],
  ["tomaattimurska","tomato_crush"],["tomaattipyree","tomato_paste"],
  ["mysli","muesli"],["wc-paperi","toilet_paper"],["talouspaperi","paper_towels"],
  ["pyykinpesuaine","laundry_detergent"],["astianpesuaine","dishwashing"],
  ["kahvi","coffee"],["maito","milk"],
  ["keksi","cookies"],["karkki","candy"],["suklaa","chocolate"],
  ["suolapähkinä","snacks"],["hunajasinappi","mustard"],
  ["tomaattitahna","tomato_paste"],["dijonsinappi","mustard"]
];
assert(samples.length >= 16, "Insufficient intent regression coverage");
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
const stored=memory.loadSearchIntentMemory();
const persisted=Object.values(stored.entries).some(e=>e.productName===chosen.name&&e.positiveCount===2);
memory.rememberSearchChoice("ketsuppi",chosen,"rejected");
const afterRejection=memory.getLearnedSearchBoost("ketsuppi",chosen);
const otherQuery=memory.getLearnedSearchBoost("maito",chosen);
const negativeProduct={id:103,name:"Heinz Ketsuppi 1 kg",ean:"6411234567892",brandName:"Heinz",category:"Ketsupit"};
const negativeBefore=memory.getLearnedSearchBoost("ketsuppi",negativeProduct);
memory.rememberSearchChoice("ketsuppi",negativeProduct,"skipped");
const negativeAfter=memory.getLearnedSearchBoost("ketsuppi",negativeProduct);
memory.clearSearchIntentMemory();
const afterClear=memory.loadSearchIntentMemory();
const learning={before:before.boost,after:after.boost,positive:after.positiveCount,structure:structure.boost,persisted,afterRejection:afterRejection.boost,isolatedOtherQuery:otherQuery.boost,negativeBefore:negativeBefore.boost,negativeAfter:negativeAfter.boost,cleared:Object.keys(afterClear.entries).length===0,pass:after.positiveCount===2&&after.boost>before.boost&&persisted&&afterRejection.boost<after.boost&&negativeAfter.negativeCount===1&&negativeAfter.boost<negativeBefore.boost&&otherQuery.positiveCount===0&&Object.keys(afterClear.entries).length===0};
const failures=results.filter(r=>!r.pass);
assert.equal(results.length, samples.length, "Some category cases were not executed");
console.log(JSON.stringify({total:results.length,passed:results.length-failures.length,failures,learning},null,2));
if(failures.length||!learning.pass){
 console.error("Search behavior regression failed", {failures,learning});
 process.exitCode=1;
}
