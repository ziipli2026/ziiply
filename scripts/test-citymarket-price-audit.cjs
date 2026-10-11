#!/usr/bin/env node
// Regression fixtures for the read-only Citymarket price audit.
// Run: node scripts/test-citymarket-price-audit.cjs
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const audit=path.join(__dirname,'audit-citymarket-prices.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'kcm-audit-'));
function record(title,id,price,unitPrice,packageSize){
 return {name:title,price,__sourceOfferSearchResult:{id,price,unitPrice,packageSize}};
}
function run(rows){
 const file=path.join(dir,'export.json');
 fs.writeFileSync(file,JSON.stringify({rawItems:rows}));
 const r=spawnSync(process.execPath,[audit,file],{encoding:'utf8'});
 assert.equal(r.error,undefined);
 return {status:r.status,result:JSON.parse(r.stdout)};
}
try{
 const tortilla=record('ORIGINAL VEHNÄTORTILLA MEDIUM 326 g','kcm:spatial:20:tortilla:1.15',1.15,3.53,'326 g');
 const nachips=record('ORIGINAL NACHIPS 450 g','kcm:spatial:20:nachips:1.15',1.15,6.64,'450 g');
 const collision=run([tortilla,nachips]);
 assert.equal(collision.status,1,'a suspicious price collision must block green audit');
 assert.equal(collision.result.issueCounts['same-page-price-collision-review'],1);
 const clean=run([tortilla]);
 assert.equal(clean.status,0,'a consistent record must remain green');
 const corrected=run([tortilla,record('ORIGINAL NACHIPS 450 g','kcm:spatial:20:nachips:2.99',2.99,6.64,'450 g')]);
 assert.equal(corrected.status,0,'distinct internally consistent prices must pass');
 const archived=run([record('ORIGINAL VEHNÄTORTILLA MEDIUM 326 g','kcm:spatial:20:tortilla:1.15',1.15,3.53,'326 g'),record('ORIGINAL NACHIPS 450 g','kcm:spatial:20:nachips:1.15',1.15,6.64,'450 g')]);
 assert.equal(archived.result.rows,2,'archived 41LV records are evaluated without publisher access');
 assert.equal(archived.status,1,'archived suspicious prices must still block');
 const beer=run([record('ALKOHOLITON OLUT 0,0 % 0,33 l/tlk 8-pack','kcm:spatial:20:beer:7.99',7.99,2.57,'0,33 l')]);
 assert.equal(beer.status,0,'a plausible can deposit must not be a proven price error');
 assert.equal(beer.result.issueCounts['possible-container-deposit-review'],1);
 console.log('Citymarket audit regression: 5 fixtures passed');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
