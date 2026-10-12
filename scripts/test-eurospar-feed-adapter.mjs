import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/eurosparProvider.ts','utf8')
  .replace('import bundledFeed from "./eurospar-feed.json";','const bundledFeed = {};');
const {adaptEurosparFeed}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const feed=JSON.parse(fs.readFileSync('src/app/components/ziiply/offerSearch/providers/eurospar-feed.json','utf8'));
const rows=adaptEurosparFeed(feed,'Tokmanni-EUROSPAR Järvenpää',feed.validity.from);
assert.equal(rows.length,feed.offers.length);
assert.equal(adaptEurosparFeed(feed,'Hyvinkää',feed.validity.from).length,0);
assert.equal(adaptEurosparFeed(feed,'Järvenpää','2000-01-01').length,0);
assert.equal(adaptEurosparFeed(feed,'Järvenpää','2100-01-01').length,0);
for(const row of rows){
 assert.equal(row.eans.length,0);
 if(row.priceBasis==='multi-buy-total') assert.equal(row.singleEquivalentPrice,Number((row.price/row.offerQuantity).toFixed(4)));
 if(row.priceBasis==='per-kg'){assert.equal(row.isWeightedProduct,true);assert.equal(row.offerUnit,'kg');}
}
console.log('PASS EUROSPAR adapter:',rows.length,'offers, store/date gates, multi-buy and kg prices');

const expectedBundles=[
 ['arla juustoviipaleet',5.98,'5,98'],
 ['hillomunkki',3.30,'3,30'],
 ['fazer marjapiirakka',4.58,'4,58'],
 ['hk uunilenkki',3.18,'3,18'],
 ['vaasan munariisi',null,'2,25–2,67'],
 ['valio profeel',null,'5,76–5,96'],
];
const card=fs.readFileSync('src/app/components/ziiply/cards/ZiiplyMobileOfferSearchCard.tsx','utf8');
const start=card.indexOf('function getNormalPrice(');
const end=card.indexOf('\n}',start)+2;
assert.ok(start>=0&&end>start);
const formatterSource=stripTypeScriptTypes(card.slice(start,end));
const formatNormal=new Function('normalizePrice',formatterSource+'; return getNormalPrice;')(v=>v==null?'':String(v));
for(const [prefix,normalPrice,text] of expectedBundles){
 const row=rows.find(r=>r.title.startsWith(prefix));assert.ok(row,prefix);
 assert.equal(row.normalPrice,normalPrice,prefix);
 assert.equal(row.normalPriceText,text,prefix);
 assert.equal(row.normalPriceBasis,'multi-buy-total');
 assert.equal(formatNormal({__sourceOfferSearchResult:row}),`${text} € / ${row.offerQuantity} ${row.offerUnit}`);
 const raw=feed.offers.find(r=>r.id===row.id);
 assert.equal(row.price,raw.offerPrice,'Offer total must not change');
}
// Old cached provider rows still carry a per-item reference and retain its label.
assert.equal(formatNormal({__sourceOfferSearchResult:{chain:'EUROSPAR',priceBasis:'multi-buy-total',offerQuantity:2,offerUnit:'pkt',normalPriceText:'2,99'}}),'2,99 €/pkt');
for(const row of rows.filter(r=>r.priceBasis!=='multi-buy-total')){
 const raw=feed.offers.find(r=>r.id===row.id);
 assert.equal(row.normalPriceText,raw.normalPrice);
}
const bundle=feed.offers.find(r=>r.multiUnit);
for(const patch of [{normalPrice:null},{normalPrice:'2,00',normalUnit:'kg'},{normalPrice:'2,00',normalUnit:'l'}]){
 const [row]=adaptEurosparFeed({...feed,offers:[{...bundle,...patch}]},'Järvenpää',feed.validity.from);
 assert.equal(row.normalPrice,null);assert.equal(row.normalPriceText,null);
}
console.log('PASS EUROSPAR normal-price totals, ranges, actual mobile display and legacy cache compatibility');
