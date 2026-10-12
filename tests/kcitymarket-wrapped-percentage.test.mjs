import test from 'node:test';import assert from 'node:assert/strict';
import {recoverWrappedPercentageCards as recover} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js';
const b=(text,left,top,width=.08,height=.018)=>({text,left,top,width,height});
const boxes=[b('HIUSTENHOITO-',.1,.2),b('ja',.1,.214,.015),b('MUOTOILUTUOTTEET',.12,.214,.14),b('-20%',.11,.27,.12,.07)];
test('Wrapped title and owned badge produce only a percentage campaign',()=>{const rows=recover(boxes,1);assert.equal(rows.length,1);assert.equal(rows[0].title,'HIUSTENHOITO- ja MUOTOILUTUOTTEET');assert.equal(rows[0].percentageOffer.percent,20);assert.equal(rows[0].spatialResolved,null);});
test('Missing, neighbouring and conflicting badges stay unresolved',()=>{for(const bs of [boxes.slice(0,3),[...boxes.slice(0,3),b('-20%',.5,.27,.12,.07)],[...boxes,b('-25%',.12,.28,.12,.07)]])assert.deepEqual(recover(bs,1),[]);});
test('Intervening headline and large price prevent percentage-only interpretation',()=>{for(const extra of [b('SHAMPOOT',.1,.24),b('990',.15,.24,.1,.05)])assert.deepEqual(recover([...boxes,extra],1),[]);});
test('Existing product identity is retained without a duplicate campaign',()=>{assert.deepEqual(recover(boxes,1,[{title:'HIUSTENHOITO- ja MUOTOILUTUOTTEET'}]),[]);});
test('Household title with a discount is excluded from cosmetic recovery',()=>{assert.deepEqual(recover([b('VAATTEET',.1,.2),b('-20%',.11,.27,.12,.07)],1),[]);});

test('A side badge touching the headline column proves the printed percentage',()=>{
 for(const badge of [b('-30%',.28,.19,.12,.07),b('-30%',-.04,.21,.12,.07)]){
  const rows=recover([...boxes.slice(0,3),badge],1);assert.equal(rows.length,1);assert.equal(rows[0].percentageOffer.percent,30);
 }
});
test('Side badges outside the title row or separated from the column are rejected',()=>{
 for(const badge of [b('-30%',.4,.19,.12,.07),b('-30%',.28,.15,.12,.07),b('-30%',.28,.4,.12,.07)])assert.deepEqual(recover([...boxes.slice(0,3),badge],1),[]);
});

// Generic category parsing must not contain named-brand or leaflet-specific exceptions.
test('Any generic TUOTTEET headline requires its own unambiguous printed badge',()=>{
 const headline=[b('ESIMERKKI',.1,.2),b('-TUOTTEET',.1,.214)];
 const owned=b('-35%',.11,.27,.12,.07);
 const rows=recover([...headline,owned],9);assert.equal(rows.length,1);assert.equal(rows[0].percentageOffer.percent,35);assert.equal(rows[0].spatialResolved,null);
 assert.deepEqual(recover(headline,9),[]);
 assert.deepEqual(recover([...headline,b('-35%',.5,.27,.12,.07)],9),[]);
 assert.deepEqual(recover([...headline,owned,b('-40%',.12,.28,.12,.07)],9),[]);
});

test('Consumable package counts and dimensions remain title metadata, not transaction quantities',()=>{
 for(const type of ['SUOJAPAPERIT','LAUTASLIINAT']){
  const headline=[b(type,.1,.2),b('50',.1,.214,.015),b('kpl',.12,.214,.02),b('33',.145,.214,.02),b('cm',.17,.214,.02)];
  const rows=recover([...headline,b('-20%',.21,.2,.12,.07)],3);assert.equal(rows.length,1);assert.match(rows[0].title,/50 kpl 33 cm$/);assert.equal(rows[0].spatialResolved,null);assert.equal(rows[0].percentageOffer.percent,20);
  assert.deepEqual(recover(headline,3),[]);
  assert.deepEqual(recover([...headline,b('-20%',.5,.2,.12,.07)],3),[]);
 }
});

