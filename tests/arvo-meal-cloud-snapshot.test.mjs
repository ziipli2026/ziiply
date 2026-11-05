import assert from "node:assert/strict";
import test from "node:test";
import {applyArvoCloudSnapshot,arvoUserCloudCacheKey} from "../src/app/components/ziiply/arvo/arvoMealCloudSnapshot.ts";
import {ARVO_MEALS_KEY,readArvoMeals} from "../src/app/components/ziiply/arvo/arvoStatistics.ts";
const user="00000000-0000-4000-8000-000000000001",otherUser="00000000-0000-4000-8000-000000000002";
const id="00000000-0000-4000-8000-00000000000a";
const meal={id,timestamp:"2026-11-04T10:00:00.000Z",ean:"6411234567890",name:"Testi",grams:100,nutrition:{kcal:100,protein:null,carbs:null,fat:null}};
const storage=(initial={})=>{const values=new Map(Object.entries(initial));return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
test("cloud snapshot preserves shared local diary and uses user-scoped cache",()=>{
 const other={...meal,id:"00000000-0000-4000-8000-00000000000b"};
 const db=storage({[ARVO_MEALS_KEY]:JSON.stringify([meal])});
 const result=applyArvoCloudSnapshot(db,user,[other],[]);
 assert.deepEqual(result.meals.map(m=>m.id),[other.id]);
 assert.deepEqual(readArvoMeals(db).map(m=>m.id),[id]);
 assert.equal(db.getItem(arvoUserCloudCacheKey(otherUser)),null);
 assert.equal(JSON.parse(db.getItem(arvoUserCloudCacheKey(user))).meals.length,1);
});
test("remote tombstone hides stale local meal in scoped cloud snapshot without deleting local history",()=>{
 const db=storage({[ARVO_MEALS_KEY]:JSON.stringify([meal])});
 const result=applyArvoCloudSnapshot(db,user,[],[id]);
 assert.deepEqual(result.meals,[]);
 assert.deepEqual(readArvoMeals(db).map(m=>m.id),[id]);
 assert.deepEqual(JSON.parse(db.getItem(arvoUserCloudCacheKey(user))).deletedIds,[id]);
});
test("failed cloud cache write cannot corrupt local diary",()=>{
 const db={getItem:key=>key===ARVO_MEALS_KEY?JSON.stringify([meal]):null,setItem:()=>{throw Error("disk-full");}};
 assert.throws(()=>applyArvoCloudSnapshot(db,user,[],[id]),/disk-full/);
 assert.deepEqual(readArvoMeals(db).map(m=>m.id),[id]);
});
test("cloud meal with same ID never overwrites shared local diary",()=>{
 const db=storage({[ARVO_MEALS_KEY]:JSON.stringify([meal])});
 const result=applyArvoCloudSnapshot(db,user,[{...meal,name:"Different"}],[]);
 assert.deepEqual(result.conflicts,[]);
 assert.equal(JSON.parse(db.getItem(arvoUserCloudCacheKey(user))).meals[0].name,"Different");
 assert.equal(readArvoMeals(db)[0].name,"Testi");
});
test("cloud snapshot rejects invalid account ID before writing",()=>{
 const db=storage();
 assert.throws(()=>applyArvoCloudSnapshot(db,"invalid",[],[]),/invalid-cloud-user/);
});

test("two accounts never receive shared local meals in cloud caches",()=>{
 const db=storage({[ARVO_MEALS_KEY]:JSON.stringify([meal])});
 applyArvoCloudSnapshot(db,user,[],[]);
 applyArvoCloudSnapshot(db,otherUser,[],[]);
 assert.deepEqual(JSON.parse(db.getItem(arvoUserCloudCacheKey(user))).meals,[]);
 assert.deepEqual(JSON.parse(db.getItem(arvoUserCloudCacheKey(otherUser))).meals,[]);
 assert.deepEqual(readArvoMeals(db).map(m=>m.id),[id]);
});
test("conflicting duplicate remote rows fail closed",()=>{
 const db=storage();
 const result=applyArvoCloudSnapshot(db,user,[meal,{...meal,name:"Different"}],[]);
 assert.deepEqual(result.conflicts,[id]);
 assert.equal(db.getItem(arvoUserCloudCacheKey(user)),null);
});
