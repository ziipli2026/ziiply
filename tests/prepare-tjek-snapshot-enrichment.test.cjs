const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const script=path.resolve(__dirname,'../scripts/prepare-tjek-snapshot-enrichment.mjs');
function run(manifest,snapshot){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'tjek-enrich-'));
 try{
  const m=path.join(dir,'manifest.json'),s=path.join(dir,'snapshot.json'),o=path.join(dir,'out.json');
  fs.writeFileSync(m,JSON.stringify(manifest));fs.writeFileSync(s,JSON.stringify(snapshot));
  const result=spawnSync(process.execPath,[script,m,s,o],{encoding:'utf8'});
  return {status:result.status,output:fs.existsSync(o)?JSON.parse(fs.readFileSync(o,'utf8')):null};
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
const manifest={baselineCount:2,offers:[{offerId:'a',departmentSlug:'electronics'},{offerId:'b',departmentSlug:'beverages'}]};
test('adds verified source metadata without altering other fields',()=>{
 const rows=[{offerId:'a',price:2,title:'x',debug:{other:1}},{offerId:'b',price:3}];
 const r=run(manifest,rows);assert.equal(r.status,0);assert.equal(r.output[0].debug.tjekDepartmentSlug,'electronics');assert.equal(r.output[0].debug.other,1);assert.equal(r.output[1].price,3);
});
test('rejects incomplete, stale, duplicated and conflicting snapshots',()=>{
 const rows=[{offerId:'a'},{offerId:'b'}];
 assert.notEqual(run({...manifest,baselineCount:3},rows).status,0);
 assert.notEqual(run(manifest,[{offerId:'a'}]).status,0);
 assert.notEqual(run(manifest,[{offerId:'a'},{offerId:'a'}]).status,0);
 assert.notEqual(run(manifest,[{offerId:'a'},{offerId:'c'}]).status,0);
 assert.notEqual(run(manifest,[{offerId:'a',debug:{tjekDepartmentSlug:'home'}},{offerId:'b'}]).status,0);
});

test('enrichment is deterministic and preserves every original field except verified metadata',()=>{
 const rows=[{offerId:'a',title:'A',price:3.25,category:'Muut',validFrom:'2026-11-17',debug:{existing:'ok'}},{offerId:'b',title:'B',price:4.50,category:'Juomat',imageUrl:'https://example.invalid/img'}];
 const first=run(manifest,rows);
 assert.equal(first.status,0);
 const second=run(manifest,first.output);
 assert.equal(second.status,0);
 assert.deepEqual(first.output,second.output);
 for(let i=0;i<rows.length;i++){
  const copy=structuredClone(first.output[i]);
  delete copy.debug.tjekDepartmentSlug;
  if(Object.keys(copy.debug).length===0)delete copy.debug;
  assert.deepEqual(copy,rows[i]);
 }
});
