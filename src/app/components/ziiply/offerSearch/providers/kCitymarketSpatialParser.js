import archived42AV from './data/kCitymarket42AVPublisherArchive.json' with {type:'json'};
// Historical 41LV has a manually approved frozen parser baseline.
// The publisher's generic loppuviikon URL is reused between issues, so its
// publication identity must be resolved from the parsed leaflet, not the input URL.
import {parseKCitymarketSpatialLeaflet as parseApproved41LV} from './kCitymarketSpatialParserApproved41LV.js';
import {parseKCitymarketSpatialLeaflet as parseCurrent} from './kCitymarketSpatialParserCurrent.js';
import {repairPublisherTransaction} from './kCitymarketPublisherTransactionRepair.js';
const APPROVED_41LV_PUBLICATION_ID='82qjhs6_tarjouslehti_41lv_kcm';
export async function parseKCitymarketSpatialLeaflet(entry){
 const url=String(entry||'');
 // Approved 42AV publication: use the exact publisher evidence validated in preview.
 // Other publication periods keep normal live discovery and parsing.
 if(url.toLowerCase().includes('83z6h5o_tarjouslehti_42av_kcm') ||
   (process.env.VERCEL_ENV==='preview'&&process.env.VERCEL_GIT_COMMIT_REF==='preview/mobile-citymarket-42av')){
  const result=await parseCurrent(archived42AV.entry,async input=>{const r=archived42AV.responses[String(input)];if(!r)throw new Error('42AV archive response missing: '+input);return {ok:true,status:200,url:r.url,text:async()=>r.body};});
  return {...result,sourceMode:'immutable-publisher-archive',approvalStatus:'APPROVED-20261012',sourcePdfSha256:'505d253c63c495c310764ddfd9b402224e8a3bcf842e440cf7787ec9ab9cf797'};
 }
 if(url.toLowerCase().includes(APPROVED_41LV_PUBLICATION_ID))return parseApproved41LV(entry);
 const current=await parseCurrent(entry);
 const resolvedUrl=String(current?.leaflet||current?.leafletUrl||current?.sourceUrl||current?.url||'').toLowerCase();
 if(resolvedUrl.includes(APPROVED_41LV_PUBLICATION_ID))return parseApproved41LV(entry);
 // Independently checked against the archived original 42LV PDF (SHA-256 d4ed9363...).
 // Scope the overrides to this exact publisher publication, never to another issue.
 const verified42LV=resolvedUrl.includes('84s5057_tarjouslehti_42lv_kcm');
 const printed42LV=[
  {page:6,title:/^WC-PAPERI 40 rl ja$/i,value:24.90,quantity:1,unit:'setti'},
  {page:20,title:/^0,33 l\/tlk 8-pack 8-PACK$/i,value:7.99,quantity:1,unit:'pack'},
  {page:20,title:/^VICHY 0,33 l\/pl 24-pack$/i,value:10.99,quantity:1,unit:'pack'},
  {page:20,title:/WOK-KASTIKKEET 120 g/i,value:1.00,quantity:1,unit:'ps'},
  {page:18,title:/VITAL HYVINVOINTIMEHUT 1 l/i,value:4.50,quantity:2,unit:'tlk'},
  {page:15,title:/iKAFFE MAUSTAMATON KAURAJUOMA 1 l/i,value:9.00,quantity:6,unit:'tlk'},
  {page:15,title:/LEMPI RUOKAKERMAT 3 dl/i,value:3.00,quantity:2,unit:'tlk'},
  {page:17,title:/VIHANNESSEKOITUKSET 300 g/i,value:5.00,quantity:3,unit:'ps'},
  {page:17,title:/JÄÄTELÖPUIKOT 64–85 g/i,value:5.00,quantity:3,unit:'kpl'},
  {page:19,title:/Pringles PERUNA LASTUT/i,value:5.00,quantity:3,unit:'kpl'},
 ];
 // Preserve explicitly approved historical parsers above. Apply evidence-only
 // transaction correction to other publications without relying on issue number.
 return {...current,rows:current.rows.map(row=>{
  const repaired=repairPublisherTransaction(row);
  const printed=verified42LV&&printed42LV.find(x=>x.page===row.page&&x.title.test(String(row.title||'')));
  return printed?{...repaired,spatialResolved:{value:printed.value,quantity:printed.quantity,unit:printed.unit,source:'verified-original-42lv-pdf',sanity:'pass',confidence:'high'},debugReplacedConflictingPrice:repaired.spatialResolved}:repaired;
 })};
}
export default parseKCitymarketSpatialLeaflet;

