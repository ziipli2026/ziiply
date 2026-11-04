import assert from "node:assert/strict";
import test from "node:test";
import {validateArvoMealPayload} from "../src/app/components/ziiply/arvo/arvoMealPayload.server.ts";
const valid={id:"00000000-0000-4000-8000-00000000000a",timestamp:"2026-11-04T10:00:00.000Z",ean:"6411234567890",name:" Testi ",grams:150,nutrition:{kcal:200,protein:10,carbs:null,fat:5}};
test("Arvo cloud payload accepts valid meal and normalizes name",()=>{
 assert.equal(validateArvoMealPayload(valid)?.name,"Testi");
});
test("Arvo cloud payload rejects malformed identifiers and nutrition",()=>{
 for(const changed of [
  {...valid,id:"local-only"}, {...valid,ean:"not-an-ean"},
  {...valid,grams:-1},{...valid,grams:Infinity},
  {...valid,name:" "},{...valid,timestamp:"invalid"},
  {...valid,nutrition:{...valid.nutrition,kcal:"200"}},
  {...valid,nutrition:{...valid.nutrition,protein:-1}},
  {...valid,nutrition:{...valid.nutrition,fat:NaN}}
 ])assert.equal(validateArvoMealPayload(changed),null);
});

test("Arvo cloud timestamps require real calendar dates and explicit timezone",()=>{
 for(const timestamp of [
  "2026-02-30T10:00:00.000Z",
  "2026-11-04T10:00:00",
  "2026-11-04T25:00:00Z",
  "2026-11-04T10:00:00+15:00",
  "2026-11-04T10:00:00.000+02:99"
 ])assert.equal(validateArvoMealPayload({...valid,timestamp}),null,timestamp);
 assert.equal(validateArvoMealPayload({...valid,timestamp:"2026-11-04T12:00:00+02:00"})?.timestamp,"2026-11-04T10:00:00.000Z");
});
