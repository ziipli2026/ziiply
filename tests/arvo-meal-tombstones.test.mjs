import assert from "node:assert/strict";
import test from "node:test";
import {markArvoMealDeleted,readArvoDeletedMealIds} from "../src/app/components/ziiply/arvo/arvoMealTombstones.ts";
import {reconcileArvoMeals} from "../src/app/components/ziiply/arvo/arvoMealReconciliation.ts";
import {planArvoMealUpload} from "../src/app/components/ziiply/arvo/arvoMealUploadPlan.ts";
const id="00000000-0000-4000-8000-00000000000a";
const meal={id,timestamp:"2026-11-03T12:00:00.000Z",ean:"6411234567890",name:"Testi",grams:100,nutrition:{kcal:100,protein:null,carbs:null,fat:null}};
test("Arvo deleted meals are not resurrected by remote sync",()=>{
 const state=new Map();
 const storage={getItem:k=>state.get(k)??null,setItem:(k,v)=>state.set(k,v)};
 markArvoMealDeleted(storage,id);
 markArvoMealDeleted(storage,id);
 assert.deepEqual(readArvoDeletedMealIds(storage),[id]);
 const result=reconcileArvoMeals([meal],[meal],readArvoDeletedMealIds(storage));
 assert.equal(result.merged.length,0);
 assert.equal(result.upload.length,0);
 const plan=planArvoMealUpload([meal],[meal],{authenticated:true,cloudMealConsent:true},[id]);
 assert.equal(plan.upload.length,0);
});
test("Arvo deletion tombstones do not allow invalid IDs",()=>{
 const state=new Map();
 const storage={getItem:k=>state.get(k)??null,setItem:(k,v)=>state.set(k,v)};
 assert.deepEqual(markArvoMealDeleted(storage,"invalid"),[]);
});
