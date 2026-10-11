#!/usr/bin/env node
// Deterministic latency-budget simulation using the real TypeScript pagination helper.
// No live provider network requests. These are simulated timings, not measured API latency.
const fs=require("node:fs");
const assert=require("node:assert/strict");
const ts=require("typescript");
const Module=require("node:module");
const source=fs.readFileSync("src/lib/ruoanhintaPagination.ts","utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod=new Module("pagination-performance",module);
mod.filename="pagination-performance.js";mod.paths=module.paths;mod._compile(js,mod.filename);
const {appendRuoanhintaPages}=mod.exports;
const items=(count,offset=0)=>Array.from({length:count},(_,i)=>({id:i+offset}));
(async()=>{
 const results=[];
 async function scenario(name,firstCount,size,expectedCalls){
  let calls=0;const t=performance.now();
  const output=await appendRuoanhintaPages(items(firstCount),size,async skip=>{calls++;return items(size,skip)});
  const elapsedMs=Number((performance.now()-t).toFixed(3));
  assert.equal(calls,expectedCalls);
  results.push({name,pageSize:size,extraRequests:calls,items:output.length,localHelperElapsedMs:elapsedMs});
 }
 await scenario("S-under-one-page",79,80,0);
 await scenario("K-under-one-page",99,100,0);
 await scenario("S-full-pages",80,80,2);
 await scenario("K-full-pages",100,100,2);
 console.log(JSON.stringify({kind:"pagination-local-performance",networkRequestsMeasured:false,results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
