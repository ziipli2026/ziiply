import assert from "node:assert/strict";
import test from "node:test";
import {writeArvoCloudMeal} from "../src/app/components/ziiply/arvo/arvoMealWrite.server.ts";
import {createArvoNeonMealWriter} from "../src/app/components/ziiply/arvo/arvoNeonMealWriter.server.ts";
const token="a".repeat(64);
const hash=()=>"b".repeat(64);
const userId="00000000-0000-4000-8000-000000000001";
const meal={id:"00000000-0000-4000-8000-00000000000a",timestamp:"2026-11-04T10:00:00.000Z",ean:"6411234567890",name:"Testi",grams:100,nutrition:{kcal:100,protein:null,carbs:null,fat:null}};
const access={sessionUserId:userId,sessionExpiresAt:"2026-11-05T10:00:00.000Z",sessionRevokedAt:null,userDisabledAt:null,cloudMealGrantedAt:"2026-11-03T10:00:00.000Z",cloudMealRevokedAt:null};
const now=new Date("2026-11-04T12:00:00.000Z");
test("Arvo write uses verified session user ID, not client identity",async()=>{
 let saved;
 const result=await writeArvoCloudMeal(token,{...meal,userId:"attacker"},async()=>access,hash,async(user,m)=>{saved={user,m};},now);
 assert.deepEqual(result,{ok:true,mealId:meal.id});
 assert.equal(saved.user,userId);
 assert.equal(saved.m.userId,undefined);
});
test("Arvo write denies revoked consent and never writes",async()=>{
 let writes=0;
 const result=await writeArvoCloudMeal(token,meal,async()=>({...access,cloudMealRevokedAt:"2026-11-04T11:00:00.000Z"}),hash,async()=>{writes++;},now);
 assert.deepEqual(result,{ok:false,reason:"unauthorized"});
 assert.equal(writes,0);
});
test("Arvo write rejects invalid payload and never writes",async()=>{
 let writes=0;
 const result=await writeArvoCloudMeal(token,{...meal,grams:-5},async()=>access,hash,async()=>{writes++;},now);
 assert.deepEqual(result,{ok:false,reason:"invalid-meal"});
 assert.equal(writes,0);
});
test("Arvo write fails closed on database error",async()=>{
 const result=await writeArvoCloudMeal(token,meal,async()=>access,hash,async()=>{throw Error("db down");},now);
 assert.deepEqual(result,{ok:false,reason:"storage-failed"});
});

test("Arvo full write path binds only authenticated user to Neon SQL",async()=>{
 let captured;
 const write=createArvoNeonMealWriter({query:async(sql,params)=>{
  captured={sql,params};
  return {rows:[{inserted:true}]};
 }});
 const result=await writeArvoCloudMeal(token,{...meal,userId:"00000000-0000-4000-8000-000000000002"},async()=>access,hash,write,now);
 assert.deepEqual(result,{ok:true,mealId:meal.id});
 assert.match(captured.sql,/ziiply_arvo_insert_meal/);
 assert.equal(captured.params[0],userId);
 assert.equal(captured.params[1],meal.id);
 assert.equal(captured.params.length,10);
});
test("Arvo full write path never reports success for duplicate or tombstoned Neon meal",async()=>{
 const write=createArvoNeonMealWriter({query:async()=>({rows:[{inserted:false}]})});
 assert.deepEqual(await writeArvoCloudMeal(token,meal,async()=>access,hash,write,now),{ok:false,reason:"storage-failed"});
});
