import test from 'node:test';
import assert from 'node:assert/strict';
import {partitionDailyGroceryOffers} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketDailyGroceryGate.js';
test('keep food and everyday consumables, quarantine home goods and unknowns',()=>{
 const rows=[{title:'Maito 1 l',category:'Maitotuotteet'},{title:'Shampoo',category:'Hygienia & kosmetiikka'},{title:'Pesuaine',category:'Kodinhoito'},{title:'Valosarja',category:'Koti & vapaa-aika'},{title:'Tuntematon',category:'Muut'},{title:'?',category:'Uusi luokka'}];
 const {accepted,quarantined}=partitionDailyGroceryOffers(rows);
 assert.deepEqual(accepted.map(x=>x.title),['Maito 1 l','Shampoo','Pesuaine']);
 assert.deepEqual(quarantined.map(x=>x.reason),['not-daily-grocery','not-daily-grocery','unrecognized-category']);
});
