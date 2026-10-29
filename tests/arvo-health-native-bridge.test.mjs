import test from "node:test";
import assert from "node:assert/strict";
import {acceptNativeHealthMessage} from "../src/lib/arvoHealthNativeBridge.mjs";
const message={type:"ARVO_HEALTH_DAILY_SUMMARIES",version:1,days:[{provider:"apple_health",localDate:"2026-10-29",timezone:"Europe/Helsinki",steps:3000,hrvSdnnMs:25}]};
test("no approval means no health readings",()=>assert.equal(acceptNativeHealthMessage(message,[]).ok,false));
test("only approved category survives",()=>{const result=acceptNativeHealthMessage(message,["steps"]);assert.equal(result.ok,true);assert.equal(result.days[0].steps,3000);assert.equal(result.days[0].hrvSdnnMs,undefined)});
test("invalid negative readings rejected",()=>assert.equal(acceptNativeHealthMessage({...message,days:[{...message.days[0],steps:-5}]},["steps"]).ok,false));

test("approved REM stage and Android RMSSD survive bridge without cross-contamination",()=>{
 const record={provider:"health_connect",localDate:"2026-10-29",timezone:"Europe/Helsinki",remMinutes:85,hrvRmssdMs:34,steps:1234};
 const result=acceptNativeHealthMessage({type:"ARVO_HEALTH_DAILY_SUMMARIES",version:1,days:[record]},["sleep_stages","hrv"]);
 assert.equal(result.ok,true);
 assert.equal(result.days[0].remMinutes,85);
 assert.equal(result.days[0].hrvRmssdMs,34);
 assert.equal(result.days[0].steps,undefined);
});
