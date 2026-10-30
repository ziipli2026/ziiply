import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeSelectedStoreProducts} from '../src/lib/neonSearchSimulation/selectedStoreMerge.mjs';
const bank=[{ean:'6410000000001',name:'Maito',imageUrl:'/bank.jpg'},{ean:'6410000000002',name:'Kahvi'}];
test('selected mobile store identities are retained; unselected stores are ignored',()=>{
 const result=mergeSelectedStoreProducts(bank,[
  {storeId:'local-S-77',products:[{ean:'6410000000001',name:'Maito',price:1.59}]},
  {storeId:'local-K-99',products:[{ean:'6410000000001',name:'Maito',price:1.29}]},
  {storeId:'fixture-S-292',products:[{ean:'6410000000002',name:'Kahvi',price:0.01}]}
 ],[{id:'local-S-77'},{id:'local-K-99'}]);
 assert.equal(result.priced.length,1);
 assert.deepEqual(result.priced[0].prices,{'local-S-77':1.59,'local-K-99':1.29});
 assert.equal(result.priced[0].imageUrl,'/bank.jpg');
 assert.deepEqual(result.unpriced.map(r=>r.ean),['6410000000002']);
});
test('selected store only mode sorts by selected prices and never uses bank prices',()=>{
 const result=mergeSelectedStoreProducts([{ean:'6410000000001',name:'A',price:0.01},{ean:'6410000000002',name:'B'}],[
  {storeId:'S',products:[{ean:'6410000000001',name:'A',price:1.99},{ean:'6410000000002',name:'B',price:2.49}]},
  {storeId:'K',products:[{ean:'6410000000001',name:'A',price:3.99},{ean:'6410000000002',name:'B',price:1.49}]}
 ],[{id:'K'}]);
 assert.deepEqual(result.priced.map(r=>r.ean),['6410000000002','6410000000001']);
 assert.deepEqual(result.priced.map(r=>r.prices.K),[1.49,3.99]);
 assert.ok(result.rows.every(r=>!('S' in r.prices)));
});
test('price does not disappear if a duplicate selected-store observation lacks price',()=>{
 const result=mergeSelectedStoreProducts([],[
  {storeId:'S',products:[{ean:'6410000000001',name:'A',price:1.99},{ean:'6410000000001',name:'A',price:null}]}
 ],[{id:'S'}]);
 assert.equal(result.rows.length,1);
 assert.equal(result.rows[0].prices.S,1.99);
});
