import fs from 'node:fs';
import assert from 'node:assert/strict';
const manifest=JSON.parse(fs.readFileSync('src/app/components/ziiply/offerSearch/providers/data/kCitymarketLeafletImages.json','utf8'));
for(const [leaflet,publication] of Object.entries(manifest.publications)){
 assert.equal(new URL(leaflet).hostname,'kcm-tarjouslehdet.k-ruoka.fi');
 assert.match(publication.pdfSha256,/^[a-f0-9]{64}$/);
 assert.ok(Object.keys(publication.images).length<=publication.offerCount);
 for(const [id,url] of Object.entries(publication.images)){
  assert.match(id,/^kcm:spatial:\d+:/);
  assert.match(url,new RegExp('^/citymarket-leaflets/'+publication.pdfSha256+'/images\\.svg#[a-f0-9]{20}$'));
  const [file,fragment]=url.slice(1).split('#');
  const svg=fs.readFileSync('public/'+file,'utf8');
  assert.ok(svg.includes('<view id="'+fragment+'" viewBox="0 '));
  assert.ok(!/<script|onload=|onclick=|https?:\/\//i.test(svg.replace('http://www.w3.org/2000/svg','')));
 }
 console.log(leaflet,Object.keys(publication.images).length+'/'+publication.offerCount,'verified image links');
}
