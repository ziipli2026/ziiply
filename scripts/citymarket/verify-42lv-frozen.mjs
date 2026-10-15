import fs from 'node:fs';
import {parseKCitymarketSpatialLeaflet} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParser.js';
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
const printedChecksAllowlist=[{page:13,match:/^KASSLER n\. 2,3 kg$/i},{page:18,match:/^MÄRKÄRUOAT 70 g 420/i},{page:19,match:/^AAKKOSET 280–340 g$/i}];
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
  {page:6,match:/WC-PAPERI 40 rl ja/i,price:24.90,quantity:1},
  {page:20,match:/8-pack/i,price:7.99},
  {page:20,match:/VICHY 0,33 l\/pl 24-pack/i,price:10.99},
  {page:20,match:/WOK-KASTIKKEET 120 g/i,price:1.00},
  {page:18,match:/VITAL HYVINVOINTIMEHUT 1 l/i,price:4.50,quantity:2},
  {page:15,match:/iKAFFE MAUSTAMATON KAURAJUOMA 1 l/i,price:9,quantity:6},
  {page:15,match:/LEMPI RUOKAKERMAT 3 dl/i,price:3,quantity:2},
  {page:17,match:/VIHANNESSEKOITUKSET 300 g/i,price:5,quantity:3},
  {page:17,match:/JÄÄTELÖPUIKOT 64–85 g/i,price:5,quantity:3},
  {page:19,match:/Pringles PERUNA LASTUT/i,price:5,quantity:3},
  {page:18,match:/^SMOOTHIET 120 g$/i,price:5.50,quantity:4},
  {page:18,match:/VIHREÄT TEET 20–25 ps/i,price:3.99,quantity:1},
  {page:18,match:/PURULUUT 160–180 g/i,price:7,quantity:2},
  {page:13,match:/^KASSLER n\. 2,3 kg$/i,price:6.99,quantity:1},
  {page:18,match:/^MÄRKÄRUOAT 70 g 420/i,price:4.20,quantity:4},
  {page:19,match:/^AAKKOSET 280–340 g$/i,price:4.50,quantity:2},
  {page:19,match:/MAKU- ja TUMMASUKLAALEVYT 160–200 g/i,price:10,quantity:4},
];
const printedMismatches=printedChecks.map(check=>{
 const matches=parsed.rows.filter(r=>r.page===check.page&&check.match.test(String(r.title||'')));
 return {page:check.page,pattern:String(check.match),expected:check.price,expectedQuantity:check.quantity||null,actual:matches.map(r=>({title:r.title,value:r.spatialResolved?.value,quantity:r.spatialResolved?.quantity,source:r.spatialResolved?.source}))};
}).filter(r=>r.actual.length!==1||Math.abs(Number(r.actual[0].value)-r.expected)>.011||(r.expectedQuantity&&Number(r.actual[0].quantity)!==r.expectedQuantity));
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
console.log('42LV unpriced review queue',JSON.stringify({count:unpricedReview.length,rows:unpricedReview}));
console.log('42LV unit-rate audit coverage',JSON.stringify({pricedOffers:priced.length,comparable:unitRateCoverage.comparable,notComparableCount:unitRateCoverage.notComparable.length,notComparable:unitRateCoverage.notComparable}));
console.log('42LV replay (snapshot parity only; NOT printed-price approval)',JSON.stringify({pages:parsed.pageCount,rows:parsed.rows.length,pricedOffers:priced.length,archivedRows:baseline.rows.length,added,missing,changed,unresolved,percentageOnly,unjustifiedPercentageOnly,missingPercentage,pricedPercentage,invalidPrices,changedQuantity,quantityUnverified,percentAsPrice}));
if(parsed.rows.length!==96||priced.length!==88||baseline.rows.length!==89||percentageOnly.length!==1||parsed.pageCount!==20||added.some(r=>!printedChecksAllowlist.some(x=>x.page===r.page&&x.match.test(r.title)))||missing.some(r=>!percentageOnly.some(p=>key(p)===key(r)))||percentAsPrice.length>0||unjustifiedPercentageOnly.length>0||missingPercentage.length>0||pricedPercentage.length>0||invalidPrices.length>0||changedQuantity.length>0||unexpectedChanged.length>0)process.exitCode=1;
