#!/usr/bin/env node
/**
 * Verify high-speed GPS-centered WFS lookups at actual Digiroad geometry.
 * Large envelope is discovery only. A second 100m envelope is centered on a
 * returned 80-120 km/h segment; validate the same link and speed are retained.
 * Synthetic points, not vehicle GPS or confirmation of signed limits.
 */
const base='https://avoinapi.vaylapilvi.fi/vaylatiedot/digiroad/ogc/features/v1/collections/dr_nopeusrajoitus/items';
const anchors=[
 ['Vt4 Mantsala area',60.650,25.300],
 ['Vt25 Hyvinkaa Mantsala area',60.620,25.100],
 ['Vt25 Hanko Lohja area',60.120,23.800],
 ['Kehä III Vantaa area',60.300,24.970],
 ['Kehä II Espoo area',60.205,24.735],
 ['Vt5 Kuopio area',62.890,27.650],
 ['Lahdenvayla Helsinki area',60.275,25.060],
];
async function query(lat,lon,dy,limit=1000){
 const dx=dy/Math.cos(lat*Math.PI/180),u=new URL(base);
 u.searchParams.set('f','json');u.searchParams.set('bbox',[lon-dx,lat-dy,lon+dx,lat+dy].join(','));u.searchParams.set('limit',String(limit));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const t=Date.now(),r=await fetch(u,{signal:controller.signal}),raw=await r.text();if(!r.ok)throw Error('HTTP '+r.status);const data=JSON.parse(raw);return {features:data.features||[],total:data.numberMatched,bytes:Buffer.byteLength(raw),ms:Date.now()-t}}finally{clearTimeout(timer)}
}
function midpoint(f){
 const geom=f.geometry;
 const lines=geom?.type==='LineString'?[geom.coordinates]:geom?.type==='MultiLineString'?geom.coordinates:[];
 let best=null;
 for(const line of lines)for(let i=1;i<line.length;i++){
 const a=line[i-1],b=line[i],len=Math.hypot((b[0]-a[0])*111320*Math.cos(a[1]*Math.PI/180),(b[1]-a[1])*111320);
 if(!best||len>best.len)best={lat:(a[1]+b[1])/2,lon:(a[0]+b[0])/2,len};
 }
 return best;
}
let passed=0,attempted=0;
for(const [site,lat,lon] of anchors){
 try{
 const wide=await query(lat,lon,.008);
 const candidates=wide.features.filter(f=>f.properties?.arvo>=80&&f.properties?.arvo<=120).map(f=>({f,mid:midpoint(f)})).filter(x=>x.mid);
 if(!candidates.length){console.log(JSON.stringify({site,status:'no high-speed segment in search envelope',wideBytes:wide.bytes}));continue}
 const choice=candidates.sort((a,b)=>b.mid.len-a.mid.len)[0],narrow=await query(choice.mid.lat,choice.mid.lon,.0009,300);
 const id=choice.f.properties?.link_id;
 // Compare identity via serialized geometry+speed if source has no link_id.
 const retained=narrow.features.some(f=>id!=null?f.properties?.link_id===id&&f.properties?.arvo===choice.f.properties.arvo:JSON.stringify(f.geometry)===JSON.stringify(choice.f.geometry)&&f.properties?.arvo===choice.f.properties.arvo);
 attempted++;if(retained)passed++;else process.exitCode=1;
 console.log(JSON.stringify({site,status:retained?'retained':'MISSING',speed:choice.f.properties.arvo,segmentMetres:Math.round(choice.mid.len),wideBytes:wide.bytes,narrowBytes:narrow.bytes,reductionPct:Math.round((1-narrow.bytes/wide.bytes)*100),narrowFeatures:narrow.features.length,wideFeatures:wide.features.length,sourceLinkId:id??null}));
 }catch(e){process.exitCode=1;console.log(JSON.stringify({site,error:String(e)}))}
}
console.log(JSON.stringify({summary:{retained:passed,attempted,meaning:'Geometry-centered synthetic GPS queries; not road identity verification'}}));
if(attempted===0)process.exitCode=1;
