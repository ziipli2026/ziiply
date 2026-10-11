import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {canonicalCitymarketProductRows as canonical} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js';
const rows=JSON.parse(fs.readFileSync(new URL('./fixtures/citymarket/product-row-continuations.json',import.meta.url)));
test('Aligned continuation restores product and package without changing price',()=>{const r=canonical(rows);assert.equal(r.length,3);const a=r.find(x=>x.title.startsWith('ACTIMEL'));assert.equal(a.title,'ACTIMEL JOGURTTI-JUOMAT 8 x 100 g');assert.equal(a.package.min,.8);assert.equal(a.spatialResolved.value,3.69);assert.equal(r.find(x=>x.title.startsWith('SININEN')).spatialResolved.quantity,4);assert.ok(r.some(x=>x.title==='KANATUOTTEET 170–250 g'));});
test('Different price cannot merge adjacent product lines',()=>{const r=structuredClone(rows.slice(0,2));r[1].spatialResolved.value=8;assert.equal(canonical(r).length,2);});
test('Other column cannot merge adjacent product lines',()=>{const r=structuredClone(rows.slice(0,2));r[1].debugCardAnchor.left+=.1;assert.equal(canonical(r).length,2);});
test('Input source evidence is unchanged',()=>{const before=JSON.stringify(rows);canonical(rows);assert.equal(JSON.stringify(rows),before);});
test('Price glyphs do not become product title numbers',()=>{const f=JSON.parse(fs.readFileSync(new URL('./fixtures/citymarket/product-title-glyphs.json',import.meta.url)));const r=canonical(f);assert.ok(r.some(x=>x.title==='PROTEIINI-PIRTELÖT 200 ml'));assert.ok(r.some(x=>x.title==='Juustoportti LEIPÄJUUSTO 140 g'));for(const x of r)assert.equal(x.spatialResolved.value,f.find(y=>y.page===x.page).spatialResolved.value);});
test('Combined variant card preserves all printed sizes',()=>{const r=canonical(rows).find(x=>x.title.startsWith('SININEN'));assert.equal(r.package.raw,'180 g / 160–200 g');assert.equal(r.package.min,.16);assert.equal(r.package.max,.2);});
test('Mixed set discount cannot be assigned to one component',async()=>{const {rejectUnownedMixedSetPercentage:reject}=await import('../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js');const row={title:'PAPER 40 rolls',nearby:['YHTEIS-','ja HINTAAN Emilia','SETTI'],spatialResolved:null,percentageOffer:{percent:42}};assert.equal(reject(row).percentageOffer,null);assert.equal(row.percentageOffer.percent,42);assert.equal(reject({...row,nearby:['Single product discount']}).percentageOffer.percent,42);assert.equal(reject({...row,spatialResolved:{value:24.9}}).percentageOffer.percent,42);});

test('Owned transaction metadata preserves kilogram basis and printed deposit without inferring neighbour text',async()=>{
 const {citymarketTransactionMetadata}=await import('../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js');
 assert.deepEqual(citymarketTransactionMetadata({spatialResolved:{unit:'KG'}}),{priceBasis:'PER_KG'});
 assert.deepEqual(citymarketTransactionMetadata({spatialResolved:{unit:'PKT',packageCount:24,depositTotal:2.4,source:'owned-proof'}}),{packageCount:24,depositTotal:2.4,depositIncluded:true,depositSource:'owned-proof'});
 assert.deepEqual(citymarketTransactionMetadata({nearby:['Sis. pantit 2,40'],spatialResolved:{value:4,quantity:2}}),{});
 assert.deepEqual(citymarketTransactionMetadata({spatialResolved:{depositTotal:-1,packageCount:1}}),{});
});
