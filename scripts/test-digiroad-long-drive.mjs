#!/usr/bin/env node
import assert from 'node:assert/strict';
import {DigiroadSpeedService} from '../lib/digiroad-speed-service.mjs';
const lat=60.5,lon=24.8,lonPerMetre=1/(111320*Math.cos(lat*Math.PI/180));
const feature=(id,speed,start,end)=>({type:'Feature',properties:{link_id:id,arvo:speed},geometry:{type:'LineString',coordinates:[[lon+start*lonPerMetre,lat],[lon+end*lonPerMetre,lat]]}});
const features=[feature('road-80',80,0,120),feature('road-100',100,120,240),feature('road-120',120,240,360)];
let now=0,fetches=0;
const service=new DigiroadSpeedService({
 clock:()=>now,
 cacheRadiusMetres:85,
 minFetchIntervalMs:0,
 fetchFn:async()=>{fetches++;return {ok:true,json:async()=>({features,numberMatched:3})}},
 trackerOptions:{initialConfirmations:3,changeConfirmations:2,staleAfterMs:30000}
});
const positions=[20,35,50,65,80,95,110,125,140,155,170,185,200,215,230,245,260,275,290,305,320,335,350];
const results=[];
for(const [i,pos] of positions.entries()){
 now=i*1000;
 const r=await service.update({latitude:lat,longitude:lon+pos*lonPerMetre,accuracy:2,heading:90});
 results.push({metres:pos,limit:r.speedLimit,status:r.status,source:r.source});
}
console.log(JSON.stringify({scenario:'simulated 80 to 100 to 120 kmh continuous route',results,fetches}));
assert.equal(results[2].limit,80,'initial 3 samples confirm 80');
assert.equal(results[7].limit,80,'one sample at boundary must not switch');
assert.equal(results[9].limit,100,'after two stable new-road samples show 100');
assert.equal(results[15].limit,100,'boundary must not switch on first fix');
assert.equal(results[17].limit,120,'after two stable new-road samples show 120');
assert.ok(fetches<positions.length/2,'most GPS updates must avoid network fetch');
console.log('PASS simulated long route and reduced network traffic');
