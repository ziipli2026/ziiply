import assert from "node:assert/strict";
import test from "node:test";
import {createHash} from "node:crypto";
import {resolveArvoCloudSession} from "../src/app/components/ziiply/arvo/arvoSessionResolver.server.ts";
const now=new Date("2026-11-04T10:00:00.000Z");
const userId="00000000-0000-4000-8000-00000000000a";
const valid={sessionUserId:userId,sessionExpiresAt:"2026-11-05T10:00:00.000Z",sessionRevokedAt:null,userDisabledAt:null,cloudMealGrantedAt:"2026-11-03T10:00:00.000Z",cloudMealRevokedAt:null};
const token="a".repeat(64);
const hash=raw=>createHash("sha256").update(raw).digest("hex");
test("Arvo session resolver hashes server token and returns only authorized identity",async()=>{
 const expected=createHash("sha256").update(token).digest("hex");
 const result=await resolveArvoCloudSession(token,async hash=>{assert.equal(hash,expected);return valid;},raw=>createHash("sha256").update(raw).digest("hex"),now);
 assert.deepEqual(result,{userId});
});
test("Arvo session resolver rejects missing, malformed, revoked and consentless sessions",async()=>{
 let calls=0;
 const lookup=async()=>{calls++;return valid;};
 assert.equal(await resolveArvoCloudSession(null,lookup,hash,now),null);
 assert.equal(await resolveArvoCloudSession("short",lookup,hash,now),null);
 assert.equal(calls,0);
 assert.equal(await resolveArvoCloudSession(token,async()=>null,hash,now),null);
 assert.equal(await resolveArvoCloudSession(token,async()=>({...valid,sessionRevokedAt:now.toISOString()}),hash,now),null);
 assert.equal(await resolveArvoCloudSession(token,async()=>({...valid,cloudMealGrantedAt:null}),hash,now),null);
});

test("Arvo session resolver denies access when hashing or lookup fails",async()=>{
 assert.equal(await resolveArvoCloudSession(token,async()=>valid,()=>{throw Error("hash failure")},now),null);
 assert.equal(await resolveArvoCloudSession(token,async()=>valid,()=>undefined,now),null);
 assert.equal(await resolveArvoCloudSession(token,async()=>{throw Error("db unavailable")},hash,now),null);
});
