import test from 'node:test';import assert from 'node:assert/strict';
import {recoverWrappedPercentageCards as recover} from '../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js';
const b=(text,left,top,width=.08,height=.018)=>({text,left,top,width,height});
const boxes=[b('HIUSTENHOITO-',.1,.2),b('ja',.1,.214,.015),b('MUOTOILUTUOTTEET',.12,.214,.14),b('-20%',.11,.27,.12,.07)];
test('Wrapped title and owned badge produce only a percentage campaign',()=>{const rows=recover(boxes,1);assert.equal(rows.length,1);assert.equal(rows[0].title,'HIUSTENHOITO- ja MUOTOILUTUOTTEET');assert.equal(rows[0].percentageOffer.percent,20);assert.equal(rows[0].spatialResolved,null);});
test('Missing, neighbouring and conflicting badges stay unresolved',()=>{for(const bs of [boxes.slice(0,3),[...boxes.slice(0,3),b('-20%',.5,.27,.12,.07)],[...boxes,b('-25%',.12,.28,.12,.07)]])assert.deepEqual(recover(bs,1),[]);});
test('Intervening headline and large price prevent percentage-only interpretation',()=>{for(const extra of [b('SHAMPOOT',.1,.24),b('990',.15,.24,.1,.05)])assert.deepEqual(recover([...boxes,extra],1),[]);});
test('Existing product identity is retained without a duplicate campaign',()=>{assert.deepEqual(recover(boxes,1,[{title:'HIUSTENHOITO- ja MUOTOILUTUOTTEET'}]),[]);});
test('Household title with a discount is excluded from cosmetic recovery',()=>{assert.deepEqual(recover([b('VAATTEET',.1,.2),b('-20%',.11,.27,.12,.07)],1),[]);});
