#!/usr/bin/env node
// Exercise the production TypeScript pagination helper without network calls.
const fs=require("node:fs");
const assert=require("node:assert/strict");
const ts=require("typescript");
const Module=require("node:module");
const source=fs.readFileSync("src/lib/ruoanhintaPagination.ts","utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const compiled=new Module("pagination-test",module);
compiled.filename="pagination-test.js";
compiled.paths=module.paths;
compiled._compile(js,compiled.filename);
const {appendRuoanhintaPages}=compiled.exports;
const items=(from,count)=>Array.from({length:count},(_,i)=>({id:from+i}));
async function run(){
 const results=[];
 async function check(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:String(e)});}}
 await check("short-first-page-no-extra-request",async()=>{
  let calls=0;const result=await appendRuoanhintaPages(items(0,2),3,async()=>{calls++;return []});
  assert.equal(result.length,2);assert.equal(calls,0);
 });
 await check("three-full-pages-capped",async()=>{
  const skips=[];const result=await appendRuoanhintaPages(items(0,3),3,async skip=>{skips.push(skip);return items(skip,3)});
  assert.deepEqual(skips,[3,6]);assert.equal(result.length,9);
 });
 await check("short-second-page-stops",async()=>{
  const skips=[];const result=await appendRuoanhintaPages(items(0,3),3,async skip=>{skips.push(skip);return items(3,1)});
  assert.deepEqual(skips,[3]);assert.equal(result.length,4);
 });
 await check("empty-page-stops",async()=>{
  const skips=[];const result=await appendRuoanhintaPages(items(0,3),3,async skip=>{skips.push(skip);return []});
  assert.deepEqual(skips,[3]);assert.equal(result.length,3);
 });
 await check("repeated-page-stops-without-duplicates",async()=>{
  const skips=[];const result=await appendRuoanhintaPages(items(0,3),3,async skip=>{skips.push(skip);return items(0,3)});
  assert.deepEqual(skips,[3]);assert.equal(result.length,3);
 });
 await check("overlapping-pages-deduplicated",async()=>{
  const result=await appendRuoanhintaPages(items(0,3),3,async skip=>skip===3?items(2,3):items(4,3));
  assert.deepEqual(result.map(x=>x.id),[0,1,2,3,4,5,6]);
 });
 await check("later-provider-error-preserves-first-page",async()=>{
  const result=await appendRuoanhintaPages(items(0,3),3,async()=>{throw Error("503")});
  assert.deepEqual(result.map(x=>x.id),[0,1,2]);
 });
 await check("later-provider-error-preserves-successful-pages",async()=>{
  const result=await appendRuoanhintaPages(items(0,3),3,async skip=>{if(skip===6)throw Error("503");return items(3,3)});
  assert.deepEqual(result.map(x=>x.id),[0,1,2,3,4,5]);
 });
 const passed=results.filter(x=>x.pass).length;
 console.log(JSON.stringify({passed,total:results.length,results},null,2));
 if(passed!==results.length)process.exitCode=1;
}
run().catch(error=>{console.error(error);process.exitCode=1});
