import assert from "node:assert/strict";
import test from "node:test";
import {createArvoNeonMealWriter} from "../src/app/components/ziiply/arvo/arvoNeonMealWriter.server.ts";
const meal={id:"00000000-0000-4000-8000-00000000000a",timestamp:"2026-11-04T10:00:00.000Z",ean:"6411234567890",name:"Testi",grams:100,nutrition:{kcal:100,protein:null,carbs:20,fat:5}};
const user="00000000-0000-4000-8000-000000000001";
test("Arvo Neon writer binds all values and calls consent-checking function",async()=>{
 let captured;
 const write=createArvoNeonMealWriter({query:async(sql,params)=>{captured={sql,params};return {rows:[{inserted:true}]};}});
 await write(user,meal);
 assert.match(captured.sql,/ziiply_arvo_insert_meal/);
 assert.equal(captured.params.length,10);
 assert.equal(captured.params[0],user);
 assert.equal(captured.params[1],meal.id);
 assert.equal(captured.params[6],null);
 assert.equal(captured.params[8],20);
 assert.ok(!captured.sql.includes(meal.ean));
});
test("Arvo Neon writer rejects tombstoned or duplicate meal IDs",async()=>{
 const write=createArvoNeonMealWriter({query:async()=>({rows:[{inserted:false}]})});
 await assert.rejects(write(user,meal),/not-inserted/);
});
test("Arvo Neon writer propagates SQL consent failure",async()=>{
 const write=createArvoNeonMealWriter({query:async()=>{throw Error("arvo_cloud_consent_required");}});
 await assert.rejects(write(user,meal),/consent_required/);
});
