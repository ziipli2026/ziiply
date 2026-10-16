const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const path=require('node:path');
function load(base, options={}) {
  const filename=path.join(base,'src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts');
  let saved=options.saved ?? null, writes=0, requests=0;
  const now=Date.now();
  const date={validFrom:new Date(now-3600000).toISOString(),validUntil:new Date(now+3600000).toISOString()};
  const sql=async(strings,...values)=>{
    if(strings[0].includes('SELECT'))return saved===null?[]:[{offers:saved}];
    writes++; saved=JSON.parse(values[1]);return [];
  };
  const exports={};
  const fetch=async(url,init)=>{
    requests++;
    if(options.failPage && String(url).endsWith('/3'))throw new Error('The operation was aborted due to timeout');
    if(String(url).includes('paged-publications')) {
      const page=Number(url.split('/').at(-1));
      return {ok:true,json:async()=>({hotspots:page<=51?[{offer:{id:'offer-'+page}}]:[]})};
    }
    const key=JSON.parse(init.body).data[0];
    if(options.failDetail && Buffer.from(key,'base64').toString().includes('offer-3'))throw new Error('Tjek offer detail timeout');
    const [method,args]=JSON.parse(Buffer.from(key,'base64').toString());
    const value=method==='stores'?{data:[{name:'K-Citymarket Hyvinkää',id:'store1',coordinates:{latitude:60,longitude:25}}]}:
      method==='fronts'?[{publications:[{id:'p1',...date},{id:'p2',...date}]}]:
      {name:'Sama tuote',price:2,...date};
    return {ok:true,text:async()=>JSON.stringify({key,value})};
  };
  const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>name==='@neondatabase/serverless'?{neon:()=>sql}:{category:()=> 'Kuivatuotteet'},fetch,Buffer,AbortSignal,Date,console,process:{env:{DATABASE_URL:'postgresql://test'}}},{filename});
  return {api:exports,stats:()=>({saved,writes,requests}),date};
}
const roots = [...new Set([path.resolve(__dirname,'..'),path.resolve(__dirname,'../../ziiply'),path.resolve(__dirname,'../../desktop')])]
  .filter(base => fs.existsSync(path.join(base,'src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts')));
for(const base of roots) {
  test(path.basename(base)+': read missing snapshot fails without upstream collection',async()=>{
    const {api,stats}=load(base);await assert.rejects(api.fetchKCitymarketSelectedStoreOffers('K-Citymarket Hyvinkää'));assert.equal(stats().requests,0);assert.equal(stats().writes,0);
  });
  test(path.basename(base)+': all 51 pages per publication, source duplicates preserved, durable read only',async()=>{
    const {api,stats}=load(base);
    const rows=await api.refreshKCitymarketSelectedStoreSnapshot('K-Citymarket Hyvinkää');
    assert.equal(rows.length,102);assert.equal(stats().writes,1);
    assert.equal(api.getKCitymarketLocalTjekDebug('K-Citymarket Hyvinkää').stage,'complete');
    assert.equal(new Set(rows.map(row=>row.id)).size,102);
    const before=stats().requests;
    assert.equal((await api.fetchKCitymarketSelectedStoreOffers('K-Citymarket Hyvinkää')).length,102);
    assert.equal(stats().requests,before);assert.equal(api.getKCitymarketLocalTjekDebug('K-Citymarket Hyvinkää').stage,'snapshot-ready');
  });
  test(path.basename(base)+': timeout cannot overwrite previous complete snapshot',async()=>{
    const saved=[{name:'previous',validFrom:'2026-01-01',validUntil:'2099-01-01'}];
    const {api,stats}=load(base,{saved,failPage:true});
    await assert.rejects(api.refreshKCitymarketSelectedStoreSnapshot('K-Citymarket Hyvinkää'),/timeout/);
    assert.equal(stats().writes,0);assert.deepEqual(stats().saved,saved);
    assert.equal(api.getKCitymarketLocalTjekDebug('K-Citymarket Hyvinkää').stage,'failed');
    assert.equal((await api.fetchKCitymarketSelectedStoreOffers('K-Citymarket Hyvinkää')).length,1);
  });
}

test("ziiply: failed offer detail cannot publish a partial scan",async()=>{
  const {api,stats}=load(require('node:path').resolve(__dirname,'..'),{failDetail:true});
  await assert.rejects(api.refreshKCitymarketSelectedStoreSnapshot('K-Citymarket Hyvinkää'),/detail requests failed/);
  assert.equal(stats().writes,0);
  await assert.rejects(api.fetchKCitymarketSelectedStoreOffers('K-Citymarket Hyvinkää'));
});

test('Package contents are distinct from multi-buy purchase counts, including existing snapshots',async()=>{
 const {api}=load(roots[0]);
 const normalize=api.normalizeTjekPackagePrice;
 for(const [title,info,q,total] of [
  ['Actimel 8 x 100 g','',8,3.69],['Mutti','3 x 400 g',3,2.69],
  ['Trip 2 dl 24-pack','',24,10],['Karhu 0,33 l 8-pack','Sis. pantit 1,20',8,7.99]]){
  const row={title,additionalInfo:info,offerQuantity:q,price:total,id:'same',category:'same'};
  const out=normalize(row);
  assert.equal(out.offerQuantity,null);assert.equal(out.packageCount,q);assert.equal(out.price,total);
  assert.equal(out.id,row.id);assert.equal(out.category,row.category);assert.match(out.priceText,/€ \/ pkt/);
  assert.deepEqual(normalize(out),out);
 }
 for(const row of [{title:'Rahka 250 g',offerQuantity:6,price:4},
  {title:'DUOPACK PYYHKEET 128 kpl/pkt',additionalInfo:'2 PKT',offerQuantity:2,price:6.5},
  {title:'Tuote 3 x 400 g',additionalInfo:'3 PKT',offerQuantity:3,price:10}])assert.equal(normalize(row),row);
});
