import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const approvals=JSON.parse(fs.readFileSync('scripts/citymarket/41lv-verified-bank-images.json','utf8'));
const verified=new Map(approvals.images.map(image=>[image.offerId,image]));
const manifest=JSON.parse(fs.readFileSync('src/app/components/ziiply/offerSearch/providers/data/kCitymarketLeafletImages.json','utf8'));
for(const [leaflet,publication] of Object.entries(manifest.publications)){
 assert.equal(new URL(leaflet).hostname,'kcm-tarjouslehdet.k-ruoka.fi');
 assert.match(publication.pdfSha256,/^[a-f0-9]{64}$/);
 assert.ok(Object.keys(publication.images).length<=publication.offerCount);
 for(const [id,url] of Object.entries(publication.images)){
  assert.match(id,/^kcm:spatial:\d+:/);
  if(!url.includes('/images.svg#')){
   const proof=verified.get(id);
   assert.equal(publication.pdfSha256,approvals.leafletSha256);
   assert.ok(proof?.approved && proof.imageFetchedAndViewed);
   assert.equal(url,proof.imageUrl);
   assert.ok(proof.leafletVisualMatch || (proof.printedIdentityVerified && proof.sourceIdentityVerified && /^https:\/\//.test(proof.sourceUrl)));
   if(url.startsWith('/')){
    assert.match(url,new RegExp('^/citymarket-leaflets/'+publication.pdfSha256+'/verified-group-[0-9]+\\.png$'));
    const bytes=fs.readFileSync('public'+url);
    assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),proof.assetSha256);
    assert.equal(proof.sourcePdfSha256,publication.pdfSha256);
   }else{
    const parsed=new URL(url);
    assert.equal(parsed.protocol,'https:');
    assert.ok(!parsed.username && !parsed.password);
   }
   continue;
  }
  assert.match(url,new RegExp('^/citymarket-leaflets/'+publication.pdfSha256+'/images\\.svg#[a-f0-9]{20}$'));
  const [file,fragment]=url.slice(1).split('#');
  const svg=fs.readFileSync('public/'+file,'utf8');
  assert.ok(svg.includes('<view id="'+fragment+'" viewBox="0 '));
  assert.ok(!/<script|onload=|onclick=|https?:\/\//i.test(svg.replace('http://www.w3.org/2000/svg','')));
 }
 console.log(leaflet,Object.keys(publication.images).length+'/'+publication.offerCount,'verified image links');
}
