import test from 'node:test';import assert from 'node:assert/strict';
import {resolveExplicitTitleMultibuy as resolve} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js';
test('Own printed multibuy removes a neighbouring percentage without inventing a new one',()=>{
 const r=resolve({title:'Lotus Nessu NENÄLIINA 100 kpl Valkoinen Plussa-kortilla 4,00/2 pkt Ilman Plussa-korttia 2,19/pkt',price:null,discountPercent:42,benefitText:'–42 %',campaignType:'campaign'});
 assert.equal(r.title,'Lotus Nessu NENÄLIINA 100 kpl Valkoinen');assert.equal(r.price,4);assert.equal(r.offerQuantity,2);assert.equal(r.offerUnit,'PKT');assert.equal(r.campaignType,'offer');assert.equal(r.discountPercent,undefined);assert.equal(r.benefitText,undefined);
});
test('Unambiguous alternate product transactions use the same general rule',()=>{
 const r=resolve({title:'TUOTE Plussa-kortilla 5,00/3 kpl',price:null,campaignType:'campaign',discountPercent:40});assert.equal(r.price,5);assert.equal(r.offerQuantity,3);assert.equal(r.title,'TUOTE');assert.equal(r.discountPercent,undefined);
});
test('Ambiguous totals, content counts and ordinary unit prices cannot establish a multibuy',()=>{
 for(const title of ['TUOTE 8-pack','TUOTE 2,19/pkt','TUOTE 4,00/2 pkt tai 5,00/3 pkt','TUOTE 4,00/1 pkt','TUOTE 4,00/30 pkt']){const r={title,price:null,discountPercent:42,campaignType:'campaign'};assert.equal(resolve(r),r);}
});
test('A priced transaction keeps existing campaign and percentage metadata',()=>{
 const r=resolve({title:'TUOTE 5,00/3 kpl',price:5,discountPercent:20,campaignType:'campaign'});assert.equal(r.campaignType,'campaign');assert.equal(r.discountPercent,20);
});
