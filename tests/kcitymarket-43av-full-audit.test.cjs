const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const archive=JSON.parse(fs.readFileSync('/tmp/43av-leaflet.json','utf8')).rows;
const current=JSON.parse(fs.readFileSync('/tmp/43av-replayed.json','utf8')).rows;
const key=r=>r.page+'\u0000'+r.title;
const lookup=new Map(current.map(r=>[key(r),r]));
test('43AV retains every archived page-and-title placement',()=>{
 assert.equal(archive.length,35);
 for(const row of archive)assert.ok(lookup.has(key(row)),'Missing placement p'+row.page+' '+row.title);
});
test('43AV all accepted offers have verified positive prices',()=>{
 for(const archived of archive){
  const row=lookup.get(key(archived));assert.ok(row,'missing '+key(archived));
  assert.ok(Number(row.spatialResolved?.value)>0,'Unpriced p'+row.page+' '+row.title);
  assert.equal(row.spatialResolved?.sanity,'pass','Unverified p'+row.page+' '+row.title);
 }
});
test('43AV unit-rate cannot contradict a single-item transaction',()=>{
 for(const archived of archive){
  const row=lookup.get(key(archived));if(!row)continue;
  const pk=row.package,rate=row.unitPrice,price=row.spatialResolved;
  if(!pk||!rate||!price||price.quantity>1||price.packageCount>1||pk.min!==pk.max||rate.min!==rate.max)continue;
  if(!/^(?:geometry\/kg|printed\/kg|.*\/(?:kg|l).*)$/i.test(String(rate.raw||'')))continue;
  const expected=pk.min*rate.min;
  if(expected<=0)continue;
  const difference=Math.abs(price.value-expected);
  assert.ok(difference<=Math.max(.12,expected*.07)||
    /owned-printed|overprinted|multibuy|bundle/.test(price.source||''),
    'Price/rate discrepancy p'+row.page+' '+row.title+': '+price.value+' vs '+expected);
 }
});
test('43AV duplicate paper remains two independent placements',()=>{
 const rows=current.filter(r=>r.title==='WC-PAPERI 24 rl');
 assert.deepEqual(rows.map(r=>r.page).sort((a,b)=>a-b),[8,13]);
});
