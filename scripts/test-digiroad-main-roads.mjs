#!/usr/bin/env node
/**
 * High-speed Digiroad probe. Approximate road corridor centers are only
 * search anchors; we do not assert a returned segment belongs to a named road.
 * Uses WFS geometries and reports actual limits 60-120 and payload sizes.
 */
const base='https://avoinapi.vaylapilvi.fi/vaylatiedot/digiroad/ogc/features/v1/collections/dr_nopeusrajoitus/items';
const places=[
 ['Vt1 E18 Lohja motorway',60.270,24.160],
 ['Vt1 E18 Salo motorway',60.385,23.150],
 ['Vt3 E12 Nurmijarvi motorway',60.475,24.830],
 ['Vt3 E12 Hameenlinna motorway',60.970,24.530],
 ['Vt4 E75 Jarvenpaa motorway',60.470,25.100],
 ['Vt4 E75 Mantsala motorway',60.650,25.300],
 ['Vt5 Kuopio corridor',62.890,27.650],
 ['Vt6 Kouvola corridor',60.870,26.730],
 ['Vt7 E18 Porvoo motorway',60.395,25.580],
 ['Vt8 Turku Rauma corridor',60.670,21.900],
 ['Vt9 Tampere corridor',61.510,23.970],
 ['Vt12 Lahti corridor',60.970,25.570],
 ['Vt25 Hanko Lohja corridor',60.120,23.800],
 ['Vt25 Hyvinkaa Mantsala corridor',60.620,25.100],
 ['Kt45 Tuusulanvayla',60.330,24.970],
 ['Kt50 Kehä III Espoo',60.220,24.690],
 ['Kt50 Kehä III Vantaa',60.300,24.970],
 ['Kehä I Espoo',60.220,24.780],
 ['Kehä I Helsinki',60.240,25.020],
 ['Kehä II Espoo',60.205,24.735],
 ['Turunvayla Espoo',60.230,24.730],
 ['Lahdenvayla Helsinki',60.275,25.060],
 ['Hameenlinnanvayla Helsinki',60.270,24.910],
 ['Tampereen kehätie',61.450,23.680],
];
let good=0,foundFast=0,fail=0;
for(const [name,lat,lon] of places){
 const u=new URL(base),dy=.008,dx=.016;
 u.searchParams.set('f','json');u.searchParams.set('bbox',[lon-dx,lat-dy,lon+dx,lat+dy].join(','));
 u.searchParams.set('limit','1000');
 const start=Date.now(),ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),16000);
 try{
 const response=await fetch(u,{signal:ctrl.signal});
 const body=await response.text(),bytes=Buffer.byteLength(body);
 let data;try{data=JSON.parse(body)}catch{}
 const features=Array.isArray(data?.features)?data.features:[];
 const byLimit={};
 for(const f of features){const n=f.properties?.arvo;if(typeof n==='number')byLimit[n]=(byLimit[n]||0)+1}
 const fast=Object.entries(byLimit).filter(([k,v])=>Number(k)>=60&&Number(k)<=120&&v>0);
 if(response.ok&&Array.isArray(data?.features))good++;else fail++;
 if(fast.length)foundFast++;
 console.log(JSON.stringify({site:name,status:response.status,elapsedMs:Date.now()-start,bytes,returned:features.length,total:data?.numberMatched??null,truncated:typeof data?.numberMatched==='number'&&data.numberMatched>features.length,limits:byLimit,fastLimits:fast.map(([limit,count])=>({limit:Number(limit),count}))}));
 }catch(e){fail++;console.log(JSON.stringify({site:name,error:String(e),elapsedMs:Date.now()-start}))}
 finally{clearTimeout(timer)}
}
console.log(JSON.stringify({summary:{locations:places.length,successful:good,failed:fail,withLimits60to120:foundFast,warning:'Road labels are approximate corridor anchors; road identity and current signed limits are NOT verified'}}));
if(fail)process.exitCode=1;
