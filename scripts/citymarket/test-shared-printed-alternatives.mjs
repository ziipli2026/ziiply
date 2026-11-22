import assert from 'node:assert/strict';
import {mergeVerifiedSharedPrintedAlternatives} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js';

const glyphs=[
 {text:'3',left:.1592,top:.5714,width:.0571,height:.1240},
 {text:'49',left:.2141,top:.5878,width:.0652,height:.0642},
 {text:'PL',left:.2378,top:.6479,width:.0139,height:.0120},
];
const rows=[
 {page:3,title:'EXAMPLE FULL JUICE 900 ml/pl tai',
  imageAnchor:{left:.159161,top:.552964,width:.1332,height:.013773},
  package:{min:.9,max:.9,raw:'900 ml'},
  spatialResolved:{value:3.05,source:'same-card-box-unitrate-derived'},
  debugNearbyBoxes:glyphs,nearby:['EXAMPLE FULL JUICE 900 ml/pl tai']},
 {page:3,title:'EXAMPLE SMOOTHIE 750 ml/pl',
  imageAnchor:{left:.159161,top:.564562,width:.1128,height:.013773},
  package:{min:.75,max:.75,raw:'750 ml'},
  spatialResolved:{value:2.54,source:'same-card-box-unitrate-derived'},
  debugNearbyBoxes:glyphs,nearby:['EXAMPLE SMOOTHIE 750 ml/pl']},
];
const matched=mergeVerifiedSharedPrintedAlternatives(structuredClone(rows));
assert.equal(matched.length,1,'Single printed campaign becomes one offer, not two inferred prices');
assert.equal(matched[0].spatialResolved.value,3.49,'Price must come from printed 3 and 49 glyphs');
assert.equal(matched[0].spatialResolved.confidence,'high');
assert.deepEqual(matched[0].package.variantSizes,['900 ml','750 ml']);
assert.equal(matched[0].title,'EXAMPLE FULL JUICE 900 ml/pl tai EXAMPLE SMOOTHIE 750 ml/pl');
const noCents=structuredClone(rows);
noCents.forEach(r=>r.debugNearbyBoxes=r.debugNearbyBoxes.filter(g=>g.text!=='49'));
assert.equal(mergeVerifiedSharedPrintedAlternatives(noCents).length,2,
  'Never merge when the publisher cents are missing');
const wrongColumn=structuredClone(rows);
wrongColumn[1].imageAnchor.left+=.1;
assert.equal(mergeVerifiedSharedPrintedAlternatives(wrongColumn).length,2,
  'Never merge offers from different publisher columns');
console.log('Citymarket verified shared printed-card price regression passed');
