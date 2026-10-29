import test from "node:test";
import assert from "node:assert/strict";
import {normalizeSleepStages} from "../src/lib/arvoSleepNormalize.mjs";
import {validateDailyHealthSummary} from "../src/lib/arvoHealthContract.mjs";
const minute=60000;
test("overlapping sources do not double count sleep",()=>{
 const result=normalizeSleepStages([
  {source:"watch",stage:"deep",start:0,end:60*minute},
  {source:"phone",stage:"core",start:0,end:60*minute},
  {source:"watch",stage:"rem",start:60*minute,end:90*minute}
 ],0,90*minute,["watch","phone"]);
 assert.equal(result.deepMinutes,60);
 assert.equal(result.coreMinutes,0);
 assert.equal(result.remMinutes,30);
 assert.equal(result.sleepMinutes,90);
});
test("clips stage to day boundary",()=>{
 const result=normalizeSleepStages([{source:"watch",stage:"core",start:-30*minute,end:30*minute}],0,60*minute);
 assert.equal(result.sleepMinutes,30);
});
test("invalid calendar day is rejected",()=>{
 assert.equal(validateDailyHealthSummary({provider:"apple_health",localDate:"2026-02-31",timezone:"Europe/Helsinki",steps:3}),false);
});
