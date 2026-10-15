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
const missingPercentage=baselinePercent.filter(r=>!percentageOnly.some(p=>key(p)===key(r)&&String(r.id).endsWith(':percent:'+p.percent))).map(r=>({page:r.page,title:r.title,id:r.id}));
const pricedPercentage=baselinePercent.filter(r=>now.has(key(r))).map(r=>({page:r.page,title:r.title,price:now.get(key(r)).spatialResolved.value}));
const unresolved=parsed.rows.filter(r=>missing.some(m=>m.page===r.page&&key(m)===key(r))).map(r=>({page:r.page,title:r.title,nearby:r.nearby,spatialResolved:r.spatialResolved,percentageOffer:r.percentageOffer,spatialCandidates:r.spatialCandidates?.slice(0,8),debugRejectedCardPrice:r.debugRejectedCardPrice}));
const percentAsPrice=parsed.rows.filter(r=>Number(r.spatialResolved?.value)>0&&r.percentageOffer&&Math.abs(Number(r.spatialResolved.value)-Number(r.percentageOffer.percent))<0.001).map(r=>({page:r.page,title:r.title,price:r.spatialResolved.value,percent:r.percentageOffer.percent}));
const invalidPrices=priced.filter(r=>!Number.isFinite(Number(r.spatialResolved?.value))||Number(r.spatialResolved.value)<=0||Number(r.spatialResolved.value)>1000||!Number.isInteger(Number(r.spatialResolved.quantity||1))||Number(r.spatialResolved.quantity||1)<1).map(r=>({page:r.page,title:r.title,price:r.spatialResolved.value,quantity:r.spatialResolved.quantity}));
const changedQuantity=[...now].filter(([k])=>old.has(k)&&!/:percent:/.test(String(old.get(k).id||''))).flatMap(([k,r])=>{const raw=old.get(k).quantity;const prev=raw==null?null:Number(raw);const next=Number(r.spatialResolved?.quantity||1);return prev!==null&&Number.isFinite(prev)&&prev!==next?[{page:r.page,title:r.title,previous:prev,next}]:[]});
const quantityUnverified=[...now].filter(([k])=>old.has(k)&&old.get(k).quantity==null&&Number(now.get(k).spatialResolved?.quantity||1)>1).map(([,r])=>({page:r.page,title:r.title,quantity:r.spatialResolved.quantity}));
const changed=[...now].filter(([k])=>old.has(k)).flatMap(([k,r])=>{const prev=Number(old.get(k).id.split(':').at(-1));const next=Number(r.spatialResolved?.value);return Math.abs(prev-next)>.011?[{page:r.page,title:r.title,previous:prev,next:Number.isFinite(next)?next:null}]:[]});
// Publisher PDF cross-check: these are independent printed prices, NOT archive snapshot values.
const printedChecks=[
  {page:6,match:/WC-PAPERI 40 rl ja/i,price:29.90,quantity:2},
  {page:20,match:/8-pack/i,price:7.99},
  {page:20,match:/VICHY 0,33 l\/pl 24-pack/i,price:10.99},
  {page:20,match:/WOK-KASTIKKEET 120 g/i,price:1.00},
  {page:18,match:/VITAL HYVINVOINTIMEHUT 1 l/i,price:4.50,quantity:2},
];
const printedMismatches=printedChecks.map(check=>{
 const matches=parsed.rows.filter(r=>r.page===check.page&&check.match.test(String(r.title||'')));
 return {page:check.page,pattern:String(check.match),expected:check.price,expectedQuantity:check.quantity||null,actual:matches.map(r=>({title:r.title,value:r.spatialResolved?.value,quantity:r.spatialResolved?.quantity,source:r.spatialResolved?.source}))};
}).filter(r=>r.actual.length!==1||Math.abs(Number(r.actual[0].value)-r.expected)>.011||(r.expectedQuantity&&Number(r.actual[0].quantity)!==r.expectedQuantity));
console.log('42LV independently printed PDF checks',JSON.stringify({checks:printedChecks.length,mismatches:printedMismatches}));
if(printedMismatches.length)process.exitCode=1;
const approvedPrintedCorrections=printedChecks.map(x=>x.page+'|'+String(x.match));
const unexpectedChanged=changed.filter(r=>!printedChecks.some(x=>x.page===r.page&&x.match.test(r.title)&&Math.abs(r.next-x.price)<.011));
console.log('42LV replay (snapshot parity only; NOT printed-price approval)',JSON.stringify({pages:parsed.pageCount,rows:parsed.rows.length,pricedOffers:priced.length,archivedRows:baseline.rows.length,added,missing,changed,unresolved,percentageOnly,unjustifiedPercentageOnly,missingPercentage,pricedPercentage,invalidPrices,changedQuantity,quantityUnverified,percentAsPrice}));
if(parsed.rows.length!==96||priced.length!==85||baseline.rows.length!==89||percentageOnly.length!==4||parsed.pageCount!==20||added.length>0||missing.some(r=>!percentageOnly.some(p=>key(p)===key(r)))||percentAsPrice.length>0||unjustifiedPercentageOnly.length>0||missingPercentage.length>0||pricedPercentage.length>0||invalidPrices.length>0||changedQuantity.length>0||unexpectedChanged.length>0)process.exitCode=1;
