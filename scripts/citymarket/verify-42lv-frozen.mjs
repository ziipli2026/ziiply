import fs from 'node:fs';
import {parseKCitymarketSpatialLeaflet} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParser.js';
import {canonicalCitymarketProductRows} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketProductRows.js';
const folder=process.argv[2];
const frozen=JSON.parse(fs.readFileSync(folder+'/publisher-responses.json','utf8'));
const baseline=JSON.parse(fs.readFileSync(folder+'/leaflet.json','utf8'));
globalThis.fetch=async input=>{
 const url=String(input);
 const r=frozen.responses[url];
 if(!r)throw Error('Unarchived publisher request: '+url);
 return {ok:true,status:200,url:r.url,text:async()=>r.body};
};
const parsed=await parseKCitymarketSpatialLeaflet(frozen.entry);
// The provider calls this canonicalization before converting rows to UI offers.
// Check that the two PDF-verified cards remain separate across that boundary.
const canonicalRows=canonicalCitymarketProductRows(parsed.rows);
const canonicalChecks=[
 {match:/^Piltti POHJOISEN MAUT ATERIAT 8 kk 190 g$/i,price:5,quantity:4,unit:'kpl'},
 {match:/^PrimaCat KISSAN KUIVARUOAT 400 g$/i,price:10,quantity:3,unit:'ps'}
];
const canonicalFailures=canonicalChecks.filter(check=>{
 const matches=canonicalRows.filter(row=>row.page===18&&check.match.test(String(row.title||'')));
 return matches.length!==1||Number(matches[0].spatialResolved?.value)!==check.price||
 Number(matches[0].spatialResolved?.quantity)!==check.quantity||
 String(matches[0].spatialResolved?.unit||'').toLowerCase()!==check.unit||
 matches[0].normal!=null||matches[0].unitPrice!=null||matches[0].package!=null;
});
// The final provider offer identity includes page, cleaned title and total
// transaction price. Assert distinct card identities and no stale inherited
// reference-price or package metadata after canonicalization.
const splitCards=canonicalRows.filter(row=>row.page===18&&canonicalChecks.some(check=>check.match.test(String(row.title||''))));
const splitCardIds=splitCards.map(row=>'kcm:spatial:'+row.page+':'+String(row.title||'').trim().toLowerCase()+':'+Number(row.spatialResolved?.value));
const splitMetadataFailures=splitCards.filter(row=>row.normal!=null||row.unitPrice!=null||row.package!=null);
console.log('42LV provider offer identity and metadata',JSON.stringify({ids:splitCardIds,uniqueIds:new Set(splitCardIds).size,staleMetadata:splitMetadataFailures.map(row=>row.title)}));
if(splitCards.length!==2||new Set(splitCardIds).size!==2||splitMetadataFailures.length)process.exitCode=1;
console.log('42LV provider canonicalization boundary',JSON.stringify({rows:canonicalRows.length,checks:canonicalChecks.length,failures:canonicalFailures.map(x=>String(x.match))}));
if(canonicalFailures.length)process.exitCode=1;
const key=r=>String(r.page)+'|'+String(r.title||'').trim().toLowerCase().replace(/\s+/g,' ');
const old=new Map(baseline.rows.map(r=>[key(r),r]));
if(old.size!==baseline.rows.length)throw Error('Duplicate offer identity in archived snapshot');
// Baseline lists priced offers, whereas the parser also returns diagnostic
// rows with no resolved price. Compare like with like.
const priced=parsed.rows.filter(r=>Number(r.spatialResolved?.value)>0&&!r.spatialResolved?.displayOnlyUnitPrice);
const now=new Map(priced.map(r=>[key(r),r]));
if(now.size!==priced.length)throw Error('Duplicate priced offer identity in replay');
const added=[...now].filter(([k])=>!old.has(k)).map(([,r])=>({page:r.page,title:r.title,price:r.spatialResolved?.value||null}));
const percentageOnly=parsed.rows.filter(r=>!(Number(r.spatialResolved?.value)>0)&&Number(r.percentageOffer?.percent)>0).map(r=>({page:r.page,title:r.title,percent:r.percentageOffer.percent}));
const unjustifiedPercentageOnly=percentageOnly.filter(r=>{const prior=old.get(key(r));return !prior||!String(prior.id||'').endsWith(':percent:'+r.percent);});
const missing=[...old].filter(([k])=>!now.has(k)).map(([,r])=>({page:r.page,title:r.title}));
const baselinePercent=baseline.rows.filter(r=>/:percent:\d+(?:\.\d+)?$/.test(String(r.id||'')));
const printedChecksAllowlist=[{page:18,match:/^Piltti POHJOISEN MAUT ATERIAT 8 kk 190 g$/i},{page:18,match:/^PrimaCat KISSAN KUIVARUOAT 400 g$/i},{page:3,match:/TYÖKÄSINEET 235/i},{page:7,match:/NAHKAKÄSINEET/i},{page:15,match:/TÄYSMEHUT 900 ml/i},{page:18,match:/TRIP MEHUT 2 dl 24-pack/i},{page:19,match:/^VIRVOITUSJUOMA 0,33 l\/pl 24-pack$/i},{page:13,match:/^KASSLER n\. 2,3 kg$/i},{page:18,match:/^MÄRKÄRUOAT 70 g 420/i},{page:19,match:/^AAKKOSET 280–340 g$/i}];
const missingPercentage=baselinePercent.filter(r=>!printedChecksAllowlist.some(x=>x.page===r.page&&x.match.test(r.title))&&!percentageOnly.some(p=>key(p)===key(r)&&String(r.id).endsWith(':percent:'+p.percent))).map(r=>({page:r.page,title:r.title,id:r.id}));
const pricedPercentage=baselinePercent.filter(r=>now.has(key(r))&&!printedChecksAllowlist.some(x=>x.page===r.page&&x.match.test(r.title))).map(r=>({page:r.page,title:r.title,price:now.get(key(r)).spatialResolved.value}));
const unresolved=parsed.rows.filter(r=>missing.some(m=>m.page===r.page&&key(m)===key(r))).map(r=>({page:r.page,title:r.title,nearby:r.nearby,spatialResolved:r.spatialResolved,percentageOffer:r.percentageOffer,spatialCandidates:r.spatialCandidates?.slice(0,8),debugRejectedCardPrice:r.debugRejectedCardPrice}));
const percentAsPrice=parsed.rows.filter(r=>Number(r.spatialResolved?.value)>0&&r.percentageOffer&&Math.abs(Number(r.spatialResolved.value)-Number(r.percentageOffer.percent))<0.001).map(r=>({page:r.page,title:r.title,price:r.spatialResolved.value,percent:r.percentageOffer.percent}));
const invalidPrices=priced.filter(r=>!Number.isFinite(Number(r.spatialResolved?.value))||Number(r.spatialResolved.value)<=0||Number(r.spatialResolved.value)>1000||!Number.isInteger(Number(r.spatialResolved.quantity||1))||Number(r.spatialResolved.quantity||1)<1).map(r=>({page:r.page,title:r.title,price:r.spatialResolved.value,quantity:r.spatialResolved.quantity}));
const changedQuantity=[...now].filter(([k])=>old.has(k)&&!/:percent:/.test(String(old.get(k).id||''))).flatMap(([k,r])=>{const raw=old.get(k).quantity;const prev=raw==null?null:Number(raw);const next=Number(r.spatialResolved?.quantity||1);return prev!==null&&Number.isFinite(prev)&&prev!==next?[{page:r.page,title:r.title,previous:prev,next}]:[]});
const quantityUnverified=[...now].filter(([k])=>old.has(k)&&old.get(k).quantity==null&&Number(now.get(k).spatialResolved?.quantity||1)>1).map(([,r])=>({page:r.page,title:r.title,quantity:r.spatialResolved.quantity}));
const changed=[...now].filter(([k])=>old.has(k)).flatMap(([k,r])=>{const prev=Number(old.get(k).id.split(':').at(-1));const next=Number(r.spatialResolved?.value);return Math.abs(prev-next)>.011?[{page:r.page,title:r.title,previous:prev,next:Number.isFinite(next)?next:null}]:[]});
// Publisher PDF cross-check: these are independent printed prices, NOT archive snapshot values.
const printedChecks=[
  {page:18,match:/^Piltti POHJOISEN MAUT ATERIAT 8 kk 190 g$/i,price:5,quantity:4,unit:'kpl'},
  {page:18,match:/^PrimaCat KISSAN KUIVARUOAT 400 g$/i,price:10,quantity:3,unit:'ps'},
  {page:6,match:/WC-PAPERI 40 rl ja/i,price:24.90,quantity:1,unit:'setti'},
  {page:20,match:/8-pack/i,price:7.99},
  {page:20,match:/VICHY 0,33 l\/pl 24-pack/i,price:10.99},
  {page:20,match:/WOK-KASTIKKEET 120 g/i,price:1.00},
  {page:18,match:/VITAL HYVINVOINTIMEHUT 1 l/i,price:4.50,quantity:2},
  {page:15,match:/iKAFFE MAUSTAMATON KAURAJUOMA 1 l/i,price:9,quantity:6},
  {page:15,match:/LEMPI RUOKAKERMAT 3 dl/i,price:3,quantity:2},
  {page:17,match:/VIHANNESSEKOITUKSET 300 g/i,price:5,quantity:3,unit:'ps'},
  {page:17,match:/JÄÄTELÖPUIKOT 64–85 g/i,price:5,quantity:3},
  {page:19,match:/Pringles PERUNA LASTUT/i,price:5,quantity:3},
  {page:18,match:/^SMOOTHIET 120 g$/i,price:5.50,quantity:4},
  {page:18,match:/VIHREÄT TEET 20–25 ps/i,price:3.99,quantity:1},
  {page:18,match:/PURULUUT 160–180 g/i,price:7,quantity:2},
  {page:13,match:/^KASSLER n\. 2,3 kg$/i,price:6.99,quantity:1},
  {page:18,match:/^MÄRKÄRUOAT 70 g 420/i,price:4.20,quantity:4},
  {page:19,match:/^AAKKOSET 280–340 g$/i,price:4.50,quantity:2},
  {page:15,match:/RASVATON MAITORAHKA ja/i,price:4,quantity:6,unit:'prk'},
  {page:15,match:/PIRTELÖT 200 ml/i,price:2.50,quantity:2,unit:'kpl'},
  {page:19,match:/MAISSIKAKUT 130 g/i,price:4,quantity:2},
  {page:19,match:/PASTA-\s*KASTIKKEET/i,price:5,quantity:2,unit:'prk'},
  {page:19,match:/TANGLE PASTA/i,price:5,quantity:3},
  {page:3,match:/TYÖKÄSINEET 235/i,price:6,quantity:1},
  {page:7,match:/NAHKAKÄSINEET/i,price:9,quantity:1},
  {page:15,match:/TÄYSMEHUT 900 ml/i,price:3.79,quantity:1},
  {page:18,match:/TRIP MEHUT 2 dl 24-pack/i,price:10,quantity:1,unit:'24-pack'},
  {page:19,match:/^VIRVOITUSJUOMA 0,33 l\/pl 24-pack$/i,price:13.99,quantity:1,unit:'24-pack'},
  {page:19,match:/MAKU- ja TUMMASUKLAALEVYT 160–200 g/i,price:10,quantity:4},
];
const printedMismatches=printedChecks.map(check=>{
 const matches=parsed.rows.filter(r=>r.page===check.page&&check.match.test(String(r.title||'')));
 return {page:check.page,pattern:String(check.match),expected:check.price,expectedQuantity:check.quantity||null,expectedUnit:check.unit||null,actual:matches.map(r=>({title:r.title,value:r.spatialResolved?.value,quantity:r.spatialResolved?.quantity,unit:r.spatialResolved?.unit,source:r.spatialResolved?.source}))};
}).filter(r=>r.actual.length!==1||Math.abs(Number(r.actual[0].value)-r.expected)>.011||(r.expectedQuantity&&Number(r.actual[0].quantity)!==r.expectedQuantity)||(r.expectedUnit&&String(r.actual[0].unit||'').toLowerCase()!==r.expectedUnit));
console.log('42LV independently printed PDF checks',JSON.stringify({checks:printedChecks.length,mismatches:printedMismatches}));
if(printedMismatches.length)process.exitCode=1;
const approvedPrintedCorrections=printedChecks.map(x=>x.page+'|'+String(x.match));
const unexpectedChanged=changed.filter(r=>!printedChecks.some(x=>x.page===r.page&&x.match.test(r.title)&&Math.abs(r.next-x.price)<.011));
// Triage all priced rows for independently verifiable unit-rate mismatches.
// This is an audit report, not a price rewrite: mixed offers and pack totals
// require printed-page review before any correction.
const unitRateAudit=parsed.rows.flatMap(row=>{
 const price=Number(row.spatialResolved?.value);
 if(!(price>0))return [];
 const title=String(row.title||'');
 const gram=title.match(/(?:^|\s)(\d{2,4})\s*g\b/i);
 const kg=title.match(/\((\d+[,.]\d+)\s*\/\s*kg\)/i);
 const liter=title.match(/(?:^|\s)(\d+[,.]\d+)\s*l\b/i);
 const perLiter=title.match(/\((\d+[,.]\d+)\s*\/\s*l\)/i);
 const decimal=s=>Number(s.replace(',','.'));
 let expected=null,kind=null;
 if(gram&&kg){expected=decimal(gram[1])*decimal(kg[1])/1000;kind='kg';}
 else if(liter&&perLiter){expected=decimal(liter[1])*decimal(perLiter[1]);kind='l';}
 if(expected==null)return [];
 const quantity=Number(row.spatialResolved?.quantity||1);
 const packageMatch=title.match(/\b(\d+)\s*[x×]\s*\d{2,4}\s*g\b/i);
 const packageCount=packageMatch?Number(packageMatch[1]):1;
 const totalUnits=packageCount*Math.max(1,quantity);
 const expectedTotal=expected*totalUnits;
 const delta=Math.abs(price-expectedTotal);
 // Compare the full transaction price, not the single-container price.
 // Keep multi-buy discrepancies for manual review when the total still disagrees.
 return delta>Math.max(.10,expectedTotal*.08)?[{page:row.page,title,price,quantity,expectedUnitPrice:Number(expected.toFixed(2)),expectedTotal:Number(expectedTotal.toFixed(2)),unit:kind,source:row.spatialResolved?.source}]:[];
});
console.log('42LV unit-rate discrepancy triage (review required, no automatic corrections)',JSON.stringify({count:unitRateAudit.length,rows:unitRateAudit}));
// Make audit coverage explicit: zero discrepancies does not mean all offers were checked.
const unitRateCoverage=priced.reduce((acc,row)=>{
 const title=String(row.title||'');
 const hasMass=/(?:^|\s)\d{2,4}\s*g\b/i.test(title)&&/\(\d+[,.]\d+\s*\/\s*kg\)/i.test(title);
 const hasVolume=/(?:^|\s)\d+[,.]\d+\s*l\b/i.test(title)&&/\(\d+[,.]\d+\s*\/\s*l\)/i.test(title);
 if(hasMass||hasVolume)acc.comparable++;
 else acc.notComparable.push({page:row.page,title:row.title});
 return acc;
},{comparable:0,notComparable:[]});
// Flag rows that still carry a product-like title but have no euro price.
// These require original-page review; a percent badge is not a price.
const unpricedReview=parsed.rows.filter(row=>!(Number(row.spatialResolved?.value)>0)).map(row=>({
 page:row.page,title:row.title,percent:row.percentageOffer?.percent??null,
 candidatePrices:(row.spatialCandidates||[]).slice(0,4).map(x=>({value:x.value,quantity:x.quantity??null,kind:x.kind??null}))
}));
// Original 42LV PDF review: p.2 detergent title is split across two
// parser rows; p.4 Biozell and p.5 Vichy are percentage-only promotions.
// Never invent euro prices from adjacent offers for these entries.
const reviewedUnpriced=[
 {page:2,match:/^PYYKINPESUNESTEET 850 ml$/i,classification:'continuation-of-detergent-multibuy'},
 {page:4,match:/^BIOZELL HIUSTEN MUOTOILUTUOTTEET/i,classification:'printed-percentage-only-25'},
 {page:5,match:/^VICHY ja TRIPLE DRY DEODORANTIT/i,classification:'printed-percentage-only-20'}
];
const unpricedUnexpected=unpricedReview.filter(r=>!reviewedUnpriced.some(x=>x.page===r.page&&x.match.test(r.title)));
const unpricedMissing=reviewedUnpriced.filter(x=>!unpricedReview.some(r=>r.page===x.page&&x.match.test(r.title)));
console.log('42LV original PDF unpriced classification',JSON.stringify({reviewed:reviewedUnpriced.map(x=>({page:x.page,classification:x.classification})),unexpected:unpricedUnexpected,missing:unpricedMissing}));
if(unpricedUnexpected.length||unpricedMissing.length)process.exitCode=1;
// Detect parser rows that concatenate separate printed offers. These are
// review findings, not safe targets for a price-only override.
const mergedOfferReview=parsed.rows.filter(row=>/ATERIAT 8 kk 190 g.*KISSAN KUIVARUOAT 400 g/i.test(String(row.title||''))).map(row=>({
 page:row.page,title:row.title,price:row.spatialResolved?.value??null,
 quantity:row.spatialResolved?.quantity??null,
 issue:'two separately priced products merged into one row',
 printedOffers:[
  {product:'Piltti Pohjoisen maut ateriat 190 g',quantity:4,unit:'kpl',price:5},
  {product:'PrimaCat kissan kuivaruoka 400 g',quantity:3,unit:'ps',price:10}
 ]
}));
console.log('42LV merged offer manual review',JSON.stringify({count:mergedOfferReview.length,rows:mergedOfferReview}));
if(mergedOfferReview.length!==0)process.exitCode=1;
console.log('42LV unpriced review queue',JSON.stringify({count:unpricedReview.length,rows:unpricedReview}));
console.log('42LV unit-rate audit coverage',JSON.stringify({pricedOffers:priced.length,comparable:unitRateCoverage.comparable,notComparableCount:unitRateCoverage.notComparable.length,notComparable:unitRateCoverage.notComparable}));
console.log('42LV replay (snapshot parity only; NOT printed-price approval)',JSON.stringify({pages:parsed.pageCount,rows:parsed.rows.length,pricedOffers:priced.length,archivedRows:baseline.rows.length,added,missing,changed,unresolved,percentageOnly,unjustifiedPercentageOnly,missingPercentage,pricedPercentage,invalidPrices,changedQuantity,quantityUnverified,percentAsPrice}));
if(parsed.rows.length!==97||priced.length!==94||baseline.rows.length!==89||percentageOnly.length!==1||parsed.pageCount!==20||added.some(r=>!printedChecksAllowlist.some(x=>x.page===r.page&&x.match.test(r.title)))||missing.some(r=>!percentageOnly.some(p=>key(p)===key(r))&&!(r.page===18&&/ATERIAT 8 kk 190 g.*KISSAN KUIVARUOAT 400 g/i.test(r.title)))||percentAsPrice.length>0||unjustifiedPercentageOnly.length>0||missingPercentage.length>0||pricedPercentage.length>0||invalidPrices.length>0||changedQuantity.length>0||unexpectedChanged.length>0)process.exitCode=1;
