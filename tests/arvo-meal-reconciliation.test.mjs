import assert from "node:assert/strict";
import test from "node:test";
import {mergeArvoDeletedIds,reconcileArvoMeals} from "../src/app/components/ziiply/arvo/arvoMealReconciliation.ts";

const meal=(id,kcal=100)=>({id:`00000000-0000-4000-8000-00000000000${id}`,timestamp:"2026-11-03T12:00:00.000Z",ean:"6411234567890",name:"Testituote",grams:100,nutrition:{kcal,protein:null,carbs:null,fat:null}});

test("Arvo reconciliation preserves local-only meals and queues upload",()=>{
 const result=reconcileArvoMeals([meal("a")],[]);
 assert.deepEqual(result.upload.map(m=>m.id),["00000000-0000-4000-8000-00000000000a"]);
 assert.equal(result.merged.length,1);
});
test("Arvo reconciliation does not duplicate already synced meals",()=>{
 const result=reconcileArvoMeals([meal("a"),meal("a")],[meal("a")]);
 assert.equal(result.upload.length,0);
 assert.equal(result.merged.length,1);
});
test("Arvo reconciliation reports conflicts rather than overwriting server",()=>{
 const result=reconcileArvoMeals([meal("a",200)],[meal("a",100)]);
 assert.deepEqual(result.conflicts,["00000000-0000-4000-8000-00000000000a"]);
 assert.equal(result.upload.length,0);
 assert.equal(result.merged[0].nutrition.kcal,100);
});
test("Arvo reconciliation retains unknown nutrient as null",()=>{
 const result=reconcileArvoMeals([meal("a")],[]);
 assert.equal(result.upload[0].nutrition.protein,null);
});
test("Arvo reconciliation ignores invalid entries",()=>{
 const result=reconcileArvoMeals([{...meal("a"),grams:-1}],[]);
 assert.equal(result.upload.length,0);
});

test("Arvo reconciliation rejects malformed UUID even if length looks valid",()=>{
 const invalid={...meal("a"),id:"00000000-0000-4000-8000-00000000000z"};
 const result=reconcileArvoMeals([invalid],[]);
 assert.equal(result.upload.length,0);
 assert.equal(result.merged.length,1);
 assert.equal(result.localOnly.length,1);
 assert.equal(result.localOnly[0].id,invalid.id);
});
test("Arvo reconciliation rejects invalid remote IDs",()=>{
 const invalid={...meal("a"),id:"not-a-uuid"};
 const result=reconcileArvoMeals([], [invalid]);
 assert.equal(result.merged.length,0);
});

test("Arvo server tombstones prevent offline meal resurrection",()=>{
 const id=meal("a").id;
 const tombstones=mergeArvoDeletedIds([], [id,id,"invalid"]);
 assert.deepEqual(tombstones,[id]);
 const result=reconcileArvoMeals([meal("a")],[meal("a")],tombstones);
 assert.deepEqual(result.merged,[]);
 assert.deepEqual(result.upload,[]);
});
