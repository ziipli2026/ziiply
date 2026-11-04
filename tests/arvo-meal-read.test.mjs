import assert from "node:assert/strict";
import test from "node:test";
import {createArvoNeonMealReader} from "../src/app/components/ziiply/arvo/arvoNeonMealReader.server.ts";
import {readArvoCloudMeals} from "../src/app/components/ziiply/arvo/arvoMealRead.server.ts";
const user="00000000-0000-4000-8000-000000000001",id="00000000-0000-4000-8000-00000000000a",token="a".repeat(64);
const access={sessionUserId:user,sessionExpiresAt:"2026-11-05T10:00:00.000Z",sessionRevokedAt:null,userDisabledAt:null,cloudMealGrantedAt:"2026-11-03T10:00:00.000Z",cloudMealRevokedAt:null};
const now=new Date("2026-11-04T12:00:00.000Z");
test("Arvo reader scopes both queries to session user",async()=>{
 const calls=[];
 const read=createArvoNeonMealReader({query:async(sql,params)=>{
  calls.push({sql,params});
  if(sql.includes("ziiply_arvo_meal_deletions"))return {rows:[{meal_id:id}]};
  return {rows:[{meal_id:id,consumed_at:"2026-11-04T10:00:00.000Z",ean:"6411234567890",product_name:"Testi",grams:"100.00",kcal:"100.00",protein_g:null,carbs_g:"20.00",fat_g:"5.00"}]};
 }});
 const result=await read(user);
 assert.equal(result.meals.length,0); // server tombstone wins over stale active row
 assert.equal(result.deletedIds[0],id);
 assert.deepEqual(result.deletedIds,[id]);
 assert.equal(calls.length,2);
 assert.ok(calls.every(c=>c.params.length===1&&c.params[0]===user&&c.sql.includes("user_id=$1::uuid")));
});
test("Arvo read rejects revoked consent without querying",async()=>{
 let reads=0;
 const result=await readArvoCloudMeals(token,async()=>({...access,cloudMealRevokedAt:"2026-11-04T11:00:00.000Z"}),()=> "b".repeat(64),async()=>{reads++;return {meals:[],deletedIds:[]};},now);
 assert.deepEqual(result,{ok:false,reason:"unauthorized"});
 assert.equal(reads,0);
});
test("Arvo read handles database failure",async()=>{
 const result=await readArvoCloudMeals(token,async()=>access,()=> "b".repeat(64),async()=>{throw Error("offline");},now);
 assert.deepEqual(result,{ok:false,reason:"storage-failed"});
});

test("Arvo reader rejects truncated result sets instead of silently losing sync data",async()=>{
 const rows=Array.from({length:5001},()=>({meal_id:id}));
 const read=createArvoNeonMealReader({query:async(sql)=>({rows:sql.includes("ziiply_arvo_meal_deletions")?rows:[]})});
 await assert.rejects(read(user),/result-limit-exceeded/);
});
