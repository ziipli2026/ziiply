import test from "node:test";
import assert from "node:assert/strict";
import {validateHealthCategories,validateDailyHealthSummary} from "../src/lib/arvoHealthContract.mjs";
test("consent categories must be explicit and unique",()=>{
 assert.equal(validateHealthCategories(["steps","sleep_stages"]),true);
 assert.equal(validateHealthCategories([]),false);
 assert.equal(validateHealthCategories(["steps","steps"]),false);
 assert.equal(validateHealthCategories(["medical_records"]),false);
});
test("health payload rejects arbitrary identifiers, invalid values and providers",()=>{
 const valid={provider:"apple_health",localDate:"2026-10-29",timezone:"Europe/Helsinki",steps:3063,activeEnergyKcal:346,sleepMinutes:362};
 assert.equal(validateDailyHealthSummary(valid),true);
 assert.equal(validateDailyHealthSummary({...valid,userId:"someone-else"}),false);
 assert.equal(validateDailyHealthSummary({...valid,steps:-1}),false);
 assert.equal(validateDailyHealthSummary({...valid,provider:"other"}),false);
 assert.equal(validateDailyHealthSummary({...valid,steps:1.5}),false);
});
