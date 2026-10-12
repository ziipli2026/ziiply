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
