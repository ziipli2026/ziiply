import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregateHealthDays} from '../src/lib/arvoHealthStatistics.mjs';
const record=(localDate,steps,restingHeartRateBpm)=>({provider:'apple_health',localDate,timezone:'Europe/Helsinki',steps,restingHeartRateBpm});
test('weekly totals and averages',()=>{const result=aggregateHealthDays([record('2026-10-28',2000,60),record('2026-10-29',3000,70)],'week');assert.equal(result.length,1);assert.equal(result[0].steps,5000);assert.equal(result[0].restingHeartRateBpm,65);});
test('missing readings are null',()=>{const result=aggregateHealthDays([record('2026-10-29',3000,null)],'month');assert.equal(result[0].hrvSdnnMs,null);});
