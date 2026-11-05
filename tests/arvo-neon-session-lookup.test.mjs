import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {resolveArvoCloudSession} from "../src/app/components/ziiply/arvo/arvoSessionResolver.server.ts";
import {createArvoNeonSessionLookup} from "../src/app/components/ziiply/arvo/arvoNeonSessionLookup.server.ts";
const hash="a".repeat(64);
const access={sessionUserId:"00000000-0000-4000-8000-00000000000a",sessionExpiresAt:new Date("2026-11-06T10:00:00Z"),sessionRevokedAt:null,userDisabledAt:null,cloudMealGrantedAt:new Date("2026-11-04T10:00:00Z"),cloudMealRevokedAt:null};
test("Neon session lookup is parameterized and includes user, session and consent",async()=>{
 let calls=0;
 const lookup=createArvoNeonSessionLookup({query:async(sql,params)=>{
  calls++;
  assert.deepEqual(params,[hash]);
  for(const field of ["ziiply_beta_sessions","ziiply_beta_users","ziiply_arvo_meal_consents","token_hash=$1"])assert.ok(sql.includes(field));
  return {rows:[access]};
 }});
 assert.deepEqual(await lookup(hash),access);
 assert.equal(calls,1);
});
test("Neon session lookup rejects invalid hash without querying",async()=>{
 let calls=0;
 const lookup=createArvoNeonSessionLookup({query:async()=>{calls++;return {rows:[]}}});
 assert.equal(await lookup("bad"),null);
 assert.equal(calls,0);
});
test("Neon session lookup fails closed on missing or ambiguous rows",async()=>{
 for(const rows of [[],[null],[{}],[access,access]]){
  const lookup=createArvoNeonSessionLookup({query:async()=>({rows})});
  assert.equal(await lookup(hash),null);
 }
});

test("Neon session lookup rejects malformed field types",async()=>{
 for(const row of [
  {...access,sessionUserId:123},
  {...access,sessionExpiresAt:42},
  {...access,sessionRevokedAt:false},
  {...access,userDisabledAt:0},
  {...access,cloudMealGrantedAt:{}},
  {...access,cloudMealRevokedAt:[]},
 ]){
  const lookup=createArvoNeonSessionLookup({query:async()=>({rows:[row]})});
  assert.equal(await lookup(hash),null);
 }
});

test("End-to-end Arvo session resolution allows consented user and denies revoked consent",async()=>{
 const token="b".repeat(64);
 const expected=createHash("sha256").update(token).digest("hex");
 const now=new Date("2026-11-05T10:00:00Z");
 let consentRevoked=false;
 let calls=0;
 const lookup=createArvoNeonSessionLookup({query:async(sql,params)=>{
  calls++;
  assert.ok(sql.includes("token_hash=$1"));
  assert.deepEqual(params,[expected]);
  return {rows:[{...access,cloudMealRevokedAt:consentRevoked?now:null}]};
 }});
 const resolve=()=>resolveArvoCloudSession(token,lookup,raw=>createHash("sha256").update(raw).digest("hex"),now);
 assert.deepEqual(await resolve(),{userId:access.sessionUserId});
 consentRevoked=true;
 assert.equal(await resolve(),null);
 assert.equal(calls,2);
});
