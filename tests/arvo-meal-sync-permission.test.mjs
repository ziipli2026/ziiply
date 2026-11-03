import assert from "node:assert/strict";
import test from "node:test";
import {canSyncArvoMeals} from "../src/app/components/ziiply/arvo/arvoMealSyncPermission.ts";

test("Arvo cloud meals: no upload without authentication and consent",()=>{
  for (const authenticated of [false,true]) {
    for (const cloudMealConsent of [false,true]) {
      assert.equal(canSyncArvoMeals({authenticated,cloudMealConsent}),authenticated && cloudMealConsent);
    }
  }
});
test("Arvo cloud meals: malformed truthy values cannot bypass opt-in",()=>{
  assert.equal(canSyncArvoMeals({authenticated:"yes",cloudMealConsent:true}),false);
  assert.equal(canSyncArvoMeals({authenticated:true,cloudMealConsent:1}),false);
});
