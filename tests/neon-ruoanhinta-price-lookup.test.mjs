import test from 'node:test';
import assert from 'node:assert/strict';
import {createRuoanhintaPriceLookup} from '../src/lib/neonSearchSimulation/ruoanhintaPriceLookup.mjs';
const stores=[{id:'S',storeId:292},{id:'K',storeId:3221}];
test('Ruoanhinta adapter only accepts exact EAN and selected store price',async()=>{
 const fetcher=async url=>({ok:true,json:async()=>({items:[
  {ean:'6413300100716',storeItems:[{storeId:url.includes('3221')?3221:292,price:159}]},
  {ean:'6413300100717',storeItems:[{storeId:292,price:1}]}
 ]})});
 const lookup=createRuoanhintaPriceLookup(stores,fetcher);
 const result=await lookup({ean:'6413300100716',name:'Valio kevytmaito'},new AbortController().signal);
 assert.deepEqual(result,[{ean:'6413300100716',store:'S',price:1.59},{ean:'6413300100716',store:'K',price:1.59}]);
});
test('missing or mismatched store id cannot be assigned a price',async()=>{
 const lookup=createRuoanhintaPriceLookup(stores,async()=>({ok:true,json:async()=>({items:[{ean:'6413300100716',storeItems:[{price:1.99},{storeId:99,price:3}]}]})}));
 assert.deepEqual(await lookup({ean:'6413300100716',name:'Valio kevytmaito'},new AbortController().signal),[]);
});
test('upstream errors leave price unknown',async()=>{
 const lookup=createRuoanhintaPriceLookup(stores,async()=>{throw Error('offline')});
 assert.deepEqual(await lookup({ean:'6413300100716',name:'Valio kevytmaito'},new AbortController().signal),[]);
});

test('upstream prices are cents and browser receives euros (no 100x display error)',async()=>{
 const lookup=createRuoanhintaPriceLookup([{id:'K',storeId:3221}],async()=>({ok:true,json:async()=>({items:[{ean:'6413300100716',storeItems:[{storeId:3221,price:259}]}]})}));
 assert.deepEqual(await lookup({ean:'6413300100716',name:'Valio kevytmaito'},new AbortController().signal),[{ean:'6413300100716',store:'K',price:2.59}]);
});
