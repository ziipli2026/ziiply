import assert from "node:assert/strict";
import test from "node:test";
import {arvoCalendarChart,arvoCalendarDays,arvoPeriodStatistics,arvoDailyStatistics,arvoNutritionTotals,arvoNutrientValues,readArvoMeals,saveArvoMeal,deleteArvoMeal,ARVO_MEALS_KEY} from "../src/app/components/ziiply/arvo/arvoStatistics.ts";

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

test("Arvo: 7-day chart contains all calendar dates, including no-meal days",()=>{
 const now=new Date(2026,9,29,15,0,0);
 const chart=arvoCalendarChart([meal("one",new Date(2026,9,27,12).toISOString(),{kcal:250,protein:null,carbs:null,fat:null})],now,"week");
 assert.equal(chart.length,7);
 assert.equal(chart[0].date,"2026-10-23");
 assert.equal(chart.at(-1).date,"2026-10-29");
 assert.equal(chart.find(day=>day.date==="2026-10-27").values.kcal,250);
 assert.equal(chart.find(day=>day.date==="2026-10-28").values.entries,0);
 assert.equal(chart.find(day=>day.date==="2026-10-28").values.known.kcal,0);
});
test("Arvo: 30-day chart covers month boundary",()=>{
 const now=new Date(2026,10,2,12);
 const dates=arvoCalendarDays(now,"month");
 assert.equal(dates.length,30);
 assert.equal(dates[0],"2026-10-04");
 assert.equal(dates.at(-1),"2026-11-02");
 assert.equal(new Set(dates).size,30);
});
test("Arvo: calendar dates remain continuous across daylight saving change",()=>{
 const dates=arvoCalendarDays(new Date(2026,9,29,12),"week");
 assert.deepEqual(dates,["2026-10-23","2026-10-24","2026-10-25","2026-10-26","2026-10-27","2026-10-28","2026-10-29"]);
});
test("Arvo: unknown nutrient does not dilute known totals",()=>{
 const a=meal("a","2026-10-29T10:00:00.000Z",{kcal:200,protein:null,carbs:0,fat:null});
 const b=meal("b","2026-10-29T11:00:00.000Z",{kcal:null,protein:12,carbs:null,fat:3});
 const totals=arvoNutritionTotals([a,b]);
 assert.equal(totals.entries,2);
 assert.deepEqual(totals.known,{kcal:1,protein:1,carbs:1,fat:1});
 assert.deepEqual({kcal:totals.kcal,protein:totals.protein,carbs:totals.carbs,fat:totals.fat},{kcal:200,protein:12,carbs:0,fat:3});
});
test("Arvo: period filter excludes future and older meals",()=>{
 const start=new Date("2026-10-23T00:00:00.000Z"),end=new Date("2026-10-30T00:00:00.000Z");
 const meals=[
 meal("before","2026-10-22T23:59:59.000Z",{kcal:100,protein:null,carbs:null,fat:null}),
 meal("inside","2026-10-23T00:00:00.000Z",{kcal:200,protein:null,carbs:null,fat:null}),
 meal("future","2026-10-30T00:00:00.000Z",{kcal:300,protein:null,carbs:null,fat:null})];
 assert.equal(arvoPeriodStatistics(meals,start,end).kcal,200);
});
