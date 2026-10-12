const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const base='src/app/components/ziiply/offerSearch/providers/';
const archive=JSON.parse(fs.readFileSync(base+'data/kCitymarket41LVLocalPublisherArchive.json'));
const categorySource=fs.readFileSync(base+'kCitymarketProvider.ts','utf8').match(/export function category\(t:string\)\{[\s\S]*?\n\}\nfunction isNoiseLine/)[0].replace('export function category(t:string)','function category(t)').replace(/\nfunction isNoiseLine$/,'');
const categoryContext={clean:s=>String(s).trim()};vm.runInNewContext(categorySource+'\nthis.classify=category;',categoryContext);
const tx={exports:{}};vm.runInNewContext(ts.transpile(fs.readFileSync(base+'kCitymarketPackageTransaction.ts','utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}),tx);
function load(env,now=Date.now()){
 let requests=0;class Clock extends Date{static now(){return now}}
 const m={exports:{}},context={exports:m.exports,module:m,Date:Clock,Buffer,process:{env},AbortSignal,
 fetch:async()=>{requests++;throw new Error('Unexpected live source');},
 require:name=>{if(name==='./kCitymarketProvider')return {category:categoryContext.classify};if(name==='./kCitymarketPackageTransaction')return tx.exports;if(name==='./data/kCitymarket41LVLocalPublisherArchive.json')return {default:archive};throw Error(name);}};
 vm.runInNewContext(ts.transpile(fs.readFileSync(base+'kCitymarketLocalTjekProvider.ts','utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}),context);
 return {fetch:m.exports.fetchKCitymarketSelectedStoreOffers,requests:()=>requests};
}
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'preview/mobile-citymarket-41lv-corrected'};
test('41LV preview local publication is immutable across midnight and later dates, without any live request',async()=>{
 const a=load(env,Date.parse('2026-10-11T10:00:00Z')),b=load(env,Date.parse('2026-10-12T10:00:00Z')),c=load(env,Date.parse('2030-01-01'));
 const rows=await a.fetch(archive.storeName);assert.ok(rows.length>0);
 assert.equal(JSON.stringify(await b.fetch(archive.storeName)),JSON.stringify(rows));assert.equal(JSON.stringify(await c.fetch(archive.storeName)),JSON.stringify(rows));assert.equal(a.requests()+b.requests()+c.requests(),0);
 assert.ok(rows.every(r=>r.debug.publicationId===archive.publicationId&&r.storeId===archive.storeId));
});
test('Archived Hyvinkää publication cannot fall back to another selected store',async()=>{const m=load(env);assert.equal((await m.fetch('K-Citymarket Vantaa Jumbo')).length,0);assert.equal(m.requests(),0);});
test('Production and other preview branches keep their live selected-store path',async()=>{
 for(const e of [{...env,VERCEL_ENV:'production'},{...env,VERCEL_GIT_COMMIT_REF:'another-preview'}]){const m=load(e);await assert.rejects(m.fetch(archive.storeName),/Unexpected live source/);assert.equal(m.requests(),1);}
});
test('All archived offer payloads belong to the original publication and have source pages',()=>{
 const ids=new Set(Object.values(archive.pages).flatMap(p=>p.hotspots.map(h=>h.offer?.id).filter(Boolean)));
 assert.ok(archive.offers.length>0);for(const {id,offer} of archive.offers){assert.ok(ids.has(id)||(archive.supplementalOfferIds||[]).includes(id));assert.equal(offer.publicationPublicId,archive.publicationId);}
});
test('Expired structured offers recover only from inspected, archived printed cards',async()=>{
 const rows=await load(env).fetch(archive.storeName);
 const expected=[['jEiQJbpBBkKZ9hb-90qm4',.99,null,'KG'],['xQ_GMgNjttZCVgLrp4BU5',10,3,'PKT'],['pCX3kBx90u0BhPsbdQiys',25,4,'PKT'],['7pvt5_v_-IObJY2tR35D-',2.99,null,'KG'],['Hr1If-kCatucapUwcAvps',12.99,null,'KG'],['NlOph3PX7hCkNerLkfc7d',2.99,null,'KPL'],['XAbjcA8QRWJKfwjfaaGzB',2.29,null,'PS'],['dQmSWHX9wTI_gcDU0kQ8C',2.99,null,'RS'],['nvpTXq9JDTFOlxYX6GvSj',4,2,'RS']];
 for(const [id,price,quantity,unit] of expected){const row=rows.find(r=>r.offerId===id);assert.ok(row,id);assert.equal(row.price,price,id);assert.equal(row.offerQuantity,quantity,id);assert.equal(row.offerUnit,unit,id);assert.equal(row.debug.printedSource.method,'VISUALLY_VERIFIED_PRINTED_CARD_TRANSCRIPTION');if(unit==='KG'){assert.equal(row.priceBasis,'PER_KG');assert.match(row.priceText,/€ \/ kg$/);}}
});
test('Printed-source evidence remains immutable and content counts never become multibuy counts',async()=>{
 const crypto=require('node:crypto');for(const entry of archive.offers.filter(x=>x.printedSource)){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(entry.printedSource.archivePath)).digest('hex'),entry.printedSource.sha256);}
 const rows=await load(env).fetch(archive.storeName);const buns=rows.find(r=>r.offerId==='XAbjcA8QRWJKfwjfaaGzB');assert.equal(buns.offerQuantity,null);assert.match(buns.title,/5 kpl\/325 g/);assert.equal(buns.price,2.29);assert.equal(buns.unitPrice,"");assert.equal(buns.resolutionSanity,"review");assert.equal(buns.debug.printedSource.unitPriceReview.printedUnitPrice,8.33);
});
