const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
const file='src/app/components/ziiply/offerSearch/citymarketAvailability.ts';
function load(fetch){const m={exports:{}};new Function('module','exports','fetch',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports,fetch);return m.exports;}
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
