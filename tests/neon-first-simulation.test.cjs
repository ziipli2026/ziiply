require('../scripts/recipe-audit-runtime.cjs');
const { runSimulation } = require('../src/lib/neonSearchSimulation/engine.ts');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ean = '6410000000001';
const source = (id, products) => ({ id, search: async () => products });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
test('Neon publishes before shop prices; shops fill by EAN and retain bank image', async () => {
  const s = deferred(), k = deferred(), states = [];
  const pending = runSimulation('olut', source('Neon', [{ ean, name: 'Olut', imageUrl: '/bank.jpg' }]), [{ id: 'S', search: () => s.promise }, { id: 'K', search: () => k.promise }], new AbortController().signal, value => states.push(value));
  await new Promise(resolve => setImmediate(resolve));
  const early = states.at(-1); assert.equal(early.rows.length, 1); assert.deepEqual(early.rows[0].prices, {}); assert.equal(early.done, false);
  s.resolve([{ ean, name: 'Olut', price: 1.25, imageUrl: null }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(states.at(-1).rows[0].prices.S, 1.25); assert.equal(states.at(-1).done, false);
  k.resolve([{ ean, name: 'Olut', price: 1.39, imageUrl: '/shop.jpg' }]); await pending;
  assert.deepEqual(states.at(-1).rows[0].prices, { S: 1.25, K: 1.39 }); assert.equal(states.at(-1).rows[0].imageUrl, '/bank.jpg'); assert.equal(states.at(-1).done, true);
});
test('empty or failed bank still searches shops', async () => {
  for(const fail of [false, true]) {
    let last;
    await runSimulation('olut', { id: 'Neon', search: async () => { if(fail) throw Error(); return []; } }, [source('S', [{ ean, name: 'New', price: 2 }])], new AbortController().signal, state => last = state);
    assert.equal(last.rows.length, 1); assert.equal(last.rows[0].prices.S, 2); assert.equal(last.done, true);
  }
});
test('missing prices stay unknown; packages and store-only identities do not collide', async () => {
  let last;
  await runSimulation('olut', source('Neon', [{ ean, name: 'Olut' }]), [source('S', [{ ean, name: 'Olut', price: 0, imageUrl: '/filled.jpg' }, { ean: '6410000000002', name: 'Olut', price: 7.5 }, { id: 'same', name: 'Olut' }]), source('K', [{ id: 'same', name: 'Olut' }])], new AbortController().signal, value => last = value);
  assert.equal(last.rows.length, 4); assert.equal(last.rows[0].prices.S, null); assert.equal(last.rows[0].imageUrl, '/filled.jpg');
});
test('shop error does not discard bank or other shop results', async () => {
  let last;
  await runSimulation('olut', source('Neon', [{ ean, name: 'Olut' }]), [{ id: 'S', search: async () => { throw Error(); } }, source('K', [{ ean, name: 'Olut', price: 2 }])], new AbortController().signal, value => last = value);
  assert.equal(last.stages.S, 'error'); assert.equal(last.rows[0].prices.K, 2); assert.equal(last.done, true);
});
test('aborted old request cannot publish late rows', async () => {
  const wait = deferred(), controller = new AbortController(), states = [];
  const pending = runSimulation('old', { id: 'Neon', search: () => wait.promise }, [source('S', [])], controller.signal, value => states.push(value));
  controller.abort(); const count = states.length; wait.resolve([{ ean, name: 'Late' }]); await pending;
  assert.equal(states.length, count); assert.equal(states.at(-1).rows.length, 0);
});
test('only selected shop runs and bank prices are not trusted as shop prices', async () => {
  let last;
  await runSimulation('olut', source('Neon', [{ ean, name: 'Olut', price: 99 }]), [source('K', [{ ean, name: 'Olut', price: 2 }])], new AbortController().signal, v => last = v);
  assert.deepEqual(last.rows[0].prices, { K: 2 }); assert.equal(last.stages.S, undefined);
});
test('nonfinite, negative, zero and missing prices remain unknown', async () => {
  let last;
  const products = [NaN, Infinity, -1, 0, null, undefined].map((price, i) => ({ ean: String(6410000000010 + i), name: 'Olut', price }));
  await runSimulation('olut', source('Neon', []), [source('S', products)], new AbortController().signal, v => last = v);
  assert.ok(last.rows.every(row => row.prices.S === null));
});
test('shop completion order cannot mix store prices or duplicate EAN rows', async () => {
  for(const order of [['S','K'],['K','S']]) {
    const waits = { S: deferred(), K: deferred() }; let last;
    const pending = runSimulation('olut', source('Neon', [{ ean, name: 'Olut' }]), ['S','K'].map(id => ({ id, search: () => waits[id].promise })), new AbortController().signal, v => last = v);
    await new Promise(r => setImmediate(r));
    for(const id of order) { waits[id].resolve([{ ean, name: 'Olut', price: id === 'S' ? 1 : 2 }]); await new Promise(r => setImmediate(r)); }
    await pending; assert.equal(last.rows.length, 1); assert.deepEqual(last.rows[0].prices, { S: 1, K: 2 });
  }
});
test('published snapshots are immutable and all-empty search completes', async () => {
  const states = [];
  await runSimulation('none', source('Neon', []), [source('S', []), source('K', [])], new AbortController().signal, v => states.push(v));
  assert.deepEqual(states[0].stages, { Neon: 'loading' });
  assert.equal(states.at(-1).done, true); assert.deepEqual(states.at(-1).rows, []);
});
test('distinct store id and fallback index cannot collide', async () => {
  let last;
  await runSimulation('olut', source('Neon', []), [source('S', [{ id: '1', name: 'First' }, { name: 'Second' }])], new AbortController().signal, v => last = v);
  assert.equal(last.rows.length, 2);
});
test('duplicate EAN with missing price must not erase a verified price', async () => {
  let last;
  await runSimulation('olut', source('Neon', []), [source('S', [{ ean, name: 'Olut', price: 2 }, { ean, name: 'Olut', price: null }])], new AbortController().signal, v => last = v);
  assert.equal(last.rows.length, 1); assert.equal(last.rows[0].prices.S, 2);
});
test('large result sets merge correctly without cutting off shop-only products', async () => {
  const rows = (start, count, price) => Array.from({length:count}, (_,i) => ({ ean: String(6410000000000 + start + i), name: `Product ${start+i}`, price }));
  let last; const started = performance.now();
  await runSimulation('large', source('Neon', rows(0,1000)), [source('S', rows(500,1000,1)), source('K', rows(750,1000,2))], new AbortController().signal, v => last = v);
  assert.equal(last.rows.length,1750); assert.equal(last.rows.find(row=>row.ean==='6410000000800').prices.K,2);
  console.log(`SIMULATION merge: 3000 input rows -> 1750 EAN rows in ${(performance.now()-started).toFixed(1)} ms (no database, network or relevance ranking)`);
});
test('hung bank times out and selected shop still supplies results', async () => {
  let last, bankSignal;
  await runSimulation('olut', {id:'Neon', search: (_q, signal) => {bankSignal=signal;return new Promise(()=>{});}}, [source('S',[{ean,name:'Olut',price:2}])], new AbortController().signal, v=>last=v, ()=>performance.now(), {bankMs:5,shopMs:1000});
  assert.equal(last.stages.Neon,'timeout');assert.equal(bankSignal.aborted,true);assert.equal(last.rows[0].prices.S,2);assert.equal(last.done,true);
});
test('hung shop times out without losing already visible bank results', async () => {
  let last;
  await runSimulation('olut', source('Neon',[{ean,name:'Olut'}]), [{id:'S',search:()=>new Promise(()=>{})}], new AbortController().signal, v=>last=v, ()=>performance.now(), {bankMs:1000,shopMs:5});
  assert.equal(last.stages.S,'timeout');assert.equal(last.rows.length,1);assert.deepEqual(last.rows[0].prices,{});assert.equal(last.done,true);
});
test('aborting a hung provider resolves the run and ignores late results', async () => {
  const controller=new AbortController();const states=[];
  const pending=runSimulation('old',{id:'Neon',search:()=>new Promise(()=>{})},[],controller.signal,v=>states.push(v));
  controller.abort();await pending;assert.equal(states.length,1);assert.equal(states[0].done,false);
});

test('live Neon API response shape merges with independent S/K prices without trusting bank prices', async () => {
  const base=process.env.SEARCH_BASE_URL;
  if(!base) return; // Offline test runs do not require a running Neon API.
  const query='6413300102017';
  const response=await fetch(base+'/api/neon-first-search?q='+query,{signal:AbortSignal.timeout(15000)});
  assert.equal(response.ok,true);
  const data=await response.json();
  assert.equal(data.ok,true);
  const bankProducts=data.products.map(p=>({ean:p.ean,name:p.name,imageUrl:p.imageUrl,price:999}));
  assert.ok(bankProducts.length>0);
  const match=bankProducts.find(p=>p.ean===query);
  assert.ok(match);
  const snapshots=[];
  await runSimulation(query,source('Neon',bankProducts),[
    source('S',[{ean:query,name:match.name,price:2.49,imageUrl:'/s.jpg'}]),
    source('K',[{ean:query,name:match.name,price:2.79,imageUrl:'/k.jpg'}])
  ],new AbortController().signal,s=>snapshots.push(s));
  const first=snapshots.find(s=>s.rows.some(r=>r.ean===query)&&s.stages.S===undefined&&s.stages.K===undefined);
  assert.ok(first,'Neon result should be visible before store responses');
  assert.deepEqual(first.rows.find(r=>r.ean===query).prices,{});
  const final=snapshots.at(-1);
  assert.equal(final.done,true);
  assert.equal(final.rows.filter(r=>r.ean===query).length,1);
  assert.deepEqual(final.rows.find(r=>r.ean===query).prices,{S:2.49,K:2.79});
  assert.equal(final.rows.find(r=>r.ean===query).imageUrl,match.imageUrl||'/s.jpg');
  console.log('LIVE NEON + MOCK S/K: PASS',JSON.stringify({ean:query,bankRows:bankProducts.length,snapshots:snapshots.length}));
});

test('live Neon and real S/K upstream first pages merge by EAN with cent-to-euro conversion', async () => {
  const base=process.env.SEARCH_BASE_URL;
  if(!base) return;
  const query='makkara';
  const bankResponse=await fetch(base+'/api/neon-first-search?q='+query,{signal:AbortSignal.timeout(15000)});
  assert.equal(bankResponse.ok,true);
  const bank=await bankResponse.json();
  assert.equal(bank.ok,true);
  const stores=[{id:'S',storeId:292},{id:'K',storeId:3221}];
  const fetched=await Promise.all(stores.map(async store=>{
    const url='https://api.ruoanhinta.fi/api/items?search='+query+'&storeIds='+store.storeId+'&skip=0&take=80';
    const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
    assert.equal(response.ok,true,store.id+' upstream unavailable');
    const data=await response.json();
    assert.ok(Array.isArray(data.items));
    return {id:store.id,products:data.items.map(p=>({
      ean:/^\d{8,14}$/.test(String(p.ean||''))?String(p.ean):undefined,
      id:String(p.id),name:p.name,imageUrl:p.pictureUrl,
      price:Number.isFinite(p.storeItems?.[0]?.price)&&p.storeItems[0].price>0?p.storeItems[0].price/100:null
    }))};
  }));
  assert.ok(fetched.every(s=>s.products.length>0),'Both stores should have search results');
  const snapshots=[];
  await runSimulation(query,source('Neon',bank.products.map(p=>({ean:p.ean,name:p.name,imageUrl:p.imageUrl}))),fetched.map(s=>source(s.id,s.products)),new AbortController().signal,s=>snapshots.push(s));
  const final=snapshots.at(-1);
  assert.equal(final.done,true);
  const byEan=new Map(final.rows.filter(r=>r.ean).map(r=>[r.ean,r]));
  assert.equal(byEan.size,final.rows.filter(r=>r.ean).length,'EAN rows must not duplicate');
  let exact=0,storeOnly=0;
  const bankEans=new Set(bank.products.map(p=>p.ean));
  for(const store of fetched)for(const p of store.products){
    if(!p.ean)continue;
    const row=byEan.get(p.ean);
    assert.ok(row,'Store EAN must survive merge');
    if(p.price!==null)assert.equal(row.prices[store.id],p.price,'Price must remain in correct store and euros');
    if(bankEans.has(p.ean))exact++;else storeOnly++;
  }
  assert.ok(exact>0,'Expected at least one matching Neon EAN');
  assert.ok(storeOnly>0,'Store-only EANs must not disappear');
  const initial=snapshots.find(s=>s.rows.length>0&&s.stages.S===undefined&&s.stages.K===undefined);
  assert.ok(initial,'Bank results must publish before shops');
  console.log('LIVE NEON + REAL S/K MERGE: PASS',JSON.stringify({query,bankRows:bank.products.length,shopRows:fetched.map(s=>({store:s.id,count:s.products.length})),exact,storeOnly,mergedRows:final.rows.length}));
});
