import test from 'node:test';
import assert from 'node:assert/strict';
import {enrichNeonRows} from '../src/lib/neonSearchSimulation/enrichPrices.mjs';
test('publishes only exact EAN, positive store-specific prices after initial rows',async()=>{
 const rows=[{ean:'6413300100716',name:'Maito',prices:{}},{ean:'6413300019124',name:'Maito 2',prices:{S:2.5}}];
 const updates=[];
 const result=await enrichNeonRows(rows,async()=>[{ean:'6413300100716',store:'S',price:1.5},{ean:'wrong',store:'K',price:9},{ean:'6413300100716',store:'K',price:-1}],r=>updates.push(r),new AbortController().signal);
 assert.equal(result[0].prices.S,1.5);
 assert.equal(result[0].prices.K,undefined);
 assert.equal(result[1].prices.S,2.5);
 assert.equal(rows[0].prices.S,undefined);
 assert.equal(updates.length,1);
});
test('failure never removes baseline',async()=>{
 const rows=[{ean:'6413300100716',name:'Maito',prices:{}},{ean:'6413300019124',name:'Maito 2',prices:{K:3}}];
 const result=await enrichNeonRows(rows,async()=>{throw Error('offline');},()=>{throw Error('should not publish');},new AbortController().signal);
 assert.deepEqual(result[1].prices,{K:3});
});
