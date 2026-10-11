// Historical 41LV has a manually approved frozen parser baseline.
// The publisher's generic loppuviikon URL is reused between issues, so its
// publication identity must be resolved from the parsed leaflet, not the input URL.
import {parseKCitymarketSpatialLeaflet as parseApproved41LV} from './kCitymarketSpatialParserApproved41LV.js';
import {parseKCitymarketSpatialLeaflet as parseCurrent} from './kCitymarketSpatialParserCurrent.js';
const APPROVED_41LV_PUBLICATION_ID='82qjhs6_tarjouslehti_41lv_kcm';
export async function parseKCitymarketSpatialLeaflet(entry){
 const url=String(entry||'');
 if(url.toLowerCase().includes(APPROVED_41LV_PUBLICATION_ID))return parseApproved41LV(entry);
 const current=await parseCurrent(entry);
 const resolvedUrl=String(current?.leafletUrl||current?.sourceUrl||current?.url||'').toLowerCase();
 if(resolvedUrl.includes(APPROVED_41LV_PUBLICATION_ID))return parseApproved41LV(entry);
 return current;
}
export default parseKCitymarketSpatialLeaflet;
