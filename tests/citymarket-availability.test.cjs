const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
const file='src/app/components/ziiply/offerSearch/citymarketAvailability.ts';
function load(fetch, now='2026-10-24T02:13:23Z'){const Clock=class extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return Date.parse(now)}};const m={exports:{}};new Function('module','exports','fetch','Date',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,fetch,Clock);return m.exports;}
const outage='K-Citymarketin PDF-digitarjouslehden sivusto ei tällä hetkellä ole toiminnassa johtuen palveluntarjoajan teknisistä ongelmista.';
test('current publisher notice is extracted without scripts or markup',()=>{
 const {extractCitymarketOutage}=load();const result=extractCitymarketOutage('<script>'+outage+'</script><p>Loppuviikon tarjouslehteen</p><p>'+outage+'</p><p>Pahoittelemme aiheutuneesta vaivasta.</p>');assert.equal(result,outage);
 assert.equal(extractCitymarketOutage('<script>'+outage+'</script><p>Tarjouslehti keskiviikkoisin klo 15.</p>'),null);
 assert.equal(extractCitymarketOutage('<p>Tarjouslehti on nyt saatavilla.</p>'),null);
});
test('failed status lookup explicitly reports unknown cause, with no invented publisher attribution',async()=>{
 for(const fetch of [async()=>{throw Error('timeout')},async()=>({ok:false}),async()=>({ok:true,text:async()=>'<p>Tarjouslehti on saatavilla.</p>'})]){
  const notice=await load(fetch).getCitymarketFailureNotice();assert.match(notice.message,/Syy on tuntematon/);assert.equal(notice.sourceUrl,null);assert.equal(notice.reason,null);
 }
});
test('confirmed publisher cause has its source and concurrent lookups are deduplicated',async()=>{
 let calls=0;const api=load(async()=>{calls++;return {ok:true,text:async()=>'<p>'+outage+'</p>'}});
 const [a,b]=await Promise.all([api.getCitymarketFailureNotice(),api.getCitymarketFailureNotice()]);assert.equal(calls,1);assert.equal(a.reason,outage);assert.match(a.sourceUrl,/k-ruoka.fi/);assert.deepEqual(a,b);await api.getCitymarketFailureNotice();assert.equal(calls,1);
});

test('verified publisher reason survives a failed refresh instead of becoming unknown',async()=>{
 const api=load(async()=>{throw Error('unreachable')},'2026-10-22T03:00:00Z');
 const notice=await api.getCitymarketFailureNotice();assert.match(notice.reason,/palveluntarjoajan teknisiä ongelmia/);assert.equal(notice.checkedAt,'2026-10-22T02:13:22Z');assert.match(notice.sourceUrl,/k-ruoka.fi/);
});
test('complete healthy publisher page clears a previous verified notice',async()=>{
 const api=load(async()=>({ok:true,text:async()=>'<html><h1>K-Citymarket</h1><p>Tarjouslehti on saatavilla.</p></html>'}),'2026-10-22T03:00:00Z');
 assert.equal((await api.getCitymarketFailureNotice()).reason,null);
});
