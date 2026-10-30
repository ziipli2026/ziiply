import test from "node:test";
import assert from "node:assert/strict";
import { prepareHealthSync } from "../src/lib/arvoHealthSyncPreparation.mjs";
const day={provider:"apple_health",localDate:"2026-10-30",timezone:"Europe/Helsinki",steps:1200,restingHeartRateBpm:57,sleepMinutes:420};
const consent={action:"grant",version:"v1",explicit:true,serverVerified:true,categories:["steps","resting_heart_rate"]};
const input={days:[day],categories:["steps"],consent,policyVersion:"v1"};
test("only consented metrics are included",()=>{
 assert.deepEqual(prepareHealthSync(input),[{provider:day.provider,localDate:day.localDate,timezone:day.timezone,steps:1200}]);
});
test("no unverified or revoked consent",()=>{
 for(const changed of [{serverVerified:false},{explicit:false},{action:"revoke"},{version:"old"}])
 assert.throws(()=>prepareHealthSync({...input,consent:{...consent,...changed}}));
});
test("unapproved categories and duplicates are rejected",()=>{
 assert.throws(()=>prepareHealthSync({...input,categories:["sleep_stages"]}));
 assert.throws(()=>prepareHealthSync({...input,days:[day,day]}));
});
