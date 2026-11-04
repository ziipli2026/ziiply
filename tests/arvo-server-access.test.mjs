import assert from "node:assert/strict";
import test from "node:test";
import {canAccessArvoCloudMeals} from "../src/app/components/ziiply/arvo/arvoServerAccess.ts";

const now=new Date("2026-11-04T10:00:00.000Z");
const valid={
 sessionUserId:"00000000-0000-4000-8000-00000000000a",
 sessionExpiresAt:"2026-11-05T10:00:00.000Z",
 sessionRevokedAt:null,
 userDisabledAt:null,
 cloudMealGrantedAt:"2026-11-03T10:00:00.000Z",
 cloudMealRevokedAt:null
};
test("Arvo server cloud access requires a valid session and explicit consent",()=>{
 assert.equal(canAccessArvoCloudMeals(valid,now),true);
 for(const patch of [
  {sessionUserId:null},{sessionUserId:"not-a-uuid"},
  {sessionExpiresAt:null},{sessionExpiresAt:"bad"},
  {sessionExpiresAt:"2026-11-04T10:00:00.000Z"},
  {sessionRevokedAt:"2026-11-03T10:00:00.000Z"},
  {userDisabledAt:"2026-11-03T10:00:00.000Z"},
  {cloudMealGrantedAt:null},{cloudMealGrantedAt:"invalid"},
  {cloudMealGrantedAt:"2026-11-05T10:00:00.000Z"},
  {cloudMealRevokedAt:"2026-11-04T09:00:00.000Z"}
 ]){
  assert.equal(canAccessArvoCloudMeals({...valid,...patch},now),false,JSON.stringify(patch));
 }
});

test("Arvo cloud guard rejects an invalid server clock",()=>{
 assert.equal(canAccessArvoCloudMeals(valid,new Date("invalid")),false);
});
