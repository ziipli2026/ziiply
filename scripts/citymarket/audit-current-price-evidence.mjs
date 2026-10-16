import vm from 'node:vm';
import {parseKCitymarketSpatialLeaflet} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';
const entry='https://kcm-tarjouslehdet.k-ruoka.fi/84s5057_tarjouslehti_42LV_KCM/index.html';
const pageBoxes={};
const parsed=await parseKCitymarketSpatialLeaflet(entry,async url=>{
 const r=await fetch(url);const body=await r.text();
 if(String(url).includes('text_position[')){const context={positionForPages:{}};vm.runInNewContext(body,context);for(const [page,data] of Object.entries(context.positionForPages))pageBoxes[page]=data.positions.map(b=>({...b,text:b.word}));}
 return {ok:r.ok,status:r.status,url:r.url,text:async()=>body};
});
for(const row of parsed.rows){
 if(!/RAHKA|RAASTE|KEITOT|JÄÄTELÖPUI|VITAL|SMOOTHI|SININEN SUKLAA|8.PACK|VICHY|WC-PAPERI|KÄSITISKI/i.test(row.title))continue;
 console.log('PRICE_EVIDENCE '+JSON.stringify({page:row.page,title:row.title,package:row.package,unitPrice:row.unitPrice,expectedSingle:row.expectedSingle,initialExpectedSingle:row.initialExpectedSingle,spatialResolved:row.spatialResolved,debugAnchor:row.debugAnchor,debugCardAnchor:row.debugCardAnchor,debugCardPrice:row.debugCardPrice,debugNearbyBoxes:row.debugNearbyBoxes,spatialCandidates:row.spatialCandidates,debugPageBoxes:pageBoxes[row.page]?.filter(b=>Math.abs(b.top-(row.debugCardAnchor?.top??row.debugAnchor?.top??0))<.13)}));
}
