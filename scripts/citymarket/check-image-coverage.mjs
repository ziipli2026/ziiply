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
 const missingOffers=leaflet.rows.filter(row=>missing.includes(row.id)).map(row=>({id:row.id,title:row.title,page:row.page}));
 fs.writeFileSync(file.replace(/leaflet\.json$/,'missing-image-offers.json'),JSON.stringify({leaflet:leaflet.leaflet,pdfSha256:leaflet.pdfSha256,missingOffers},null,2)+'\n');
 const unknown=[...available].filter(id=>!expected.has(id));
 assert.equal(unknown.length,0,'Manifest includes images not belonging to current leaflet');
 console.log('CITYMARKET_IMAGE_COVERAGE',JSON.stringify({leaflet:leaflet.leaflet,total:expected.size,images:available.size,missing:missing.length,missingOffers}));
 if(missing.length)console.error('::error::Citymarket image extraction incomplete: '+missing.length+' missing from '+leaflet.leaflet);
 missingTotal+=missing.length;
}
assert.equal(missingTotal,0,'Incomplete Citymarket image extraction must not publish');
