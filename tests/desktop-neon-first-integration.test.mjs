import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const desktop=readFileSync(new URL('../src/app/desktop-preview/DesktopPreviewClient.tsx',import.meta.url),'utf8');
const route=readFileSync(new URL('../src/app/api/neon-first-search/route.ts',import.meta.url),'utf8');
const normal=desktop.slice(desktop.indexOf('  async function runDesktopNormalSearch('),desktop.indexOf('  async function runDesktopJustiinaSearch('));
test('desktop normal search starts read-only Neon lookup and both selected store providers',()=>{
 assert.match(normal,/fetch\("\/api\/neon-first-search\?q="/);
 assert.match(normal,/\/api\/s-products\?search=/);
 assert.match(normal,/\/api\/k-products\?search=/);
 assert.match(route,/readOnly: true/);
});
test('Neon catalog results are unpriced and never substituted for selected-store prices',()=>{
 assert.match(normal,/__price:null,__priceSource:"neon-catalog-unpriced"/);
 assert.match(normal,/selectedStoreEans/);
 assert.match(normal,/neonOnly/);
 assert.match(normal,/setJustiinaResults\(neonRows\)/);
 assert.match(normal,/setJustiinaResults\(sortedRows\)/);
});
test('EAN canonicalization uses non-digit regex and avoids empty-EAN collision',()=>{
 assert.match(normal,/replace\(\/\\D\/g,""\)/);
 assert.match(normal,/\.filter\(Boolean\)/);
 assert.doesNotMatch(normal,/replace\(\/\\\\D\/g/);
});
test('recipe-specific and offer engines are not invoked from normal product search',()=>{
 assert.doesNotMatch(normal,/recipeProductCompatible|recipeProductRejectionReason|searchZiiplyGostaOffersV146/);
 assert.match(desktop,/async function runDesktopJustiinaSearch/);
 assert.match(desktop,/searchZiiplyGostaOffersV146/);
});
