#!/usr/bin/env node
import assert from 'node:assert/strict';
import {DigiroadSpeedTracker} from '../lib/digiroad-speed-tracker.mjs';
const m=(linkId,speedLimit)=>({status:'matched',linkId,speedLimit});
const unknown={status:'unknown'};
const tests=[
 ['three initial matches',()=>{
 const t=new DigiroadSpeedTracker();assert.equal(t.update(m('a',80),{timestamp:0}).status,'unknown');
 assert.equal(t.update(m('a',80),{timestamp:1000}).status,'unknown');
 assert.equal(t.update(m('a',80),{timestamp:2000}).speedLimit,80);
 }],
 ['one GPS spike does not change limit',()=>{
 const t=new DigiroadSpeedTracker({initialConfirmations:2});t.update(m('a',80),{timestamp:0});t.update(m('a',80),{timestamp:1000});
 assert.equal(t.update(m('b',100),{timestamp:2000}).speedLimit,80);
 assert.equal(t.update(m('a',80),{timestamp:3000}).speedLimit,80);
 }],
 ['two confirmed new road matches update limit',()=>{
 const t=new DigiroadSpeedTracker({initialConfirmations:2});t.update(m('a',80),{timestamp:0});t.update(m('a',80),{timestamp:1000});
 t.update(m('b',100),{timestamp:2000});assert.equal(t.update(m('b',100),{timestamp:3000}).speedLimit,100);
 }],
 ['same limit on next segment does not blink',()=>{
 const t=new DigiroadSpeedTracker({initialConfirmations:2});t.update(m('a',80),{timestamp:0});t.update(m('a',80),{timestamp:1000});
 assert.equal(t.update(m('b',80),{timestamp:2000}).speedLimit,80);
 }],
 ['unknown single fix preserves confirmed limit',()=>{
 const t=new DigiroadSpeedTracker({initialConfirmations:2});t.update(m('a',80),{timestamp:0});t.update(m('a',80),{timestamp:1000});
 assert.equal(t.update(unknown,{timestamp:2000}).speedLimit,80);
 }],
 ['stale data expires instead of displaying indefinitely',()=>{
 const t=new DigiroadSpeedTracker({initialConfirmations:2,staleAfterMs:30000});
 t.update(m('a',80),{timestamp:0});t.update(m('a',80),{timestamp:1000});
 assert.equal(t.update(unknown,{timestamp:32000}).status,'unknown');
 }],
 ['initial confirmation can be four',()=>{
 const t=new DigiroadSpeedTracker({initialConfirmations:4});
 for(let i=0;i<3;i++)assert.equal(t.update(m('a',120),{timestamp:i*1000}).status,'unknown');
 assert.equal(t.update(m('a',120),{timestamp:3000}).speedLimit,120);
 }],
 ['pending resets after an unknown GPS fix',()=>{
 const t=new DigiroadSpeedTracker({initialConfirmations:2});
 t.update(m('a',80),{timestamp:0});t.update(unknown,{timestamp:1000});
 assert.equal(t.update(m('a',80),{timestamp:2000}).status,'unknown');
 }],
];
for(const [name,run] of tests){run();console.log('PASS '+name)}
console.log('Speed tracker '+tests.length+'/'+tests.length+' passed');
