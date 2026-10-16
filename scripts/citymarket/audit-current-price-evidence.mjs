import {parseKCitymarketSpatialLeaflet} from '../../src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParserCurrent.js';
const entry='https://kcm-tarjouslehdet.k-ruoka.fi/84s5057_tarjouslehti_42LV_KCM/index.html';
const parsed=await parseKCitymarketSpatialLeaflet(entry);
for(const row of parsed.rows){
 if(!/RAHKA|RAASTE|KEITOT|JÄÄTELÖPUI|VITAL|SMOOTHI|SININEN SUKLAA|8.PACK|VICHY|WC-PAPERI|KÄSITISKI/i.test(row.title))continue;
 console.log('PRICE_EVIDENCE '+JSON.stringify({page:row.page,title:row.title,package:row.package,unitPrice:row.unitPrice,expectedSingle:row.expectedSingle,initialExpectedSingle:row.initialExpectedSingle,spatialResolved:row.spatialResolved,debugAnchor:row.debugAnchor,debugCardAnchor:row.debugCardAnchor,debugCardPrice:row.debugCardPrice,debugNearbyBoxes:row.debugNearbyBoxes,spatialCandidates:row.spatialCandidates}));
}
