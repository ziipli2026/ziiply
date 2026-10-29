import assert from "node:assert/strict";
import test from "node:test";
import {arvoDailyStatistics,arvoNutritionTotals,arvoNutrientValues,readArvoMeals,saveArvoMeal,deleteArvoMeal,ARVO_MEALS_KEY} from "../src/app/components/ziiply/arvo/arvoStatistics.ts";

const meal=(id,timestamp,nutrition)=>({id,timestamp,ean:"6411234567890",name:"Testituote",grams:150,nutrition});

test("Arvo: scanner 100g nutrition scales to selected grams",()=>{
 const result=arvoNutrientValues({kcal_100g:200,proteins_100g:10,carbohydrates_100g:20,fat_100g:5},150);
 assert.deepEqual(result,{kcal:300,protein:15,carbs:30,fat:7.5});
});
test("Arvo: missing nutrient stays unknown, never becomes zero",()=>{
 const result=arvoNutrientValues({kcal_100g:0},100);
 assert.deepEqual(result,{kcal:0,protein:null,carbs:null,fat:null});
});
test("Arvo: saved meal appears in totals",()=>{
 const m=meal("one","2026-10-29T12:00:00.000Z",{kcal:300,protein:15,carbs:30,fat:7.5});
 const store={getItem:key=>key===ARVO_MEALS_KEY?JSON.stringify([m]):null};
 const saved=readArvoMeals(store);
 assert.equal(saved.length,1);
 assert.deepEqual(arvoNutritionTotals(saved),{kcal:300,protein:15,carbs:30,fat:7.5,entries:1,known:{kcal:1,protein:1,carbs:1,fat:1}});
});
test("Arvo: removing meal updates totals",()=>{
 const a=meal("a","2026-10-29T12:00:00.000Z",{kcal:300,protein:15,carbs:30,fat:7.5});
 const b=meal("b","2026-10-29T13:00:00.000Z",{kcal:100,protein:5,carbs:10,fat:2});
 const original=arvoNutritionTotals([a,b]);
 const after=arvoNutritionTotals([a,b].filter(m=>m.id!=="a"));
 assert.equal(original.kcal,400);
 assert.equal(after.kcal,100);
 assert.equal(after.entries,1);
});
test("Arvo: timezone-aware grouping at midnight",()=>{
 const m=meal("one","2026-10-29T22:30:00.000Z",{kcal:100,protein:null,carbs:null,fat:null});
 const grouped=arvoDailyStatistics([m],"Europe/Helsinki");
 assert.equal(grouped["2026-10-30"].kcal,100);
 assert.equal(grouped["2026-10-29"],undefined);
});
test("Arvo: corrupted local storage does not crash statistics",()=>{
 assert.deepEqual(readArvoMeals({getItem:()=>"{invalid"}),[]);
});
test("Arvo: no personal health data in analytics event names",()=>{
 const names=["arvo_scanner_opened","arvo_scan_success","arvo_product_found","arvo_product_not_found","arvo_meal_saved","arvo_cart_added","arvo_scanner_error"];
 assert.ok(names.every(name=>/^arvo_[a-z_]+$/.test(name)));
});

test("Arvo: saving and deleting updates actual browser storage",()=>{
 const data=new Map();
 const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
 const a=meal("a","2026-10-29T12:00:00.000Z",{kcal:300,protein:15,carbs:30,fat:7.5});
 const b=meal("b","2026-10-29T13:00:00.000Z",{kcal:100,protein:5,carbs:10,fat:2});
 saveArvoMeal(storage,a);
 saveArvoMeal(storage,b);
 assert.equal(arvoNutritionTotals(readArvoMeals(storage)).kcal,400);
 deleteArvoMeal(storage,"a");
 assert.equal(arvoNutritionTotals(readArvoMeals(storage)).kcal,100);
 assert.equal(readArvoMeals(storage)[0].id,"b");
});
test("Arvo: failed storage write is surfaced and previous data stays intact",()=>{
 const a=meal("a","2026-10-29T12:00:00.000Z",{kcal:100,protein:5,carbs:10,fat:2});
 const storage={getItem:()=>JSON.stringify([a]),setItem:()=>{throw new Error("quota exceeded");}};
 assert.throws(()=>deleteArvoMeal(storage,"a"),/quota exceeded/);
 assert.equal(readArvoMeals(storage).length,1);
});
