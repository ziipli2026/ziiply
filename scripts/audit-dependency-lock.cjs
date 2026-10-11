#!/usr/bin/env node
// Read-only manifest/lockfile drift report. Does not install or mutate dependencies.
const fs=require("node:fs");
const manifest=JSON.parse(fs.readFileSync("package.json","utf8"));
const lock=JSON.parse(fs.readFileSync("package-lock.json","utf8"));
const root=lock.packages?.[""]||{};
const issues=[];
for(const kind of ["dependencies","devDependencies"]){
 const wanted=manifest[kind]||{}, recorded=root[kind]||{};
 for(const [name,range] of Object.entries(wanted)){
  if(recorded[name]!==range)issues.push({kind,name,manifest:range,lockRoot:recorded[name]??null,installed:lock.packages?.["node_modules/"+name]?.version??null});
 }
 for(const [name,range] of Object.entries(recorded)){
  if(!(name in wanted))issues.push({kind,name,manifest:null,lockRoot:range,installed:lock.packages?.["node_modules/"+name]?.version??null});
 }
}
console.log(JSON.stringify({kind:"dependency-lock-drift",mutations:0,lockfileVersion:lock.lockfileVersion,issues,issueCount:issues.length},null,2));
// Drift is reported separately; it must not hide successful TypeScript checks.
