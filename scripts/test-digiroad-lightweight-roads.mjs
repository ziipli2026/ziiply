#!/usr/bin/env node
/**
 * Lightweight WFS speed limit queries using a 100m radius GPS envelope.
 * Report payload and candidate limits, never claim a named road is identified.
 */
const base='https://avoinapi.vaylapilvi.fi/vaylatiedot/digiroad/ogc/features/v1/collections/dr_nopeusrajoitus/items';
const sites=[
 ['Vt4 Mantsala high-speed sample',60.650,25.300],
 ['Vt25 Hanko Lohja sample',60.120,23.800],
 ['Vt25 Hyvinkaa Mantsala sample',60.620,25.100],
 ['Kehä III Vantaa sample',60.300,24.970],
 ['Kehä II Espoo sample',60.205,24.735],
 ['Vt5 Kuopio sample',62.890,27.650],
];
for(const [name,lat,lon] of sites){
 const deltaLat=.0009,deltaLon=.0009/Math.cos(lat*Math.PI/180);
 const u=new URL(base);u.searchParams.set('f','json');
 u.searchParams.set('bbox',[lon-deltaLon,lat-deltaLat,lon+deltaLon,lat+deltaLat].join(','));
 u.searchParams.set('limit','300');
 const start=Date.now(),ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
 try{
 const response=await fetch(u,{signal:ctrl.signal});const raw=await response.text();
 let data;try{data=JSON.parse(raw)}catch{}
 const counts={};for(const f of data?.features||[]){const n=f.properties?.arvo;if(Number.isFinite(n))counts[n]=(counts[n]||0)+1}
 console.log(JSON.stringify({site:name,status:response.status,elapsedMs:Date.now()-start,bytes:Buffer.byteLength(raw),returned:data?.features?.length??0,total:data?.numberMatched??null,limits:counts}));
 if(!response.ok||!Array.isArray(data?.features))process.exitCode=1;
 }catch(e){console.log(JSON.stringify({site:name,error:String(e)}));process.exitCode=1}
 finally{clearTimeout(timer)}
}
