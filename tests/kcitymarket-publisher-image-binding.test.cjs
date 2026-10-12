const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const base=path.resolve('src/app/components/ziiply/offerSearch/providers');
const entry='https://kcm-tarjouslehdet.k-ruoka.fi/83z6h5o_tarjouslehti_42AV_KCM/index.html';
test('Actual provider preserves original PDF card identities through title cleanup',async()=>{
 const modules={
  './kCitymarketSpatialParser.js':await import(path.join(base,'kCitymarketSpatialParser.js')),
  './kCitymarketProductRows.js':await import(path.join(base,'kCitymarketProductRows.js')),
  './kCitymarket42AVTitleCleanup.js':await import(path.join(base,'kCitymarket42AVTitleCleanup.js')),
  'next/cache':{unstable_cache:fn=>fn},
  '@neondatabase/serverless':{neon:()=>{throw Error('No database allowed in frozen replay');}},
  './kCitymarketPublisherImages':{}
 };
 const source=fs.readFileSync(path.join(base,'kCitymarketProvider.ts'),'utf8')
  .replace('async function fetchKCitymarketOffersFresh(', 'export async function fetchKCitymarketOffersFresh(');
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2021,module:ts.ModuleKind.CommonJS}}).outputText;
 const mod={exports:{}};
 new Function('require','module','exports',js)(name=>{assert.ok(modules[name],name);return modules[name]},mod,mod.exports);
 const offers=await mod.exports.fetchKCitymarketOffersFresh(entry);
 const priced=offers.filter(p=>p.price>0);
 const registry=JSON.parse(fs.readFileSync(path.join(base,'data/kCitymarketLeafletImages.json'),'utf8')).publications[entry];
 assert.equal(Object.keys(registry.images).length,88);
 assert.equal(priced.length,80);
 const pictured=priced.filter(p=>registry.images[p.id]||registry.images[p.publisherOfferId]);
 assert.equal(pictured.length,79);
 const corrected=[[/^MAALAISNAKIT/,2.99,null],[/^CLASSIC 50/,10,null],[/^iKAFFE/,9,6]];
 for(const [pattern,price,quantity] of corrected){
  const row=priced.find(p=>pattern.test(p.title));assert.ok(row);
  assert.equal(row.price,price);assert.equal(row.offerQuantity,quantity);
  assert.ok(registry.images[row.publisherOfferId],'Corrected price retains the reviewed PDF picture');
 }
 const fish=priced.find(p=>p.title==='KIRJOLOHI');
 assert.equal(fish.validTo,'14.10.');assert.equal(fish.price,6.99);
 assert.equal(priced.find(p=>/^BONBONS/.test(p.title)).category,'Pakasteet');

 // Execute the mobile card's production formatter with the actual provider
 // result nested exactly as in the uploaded mobile debug. No UI price patches.
 const card=fs.readFileSync('src/app/components/ziiply/cards/ZiiplyMobileOfferSearchCard.tsx','utf8');
 const extract=(start,end)=>{const a=card.indexOf(start),b=card.indexOf(end,a);assert.ok(a>=0&&b>a);return card.slice(a,b);};
 const formatter=extract('function normalizePrice(price: unknown) {','function getNumericPrice')
   +extract('function getOfferPrice(offer: ZiiplyMobileOfferSearchItem) {','function splitOfferDisplayPrice(value: string) {');
 const displayJs=ts.transpileModule(formatter,{compilerOptions:{target:ts.ScriptTarget.ES2021}}).outputText;
 const display=new Function(displayJs+'; return getOfferPrice;')();
 for(const [pattern,expected] of [[/^MAALAISNAKIT/,'2,99 €'],[/^CLASSIC 50/,'10,00 €'],[/^iKAFFE/,'9,00 € / 6 TLK']]){
   const row=priced.find(p=>pattern.test(p.title));
   assert.equal(display({price:row.price,__sourceOfferSearchResult:row}),expected);
 }

 assert.equal(priced.filter(p=>/WC-GEELIT/.test(p.title)).length,1);
 assert.ok(priced.find(p=>/^DOMESTOS/.test(p.title)));
 const pasta=priced.find(p=>p.title==='PASTAT 500 g (3,50/kg)');
 assert.ok(pasta);
 assert.equal(pasta.price,3.5);
 assert.equal(pasta.offerQuantity,2);
 assert.match(pasta.publisherOfferId,/:5\. pastat /);
 assert.ok(registry.images[pasta.publisherOfferId]);
});
