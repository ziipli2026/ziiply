#!/usr/bin/env node
import assert from 'node:assert/strict';
import {matchDigiroadFix,fetchDigiroadNearFix} from '../lib/digiroad-speed-matching.mjs';
const lat=60.5,lon=24.8,metre=1/111320;
const feature=(link_id,offset,arvo)=>({type:'Feature',properties:{link_id,arvo},geometry:{type:'LineString',coordinates:[[lon-.001,lat+offset*metre],[lon+.001,lat+offset*metre]]}});
const a=feature('main',0,100),b=feature('parallel',8,80);
const fix=(offset=0,heading=90,accuracy=2)=>({latitude:lat+offset*metre,longitude:lon,heading,accuracy});
const tests=[
 ['exact main road',()=>assert.equal(matchDigiroadFix(fix(),[a]).speedLimit,100)],
 ['parallel road',()=>assert.equal(matchDigiroadFix(fix(8),[a,b]).speedLimit,80)],
 ['ambiguous roads must be unknown',()=>assert.equal(matchDigiroadFix(fix(4),[a,b]).status,'unknown')],
 ['previous road helps maintain continuity',()=>assert.equal(matchDigiroadFix(fix(5),[a,b],{previousLink:'main'}).linkId,'main')],
 ['reject inaccurate GPS',()=>assert.equal(matchDigiroadFix(fix(0,90,45),[a]).status,'unknown')],
 ['reject perpendicular travel',()=>assert.equal(matchDigiroadFix(fix(0,0),[a]).status,'unknown')],
 ['reject far road',()=>assert.equal(matchDigiroadFix(fix(80),[a]).status,'unknown')],
 ['reject missing link id',()=>assert.equal(matchDigiroadFix(fix(),[{...a,properties:{arvo:100}}]).status,'unknown')],
 ['reject missing limit',()=>assert.equal(matchDigiroadFix(fix(),[{...a,properties:{link_id:'x'}}]).status,'unknown')],
 ['reject impossible limit',()=>assert.equal(matchDigiroadFix(fix(),[feature('bad',0,999)]).status,'unknown')],
 ['fetch small bbox and parse',async()=>{
   const features=await fetchDigiroadNearFix(fix(),{fetchFn:async u=>{const url=new URL(u);assert.equal(url.searchParams.get('limit'),'300');return {ok:true,json:async()=>({features:[a],numberMatched:1})}}});
   assert.equal(features.length,1);
 }],
 ['reject truncated results',async()=>await assert.rejects(()=>fetchDigiroadNearFix(fix(),{fetchFn:async()=>({ok:true,json:async()=>({features:[a],numberMatched:301})})}),/truncated/)],
];
for(const [name,fn] of tests){await fn();console.log('PASS '+name)}
console.log('Reusable matching module '+tests.length+'/'+tests.length+' passed');
