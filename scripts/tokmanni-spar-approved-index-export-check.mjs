#!/usr/bin/env node
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
const dir=mkdtempSync(join(tmpdir(),"spar-approval-"));
try{
 const merged=join(dir,"merged.json"),approvals=join(dir,"approved.json"),output=join(dir,"index.json");
 writeFileSync(merged,JSON.stringify({items:[{ean:"6411111111111"},{ean:"6412222222222"}]}));
 const run=items=>{writeFileSync(approvals,JSON.stringify({items}));return spawnSync(process.execPath,["scripts/tokmanni-spar-approved-index.mjs",merged,approvals,output],{encoding:"utf8"});};
 const valid=[{ean:"6411111111111",productClass:"daily",ziiplyCategory:"Maitotuotteet",classificationStatus:"approved"},{ean:"6412222222222",productClass:"department_store",ziiplyCategory:"",classificationStatus:"approved"}];
 assert.equal(run(valid).status,0,"Valid approvals must export");
 const result=JSON.parse(readFileSync(output,"utf8"));
 assert.equal(result.items.length,2);assert.equal(result.neonWrites,0);
 assert.notEqual(run([...valid,valid[0]]).status,0,"Duplicate EAN must fail");
 assert.notEqual(run([{...valid[0],classificationStatus:"proposed"}]).status,0,"Proposal must fail");
 assert.notEqual(run([{...valid[0],ean:"6413333333333"}]).status,0,"EAN missing from audit must fail");
 assert.notEqual(run([{...valid[0],ean:"not-an-ean"}]).status,0,"Invalid EAN must fail");
 assert.notEqual(run([{...valid[0],ziiplyCategory:""}]).status,0,"Missing daily category must fail");
 console.log("PASS: reviewed EAN export, duplicates, proposal, unknown EAN, malformed EAN and missing category");
}finally{rmSync(dir,{recursive:true,force:true});}
