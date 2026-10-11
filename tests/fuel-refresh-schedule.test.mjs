import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fuelRefreshDue} from '../scripts/lib/fuel-refresh-schedule.mjs';
test('all four Finnish summer times and winter times map correctly',()=>{
 for(const utc of [3,7,12,17]) assert(fuelRefreshDue(new Date(`2026-07-01T${String(utc).padStart(2,'0')}:00:00Z`)));
 for(const utc of [4,8,13,18]) assert(fuelRefreshDue(new Date(`2026-12-01T${String(utc).padStart(2,'0')}:00:00Z`)));
 for(const date of ['2026-07-01T04:00:00Z','2026-12-01T03:00:00Z','2026-07-01T03:07:00Z']) assert.equal(fuelRefreshDue(new Date(date)),false);
 assert(fuelRefreshDue(new Date('2026-07-01T03:07:00Z'),true));
 assert.equal(fuelRefreshDue(new Date('2026-07-01T04:07:00Z'),true),false);
});
test('DST change days use the actual Helsinki offset',()=>{
 assert(fuelRefreshDue(new Date('2026-03-29T03:00:00Z')));
 assert.equal(fuelRefreshDue(new Date('2026-03-29T04:00:00Z')),false);
 assert(fuelRefreshDue(new Date('2026-10-25T04:00:00Z')));
 assert.equal(fuelRefreshDue(new Date('2026-10-25T03:00:00Z')),false);
});
