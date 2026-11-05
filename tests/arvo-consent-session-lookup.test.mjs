import assert from "node:assert/strict";
import test from "node:test";
import {createArvoNeonConsentSessionLookup} from "../src/app/components/ziiply/arvo/arvoNeonConsentSessionLookup.server.ts";
const user="00000000-0000-4000-8000-000000000001";
const row={sessionUserId:user,sessionExpiresAt:"2026-11-06T10:00:00.000Z",sessionRevokedAt:null,userDisabledAt:null,cloudMealGrantedAt:null,cloudMealRevokedAt:null};
test("initial consent session lookup authenticates without prior meal consent",async()=>{
 let query;
 const lookup=createArvoNeonConsentSessionLookup({query:async(sql,params)=>{query={sql,params};return {rows:[row]};}});
 assert.equal((await lookup("a".repeat(64)))?.sessionUserId,user);
 assert.deepEqual(query.params,["a".repeat(64)]);
 assert.match(query.sql,/s\.token_hash=\$1/);
 assert.match(query.sql,/s\.expires_at>now\(\)/);
 assert.match(query.sql,/s\.revoked_at IS NULL/);
 assert.match(query.sql,/u\.disabled_at IS NULL/);
 assert.doesNotMatch(query.sql,/c\.granted_at IS NOT NULL/);
});
test("initial consent session lookup refuses invalid hashes and malformed rows",async()=>{
 let calls=0;
 const lookup=createArvoNeonConsentSessionLookup({query:async()=>{calls++;return {rows:[row]};}});
 assert.equal(await lookup("invalid"),null);
 assert.equal(calls,0);
 for(const rows of [[],[{}],[row,row],[{...row,sessionExpiresAt:null}]]){
  const invalid=createArvoNeonConsentSessionLookup({query:async()=>({rows})});
  assert.equal(await invalid("a".repeat(64)),null);
 }
});
