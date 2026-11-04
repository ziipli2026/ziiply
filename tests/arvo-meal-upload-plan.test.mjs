import assert from "node:assert/strict";
import test from "node:test";
import {planArvoMealUpload} from "../src/app/components/ziiply/arvo/arvoMealUploadPlan.ts";

const meal={id:"00000000-0000-4000-8000-00000000000a",timestamp:"2026-11-03T12:00:00.000Z",ean:"6411234567890",name:"Testituote",grams:100,nutrition:{kcal:100,protein:null,carbs:null,fat:null}};

test("Arvo upload plan never exposes an upload without both permissions",()=>{
 for(const authenticated of [false,true])for(const cloudMealConsent of [false,true]){
   const plan=planArvoMealUpload([meal],[],{authenticated,cloudMealConsent});
   assert.equal(plan.allowed,authenticated&&cloudMealConsent);
   assert.equal(plan.upload.length,authenticated&&cloudMealConsent?1:0);
 }
});
test("Arvo upload plan keeps local meals when cloud consent is absent",()=>{
 const plan=planArvoMealUpload([meal],[],{authenticated:true,cloudMealConsent:false});
 assert.equal(plan.localOnly.length,1);
 assert.equal(plan.localOnly[0].id,meal.id);
});
test("Arvo upload plan does not upload existing server meals twice",()=>{
 const plan=planArvoMealUpload([meal],[meal],{authenticated:true,cloudMealConsent:true});
 assert.equal(plan.upload.length,0);
});

test("Arvo cloud deletion is planned only with consent and an existing remote meal",()=>{
 const denied=planArvoMealUpload([], [meal], {authenticated:true,cloudMealConsent:false},[meal.id]);
 assert.deepEqual(denied.deleteRemoteIds,[]);
 const permitted=planArvoMealUpload([], [meal], {authenticated:true,cloudMealConsent:true},[meal.id,meal.id]);
 assert.deepEqual(permitted.deleteRemoteIds,[meal.id]);
 assert.equal(permitted.upload.length,0);
 const absent=planArvoMealUpload([],[],{authenticated:true,cloudMealConsent:true},[meal.id]);
 assert.deepEqual(absent.deleteRemoteIds,[]);
});
