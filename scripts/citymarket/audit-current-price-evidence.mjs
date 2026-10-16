import vm from 'node:vm';
import {parseKCitymarketSpatialLeaflet} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';
const entry='https://kcm-tarjouslehdet.k-ruoka.fi/84s5057_tarjouslehti_42LV_KCM/index.html';
const pageBoxes={};
const parsed=await parseKCitymarketSpatialLeaflet(entry,async url=>{
 const r=await fetch(url);const body=await r.text();
 if(String(url).includes('text_position[')){const context={positionForPages:{}};vm.runInNewContext(body,context);for(const [page,data] of Object.entries(context.positionForPages))pageBoxes[page]=data.positions.map(b=>({...b,text:b.word}));}
 return {ok:r.ok,status:r.status,url:r.url,text:async()=>body};
});
console.log('PRICE_ARCHIVE '+JSON.stringify({sourceUrl:parsed.leaflet,rows:parsed.rows.map(row=>({page:row.page,title:row.title,package:row.package,unitPrice:row.unitPrice,debugAnchor:row.debugAnchor,debugCardAnchor:row.debugCardAnchor,spatialResolved:row.spatialResolved,percentageOffer:row.percentageOffer})),pages:pageBoxes}));
