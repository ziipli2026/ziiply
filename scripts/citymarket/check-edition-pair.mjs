import fs from 'node:fs';
import assert from 'node:assert/strict';
const files=process.argv.slice(2);
assert.equal(files.length,2,'Expected AV and LV metadata paths');
const editions=files.map(file=>{
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 const match=new URL(data.leaflet).pathname.match(/tarjouslehti_(\d+)(AV|LV)_KCM\/index\.html/i);
 assert.ok(match,'Unknown Citymarket leaflet identity: '+data.leaflet);
 assert.ok(Array.isArray(data.rows)&&data.rows.length>0,'Empty leaflet: '+data.leaflet);
 return {week:Number(match[1]),kind:match[2].toUpperCase(),url:data.leaflet};
});
assert.equal(editions[0].kind,'AV','AV entry redirected to another edition');
assert.equal(editions[1].kind,'LV','LV entry redirected to another edition');
assert.equal(editions[0].week,editions[1].week,'AV and LV editions belong to different weeks');
assert.notEqual(editions[0].url,editions[1].url,'AV and LV resolved to the same publication');
console.log('Verified distinct Citymarket editions',editions);
