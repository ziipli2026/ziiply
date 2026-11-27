import test from "node:test";
import assert from "node:assert/strict";
import {createBetaToken,hashBetaToken,verifyBetaToken,isBetaChallengeUsable,BETA_LOGIN_TTL_MS} from "../src/lib/ziiplyBetaAuthTokens.mjs";
test("beta login tokens are unique and opaque",()=>{
 const a=createBetaToken(),b=createBetaToken();
 assert.notEqual(a,b); assert.equal(a.length,43);
 assert.notEqual(hashBetaToken(a),a);
 assert.equal(verifyBetaToken(a,hashBetaToken(a)),true);
 assert.equal(verifyBetaToken(b,hashBetaToken(a)),false);
});
test("invalid tokens and hashes fail closed",()=>{
 assert.equal(verifyBetaToken("test","bad"),false);
 assert.equal(verifyBetaToken("test",hashBetaToken(createBetaToken())),false);
 assert.throws(()=>hashBetaToken("test"));
});
test("expired and consumed links are rejected",()=>{
 const now=Date.now();
 assert.equal(BETA_LOGIN_TTL_MS,900000);
 assert.equal(isBetaChallengeUsable({expiresAt:new Date(now+1000),consumedAt:null},now),true);
 assert.equal(isBetaChallengeUsable({expiresAt:new Date(now-1000),consumedAt:null},now),false);
 assert.equal(isBetaChallengeUsable({expiresAt:new Date(now+1000),consumedAt:new Date(now)},now),false);
});
