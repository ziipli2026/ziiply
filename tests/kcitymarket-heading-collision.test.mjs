import test from 'node:test';
import assert from 'node:assert/strict';
import {flagMergedPublisherHeadings} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketPublisherHeadingCollision.js';
test('flag joined independent daily grocery headings without issue-specific names',()=>{
 const rows=[{page:5,title:'KOTIMAINEN TOMAATTI KG KURKKU KG'},{page:5,title:'KOTIMAINEN TOMAATTI KG'},{page:5,title:'KURKKU KG'},{page:6,title:'MAITO 1 L'}];
 // One-token headings are insufficient evidence: do not invent card boundaries.
 assert.equal(flagMergedPublisherHeadings(rows)[0].debugSuspiciousPublisherTitle,undefined);
 const strong=[{page:5,title:'JOGURTTIJUOMAT PROTEIN RAHKAT 200 g 8 x 100 g'},{page:5,title:'JOGURTTIJUOMAT 8 x 100 g'},{page:5,title:'PROTEIN RAHKAT 200 g'}];
 assert.equal(flagMergedPublisherHeadings(strong)[0].debugSuspiciousPublisherTitle?.reason,'merged-publisher-product-headings');
});
test('keep a single product and different pages unchanged',()=>{
 const rows=[{page:1,title:'KOTIMAINEN PERUNA 1 kg'},{page:2,title:'KOTIMAINEN PORKKANA 1 kg'}];
 assert.ok(flagMergedPublisherHeadings(rows).every(x=>!x.debugSuspiciousPublisherTitle));
});
