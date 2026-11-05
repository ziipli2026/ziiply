import assert from "node:assert/strict";
import test from "node:test";
import {clearArvoCloudMealCache,readArvoCloudMealCache} from "../src/app/components/ziiply/arvo/arvoMealCloudCache.ts";
import {arvoUserCloudCacheKey} from "../src/app/components/ziiply/arvo/arvoMealCloudSnapshot.ts";
import {ARVO_MEALS_KEY} from "../src/app/components/ziiply/arvo/arvoStatistics.ts";
const a="00000000-0000-4000-8000-000000000001",b="00000000-0000-4000-8000-000000000002";
const entries=new Map([[arvoUserCloudCacheKey(a),JSON.stringify({meals:[{id:"private-a"}],deletedIds:[]})],[arvoUserCloudCacheKey(b),JSON.stringify({meals:[{id:"private-b"}],deletedIds:[]})],[ARVO_MEALS_KEY,"[]"]]);
const store={getItem:key=>entries.get(key)??null,removeItem:key=>entries.delete(key)};
test("cache read stays account-scoped",()=>{
 assert.equal(readArvoCloudMealCache(store,a)?.meals[0].id,"private-a");
 assert.equal(readArvoCloudMealCache(store,b)?.meals[0].id,"private-b");
});
test("sign-out purges only signed-out cloud account, not local diary or other account",()=>{
 clearArvoCloudMealCache(store,a);
 assert.equal(readArvoCloudMealCache(store,a),null);
 assert.equal(readArvoCloudMealCache(store,b)?.meals[0].id,"private-b");
 assert.equal(store.getItem(ARVO_MEALS_KEY),"[]");
});
test("malformed cloud cache is not trusted",()=>{
 const bad={getItem:()=>"{invalid"};
 assert.equal(readArvoCloudMealCache(bad,a),null);
 assert.throws(()=>clearArvoCloudMealCache(store,"invalid"),/invalid-cloud-user/);
});
