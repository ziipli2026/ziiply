#!/usr/bin/env node
/**
 * Experimental Digiroad GPS map matching. Uses real road geometries from the
 * WFS service and a reproducible simulated GPS track (NOT an actual drive).
 * Does not touch Ziiply production.
 */
import assert from 'node:assert/strict';
const base='https://avoinapi.vaylapilvi.fi/vaylatiedot/digiroad/ogc/features/v1/collections/dr_nopeusrajoitus/items';
const locations=[
  {name:'Hyvinkaa',lat:60.631,lon:24.859},
  {name:'Jokela',lat:60.553,lon:24.966},
  {name:'Vt25 corridor Lohja vicinity',lat:60.248,lon:24.060},
  {name:'Vt25 corridor Porvoo vicinity',lat:60.392,lon:25.665},
];
const rad=Math.PI/180;
function xy(p,lat){return [p[0]*111320*Math.cos(lat*rad),p[1]*111320]}
function project(point,a,b,lat){
 const p=xy(point,lat),u=xy(a,lat),v=xy(b,lat),dx=v[0]-u[0],dy=v[1]-u[1],len2=dx*dx+dy*dy;
 const t=len2?Math.max(0,Math.min(1,((p[0]-u[0])*dx+(p[1]-u[1])*dy)/len2)):0;
 return {distance:Math.hypot(p[0]-u[0]-t*dx,p[1]-u[1]-t*dy),bearing:Math.atan2(dx,dy)*180/Math.PI};
}
function bearingDifference(a,b){return Math.abs(((a-b+540)%360)-180)}
function bestGeometry(point,feature){
 const lines=feature.geometry?.type==='LineString'?[feature.geometry.coordinates]:
 feature.geometry?.type==='MultiLineString'?feature.geometry.coordinates:[];
 let best=null;
 for(const line of lines)for(let i=1;i<line.length;i++){
 const p=project(point,line[i-1],line[i],point[1]);
 if(!best||p.distance<best.distance)best=p;
 }
 return best;
}
function match(point,heading,features,previousLink){
 const candidates=features.flatMap(f=>{
 const p=bestGeometry(point,f);
 if(!p||p.distance>25||typeof f.properties?.arvo!=='number')return [];
 const angle=Math.min(bearingDifference(heading,p.bearing),bearingDifference(heading,(p.bearing+180)%360));
 // Direction is not yet decoded from Digiroad vaik_suunt; only line alignment is checked.
 if(angle>40)return [];
 const link=f.properties.link_id;
 return [{link,limit:f.properties.arvo,distance:+p.distance.toFixed(2),angle:+angle.toFixed(1),
 score:p.distance+angle*.2+(previousLink&&link!==previousLink?5:0)}];
 }).sort((a,b)=>a.score-b.score);
 const first=candidates[0],second=candidates.find(x=>x.link!==first?.link);
 if(!first)return {status:'unknown',reason:'no nearby aligned road'};
 if(second&&second.score-first.score<3&&second.limit!==first.limit)
   return {status:'unknown',reason:'ambiguous parallel or intersecting roads',candidates:candidates.slice(0,2)};
 return {status:'matched',...first,alternative:second?{distance:second.distance,limit:second.limit}:null};
}
async function fetchRoads(location){
 const u=new URL(base),r=.002;
 u.searchParams.set('f','json');u.searchParams.set('bbox',[location.lon-r*2,location.lat-r,location.lon+r*2,location.lat+r].join(','));
 u.searchParams.set('limit','100');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
 const response=await fetch(u,{signal:controller.signal});
 if(!response.ok)throw new Error('HTTP '+response.status);
 const data=await response.json();
 if(!Array.isArray(data.features))throw new Error('missing features');
 return {features:data.features,bytes:Number(response.headers.get('content-length'))||0};
 }finally{clearTimeout(timeout)}
}
let matched=0;
for(const loc of locations){
 try{
 const {features,bytes}=await fetchRoads(loc);
 // Pick a real line segment from the returned dataset; synthetic samples
 // are offset <=2 m to mimic GPS noise. This verifies geometry handling.
 const segments=features.flatMap(f=>{
 const c=f.geometry?.type==='LineString'?f.geometry.coordinates:[];
 const out=[];
 for(let i=1;i<c.length;i++){
 const a=c[i-1],b=c[i],length=project(a,a,b,loc.lat);
 const metres=Math.hypot(...xy([b[0]-a[0],b[1]-a[1]],loc.lat));
 if(metres>=25&&typeof f.properties?.arvo==='number')out.push({f,a,b,metres});
 }
 return out;
 }).sort((a,b)=>b.metres-a.metres);
 const chosen=segments[0];
 if(!chosen){console.log(JSON.stringify({site:loc.name,status:'no usable line segment',features:features.length}));continue}
 const heading=project(chosen.a,chosen.a,chosen.b,loc.lat).bearing;
 let previous=null;
 const samples=[.2,.4,.6,.8].map((t,i)=>{
 const lon=chosen.a[0]+(chosen.b[0]-chosen.a[0])*t+((i%2?1:-1)*1.5)/(111320*Math.cos(loc.lat*rad));
 const lat=chosen.a[1]+(chosen.b[1]-chosen.a[1])*t+((i%2?-1:1)*1.5)/111320;
 const result=match([lon,lat],heading,features,previous);
 if(result.status==='matched')previous=result.link;
 return {index:i,expectedLink:chosen.f.properties.link_id,expectedLimit:chosen.f.properties.arvo,...result};
 });
 matched+=samples.filter(x=>x.status==='matched'&&x.link===x.expectedLink).length;
 console.log(JSON.stringify({site:loc.name,features:features.length,bytes,segmentMetres:+chosen.metres.toFixed(1),samples}));
 }catch(e){console.log(JSON.stringify({site:loc.name,error:String(e)}));process.exitCode=1}
}
console.log(JSON.stringify({matchedCorrectly:matched,totalSamples:locations.length*4,note:'Synthetic GPS samples on real road geometry; not a road-25 verification or real driving test'}));
if(matched<8)process.exitCode=1;
