import fs from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(fs.readFileSync('src/app/components/ziiply/offerSearch/providers/data/kCitymarketLeafletImages.json','utf8'));
const paths=process.argv.slice(2);
assert.ok(paths.length>0,'Provide extracted leaflet metadata paths');
let missingTotal=0;
for(const file of paths){
 const leaflet=JSON.parse(fs.readFileSync(file,'utf8'));
 const publication=manifest.publications[leaflet.leaflet];
 assert.ok(publication,'No image manifest for '+leaflet.leaflet);
 assert.equal(publication.pdfSha256,leaflet.pdfSha256,'PDF digest mismatch: '+leaflet.leaflet);
 const expected=new Set(leaflet.rows.map(row=>row.id));
 const available=new Set(Object.keys(publication.images));
 const missing=[...expected].filter(id=>!available.has(id));
 const unknown=[...available].filter(id=>!expected.has(id));
 assert.equal(unknown.length,0,'Manifest includes images not belonging to current leaflet');
 console.log('CITYMARKET_IMAGE_COVERAGE',JSON.stringify({leaflet:leaflet.leaflet,total:expected.size,images:available.size,missing:missing.length,missingIds:missing.slice(0,20)}));
 if(missing.length)console.error('::error::Citymarket image extraction incomplete: '+missing.length+' missing from '+leaflet.leaflet);
 missingTotal+=missing.length;
}
assert.equal(missingTotal,0,'Incomplete Citymarket image extraction must not publish');
