import assert from "node:assert/strict";
import test from "node:test";
import {createArvoNeonMealDeleter} from "../src/app/components/ziiply/arvo/arvoNeonMealDeleter.server.ts";
import {deleteArvoCloudMeal} from "../src/app/components/ziiply/arvo/arvoMealDelete.server.ts";
const user="00000000-0000-4000-8000-000000000001";
const id="00000000-0000-4000-8000-00000000000a";
const token="a".repeat(64);
const access={sessionUserId:user,sessionExpiresAt:"2026-11-05T10:00:00.000Z",sessionRevokedAt:null,userDisabledAt:null,cloudMealGrantedAt:"2026-11-03T10:00:00.000Z",cloudMealRevokedAt:null};
const now=new Date("2026-11-04T12:00:00.000Z");
test("Arvo Neon deletion calls atomic tombstone function with bound IDs",async()=>{
 let call;
 const remove=createArvoNeonMealDeleter({query:async(sql,params)=>{call={sql,params};return {rows:[{deleted:null}]};}});
 await remove(user,id);
 assert.match(call.sql,/ziiply_arvo_delete_meal/);
 assert.deepEqual(call.params,[user,id]);
});
test("Arvo deletion uses authenticated user and rejects revoked consent",async()=>{
 let deleted;
 const remove=async(u,m)=>{deleted=[u,m];};
 assert.deepEqual(await deleteArvoCloudMeal(token,id,async()=>access,()=> "b".repeat(64),remove,now),{ok:true});
 assert.deepEqual(deleted,[user,id]);
 deleted=undefined;
 const revoked={...access,cloudMealRevokedAt:"2026-11-04T11:00:00.000Z"};
 assert.deepEqual(await deleteArvoCloudMeal(token,id,async()=>revoked,()=> "b".repeat(64),remove,now),{ok:false,reason:"unauthorized"});
 assert.equal(deleted,undefined);
});
test("Arvo deletion rejects invalid IDs before writing",async()=>{
 let writes=0;
 const result=await deleteArvoCloudMeal(token,"invalid",async()=>access,()=> "b".repeat(64),async()=>{writes++;},now);
 assert.deepEqual(result,{ok:false,reason:"invalid-meal-id"});
 assert.equal(writes,0);
});

test("Arvo Neon deletion rejects missing or ambiguous database confirmations",async()=>{
 for(const rows of [[],[{}],[{deleted:false}],[{deleted:true}],[{deleted:null},{deleted:null}]]){
  const remove=createArvoNeonMealDeleter({query:async()=>({rows})});
  await assert.rejects(remove(user,id),/delete-unconfirmed/);
 }
});

test("Arvo deletion returns storage-failed if Neon cannot confirm the deletion",async()=>{
 const remove=createArvoNeonMealDeleter({query:async()=>({rows:[]})});
 assert.deepEqual(await deleteArvoCloudMeal(token,id,async()=>access,()=> "b".repeat(64),remove,now),{ok:false,reason:"storage-failed"});
});
test("Arvo deletion does not access database when authorization fails",async()=>{
 let queries=0;
 const remove=createArvoNeonMealDeleter({query:async()=>{queries++;return {rows:[{deleted:null}]};}});
 assert.deepEqual(await deleteArvoCloudMeal(token,id,async()=>({...access,userDisabledAt:now}),()=> "b".repeat(64),remove,now),{ok:false,reason:"unauthorized"});
 assert.equal(queries,0);
});

test("Arvo deletion always scopes SQL to authenticated user, never request-supplied identity",async()=>{
 const otherUser="00000000-0000-4000-8000-000000000002";
 let params;
 const remove=createArvoNeonMealDeleter({query:async(sql,bound)=>{params=bound;assert.match(sql,/\$1::uuid,\$2::uuid/);return {rows:[{deleted:null}]};}});
 const result=await deleteArvoCloudMeal(token,{id,userId:otherUser},async()=>access,()=> "b".repeat(64),remove,now);
 assert.deepEqual(result,{ok:false,reason:"invalid-meal-id"});
 assert.equal(params,undefined);
 assert.deepEqual(await deleteArvoCloudMeal(token,id,async()=>access,()=> "b".repeat(64),remove,now),{ok:true});
 assert.deepEqual(params,[user,id]);
 assert.notEqual(params[0],otherUser);
});
