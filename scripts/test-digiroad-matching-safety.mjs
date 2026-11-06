#!/usr/bin/env node
// Deterministic safety regression tests for Digiroad GPS matching principles.
// This deliberately tests ambiguous roads, offsets, headings and hysteresis
// without a network dependency or asserting that a real vehicle was tracked.
import assert from 'node:assert/strict';
const R=Math.PI/180;
function nearest(p,a,b){
 const scale=Math.cos(p[1]*R),x=(p[0]-a[0])*111320*scale,y=(p[1]-a[1])*111320;
 const dx=(b[0]-a[0])*111320*scale,dy=(b[1]-a[1])*111320;
 const t=Math.max(0,Math.min(1,(x*dx+y*dy)/(dx*dx+dy*dy)));
 return {distance:Math.hypot(x-t*dx,y-t*dy),bearing:(Math.atan2(dx,dy)/R+360)%360};
}
function diff(a,b){return Math.abs(((a-b+540)%360)-180)}
function select(p,heading,roads,previous){
 const candidates=roads.map(road=>{
 const d=nearest(p,road.a,road.b);
 const angle=Math.min(diff(heading,d.bearing),diff(heading,(d.bearing+180)%360));
 return {...road,distance:d.distance,angle,score:d.distance+angle*.2+(previous&&road.id!==previous?5:0)};
 }).filter(r=>r.distance<=25&&r.angle<=40).sort((a,b)=>a.score-b.score);
 const a=candidates[0],b=candidates.find(r=>r.id!==a?.id);
 if(!a)return {status:'unknown'};
 if(b&&b.limit!==a.limit&&b.score-a.score<3)return {status:'unknown',reason:'ambiguous'};
 return {status:'matched',id:a.id,limit:a.limit};
}
const lat=60.5,lon=24.8,metreLat=1/111320,metreLon=1/(111320*Math.cos(lat*R));
const road=(id,offset,limit)=>({id,limit,a:[lon-0.001,lat+offset*metreLat],b:[lon+0.001,lat+offset*metreLat]});
const main=road('main',0,80),parallel=road('parallel',8,60);
const p=(offset=0)=>[lon,lat+offset*metreLat];
const tests=[
 ['isolated road',()=>assert.deepEqual(select(p(),90,[main]),{status:'matched',id:'main',limit:80})],
 ['reject far GPS fix',()=>assert.equal(select(p(50),90,[main]).status,'unknown')],
 ['reject perpendicular heading',()=>assert.equal(select(p(),0,[main]).status,'unknown')],
 ['ambiguous parallel roads',()=>assert.equal(select(p(4),90,[main,parallel]).status,'unknown')],
 ['near main road',()=>assert.equal(select(p(1),90,[main,parallel]).id,'main')],
 ['near parallel road',()=>assert.equal(select(p(7),90,[main,parallel]).id,'parallel')],
 ['previous segment continuity',()=>assert.equal(select(p(5),90,[main,parallel],'main').id,'main')],
 ['do not invent absent speed limit',()=>assert.equal(select(p(),90,[]).status,'unknown')],
];
for(const [name,run] of tests){run();console.log('PASS '+name)}
console.log('Safety regression: '+tests.length+'/'+tests.length+' passed');
