import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import test from "node:test";
import {ARVO_BETA_COOKIE_NAME,hashArvoBetaSessionToken} from "../src/app/components/ziiply/arvo/arvoBetaSessionBridge.server.ts";
import {resolveArvoConsentSession} from "../src/app/components/ziiply/arvo/arvoConsentSessionResolver.server.ts";
const token="A".repeat(43),user="00000000-0000-4000-8000-000000000001";
test("Arvo session bridge matches beta token SHA-256 and cookie",()=>{
 assert.equal(ARVO_BETA_COOKIE_NAME,"__Host-ziiply_beta");
 assert.equal(hashArvoBetaSessionToken(token),createHash("sha256").update(token).digest("hex"));
});
test("Arvo rejects malformed beta tokens before querying database",async()=>{
 for(const invalid of ["a".repeat(64),"a".repeat(42),"!"+ "a".repeat(42),""]){
  assert.throws(()=>hashArvoBetaSessionToken(invalid));
 }
 let calls=0;
 const result=await resolveArvoConsentSession("a".repeat(64),async()=>{calls++;return null;},hashArvoBetaSessionToken);
 assert.equal(result,null);
 assert.equal(calls,0);
});
test("real-format beta token can resolve server-side session for first consent",async()=>{
 const access={sessionUserId:user,sessionExpiresAt:"2026-11-06T10:00:00Z",sessionRevokedAt:null,userDisabledAt:null,cloudMealGrantedAt:null,cloudMealRevokedAt:null};
 const result=await resolveArvoConsentSession(token,async(hash)=>{assert.equal(hash,hashArvoBetaSessionToken(token));return access;},hashArvoBetaSessionToken,new Date("2026-11-05T10:00:00Z"));
 assert.deepEqual(result,{userId:user});
});
