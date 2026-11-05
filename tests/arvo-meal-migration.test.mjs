import assert from "node:assert/strict";
import test from "node:test";
import {planExplicitArvoMealMigration} from "../src/app/components/ziiply/arvo/arvoMealMigration.ts";
const meal={id:"00000000-0000-4000-8000-00000000000a",timestamp:"2026-11-04T10:00:00.000Z",ean:"6411234567890",name:"Testi",grams:100,nutrition:{kcal:100,protein:null,carbs:null,fat:null}};
const allowed={authenticated:true,cloudMealConsent:true};
test("cloud consent alone never migrates historical local meals",()=>{
 const plan=planExplicitArvoMealMigration([meal],[],allowed,false);
 assert.equal(plan.allowed,false);
 assert.deepEqual(plan.upload,[]);
 assert.equal(plan.localOnly.length,1);
});
test("re-granting cloud consent still requires separate migration confirmation",()=>{
 const plan=planExplicitArvoMealMigration([meal],[],allowed,undefined);
 assert.deepEqual(plan.upload,[]);
});
test("explicit migration still requires valid authenticated cloud consent",()=>{
 assert.deepEqual(planExplicitArvoMealMigration([meal],[],{authenticated:false,cloudMealConsent:true},true).upload,[]);
 assert.deepEqual(planExplicitArvoMealMigration([meal],[],{authenticated:true,cloudMealConsent:false},true).upload,[]);
});
test("confirmed migration includes eligible local meals but not deleted IDs",()=>{
 const plan=planExplicitArvoMealMigration([meal],[],allowed,true);
 assert.equal(plan.allowed,true);
 assert.deepEqual(plan.upload.map(m=>m.id),[meal.id]);
 assert.deepEqual(planExplicitArvoMealMigration([meal],[],allowed,true,[meal.id]).upload,[]);
});
