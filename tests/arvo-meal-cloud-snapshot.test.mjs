import assert from "node:assert/strict";
import test from "node:test";
import {applyArvoCloudSnapshot} from "../src/app/components/ziiply/arvo/arvoMealCloudSnapshot.ts";
import {ARVO_MEALS_KEY,readArvoMeals} from "../src/app/components/ziiply/arvo/arvoStatistics.ts";
import {ARVO_DELETED_MEALS_KEY} from "../src/app/components/ziiply/arvo/arvoMealTombstones.ts";
const id="00000000-0000-4000-8000-00000000000a";
const meal={id,timestamp:"2026-11-04T10:00:00.000Z",ean:"6411234567890",name:"Testi",grams:100,nutrition:{kcal:100,protein:null,carbs:null,fat:null}};
const storage=(initial={})=>{const values=new Map(Object.entries(initial));return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test("cloud snapshot retains local meals and adds remote meals without upload",()=>{
 const other={...meal,id:"00000000-0000-4000-8000-00000000000b"};
 const db=storage({[ARVO_MEALS_KEY]:JSON.stringify([meal])});
 const result=applyArvoCloudSnapshot(db,[other],[]);
 assert.deepEqual(result.meals.map(m=>m.id).sort(),[id,other.id].sort());
});
test("cloud deletion tombstone wins over stale local meal",()=>{
 const db=storage({[ARVO_MEALS_KEY]:JSON.stringify([meal])});
 const result=applyArvoCloudSnapshot(db,[],[id]);
 assert.deepEqual(result.meals,[]);
 assert.deepEqual(JSON.parse(db.getItem(ARVO_DELETED_MEALS_KEY)),[id]);
});
test("cloud tombstone remains effective even if local meal cache write fails",()=>{
 const values=new Map([[ARVO_MEALS_KEY,JSON.stringify([meal])]]);
 const db={getItem:key=>values.get(key)??null,setItem:(key,value)=>{if(key===ARVO_MEALS_KEY)throw Error("disk-full");values.set(key,value);}};
 assert.throws(()=>applyArvoCloudSnapshot(db,[],[id]),/disk-full/);
 assert.deepEqual(readArvoMeals(db),[]);
});
test("cloud conflicts never overwrite local cache silently",()=>{
 const db=storage({[ARVO_MEALS_KEY]:JSON.stringify([meal])});
 const conflict={...meal,name:"Different"};
 const result=applyArvoCloudSnapshot(db,[conflict],[]);
 assert.deepEqual(result.conflicts,[id]);
 assert.equal(readArvoMeals(db)[0].name,"Testi");
});
