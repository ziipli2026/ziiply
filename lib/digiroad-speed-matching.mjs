/**
 * Experimental, dependency-free Digiroad speed-limit matcher for browser or Node.
 * Coordinates are [longitude, latitude]. A result is never guessed if ambiguous.
 * This is NOT a source of legally authoritative or live speed limits.
 */
export const DIGIROAD_SPEED_URL='https://avoinapi.vaylapilvi.fi/vaylatiedot/digiroad/ogc/features/v1/collections/dr_nopeusrajoitus/items';
const rad=Math.PI/180;
const angleDiff=(a,b)=>Math.abs(((a-b+540)%360)-180);
export function nearestPointOnLine(point,a,b){
 const scale=Math.cos(point[1]*rad),x=(point[0]-a[0])*111320*scale,y=(point[1]-a[1])*111320;
 const dx=(b[0]-a[0])*111320*scale,dy=(b[1]-a[1])*111320,den=dx*dx+dy*dy;
 const t=den?Math.max(0,Math.min(1,(x*dx+y*dy)/den)):0;
 return {metres:Math.hypot(x-t*dx,y-t*dy),heading:(Math.atan2(dx,dy)/rad+360)%360};
}
function geometrySegments(geometry){
 const lines=geometry?.type==='LineString'?[geometry.coordinates]:geometry?.type==='MultiLineString'?geometry.coordinates:[];
 return lines.flatMap(line=>line.slice(1).map((b,i)=>[line[i],b]));
}
export function matchDigiroadFix({latitude,longitude,heading,accuracy=10},features,{previousLink=null}={}){
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||!Number.isFinite(accuracy)||accuracy>40||accuracy<0)
   return {status:'unknown',reason:'gps_accuracy'};
 const hasHeading=Number.isFinite(heading);
 const radius=Math.max(12,Math.min(30,accuracy+8));
 const candidates=[];
 for(const feature of features||[]){
  const speed=Number(feature.properties?.arvo),link=feature.properties?.link_id;
  if(!Number.isInteger(speed)||speed<10||speed>130||!link)continue;
  const uncertainLimit=feature.properties.uncertainLimit===true;
  let best=null;
  for(const [a,b] of geometrySegments(feature.geometry)){
   const nearest=nearestPointOnLine([longitude,latitude],a,b);
   const headingError=hasHeading?Math.min(angleDiff(heading,nearest.heading),angleDiff(heading,(nearest.heading+180)%360)):null;
   if(nearest.metres>radius||(hasHeading&&headingError>40))continue;
   const score=nearest.metres+(headingError??0)*.2+(!uncertainLimit&&previousLink&&previousLink!==link?5:0);
   if(!best||score<best.score)best={link,speed,uncertainLimit,score,metres:nearest.metres,headingError};
  }
  if(best)candidates.push(best);
 }
 candidates.sort((a,b)=>a.score-b.score);
 const winner=candidates[0];
 if(!winner)return {status:'unknown',reason:'no_aligned_road'};
 if(winner.uncertainLimit||candidates.some(candidate=>candidate.uncertainLimit
   &&candidate.score-winner.score<Math.max(3,accuracy*.5)))
   return {status:'unknown',reason:'uncertain_limit'};
 const competitor=candidates.find(x=>x.link!==winner.link&&x.speed!==winner.speed);
 if(competitor&&competitor.score-winner.score<Math.max(3,accuracy*.5))
   return {status:'unknown',reason:'ambiguous_roads'};
 return {status:'matched',linkId:winner.link,speedLimit:winner.speed,distanceMetres:Math.round(winner.metres)};
}
export async function fetchDigiroadNearFix({latitude,longitude},{fetchFn=fetch,signal}={}){
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude))throw Error('invalid GPS coordinates');
 const dy=.001,dx=dy/Math.cos(latitude*rad);
 const url=new URL(DIGIROAD_SPEED_URL);
 url.searchParams.set('f','json');
 url.searchParams.set('bbox',[longitude-dx,latitude-dy,longitude+dx,latitude+dy].join(','));
 url.searchParams.set('limit','300');
 const response=await fetchFn(url.toString(),{signal});
 if(!response.ok)throw Error('Digiroad HTTP '+response.status);
 const json=await response.json();
 if(!Array.isArray(json.features))throw Error('Digiroad features missing');
 if(json.numberMatched>json.features.length)throw Error('Digiroad results truncated');
 return json.features;
}
