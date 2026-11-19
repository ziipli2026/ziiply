import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const dir=process.argv[2];
if(!dir)throw Error('Usage: node scripts/citymarket/audit-47lv-capture.mjs CAPTURE_FOLDER');
const load=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
const manifest=load('archive-manifest.json'),evidence=load('parser-evidence.json'),exported=load('leaflet.json');
const provider=fs.readFileSync('src/app/components/ziiply/offerSearch/providers/kCitymarketProvider.ts','utf8');
const expectedSha='3d0769f7ec3c3944163d694abdda85227a70fd33574b015209055af5abc45449';
const pdfSha256=createHash('sha256').update(fs.readFileSync(path.join(dir,'leaflet.pdf'))).digest('hex');
if(!String(manifest.publisherUrl).includes('94s5ius_tarjouslehti_47LV_KCM')||
    pdfSha256!==expectedSha||manifest.pdfSha256!==pdfSha256||manifest.pageCount!==20)
  throw Error('47LV publication or original PDF checksum differs from verified source');
if(!Array.isArray(evidence.rows)||!Array.isArray(exported.rows)||evidence.rows.length<50||exported.rows.length<40)
  throw Error('47LV parser evidence is missing or truncated');

const problems=[];
for(const row of evidence.rows){
  const title=String(row.title||''),value=Number(row.spatialResolved?.value);
  if(row.page===20&&/^G9LÖGI 8 %/.test(title)&&value>20)
    problems.push({page:row.page,title,rawPrice:value,kind:'glogi-overpriced'});
  if(/^(?:TUOTTEET ja COSRX-TUOTTEET|ULKOFILEESTÄ tai MUREUTETTU|NAUDAN LEHTIPIHVI|NAUGHTY BURGER)$/.test(title))
    problems.push({page:row.page,title,rawPrice:Number.isFinite(value)?value:null,kind:'orphan-heading'});
  if(row.debugSuspiciousPublisherTitle?.reason==='merged-publisher-product-headings')
    problems.push({page:row.page,title,kind:'merged-title'});
}

function sourcePart(start,end){
  const a=provider.indexOf(start),b=provider.indexOf(end,a+start.length);
  if(a<0||b<=a)throw Error('Citymarket provider verification section missing: '+start);
  return provider.slice(a,b);
}
// Execute the exact production/provider predicates. The immutable raw source
// must still expose bad OCR: approving a corrected offer is *not* approving
// the bad raw number as a valid transaction.
const ignoreMerged=new Function('leafletUrl','row','console',
  sourcePart('    if(/_47LV_KCM/i.test(leafletUrl) && row?.debugSuspiciousPublisherTitle?.reason',
    '    const campaignTitle=').replace(/continue;/g,'return true;')+'return false;');
const ignoreOrphan=new Function('is47LV','reviewed47LVTitle','resolved','row','console',
  sourcePart('    if(is47LV && (/^HAMMASTAHNARASIAT',
    '    if(is47LV && Number(row?.page)===16 && /^Innocent TÄYSMEHUT')
  .replace(/continue;/g,'return true;')+'return false;');
const correctedPrice=new Function('is47LV','row','reviewed47LVTitle','initialPrice',
  'let price=initialPrice;'+sourcePart(
    '    if(is47LV && Number(row?.page)===16 && /^Innocent TÄYSMEHUT',
    '    // 47LV p17: OCR borrowed')+'return price;');
const appendPdfReviewed=new Function('leafletUrl','sourceRows','offers',
  sourcePart('  if(/94s5ius_tarjouslehti_47LV_KCM/i.test(leafletUrl)){',
    '  const seen=new Set<string>();')
  .replace(/:number/g,'').replace(/:RegExp/g,'').replace(/:any/g,'').replace(/ as CitymarketOffer/g,''));
const url=manifest.publisherUrl,reviewed=[],verified=[],unresolved=[];
appendPdfReviewed(url,evidence.rows,reviewed);
const approvedCards={
  'PUNAKAALI Suomi':[0.99,1],
  'CELINA PÄÄRYNÄ Suomi':[2.99,1],
  'Järvikylä ROSMARIINI Suomi':[2.99,1],
  'Oksasen puutarha JUICY SALAATTI 125 g Suomi':[1.49,1],
  'Arla PROTEIN RAHKAT 200 g':[3.50,4],
  'Danone ACTIMEL JOGURTTIJUOMAT 8 x 100 g':[3.69,1],
  'Vaasan THE BRGR NAUGHTY BURGER 4 kpl/320 g':[2.39,1]
};
const equal=(a,b)=>Math.abs(a-b)<0.000001;
for(const [title,[price,quantity]] of Object.entries(approvedCards)){
  const card=reviewed.find(c=>c.title===title);
  if(!card||!equal(card.price,price)||card.offerQuantity!==quantity)
    unresolved.push({kind:'incorrect-or-missing-pdf-reviewed-offer',title,price,quantity});
}
if(reviewed.length!==15)unresolved.push({kind:'unexpected-reviewed-offer-count',count:reviewed.length});
for(const p of problems){
  const row=evidence.rows.find(r=>r.page===p.page&&r.title===p.title);
  let protectedByProvider=false;
  if(p.kind==='merged-title')protectedByProvider=ignoreMerged(url,row,{warn(){}});
  if(p.kind==='orphan-heading')protectedByProvider=ignoreOrphan(true,p.title,row.spatialResolved||{},row,{warn(){}});
  if(p.kind==='glogi-overpriced')protectedByProvider=
    provider.includes('? "GLÖGI 8 % 0,75 l/pl"')&&
    equal(correctedPrice(true,row,'GLÖGI 8 % 0,75 l/pl',p.rawPrice),9.29);
  if(protectedByProvider)verified.push({...p,resolution:'verified-provider-suppression-or-pdf-correction'});
  else unresolved.push({...p,reason:'raw OCR error not suppressed or PDF-corrected by real provider code'});
}
const expectedProblems=[
  [13,'TUOTTEET ja COSRX-TUOTTEET','orphan-heading'],
  [15,'PUNAKAALI KG PÄÄRYNÄ KG KPL 125 g PS','merged-title'],
  [16,'JOGURTTIJUOMAT PROTEIN RAHKAT 200 g 8 x 100 g','merged-title'],
  [18,'NAUDAN LEHTIPIHVI','orphan-heading'],
  [18,'ULKOFILEESTÄ tai MUREUTETTU','orphan-heading'],
  [18,'NAUGHTY BURGER','orphan-heading'],
  [20,'G9LÖGI 8 % 0,75 l/pl','glogi-overpriced']
];
for(const [page,prefix,kind] of expectedProblems)
  if(!problems.some(p=>p.page===page&&p.kind===kind&&p.title.startsWith(prefix)))
    unresolved.push({page,prefix,kind,reason:'verified source observation changed; recheck required'});
if(problems.length!==7)unresolved.push({kind:'unreviewed-raw-problems',count:problems.length});
const report={issue:'47LV',pdfSha256,sourceRows:evidence.rows.length,exportedRows:exported.rows.length,
  rawProblems:problems,verifiedProviderGuards:verified,reviewedCards:reviewed.map(r=>({
    title:r.title,price:r.price,offerQuantity:r.offerQuantity,validTo:r.validTo})),unresolved};
fs.writeFileSync(path.join(dir,'47lv-quality-report.json'),JSON.stringify(report,null,2));
console.log('KCM_47LV_QUALITY_REPORT',JSON.stringify({
  sourceRows:report.sourceRows,exportedRows:report.exportedRows,rawProblems:problems.length,
  verifiedGuards:verified.length,pdfReviewedOffers:reviewed.length,unresolved:unresolved.length}));
if(unresolved.length){console.error('47LV still unapproved:',JSON.stringify(unresolved));process.exitCode=1;}
