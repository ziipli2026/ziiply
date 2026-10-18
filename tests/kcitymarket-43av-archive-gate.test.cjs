const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const rows=JSON.parse(fs.readFileSync('/tmp/43av-replayed.json','utf8')).rows;
const offers=JSON.parse(fs.readFileSync('/tmp/43av-leaflet.json','utf8')).rows;
const find=(title,page)=>rows.find(x=>x.page===page&&x.title.includes(title));
test('43AV source archive exists and has expected issue',()=>{
 assert.equal(offers.length,35);
 assert.ok(rows.length>=offers.length);
});
test('43AV WC paper repeated across pages is allowed (different source placements)',()=>{
 assert.equal(offers.filter(x=>x.title.includes('WC-PAPERI 24 rl')).length,2);
});
test('43AV page 13 WC paper must not concatenate normal-price 9 and roll count 24',()=>{
 const x=find('WC-PAPERI',13);
 assert.ok(x,'missing page 13 WC paper');
 assert.equal(x.spatialResolved?.value,6.90,'9.24 is not a verified printed offer price');
});
test('43AV mobile soft drinks must preserve 3x6 multibuy total',()=>{
 const x=find('VIRVOITUSJUOMAT',1);
 assert.ok(x);
 assert.equal(x.spatialResolved?.value,10);
 assert.equal(x.spatialResolved?.quantity,3);
});
test('43AV chicken and mash must use same-card printed price',()=>{
 const x=find('MAINIO KIOVAN',3);
 assert.ok(x);
 assert.equal(x.spatialResolved?.value,2.15);
});
