const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(file,imports={}){
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};new Function('require','module','exports',code)(name=>{if(name in imports)return imports[name];throw Error('Unexpected import '+name)},module,module.exports);return module.exports;
}
const {expectedCitymarketPreflight:expected,citymarketPreflightStatus:status}=load('control-center/app/citymarketPreflight.ts');
const period='2026-10-22-W43-LV';
const raw=(date,next=null,errors=[])=>({checked_at:date,source:'k-citymarket-cache',ok:true,offer_count:34,outcome:'cache-warm-partial-or-failed',details:{active:{period:'2026-10-19-W43-AV',offers:34},next,errors}});
test('Finnish preview window changes at 15:00; handles winter and ISO week year rollover',()=>{
  assert.equal(expected(new Date('2026-10-21T11:59:00Z')).issue,'43AV');
  assert.equal(expected(new Date('2026-10-21T12:00:00Z')).period,period);
  assert.equal(expected(new Date('2026-11-01T12:59:00Z')).issue,'44LV');
  assert.equal(expected(new Date('2026-11-01T13:00:00Z')).issue,'45AV');
  assert.equal(expected(new Date('2027-01-03T14:00:00Z')).period,'2027-01-04-W1-AV');
});
test('active AV success cannot mask the first failed LV attempt; preserve earliest timestamp and latest error',()=>{
  const runs=[raw('2026-10-21T13:11:00Z',null,['next '+period+': HTTP 403']),raw('2026-10-21T12:10:00Z',null,['next '+period+': fetch failed'])];
  const result=status(runs,new Date('2026-10-21T14:00:00Z'));
  assert.equal(result.level,'red');assert.equal(result.first,'2026-10-21T12:10:00Z');
  assert.match(result.errors[0],/403/);assert.equal(result.count,0,'never display active AV count for failed LV');
});
test('previous leaflet success is not reused for new preview; no data is visible',()=>{
  const result=status([raw('2026-10-18T13:00:00Z',{period:'2026-10-19-W43-AV',offers:35})],new Date('2026-10-21T14:00:00Z'));
  assert.equal(result.level,'gray');assert.equal(result.count,null);
});
test('automatic success remains pending printed PDF review; full review is independently required',()=>{
  const run=raw('2026-10-21T13:00:00Z',{period,offers:89});
  const result=status([run],new Date('2026-10-21T14:00:00Z'));
  assert.equal(result.level,'yellow');assert.equal(result.count,89);assert.equal(result.reviewed,false);
});
test('first failure is retained when a retry recovers; archive capture cannot approve PDF prices',()=>{
  const good=raw('2026-10-21T13:00:00Z',{period,offers:89});
  const bad=raw('2026-10-21T12:10:00Z',null,['next '+period+': HTTP 403']);
  const archive={checked_at:'2026-10-21T13:20:00Z',source:'k-citymarket-source-audit',ok:true,offer_count:89,outcome:'source-archive-captured',details:{period}};
  const result=status([archive,good,bad],new Date('2026-10-21T14:00:00Z'));
  assert.equal(result.first,bad.checked_at);assert.equal(result.level,'yellow');assert.equal(result.reviewed,false);
});
test('preflight records failed fetch, missing snapshot, count mismatch and percentage-only campaigns correctly',async()=>{
  let quality=null;const records=[];
  const {recordCitymarketPreflight:record}=load('src/app/components/ziiply/offerSearch/citymarketPreflight.ts',{
    '@neondatabase/serverless':{neon:()=>async()=>quality?[quality]:[]},
    './publicationRunLog':{recordPublicationRun:async r=>records.push(r)},
  });
  const previous=process.env.DATABASE_URL;process.env.DATABASE_URL='test-only';
  try{
    const input={period,startedAt:'2026-10-21T12:10:00Z',parsed:null,errors:['next '+period+': HTTP 403']};
    assert.equal((await record(input)).outcome,'preflight-parser-failed');
    input.parsed={period,offers:89,cachedAt:input.startedAt};input.errors=[];
    assert.equal((await record(input)).outcome,'preflight-snapshot-missing');
    quality={total:88,missing_names:0,missing_prices:0,missing_images:0,missing_categories:0,unverified_prices:0};
    assert.equal((await record(input)).outcome,'preflight-quality-failed');
    quality.total=89;
    assert.equal((await record(input)).outcome,'preflight-awaiting-pdf-review');
    assert.equal(records.at(-1).details.pdfReview,'pending');
  }finally{if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;}
});
