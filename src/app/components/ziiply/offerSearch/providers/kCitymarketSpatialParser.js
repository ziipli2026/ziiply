// The October 2026 41LV leaflet has a frozen, manually approved parser baseline.
// Keep newer parser improvements for every other publication.
import {parseKCitymarketSpatialLeaflet as parseApproved41LV} from './kCitymarketSpatialParserApproved41LV.js';
import {parseKCitymarketSpatialLeaflet as parseCurrent} from './kCitymarketSpatialParserCurrent.js';
const APPROVED_41LV_ENTRY='https://kcm-tarjouslehdet.k-ruoka.fi/82qjhs6_tarjouslehti_41LV_KCM/index.html';
export async function parseKCitymarketSpatialLeaflet(entry){
 const url=String(entry||'');
 return (url===APPROVED_41LV_ENTRY?parseApproved41LV:parseCurrent)(entry);
}
export default parseKCitymarketSpatialLeaflet;
