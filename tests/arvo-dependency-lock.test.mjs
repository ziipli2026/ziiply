import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("package-lock root dependencies match package.json",()=>{
 const manifest=JSON.parse(readFileSync("package.json","utf8"));
 const lock=JSON.parse(readFileSync("package-lock.json","utf8"));
 const root=lock.packages?.[""];
 assert.ok(root,"missing lockfile root");
 for(const section of ["dependencies","devDependencies"]){
  for(const [name,range] of Object.entries(manifest[section]??{}))
   assert.equal(root[section]?.[name],range,`lockfile out of sync: ${name}`);
 }
});
