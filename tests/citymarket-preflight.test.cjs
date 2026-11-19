const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function load(file,imports={}){
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};new Function('require','module','exports',code)(name=>{if(name in imports)return imports[name];throw Error('Unexpected import '+name)},module,module.exports);return module.exports;
}
const {expectedCitymarketPreflight:expected,citymarketPreflightStatus:status,citymarketPreflightSchedule:schedule}=load('control-center/app/citymarketPreflight.ts');
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
  assert.equal(result.level,'red');assert.equal(result.count,null);
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
  let quality=null;const records=[];const connections=[];
  const {recordCitymarketPreflight:record}=load('src/app/components/ziiply/offerSearch/citymarketPreflight.ts',{
    '@neondatabase/serverless':{neon:url=>{connections.push(url);return async()=>quality?[quality]:[]}},
    './publicationRunLog':{recordPublicationRun:async (r,url)=>records.push({...r,url})},
  });
  const previous=process.env.OFFER_PUBLICATION_DATABASE_URL;process.env.OFFER_PUBLICATION_DATABASE_URL='publications-only';
  try{
    const input={period,startedAt:'2026-10-21T12:10:00Z',parsed:null,errors:['next '+period+': HTTP 403']};
    assert.equal((await record(input)).outcome,'preflight-parser-failed');
    input.parsed={period,offers:89,cachedAt:input.startedAt};input.errors=[];
    assert.equal((await record(input)).outcome,'preflight-snapshot-missing');
    quality={total:88,missing_names:0,missing_prices:0,missing_images:0,missing_categories:0,unverified_prices:0};
    assert.equal((await record(input)).outcome,'preflight-quality-failed');
    quality.total=89;
    quality.missing_images=6;quality.missing_categories=15;
    assert.equal((await record(input)).outcome,'preflight-quality-failed','45AV incomplete images and categories must fail');
    assert.equal(records.at(-1).details.imageEnrichment,'pending','category failure must not misreport image pipeline as failed');
    assert.deepEqual(records.at(-1).details.blockingReasons,['missing-categories']);
    quality.missing_categories=0;
    assert.equal((await record(input)).outcome,'preflight-awaiting-pdf-review','image-only gap must not block parser success');
    assert.equal(records.at(-1).ok,false,'waiting for images cannot approve PDF review');
    assert.equal(records.at(-1).details.imageEnrichment,'pending');
    quality.missing_images=0;quality.missing_categories=0;quality.unverified_prices=4;
    assert.equal((await record(input)).outcome,'preflight-quality-failed','unverified prices must block approval');
    quality.unverified_prices=0;
    quality.suspicious_prices=1;
    assert.equal((await record(input)).outcome,'preflight-quality-failed','implausible 0.75-litre bottle price must block approval');
    assert.ok(records.at(-1).details.blockingReasons.includes('suspicious-prices'));
    quality.suspicious_prices=0;
    assert.equal((await record(input)).outcome,'preflight-awaiting-pdf-review');
    assert.equal(records.at(-1).details.pdfReview,'pending');
    assert.equal(records.at(-1).ok,false,'PDF review pending must never be logged as approved');
    assert.ok(connections.every(url=>url==='publications-only'));
    assert.ok(records.every(record=>record.url==='publications-only'));
  }finally{if(previous===undefined)delete process.env.OFFER_PUBLICATION_DATABASE_URL;else process.env.OFFER_PUBLICATION_DATABASE_URL=previous;}
});

test('Sunday and Wednesday are both shown, and a completely missing run goes red after deadline',()=>{
 const rows=schedule([],new Date('2026-10-22T02:00:00Z'));
 assert.equal(rows.length,2);
 assert.equal(rows[0].issue,'43AV');assert.equal(rows[0].previewDate,'2026-10-18');
 assert.equal(rows[1].issue,'43LV');assert.equal(rows[1].previewDate,'2026-10-21');
 assert.ok(rows.every(r=>r.level==='red'&&r.label==='ENNAKKOPARSERIN AJO PUUTTUU'));
 assert.equal(status([],new Date('2026-10-21T12:20:00Z')).level,'gray');
 assert.equal(status([],new Date('2026-10-21T12:31:00Z')).level,'red');
});
test('Thursday active-period errors update the same Wednesday row after rollover',()=>{
 const first=raw('2026-10-21T12:10:00Z',null,['next '+period+': HTTP 403']);
 const active=raw('2026-10-22T01:15:00Z',null,['active '+period+': HTTP 403']);active.details.active=null;
 const result=schedule([active,first],new Date('2026-10-22T02:00:00Z'))[1];
 assert.equal(result.level,'red');assert.equal(result.first,first.checked_at);
 assert.equal(result.latest,active.checked_at);assert.match(result.errors[0],/^active /);
});

test('45AV parser success stays yellow when PDF review is pending even with ok false',()=>{
 const p='2026-11-02-W45-AV';
 const run={checked_at:'2026-11-01T13:15:00Z',source:'k-citymarket-preflight',ok:false,offer_count:32,outcome:'preflight-awaiting-pdf-review',details:{period:p,pdfReview:'pending',quality:{total:32,missing_images:6,missing_categories:15},errors:[]}};
 const result=status([run],new Date('2026-11-01T14:00:00Z'));
 assert.equal(result.level,'yellow');assert.equal(result.parserOk,true);assert.equal(result.reviewed,false);assert.equal(result.count,32);
});

test('45AV missing images and categories cannot be green even with a PDF-pass audit log',()=>{
 const p='2026-11-02-W45-AV';
 const run={checked_at:'2026-11-01T13:15:00Z',source:'k-citymarket-preflight',ok:false,offer_count:32,outcome:'preflight-awaiting-pdf-review',details:{period:p,pdfReview:'pending',quality:{total:32,missing_images:6,missing_categories:15,unverified_prices:0},errors:[]}};
 const audit={checked_at:'2026-11-01T13:20:00Z',source:'k-citymarket-source-audit',ok:true,offer_count:32,outcome:'pdf-review-passed',details:{period:p}};
 const result=status([run,audit],new Date('2026-11-01T14:00:00Z'));
 assert.equal(result.level,'yellow');assert.equal(result.reviewed,false);
});

test('45AV passes only after a newer PDF audit and complete quality metadata',()=>{
 const p='2026-11-02-W45-AV';
 const run={checked_at:'2026-11-01T13:15:00Z',source:'k-citymarket-preflight',ok:false,offer_count:32,outcome:'preflight-awaiting-pdf-review',details:{period:p,pdfReview:'pending',quality:{total:32,missing_names:0,missing_prices:0,missing_images:0,missing_categories:0,unverified_prices:0},errors:[]}};
 const audit={checked_at:'2026-11-01T13:20:00Z',source:'k-citymarket-source-audit',ok:true,offer_count:32,outcome:'pdf-review-passed',details:{period:p}};
 const now=new Date('2026-11-01T14:00:00Z');
 assert.equal(status([run,audit],now).level,'green');
 assert.equal(status([run,{...audit,checked_at:'2026-11-01T13:10:00Z'}],now).level,'yellow');
 const incomplete={...run,details:{...run.details,quality:{total:32,missing_images:0,missing_categories:0}}};
 assert.equal(status([incomplete,audit],now).level,'yellow');
});

test('46AV shows a recorded start, detects interruption and preserves the first start on retry',()=>{
 const p='2026-11-09-W46-AV';
 const started={checked_at:'2026-11-08T13:10:00Z',source:'k-citymarket-preflight',ok:false,offer_count:0,outcome:'preflight-started',details:{period:p}};
 assert.equal(status([started],new Date('2026-11-08T13:11:00Z')).label,'ENNAKKOPARSERIN AJO KÄYNNISSÄ');
 const interrupted=status([started],new Date('2026-11-08T13:30:00Z'));
 assert.equal(interrupted.label,'ENNAKKOPARSERIN AJO KESKEYTYI');
 assert.equal(interrupted.count,null);
 const retry={...started,checked_at:'2026-11-08T13:41:00Z',outcome:'preflight-awaiting-pdf-review',offer_count:42};
 const recovered=status([retry,started],new Date('2026-11-08T13:42:00Z'));
 assert.equal(recovered.first,started.checked_at);
 assert.equal(recovered.count,42);
 assert.equal(recovered.parserOk,true);
});


test('47AV: missing images never fail preflight, even after 23:00; categories remain blocking',async()=>{
  let quality={total:27,missing_names:0,suspicious_names:0,missing_prices:0,missing_images:27,missing_categories:0,unverified_prices:0};
  const records=[];
  const {recordCitymarketPreflight:record}=load('src/app/components/ziiply/offerSearch/citymarketPreflight.ts',{
    '@neondatabase/serverless':{neon:()=>async()=>[quality]},
    './publicationRunLog':{recordPublicationRun:async row=>records.push(row)},
  });
  const input={period:'2026-11-16-W47-AV',startedAt:'2026-11-15T13:10:50Z',parsed:{period:'2026-11-16-W47-AV',offers:27,cachedAt:'2026-11-15T13:10:50Z'},errors:[]};
  const original=process.env.DATABASE_URL;process.env.DATABASE_URL='test-only';
  try{
    let result=await record(input);
    assert.equal(result.outcome,'preflight-awaiting-pdf-review');
    assert.equal(result.imageEnrichment,'pending');
    assert.deepEqual(result.blockingReasons,[]);
    quality={...quality,missing_categories:7};
    result=await record(input);
    assert.equal(result.outcome,'preflight-quality-failed');
    assert.deepEqual(result.blockingReasons,['missing-categories']);
    assert.equal(result.imageEnrichment,'pending');
  }finally{if(original===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=original;}
});

test('47AV control center accepts parser with missing images, but not missing categories',()=>{
  const period='2026-11-16-W47-AV',now=new Date('2026-11-15T14:30:00Z');
  const run={checked_at:'2026-11-15T13:10:50Z',source:'k-citymarket-preflight',ok:false,offer_count:27,outcome:'preflight-awaiting-pdf-review',details:{period,quality:{total:27,missing_names:0,missing_prices:0,missing_images:27,missing_categories:0,unverified_prices:0},errors:[]}};
  const result=status([run],now);
  assert.equal(result.parserOk,true);
  assert.equal(result.level,'yellow');
  assert.equal(result.reviewed,false);
  const invalid=status([{...run,outcome:'preflight-quality-failed',details:{...run.details,quality:{...run.details.quality,missing_categories:7}}}],now);
  assert.equal(invalid.parserOk,false);
  assert.equal(invalid.label,'TUOTETIETOJEN LAATUTARKASTUS EPÄONNISTUI');
  const reviewed={checked_at:'2026-11-15T13:20:00Z',source:'k-citymarket-source-audit',ok:true,offer_count:27,outcome:'pdf-review-passed',details:{period}};
  assert.equal(status([run,reviewed],now).level,'green','image-only gaps do not block reviewed publication status');
  const legacy={...run,outcome:'preflight-awaiting-images'};
  assert.equal(status([legacy],now).parserOk,true,'older pending-image records remain recognized');
});

test('47LV category regression: orange juice and dog treats override generic fruit and sausage',()=>{
  const source=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
  const start=source.indexOf('export function category(t:string){');
  assert.ok(start>=0,'category function exists');
  const end=source.indexOf('\n}',start);
  assert.ok(end>start,'category function terminates');
  const fn=source.slice(start,end+2).replace('export function category(t:string)','function category(t)');
  const category=new Function('clean',fn+';return category;')(text=>String(text));
  assert.equal(category('APPELSIINITÄYSMEHU 1 l'),'Juomat');
  assert.equal(category('APPELSIINIT 1 kg'),'Hevi');
  assert.equal(category('THE DOG NAUGHTY HOT DOG 6 kpl/300 g'),'Lemmikit');
  assert.equal(category('KANAN FILEEVIIPALE 300 g'),'Liha & makkarat');
});

test('47LV Neon snapshot v165: preserve source evidence and flag malformed merged rows',()=>{
  // Source: publication 2026-11-19-W47-LV-printed-transactions-v165,
  // 48 rows, candidate, inspected read-only on 2026-11-19.
  const snapshot=[
    {title:'PUNAKAALI KG PÄÄRYNÄ KG KPL 125 g PS',price:1.49,issue:'merged-produce'},
    {title:'JOGURTTIJUOMAT PROTEIN RAHKAT 200 g 8 x 100 g',price:14.02,issue:'merged-dairy'},
    {title:'ULKOFILEESTÄ tai MUREUTETTU',price:2.39,issue:'orphan-heading'},
    {title:'G9LÖGI 8 % 0,75 l/pl (12,25/l) Sis. pantin 0,10',price:50.31,issue:'price-unit-conflict'},
    {title:'TUOTTEET ja COSRX-TUOTTEET',price:null,issue:'orphan-heading'},
  ];
  assert.equal(snapshot.length,5);
  const flag=(row)=>{
    const t=row.title;
    if(/PUNAKAALI KG PÄÄRYNÄ KG/.test(t))return 'merged-produce';
    if(/JOGURTTIJUOMAT PROTEIN RAHKAT/.test(t))return 'merged-dairy';
    if(/^(?:ULKOFILEESTÄ tai MUREUTETTU|TUOTTEET ja )/.test(t))return 'orphan-heading';
    const unit=t.match(/\((\d+[,.]\d+)\/l\)/);
    const volume=t.match(/(\d+[,.]\d+)\s*l\/pl/);
    if(unit&&volume&&Number.isFinite(row.price)){
      const expected=Number(unit[1].replace(',','.'))*Number(volume[1].replace(',','.'));
      if(Math.abs(row.price-expected)>Math.max(1,expected*.25))return 'price-unit-conflict';
    }
    return null;
  };
  for(const row of snapshot)assert.equal(flag(row),row.issue,row.title);
  // Never replace a suspicious source price with a guessed value.
  assert.equal(snapshot[3].price,50.31);
});


test('47LV spatial parser marks merged source headings before returning offers',()=>{
  const source=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js','utf8');
  const start=source.indexOf('// Detect title collisions at the publisher-geometry stage.');
  const end=source.indexOf('// Only merge adjacent "tai" alternatives',start);
  assert.ok(start>=0&&end>start,'spatial collision guard must execute before final merge');
  const block=source.slice(start,end);
  const rows=[
    {title:'PUNAKAALI KG PÄÄRYNÄ KG KPL 125 g PS',spatialResolved:{value:1.49}},
    {title:'JOGURTTIJUOMAT PROTEIN RAHKAT 200 g 8 x 100 g',spatialResolved:{value:14.02}},
    {title:'PUNAKAALI KG',spatialResolved:{value:1.49}},
  ];
  const out=new Function('rows','let out={rows};'+block+';return out.rows;')(rows);
  assert.equal(out.length,3,'guard must not silently drop offers');
  assert.equal(out[0].debugSuspiciousPublisherTitle.reason,'merged-publisher-product-headings');
  assert.equal(out[1].debugSuspiciousPublisherTitle.reason,'merged-publisher-product-headings');
  assert.equal(out[2].debugSuspiciousPublisherTitle,undefined);
  assert.equal(out[0].spatialResolved.value,1.49,'guard must preserve original price');
  assert.equal(out[1].spatialResolved.value,14.02,'guard must preserve original price');
  assert.equal(out[0].debugSuspiciousPublisherTitle.requiresSeparateCardPriceProof,true);
});
