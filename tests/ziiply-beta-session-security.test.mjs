import test from "node:test";
import assert from "node:assert/strict";
import {betaCookieOptions,validateBetaRedirect,signBetaState,verifyBetaState,BETA_COOKIE_NAME} from "../src/lib/ziiplyBetaSessionSecurity.mjs";
const secret="long-test-only-secret-at-least-32-characters";
test("beta cookies are HttpOnly, Secure and host-scoped",()=>{
 assert.equal(BETA_COOKIE_NAME,"__Host-ziiply_beta");
 assert.deepEqual(betaCookieOptions(),{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:604800});
});
test("external and protocol-relative redirects are rejected",()=>{
 for(const p of ["https://example.com","//evil.test","/\\evil.test","/x\nLocation:evil"])
 assert.equal(validateBetaRedirect(p),"/arvo-tilastot");
 assert.equal(validateBetaRedirect("/arvo-tilastot"),"/arvo-tilastot");
});
test("signed state rejects tampering and expiration",()=>{
 const now=Date.now(),payload={nonce:"abcdefghijklmnop",expiresAt:now+60000};
 const token=signBetaState(payload,secret);
 assert.deepEqual(verifyBetaState(token,secret,now),payload);
 assert.equal(verifyBetaState(token+"x",secret,now),null);
 assert.equal(verifyBetaState(token,secret,now+61000),null);
 assert.equal(verifyBetaState(token,"wrong",now),null);
});
