import assert from "node:assert/strict";
import test from "node:test";
import {updateArvoCloudMealConsent} from "../src/app/components/ziiply/arvo/arvoMealConsent.server.ts";
import {createArvoNeonConsentWriter} from "../src/app/components/ziiply/arvo/arvoNeonConsentWriter.server.ts";
const user="00000000-0000-4000-8000-000000000001",token="a".repeat(64),now=new Date("2026-11-05T10:00:00Z");
const access={sessionUserId:user,sessionExpiresAt:"2026-11-06T10:00:00Z",sessionRevokedAt:null,userDisabledAt:null,cloudMealGrantedAt:null,cloudMealRevokedAt:null};
test("explicit first grant persists only session user, never uploads meals",async()=>{
 let sql,params,calls=0;
 const write=createArvoNeonConsentWriter({query:async(q,p)=>{sql=q;params=p;calls++;return {rows:[{user_id:user}]};}});
 assert.deepEqual(await updateArvoCloudMealConsent(token,"grant",async()=>access,()=> "b".repeat(64),write,now),{ok:true});
 assert.equal(calls,1);
 assert.match(sql,/INSERT INTO public\.ziiply_arvo_meal_consents/);
 assert.deepEqual(params,[user]);
});
test("revocation updates only existing consent without granting",async()=>{
 let sql;
 const write=createArvoNeonConsentWriter({query:async(q)=>{sql=q;return {rows:[]};}});
 assert.deepEqual(await updateArvoCloudMealConsent(token,"revoke",async()=>access,()=> "b".repeat(64),write,now),{ok:true});
 assert.match(sql,/UPDATE public\.ziiply_arvo_meal_consents/);
 assert.doesNotMatch(sql,/INSERT INTO/);
});
test("consent denies invalid actions and revoked sessions without touching Neon",async()=>{
 let calls=0;
 const write=async()=>{calls++;};
 assert.deepEqual(await updateArvoCloudMealConsent(token,"upload",async()=>access,()=> "b".repeat(64),write,now),{ok:false,reason:"invalid-action"});
 assert.deepEqual(await updateArvoCloudMealConsent(token,"grant",async()=>({...access,sessionRevokedAt:now}),()=> "b".repeat(64),write,now),{ok:false,reason:"unauthorized"});
 assert.equal(calls,0);
});
test("consent returns failure if Neon does not confirm grant",async()=>{
 const write=createArvoNeonConsentWriter({query:async()=>({rows:[]})});
 assert.deepEqual(await updateArvoCloudMealConsent(token,"grant",async()=>access,()=> "b".repeat(64),write,now),{ok:false,reason:"storage-failed"});
});
