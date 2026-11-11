import assert from 'node:assert/strict';
import {recoverWrappedPercentageCards} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js';

// Publisher glyph coordinates model two real-world failure modes: an
// uppercase brand line detached from "-TUOTTEET", and a duplicate last
// line from an already parsed multi-line discount offer.
const glyph=(text,left,top,width,height=.013773)=>({text,left,top,width,height});
const boxes=[
 glyph('DR',.8611,.6453,.0142),
 glyph('JACKSON',.8822,.6453,.0475),
 glyph('-TUOTTEET',.866778,.656871,.057283),
 glyph('-15%',.8518,.6886,.0861,.0551),
 glyph('LUMENE',.451382,.659124,.041369),
 glyph('MEIKIT',.495015,.659124,.035911),
 glyph('-40%',.451,.700,.08,.055),
 glyph('ja',.418949,.8284,.009231),
 glyph('ITSERUSKETTAVAT',.430443,.8284,.095321),
 glyph('-25%',.419,.865,.09,.055),
];
const prior=[{
 page:11,
 title:'IDA WARG BEAUTY KASVOJEN HOITO- ja PUHDISTUSTUOTTEET 12–150 ml, VARTALONHOITOTUOTTEET 50–250 ml ja ITSERUSKETTAVAT',
 percentageOffer:{percent:25},
}];
const result=recoverWrappedPercentageCards(boxes,11,prior);
assert.ok(result.some(r=>r.title==='DR JACKSON -TUOTTEET'&&r.percentageOffer?.percent===15),
  'Detached uppercase publisher brand must be attached to the printed -TUOTTEET tail');
assert.ok(result.some(r=>r.title==='LUMENE MEIKIT'&&r.percentageOffer?.percent===40),
  'Standalone printed percentage offer must remain intact');
assert.ok(!result.some(r=>r.title==='ja ITSERUSKETTAVAT'),
  'The last line of an already parsed discount may not become a duplicate offer');
console.log('Citymarket wrapped percentage heading and duplicate-tail regression passed');
