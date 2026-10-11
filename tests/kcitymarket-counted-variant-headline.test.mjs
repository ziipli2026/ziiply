import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {restoreCountedVariantHeadline as restore,canonicalCitymarketProductRows} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/citymarket/counted-variant-headline.json',import.meta.url)));
test('All printed tablet variants share the original transaction without treating contents as offer quantities',()=>{
 const out=restore(fixture);assert.match(out.title,/42 tab\/ps ULTIMATE PLUS 20 tab\/ps ULTIMATE 35 tab\/ps/);assert.match(out.title,/3 kpl\/pkt tai KONETISKIGEELI 650 ml$/);
 assert.deepEqual(out.spatialResolved,fixture.spatialResolved);assert.equal(out.spatialResolved.value,10);assert.equal(out.spatialResolved.quantity,2);
 assert.equal(out.package,null);assert.equal(out.unitPrice,null);assert.equal(out.productRowProof.titles[0],fixture.title);
 assert.equal(canonicalCitymarketProductRows([fixture])[0].title,out.title);
});
test('Different columns, fonts and disconnected lines cannot extend an offer headline',()=>{
 for(const change of ['column','font','gap']){const r=structuredClone(fixture);for(const b of r.debugNearbyBoxes){if(b.top<r.debugCardAnchor.top-.005&&b.height>.015){if(change==='column')b.left+=.4;if(change==='font')b.height=.03;if(change==='gap')b.top-=.1;}}
 assert.equal(restore(r).title,r.title,change);}
});
test('An independently priced preceding product prevents group ownership',()=>{
 const other={page:fixture.page,debugCardAnchor:{left:fixture.debugCardAnchor.left,top:.28442},spatialResolved:{value:4,quantity:1}};
 assert.equal(restore(fixture,[fixture,other]).title,fixture.title);
});
test('Single package or missing transaction remains unchanged and inputs are immutable',()=>{
 const before=JSON.stringify(fixture);restore(fixture);assert.equal(JSON.stringify(fixture),before);
 for(const r of [{...fixture,spatialResolved:null},{...fixture,title:'KONETISKIGEELI 650 ml'},{...fixture,spatialResolved:{value:10,quantity:1}}])assert.deepEqual(restore(r),r);
});
