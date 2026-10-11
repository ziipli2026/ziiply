import archived41LV from './data/kCitymarket41LVPublisherArchive.json' with {type:'json'};
// Historical 41LV has a manually approved frozen parser baseline.
// The publisher's generic loppuviikon URL is reused between issues, so its
// publication identity must be resolved from the parsed leaflet, not the input URL.
import {parseKCitymarketSpatialLeaflet as parseApproved41LV} from './kCitymarketSpatialParserApproved41LV.js';
import {parseKCitymarketSpatialLeaflet as parseCurrent} from './kCitymarketSpatialParserCurrent.js';
const APPROVED_41LV_PUBLICATION_ID='82qjhs6_tarjouslehti_41lv_kcm';
export async function parseKCitymarketSpatialLeaflet(entry){
 const url=String(entry||'');
 if(process.env.VERCEL_ENV==='preview' && process.env.VERCEL_GIT_COMMIT_REF==='preview/mobile-citymarket-41lv-corrected'){
  const result=await parseCurrent(archived41LV.entry,async input=>{const r=archived41LV.responses[String(input)];if(!r)throw new Error('41LV archive response missing: '+input);return {ok:true,status:200,url:r.url,text:async()=>r.body};});
  return {...result,sourceMode:'immutable-publisher-archive',sourcePdfSha256:'34e790cb72ffb0388be16cc1f4af97115f013a2f10f3bdf10df0c9faa8f46cd6',approvalStatus:'NOT_APPROVED'};
 }
 if(url.toLowerCase().includes(APPROVED_41LV_PUBLICATION_ID))return parseApproved41LV(entry);
 const current=await parseCurrent(entry);
 const resolvedUrl=String(current?.leaflet||current?.leafletUrl||current?.sourceUrl||current?.url||'').toLowerCase();
 if(resolvedUrl.includes(APPROVED_41LV_PUBLICATION_ID))return parseApproved41LV(entry);
 return current;
}
export default parseKCitymarketSpatialLeaflet;
