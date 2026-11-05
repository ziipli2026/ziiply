import assert from "node:assert/strict";
import test from "node:test";
import {resolveArvoConsentSession} from "../src/app/components/ziiply/arvo/arvoConsentSessionResolver.server.ts";
const user="00000000-0000-4000-8000-000000000001",token="a".repeat(64),now=new Date("2026-11-05T10:00:00Z");
const access={sessionUserId:user,sessionExpiresAt:"2026-11-06T10:00:00Z",sessionRevokedAt:null,userDisabledAt:null,cloudMealGrantedAt:null,cloudMealRevokedAt:null};
test("first opt-in accepts authenticated beta session with no existing consent",async()=>{
 assert.deepEqual(await resolveArvoConsentSession(token,async()=>access,()=> "b".repeat(64),now),{userId:user});
});
test("opt-in denies expired, revoked, disabled, and malformed beta sessions",async()=>{
 for(const invalid of [{...access,sessionExpiresAt:now},{...access,sessionRevokedAt:now},{...access,userDisabledAt:now},{...access,sessionUserId:"wrong"}]){
  assert.equal(await resolveArvoConsentSession(token,async()=>invalid,()=> "b".repeat(64),now),null);
 }
});
test("opt-in rejects missing token and failed hash or database lookup",async()=>{
 let calls=0;
 assert.equal(await resolveArvoConsentSession(null,async()=>{calls++;return access;},()=> "b".repeat(64),now),null);
 assert.equal(calls,0);
 assert.equal(await resolveArvoConsentSession(token,async()=>access,()=>{throw Error("hash");},now),null);
 assert.equal(await resolveArvoConsentSession(token,async()=>{throw Error("db");},()=> "b".repeat(64),now),null);
});
