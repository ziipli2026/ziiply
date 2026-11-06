import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const root="src/app/api/beta/login/";
for(const name of ["request","verify"]){
 test(`beta ${name} mutation stays disabled until explicitly enabled`,()=>{
  const code=readFileSync(root+name+"/route.ts","utf8");
  assert.match(code,/ZIIPLY_BETA_LOGIN_ENABLED/);
  assert.match(code,/ZIIPLY_BETA_RATE_LIMIT_READY/);
  assert.match(code,/ZIIPLY_PUBLIC_ORIGIN/);
  assert.match(code,/headers\.get\("origin"\)/);
  assert.match(code,/DATABASE_URL/);
  assert.match(code,/Cache-Control.*no-store/);
 });
}
test("beta session verification issues HttpOnly cookie and consumes challenge",()=>{
 const code=readFileSync(root+"verify/route.ts","utf8");
 assert.match(code,/consumed_at\s*=\s*now\(\)/);
 assert.match(code,/c\.consumed_at IS NULL/);
 assert.match(code,/c\.expires_at > now\(\)/);
 assert.match(code,/a\.status IN \('invited', 'active'\)/);
 assert.match(code,/response\.cookies\.set\(BETA_COOKIE_NAME/);
 const cookie=readFileSync("src/lib/ziiplyBetaSessionSecurity.mjs","utf8");
 assert.match(cookie,/httpOnly:\s*true/);
 assert.match(cookie,/secure:\s*true/);
});

test("failed SMTP delivery removes undelivered beta login challenge",()=>{
 const code=readFileSync(root+"request/route.ts","utf8");
 assert.match(code,/catch \(error\) \{[\s\S]*DELETE FROM public\.ziiply_beta_login_challenges WHERE token_hash = \$\{tokenHash\} AND consumed_at IS NULL/);
 assert.match(code,/DELETE FROM public\.ziiply_beta_login_attempts WHERE id = \$\{allowed\[0\]\.id\}/);
});

test("SMTP failure cleanup errors cannot mask the delivery failure response",()=>{
 const code=readFileSync(root+"request/route.ts","utf8");
 assert.match(code,/catch \(error\) \{[\s\S]*?try \{[\s\S]*?DELETE FROM public\.ziiply_beta_login_challenges[\s\S]*?\} catch \{[\s\S]*?SMTP failure cleanup failed/);
 assert.match(code,/code: "EMAIL_DELIVERY_FAILED"/);
});

test("logout clears browser cookie even if database revocation fails",()=>{
 const code=readFileSync(root+"logout/route.ts","utf8");
 assert.match(code,/SESSION_REVOCATION_FAILED/);
 assert.match(code,/response\.cookies\.set\(BETA_COOKIE_NAME, "", \{ \.\.\.betaCookieOptions\(0\), sameSite: "lax" as const, maxAge: 0 \}\)/);
 assert.match(code,/return response/);
});

test("beta login form unlocks on email readiness without requiring completed E2E test",()=>{
 const page=readFileSync("src/app/beta/kirjaudu/page.tsx","utf8");
 assert.match(page,/setReady\(Boolean\(data\.emailTestReady\)\)/);
 assert.doesNotMatch(page,/data\.emailTestReady && data\.loginFlowComplete/);
});

test("beta email confirmation does not consume the one-time token twice on effect rerun",()=>{
 const page=readFileSync("src/app/beta/kirjaudu/vahvista/page.tsx","utf8");
 assert.match(page,/useRef\(false\)/);
 assert.match(page,/if\(verificationStarted\.current\)return/);
 assert.match(page,/verificationStarted\.current=true/);
 assert.match(page,/window\.history\.replaceState/);
});

test("disabled beta login also rejects existing browser sessions",()=>{
 const code=readFileSync(root+"session/route.ts","utf8");
 assert.match(code,/ZIIPLY_BETA_LOGIN_ENABLED/);
 assert.match(code,/ZIIPLY_BETA_RATE_LIMIT_READY/);
 assert.match(code,/authenticated: false/);
});

test("beta login and Arvo cloud storage use isolated test database variable",()=>{
 const paths=[
  "src/app/api/beta/login/request/route.ts",
  "src/app/api/beta/login/session/route.ts",
  "src/app/api/beta/login/verify/route.ts",
  "src/app/api/beta/login/status/route.ts",
  "src/app/api/arvo/meals/route.ts",
  "src/app/api/arvo/meals/delete/route.ts",
  "src/app/api/arvo/meals/write/route.ts",
  "src/app/api/arvo/consent/route.ts",
  "src/app/components/ziiply/arvo/arvoCloudOperation.server.ts"
 ];
 for(const path of paths){
  const code=readFileSync(path,"utf8");
  assert.match(code,/ARVO_TEST_DATABASE_URL/,path);
  assert.doesNotMatch(code,/process\\.env\\.DATABASE_URL/,path);
 }
});
