import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedOwnedPublisherOverprint} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketOwnedPublisherOverprints.js';

test('overprinted percent cannot combine roll count with normal price',()=>{
 const wc={
  title:'WC-PAPERI 24 rl',
  debugCardAnchor:{left:.868584,top:.378832},
  nearby:['0,29/rl rl','9,99/pkt'],
  debugNearbyBoxes:[
   {text:'6-30%',left:.669949,top:.316847,width:.099266,height:.115175},
   {text:'90',left:.718549,top:.346321,width:.054316,height:.052192},
   {text:'24',left:.939988,top:.378832,width:.016283,height:.016527}
  ],
  spatialResolved:{value:9.24,source:'best-spatial-candidate'}
 };
 assert.equal(verifiedOwnedPublisherOverprint(wc)?.value,6.9);
 assert.equal(verifiedOwnedPublisherOverprint({...wc,nearby:['9,99/pkt'] }),null);
 assert.equal(verifiedOwnedPublisherOverprint({...wc,debugCardAnchor:{left:.30,top:.38}}),null);
});

test('printed multibuy total wins over calculated individual drink price',()=>{
 const row={
  title:'VIRVOITUSJUOMAT 0,33 l/tlk 6-pack',
  debugCardAnchor:{left:.393701,top:.859750},
  debugCardPrice:{value:10,anchor:{left:.415748,top:.749495}},
  nearby:['10.-(1,23/l) Sis. pantit','3x6','-PACK'],
  spatialResolved:{value:.72,source:'same-row-expected-single-safe'}
 };
 assert.deepEqual([verifiedOwnedPublisherOverprint(row)?.value,verifiedOwnedPublisherOverprint(row)?.quantity],[10,3]);
 assert.equal(verifiedOwnedPublisherOverprint({...row,nearby:['10.-','2x4']}),null);
});

test('complete same-card euro and cents override unverified normal-rate arithmetic',()=>{
 const row={
  title:'MAINIO KIOVAN KANA ja MUUSI 320 g',
  debugCardAnchor:{left:.830113,top:.573183},
  expectedSingle:5.15,
  spatialResolved:{value:5.15,source:'large-cents-expected-visual'},
  debugCardPrice:{value:2.15,unit:'RS',anchor:{left:.8290307,top:.591574},
   parts:[{text:'2'},{text:'15'}]}
 };
 assert.equal(verifiedOwnedPublisherOverprint(row)?.value,2.15);
 assert.equal(verifiedOwnedPublisherOverprint({...row,debugCardPrice:{...row.debugCardPrice,value:5.15}}),null);
 assert.equal(verifiedOwnedPublisherOverprint({...row,debugCardPrice:{...row.debugCardPrice,anchor:{left:.3,top:.59}}}),null);
});
