// The October 2026 41LV leaflet has a frozen, manually approved parser baseline.
// Keep newer parser improvements for every other publication.
import {parseKCitymarketSpatialLeaflet as parseApproved41LV} from './kCitymarketSpatialParserApproved41LV.js';
import {parseKCitymarketSpatialLeaflet as parseCurrent} from './kCitymarketSpatialParserCurrent.js';
const APPROVED_41LV_PUBLICATION_ID='82qjhs6_tarjouslehti_41lv_kcm';
export async function parseKCitymarketSpatialLeaflet(entry){
 const url=String(entry||'');
 return (url.toLowerCase().includes(APPROVED_41LV_PUBLICATION_ID)?parseApproved41LV:parseCurrent)(entry);
}
export default parseKCitymarketSpatialLeaflet;
