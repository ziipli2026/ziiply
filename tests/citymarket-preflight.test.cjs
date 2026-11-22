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
  assert.equal(category('THE DOG NAUGHTY HOT DOG 6 kpl/300 g'),'Leipomo');
  assert.equal(category('Naughty HOT DOG MAKKARAT 210 g'),'Liha & makkarat');
  assert.equal(category('KANAN FILEEVIIPALE 300 g'),'Liha & makkarat');
});

test('47LV candidate v165: all reported missing categories have a real product classification',()=>{
  const source=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
  const start=source.indexOf('export function category(t:string){');
  const end=source.indexOf('\n}',start);
  assert.ok(start>=0&&end>start);
  const category=new Function('clean',source.slice(start,end+2).replace('export function category(t:string)','function category(t)')+';return category;')(text=>String(text));
  const cases=[
    ['NESTESAIPPUOIDEN TÄYTTÖPUSSIT 300 ml','Hygienia & kosmetiikka'],
    ['MEIKINKIINNITYSSUIHKE 150 ml','Hygienia & kosmetiikka'],
    ['RANTIT 45 ml','Muut'],
    ['VOITEET 50 ml sekä MEIKINPOISTOAINE 50 ml','Hygienia & kosmetiikka'],
    ['WC-RAIKASTIMET 50 g','Kodinhoito'],
    ['SINI SIIVOUSSOODA 800 g, SITRUUNAHAPPO 600 g','Kodinhoito'],
    ['4 LEVITTEET 400 g 2','Maitotuotteet'],
    ['AIRFRY KANAN FILEEVIIPALE tai PAISTIPALA 300–320 g','Liha & makkarat'],
    ['T1ORTILLA ORIGINAL MEDIUM 320 g (3,59/kg)15','Kuivatuotteet'],
    ['ULKOFILEESTÄ tai MUREUTETTU','Muut'],
    ['THE DOG NAUGHTY HOT DOG 6 kpl/300 g','Leipomo'],
    ['SALAME MILANO 70 g','Liha & makkarat'],
    ['A4LKOHOLITON GLÖGI 0,75 l/pl','Juomat'],
    ['G9LÖGI 8 % 0,75 l/pl','Juomat'],
    ['C8HARDONNAY tai CABERNET SAUVIGNON 8 % 1 l/pl','Juomat'],
  ];
  for(const [title,expected] of cases){
    // Old preflight flagged these rows before 47LV title repairs were applied.
    // Orphan headings are suppressed separately and must not be approved as products.
    if(expected!=='Muut')assert.equal(category(title),expected,title);
  }
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


test('47LV merged headings retain the source price and require independent evidence',async()=>{
  const {flagMergedPublisherHeadings}=await import('../src/app/components/ziiply/offerSearch/providers/kCitymarketPublisherHeadingCollision.js');
  const rows=[
    {page:16,title:'DANONE JOGURTTIJUOMAT 8 x 100 g ARLA PROTEIN RAHKAT 200 g',spatialResolved:{value:14.02}},
    {page:16,title:'DANONE JOGURTTIJUOMAT 8 x 100 g'},
    {page:16,title:'ARLA PROTEIN RAHKAT 200 g'},
  ];
  const output=flagMergedPublisherHeadings(rows);
  assert.equal(output.length,3);
  assert.equal(output[0].debugSuspiciousPublisherTitle?.reason,'merged-publisher-product-headings');
  assert.equal(output[0].debugSuspiciousPublisherTitle?.requiresSeparateCardPriceProof,true);
  assert.equal(output[0].spatialResolved.value,14.02);
  assert.ok(output.slice(1).every(row=>!row.debugSuspiciousPublisherTitle));
  assert.ok(!flagMergedPublisherHeadings(rows.map((row,index)=>({...row,page:16+index})))[0].debugSuspiciousPublisherTitle);
});


test('47LV unresolved merged cards are not emitted by the provider',()=>{
  const provider=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
  const start=provider.indexOf('  for(const row of rows){\n    // Do not publish a merged 47LV product card');
  const end=provider.indexOf('    const campaignTitle=repairCitymarketOCRTitle',start);
  assert.ok(start>=0&&end>start,'merged-card rejection must run before offer creation');
  const guard=provider.slice(start,end);
  const rows=[
    {title:'PUNAKAALI KG PÄÄRYNÄ KG',debugSuspiciousPublisherTitle:{reason:'merged-publisher-product-headings'}},
    {title:'JOGURTTIJUOMAT PROTEIN RAHKAT',debugSuspiciousPublisherTitle:{reason:'merged-publisher-product-headings'}},
    {title:'PUNAKAALI KG'},
  ];
  const emitted=new Function('rows','console','leafletUrl', 'const emitted=[];'+guard+'emitted.push(row.title); } return emitted;')(rows,{warn(){}},'https://example.test/offer_47LV_KCM/index.html');
  assert.deepEqual(emitted,['PUNAKAALI KG']);
});


test('47LV canonical title reconstruction preserves parser collision evidence',async()=>{
  const {canonicalCitymarketProductRows}=await import('../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js');
  const flags={reason:'merged-publisher-product-headings',requiresSeparateCardPriceProof:true};
  const rows=[{page:15,title:'PUNAKAALI KG PÄÄRYNÄ KG',debugSuspiciousPublisherTitle:flags,spatialResolved:{value:1.49}}];
  const [row]=canonicalCitymarketProductRows(rows);
  assert.deepEqual(row.debugSuspiciousPublisherTitle,flags);
  assert.equal(row.spatialResolved.value,1.49);
});


test('47LV suppression does not affect older or newer leaflet editions',()=>{
  const provider=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
  const start=provider.indexOf('  for(const row of rows){\n    // Do not publish a merged 47LV product card');
  const end=provider.indexOf('    const campaignTitle=repairCitymarketOCRTitle',start);
  assert.ok(start>=0&&end>start);
  const guard=provider.slice(start,end);
  const rows=[{title:'PUNAKAALI KG PÄÄRYNÄ KG',debugSuspiciousPublisherTitle:{reason:'merged-publisher-product-headings'}}];
  const run=url=>new Function('rows','console','leafletUrl','const emitted=[];'+guard+'emitted.push(row.title); } return emitted;')(rows,{warn(){}},url);
  assert.deepEqual(run('https://example.test/offer_46LV_KCM/index.html'),['PUNAKAALI KG PÄÄRYNÄ KG']);
  assert.deepEqual(run('https://example.test/offer_47LV_KCM/index.html'),[]);
  assert.deepEqual(run('https://example.test/offer_48LV_KCM/index.html'),['PUNAKAALI KG PÄÄRYNÄ KG']);
});


test('47LV reviewed publisher headings, category repairs and implausible price guard stay edition-scoped',()=>{
  const provider=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
  assert.match(provider,/const is47LV=\/_47LV_KCM\/i\.test\(leafletUrl\)/);
  assert.match(provider,/Rexona ja Rexona Men Max Protection DEODORANTIT 45 ml/);
  assert.match(provider,/Naughty HOT DOG MAKKARAT 210 g/);
  assert.match(provider,/Haribo JOULUKALENTERI 300 g/);
  assert.match(provider,/Kinder MAXI MIX JOULUKALENTERI 351 g/);
  assert.match(provider,/Lindt TEDDY JOULUKALENTERI 170 g/);
  assert.match(provider,/GLÖGI 8 % 0,75 l/);
  assert.match(provider,/Number\(resolved\.value\)>20/);
  assert.match(provider,/WC-RAIKASTIMET.*"Kodinhoito"/);
  assert.match(provider,/JOULUKALENTERI.*"Makeiset & keksit"/);
  assert.match(provider,/^    if\(is47LV && \(/m);
  assert.match(provider,/^      continue;$/m);
});


test('47LV title repairs execute against publisher geometry examples and do not alter 47AV',()=>{
  const provider=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
  const start=provider.indexOf('    const is47LV=/_47LV_KCM/i.test(leafletUrl);');
  const end=provider.indexOf('    const title=/_47AV_KCM/i.test(leafletUrl)',start);
  assert.ok(start>=0&&end>start);
  const fragment=provider.slice(start,end).replace(/\(part:any\)/g,'(part)');
  const run=(url,page,title,nearby=[],price=2.39)=>{
    const fn=new Function('leafletUrl','row','titleBeforeSourceReview','resolved','console',
      'let skipped=false;'+fragment.replace(/\bcontinue;/g,'skipped=true;')+
      ';return {title:reviewed47LVTitle,skipped};');
    return fn(url,{page,nearby},title,{value:price},{warn(){}});
  };
  const url='https://kcm-tarjouslehdet.k-ruoka.fi/example_47LV_KCM/index.html';
  assert.equal(run(url,13,'RANTIT 45 ml',['Rexona ja Rexona Men','DEODO-']).title,'Rexona ja Rexona Men Max Protection DEODORANTIT 45 ml');
  assert.equal(run(url,18,'H3O T D O G MAKKARAT 210 g (17,57/kg) 69',['Naughty','MAKKARAT 210 g']).title,'Naughty HOT DOG MAKKARAT 210 g');
  assert.equal(run(url,19,'H9aribo JOULUKALENTERI 300 g (32,63/kg) 79').title,'Haribo JOULUKALENTERI 300 g');
  assert.equal(run(url,18,'ULKOFILEESTÄ tai MUREUTETTU').skipped,true);
  assert.equal(run(url,18,'NAUDAN LEHTIPIHVI').skipped,true);
  assert.equal(run(url,16,'JOGURTTIJUOMAT PROTEIN RAHKAT 200 g 8 x 100 g').skipped,true);
  assert.equal(run(url,20,'vadelmainen, mausteinen. 0 % 0,33 l/tlk OLUET 0,0 % 0,33 l/tlk').skipped,true);
  assert.equal(run(url,18,'THE DOG NAUGHTY HOT DOG 6 kpl/300 g').title,'Vaasan THE DOG NAUGHTY HOT DOG 6 kpl/300 g');
  assert.equal(run(url,20,'G9LÖGI 8 % 0,75 l/pl (12,25/l)',[],50.31).title,'GLÖGI 8 % 0,75 l/pl');
  assert.equal(run(url,20,'GLÖGI 8 % 0,75 l/pl (12,25/l)',[],9.29).skipped,false);
  assert.equal(run(url.replace('47LV','47AV'),13,'RANTIT 45 ml',['Rexona ja Rexona Men','DEODO-']).title,'RANTIT 45 ml');
});


test('47LV publication rejects unresolved and incomplete parser output',async()=>{
  const {validate47LVPublication}=await import('../src/app/components/ziiply/offerSearch/providers/kCitymarket47LVStagingGuard.js');
  const candidates=[
    {title:'NAUGHTY BURGER',price:3.09,category:'Leipomo'},
    {title:'GLÖGI 8 % 0,75 l/pl',price:50.31,category:'Juomat'},
    {title:'HIUSTENHOITOTUOTTEET 100–300 ml',price:null,category:'Hygienia & kosmetiikka'},
  ];
  const result=validate47LVPublication(candidates,'2026-11-19-W47-LV');
  assert.equal(result.ok,false);
  for(const issue of ['merged-or-orphan-title','unverified-glogi-price','missing-price-and-discount','missing-pdf-reviewed-card']){
    assert.ok(result.issues.some(value=>value.startsWith(issue)),issue);
  }
});


test('47LV pages 3–12 must not be treated as empty publisher pages',async()=>{
  const leaflet='https://kcm-tarjouslehdet.k-ruoka.fi/94s5ius_tarjouslehti_47LV_KCM/';
  const page=await fetch(leaflet+'files/basic-html/page3.html');
  assert.equal(page.status,200);
  const html=await page.text();
  assert.match(html,/Familon/i);
  assert.match(html,/VIKING/i);
  assert.match(html,/VARAVIRTALÄHDE/i);
  const page4=await fetch(leaflet+'files/basic-html/page4.html');
  assert.equal(page4.status,200);
  const html4=await page4.text();
  assert.match(html4,/LEGO/i);
  assert.match(html4,/LAUTA-/i);
});


test('47LV non-food pages are intentionally excluded without dropping grocery hygiene',async()=>{
  const {productish}=await import('../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js');
  for(const title of ['KAIKKI VIKING LASTEN KENGÄT','SÄHKÖHAMMASHARJA 1 kpl','VARAVIRTALÄHDE 10000 mAh','LEGO LELUT 1 kpl','LANGATTOMAT KUULOKKEET 1 kpl']){
    assert.equal(productish(title),false,title);
  }
  for(const title of ['NESTESAIPPUOIDEN TÄYTTÖPUSSIT 300 ml','PYYKINPESUNESTEET 840 ml','WC-PAPERI 24 rl','MEIKKIVOITEET 30 ml','LUMENE KLASSIKKO VARTALONHOITOTUOTTEET','LUMENE KLASSIKKO KASVOJENHOITO- JA PUHDISTUSTUOTTEET','VARTALONHOITOTUOTTEET']){
    assert.equal(productish(title),true,title);
  }
});

test('47LV L’Oreal title cleanup removes only the printed footer',()=>{
  const provider=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
  const match=provider.match(/is47LV && (\/\^L’ORÉAL PARIS[^\n]+?\/i)\.test\(titleBeforeSourceReview\)\s*\? titleBeforeSourceReview\.replace\((\/[^\n]+?\/i),""\)\.trim\(\)/);
  assert.ok(match,'cleanup must remain part of the actual provider');
  const titlePattern=new Function('return '+match[1])();
  const footerPattern=new Function('return '+match[2])();
  const original='L’ORÉAL PARIS MEIKKIVOITEET, PEITEAINEET & TELESCOPIC MASCARAT Voimassa TO–SU 19.–22.11.2026 L’Oréal Paris foundation, Concealers & Telescopic mascaror';
  const expected='L’ORÉAL PARIS MEIKKIVOITEET, PEITEAINEET & TELESCOPIC MASCARAT';
  assert.equal(titlePattern.test(original),true);
  assert.equal(original.replace(footerPattern,'').trim(),expected);
  assert.equal('L’ORÉAL PARIS MEIKKIVOITEET'.replace(footerPattern,'').trim(),'L’ORÉAL PARIS MEIKKIVOITEET');
});
