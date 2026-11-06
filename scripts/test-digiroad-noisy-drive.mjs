#!/usr/bin/env node
// Simulate GPS noise, lost fixes, and a parallel road near a 100 km/h road.
import assert from 'node:assert/strict';
import {DigiroadSpeedService} from '../lib/digiroad-speed-service.mjs';
const lat=60.5,lon=24.8,R=Math.PI/180,lonM=1/(111320*Math.cos(lat*R)),latM=1/111320;
const feature=(id,speed,y)=>({type:'Feature',properties:{link_id:id,arvo:speed},geometry:{type:'LineString',coordinates:[[lon-200*lonM,lat+y*latM],[lon+200*lonM,lat+y*latM]]}});
const features=[feature('main',100,0),feature('parallel',60,8)];
let now=0,calls=0;
const service=new DigiroadSpeedService({clock:()=>now,fetchFn:async()=>{calls++;return {ok:true,json:async()=>({features,numberMatched:2})}}});
const fix=(y,accuracy=2,heading=90)=>({latitude:lat+y*latM,longitude:lon,accuracy,heading});
const results=[];
for(const [i,y] of [0,0,0,0,4,0,0,4,0,0].entries()){
 now=i*1000;
 const r=await service.update(fix(y));
 results.push({i,y,status:r.status,limit:r.speedLimit});
}
assert.equal(results[2].limit,100,'3 stable samples should confirm 100');
assert.equal(results[4].limit,100,'ambiguous fix must not replace confirmed speed');
assert.equal(results[7].limit,100,'second ambiguous fix must not replace speed');
assert.equal(calls,1,'small GPS fluctuations must use cache');
now=11000;
assert.equal((await service.update(fix(0,60))).speedLimit,100,'one poor GPS fix must not immediately clear limit');
now=45000;
assert.equal((await service.update(fix(0,60))).status,'unknown','stale value must expire');
console.log(JSON.stringify({scenario:'parallel road and noisy GPS',results,fetches:calls}));
console.log('PASS noise and parallel road regression');
