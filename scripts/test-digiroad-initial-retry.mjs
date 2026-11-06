#!/usr/bin/env node
import assert from 'node:assert/strict';
import {DigiroadSpeedTracker} from '../lib/digiroad-speed-tracker.mjs';
const m=(id,speed)=>({status:'matched',linkId:id,speedLimit:speed});
const unknown={status:'unknown'};
const t=new DigiroadSpeedTracker({initialConfirmations:3});
const observations=[unknown,m('a',80),unknown,m('a',80),m('a',80),unknown,m('a',80),m('a',80),m('a',80)];
const output=observations.map((match,i)=>t.update(match,{timestamp:i*1000}));
for(let i=0;i<8;i++)assert.equal(output[i].status,'unknown',`should not confirm prematurely at ${i}`);
assert.equal(output[8].speedLimit,80,'later successful sequence must confirm even after earlier failed attempts');
console.log('PASS initial recognition retries without a fixed maximum; confirmed at GPS observation 9');

const alternating = new DigiroadSpeedTracker();
const conflictingFixes = [m('main',80), m('parallel',100), m('main',80), m('main',80)];
for (const [index, match] of conflictingFixes.entries()) {
  const result = alternating.update(match,{timestamp:index*1000});
  assert.equal(result.speedLimit,null,`unexpected limit at GPS observation ${index+1}`);
}
assert.equal(alternating.update(m('main',80),{timestamp:4000}).speedLimit,80);
console.log('PASS conflicting 80 → 100 → 80 fixes require three consecutive matches');
