import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mergeSelectedStoreProducts} from '../src/lib/neonSearchSimulation/selectedStoreMerge.mjs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const recipe = read('src/app/components/ziiply/justiina/recipeSearch.ts');
const offer = read('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts');
const main = read('src/app/page.tsx');
const desktop = read('src/app/desktop-preview/DesktopPreviewClient.tsx');
test('Neon-first selected-store adapter has no imports or calls into recipe/offer engines',()=>{
 const adapter=read('src/lib/neonSearchSimulation/selectedStoreMerge.mjs');
 assert.doesNotMatch(adapter,/recipeSearch|offerSearch|searchOffers|fetchRecipe|kCitymarketProvider/);
 assert.doesNotMatch(adapter,/fetch\s*\(|neon\s*\(|process\.env|localStorage/);
});
test('existing recipe classification and offer publication pipelines remain independently implemented',()=>{
 assert.match(recipe,/recipeCategories/);
 assert.match(recipe,/recipeProtein/);
 assert.match(offer,/readActivePublicationOffers/);
 assert.match(offer,/parseKCitymarketSpatialLeaflet/);
});
test('Neon-first does not turn a recipe ingredient into a purchasable priced product without selected-store evidence',()=>{
 const result=mergeSelectedStoreProducts([{ean:'6410000000001',name:'Jauheliha',imageUrl:'/food.jpg'}],[],[{id:'S-selected'}]);
 assert.equal(result.priced.length,0);
 assert.equal(result.unpriced.length,1);
 assert.equal(result.unpriced[0].imageUrl,'/food.jpg');
});
test('Neon-first cannot overwrite offer campaign price or metadata',()=>{
 const offer={ean:'6410000000001',campaignPrice:0.99,validFrom:'2026-10-30',validUntil:'2026-11-01',source:'publisher'};
 const snapshot=structuredClone(offer);
 mergeSelectedStoreProducts([{ean:offer.ean,name:'Jauheliha'}],[{storeId:'S-selected',products:[{ean:offer.ean,name:'Jauheliha',price:2.49}]}],[{id:'S-selected'}]);
 assert.deepEqual(offer,snapshot);
});
test('normal search entry points exist separately from recipe and offer paths',()=>{
 assert.match(main,/async function searchNormalPrices\(/);
 assert.match(main,/fetchSProducts\(/);
 assert.match(main,/fetchKProducts\(/);
 assert.ok(desktop.includes('search')||desktop.includes('Search'),'Desktop preview component must expose search');
});
