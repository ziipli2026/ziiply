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
// Baseline lists priced offers, whereas the parser also returns diagnostic
// rows with no resolved price. Compare like with like.
const priced=parsed.rows.filter(r=>Number(r.spatialResolved?.value)>0&&!r.spatialResolved?.displayOnlyUnitPrice);
const now=new Map(priced.map(r=>[key(r),r]));
const added=[...now].filter(([k])=>!old.has(k)).map(([,r])=>({page:r.page,title:r.title,price:r.spatialResolved?.value||null}));
const missing=[...old].filter(([k])=>!now.has(k)).map(([,r])=>({page:r.page,title:r.title}));
const unresolved=parsed.rows.filter(r=>missing.some(m=>m.page===r.page&&key(m)===key(r))).map(r=>({page:r.page,title:r.title,nearby:r.nearby,spatialResolved:r.spatialResolved,percentageOffer:r.percentageOffer,spatialCandidates:r.spatialCandidates?.slice(0,8),debugRejectedCardPrice:r.debugRejectedCardPrice}));
const percentAsPrice=parsed.rows.filter(r=>Number(r.spatialResolved?.value)>0&&r.percentageOffer&&Math.abs(Number(r.spatialResolved.value)-Number(r.percentageOffer.percent))<0.001).map(r=>({page:r.page,title:r.title,price:r.spatialResolved.value,percent:r.percentageOffer.percent}));
const changed=[...now].filter(([k])=>old.has(k)).flatMap(([k,r])=>{const prev=Number(old.get(k).id.split(':').at(-1));const next=Number(r.spatialResolved?.value);return Math.abs(prev-next)>.011?[{page:r.page,title:r.title,previous:prev,next:Number.isFinite(next)?next:null}]:[]});
console.log('42LV replay',JSON.stringify({pages:parsed.pageCount,rows:parsed.rows.length,pricedOffers:priced.length,archivedRows:baseline.rows.length,added,missing,changed,unresolved,percentAsPrice}));
if(parsed.pageCount!==20||priced.length!==baseline.rows.length||added.length>0||missing.length>0||percentAsPrice.length>0)process.exitCode=1;
