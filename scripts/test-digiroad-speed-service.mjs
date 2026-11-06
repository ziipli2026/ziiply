#!/usr/bin/env node
import assert from 'node:assert/strict';
import {DigiroadSpeedService} from '../lib/digiroad-speed-service.mjs';
const lat=60.5,lon=24.8;
const f=(id,limit)=>({type:'Feature',properties:{link_id:id,arvo:limit},geometry:{type:'LineString',coordinates:[[lon-.003,lat],[lon+.003,lat]]}});
const fix=(offset=0,accuracy=3)=>({latitude:lat,longitude:lon+offset/(111320*Math.cos(lat*Math.PI/180)),accuracy,heading:90});
let now=0,calls=0;
const fetchFn=async()=>{calls++;return {ok:true,json:async()=>({features:[f('main',80)],numberMatched:1})}};
const service=new DigiroadSpeedService({fetchFn,clock:()=>now,trackerOptions:{initialConfirmations:3}});
const tests=[
 ['first fix fetches and stays unconfirmed',async()=>{const r=await service.update(fix());assert.equal(calls,1);assert.equal(r.status,'unknown')}],
 ['next fixes use cache and confirm',async()=>{now=1000;await service.update(fix(10));now=2000;const r=await service.update(fix(20));assert.equal(r.speedLimit,80);assert.equal(calls,1)}],
 ['small movements do not fetch',async()=>{now=3000;await service.update(fix(50));assert.equal(calls,1)}],
 ['outside cache triggers new fetch',async()=>{now=6000;await service.update(fix(120));assert.equal(calls,2)}],
 ['bad GPS does not fetch',async()=>{now=7000;await service.update(fix(0,60));assert.equal(calls,2)}],
 ['network failure does not invent speed after stale timeout',async()=>{
  const bad=new DigiroadSpeedService({fetchFn:async()=>{throw Error('offline')},clock:()=>now});
  const r=await bad.update(fix());assert.equal(r.status,'unknown');
 }],
 ['reset clears cached state',async()=>{service.reset();assert.equal(service.cache,null);assert.equal(service.tracker.snapshot().status,'unknown')}],
];
for(const [name,run] of tests){await run();console.log('PASS '+name)}
console.log('Cached speed service '+tests.length+'/'+tests.length+' passed');
